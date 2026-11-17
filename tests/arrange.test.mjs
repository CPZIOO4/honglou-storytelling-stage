import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile,cp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {loadProduction,lineageCurrent,latestPath} from '../backend/productions.mjs';import {commitMemory,mergeMemory} from '../backend/story-memory.mjs';import {validateFactRefs} from '../backend/card-context.mjs';import {compileStory,stateAt,route,along} from '../src/engine.js';
const read=async p=>JSON.parse(await readFile(p,'utf8')),tenth=await read(new URL('../data/deepseek-tenth-scene.json',import.meta.url));
async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'honglou-arrange-'));try{await cp(new URL('../data',import.meta.url),join(root,'data'),{recursive:true});await mkdir(join(root,'.runtime'));await fn(root);}finally{await rm(root,{recursive:true,force:true});}}
test('arrangement requires accepted tenth and its actual returning pair',()=>fixture(async root=>{
 await assert.rejects(loadProduction(root,'arrange'),/确认第十场/);await commitMemory(root,tenth);const p=await loadProduction(root,'arrange');assert.deepEqual(p.characters.map(c=>c.id),['granny','zhou_wife','ping_er']);assert.equal(p.previousMemory.revision,10);assert(!p.seed.initial.actors.fengjie);
 const invalid=structuredClone(tenth);invalid.narrative.handoff.decision.party.push('fengjie');await writeFile(latestPath(root,'audience'),JSON.stringify(invalid));await assert.rejects(loadProduction(root,'arrange'),/回廊下/);
}));
test('waiting wife keeps ninth position and memory, not the returning pair knowledge',()=>fixture(async root=>{
 await commitMemory(root,tenth);const p=await loadProduction(root,'arrange'),ninth=await read(join(root,'data/deepseek-ninth-scene.json')),stage=await read(join(root,'data/invite-stage.json')),roster=await read(join(root,'data/waiting-characters.json'));
 const compiled=compileStory(ninth,stage,roster.filter(c=>ninth.castIds.includes(c.id)));assert.equal(p.seed.initial.actors.zhou_wife.anchor,stateAt(compiled,compiled.duration).actors.zhou_wife.anchor);assert.equal(p.rawCards.characters.find(c=>c.id==='zhou_wife').experiencedMemory,ninth.contextMemory.characters.zhou_wife);
 const fact=p.rawCards.relationshipFacts.find(f=>f.id.startsWith('audience_result_')&&/米/.test(f.claim));assert(fact);validateFactRefs({speaker:'granny',factRefs:[fact.id]},p.rawCards);validateFactRefs({speaker:'ping_er',factRefs:[fact.id]},p.rawCards);assert.throws(()=>validateFactRefs({speaker:'zhou_wife',factRefs:[fact.id]},p.rawCards));
}));
test('preparation is a valid new node without repeating audience permission',()=>fixture(async root=>{
 await commitMemory(root,tenth);const p=await loadProduction(root,'arrange'),node=p.storyline.nodes.find(n=>n.id===p.nodeId);assert(node.next.includes('aid-fulfillment'));assert(p.storyline.nodes.some(n=>n.id==='aid-fulfillment'));assert(p.rawCards.scene.initialSituation.includes('米未量'));assert(p.rawCards.scene.dramaturgy.handoff.includes('仅ping_er'));
}));
test('preparation exit keeps waiting actors separate and avoids static obstacles',()=>fixture(async root=>{
 await commitMemory(root,tenth);const {stage,seed}=await loadProduction(root,'arrange');const places=Object.values(seed.initial.actors).map(a=>JSON.stringify(stage.anchors[a.anchor]));assert.equal(new Set(places).size,3);
 const path=route(stage,'ping_home','inner_lead');for(let t=0;t<=1;t+=.01){const p=along(path,t);assert(!stage.obstacles.some(o=>p[0]>o.min[0]&&p[0]<o.max[0]&&p[1]>o.min[1]&&p[1]<o.max[1]));for(const id of ['granny','zhou_wife']){const q=stage.anchors[seed.initial.actors[id].anchor];assert(Math.hypot(p[0]-q[0],p[1]-q[1])>.6);}}
}));
test('new corridor replies do not reach Fengjie and ancestor changes invalidate scene eleven',()=>fixture(async root=>{
 const m=mergeMemory(tenth.contextMemory,{summary:'来客回到廊下转达消息。',characters:[{id:'granny',memory:'我向周嫂子说了答复。'},{id:'zhou_wife',memory:'我听来客转述答复。'}]},{id:'eleventh',beats:[{dialogue:[]}]});assert.equal(m.revision,11);assert.equal(m.characters.fengjie,tenth.contextMemory.characters.fengjie);
 assert(await lineageCurrent(root,'arrange',{carryover:{parentStoryId:tenth.id}}));const ninth=await read(join(root,'data/deepseek-ninth-scene.json'));await writeFile(latestPath(root,'invite'),JSON.stringify({...ninth,id:'different-ninth'}));assert(!await lineageCurrent(root,'arrange',{carryover:{parentStoryId:tenth.id}}));
}));
