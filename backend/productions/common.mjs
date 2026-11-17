import {validateCatalog} from '../../shared/production-catalog.js';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {dataFile} from '../../shared/data-files.js';
export const catalog=validateCatalog(JSON.parse(readFileSync(new URL('../../data/productions.json',import.meta.url),'utf8')));
export const productionParents=Object.fromEntries(Object.entries(catalog).map(([id,p])=>[id,p.parent]));
export const readData=async(root,name)=>JSON.parse(await readFile(join(root,dataFile(name)),'utf8'));
export function latestPath(root,scene='home'){if(!Object.hasOwn(catalog,scene))throw Error('未知演出场景');return join(root,'.runtime',scene==='home'?'latest-story.json':'latest-'+scene+'.json');}
export async function readLatest(root,scene='home'){
 const path=latestPath(root,scene);try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 try{await readFile(join(root,'.runtime/withheld-'+scene+'.json'));return null;}catch(e){if(e.code!=='ENOENT')throw e;}
 try{return JSON.parse(await readFile(join(root,catalog[scene].story),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}
}
export async function lineageCurrent(root,scene,story){latestPath(root,scene);if(!story)return false;const key=productionParents[scene];if(!key)return true;const parent=await readLatest(root,key);return !!parent&&story.carryover?.parentStoryId===parent.id&&await lineageCurrent(root,key,parent);}
