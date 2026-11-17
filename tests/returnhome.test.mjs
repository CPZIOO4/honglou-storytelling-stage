import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadProduction,lineageCurrent,latestPath} from '../backend/productions.mjs';
import {commitMemory,mergeMemory} from '../backend/story-memory.mjs';
import {validateFactRefs} from '../backend/card-context.mjs';
import {compileStory,stateAt,route,along} from '../src/engine.js';
import {auditGeneratedStory} from '../backend/generator.mjs';
import {stageScriptBeat} from '../backend/narrative.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const fifth=await read(new URL('../data/stories/waiting.json',import.meta.url));
async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'honglou-return-'));try{await cp(new URL('../data',import.meta.url),join(root,'data'),{recursive:true});await mkdir(join(root,'.runtime'));await fn(root);}finally{await rm(root,{recursive:true,force:true});}}
test('return scene requires accepted fifth, adds only the recorded waiting resident and preserves her actual position',()=>fixture(async root=>{
 await assert.rejects(loadProduction(root,'returnhome'),/确认第五场/);await commitMemory(root,fifth);
 const p=await loadProduction(root,'returnhome'),fourth=await read(join(root,'data/stories/zhouhome.json')),oldStage=await read(join(root,'data/stages/zhouhome.json')),roster=await read(join(root,'data/characters/zhouhome.json'));
 const c=compileStory(fourth,oldStage,roster.filter(c=>fourth.castIds.includes(c.id)));
 assert.deepEqual(p.characters.map(c=>c.id),['granny','zhou_wife']);assert.equal(p.previousMemory.revision,5);
 assert.equal(p.seed.initial.actors.granny.anchor,stateAt(c,c.duration).actors.granny.anchor);
 assert.equal(p.rawCards.characters.find(c=>c.id==='granny').experiencedMemory,fifth.contextMemory.characters.granny);
 assert(!p.seed.initial.actors.ping_er);
}));
test('permission must be relayed before granny can know it',()=>fixture(async root=>{
 await commitMemory(root,fifth);const {rawCards:cards}=await loadProduction(root,'returnhome');
 validateFactRefs({speaker:'zhou_wife',factRefs:['return_message_0']},cards);
 assert.throws(()=>validateFactRefs({speaker:'granny',factRefs:['return_message_0']},cards));
 assert(!cards.characters.find(c=>c.id==='granny').knownFactIds.some(id=>id.startsWith('relay_card_')));
}));
test('a changed return party or missing waiting record cannot be forced into this scene',()=>fixture(async root=>{
 await commitMemory(root,fifth);const invalid=structuredClone(fifth);invalid.narrative.handoff.decision.party.push('granny');
 await writeFile(latestPath(root,'waiting'),JSON.stringify(invalid));await assert.rejects(loadProduction(root,'returnhome'),/独自返回/);
 await writeFile(latestPath(root,'waiting'),JSON.stringify(fifth));const fourth=await read(join(root,'data/stories/zhouhome.json'));
 fourth.generation.handoffScopeReview.explanations.find(e=>e.actor==='granny').scope='立即行动';
 await writeFile(latestPath(root,'zhouhome'),JSON.stringify(fourth));await assert.rejects(loadProduction(root,'returnhome'),/留在住处/);
}));
test('return and departure routes use the open doorway and avoid furniture',()=>fixture(async root=>{
 await commitMemory(root,fifth);const {stage}=await loadProduction(root,'returnhome');
 for(const [a,b] of [['host_door','host_talk'],['host_talk','host_exit'],['guest_talk','courtyard_exit']]){
  const path=route(stage,a,b);assert(path.some(p=>Math.abs(p[0]-1)<.01&&Math.abs(p[1]-.3)<.01));
  for(let t=0;t<=1;t+=.01){const p=along(path,t);assert(!stage.obstacles.some(o=>p[0]>o.min[0]&&p[0]<o.max[0]&&p[1]>o.min[1]&&p[1]<o.max[1]));}
 }
}));
test('return memory updates present listeners but cannot update absent Ping er, and ancestor changes invalidate the scene',()=>fixture(async root=>{
 const m=mergeMemory(fifth.contextMemory,{summary:'周瑞妻子回屋传话。',characters:[{id:'granny',memory:'刘姥姥听到周瑞妻子转述。'},{id:'zhou_wife',memory:'周瑞妻子转达平儿的安排。'}]},{id:'sixth',beats:[{dialogue:[]}]});
 assert.equal(m.revision,6);assert.equal(m.characters.ping_er,fifth.contextMemory.characters.ping_er);
 assert(await lineageCurrent(root,'returnhome',{carryover:{parentStoryId:fifth.id}}));
 await writeFile(latestPath(root,'waiting'),JSON.stringify({...fifth,id:'different-fifth'}));assert(!await lineageCurrent(root,'returnhome',{carryover:{parentStoryId:fifth.id}}));
}));
test('explicit lead and follow dialogue rejects reversed or simultaneous departure, but does not force a future promise to execute',()=>fixture(async root=>{
 await commitMemory(root,fifth);const p=await loadProduction(root,'returnhome');
 const step={id:'leave',title:'同行',change:'两人商定同行',dialogue:[{speaker:'zhou_wife',to:['granny'],mode:'normal',text:'我先走，你跟着。',knowledgeRefs:[],factRefs:[]}]};
 const make=(leader,follower)=>({version:1,scene:p.stage.id,initial:p.seed.initial,beats:[stageScriptBeat(step,{narration:'周瑞妻子与刘姥姥商定同行。',moves:[{actor:'zhou_wife',target:'host_talk'}],afterMoves:leader===null?[]:[{actor:'zhou_wife',target:'host_exit',delay:leader},{actor:'granny',target:'courtyard_exit',delay:follower}],camera:'room'})]});
 assert.throws(()=>auditGeneratedStory(make(.8,0),p.stage,p.characters,p.rawCards),/先动/);
 assert.throws(()=>auditGeneratedStory(make(0,0),p.stage,p.characters,p.rawCards),/先动/);
 assert.doesNotThrow(()=>auditGeneratedStory(make(0,.8),p.stage,p.characters,p.rawCards));
 assert.doesNotThrow(()=>auditGeneratedStory(make(null,null),p.stage,p.characters,p.rawCards));
}));
