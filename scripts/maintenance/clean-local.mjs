// Default is a dry run. Only project-owned runtime/QA files are eligible.
import fs from 'node:fs/promises';import {existsSync} from 'node:fs';
import {resolve,join,relative,sep} from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),apply=process.argv.includes('--apply'),read=async p=>JSON.parse(await fs.readFile(join(root,p),'utf8'));
const registry=await read('data/productions.json'),stories=await Promise.all(Object.values(registry).map(p=>read(p.story)));
if(!existsSync(join(root,'.git')))throw Error('Expected project Git checkout');
if(apply){const status=await fetch('http://127.0.0.1:4173/api/director/status',{signal:AbortSignal.timeout(3000)}).then(r=>r.json());if(status.active)throw Error('A generation is active; do not clean');}
const files=[];async function walk(dir){for(const e of await fs.readdir(join(root,dir),{withFileTypes:true})){if(e.isSymbolicLink())throw Error('Refuse symlink '+dir+'/'+e.name);const p=dir+'/'+e.name;if(e.isDirectory())await walk(p);else files.push(p);}}
for(const d of ['.runtime','qa'])if(existsSync(join(root,d)))await walk(d);
const keep=new Set(['.runtime/server.json','.runtime/server.log','.runtime/server-error.log']),wanted=new Set(stories.flatMap(s=>s.generation.calls.map(c=>c.responseId))),found=new Set();
for(const story of stories){const id=story.generation.jobId;if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid job ID');keep.add(`.runtime/generations/${id}/status.json`);keep.add(`.runtime/generations/${id}/approved.json`);keep.add(`.runtime/campaigns/${story.id}/accepted.json`);}
for(const p of files.filter(p=>p.startsWith('.runtime/')&&p.endsWith('-response.json'))){const response=await read(p);if(wanted.has(response.responseId)){found.add(response.responseId);keep.add(p);const request=p.replace(/-response\.json$/,'-request.json');if(existsSync(join(root,request)))keep.add(request);}}
if([...wanted].some(id=>!found.has(id)))throw Error('Cannot locate all current generation receipts; cleanup cancelled');
// Never silently discard a newer or locally changed production.
for(const [scene,p]of Object.entries(registry)){const local=scene==='home'?'.runtime/latest-story.json':`.runtime/latest-${scene}.json`;if(existsSync(join(root,local))&&JSON.stringify(await read(local))!==JSON.stringify(await read(p.story)))throw Error('Unpublished local version '+scene);}
const release=await read('qa/release.json');if(!release.passed||release.checks.length!==5+stories.length*2||release.checks.some(c=>!c.passed))throw Error('Complete release verification is required before cleaning QA');
const cutoff=Date.parse(release.startedAt);for(const p of files.filter(p=>p.startsWith('qa/'))){if((await fs.stat(join(root,p))).mtimeMs>=cutoff||/^qa\/(performance-|reference-|batched-|refactor-map|tools-map|tracked-cleanup|local-cleanup)/.test(p))keep.add(p);}
const remove=files.filter(p=>!keep.has(p)),bytes=(await Promise.all(remove.map(p=>fs.stat(join(root,p))))).reduce((n,s)=>n+s.size,0);
const plan={apply,currentStories:stories.length,currentReceipts:found.size,files:remove.length,bytes,paths:remove};
await fs.writeFile(join(root,'qa/local-cleanup.json'),JSON.stringify(plan,null,2));
if(apply){for(const p of remove){const target=resolve(root,p),r=relative(root,target);if(r.startsWith('..'+sep)||!['.runtime','qa'].includes(r.split(sep)[0]))throw Error('Target outside permitted folders');await fs.unlink(target);}
 async function prune(dir){for(const e of await fs.readdir(dir,{withFileTypes:true}))if(e.isDirectory()){const child=join(dir,e.name);await prune(child);if(!(await fs.readdir(child)).length)await fs.rmdir(child);}}
 for(const d of ['.runtime','qa'])await prune(join(root,d));
}
console.log(JSON.stringify({apply,currentStories:stories.length,currentReceipts:found.size,removedFiles:remove.length,bytes}));
