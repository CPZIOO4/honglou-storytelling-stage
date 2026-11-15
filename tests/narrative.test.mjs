import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePlan,validateScreenplay,buildHandoff,nextNodeContext,stageScriptBeat} from '../backend/narrative.mjs';
const j=n=>JSON.parse(readFileSync(new URL('../data/'+n+'.json',import.meta.url),'utf8'));
const stage=j('stage'),characters=j('characters'),cards=j('cards'),seed=j('scene-one'),line=j('storyline');
function branch(companion){
 const name=cards.characters.find(c=>c.id===companion).name;
 return {...seed,narrative:{nodeId:'household-decision'},beats:[{id:'decide',title:'拿定主意',duration:25,narration:'一家人说定了办法。',memory:'次晨去找周瑞妻子问活计。',commands:[{at:0,type:'face',actor:'granny',target:companion},{at:12,type:'face',actor:companion,target:'granny'}],dialogue:[{at:1,until:11,speaker:'granny',to:[companion],mode:'normal',text:`明早我和${name}去周瑞妻子那里问活计，先提旧交。`,knowledgeRefs:[]},{at:13,until:23,speaker:companion,to:['granny'],mode:'normal',text:'成，我陪您去。',knowledgeRefs:['decide:0']}]}]};
}
function resolution(companion){return {status:'depart',nextNodeId:'gate-access',party:['granny',companion],purpose:'问活计',approach:'先提旧交',departureCondition:'明早',evidenceRefs:['decide:0', 'decide:1'],facts:[]};}
for(const companion of ['liushi','gouer'])test(`next-node cast inherits ${companion}, never restores the canonical child`,()=>{
 const handoff=buildHandoff(branch(companion),stage,characters,line,resolution(companion));
 const next=nextNodeContext(handoff,line,cards);
 assert.deepEqual(next.cast.map(c=>c.id).sort(),['granny',companion].sort());
 assert(!next.cast.some(c=>c.id==='baner'));
 assert.equal(next.transition,'planned-not-travelled');
 assert.equal(next.characterViews[companion].decision.purpose,'问活计');
});
test('changing a branch cannot import invented evidence or invalid node',()=>{
 assert.throws(()=>buildHandoff(branch('liushi'),stage,characters,line,{...resolution('liushi'),evidenceRefs:['future:0']}),/实际发生/);
 assert.throws(()=>buildHandoff(branch('liushi'),stage,characters,line,{...resolution('liushi'),nextNodeId:'make-case'}),/下一节点/);
});
test('a pause without an actual obstacle is not node completion',()=>{
 assert.throws(()=>buildHandoff(branch('liushi'),stage,characters,line,{...resolution('liushi'),status:'defer',nextNodeId:'household-decision',party:[]}),/实质阻碍/);
});
test('private speech stays private after the scene handoff',()=>{
 const privateStory={...seed,narrative:{nodeId:'household-decision'}};
 const b=seed.beats.find(b=>b.dialogue.some(d=>d.mode==='whisper'));
 const i=b.dialogue.findIndex(d=>d.mode==='whisper');const ref=`${b.id}:${i}`;
 const h=buildHandoff(privateStory,stage,characters,line,{status:'defer',nextNodeId:'household-decision',party:[],purpose:'处理顾虑',approach:'商量',departureCondition:'待条件满足',evidenceRefs:[ref],facts:[{kind:'obstacle',text:'私下表达的顾虑',evidenceRefs:[ref]}]});
 const next=nextNodeContext(h,line,cards);
 assert.equal(next.characterViews.gouer.facts.length,0);
 assert.equal(next.characterViews.gouer.decision,null);
 assert(next.characterViews.granny.facts.length>0);
});
test('a scene plan can finish before its segment budget and cannot repeat a change',()=>{
 const p={endingAim:'拿定办法',beats:[1,2,3].map(i=>({id:String(i),question:'问题'+i,change:'变化'+i,intention:'动机'}))};
 assert.equal(validatePlan(p,8).beats.length,3);
 p.beats[2].change=p.beats[1].change;assert.throws(()=>validatePlan(p,8),/重复/);
});
test('story nodes use existing scene cards and reachable next nodes',()=>{
 const index=JSON.parse(readFileSync(new URL('../cards/environment/补充索引.json',import.meta.url),'utf8'));
 const scenes=new Set(['SC01_JM',...index.newCards.map(c=>c.scene.scene_id)]);
 for(const node of line.nodes){assert(node.scenes.every(s=>scenes.has(s)));assert(node.next.every(id=>line.nodes.some(n=>n.id===id)));}
});
test('stage blocking cannot rewrite dialogue, and timing waits for arrival',()=>{
 const step={id:'talk',title:'商议',change:'提出办法',dialogue:[{speaker:'granny',to:['gouer'],mode:'normal',text:'光在屋里生气，柴米也不会自己找上门。',knowledgeRefs:[]},{speaker:'gouer',to:['granny'],mode:'normal',text:'那您说个办法。',knowledgeRefs:['talk:0']}]};
 const b=stageScriptBeat(step,{narration:'刘姥姥走近了才开口。',moves:[{actor:'granny',target:'room_center'}],dialogue:[{text:'不能注入这句话'}],expressions:[]});
 assert.deepEqual(b.dialogue.map(d=>d.text),step.dialogue.map(d=>d.text));
 assert(b.dialogue[0].at>4);
 assert(b.commands.filter(c=>c.type==='face').every(c=>c.at>4));
 for(const d of b.dialogue)assert(d.until-d.at>=d.text.length/5+1);
 assert(b.dialogue[1].at>b.dialogue[0].until);
});
test('screenplay references cannot use topic names or a future line as heard evidence',()=>{
 const p={endingAim:'形成决定',beats:[0,1,2].map(i=>({id:'s'+i,question:'问题'+i,change:'变化'+i,intention:'推进',dialogue:[{speaker:'granny',to:['gouer'],text:'商量一下。',mode:'normal',knowledgeRefs:[]}]}))};
 p.beats[0].dialogue[0].knowledgeRefs=['周瑞'];assert.throws(()=>validateScreenplay(p,characters),/knowledgeRefs/);
 p.beats[0].dialogue[0].knowledgeRefs=['s2:0'];assert.throws(()=>validateScreenplay(p,characters),/knowledgeRefs/);
 p.beats[0].dialogue[0].knowledgeRefs=[];assert.equal(validateScreenplay(p,characters),p);
});
