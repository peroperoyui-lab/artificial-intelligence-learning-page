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
        server_log=(OUT/'server.log').open('w',encoding='utf8')
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
        ids=page.evaluate('AI.C.chapters.map(c=>c.id)')
        with check('Home renders an actual initialized model'):
            expect(page.locator('h1')).to_contain_text('让抽象的 AI')
            assert float(page.locator('#home-loss').inner_text())>0
            page.screenshot(path=str(OUT/'home-desktop.png'),full_page=True)
        with check('All registered chapters mount their working lab and explanations'):
            assert len(ids)==34
            for chapter in ids:
                route(chapter)
                assert len(page.locator('#main').inner_text())>600
                assert snapshot() is not None
                assert page.locator('.reading-section').count()==page.evaluate('(id)=>AI.C.chapters.find(c=>c.id===id).body.length',chapter)
            assert not errors,errors
        with check('Matrix collapse has zero determinant'):
            route('vectors');page.select_option('#matrix-preset','collapse')
            assert snapshot()['determinant']==0
            range_value('#vector-angle',-45);assert snapshot()['angle']==-45
        with check('Linear regression uses a genuine decreasing gradient step'):
            route('regression');before=snapshot()['loss'];page.click('#reg-step')
            assert snapshot()['loss']<before and snapshot()['iteration']==1
            page.click('#reg-reset');assert snapshot()['iteration']==0
        with check('Neuron controls agree with the displayed derivative'):
            route('neuron')
            for name in ['w1','w2','b']:range_value('#neu-'+name,0)
            assert page.locator('#neuron-stats .metric-value').nth(2).inner_text()=='0.2500'
            page.select_option('#neuron-activation','relu')
            assert page.locator('#neuron-stats .metric-value').nth(2).inner_text()=='0.0000'
        with check('Binary and multiclass cross entropy respond to controls'):
            route('loss');range_value('#loss-p',.001)
            assert abs(snapshot()['bce']+math.log(.001))<1e-8
            page.select_option('#loss-y','0');assert snapshot()['bce']<.002
            old=snapshot()['ce'];range_value('#logit-0',-5);assert snapshot()['ce']>old
        with check('Gradient descent decreases locally and stops divergent trajectories'):
            route('descent');old=snapshot()['loss'];page.click('#gd-step');assert snapshot()['loss']<old
            range_value('#gd-beta',0);range_value('#gd-eta',.35)
            for _ in range(5):page.click('#gd-step')
            expect(page.locator('#gd-status')).to_contain_text('超出')
        with check('Backprop reveals each stage and matches central differences'):
            route('backprop');assert not page.locator('#bp-check').is_visible()
            for _ in range(3):page.click('#bp-next')
            assert page.locator('#bp-check').is_visible()
            assert float(page.locator('#bp-check .metric-value').nth(2).inner_text())<1e-8
            old=snapshot();page.click('#bp-update')
            assert snapshot()['loss']<old['loss'] and snapshot()['w']!=old['w']
            page.screenshot(path=str(OUT/'backprop-desktop.png'),full_page=True)
        with check('MLP trains 100 real epochs and changes its probability field'):
            route('playground');initial_image=page.locator('#play-field').evaluate('(e)=>e.toDataURL()')
            initial_loss=snapshot()['validationLoss'];page.click('#play-hundred')
            page.wait_for_function('document.querySelector("#lab-root").getSnapshot().epoch===100',timeout=25000)
            result=snapshot();assert result['validationLoss']<.15 and result['validationLoss']<initial_loss*.3
            assert result['validationAccuracy']>.9
            assert page.locator('#play-field').evaluate('(e)=>e.toDataURL()')!=initial_image
            (OUT/'training-reference.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
            page.screenshot(path=str(OUT/'training-desktop.png'),full_page=True)
        with check('Model file export, import and continuation preserve actual state'):
            saved=model_state()
            with page.expect_download() as info:page.click('#play-export')
            info.value.save_as(OUT/'model-export.json')
            assert json.loads((OUT/'model-export.json').read_text(encoding='utf8'))==saved
            page.click('#play-reset');assert snapshot()['epoch']==0
            page.set_input_files('#play-import',{'name':'model.json','mimeType':'application/json','buffer':json.dumps(saved).encode()})
            expect(page.locator('#play-status')).to_contain_text('已载入');assert model_state()==saved
            page.click('#play-step');assert snapshot()['epoch']==101 and model_state()['network']!=saved['network']
        with check('Malformed model import is rejected without partial replacement'):
            before=model_state()
            page.set_input_files('#play-import',{'name':'bad.json','mimeType':'application/json','buffer':b'{"format":"wrong"}'})
            expect(page.locator('#play-status')).to_contain_text('导入失败');assert model_state()==before
            page.set_input_files('#play-import',{'name':'large.json','mimeType':'application/json','buffer':b'x'*(1024*1024+1)})
            expect(page.locator('#play-status')).to_contain_text('1 MB');assert model_state()==before
        with check('Architecture and optimizer changes reset the whole experiment'):
            page.select_option('#play-depth','0');assert snapshot()['epoch']==0 and snapshot()['parameters']==3
            assert page.locator('#play-width').is_disabled()
            page.select_option('#play-depth','2');page.select_option('#play-optimizer','sgd')
            assert snapshot()['config']['optimizer']=='sgd'
            page.click('#play-step');assert snapshot()['epoch']==1
            page.select_option('#play-optimizer','adam');assert snapshot()['epoch']==0
        with check('Every supported dataset can execute a training epoch'):
            for dataset in ['circles','moons','spirals','linear','xor']:
                page.select_option('#play-dataset',dataset);page.click('#play-step')
                assert math.isfinite(snapshot()['validationLoss']) and snapshot()['epoch']==1
        with check('Coordinate probing produces a real bounded probability'):
            page.fill('#probe-x1','.25');page.fill('#probe-x2','-.4');page.click('#play-probe')
            expect(page.locator('#play-prediction')).to_contain_text('0.25, -0.40')
            probability=page.evaluate('AI.E.MLP.fromState(document.querySelector("#lab-root").exportState().network).predict([.25,-.4])')
            assert 0<probability<1
        with check('Navigating away cancels training rather than leaving a timer'):
            page.click('#play-run');page.wait_for_function('document.querySelector("#lab-root").getSnapshot().epoch>=4')
            page.evaluate('window.__oldLab=document.querySelector("#lab-root")');route('generalization')
            stopped=page.evaluate('window.__oldLab.exportState().epoch');page.wait_for_timeout(450)
            assert page.evaluate('window.__oldLab.exportState().epoch')==stopped
        with check('Generalization changes an actual fitted polynomial'):
            old=snapshot();range_value('#gen-n',16);range_value('#gen-degree',12);range_value('#gen-noise',.5)
            fit=snapshot();assert len(fit['coefficients'])==13 and math.isfinite(fit['validationMSE'])
            assert fit['validationMSE']!=old['validationMSE']
            norm=sum(v*v for v in fit['coefficients'][1:]);page.select_option('#gen-lambda','1')
            assert sum(v*v for v in snapshot()['coefficients'][1:])<norm
        with check('Threshold extremes expose class imbalance and undefined precision'):
            route('metrics');page.click('#metric-all-negative');m=snapshot()
            assert m['accuracy']==.8 and m['recall']==0 and m['precision'] is None
            page.click('#metric-all-positive');m=snapshot();assert m['recall']==1 and m['precision']==.2
        with check('Convolution pixel edits, kernel and shape changes compute new outputs'):
            route('convolution');page.select_option('#conv-preset','identity');before=snapshot()
            assert before['output'][0][0]==before['image'][1][1]
            page.click('[data-pixel="6"]');assert snapshot()['output'][0][0]!=before['output'][0][0]
            page.select_option('#conv-stride','2');page.select_option('#conv-pad','1');assert len(snapshot()['output'])==3
            page.click('#conv-step');expect(page.locator('#conv-status')).to_contain_text('第 2 /')
        with check('Attention masking and value aggregation agree with the formula'):
            route('attention');a=snapshot();assert a['weights'][2][3:]==[0,0]
            page.uncheck('#att-causal');a=snapshot();assert all(v>0 for v in a['weights'][2])
            for j in range(2):
                expected=sum(a['weights'][2][i]*a['V'][i][j] for i in range(5))
                assert abs(a['output'][2][j]-expected)<1e-10
            range_value('#att-q0',-2);assert snapshot()['Q'][2][0]==-2
        with check('Top-k=1 sampling is deterministic and configuration resets counts'):
            route('tokens');page.select_option('#token-k','1');page.click('#token-many')
            assert snapshot()['counts']==[100,0,0,0,0,0]
            page.select_option('#token-k','6');assert sum(snapshot()['counts'])==0
            page.click('#token-many');assert sum(snapshot()['counts'])==100 and sum(v>0 for v in snapshot()['counts'])>1
        with check('Expanded glossary exposes examples chapter filters and stable deep links'):
            route('/glossary')
            assert page.locator('.dictionary-term').count()==236
            assert page.locator('.term-example').count()==236
            page.select_option('#dictionary-chapter','transformer')
            assert page.locator('.dictionary-term').count()==page.evaluate('AI.C.findTerms("","transformer").length')
            page.select_option('#dictionary-chapter','');page.fill('#dictionary-filter','layer norm')
            expect(page.locator('.dictionary-term').first).to_contain_text('层归一化')
            page.locator('.dictionary-term h3 a').first.click()
            page.wait_for_function('decodeURIComponent(location.hash).includes("/glossary/层归一化")')
            expect(page.locator('#dictionary-filter')).to_have_value('层归一化')
            page.locator('.related-terms a').filter(has_text='批量归一化').first.click()
            expect(page.locator('#dictionary-filter')).to_have_value('批量归一化')
        with check('Chapter terminology links and search route to explanatory entries'):
            route('transformer');page.locator('.chapter-terms summary').click()
            page.locator('.chapter-terms a').filter(has_text='层归一化').first.click()
            expect(page.locator('#dictionary-filter')).to_have_value('层归一化')
            page.click('#search-open');page.fill('#search-input','AdamW')
            page.locator('.search-result').first.click()
            expect(page.locator('#dictionary-filter')).to_have_value('AdamW')
            expect(page.locator('.term-example').first).to_contain_text('AdamW')
        with check('Vision pipeline reacts to pixel edits with actual convolution and pooling'):
            route('cnn');a=snapshot();assert len(a['features']['flat'])==48
            assert a['trainCount']==90 and a['validationCount']==30 and a['trainableParameters']==147
            page.select_option('#cnn-pattern','3');assert all(x==0 for x in snapshot()['features']['flat'])
            page.fill('#cnn-row','4');page.fill('#cnn-col','4');page.fill('#cnn-value','1');page.click('#cnn-set')
            a=snapshot();assert a['image'][3][3]==1 and any(x!=0 for x in a['features']['flat'])
            before=a['features']['flat'];page.select_option('#cnn-pool','average')
            assert snapshot()['features']['flat']!=before and snapshot()['epoch']==0
            page.select_option('#cnn-channel','1');assert snapshot()['channel']==1
            page.locator('[data-cnn-pixel="27"]').click();assert snapshot()['image'][3][3]==0
        with check('Vision classifier actually learns and probing leaves trained weights unchanged'):
            route('cnn');page.select_option('#cnn-pool','max');page.click('#cnn-reset')
            before=snapshot();page.click('#cnn-train')
            page.wait_for_function('document.querySelector("#lab-root").getSnapshot().epoch===40')
            a=snapshot();assert a['metrics']['validation']['loss']<before['metrics']['validation']['loss']*.5
            assert a['metrics']['validation']['accuracy']>=.8 and a['classifier']!=before['classifier']
            model=a['classifier'];page.select_option('#cnn-pattern','1');range_value('#cnn-shift',5)
            assert snapshot()['classifier']==model and snapshot()['epoch']==40
            page.evaluate('document.activeElement.blur();window.scrollTo(0,0)');page.wait_for_timeout(80)
            page.screenshot(path=str(OUT/'cnn-desktop.png'),full_page=True)
        with check('Vision configuration reset and training stop are explicit'):
            page.select_option('#cnn-pool','average');assert snapshot()['epoch']==0
            page.click('#cnn-train');page.wait_for_function('document.querySelector("#lab-root").getSnapshot().epoch>=1')
            page.evaluate('window.oldCase=document.querySelector("#lab-root")');route('loss')
            old=page.evaluate('oldCase.getSnapshot().epoch');page.wait_for_timeout(130)
            assert page.evaluate('oldCase.getSnapshot().epoch')==old and not page.evaluate('oldCase.getSnapshot().running')
        with check('Transformer traces all nine real forward stages and actual matrices'):
            route('transformer')
            for stage in range(9):
                page.click(f'#tr-stages [data-stage="{stage}"]')
                assert snapshot()['stage']==stage
                assert page.locator('#tr-tensors .tensor-table').count()>0
            a=snapshot();assert len(a['probabilities'])==4
            assert all(abs(sum(row)-1)<1e-10 for row in a['probabilities'])
            page.click('#tr-stages [data-stage="3"]')
            page.evaluate('document.activeElement.blur();window.scrollTo(0,0)');page.wait_for_timeout(80)
            page.screenshot(path=str(OUT/'transformer-desktop.png'),full_page=True)
        with check('Transformer masks future tokens and its switches change the computation'):
            route('transformer');a=snapshot()
            page.select_option('[data-tr-token="3"]','1');b=snapshot()
            assert a['output'][:3]==b['output'][:3] and a['output'][3]!=b['output'][3]
            assert all(b['heads'][0]['weights'][0][j]==0 for j in range(1,4))
            page.uncheck('#tr-causal');assert all(x>0 for x in snapshot()['heads'][0]['weights'][0])
            page.uncheck('#tr-position');a=snapshot();page.click('#tr-swap');b=snapshot()
            assert max(abs(x-y) for x,y in zip(a['output'][0],b['output'][1]))<1e-9
            page.uncheck('#tr-residual');page.uncheck('#tr-norm')
            assert snapshot()['output']==snapshot()['ff']
        with check('Transformer hard caps keep all configurations small and deterministic'):
            route('transformer');page.select_option('#tr-length','8');page.select_option('#tr-heads','1')
            a=snapshot();assert len(a['heads'])==1 and a['dk']==4 and len(a['output'])==8
            page.select_option('#tr-heads','2');a=snapshot();assert a['dk']==2 and len(a['heads'])==2
            assert a['parameters']==228 and sum(len(h['weights'])**2 for h in a['heads'])==128
            page.select_option('#tr-length','1');assert page.locator('#tr-swap').is_disabled()
            assert len(snapshot()['output'])==1
        with check('Transformer playback disposes its timer on navigation'):
            route('transformer');page.click('#tr-play')
            page.wait_for_function('document.querySelector("#lab-root").getSnapshot().stage>=1')
            page.evaluate('window.oldTrace=document.querySelector("#lab-root")');route('vectors')
            old=page.evaluate('oldTrace.getSnapshot().stage');page.wait_for_timeout(800)
            assert page.evaluate('oldTrace.getSnapshot().stage')==old and not page.evaluate('oldTrace.getSnapshot().running')
        with check('K-means exposes both half steps and a nonincreasing objective'):
            route('clustering');assert snapshot()['labels']==[]
            page.click('#km-step');a=snapshot();assert a['phase']=='update' and len(a['labels'])==120
            page.click('#km-step');b=snapshot();assert b['phase']=='assign' and b['iteration']==1 and b['inertia']<=a['inertia']+1e-9
            page.click('#km-run');page.wait_for_function('document.querySelector("#lab-root").getSnapshot().converged')
            a=snapshot();assert all(a['history'][i+1][1]<=a['history'][i][1]+1e-9 for i in range(len(a['history'])-1))
            assert page.locator('#km-run').is_disabled();page.screenshot(path=str(OUT/'clustering-desktop.png'),full_page=True)
        with check('K-means initialization dataset and scale changes reset the experiment'):
            page.select_option('#km-data','rings');assert snapshot()['labels']==[]
            range_value('#km-k',2);a=snapshot();assert len(a['centers'])==2
            page.select_option('#km-init','random');assert snapshot()['method']=='random'
            before=snapshot()['points'];range_value('#km-scale',2);after=snapshot()['points']
            assert all(abs(2*p[0]-q[0])<1e-10 for p,q in zip(before,after))
            page.click('#km-step');assert snapshot()['halfSteps']==1
        with check('Every new loop honors the visibility-change stop handler'):
            for chapter,button in [('cnn','#cnn-train'),('transformer','#tr-play'),('clustering','#km-run')]:
                route(chapter);page.click(button)
                page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))')
                assert not snapshot()['running'],chapter
                page.evaluate('delete document.hidden')
        with check('Bounded CPU forward timing is measured without a remote model'):
            route('transformer')
            timing=page.evaluate("""()=>{const f=()=>AI.E.tinyTransformer([0,1,2,3,4,5,6,7]);for(let i=0;i<20;i++)f();const samples=[];for(let i=0;i<100;i++){const start=performance.now();f();samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);return {operation:'8-token 2-head fixed Transformer forward',samples:100,medianMs:samples[50],p95Ms:samples[95],maxMs:samples[99],userAgent:navigator.userAgent,includesRendering:false};}""")
            assert all(math.isfinite(timing[k]) for k in ['medianMs','p95Ms','maxMs'])
            (OUT/'performance.json').write_text(json.dumps(timing,ensure_ascii=False,indent=2),encoding='utf8')
            print('PERFORMANCE:',json.dumps(timing),flush=True)
            page.set_viewport_size({'width':390,'height':844})
            for chapter in ['cnn','transformer','clustering']:
                route(chapter);page.screenshot(path=str(OUT/(chapter+'-mobile.png')),full_page=True)
            page.set_viewport_size({'width':1440,'height':1000})
        with check('Experiment snapshots are retained and exportable in the journal'):
            page.click('#record-experiment');route('/journal');assert page.locator('.journal-entry').count()>=1
            with page.expect_download() as info:page.click('#journal-export')
            info.value.save_as(OUT/'learning-records.json')
            backup=json.loads((OUT/'learning-records.json').read_text(encoding='utf8'))
            assert backup['format']=='visible-ai-learning-records-v1' and len(backup['journal'])>=1
        note='我观察到 p−y 决定输出梯度。\n<b id="injected">只作文字</b>'
        with check('Quiz, completion and escaped notes survive chapter navigation'):
            route('backprop');page.click('[data-answer="1"]');expect(page.locator('#quiz-feedback')).to_contain_text('答对了')
            page.fill('#lesson-note',note);page.click('#complete-chapter');route('/journal')
            assert page.locator('#injected').count()==0 and '<b id="injected">只作文字</b>' in page.locator('#main').inner_text()
            route('backprop');assert page.locator('#lesson-note').input_value()==note
            assert page.locator('#complete-chapter').get_attribute('aria-pressed')=='true'
            assert page.evaluate('AI.U.load().notes.backprop')==note
        with check('Bilingual dictionary filtering and global keyboard search work'):
            route('/glossary');page.fill('#dictionary-filter','gradient');assert page.locator('.dictionary-term').count()>=1
            page.locator('#main').focus();page.keyboard.press('/');expect(page.locator('#search-dialog')).to_be_visible()
            page.fill('#search-input','attention');assert page.locator('.search-result').count()>0
            page.locator('.search-result').first.click();expect(page.locator('#search-dialog')).not_to_be_visible()
            page.wait_for_selector('#att-query');page.click('#search-open');page.keyboard.press('Escape')
            expect(page.locator('#search-dialog')).not_to_be_visible()
        with check('Focus and reduced-motion preferences toggle accessibly'):
            page.click('#focus-toggle');assert page.locator('body').evaluate('(e)=>e.classList.contains("focus-mode")')
            assert not page.locator('#sidebar').is_visible();page.click('#focus-toggle');page.click('#motion-toggle')
            assert page.locator('#motion-toggle').get_attribute('aria-pressed')=='true';page.click('#motion-toggle')
        with check('Unknown route has a usable return path'):
            page.evaluate("location.hash='/unknown-route'");page.wait_for_selector('.not-found')
            page.locator('.not-found a').click();page.wait_for_selector('#home-train')
        with check('Home teaser trains a real network instead of playing canned frames'):
            before=float(page.locator('#home-loss').inner_text());page.click('#home-train')
            expect(page.locator('#home-epoch')).to_have_text('Epoch 100',timeout=25000)
            assert float(page.locator('#home-loss').inner_text())<before*.3
        with check('Every chapter fits a 390-pixel viewport without page overflow'):
            page.set_viewport_size({'width':390,'height':844})
            for chapter in ids:
                route(chapter);assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),chapter
            route('playground');page.screenshot(path=str(OUT/'training-mobile.png'),full_page=True)
        with check('320-pixel layout and mobile navigation remain usable'):
            page.set_viewport_size({'width':320,'height':740})
            for chapter in ['/','vectors','playground','attention','tokens','cnn','transformer','clustering','/glossary']:
                route(chapter);assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),chapter
            route('/');page.click('#menu-toggle');assert page.locator('#sidebar').is_visible()
            page.locator('#sidebar a[href="#/learn/map"]').click();page.wait_for_selector('#map-task')
            assert not page.locator('#sidebar').is_visible()
            page.screenshot(path=str(OUT/'map-mobile.png'),full_page=True)
        if MEMORY:
            skip('Native HTTP reload preserves browser storage','Explicit test Storage adapter; no native-origin assertion.')
            skip('Original and bundled file URLs load independently','Use default mode to verify native URL navigation.')
            skip('Static assets resolve under a project subpath','Requires native HTTP navigation; not claimed by memory mode.')
        else:
            with check('Native HTTP reload preserves browser storage'):
                page.set_viewport_size({'width':1440,'height':1000});route('backprop');page.reload(wait_until='networkidle')
                assert page.locator('#lesson-note').input_value()==note
                assert page.locator('#complete-chapter').get_attribute('aria-pressed')=='true'
            with check('Original and bundled file URLs load independently'):
                for filename in ['index.html','dist/visible-ai-offline.html']:
                    tab=context.new_page();tab.on('pageerror',lambda e:errors.append(str(e)))
                    tab.goto((ROOT/filename).as_uri(),wait_until='load')
                    expect(tab.locator('h1')).to_contain_text('让抽象的 AI')
                    tab.evaluate("location.hash='/learn/loss'");tab.wait_for_selector('#loss-p');tab.close()
            with check('Static assets resolve under a project subpath'):
                tab=context.new_page();tab.on('pageerror',lambda e:errors.append(str(e)))
                tab.goto(base+'/dist/index.html#/learn/playground',wait_until='networkidle')
                expect(tab.locator('#play-count')).to_contain_text('105');tab.close()
        with check('No unhandled browser exceptions or remote runtime dependencies'):
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
    (OUT/'browser-results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({k:v for k,v in summary.items() if k not in ['results','pageErrors']},ensure_ascii=False),flush=True)
if any(r['status']=='FAIL' for r in results):raise SystemExit(1)
