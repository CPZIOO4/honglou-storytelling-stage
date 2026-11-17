import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {extname} from 'node:path';
const mime={'.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.glb':'model/gltf-binary','.md':'text/plain; charset=utf-8'};
export function byteRange(header,size){
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);if(!match||(!match[1]&&!match[2])||!size)return null;
 let start=0,end=size-1;if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}else{const suffix=Number(match[2]);if(!suffix)return null;start=Math.max(0,size-suffix);}
 return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start<=end&&start<size?{start,end}:null;
}
export async function serveStatic(req,res,file){
 const info=await stat(file);if(!info.isFile()){res.writeHead(404);res.end();return;}
 const etag=`W/"${info.size}-${Math.trunc(info.mtimeMs)}"`,headers={'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache','ETag':etag,'X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
 if(req.headers['if-none-match']===etag){res.writeHead(304,headers);res.end();return;}
 let range=null;if(req.headers.range){range=byteRange(req.headers.range,info.size);if(!range){res.writeHead(416,{...headers,'Content-Range':`bytes */${info.size}`});res.end();return;}}
 const length=range?range.end-range.start+1:info.size;
 res.writeHead(range?206:200,{...headers,'Content-Length':length,...(range?{'Content-Range':`bytes ${range.start}-${range.end}/${info.size}`}:{})});
 if(req.method==='HEAD'||!length){res.end();return;}
 const stream=createReadStream(file,range||{}),close=()=>stream.destroy();res.once('close',close);
 try{await pipeline(stream,res);}catch(error){if(!res.destroyed)throw error;}finally{res.off('close',close);stream.destroy();}
}
