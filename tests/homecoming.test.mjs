import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile,cp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {loadProduction,latestPath,lineageCurrent} from '../backend/productions.mjs';import {commitMemory,mergeMemory,nextWritingContext,decisionText} from '../backend/story-memory.mjs';import {validateFactRefs} from '../backend/card-context.mjs';import {compileStory,stateAt,route,along} from '../src/engine.js';import {buildHandoff,stageScriptBeat} from '../backend/narrative.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8')),parent=await read(new URL('../data/stories/delivery.json',import.meta.url));
async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'honglou-homecoming-'));try{await cp(new URL('../data',import.meta.url),join(root,'data'),{recursive:true});await cp(new URL('../cards',import.meta.url),join(root,'cards'),{recursive:true});await mkdir(join(root,'.runtime'));await fn(root);}finally{await rm(root,{recursive:true,force:true});}}
test('return requires accepted delivery and inherits actual goods, not a grant promise',()=>fixture(async root=>{
 await assert.rejects(loadProduction(root,'homecoming'),/确认第十二场/);await commitMemory(root,parent);let p=await loadProduction(root,'homecoming');assert.deepEqual(p.seed.initial.propOwners,{rice:'granny',coins:'granny'});assert.deepEqual(p.characters.map(c=>c.id),['granny','gouer','liushi','baner','qinger']);assert(!p.seed.initial.actors.zhou_wife);
 const bad=structuredClone(parent);bad.beats.forEach(b=>b.commands=b.commands.filter(c=>c.type!=='transfer'));await writeFile(latestPath(root,'delivery'),JSON.stringify(bad));await assert.rejects(loadProduction(root,'homecoming'),/未实际归/);
}));
test('family has not heard mansion results or accompanied the return, but keeps first-scene memories',()=>fixture(async root=>{
 await commitMemory(root,parent);const {rawCards:cards}=await loadProduction(root,'homecoming');validateFactRefs({speaker:'granny',factRefs:['actual_rice_money']},cards);for(const id of ['gouer','liushi','baner']){assert.throws(()=>validateFactRefs({speaker:id,factRefs:['actual_rice_money']},cards));assert.equal(cards.characters.find(c=>c.id===id).experiencedMemory,parent.contextMemory.characters[id]);}
 const bad=structuredClone(parent);bad.narrative.handoff.decision.party.push('zhou_wife');await writeFile(latestPath(root,'delivery'),JSON.stringify(bad));await assert.rejects(loadProduction(root,'homecoming'),/独自返家/);
}));
test('homecoming routes stay in room and preserve physical item custody on rewind',()=>fixture(async root=>{
 await commitMemory(root,parent);const p=await loadProduction(root,'homecoming');for(const [a,b]of [['door_inside','room_center'],['gouer_home','gouer_listen']])for(let t=0;t<=1;t+=.01){const v=along(route(p.stage,a,b),t);assert(!p.stage.obstacles.some(o=>v[0]>o.min[0]&&v[0]<o.max[0]&&v[1]>o.min[1]&&v[1]<o.max[1]));}
 const s={version:1,scene:p.stage.id,initial:p.seed.initial,beats:[stageScriptBeat({id:'bring',title:'回家',change:'交米',dialogue:[{speaker:'granny',to:['liushi'],mode:'normal',text:'米你接着。',knowledgeRefs:[],factRefs:[]}]},{narration:'刘姥姥把米交给刘氏。',afterTransfers:[{actor:'granny',target:'liushi',prop:'rice'}]})]};const c=compileStory(s,p.stage,p.characters);assert.equal(stateAt(c,c.duration).props.rice.owner,'liushi');assert.equal(stateAt(c,0).props.rice.owner,'granny');
}));
test('settlement is explicit, evidenced and confined to nodes that permit it',()=>fixture(async root=>{
 await commitMemory(root,parent);const p=await loadProduction(root,'homecoming'),s={version:1,scene:p.stage.id,initial:p.seed.initial,narrative:{nodeId:'household-return'},beats:[stageScriptBeat({id:'settle',title:'安排',change:'眼前安排说定',dialogue:[{speaker:'granny',to:['liushi'],mode:'normal',text:'米先留着做饭。',knowledgeRefs:[],factRefs:[]}]},{narration:'刘姥姥交代米的用途。'})]},r={status:'settled',nextNodeId:'household-return',party:[],purpose:'安顿米粮',approach:'留作家用',departureCondition:'没有新的外出',evidenceRefs:['settle:0'],facts:[{kind:'plan',text:'米先留作做饭。',evidenceRefs:['settle:0']}]};
 const h=buildHandoff(s,p.stage,p.characters,p.storyline,r);assert.equal(h.transition,'settled-in-place');assert(!decisionText(h).includes('尚未实际旅行'));
 assert.throws(()=>buildHandoff(s,p.stage,p.characters,p.storyline,{...r,party:['granny']}),/收束/);assert.throws(()=>buildHandoff(s,p.stage,p.characters,p.storyline,{...r,facts:[]}),/实际物品/);
 const changed=structuredClone(p.storyline);changed.nodes.find(n=>n.id==='household-return').allowSettlement=false;assert.throws(()=>buildHandoff(s,p.stage,p.characters,changed,r),/不允许原地收束/);
 const next=await nextWritingContext(root,p.rawCards,p.storyline,h,parent.contextMemory);assert.equal(next.sceneId,'SC10_GEJ');assert(!next.prompt.includes('刘姥姥已进狗儿家屋门内'));assert(!next.prompt.includes('尚未实际旅行'));
}));
test('family updates do not leak back to mansion characters and lineage remains enforced',()=>fixture(async root=>{
 const u={summary:'刘姥姥回家说明结果。',characters:[{id:'liushi',memory:'我听母亲说她带回米钱。'}]},m=mergeMemory(parent.contextMemory,u,{id:'return',beats:[{dialogue:[]}]});for(const id of ['fengjie','ping_er','zhou_wife'])assert.equal(m.characters[id],parent.contextMemory.characters[id]);
 assert(await lineageCurrent(root,'homecoming',{carryover:{parentStoryId:parent.id}}));await writeFile(latestPath(root,'arrange'),JSON.stringify({...await read(join(root,'data/stories/arrange.json')),id:'changed'}));assert(!await lineageCurrent(root,'homecoming',{carryover:{parentStoryId:parent.id}}));
}));
