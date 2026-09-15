'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT||4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT must be an integer from 1024 to 65535');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method not allowed');return;}
 let file;
 try{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);file=path.resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+path.sep))throw new Error('Outside root');if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const resolved=fs.realpathSync(file);if(!resolved.startsWith(root+path.sep))throw new Error('Outside root');file=resolved;}catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD'){res.end();return;}const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
});
server.on('error',error=>{console.error('Unable to start server:',error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Visible AI Lab: http://127.0.0.1:${port}\nPress Ctrl+C in this terminal to stop. No background worker is installed.`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
