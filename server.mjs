import {serveStatic} from './backend/http/static-files.mjs';
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGenerator} from './backend/generator.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const port=Number(process.env.PORT||4173);
const generator=createGenerator(root);
const respond=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const mime={'.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.glb':'model/gltf-binary','.md':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');const path=decodeURIComponent(url.pathname);const scene=url.searchParams.get('scene')||'home';
    if(path.startsWith('/api/director/')){
      if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host))return respond(res,403,{error:'仅本机可访问'});
      const origin=req.headers.origin;if(origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(origin))return respond(res,403,{error:'不接受其他网站发起的生成请求'});
      if(req.method==='GET'&&path==='/api/director/status')return respond(res,200,await generator.status(scene));
      if(req.method==='GET'&&path==='/api/director/latest'){const result=await generator.latest(scene);return respond(res,result?200:404,result||{error:'尚无通过检查的模型生成版本'});}
      if(req.method==='GET'&&path==='/api/director/next-context'){const result=await generator.nextContext(scene);return respond(res,result?200:404,result||{error:'尚无通过审核的场末决定'});}
      if(req.method==='GET'&&path.startsWith('/api/director/jobs/')){const job=await generator.job(path.split('/').at(-1));return respond(res,job?200:404,job||{error:'任务不存在'});}
      if(req.method==='POST'&&path==='/api/director/complete'){
        let body='';for await(const chunk of req){body+=chunk;if(body.length>200)return respond(res,413,{error:'请求过大'});}
        try{return respond(res,200,await generator.complete(JSON.parse(body).storyId,scene));}catch(e){return respond(res,409,{error:e.message});}
      }
      if(req.method==='POST'&&path==='/api/director/generate'){
        let body='';for await(const chunk of req){body+=chunk;if(body.length>1024)return respond(res,413,{error:'请求过大'});}
        try{return respond(res,202,await generator.start(body?JSON.parse(body):{}));}catch(e){return respond(res,409,{error:e.message});}
      }
      return respond(res,405,{error:'不支持的操作'});
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
    if(path==='/health'){res.setHeader('Content-Type','application/json');return res.end('{"ok":true,"app":"honglou-stage"}');}
    const file=resolve(root,'.'+(path==='/'?'/index.html':path));
    if(!file.startsWith(resolve(root)+sep)||path.split(/[\\/]/).some(p=>p.startsWith('.'))){res.writeHead(403);return res.end('Forbidden');}
    await serveStatic(req,res,file);
  }catch{if(res.headersSent)res.destroy();else{res.writeHead(404);res.end('Not found');}}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
for(const s of ['SIGTERM','SIGINT'])process.on(s,()=>{generator.cancel();server.close(()=>process.exit(0));});
