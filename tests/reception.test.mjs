import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile,cp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {loadProduction,lineageCurrent,latestPath} from '../backend/productions.mjs';import {commitMemory,mergeMemory} from '../backend/story-memory.mjs';
import {validateFactRefs} from '../backend/card-context.mjs';import {compileStory,stateAt,route,along} from '../src/engine.js';
const read=async p=>JSON.parse(await readFile(p,'utf8')),sixth=await read(new URL('../data/deepseek-sixth-scene.json',import.meta.url));
async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'honglou-reception-'));try{await cp(new URL('../data',import.meta.url),join(root,'data'),{recursive:true});await mkdir(join(root,'.runtime'));await fn(root);}finally{await rm(root,{recursive:true,force:true});}}
test('seventh scene requires accepted sixth and actual two-person arrival',()=>fixture(async root=>{
 await assert.rejects(loadProduction(root,'reception'),/确认第六场/);await commitMemory(root,sixth);const p=await loadProduction(root,'reception');
 assert.deepEqual(p.characters.map(c=>c.id),['granny','zhou_wife','ping_er']);assert.equal(p.previousMemory.revision,6);assert(!p.seed.initial.actors.baner);
 const invalid=structuredClone(sixth);invalid.narrative.handoff.decision.party.push('baner');await writeFile(latestPath(root,'returnhome'),JSON.stringify(invalid));await assert.rejects(loadProduction(root,'reception'),/实际决定/);
}));
test('Ping er remembers fifth-scene information without receiving sixth-scene private conversation',()=>fixture(async root=>{
 await commitMemory(root,sixth);const {rawCards:cards}=await loadProduction(root,'reception'),ping=cards.characters.find(c=>c.id==='ping_er'),granny=cards.characters.find(c=>c.id==='granny');
 assert.equal(ping.experiencedMemory,sixth.contextMemory.characters.ping_er);assert(ping.knownFactIds.includes('ping_heard_0'));assert(!ping.knownFactIds.some(id=>id.startsWith('previous_home_')));
 assert(granny.knownFactIds.includes('previous_home_0'));assert(!granny.knownFactIds.some(id=>id.startsWith('ping_heard_')));
 validateFactRefs({speaker:'ping_er',factRefs:['ping_heard_0']},cards);assert.throws(()=>validateFactRefs({speaker:'ping_er',factRefs:['previous_home_0']},cards));
 validateFactRefs({speaker:'granny',factRefs:['previous_home_0']},cards);
}));
test('returning resident Ping er keeps her last actual location',()=>fixture(async root=>{
 await commitMemory(root,sixth);const p=await loadProduction(root,'reception'),fifth=await read(join(root,'data/deepseek-fifth-scene.json')),stage=await read(join(root,'data/waiting-stage.json')),roster=await read(join(root,'data/waiting-characters.json'));
 const c=compileStory(fifth,stage,roster.filter(a=>fifth.castIds.includes(a.id)));assert.equal(p.seed.initial.actors.ping_er.anchor,stateAt(c,c.duration).actors.ping_er.anchor);
}));
test('guest, companion and reporting routes use distinct unobstructed standing positions',()=>fixture(async root=>{
 await commitMemory(root,sixth);const {stage}=await loadProduction(root,'reception');assert.notDeepEqual(stage.anchors.hall_wait,stage.anchors.companion_wait);
 for(const [a,b] of [['arrival','guest_reply'],['guest_reply','hall_wait'],['relay','companion_wait'],['ping_home','gate_wait']]){const path=route(stage,a,b);for(let t=0;t<=1;t+=.01){const p=along(path,t);assert(!stage.obstacles.some(o=>p[0]>o.min[0]&&p[0]<o.max[0]&&p[1]>o.min[1]&&p[1]<o.max[1]));}}
}));
test('seventh memory preserves absent family and old ancestor changes invalidate the current reception',()=>fixture(async root=>{
 const m=mergeMemory(sixth.contextMemory,{summary:'来客与平儿相见。',characters:[{id:'ping_er',memory:'平儿首次与刘姥姥本人交谈。'}]},{id:'seventh',beats:[{dialogue:[]}]});assert.equal(m.revision,7);assert.equal(m.characters.gouer,sixth.contextMemory.characters.gouer);
 assert(await lineageCurrent(root,'reception',{carryover:{parentStoryId:sixth.id}}));const fifth=await read(join(root,'data/deepseek-fifth-scene.json'));await writeFile(latestPath(root,'waiting'),JSON.stringify({...fifth,id:'different-fifth'}));assert(!await lineageCurrent(root,'reception',{carryover:{parentStoryId:sixth.id}}));
}));
