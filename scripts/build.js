'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
for(const dir of ['src','assets'])fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true});
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
fs.writeFileSync(path.join(out,'index.html'),index);
fs.writeFileSync(path.join(out,'.nojekyll'),'');
let bundled=index.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,file)=>'<style>'+fs.readFileSync(path.join(root,file),'utf8').replace(/<\/style/gi,'<\\/style')+'</style>');
bundled=bundled.replace(/<script defer src="([^"]+)"><\/script>/g,(_,file)=>'<script>'+fs.readFileSync(path.join(root,file),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
// Move scripts after the body. A callback preserves literal dollar signs in JavaScript.
const scripts=[];bundled=bundled.replace(/<script>[\s\S]*?<\/script>/g,tag=>{scripts.push(tag);return '';});
bundled=bundled.replace('</body>',()=>scripts.join('\n')+'\n</body>');
const icon=fs.readFileSync(path.join(root,'assets/favicon.svg'),'utf8');
bundled=bundled.replace('href="assets/favicon.svg"','href="data:image/svg+xml;base64,'+Buffer.from(icon).toString('base64')+'"');
fs.writeFileSync(path.join(out,'visible-ai-offline.html'),bundled);
for(const file of ['LICENSE','THIRD_PARTY_NOTICES.md'])if(fs.existsSync(path.join(root,file)))fs.copyFileSync(path.join(root,file),path.join(out,file));
console.log('Built dist/index.html and dist/visible-ai-offline.html ('+Buffer.byteLength(bundled)+' bytes).');
