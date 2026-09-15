(function(root){
'use strict';
const {E}=root.AI;
const U={};
U.$=(q,el=document)=>el.querySelector(q);
U.$$=(q,el=document)=>Array.from(el.querySelectorAll(q));
U.escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
U.fmt=(x,d=3)=>x===null||!Number.isFinite(x)?'—':Math.abs(x)>=1e5?x.toExponential(2):x.toFixed(d);
U.pct=x=>x===null||!Number.isFinite(x)?'—':(x*100).toFixed(1)+'%';
U.colors={teal:'#176e73',orange:'#b65b29',gray:'#899fa7',violet:'#6656a2',ink:'#263d48'};
U.range=(id,label,min,max,step,value)=>`<label class="control" for="${id}"><span class="control-top"><span>${label}</span><output id="${id}-out" for="${id}">${value}</output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
U.select=(id,label,options,value)=>`<label class="control" for="${id}"><span class="control-top">${label}</span><select id="${id}">${options.map(o=>{const [v,t]=Array.isArray(o)?o:[o,o];return `<option value="${U.escape(v)}" ${String(v)===String(value)?'selected':''}>${U.escape(t)}</option>`;}).join('')}</select></label>`;
U.number=(id,label,value,min,max,step=1)=>`<label class="control" for="${id}"><span class="control-top">${label}</span><input id="${id}" type="number" value="${value}" min="${min}" max="${max}" step="${step}"></label>`;
U.bindRange=(el,id,callback)=>{const input=U.$('#'+id,el);input.addEventListener('input',()=>{const n=Number(input.value);U.$('#'+id+'-out',el).textContent=input.value;callback(n);});};
U.stats=(el,pairs)=>{el.innerHTML=pairs.map(([label,value])=>`<div class="metric"><div class="metric-label">${U.escape(label)}</div><div class="metric-value ${String(value).length>10?'small-value':''}">${U.escape(value)}</div></div>`).join('');};
U.legend=items=>`<div class="legend">${items.map(([text,color])=>`<span class="legend-item"><i class="legend-swatch" style="background:${U.colors[color]||color}"></i>${text}</span>`).join('')}</div>`;
U.bars=(el,labels,values,highlight=-1)=>{el.innerHTML=labels.map((t,i)=>`<div class="bar-row"><span>${U.escape(t)}</span><div class="bar-track"><div class="bar-fill ${i===highlight?'orange':''}" style="width:${E.clamp(values[i]*100,0,100)}%"></div></div><span class="bar-number">${U.pct(values[i])}</span></div>`).join('');};
let plotId=0;
U.plot=(el,series,options={})=>{
 const {xmin=-2,xmax=2,ymin=-2,ymax=2,xlabel='x',ylabel='y',title='参数变化图',height=320,extra}=options;const w=600,h=height,p={left:47,right:20,top:25,bottom:43},sx=x=>p.left+(x-xmin)/(xmax-xmin)*(w-p.left-p.right),sy=y=>h-p.bottom-(y-ymin)/(ymax-ymin)*(h-p.top-p.bottom);const id='plot-'+(++plotId);
 let grid='';for(let i=0;i<=4;i++){const x=xmin+(xmax-xmin)*i/4,y=ymin+(ymax-ymin)*i/4;grid+=`<path class="grid-line" d="M${sx(x)},${p.top}V${h-p.bottom}M${p.left},${sy(y)}H${w-p.right}"/><text class="chart-label" x="${sx(x)}" y="${h-22}" text-anchor="middle">${Number(x.toFixed(2))}</text><text class="chart-label" x="${p.left-9}" y="${sy(y)+4}" text-anchor="end">${Number(y.toFixed(2))}</text>`;}
 let marks=series.map(s=>{const color=U.colors[s.color]||s.color||U.colors.teal;const points=s.points.filter(a=>a.every(Number.isFinite));if(s.type==='scatter')return points.map(([x,y])=>s.square?`<rect x="${sx(x)-4}" y="${sy(y)-4}" width="8" height="8" fill="white" stroke="${color}" stroke-width="1.8"/>`:`<circle cx="${sx(x)}" cy="${sy(y)}" r="${s.radius||4}" fill="${s.hollow?'white':color}" stroke="${color}" stroke-width="1.5"/>`).join('');return `<path d="${points.map(([x,y],i)=>`${i?'L':'M'}${sx(x).toFixed(2)},${sy(y).toFixed(2)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${s.width||2.6}" ${s.dash?'stroke-dasharray="6 5"':''}/>`;}).join('');if(extra)marks+=extra(sx,sy);
 el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${U.escape(title)}"><title>${U.escape(title)}</title><defs><clipPath id="${id}"><rect x="${p.left}" y="${p.top}" width="${w-p.left-p.right}" height="${h-p.top-p.bottom}"/></clipPath></defs>${grid}<path class="axis-line" d="M${p.left},${p.top}V${h-p.bottom}H${w-p.right}"/><g clip-path="url(#${id})">${marks}</g><text class="chart-label" x="${w-p.right}" y="${h-4}" text-anchor="end">${U.escape(xlabel)}</text><text class="chart-label" x="${p.left}" y="13">${U.escape(ylabel)}</text></svg>`;
};
U.curve=(fn,min,max,n=160)=>Array.from({length:n+1},(_,i)=>{const x=min+(max-min)*i/n;return [x,fn(x)];});
U.network=(el,model,input=[0.7,-0.7])=>{
 const w=600,h=265,layerX=k=>50+k*(w-100)/(model.sizes.length-1),nodeY=(k,j)=>model.sizes[k]===1?h/2:35+j*(h-70)/(model.sizes[k]-1),f=model.forward(input);let edges='',nodes='';
 model.layers.forEach((l,k)=>{for(let j=0;j<l.nout;j++)for(let i=0;i<l.nin;i++){const weight=l.w[j*l.nin+i],color=weight>=0?U.colors.teal:U.colors.orange;edges+=`<path d="M${layerX(k)},${nodeY(k,i)} C${layerX(k)+32},${nodeY(k,i)} ${layerX(k+1)-32},${nodeY(k+1,j)} ${layerX(k+1)},${nodeY(k+1,j)}" fill="none" stroke="${color}" stroke-opacity="${E.clamp(Math.abs(weight)/2.5,.09,.72)}" stroke-width="${E.clamp(Math.abs(weight),.4,3)}"><title>层 ${k+1}，连接 ${i+1}→${j+1}，权重 ${weight.toFixed(4)}</title></path>`;}});
 model.sizes.forEach((n,k)=>{for(let j=0;j<n;j++){const a=f.a[k][j];nodes+=`<circle cx="${layerX(k)}" cy="${nodeY(k,j)}" r="${n>8?6:8}" fill="${a>=0?U.colors.teal:U.colors.orange}" stroke="#fcfdfc" stroke-width="2"><title>层 ${k} 神经元 ${j+1}，激活 ${U.fmt(a,4)}</title></circle>`;}nodes+=`<text class="chart-label" text-anchor="middle" x="${layerX(k)}" y="${h+9}">${k===0?'输入 2':k===model.sizes.length-1?'输出 1':'隐藏 '+n}</text>`;});
 el.innerHTML=`<svg viewBox="0 0 ${w} ${h+25}" role="img" aria-label="网络结构 ${model.sizes.join(' → ')}，${model.count} 个参数；青色连接为正权重，橙色为负权重"><title>真实网络权重，悬停连接查看数值</title>${edges}${nodes}</svg>`;
};
U.probColor=p=>{const center=[242,246,244],end=p<.5?[47,139,146]:[202,122,66],t=Math.abs(p-.5)*2;return `rgb(${center.map((v,i)=>Math.round(v+(end[i]-v)*t)).join(',')})`;};
U.field=(canvas,model,data,showVal=true,probe=null)=>{
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,n=46,range=1.7,sx=x=>(x+range)/(2*range)*w,sy=y=>(range-y)/(2*range)*h;
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=-range+(i+.5)*2*range/n,y=range-(j+.5)*2*range/n;ctx.fillStyle=U.probColor(model.predict([x,y]));ctx.fillRect(i*w/n,j*h/n,Math.ceil(w/n)+1,Math.ceil(h/n)+1);}
 ctx.strokeStyle='#536f783f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
 const draw=(p,val)=>{if(p.x.some(x=>Math.abs(x)>range))return;const x=sx(p.x[0]),y=sy(p.x[1]);ctx.lineWidth=1.5;ctx.fillStyle=p.y?U.colors.orange:U.colors.teal;ctx.strokeStyle='white';if(val){ctx.fillStyle='#ffffffdd';ctx.fillRect(x-4,y-4,8,8);ctx.strokeStyle=p.y?U.colors.orange:U.colors.teal;ctx.strokeRect(x-4,y-4,8,8);}else{ctx.beginPath();if(p.y){ctx.moveTo(x,y-4.5);ctx.lineTo(x+4.5,y+4);ctx.lineTo(x-4.5,y+4);ctx.closePath();}else ctx.arc(x,y,3.8,0,Math.PI*2);ctx.fill();ctx.stroke();}};
 data.train.forEach(p=>draw(p,false));if(showVal)data.val.forEach(p=>draw(p,true));if(probe){ctx.strokeStyle=U.colors.ink;ctx.lineWidth=2;const x=sx(probe[0]),y=sy(probe[1]);ctx.beginPath();ctx.arc(x,y,8,0,2*Math.PI);ctx.moveTo(x-12,y);ctx.lineTo(x+12,y);ctx.moveTo(x,y-12);ctx.lineTo(x,y+12);ctx.stroke();}ctx.font='11px sans-serif';ctx.fillStyle=U.colors.ink;ctx.fillText('x₂',w/2+5,15);ctx.fillText('x₁',w-20,h/2-6);
};
class Loop{
 constructor(fn,delay=120,onChange=()=>{}){this.fn=fn;this.delay=delay;this.onChange=onChange;this.running=false;this.timer=null;this.visibility=()=>{if(document.hidden)this.stop();};document.addEventListener('visibilitychange',this.visibility);}
 start(){if(this.running||document.hidden)return;this.running=true;this.onChange(true);const tick=()=>{if(!this.running)return;try{if(this.fn()===false){this.stop();return;}}catch(error){U.toast(error.message);this.stop();return;}this.timer=setTimeout(tick,this.delay);};this.timer=setTimeout(tick,0);}
 stop(){const was=this.running;this.running=false;clearTimeout(this.timer);this.timer=null;if(was)this.onChange(false);}
 toggle(){this.running?this.stop():this.start();}
 dispose(){this.stop();document.removeEventListener('visibilitychange',this.visibility);}
}
U.Loop=Loop;
let toastTimer;
U.toast=message=>{const el=U.$('#toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200);};
const key='visible-ai-v1';
const blank=()=>({completed:[],notes:{},answers:{},journal:[],focus:false,motion:false});
U.load=()=>{try{const p=JSON.parse(localStorage.getItem(key)||'null');const s=blank();if(!p||typeof p!=='object')return s;const ids=root.AI.C.chapters.map(c=>c.id);s.completed=Array.isArray(p.completed)?[...new Set(p.completed.filter(id=>ids.includes(id)))]:[];for(const id of ids){if(typeof p.notes?.[id]==='string')s.notes[id]=p.notes[id].slice(0,4000);if(Number.isInteger(p.answers?.[id])&&p.answers[id]>=0&&p.answers[id]<3)s.answers[id]=p.answers[id];}s.journal=Array.isArray(p.journal)?p.journal.slice(0,30).filter(x=>x&&typeof x==='object'&&typeof x.title==='string'&&typeof x.date==='string'):[];s.focus=p.focus===true;s.motion=p.motion===true;return s;}catch{return blank();}};
U.state=U.load();
U.persist=()=>{try{localStorage.setItem(key,JSON.stringify(U.state));return true;}catch{U.toast('浏览器未允许本地保存；请导出记录备份。');return false;}};
U.download=(filename,text,type='application/json')=>{const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
U.record=(title,data)=>{U.state.journal.unshift({title,date:new Date().toISOString(),data:JSON.parse(JSON.stringify(data))});U.state.journal=U.state.journal.slice(0,30);const saved=U.persist();U.toast(saved?'已记入实验本，可在侧栏查看。':'已保留于当前页面内存；请导出备份。');};
root.AI.U=U;root.AI.labs={};
})(globalThis);
