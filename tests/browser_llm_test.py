"""Browser acceptance tests. Memory mode never proves native URL/storage behaviour."""
from __future__ import annotations
import json, math, os, socket, subprocess, time, traceback
from contextlib import contextmanager
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.test-output'; OUT.mkdir(exist_ok=True)
MEMORY=os.environ.get('AI_TEST_IN_MEMORY')=='1'
results=[]; errors=[]; server=None; server_log=None
@contextmanager
def check(name):
    try:
        yield
    except Exception as exc:
        results.append({'name':name,'status':'FAIL','error':str(exc)})
        print('FAIL:',name,'\n',traceback.format_exc(),flush=True)
        if 'page' in globals():
            try: page.keyboard.press('Escape')
            except Exception: pass
    else:
        results.append({'name':name,'status':'PASS'});print('PASS:',name,flush=True)
def skip(name,reason):
    results.append({'name':name,'status':'SKIP','reason':reason});print('SKIP:',name,'-',reason,flush=True)
try:
    subprocess.run(['node','scripts/build.js'],cwd=ROOT,check=True)
    if not MEMORY:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        server_log=(OUT/'llm-server.log').open('w',encoding='utf8')
        server=subprocess.Popen(['node','scripts/serve.js'],cwd=ROOT,env={**os.environ,'PORT':str(port)},stdout=server_log,stderr=subprocess.STDOUT)
        for _ in range(50):
            try:
                with socket.create_connection(('127.0.0.1',port),timeout=.1): break
            except OSError: time.sleep(.1)
        else: raise RuntimeError('Local test server did not start')
        base=f'http://127.0.0.1:{port}'
    with sync_playwright() as pw:
        launch={'headless':True,'args':['--disable-dev-shm-usage']}
        if os.environ.get('AI_BROWSER_EXECUTABLE'):launch['executable_path']=os.environ['AI_BROWSER_EXECUTABLE']
        browser=pw.chromium.launch(**launch)
        context=browser.new_context(viewport={'width':1440,'height':1000},locale='zh-CN')
        page=context.new_page();page.set_default_timeout(7000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        requests=[];page.on('request',lambda req:requests.append(req.url))
        if MEMORY:
            # Test-only adapter: about:blank lacks an ordinary native storage origin.
            storage="<script>const store=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()}});</script>"
            html=(ROOT/'dist/visible-ai-offline.html').read_text(encoding='utf8')
            page.set_content(html.replace('<body>','<body>'+storage,1),wait_until='domcontentloaded')
        else:page.goto(base,wait_until='networkidle')
        def route(chapter):
            path='/learn/'+chapter if not chapter.startswith('/') else chapter
            page.evaluate('(p)=>{location.hash=p}',path)
            if path.startswith('/learn/'):
                page.wait_for_function('(p)=>document.querySelector(".nav-lesson[aria-current=page]")?.getAttribute("href")==="#"+p',arg=path)
                page.wait_for_selector('#lab-root')
            else:page.wait_for_function('(p)=>document.querySelector(".side-home[aria-current=page]")?.getAttribute("href")==="#"+p',arg=path)
        def range_value(selector,value):
            page.locator(selector).evaluate('(e,v)=>{e.value=String(v);e.dispatchEvent(new Event("input",{bubbles:true}))}',value)
        def snapshot():return page.locator('#lab-root').evaluate('(e)=>e.getSnapshot()')
        def model_state():return page.locator('#lab-root').evaluate('(e)=>e.exportState()')
        ids=page.evaluate("AI.C.llmChapters")
        with check('Dedicated LLM route links all eighteen chapters and D2L reading paths'):
            route('/llm');expect(page.locator('h1')).to_contain_text('如何变成回答')
            assert page.locator('.llm-route-section .course-link').count()==18
            assert page.locator('.llm-reading').count()==4
            page.screenshot(path=str(OUT/'llm-route-desktop.png'),full_page=True)
        with check('All advanced chapters expose substantive explanation formulas and snapshots'):
            for chapter in ids:
                route(chapter)
                assert snapshot() is not None,chapter
                assert page.locator('.reading-section').count()>=5,chapter
                page.locator('details.deep summary').click()
                assert page.locator('.deep-inner').inner_text().strip(),chapter
                assert page.locator('.llm-error').inner_text()=='',chapter
                assert page.locator('a[href="#/llm"]').count()>=2
        with check('Masked language loss follows controls including zero supervised positions'):
            route('llm-objective');range_value('#lm-p0',.9);a=snapshot()
            assert abs(a['loss']-sum(-math.log(p) for p in a['probabilities'])/4)<1e-10
            for i in range(4):page.uncheck(f'[data-lossmask="{i}"]')
            assert snapshot()['count']==0 and snapshot()['loss'] is None
            page.check('[data-lossmask="2"]');assert abs(snapshot()['loss']+math.log(.2))<1e-10
        with check('BPE merges preserve input exactly and user markup is escaped'):
            route('llm-bpe');before=snapshot()['count'];page.click('#bpe-step');assert snapshot()['count']<before
            text='<b id="xss-probe">哈</b> 哈哈 哈哈'
            page.fill('#bpe-text',text);range_value('#bpe-merges',12)
            assert ''.join(snapshot()['pieces'])==text and page.locator('#xss-probe').count()==0
            page.fill('#bpe-text','');assert snapshot()['count']==0
        with check('Packing shows actual deduplication EOS padding and capacity changes'):
            route('llm-data');a=snapshot();assert len(a['kept'])==3
            page.select_option('#pack-dedup','0');assert len(snapshot()['kept'])==4
            range_value('#pack-size',8);a=snapshot();assert all(len(r)==8 for r in a['rows'])
            assert a['tokens']<=a['slots'];page.fill('#pack-docs','');assert snapshot()['tokens']==0
        with check('RoPE common offsets preserve dot products while relative positions matter'):
            route('llm-rope');a=snapshot();range_value('#rope-offset',70);b=snapshot()
            assert abs(a['score']-b['score'])<1e-9 and a['rq']!=b['rq']
            range_value('#rope-n',10);assert abs(snapshot()['score']-a['score'])>.001
        with check('RMSNorm and LayerNorm differ under shared offsets and gates change output'):
            route('llm-block');a=snapshot();range_value('#norm-shift',3);b=snapshot()
            assert max(abs(x-y) for x,y in zip(a['layerNorm'],b['layerNorm']))<1e-9
            assert a['rmsNorm']!=b['rmsNorm'];range_value('#gate-x',-3);assert snapshot()['output'][0]<0
        with check('KV cache outputs agree and resource settings only affect the stated scenario'):
            route('llm-cache');range_value('#kv-tokens',12);a=snapshot()
            assert a['maxError']<1e-10 and a['freshProjectionRows']==12 and a['recomputedProjectionRows']==78
            page.select_option('#kv-heads','1');b=snapshot();assert a['kvBytes']==b['kvBytes']*8
            assert a['full']==b['full']
        with check('Compute and memory budgets respond according to independent formulas'):
            route('llm-budget');a=snapshot();page.select_option('#budget-devices','4');b=snapshot()
            assert abs(a['days']/4-b['days'])<1e-10 and b['effectiveBatch']==a['effectiveBatch']*4
            page.select_option('#budget-bits','4');assert snapshot()['weights']==a['weights']/4
            assert snapshot()['adamState']==a['adamState']
        with check('SFT response-only loss excludes prompt locations without changing probability data'):
            route('llm-sft');a=snapshot();assert a['mask']==[0,0,0,1,1,1,1]
            page.select_option('#lm-maskmode','all');b=snapshot();assert b['count']==7
            assert a['probabilities']==b['probabilities'] and a['loss']!=b['loss']
        with check('LoRA actually updates both factors and changing rank resets the experiment'):
            route('llm-lora');before=snapshot();page.click('#lora-train')
            page.wait_for_function('document.querySelector("#lab-root").getSnapshot().step===100',timeout=20000)
            after=snapshot();assert after['loss']<before['loss'] and after['A']!=before['A'] and after['B']!=before['B']
            page.select_option('#lora-rank','2');assert snapshot()['step']==0 and len(snapshot()['A'])==2
            page.click('#lora-step');assert snapshot()['step']==1
            page.screenshot(path=str(OUT/'llm-lora-desktop.png'),full_page=True)
        with check('DPO fixed-reference scalar loss decreases with stronger chosen margin'):
            route('llm-align');a=snapshot();range_value('#dpo-policy',4);b=snapshot()
            assert b['loss']<a['loss'] and b['gradient']<0
            range_value('#dpo-reference',5);assert snapshot()['loss']>b['loss']
        with check('Nucleus sampling uses its computed candidate set and resets on configuration change'):
            route('llm-decode');page.select_option('#decode-k','1');page.click('#decode-sample')
            assert snapshot()['counts']==[200,0,0,0,0,0]
            page.select_option('#decode-k','6');assert sum(snapshot()['counts'])==0
            range_value('#decode-p',1);page.click('#decode-sample');assert sum(snapshot()['counts'])==200
            assert sum(x>0 for x in snapshot()['counts'])>1
        with check('Quantization includes scale overhead and reports error against original values'):
            route('llm-quant');page.select_option('#quant-group','1');a=snapshot()
            assert a['payloadBits']>a['rawBits'] and a['mse']<1e-10
            page.select_option('#quant-group','16');page.select_option('#quant-clip','1');a=snapshot()
            assert max(a['reconstructed'])<=1 and a['mse']>1
        with check('MoE selected branches obey expert capacity and expose dropped load'):
            route('llm-moe');range_value('#moe-capacity',1);range_value('#moe-bias',6);a=snapshot()
            assert max(a['loads'])<=1 and a['dropped']>0
            assert sum(a['loads'])+a['dropped']==a['requested']
        with check('Local RAG retrieves identifiable evidence and does not invent answers'):
            route('llm-rag');page.fill('#rag-query','KV缓存');a=snapshot();assert a['results'][0]['id']==2
            page.fill('#rag-query','zzz');assert all(x['score']==0 for x in snapshot()['results'])
            expect(page.locator('.llm-body')).to_contain_text('没有自动生成答案')
        with check('Slice weighting changes macro and weighted views without changing sample totals'):
            route('llm-eval');a=snapshot();assert abs(a['micro']-.83)<1e-10
            range_value('#eval-weight',0);assert abs(snapshot()['weighted']-.2)<1e-10
            range_value('#eval-b',10);assert abs(snapshot()['micro']-.91)<1e-10
        with check('Image patches perform actual fixed projection with explicit shape budget'):
            route('llm-multimodal');assert len(snapshot()['patches'])==16
            page.select_option('#patch-size','4');a=snapshot();assert len(a['patches'])==4 and len(a['patches'][0])==16
            assert len(a['projected'][0])==4
            range_value('#patch-text',64);assert snapshot()['attentionCells']==68**2
        with check('Serving timelines distinguish static batches and continuous slot reuse'):
            route('llm-serving');a=snapshot();assert a['continuous']['ticks']<=a['fixed']['ticks']
            page.select_option('#serve-slots','1');a=snapshot();assert a['fixed']['ticks']==a['continuous']['ticks']
        with check('Micro decoder generates from random weights then trains every parameter family'):
            route('llm-train');initial=model_state();before=snapshot();assert before['parameters']==260
            page.click('#micro-generate');assert snapshot()['lastOutput']['history']
            page.click('#micro-train')
            page.wait_for_function('document.querySelector("#lab-root").getSnapshot().step===120',timeout=30000)
            page.click('#micro-train')
            page.wait_for_function('document.querySelector("#lab-root").getSnapshot().step===240',timeout=30000)
            after=snapshot();trained=model_state()
            assert after['trainingLoss']<before['trainingLoss']*.4
            assert after['validationLoss']<before['validationLoss']
            assert after['metricsAtStep']==240 and trained['p']!=initial['p']
            (OUT/'micro-browser-reference.json').write_text(json.dumps({'before':before,'after':after},ensure_ascii=False,indent=2),encoding='utf8')
            page.click('#micro-generate');out=snapshot()['lastOutput'];assert out['text'].startswith('蓝猫')
            for step in out['history']:assert 0<=step['probability']<=1
            assert out['generatedAtStep']==240
            page.screenshot(path=str(OUT/'llm-micro-desktop.png'),full_page=True)
        with check('Micro model download import and next Adam update preserve the actual state'):
            saved=model_state()
            with page.expect_download() as info:page.click('#micro-export')
            info.value.save_as(OUT/'micro-model.json')
            assert json.loads((OUT/'micro-model.json').read_text(encoding='utf8'))==saved
            page.click('#micro-step');next_state=model_state();assert next_state['steps']==saved['steps']+1
            page.click('#micro-reset');assert snapshot()['step']==0
            page.set_input_files('#micro-import',{'name':'model.json','mimeType':'application/json','buffer':json.dumps(saved).encode()})
            expect(page.locator('#micro-status')).to_contain_text('已载入');assert model_state()==saved
            page.click('#micro-step');assert model_state()==next_state
        with check('Invalid micro model and unsupported prefixes cannot replace state or execute markup'):
            old=model_state()
            page.set_input_files('#micro-import',{'name':'bad.json','mimeType':'application/json','buffer':b'{"format":"wrong"}'})
            expect(page.locator('.llm-error')).to_contain_text('导入失败');assert model_state()==old
            page.set_input_files('#micro-import',{'name':'large.json','mimeType':'application/json','buffer':b'x'*100001})
            expect(page.locator('.llm-error')).to_contain_text('100KB');assert model_state()==old
            page.fill('#micro-prefix','未知');page.click('#micro-generate');assert page.locator('.llm-error').inner_text()
            assert model_state()==old;page.fill('#micro-prefix','蓝猫')
        with check('New training loops stop on route disposal and visibility events'):
            for chapter,button in [('llm-train','#micro-train'),('llm-lora','#lora-train')]:
                route(chapter);page.click(button)
                page.wait_for_function('document.querySelector("#lab-root").getSnapshot().running')
                page.evaluate('window.oldLLM=document.querySelector("#lab-root")');route('llm-bpe')
                old=page.evaluate('oldLLM.getSnapshot().step');page.wait_for_timeout(150)
                assert not page.evaluate('oldLLM.getSnapshot().running') and page.evaluate('oldLLM.getSnapshot().step')==old
                route(chapter);page.click(button)
                page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))')
                assert not snapshot()['running'];page.evaluate('delete document.hidden')
        with check('Advanced progress glossary and snapshots use the existing storage contract'):
            route('llm-rope');page.click('#record-experiment');page.fill('#lesson-note','共同偏移不改变相对旋转点积。')
            page.click('#complete-chapter');page.click('[data-answer="1"]');route('/llm')
            expect(page.locator('.llm-hero')).to_contain_text('进阶进度 1 / 18')
            route('/journal');expect(page.locator('#main')).to_contain_text('共同偏移')
            route('/glossary');page.fill('#dictionary-filter','RoPE');expect(page.locator('.dictionary-term').first).to_contain_text('RoPE')
        with check('All advanced pages fit 320px and 390px without full-page overflow'):
            for width in [390,320]:
                page.set_viewport_size({'width':width,'height':844})
                for chapter in ['/llm',*ids]:
                    route(chapter);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{width}:{chapter}'
                if width==390:
                    for chapter in ['/llm','llm-train','llm-cache']:
                        route(chapter);page.screenshot(path=str(OUT/('llm-'+chapter.split('/')[-1]+'-mobile.png')),full_page=True)
        if MEMORY:
            skip('Advanced route reload and single-file loading preserve actual native state','Explicit memory render; native navigation must run in default CI mode.')
        else:
            with check('Advanced route reload and single-file loading preserve actual native state'):
                route('llm-rope');page.reload(wait_until='networkidle')
                assert page.locator('#lesson-note').input_value()=='共同偏移不改变相对旋转点积。'
                tab=context.new_page();tab.on('pageerror',lambda e:errors.append(str(e)))
                tab.goto((ROOT/'dist/visible-ai-offline.html').as_uri()+'#/llm',wait_until='load')
                expect(tab.locator('h1')).to_contain_text('如何变成回答')
                tab.evaluate("location.hash='/learn/llm-train'");tab.wait_for_selector('#micro-train');tab.close()
        with check('No browser exceptions or remote runtime dependencies in advanced lessons'):
            assert not errors,errors
            assert not [url for url in requests if url.startswith('https://')],requests
        browser.close()
finally:
    if server:
        server.terminate()
        try:server.wait(timeout=5)
        except subprocess.TimeoutExpired:server.kill();server.wait(timeout=5)
    if server_log:server_log.close()
    summary={'mode':'memory-render-with-test-storage' if MEMORY else 'native-http-and-file','passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results),'skipped':sum(r['status']=='SKIP' for r in results),'results':results,'pageErrors':errors}
    (OUT/'llm-browser-results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({k:v for k,v in summary.items() if k not in ['results','pageErrors']},ensure_ascii=False),flush=True)
if any(r['status']=='FAIL' for r in results):raise SystemExit(1)
