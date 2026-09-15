'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
require('../src/engine.js');require('../src/content.js');require('../src/ui.js');
const U=globalThis.AI.U,root=path.resolve(__dirname,'..');
test('experiment journal snapshots cannot be changed by later parameter edits',()=>{
 const persist=U.persist,toast=U.toast,old=U.state.journal;
 try{U.persist=()=>true;U.toast=()=>{};U.state.journal=[];const data={matrix:[1,0,0,1],nested:{value:3}};U.record('matrix',data);data.matrix[0]=99;data.nested.value=100;assert.deepEqual(U.state.journal[0].data,{matrix:[1,0,0,1],nested:{value:3}});}finally{U.persist=persist;U.toast=toast;U.state.journal=old;}
});
test('text escaping keeps saved user notes inert',()=>{assert.equal(U.escape('<b title="x">A&B</b>'),'&lt;b title=&quot;x&quot;&gt;A&amp;B&lt;/b&gt;');});
test('standalone bundling preserves literal dollar signs and every script body',()=>{
 execFileSync(process.execPath,['scripts/build.js'],{cwd:root});const html=fs.readFileSync(path.join(root,'dist/visible-ai-offline.html'),'utf8');
 for(const file of fs.readdirSync(path.join(root,'src')).filter(f=>f.endsWith('.js'))){const source=fs.readFileSync(path.join(root,'src',file),'utf8').replace(/<\/script/gi,'<\\/script');assert.ok(html.includes(source),file+' changed during bundling');}
 assert.ok(html.includes('U.$$='));assert.ok(!html.includes('<script defer src='));assert.ok(!html.includes('href="assets/styles.css"'));
});
