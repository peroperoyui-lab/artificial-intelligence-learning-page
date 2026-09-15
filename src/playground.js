/* Real browser-side MLP training. Model imports contain data only, never code. */
(function(root){
'use strict';
const {E,U}=root.AI,labs=root.AI.labs||(root.AI.labs={});
const defaults={dataset:'xor',depth:2,width:8,activation:'tanh',optimizer:'adam',lr:.03,batch:16,lambda:0,noise:.12,seed:42};
const shape=c=>[2,...Array(c.depth).fill(c.width),1];
const validateConfig=raw=>{
 E.assert(raw&&typeof raw==='object'&&!Array.isArray(raw),'缺少训练配置');const c={};
 for(const key of Object.keys(defaults)){E.assert(Object.hasOwn(raw,key),'缺少配置项：'+key);c[key]=raw[key];}
 E.assert(Object.keys(raw).every(k=>Object.hasOwn(defaults,k)),'模型含有未知配置项');
 E.assert(['xor','circles','moons','spirals','linear'].includes(c.dataset),'未知数据集');
 E.assert(Number.isInteger(c.depth)&&c.depth>=0&&c.depth<=3&&[2,4,8,12].includes(c.width),'网络大小超出范围');
 E.assert(['tanh','relu','linear'].includes(c.activation)&&['sgd','adam'].includes(c.optimizer),'激活函数或优化器无效');
 E.assert([.003,.01,.03,.1,.3].includes(c.lr)&&[8,16,32,180].includes(c.batch)&&[0,.0001,.001,.01,.1].includes(c.lambda),'训练超参数超出范围');
 E.assert(Number.isFinite(c.noise)&&c.noise>=0&&c.noise<=.5&&Number.isInteger(c.seed)&&c.seed>=1&&c.seed<=9999,'噪声或随机种子无效');return c;
};
const serialize=(config,model,epoch,random)=>({format:'visible-ai-model-v1',engineVersion:1,config:{...config},epoch,shuffleState:random.state(),network:model.state()});
const deserialize=raw=>{
 E.assert(raw&&raw.format==='visible-ai-model-v1'&&raw.engineVersion===1,'不支持的模型文件格式或引擎版本');
 const config=validateConfig(raw.config);E.assert(Number.isInteger(raw.epoch)&&raw.epoch>=0&&raw.epoch<=5000,'轮次超出范围');
 const model=E.MLP.fromState(raw.network);E.assert(JSON.stringify(model.sizes)===JSON.stringify(shape(config))&&model.activation===config.activation,'模型结构与配置不一致');
 E.assert(model.t===raw.epoch*Math.ceil(180/config.batch),'优化器步数与完整训练轮次不一致');
 E.assert(model.layers.every(l=>l.w.concat(l.b).every(v=>Math.abs(v)<=1e6)),'模型权重超出安全数值范围');
 const random=E.rng();random.restore(raw.shuffleState);const data=E.dataset(config.dataset,240,config.noise,config.seed);
 const train=model.evaluate(data.train),val=model.evaluate(data.val);E.assert(Number.isFinite(train.loss)&&Number.isFinite(val.loss),'模型输出不是有限数值');
 return{config,model,epoch:raw.epoch,random,data};
};
root.AI.modelIO={defaults,shape,validateConfig,serialize,deserialize};
if(typeof module!=='undefined'&&module.exports)module.exports=root.AI.modelIO;
labs.playground=el=>{
 let config={...defaults},model,data,random,epoch=0,history=[],probe=[.7,-.7],showValidation=true,limit=5000,disposed=false,failed=false,importVersion=0;
 const labels={xor:'XOR / 异或',circles:'同心圆',moons:'双月牙',spirals:'双螺旋',linear:'线性可分'};
 el.innerHTML=`<div class="play-config">${U.select('play-dataset','数据集',Object.entries(labels),config.dataset)}${U.select('play-depth','隐藏层数',[[0,'0 / 逻辑回归'],[1,'1 层'],[2,'2 层'],[3,'3 层']],config.depth)}${U.select('play-width','每层神经元',[2,4,8,12],config.width)}${U.select('play-activation','隐藏激活函数',[['tanh','tanh'],['relu','ReLU'],['linear','线性']],config.activation)}${U.select('play-optimizer','优化器',[['adam','Adam'],['sgd','SGD']],config.optimizer)}${U.select('play-lr','学习率 η',[.003,.01,.03,.1,.3],config.lr)}${U.select('play-batch','批量大小',[8,16,32,180],config.batch)}${U.select('play-lambda','L2 正则 λ',[0,.0001,.001,.01,.1],config.lambda)}${U.range('play-noise','坐标噪声 σ',0,.5,.02,config.noise)}${U.number('play-seed','随机种子',config.seed,1,9999)}</div><div class="play-toolbar"><button id="play-run" class="primary">开始训练</button><button id="play-step">训练 1 轮</button><button id="play-hundred">训练 100 轮</button><button id="play-reset">重置模型</button><span id="play-epoch" class="epoch-counter">Epoch 0</span></div><div class="play-grid"><div class="decision-wrap"><p class="figure-title">模型在整个平面上的预测</p><canvas id="play-field" class="decision-canvas" width="460" height="460" role="img" aria-label="二维决策概率场。青色圆点是类别 0，橙色三角是类别 1；空心方形为验证样本。下方可键入坐标获得精确预测。"></canvas><div class="legend"><span>● 类别 0</span><span>▲ 类别 1</span><span>□ 验证样本</span></div><label class="small"><input id="play-show-val" type="checkbox" checked> 显示验证样本（始终参与验证指标）</label><div class="probe">${U.number('probe-x1','探测 x₁',probe[0],-1.7,1.7,.01)}${U.number('probe-x2','探测 x₂',probe[1],-1.7,1.7,.01)}<button id="play-probe">计算预测</button></div><p id="play-prediction" class="probe-result" role="status"></p><p class="control-note">也可点击平面取坐标。背景为 P(y=1)：青色接近 0，橙色接近 1。超出 ±1.7 的样本不绘出，但仍保留在计算中。</p></div><div class="play-panels"><p id="play-count" class="play-count"></p><div id="play-network" class="network-svg"></div>${U.legend([['正权重','teal'],['负权重','orange']])}<div id="play-stats" class="stats"></div><div class="play-history"><p class="figure-title">真实损失曲线 · 不包含 L2 惩罚</p><div id="play-loss" class="chart"></div>${U.legend([['训练 BCE','teal'],['验证 BCE','orange']])}</div><p class="control-note">训练 180 条，验证 60 条；验证集从不参与梯度。一个 Epoch 是完整遍历训练集一次。修改训练配置会重置模型。</p></div></div><p id="play-status" class="lab-status" role="status" aria-live="polite"></p><div class="file-row"><button id="play-export">导出模型 JSON</button><label for="play-import" class="small">导入模型并继续：</label><input id="play-import" class="file-input" type="file" accept="application/json,.json"></div><p class="control-note">模型文件保存权重、优化器矩、训练配置与批次随机状态。单文件上限 1 MB，导入失败不替换当前模型。最多训练 5000 轮；离开本章或切到后台即暂停。</p>`;
 const status=message=>{U.$('#play-status',el).textContent=message;};
 function collect(){const tr=model.evaluate(data.train),va=model.evaluate(data.val);return{epoch,trainLoss:tr.loss,validationLoss:va.loss,trainAccuracy:tr.accuracy,validationAccuracy:va.accuracy};}
 function draw(){const latest=history.at(-1);U.$('#play-epoch',el).textContent='Epoch '+epoch;U.$('#play-count',el).textContent=`${model.sizes.join(' → ')} · ${model.count} 个可训练参数`;U.field(U.$('#play-field',el),model,data,showValidation,probe);U.network(U.$('#play-network',el),model,probe);U.stats(U.$('#play-stats',el),[['训练 BCE',U.fmt(latest.trainLoss,5)],['验证 BCE',U.fmt(latest.validationLoss,5)],['训练准确率',U.pct(latest.trainAccuracy)],['验证准确率',U.pct(latest.validationAccuracy)]]);
 const skip=Math.max(1,Math.floor(history.length/220)),shown=history.filter((_,i)=>i%skip===0||i===history.length-1),ymax=Math.max(.1,...shown.flatMap(p=>[p.trainLoss,p.validationLoss]))*1.08;
 U.plot(U.$('#play-loss',el),[{points:shown.map(p=>[p.epoch,p.trainLoss]),color:'teal'},{points:shown.map(p=>[p.epoch,p.validationLoss]),color:'orange',dash:true},...(shown.length===1?[{points:[[epoch,latest.trainLoss]],type:'scatter',color:'teal'},{points:[[epoch,latest.validationLoss]],type:'scatter',color:'orange'}]:[])],{xmin:Math.max(0,history[0].epoch),xmax:Math.max(history[0].epoch+1,epoch),ymin:0,ymax,xlabel:'完整训练轮次',ylabel:'平均 BCE',height:240,title:'实际训练与验证损失；导入模型后曲线从导入轮次重新记录'});
 const p=model.predict(probe);U.$('#play-prediction',el).textContent=`输入 [${probe.map(v=>U.fmt(v,2)).join(', ')}] → P(y=1)=${U.fmt(p,5)}，预测类别 ${p>=.5?1:0}`;
 U.$('#play-export',el).disabled=failed;U.$('#play-run',el).disabled=failed||epoch>=5000;U.$('#play-step',el).disabled=failed||epoch>=5000;U.$('#play-hundred',el).disabled=failed||epoch>=5000;}
 function train(count){if(failed||disposed)return false;try{for(let i=0;i<count&&epoch<limit&&epoch<5000;i++){model.epoch(data.train,config,random);epoch++;history.push(collect());}draw();if(epoch>=5000){status('已达到 5000 轮上限。可导出模型，或重置开始新实验。');return false;}if(epoch>=limit){status(`已完成目标轮次 ${epoch}。配置不变时可继续训练。`);return false;}return true;}catch(error){failed=true;draw();status(error.message+'；当前实验已暂停，请降低学习率并重置。');return false;}}
 const loop=new U.Loop(()=>train(3),100,r=>{U.$('#play-run',el).textContent=r?'暂停训练':'开始训练';if(!r&&!failed&&epoch<limit&&epoch<5000)status(`已暂停在第 ${epoch} 轮。`);});
 function reset(message='已重置为固定种子的初始模型。'){loop.stop();importVersion++;failed=false;epoch=0;limit=5000;data=E.dataset(config.dataset,240,config.noise,config.seed);model=new E.MLP(shape(config),config.activation,config.seed);random=E.rng(config.seed+9001);history=[collect()];U.$('#play-width',el).disabled=config.depth===0;U.$('#play-activation',el).disabled=config.depth===0;draw();status(message);}
 function sync(){for(const key of Object.keys(config)){const input=U.$('#play-'+key,el);input.value=config[key];const out=U.$('#play-'+key+'-out',el);if(out)out.textContent=String(config[key]);}U.$('#play-width',el).disabled=config.depth===0;U.$('#play-activation',el).disabled=config.depth===0;}
 for(const key of ['dataset','depth','width','activation','optimizer','lr','batch','lambda'])U.$('#play-'+key,el).onchange=e=>{config[key]=typeof defaults[key]==='number'?Number(e.target.value):e.target.value;reset('训练配置已改变，模型、优化器和曲线均已重置。');};
 U.bindRange(el,'play-noise',v=>{config.noise=v;reset('噪声已改变，数据划分和模型已按同一种子重新生成。');});U.$('#play-seed',el).onchange=e=>{if(!e.target.value||!e.target.checkValidity()){e.target.value=config.seed;status('种子必须是 1–9999 的整数。');return;}config.seed=Number(e.target.value);reset('种子已改变，已建立一组新的可复现实验。');};
 U.$('#play-run',el).onclick=()=>{if(loop.running)loop.stop();else{limit=5000;status('训练中；各轮指标均由当前权重实算。');loop.start();}};
 U.$('#play-step',el).onclick=()=>{loop.stop();limit=Math.min(5000,epoch+1);train(1);};U.$('#play-hundred',el).onclick=()=>{loop.stop();limit=Math.min(5000,epoch+100);status(`正在训练至第 ${limit} 轮，可随时暂停。`);loop.start();};U.$('#play-reset',el).onclick=()=>reset();
 U.$('#play-show-val',el).onchange=e=>{showValidation=e.target.checked;draw();};
 function setProbe(next){probe=next;U.$('#probe-x1',el).value=U.fmt(probe[0],2);U.$('#probe-x2',el).value=U.fmt(probe[1],2);draw();}
 U.$('#play-probe',el).onclick=()=>{const inputs=[U.$('#probe-x1',el),U.$('#probe-x2',el)];if(inputs.some(i=>i.value===''||!i.checkValidity())){status('请在两个输入框填写 −1.7 到 1.7 之间的数字。');return;}setProbe(inputs.map(i=>Number(i.value)));};
 U.$('#play-field',el).onclick=e=>{const r=e.currentTarget.getBoundingClientRect();setProbe([Number(((e.clientX-r.left)/r.width*3.4-1.7).toFixed(2)),Number((1.7-(e.clientY-r.top)/r.height*3.4).toFixed(2))]);};
 U.$('#play-export',el).onclick=()=>{loop.stop();if(!failed)U.download(`visible-ai-${config.dataset}-epoch-${epoch}.json`,JSON.stringify(serialize(config,model,epoch,random),null,2));};
 U.$('#play-import',el).onchange=async e=>{loop.stop();const file=e.target.files[0],version=++importVersion;if(!file)return;try{E.assert(file.size<=1024*1024,'文件超过 1 MB 上限');const raw=JSON.parse(await file.text());if(disposed||version!==importVersion)return;const loaded=deserialize(raw);({config,model,epoch,random,data}=loaded);failed=false;limit=5000;history=[collect()];sync();draw();status(`已载入第 ${epoch} 轮模型，可接续相同的小批量顺序。历史曲线从此处重新记录。`);}catch(error){if(!disposed&&version===importVersion)status('导入失败，当前模型保持不变：'+error.message);}finally{if(!disposed)e.target.value='';}};
 el.getSnapshot=()=>({config:{...config},parameters:model.count,...history.at(-1)});el.exportState=()=>serialize(config,model,epoch,random);reset('模型已初始化。先点击训练，观察验证损失和决策边界。');return()=>{disposed=true;importVersion++;loop.dispose();};
};
})(globalThis);
