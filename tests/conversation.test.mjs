import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateConversation,partitionConversation,assertDialoguePreserved,validateDialogueReview,composeConversation,DIALOGUE_CHECKS} from '../backend/conversation.mjs';
const cards=JSON.parse(await readFile(new URL('../data/cards/home.json',import.meta.url),'utf8'));
const draft=(n=3)=>({intentions:[{actor:'granny',aim:'解决冬事',concern:'求助难'}],endingAim:'商量动身',turns:Array.from({length:n},(_,i)=>({id:'t'+i,speaker:i%2?'gouer':'granny',to:[i%2?'granny':'gouer'],mode:'normal',text:'这条门路先问一问。'+i,knowledgeRefs:i?['t'+(i-1)]:[],respondsTo:i?['t'+(i-1)]:[],factRefs:[]}))});
const review=(d,passed=true)=>({passed,initiative:{volunteerAt:'t0',delegatedBefore:[],reason:'主动发言'},checks:DIALOGUE_CHECKS.map(kind=>({kind,passed:kind==='responsiveness'?passed:true,evidenceRefs:['t0'],reason:'对应原句'})),connections:d.turns.slice(1).map((t,i)=>({turnId:t.id,connectsTo:[d.turns[i].id],reason:'承接'})),concerns:[],issues:passed?[]:[{turnIds:['t1'],reason:'没有回答前句'}]});
test('continuous writing has no eight-line cap and keeps knowledge separate from replies',()=>{const d=draft(12);assert.equal(validateConversation(d,cards).turns.length,12);d.turns[1].respondsTo=['t11'];assert.throws(()=>validateConversation(d,cards),/respondsTo/);});
test('partition preserves words/order and remaps prior heard references across segments',()=>{
 const d=draft(4),p=partitionConversation(d,{segments:[{id:'first',title:'先问',change:'问出门路',turnIds:['t0','t1']},{id:'last',title:'后定',change:'作出决定',turnIds:['t2','t3'],dialogue:[{text:'不允许偷换'}]}]});
 assertDialoguePreserved(d,p);assert.deepEqual(p.beats[1].dialogue[0].knowledgeRefs,['first:1']);assert.deepEqual(p.beats[1].dialogue[0].respondsTo,['first:1']);
 p.beats[0].dialogue[0].text='偷偷改写';assert.throws(()=>assertDialoguePreserved(d,p),/改变/);
 for(const turnIds of [['t0','t1','t1','t3'],['t1','t0','t2','t3'],['t0','t1','t2']])assert.throws(()=>partitionConversation(d,{segments:[{id:'one',title:'段',change:'变',turnIds}]}),/完整覆盖/);
});
test('a pass cannot hide failed checks, missing connections, or imaginary answers',()=>{
 const d=draft(),r=review(d);assert.equal(validateDialogueReview(r,d).passed,true);
 assert.throws(()=>validateDialogueReview({...review(d,false),passed:true},d),/失败项/);
 assert.throws(()=>validateDialogueReview({...r,connections:[]},d),/逐句/);
 assert.throws(()=>validateDialogueReview({...r,concerns:[{raisedAt:'t0',responseAt:[],kind:'actionable',status:'answered',reason:'假称解决'}]},d),/后续证据/);
 assert.throws(()=>validateDialogueReview({...r,concerns:[{raisedAt:'t0',responseAt:[],kind:'actionable',status:'unresolved',reason:'忽略反对意见'}]},d),/一边/);
 assert.equal(validateDialogueReview({...r,concerns:[{raisedAt:'t0',responseAt:[],kind:'external-uncertainty',status:'unresolved',reason:'是否肯帮要登门才知道'}]},d).passed,true);
});
test('content failure permits an expanded rewrite and blind review never sees writer explanations',async()=>{
 const first=draft(),fixed=draft(4),calls=[];let writes=0;
 const result=await composeConversation({cards,context:'当前初态',ask:async(system,input,phase)=>{
  calls.push({phase,input});if(phase.startsWith('conversation-write'))return writes++?fixed:first;
  if(phase==='conversation-review-0')return review(first,false);
  if(phase==='conversation-review-1')return review(fixed);
  return {segments:[{id:'b1',title:'商议',change:'形成办法',turnIds:fixed.turns.map(t=>t.id)}]};
 }});
 assert.equal(result.conversation.turns.length,4);assert.equal(result.plan.beats.length,1);assert(calls.find(c=>c.phase==='conversation-write-1').input.feedback.issues.length);
 for(const call of calls.filter(c=>c.phase.startsWith('conversation-review'))){assert(!('intentions'in call.input));assert(!('endingAim'in call.input));assert(!('plan'in call.input));assert(!('draft'in call.input));assert(call.input.transcript);}
});
test('protagonist responsibility survives runtime projection and cannot be passed off as delegated consent',()=>{
 const d=draft(),r=review(d);assert.equal(validateDialogueReview(r,d,cards).passed,true);
 assert.throws(()=>validateDialogueReview({...r,initiative:{volunteerAt:'t2',delegatedBefore:['t1'],reason:'别人要求后答应'}},d,cards),/被推派/);
 assert.throws(()=>validateDialogueReview({...r,initiative:{volunteerAt:'t1',delegatedBefore:[],reason:'错用狗儿的话'}},d,cards),/实际发言/);
 d.turns[0].text='成不成我可不敢包，别怨我。';assert.throws(()=>validateConversation(d,cards),/免责/);
});
