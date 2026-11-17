import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile,cp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {loadProduction,latestPath,lineageCurrent} from '../backend/productions.mjs';import {commitMemory,memoryEvidence,mergeMemory,validateMemoryUpdate} from '../backend/story-memory.mjs';import {validateFactRefs} from '../backend/card-context.mjs';import {compileStory,stateAt} from '../src/engine.js';import {stageScriptBeat,applyModelPatches} from '../backend/narrative.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8')),parent=await read(new URL('../data/stories/arrange.json',import.meta.url));
async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'honglou-delivery-'));try{await cp(new URL('../data',import.meta.url),join(root,'data'),{recursive:true});await mkdir(join(root,'.runtime'));await fn(root);}finally{await rm(root,{recursive:true,force:true});}}
const line={speaker:'ping_er',to:['granny'],mode:'normal',text:'姥姥，接着。',knowledgeRefs:[],factRefs:[]};
function packet(p){return {version:1,scene:p.stage.id,initial:p.seed.initial,beats:[stageScriptBeat({id:'give',title:'交接',change:'递给来客',dialogue:[line]},{narration:'平儿将米钱交给刘姥姥。',afterTransfers:[{actor:'ping_er',target:'granny',prop:'rice'},{actor:'ping_er',target:'granny',prop:'coins'}]})]};}
test('delivery requires accepted errand, preserves waiting people and records explicit elision',()=>fixture(async root=>{
 await assert.rejects(loadProduction(root,'delivery'),/确认第十一场/);await commitMemory(root,parent);const p=await loadProduction(root,'delivery');assert.equal(p.previousMemory.revision,11);assert.deepEqual(p.seed.initial.propOwners,{rice:'ping_er',coins:'ping_er'});assert.equal(p.rawCards.scene.routineElision.sourceStoryId,parent.id);for(const id of ['granny','zhou_wife'])assert.equal(p.rawCards.characters.find(c=>c.id===id).experiencedMemory,parent.contextMemory.characters[id]);
 const bad=structuredClone(parent);bad.narrative.handoff.decision.party.push('granny');await writeFile(latestPath(root,'arrange'),JSON.stringify(bad));await assert.rejects(loadProduction(root,'delivery'),/独自/);
}));
test('offscreen preparation is known to Ping alone, observed ownership is separate from narrated knowledge',()=>fixture(async root=>{
 await commitMemory(root,parent);const p=await loadProduction(root,'delivery');validateFactRefs({speaker:'ping_er',factRefs:['routine_preparation']},p.rawCards);assert.throws(()=>validateFactRefs({speaker:'zhou_wife',factRefs:['routine_preparation']},p.rawCards));
}));
test('prop transfer interpolates once, commits only at completion and rewinds without duplication',()=>fixture(async root=>{
 await commitMemory(root,parent);const p=await loadProduction(root,'delivery'),s=packet(p),c=compileStory(s,p.stage,p.characters),event=c.events.find(e=>e.type==='transfer');
 assert.equal(stateAt(c,0).props.rice.owner,'ping_er');const mid=stateAt(c,event.time+.6);assert.equal(mid.props.rice.owner,'ping_er');assert.equal(mid.props.rice.transferring.to,'granny');assert.equal(stateAt(c,event.time+1.2).props.rice.owner,'granny');const end=stateAt(c,c.duration);assert.equal(end.props.coins.owner,'granny');assert.equal(Object.keys(end.props).length,2);assert.deepEqual(stateAt(c,0).props, stateAt(compileStory(s,p.stage,p.characters),0).props);
}));
test('unknown, double, remote, moving or mid-speech transfers are rejected',()=>fixture(async root=>{
 await commitMemory(root,parent);const p=await loadProduction(root,'delivery');
 for(const mutate of [s=>s.beats[0].commands.find(c=>c.type==='transfer').prop='fake',s=>s.initial.propOwners.rice='granny',s=>s.initial.actors.granny.anchor='return_exit',s=>s.beats[0].commands.find(c=>c.type==='transfer').at=2,s=>{const b=s.beats[0],e=b.commands.find(c=>c.type==='transfer');b.commands.push({at:e.at-.1,type:'move',actor:'granny',target:'guest_reply',duration:1});}]){const s=packet(p);mutate(s);assert.throws(()=>compileStory(s,p.stage,p.characters));}
 const s=packet(p),b=s.beats[0],e=b.commands.find(c=>c.type==='transfer');b.commands.push({...e,at:b.duration});b.duration+=3;assert.throws(()=>compileStory(s,p.stage,p.characters),/自己实际持有/);
}));
test('only present witnesses receive transfer evidence and absent Fengjie memory stays unchanged',()=>fixture(async root=>{
 await commitMemory(root,parent);const p=await loadProduction(root,'delivery'),s=packet(p),e=memoryEvidence(s,p.stage,p.characters);assert(e.events.some(x=>x.id==='give:transfer:rice'));assert(e.heardBy.granny.includes('give:transfer:rice'));s.initial.actors.zhou_wife.visible=false;const hidden=memoryEvidence(s,p.stage,p.characters);assert(!hidden.heardBy.zhou_wife.includes('give:transfer:rice'));
 const update={summary:'米钱交到刘姥姥手中。',evidenceRefs:['give:transfer:rice','give:transfer:coins'],characters:[{id:'granny',memory:'我接到了米袋和钱袋。',evidenceRefs:['give:transfer:rice','give:transfer:coins']}]};validateMemoryUpdate(update,e,p.rawCards);assert.equal(mergeMemory(parent.contextMemory,update,s).characters.fengjie,parent.contextMemory.characters.fengjie);
 assert(await lineageCurrent(root,'delivery',{carryover:{parentStoryId:parent.id}}));
}));

test('narration-only repairs preserve both transfers and later departure timing',()=>fixture(async root=>{
 await commitMemory(root,parent);const p=await loadProduction(root,'delivery'),s=packet(p),b=s.beats[0];b.commands.push({at:b.duration,type:'move',actor:'granny',target:'guest_exit',duration:4});b.duration+=5;
 const fixed=applyModelPatches(s,{patches:[{beatId:'give',narration:'平儿交出米钱后，刘姥姥动身。'}]},[{beatId:'give',scope:'narration',reason:'只修旁白'}]);const c=compileStory(fixed,p.stage,p.characters);assert.equal(c.events.filter(e=>e.type==='transfer').length,2);assert.equal(stateAt(c,c.duration).props.rice.owner,'granny');assert.equal(stateAt(c,c.duration).actors.granny.anchor,'guest_exit');
}));
