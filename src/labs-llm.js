/* Advanced lessons share the existing numerical engine and lifecycle. */
(function (root) {
  'use strict';
  const { E, L, U, labs } = root.AI;
  const esc = U.escape, sum = a => a.reduce((s,x)=>s+x,0), f = (x,d=3)=>U.fmt(x,d);
  const table = (headers, rows, caption='计算结果') => `<div class="table-scroll"><table class="llm-table"><caption>${esc(caption)}</caption><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const matrix = (rows, label, probability=false) => `<figure class="llm-tensor"><figcaption>${esc(label)} <span>${rows.length}×${rows[0]?.length||0}</span></figcaption><div class="table-scroll"><table class="llm-matrix"><caption class="sr-only">${esc(label)}</caption><tbody>${rows.map((row,i)=>`<tr>${row.map((x,j)=>`<td style="background:${U.probColor(probability?x:(E.clamp(x,-2,2)+2)/4)}" title="行${i+1} 列${j+1}: ${f(x,6)}">${f(x,2)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></figure>`;
  const tokens = a => `<div class="llm-tokens">${a.map((x,i)=>`<span class="llm-token"><small>${i}</small>${esc(x===' '?'␠':x==='\n'?'↵':x)}</span>`).join('')}</div>`;
  const range=(id,label,min,max,step,value)=>U.range(id,label,min,max,step,value);
  const select=U.select;
  function frame(el, label, controls, note) {
    el.classList.add('llm-lab');
    el.innerHTML=`<div class="llm-lab-heading"><span class="llm-kind">${esc(label)}</span><p>${esc(note)}</p></div><div class="llm-controls">${controls}</div><div class="llm-actions"></div><div class="llm-error" role="status"></div><div class="llm-body"></div><div class="stats llm-stats"></div>`;
    const q=s=>U.$(s,el), state={}; el.getSnapshot=()=>JSON.parse(JSON.stringify(state));
    return {q,state,body:html=>q('.llm-body').innerHTML=html,stats:p=>U.stats(q('.llm-stats'),p),
      on:(id,fn,event='input')=>{q('#'+id).addEventListener(event,()=>{try{q('.llm-error').textContent='';const field=q('#'+id);if(field.type==='number'&&(!field.value||!field.checkValidity()))throw new Error('请输入范围内的数值');if(field.type==='range')q('#'+id+'-out').textContent=field.value;fn(field);}catch(e){q('.llm-error').textContent=e.message;}});},
      button:(id,text,fn)=>{const b=document.createElement('button');b.id=id;b.textContent=text;q('.llm-actions').append(b);b.onclick=()=>{try{q('.llm-error').textContent='';fn();}catch(e){q('.llm-error').textContent=e.message;}};return b;}};
  }
  function objective(el,sft=false) {
    const probabilities=sft?[.95,.2,.9,.5,.6,.4,.8]:[.7,.5,.2,.8];
    const labels=sft?['<user>','问题','<assistant>','猫','吃','鱼','<EOS>']:['我','爱','猫','<EOS>'];
    let mask=probabilities.map(()=>1);
    const a=frame(el,sft?'目标函数实验 · 人工概率':'张量与损失 · 人工概率',
      (sft?select('lm-maskmode','监督位置',[['answer','仅回答'],['all','全序列']],'answer'):'')+probabilities.map((p,i)=>range('lm-p'+i,`位置 ${i+1} 正确词概率`,.01,.99,.01,p)).join(''),
      '每列输入预测下一词。概率由控件指定；下方因果可见矩阵与损失掩码分别展示。');
    function draw(){
      if(sft)mask=probabilities.map((_,i)=>a.q('#lm-maskmode').value==='all'||i>=3?1:0);
      const result=L.maskedLoss(probabilities,mask);Object.assign(a.state,{probabilities,mask,labels,...result});
      a.body(`<div class="llm-flow"><strong>输入</strong>${tokens(['<BOS>',...labels.slice(0,-1)])}<strong>下一词标签</strong>${tokens(labels)}</div><div class="llm-two">${matrix(labels.map((_,i)=>labels.map((_,j)=>j<=i?1:0)),'因果注意力：1 可见 / 0 不可见',true)}<div>${table(['目标','p','−ln p','计入'],labels.map((t,i)=>[t,f(probabilities[i]),f(result.losses[i]),mask[i]?'是':'否']),'各位置监督')}<div class="llm-mask-controls">${sft?'':mask.map((v,i)=>`<label><input type="checkbox" data-lossmask="${i}" ${v?'checked':''}>位置 ${i+1}</label>`).join('')}</div></div></div>`);
      a.q('.llm-mask-controls').onchange=e=>{if(e.target.dataset.lossmask!==undefined){mask[Number(e.target.dataset.lossmask)]=Number(e.target.checked);draw();}};
      a.stats([['有效监督位置',String(result.count)],['平均 NLL',f(result.loss,4)],['困惑度',f(result.perplexity,3)],['概率来源','手动设定']]);
    }
    probabilities.forEach((_,i)=>a.on('lm-p'+i,e=>{probabilities[i]=Number(e.value);draw();}));if(sft)a.on('lm-maskmode',draw,'change');draw();
  }
  labs['llm-objective']=el=>objective(el);
  labs['llm-sft']=el=>objective(el,true);
  labs['llm-bpe']=el=>{
    let merges=0;
    const a=frame(el,'真实算法 · 字符级 BPE',`<label class="llm-wide">训练语料<textarea id="bpe-text" maxlength="800" rows="3">学习模型 学习模型 学习语言 学习语言\nlow lower low lower lowest</textarea></label>${range('bpe-merges','最多合并次数',0,24,1,0)}`,'从 Unicode 字符开始，空白保持独立；当前片段拼接始终还原原文。最多 800 字符，不是生产 tokenizer。');
    function draw(){const r=L.bpe(a.q('#bpe-text').value,merges);Object.assign(a.state,r,{merges});a.body(tokens(r.pieces)+table(['步','相邻对','频次','实际替换','片段数'],r.history.map((h,i)=>[i+1,h.pair.join(' + '),h.frequency,h.replacements,`${h.before} → ${h.after}`]),'有序合并历史'));a.stats([['原始码点数',String(r.original)],['当前片段数',String(r.count)],['已执行合并',String(r.history.length)],['可逆核验',r.pieces.join('')===a.q('#bpe-text').value?'完全一致':'不一致']]);}
    a.on('bpe-text',draw);a.on('bpe-merges',e=>{merges=Number(e.value);draw();});a.button('bpe-step','再合并一步',()=>{merges=Math.min(24,merges+1);a.q('#bpe-merges').value=merges;a.q('#bpe-merges-out').textContent=merges;draw();});draw();
  };
  labs['llm-data']=el=>{
    const a=frame(el,'真实布局 · 字符作为教学单位',`<label class="llm-wide">一行一篇文档<textarea id="pack-docs" maxlength="800" rows="4">猫喜欢鱼\n鸟喜欢米\n猫喜欢鱼\n模型读取文本并学习</textarea></label>${range('pack-size','窗口长度',4,32,1,12)}${select('pack-dedup','精确去重',[[1,'开启'],[0,'关闭']],1)}`,'每篇文档追加 EOS；只展示 packing，不实施跨文档注意力隔离。颜色和编号标注文档来源。');
    function draw(){const r=L.pack(a.q('#pack-docs').value.split('\n'),Number(a.q('#pack-size').value),a.q('#pack-dedup').value==='1');Object.assign(a.state,r);a.body(`<div class="llm-packed">${r.rows.map((row,i)=>`<div><b>窗口 ${i+1}</b><div class="llm-tokens">${row.map(x=>`<span class="llm-token doc-${(x.document+1)%4}" title="文档 ${x.document+1}"><small>${x.document<0?'空位':'文档 '+(x.document+1)}</small>${esc(x.text)}</span>`).join('')}</div></div>`).join('')||'<p>没有非空文档，请输入短文本。</p>'}</div>`);a.stats([['保留文档',String(r.kept.length)],['有效位置',String(r.tokens)],['分配位置',String(r.slots)],['占用率',U.pct(r.utilization)]]);}
    a.on('pack-docs',draw);a.on('pack-size',draw);a.on('pack-dedup',draw,'change');draw();
  };
  labs['llm-rope']=el=>{
    const a=frame(el,'真实旋转 · 固定教学向量',range('rope-m','查询位置 m',0,30,1,1)+range('rope-n','键位置 n',0,30,1,3)+range('rope-offset','共同位置偏移',0,100,1,0)+select('rope-base','频率底数',[100,10000],10000),'图形显示第一二维平面；表格与点积使用完整四维向量 q=[1,0,0.5,0.8]、k=[0,1,0.8,−0.2]。');
    function draw(){const m=Number(a.q('#rope-m').value),n=Number(a.q('#rope-n').value),offset=Number(a.q('#rope-offset').value),base=Number(a.q('#rope-base').value),q=[1,0,.5,.8],k=[0,1,.8,-.2],rq=L.rope(q,m+offset,base),rk=L.rope(k,n+offset,base),score=L.dot(rq,rk),unshifted=L.dot(L.rope(q,m,base),L.rope(k,n,base));Object.assign(a.state,{m,n,offset,rq,rk,score,unshifted});a.body(`<div class="llm-two"><div id="rope-plot"></div><div>${matrix([q,k,rq,rk],'q / k / 旋转 q / 旋转 k')}${table(['检查项','结果'],[['原 q 长度',f(Math.sqrt(L.dot(q,q)),6)],['旋转 q 长度',f(Math.sqrt(L.dot(rq,rq)),6)],['未共同偏移点积',f(unshifted,6)]])}</div></div>`);U.plot(a.q('#rope-plot'),[{points:[[0,0],rq.slice(0,2)],color:'teal',width:4},{points:[[0,0],rk.slice(0,2)],color:'orange',width:4},{points:U.curve(x=>Math.sqrt(Math.max(0,1-x*x)),-1,1),color:'gray',dash:true},{points:U.curve(x=>-Math.sqrt(Math.max(0,1-x*x)),-1,1),color:'gray',dash:true}],{xmin:-1.3,xmax:1.3,ymin:-1.3,ymax:1.3,title:'RoPE 第一分量对：青色查询、橙色键',height:350});a.stats([['相对位移 n−m',String(n-m)],['完整点积',f(score,6)],['共同偏移误差',f(Math.abs(score-unshifted),9)],['旋转长度','保持']]);}
    ['rope-m','rope-n','rope-offset'].forEach(id=>a.on(id,draw));a.on('rope-base',draw,'change');draw();
  };
  labs['llm-block']=el=>{
    const a=frame(el,'真实数值 · 增益固定为 1',range('norm-shift','所有分量共同偏移',-5,5,.1,0)+range('norm-scale','整体倍数',.1,3,.1,1)+range('gate-x','门控分支第一项',-5,5,.1,1),'基础向量 [−1,0,1,2]；门控另一分支固定为 [2,−1,0.5,1]。比较数值，不模拟训练效果。');
    function draw(){const shift=Number(a.q('#norm-shift').value),scale=Number(a.q('#norm-scale').value),x=[-1,0,1,2].map(v=>v*scale+shift),r=L.norms(x),gate=[Number(a.q('#gate-x').value),-1,.5,2],up=[2,-1,.5,1],output=L.swiglu(gate,up);Object.assign(a.state,{x,...r,gate,up,output});a.body(`<div class="llm-two">${matrix([x,r.layerNorm,r.rmsNorm],'输入 / LayerNorm / RMSNorm')}${matrix([gate,gate.map(g=>g*E.sigmoid(g)),up,output],'Gate / SiLU / Up / 逐元素乘积')}</div><div id="silu-plot"></div>`);U.plot(a.q('#silu-plot'),[{points:U.curve(x=>x*E.sigmoid(x),-5,5),color:'teal'},{points:U.curve(x=>Math.max(0,x),-5,5),color:'orange',dash:true}],{xmin:-5,xmax:5,ymin:-.5,ymax:5,height:220,title:'SiLU 实线与 ReLU 虚线',xlabel:'门控输入',ylabel:'SiLU 实线 / ReLU 虚线'});a.stats([['输入均值',f(r.mean)],['RMSNorm 均值',f(sum(r.rmsNorm)/4)],['LN 均值',f(sum(r.layerNorm)/4)],['门控输出第1项',f(output[0])]]);}
    ['norm-shift','norm-scale','gate-x'].forEach(id=>a.on(id,draw));draw();
  };
  labs['llm-cache']=el=>{
    const a=frame(el,'等价性检查 + 容量估算',range('kv-tokens','数值实验位置数',1,12,1,5)+select('kv-heads','资源场景的 KV 头数',[1,2,4,8],8)+select('kv-length','资源场景上下文长度',[512,2048,8192,32768],2048),'左侧人工 Q/K/V 验证逐行缓存与完整因果结果。右侧容量按 24 层、单请求、头维64、16位KV计算；不测硬件速度。');
    function draw(){const r=L.cachedAttention(Number(a.q('#kv-tokens').value)),b=L.budget({kvHeads:Number(a.q('#kv-heads').value),context:Number(a.q('#kv-length').value)});Object.assign(a.state,r,{kvBytes:b.kv});a.body(`<div class="llm-two">${matrix(r.weights,'完整因果注意力权重',true)}<div>${matrix(r.full,'完整计算输出')}${matrix(r.cached,'逐步缓存输出')}</div></div><p class="llm-note">投影行数比较：每次重算全部前缀 vs 每次只新增一行。该计数没有包含点积、Softmax、层数或矩阵宽度。</p>`);a.stats([['最大输出误差',f(r.maxError,10)],['重算前缀投影行',String(r.recomputedProjectionRows)],['缓存新增投影行',String(r.freshProjectionRows)],['情景 KV / MiB',f(b.kv/2**20,1)]]);}
    a.on('kv-tokens',draw);['kv-heads','kv-length'].forEach(id=>a.on(id,draw,'change'));draw();
  };
  labs['llm-budget']=el=>{
    const a=frame(el,'情景计算器 · 非硬件测量',range('budget-n','模型参数 / 十亿',.1,20,.1,1)+range('budget-data','训练数据 / 十亿token',1,400,1,20)+select('budget-devices','理想数据并行设备数',[1,2,4,8,16],1)+range('budget-accum','梯度累积步数',1,32,1,8)+range('budget-eff','假设计算利用率',.1,.9,.05,.4)+select('budget-bits','推理权重位宽',[4,8,16,32],16),'每设备假定100 TFLOP/s，微批量2、上下文2048。训练状态按16字节/参数粗算；未计激活、通信和分配开销。');
    function draw(){const n=Number(a.q('#budget-n').value),r=L.budget({parameters:n,data:Number(a.q('#budget-data').value),devices:Number(a.q('#budget-devices').value),accum:Number(a.q('#budget-accum').value),utilization:Number(a.q('#budget-eff').value),bits:Number(a.q('#budget-bits').value)});Object.assign(a.state,r);a.body(table(['预算项目','结果','范围'],[['推理权重净载荷',f(r.weights/2**30,2)+' GiB','未计量化元数据'],['假设混合精度 Adam 状态',f(r.adamState/2**30,2)+' GiB','未计激活、缓冲；未按设备分片'],['16位 KV 示例',f(r.kv/2**30,3)+' GiB','固定24层/8头/头维64/单请求'],['训练 FLOPs',r.flops.toExponential(3),'稠密近似 6ND'],['有效 token / 更新',r.tokensPerUpdate,'假设每样本2048有效位置']],'从假设到资源量级')+'<p class="llm-note">设备数只在本页改变理想计算吞吐与有效批量；没有模拟张量、流水或优化器分片。不要用这个下界判断某台设备一定能跑。</p>');a.stats([['推理权重 / GiB',f(r.weights/2**30,2)],['训练状态 / GiB',f(r.adamState/2**30,2)],['理想耗时 / 天',f(r.days,3)],['有效样本 / 更新',String(r.effectiveBatch)]]);}
    ['budget-n','budget-data','budget-accum','budget-eff'].forEach(id=>a.on(id,draw));['budget-devices','budget-bits'].forEach(id=>a.on(id,draw,'change'));draw();
  };
  labs['llm-lora']=el=>{
    let model=new L.LoRA(),step=0,history=[],target=100;
    const a=frame(el,'真实训练 · 低秩矩阵拟合',select('lora-rank','低秩 r',[1,2,3,4],1),'拟合固定秩二的4×4目标增量；W₀=0，α=r，缩放为1。不是语言模型微调。最多300步。');
    function draw(){const d=model.delta(),g=model.gradients();Object.assign(a.state,{step,rank:model.rank,A:model.A,B:model.B,delta:d,loss:g.loss,running:loop.running});a.body(`<div class="llm-two">${matrix(model.target,'目标 ΔW')}${matrix(d,'当前 BA')}</div><div class="llm-two">${matrix(model.A,'A：r×4')}${matrix(model.B,'B：4×r')}</div><div id="lora-plot"></div>`);U.plot(a.q('#lora-plot'),[{points:history,color:'teal'}],{xmin:0,xmax:Math.max(step,10),ymin:0,ymax:.13,height:220,xlabel:'更新步',ylabel:'16项平均平方误差'});a.stats([['更新步',String(step)],['拟合 MSE',f(g.loss,6)],['因子参数',String(model.rank*8)],['完整矩阵参数','16']]);}
    const loop=new U.Loop(()=>{model.step();step++;history.push([step,model.gradients().loss]);if(step%5===0||step===target)draw();return step<target&&step<300;},20,r=>{train.textContent=r?'暂停':'训练100步';a.state.running=r;});
    const train=a.button('lora-train','训练100步',()=>{if(loop.running)loop.stop();else{target=Math.min(step+100,300);if(step<300)loop.start();}});
    a.button('lora-step','更新一步',()=>{loop.stop();if(step<300){model.step();step++;history.push([step,model.gradients().loss]);draw();}});
    const reset=()=>{loop.stop();model=new L.LoRA(Number(a.q('#lora-rank').value));step=0;history=[[0,model.gradients().loss]];draw();};
    a.button('lora-reset','重置',reset);a.on('lora-rank',reset,'change');reset();return()=>loop.dispose();
  };
  labs['llm-align']=el=>{
    const a=frame(el,'DPO 单对目标 · 非策略训练',range('dpo-policy','策略对数概率差 a',-6,6,.1,1)+range('dpo-reference','参考对数概率差 b',-6,6,.1,0)+range('dpo-beta','β',.05,2,.05,.5),'a 和 b 分别是 chosen 与 rejected 的整段回答对数概率差。β固定时改变a，显示独立一维目标。');
    function draw(){const policy=Number(a.q('#dpo-policy').value),reference=Number(a.q('#dpo-reference').value),beta=Number(a.q('#dpo-beta').value),r=L.dpo(policy,reference,beta);Object.assign(a.state,{policy,reference,beta,...r});a.body('<div id="dpo-plot"></div>'+table(['阶段','量'],[['当前策略偏好差',f(policy)],['参考偏好差',f(reference)],['相对优势 a−b',f(r.margin)],['仅标量SGD，η=0.1时的 a′',f(policy-.1*r.gradient)]],'本次计算'));U.plot(a.q('#dpo-plot'),[{points:U.curve(x=>L.dpo(x,reference,beta).loss,-6,6),color:'teal'},{points:[[policy,r.loss]],type:'scatter',radius:6,color:'orange'}],{xmin:-6,xmax:6,ymin:0,ymax:Math.max(2,L.dpo(-6,reference,beta).loss),xlabel:'策略差 a',ylabel:'固定 b、β 的 DPO 损失',height:300});a.stats([['相对优势',f(r.margin)],['DPO loss',f(r.loss,5)],['∂L/∂a',f(r.gradient,5)],['偏好模型概率',U.pct(r.preference)]]);}
    ['dpo-policy','dpo-reference','dpo-beta'].forEach(id=>a.on(id,draw));draw();
  };
  labs['llm-decode']=el=>{
    let counts=Array(6).fill(0),random=E.rng(73);const labels=['猫','鸟','鱼','米','。','EOS'],logits=[3,2,1,.5,0,-1];
    const a=frame(el,'真实采样 · 固定人工 logits',range('decode-temp','温度',.05,3,.05,1)+select('decode-k','top-k',[1,2,3,4,5,6],6)+range('decode-p','top-p',.05,1,.05,.9),'顺序：温度→top-k→重归一化→top-p→重归一化。EOS 在计数试验中不终止统计，非文本生成。');
    let distribution;
    function draw(){distribution=L.nucleus(logits,Number(a.q('#decode-temp').value),Number(a.q('#decode-k').value),Number(a.q('#decode-p').value));Object.assign(a.state,distribution,{counts});a.body(`<div class="llm-two"><div><h3>理论概率</h3><div id="decode-theory"></div></div><div><h3>抽样频率（n=${sum(counts)}）</h3><div id="decode-frequency"></div></div></div>`);U.bars(a.q('#decode-theory'),labels,distribution.probabilities);U.bars(a.q('#decode-frequency'),labels,counts.map(n=>sum(counts)?n/sum(counts):0));a.stats([['保留候选',String(distribution.kept.length)],['理论熵 / nat',f(distribution.entropy,4)],['抽样次数',String(sum(counts))],['模型权重更新','无']]);}
    const reset=()=>{counts=Array(6).fill(0);random=E.rng(73);draw();};['decode-temp','decode-p'].forEach(id=>a.on(id,reset));a.on('decode-k',reset,'change');
    a.button('decode-sample','抽样200次',()=>{if(sum(counts)>=10000)throw new Error('达到10000次上限，请重置');for(let i=0;i<200;i++)counts[E.sample(distribution.probabilities,random)]++;draw();});a.button('decode-reset','重置计数',reset);draw();
  };
  labs['llm-quant']=el=>{
    const a=frame(el,'真实数值 · 对称均匀量化',select('quant-bits','位宽',[2,3,4,8],4)+select('quant-group','每组数值个数',[1,4,8,16],16)+range('quant-outlier','最后一个离群值',1,16,.5,8)+select('quant-clip','裁剪边界',[[0,'按组最大值'],[1,'固定±1'],[2,'固定±2'],[4,'固定±4']],0),'16个数值，每组一个32bit scale；容量为理想打包账本。MSE对原始值计算，非GPU量化性能测试。');
    function draw(){const values=Array.from({length:16},(_,i)=>i===15?Number(a.q('#quant-outlier').value):Math.sin(i*1.7)*.9),bits=Number(a.q('#quant-bits').value),r=L.quantize(values,bits,Number(a.q('#quant-group').value),Number(a.q('#quant-clip').value));Object.assign(a.state,r,{values,bits});a.body('<div id="quant-plot"></div>'+table(['编号','原值','整数编码','重建值','误差'],values.map((x,i)=>[i,f(x,3),r.q[i],f(r.reconstructed[i],3),f(x-r.reconstructed[i],3)]),'原始值与量化重建'));U.plot(a.q('#quant-plot'),[{points:values.map((x,i)=>[i,x]),color:'teal'},{points:r.reconstructed.map((x,i)=>[i,x]),color:'orange',dash:true}],{xmin:0,xmax:15,ymin:-2,ymax:Math.max(2,...values),xlabel:'数值序号',ylabel:'实线原值 / 虚线重建',height:250});a.stats([['MSE',f(r.mse,5)],['分组scale数',String(r.scales.length)],['理论载荷 / bit',String(r.payloadBits)],['FP32原始 / bit',String(r.rawBits)]]);}
    a.on('quant-outlier',draw);['quant-bits','quant-group','quant-clip'].forEach(id=>a.on(id,draw,'change'));draw();
  };
  labs['llm-moe']=el=>{
    const a=frame(el,'稀疏分配 · 不执行专家网络',range('moe-bias','专家1的路由偏置',0,6,.2,1)+select('moe-top','每词元选专家数',[1,2,3,4],2)+range('moe-capacity','每专家容量',1,6,1,3),'按 token 顺序接收分支，溢出分支丢弃且不重新归一化。只演示路由与负载，不训练 MoE。');
    function draw(){const bias=Number(a.q('#moe-bias').value),scores=Array.from({length:6},(_,i)=>Array.from({length:4},(_,j)=>Math.cos(i+j*2)+(j===0?bias:0))),r=L.routeExperts(scores,Number(a.q('#moe-top').value),Number(a.q('#moe-capacity').value));Object.assign(a.state,r,{scores});a.body(`<div class="llm-two">${matrix(scores,'6 个 token × 4 个专家的分数')}${table(['token','选择、权重与接收状态'],r.assignments.map((xs,i)=>[i+1,xs.map(x=>`专家${x.id+1} (${f(x.weight,2)}) ${x.accepted?'✓接收':'×溢出'}`).join('；')]),'实际分支分配')}</div><div class="llm-expert-load">${r.loads.map((n,i)=>`<div><strong>专家 ${i+1}</strong><meter min="0" max="6" value="${n}" aria-label="专家${i+1}已接收${n}条分支"></meter><span>${n} 条分支</span></div>`).join('')}</div>`);a.stats([['请求分支',String(r.requested)],['接收分支',String(sum(r.loads))],['溢出分支',String(r.dropped)],['完全未接收的token',String(r.assignments.filter(xs=>xs.every(x=>!x.accepted)).length)]]);}
    ['moe-bias','moe-capacity'].forEach(id=>a.on(id,draw));a.on('moe-top',draw,'change');draw();
  };
  const docs=['LoRA冻结基座权重，训练低秩适配器参数。','RAG检索外部文档，把证据加入上下文，不直接更新模型权重。','KV缓存保存历史键值，减少生成中的重复计算，但会占用显存。','指令微调使用问题和示范回答，损失可以仅计入回答位置。','量化减少数值表示位宽，需要记录缩放因子，并重新检查模型质量。','评估要检查正确率、证据支持、失败样本和数据污染，检索分数不证明事实正确。'];
  labs['llm-rag']=el=>{
    const a=frame(el,'真实检索 · 本地 TF-IDF',`<label class="llm-wide">问题<input id="rag-query" type="search" maxlength="160" value="RAG会更新模型权重吗"></label>${select('rag-k','召回数量',[1,2,3,4,5,6],3)}`,'六段原创资料；字符与二元片段检索，不使用语义模型，不生成答案。得分为0时明确无词项匹配证据。');
    function draw(){const query=a.q('#rag-query').value,r=L.retrieve(query,docs,Number(a.q('#rag-k').value));Object.assign(a.state,{query,results:r});a.body(`<div class="llm-two"><div><h3>召回证据</h3>${r.map(x=>`<article class="llm-evidence"><header><strong>[${x.id+1}] 文档 ${x.id+1}</strong><span>词项相似 ${f(x.score,4)}</span></header><p>${esc(x.text)}</p>${x.score===0?'<small>无匹配信号，不作有效证据。</small>':''}</article>`).join('')}</div><div><h3>本地资料库</h3>${docs.map((d,i)=>`<p class="llm-note">[${i+1}] ${esc(d)}</p>`).join('')}<p class="llm-caution">没有自动生成答案。是否足以回答问题，还需要核对原文支持与来源。</p></div></div>`);a.stats([['索引文档数','6'],['召回数',String(r.length)],['非零匹配',String(r.filter(x=>x.score>0).length)],['模型/远程请求','0']]);}
    a.on('rag-query',draw);a.on('rag-k',draw,'change');draw();
  };
  labs['llm-eval']=el=>{
    const a=frame(el,'统计计算 · 人工计数',range('eval-a','常见任务正确数 / 90',0,90,1,81)+range('eval-b','罕见任务正确数 / 10',0,10,1,2)+range('eval-weight','常见任务的业务权重',0,1,.05,.5),'总样本固定90+10。Wilson区间只在二项独立抽样假设下解释；不是任何真实模型的基准成绩。');
    function draw(){const c1=Number(a.q('#eval-a').value),c2=Number(a.q('#eval-b').value),weight=Number(a.q('#eval-weight').value),r=L.evaluateSlices({correct:c1,total:90},{correct:c2,total:10},weight);Object.assign(a.state,r,{c1,c2,weight});a.body(`<div id="eval-bars"></div>${table(['汇总口径','准确率','隐含权重'],[['常见切片',U.pct(c1/90),'90个样本'],['罕见切片',U.pct(c2/10),'10个样本'],['微平均',U.pct(r.micro),'每个样本等权'],['宏平均',U.pct(r.macro),'两个切片各半'],['业务加权',U.pct(r.weighted),`常见任务占${U.pct(weight)}`]],'同一批结果，不同汇总方式')}<p class="llm-caution">总体 Wilson 95% 区间：${U.pct(r.interval[0])} — ${U.pct(r.interval[1])}。对异质切片、相关样本或分布偏移，不能把此区间当作完整不确定性。</p>`);U.bars(a.q('#eval-bars'),['常见任务','罕见任务','微平均','宏平均','业务加权'],[c1/90,c2/10,r.micro,r.macro,r.weighted]);a.stats([['微平均',U.pct(r.micro)],['宏平均',U.pct(r.macro)],['业务加权',U.pct(r.weighted)],['总体样本','100']]);}
    ['eval-a','eval-b','eval-weight'].forEach(id=>a.on(id,draw));draw();
  };
  labs['llm-multimodal']=el=>{
    const a=frame(el,'真实切块投影 · 固定权重',select('patch-size','Patch边长',[2,4],2)+range('patch-text','假设拼接文本词元数',0,64,1,16)+select('patch-pattern','图案',[[0,'竖线'],[1,'横线'],[2,'斜线']],0),'程序生成8×8灰度图，展平后投影为4维；没有训练视觉编码器或语言模型。');
    function draw(){const p=Number(a.q('#patch-size').value),img=E.lineImage(Number(a.q('#patch-pattern').value)),patches=[];for(let y=0;y<8;y+=p)for(let x=0;x<8;x+=p){const row=[];for(let j=0;j<p;j++)for(let i=0;i<p;i++)row.push(img[y+j][x+i]);patches.push(row);}const random=E.rng(4),W=Array.from({length:p*p},()=>Array.from({length:4},()=>random()-.5)),projected=E.matmul(patches,W),total=patches.length+Number(a.q('#patch-text').value);Object.assign(a.state,{p,img,patches,projected,total,attentionCells:total*total});a.body(`<div class="llm-two"><div>${matrix(img,'原图：8×8',true)}${tokens(patches.map((_,i)=>'Patch '+i))}</div><div>${matrix(projected,'固定线性投影：每块4维')}<p class="llm-note">按从上到下、从左到右切块，每块内部按行展平。数值是未训练投影，颜色不代表语义类别。</p></div></div>`);a.stats([['视觉位置',String(patches.length)],['单块展平维度',String(p*p)],['拼接总位置',String(total)],['朴素全注意力格数',String(total*total)]]);}
    ['patch-size','patch-pattern'].forEach(id=>a.on(id,draw,'change'));a.on('patch-text',draw);draw();
  };
  labs['llm-serving']=el=>{
    const a=frame(el,'离散调度模拟 · 非硬件基准',range('serve-long','长请求生成长度',2,24,1,12)+select('serve-slots','同时可用槽位',[1,2,3,4],2),'所有请求t=0到达，每tick每活跃请求生成1token；不计prefill、KV容量、通信、排队到达或GPU算子。');
    function chart(r,label){return `<figure><figcaption>${esc(label)} · 总${r.ticks} tick</figcaption><div class="table-scroll"><table class="llm-schedule"><tbody>${r.rows.map((row,i)=>`<tr><th>请求${i+1}</th>${row.map((on,t)=>`<td class="${on?'on':''}" title="请求${i+1}，tick${t+1}：${on?'生成':'未占用'}">${on?'●':'·'}</td>`).join('')}<td>完成${r.completion[i]}</td></tr>`).join('')}</tbody></table></div></figure>`;}
    function draw(){const n=Number(a.q('#serve-long').value),slots=Number(a.q('#serve-slots').value),lengths=[2,n,2,3,n,2],fixed=L.serve(lengths,slots,false),continuous=L.serve(lengths,slots,true);Object.assign(a.state,{lengths,slots,fixed,continuous});a.body(chart(fixed,'静态批次')+chart(continuous,'连续补入')+'<p class="llm-note">● 本tick占用槽位；· 未占用。已完成请求即记完成时间，但静态批次要等同批全部完成才复用空槽。</p>');a.stats([['静态总 tick',String(fixed.ticks)],['连续总 tick',String(continuous.ticks)],['静态利用率',U.pct(fixed.occupancy)],['连续利用率',U.pct(continuous.occupancy)]]);}
    a.on('serve-long',draw);a.on('serve-slots',draw,'change');draw();
  };

  labs['llm-train']=el=>{
    const M=L.MicroGPT;let model=new M(),history=[],trainingLoss=null,validationLoss=null,target=120,disposed=false,importVersion=0,lastOutput=null,metricsAtStep=0;
    const a=frame(el,'完整可训练 · 260参数因果解码器',
      range('micro-lr','学习率（不中断模型状态）',.001,.05,.001,.02)+U.number('micro-seed','初始化种子（重置时生效）',42,0,9999)+`<label>生成前缀<input id="micro-prefix" maxlength="7" value="蓝猫"></label>`+range('micro-temperature','生成温度',.05,2,.05,.7)+range('micro-topp','生成top-p',.1,1,.05,.95)+U.number('micro-sample-seed','采样种子',7,0,9999),
      '单头、宽度4、Pre-RMSNorm、可学习绝对位置、ReLU前馈8。六句训练、两句验证，最多600步，每步一条句子。生成最多8个输入位置。');
    a.body(`<div class="llm-micro-banner"><strong>全部参数可训练</strong><span>嵌入 → 因果注意力 → 前馈 → 词表头</span></div><p id="micro-status" role="status"></p><div class="llm-two"><div><h3>损失轨迹</h3><div id="micro-plot"></div><p class="llm-note">实线训练、虚线验证；两者都按各自全语料有效词元数加权。每12步或手动更新时评估。</p></div><div><h3>真实自回归输出</h3><output id="micro-generated" class="llm-generated">先生成一次，再训练作对照。</output><p id="micro-stop"></p><p class="llm-note">采样前原始词表概率（含BOS）；生成时排除BOS后再应用温度和top-p。</p><div id="micro-distribution"></div></div></div><div class="llm-two"><div id="micro-attention"></div><div id="micro-parameters"></div></div><details class="llm-note"><summary>查看全部语料与当前词表</summary><p>训练：${M.trainText.map(esc).join(' / ')}</p><p>验证：${M.validationText.map(esc).join(' / ')}</p>${tokens(M.vocabulary)}<p>句子为原创人工语料。两个验证组合没有参与梯度，但样本极小，不是通用语言能力测试。</p></details><label class="llm-file">导入此实验的模型JSON<input id="micro-import" type="file" accept=".json,application/json"></label>`);
    function measure(){metricsAtStep=model.steps;trainingLoss=model.evaluate(M.trainText);validationLoss=model.evaluate(M.validationText);history.push({step:model.steps,train:trainingLoss,validation:validationLoss});}
    function inspect(){const prefix=a.q('#micro-prefix').value,result=model.forward(model.encode(prefix));U.bars(a.q('#micro-distribution'),M.vocabulary,result.probabilities.at(-1));a.q('#micro-attention').innerHTML=matrix(result.attention,'当前前缀的单头注意力',true);}
    function draw(){
      Object.assign(a.state,{step:model.steps,metricsAtStep,trainingLoss,validationLoss,parameters:model.p.length,gradNorm:model.lastGradNorm,running:loop.running,lastOutput});
      U.plot(a.q('#micro-plot'),[{points:history.map(x=>[x.step,x.train]),color:'teal'},{points:history.map(x=>[x.step,x.validation]),color:'orange',dash:true}],{xmin:0,xmax:Math.max(model.steps,12),ymin:0,ymax:Math.max(3,...history.flatMap(x=>[x.train,x.validation]))*1.05,xlabel:'参数更新步',ylabel:'有效词元平均交叉熵',height:270});
      a.stats([['已更新步',String(model.steps)],['训练 CE',f(trainingLoss,4)],['验证 CE',f(validationLoss,4)],['参数数量',String(model.p.length)]]);
      a.q('#micro-parameters').innerHTML=table(['参数族','个数','参数RMS'],Object.entries(model.shapes).map(([name,[r,c]])=>{const xs=model.p.slice(model.offsets[name],model.offsets[name]+r*c);return[name,r*c,f(Math.sqrt(sum(xs.map(x=>x*x))/xs.length),4)];}),'可训练参数账本');
      try{inspect();}catch(e){a.q('.llm-error').textContent=e.message;}
    }
    const loop=new U.Loop(()=>{model.step(Number(a.q('#micro-lr').value));if(model.steps%12===0||model.steps===target){measure();draw();}else a.state.step=model.steps;return model.steps<target&&model.steps<600;},20,r=>{train.textContent=r?'暂停训练':'训练120步';a.state.running=r;a.q('#micro-status').textContent=r?'正在按固定顺序更新，每步之间让出浏览器主线程。':`停在 ${model.steps} 步。可继续、生成或导出模型；离页不会后台训练。`;});
    const train=a.button('micro-train','训练120步',()=>{if(loop.running){loop.stop();measure();draw();}else if(model.steps<600){target=Math.min(model.steps+120,600);loop.start();}});
    a.button('micro-step','更新一步',()=>{loop.stop();model.step(Number(a.q('#micro-lr').value));measure();draw();});
    a.button('micro-generate','生成短句',()=>{loop.stop();const sf=a.q('#micro-sample-seed');if(!sf.value||!sf.checkValidity())throw new Error('采样种子需为0–9999整数');lastOutput=model.generate(a.q('#micro-prefix').value,Number(a.q('#micro-temperature').value),Number(a.q('#micro-topp').value),Number(sf.value));a.q('#micro-generated').textContent=lastOutput.text||'（直接选择EOS，空输出）';a.q('#micro-stop').textContent=`生成于第 ${model.steps} 步 · ${lastOutput.reason}`;lastOutput.generatedAtStep=model.steps;draw();});
    a.button('micro-reset','按种子重置',()=>{const sf=a.q('#micro-seed');if(!sf.value||!sf.checkValidity())throw new Error('初始化种子需为0–9999整数');loop.stop();importVersion++;model=new M(Number(sf.value));history=[];lastOutput=null;measure();draw();a.q('#micro-generated').textContent='模型已重置；重新生成作对照。';a.q('#micro-stop').textContent='';a.q('#micro-status').textContent='模型已重置，尚未更新参数。';});
    a.button('micro-export','导出模型',()=>U.download('visible-microgpt.json',JSON.stringify(model.exportState(),null,2)));
    el.exportState=()=>model.exportState();
    a.on('micro-prefix',()=>inspect());['micro-lr','micro-temperature','micro-topp'].forEach(id=>a.on(id,()=>{}));
    a.q('#micro-import').onchange=async e=>{const file=e.target.files[0],version=++importVersion;if(!file)return;try{if(file.size>100000)throw new Error('模型文件上限100KB');const candidate=M.fromState(JSON.parse(await file.text()));if(disposed||version!==importVersion)return;loop.stop();model=candidate;history=[];lastOutput=null;measure();draw();a.q('#micro-seed').value=model.seed;a.q('#micro-generated').textContent='已载入模型，请重新生成。';a.q('#micro-stop').textContent='';a.q('#micro-status').textContent=`已载入 ${model.steps} 步模型；Adam状态与固定语料顺序一并恢复。`;}catch(error){if(!disposed&&version===importVersion)a.q('.llm-error').textContent='导入失败，原模型保留：'+error.message;}finally{if(!disposed)e.target.value='';}};
    measure();draw();a.q('#micro-status').textContent='随机初始化，未下载任何模型。先生成，再观察训练变化。';
    return()=>{disposed=true;importVersion++;loop.dispose();};
  };
})(globalThis);
