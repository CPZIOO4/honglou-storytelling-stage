import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {byteRange,serveStatic} from '../backend/http/static-files.mjs';
test('byte ranges handle suffixes, limits and invalid or multipart requests',()=>{
 assert.deepEqual(byteRange('bytes=2-5',10),{start:2,end:5});assert.deepEqual(byteRange('bytes=-3',10),{start:7,end:9});assert.deepEqual(byteRange('bytes=4-',10),{start:4,end:9});assert.deepEqual(byteRange('bytes=0-100',10),{start:0,end:9});for(const h of ['bytes=-','bytes=10-','bytes=3-2','bytes=-0','bytes=0-1,3-4','bytes=NaN-2'])assert.equal(byteRange(h,10),null);
});
test('static responses stream exact bytes, support HEAD and validate cached assets',async()=>{
 const root=await mkdtemp(join(tmpdir(),'honglou-http-')),file=join(root,'asset.mp3');await writeFile(file,'0123456789');const server=http.createServer((req,res)=>serveStatic(req,res,file).catch(()=>res.destroy()));
 try{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;const full=await fetch(url);assert.equal(full.status,200);assert.equal(await full.text(),'0123456789');const cached=await fetch(url,{headers:{'If-None-Match':full.headers.get('etag')}});assert.equal(cached.status,304);const part=await fetch(url,{headers:{Range:'bytes=3-5'}});assert.equal(part.status,206);assert.equal(part.headers.get('content-range'),'bytes 3-5/10');assert.equal(await part.text(),'345');const head=await fetch(url,{method:'HEAD'});assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'');assert.equal((await fetch(url,{headers:{Range:'bytes=20-'}})).status,416);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});}
});
