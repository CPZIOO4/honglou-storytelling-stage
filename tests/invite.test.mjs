import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile,cp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {loadProduction,lineageCurrent,latestPath} from '../backend/productions.mjs';import {commitMemory,mergeMemory} from '../backend/story-memory.mjs';import {validateFactRefs} from '../backend/card-context.mjs';import {compileStory,stateAt,route,along} from '../src/engine.js';
const read=async p=>JSON.parse(await readFile(p,'utf8')),eighth=await read(new URL('../data/stories/report.json',import.meta.url));
async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'honglou-invite-'));try{await cp(new URL('../data',import.meta.url),join(root,'data'),{recursive:true});await mkdir(join(root,'.runtime'));await fn(root);}finally{await rm(root,{recursive:true,force:true});}}
test('invitation requires accepted eighth and only the actual reporter returns',()=>fixture(async root=>{
 await assert.rejects(loadProduction(root,'invite'),/确认第八场/);await commitMemory(root,eighth);const p=await loadProduction(root,'invite');assert.deepEqual(p.characters.map(c=>c.id),['granny','zhou_wife','ping_er']);assert.equal(p.previousMemory.revision,8);assert(!p.seed.initial.actors.fengjie);
 const invalid=structuredClone(eighth);invalid.narrative.handoff.decision.party.push('fengjie');await writeFile(latestPath(root,'report'),JSON.stringify(invalid));await assert.rejects(loadProduction(root,'invite'),/独自回廊下/);
}));
test('waiting residents retain their actual seventh-scene positions and private memories',()=>fixture(async root=>{
 await commitMemory(root,eighth);const p=await loadProduction(root,'invite'),seventh=await read(join(root,'data/stories/reception.json')),stage=await read(join(root,'data/stages/reception.json')),roster=await read(join(root,'data/characters/waiting.json'));
 const c=compileStory(seventh,stage,roster.filter(a=>seventh.castIds.includes(a.id))),end=stateAt(c,c.duration);
 for(const id of ['granny','zhou_wife']){assert.equal(p.seed.initial.actors[id].anchor,end.actors[id].anchor);assert.equal(p.rawCards.characters.find(c=>c.id===id).experiencedMemory,eighth.contextMemory.characters[id]);}
}));
test('permission belongs only to the messenger until it is actually conveyed',()=>fixture(async root=>{
 await commitMemory(root,eighth);const {rawCards:cards}=await loadProduction(root,'invite');validateFactRefs({speaker:'ping_er',factRefs:['new_reply_0']},cards);
 for(const id of ['granny','zhou_wife']){assert.throws(()=>validateFactRefs({speaker:id,factRefs:['new_reply_0']},cards));assert(!cards.characters.find(c=>c.id===id).knownFactIds.some(k=>k.startsWith('new_reply_')));}
 assert(cards.relationshipFacts.find(f=>f.id==='new_reply_1').claim.startsWith('平儿答应'));
}));
test('leading and following end at distinct positions in front of the inner gate',()=>fixture(async root=>{
 await commitMemory(root,eighth);const {stage}=await loadProduction(root,'invite');assert.notDeepEqual(stage.anchors.inner_lead,stage.anchors.inner_follow);
 for(const [a,b]of [['gate_wait','inner_lead'],['hall_wait','inner_follow'],['gate_wait','ping_home']]){const path=route(stage,a,b);for(let t=0;t<=1;t+=.01){const p=along(path,t);assert(!stage.obstacles.some(o=>p[0]>o.min[0]&&p[0]<o.max[0]&&p[1]>o.min[1]&&p[1]<o.max[1]));}}
}));
test('acceptance does not reach absent Fengjie, and changing an ancestor invalidates the invitation',()=>fixture(async root=>{
 const m=mergeMemory(eighth.contextMemory,{summary:'平儿回廊下传话。',characters:[{id:'ping_er',memory:'平儿传达邀请。'},{id:'granny',memory:'刘姥姥听到邀请。'}]},{id:'ninth',beats:[{dialogue:[]}]});assert.equal(m.revision,9);assert.equal(m.characters.fengjie,eighth.contextMemory.characters.fengjie);
 assert(await lineageCurrent(root,'invite',{carryover:{parentStoryId:eighth.id}}));const seventh=await read(join(root,'data/stories/reception.json'));await writeFile(latestPath(root,'reception'),JSON.stringify({...seventh,id:'different-seventh'}));assert(!await lineageCurrent(root,'invite',{carryover:{parentStoryId:eighth.id}}));
}));
