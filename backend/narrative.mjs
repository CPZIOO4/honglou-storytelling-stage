import {compileStory,personalKnowledge} from '../src/engine.js';
import {validateFactRefs} from './card-context.mjs';

export const NARRATIVE_VERSION=5;
export function nodeFor(storyline,id){const n=storyline.nodes.find(n=>n.id===id);if(!n)throw Error('未知故事节点 '+id);return n;}
export function validatePlan(plan,maxBeats=8){
 if(!plan||!Array.isArray(plan.beats)||plan.beats.length<2||plan.beats.length>maxBeats)throw Error('场次提纲须为2到预算上限段，不为凑满段数拖延');
 const ids=new Set(),changes=new Set();
 for(const b of plan.beats){
  if(typeof b.id!=='string'||!b.id||ids.has(b.id))throw Error('提纲段落ID须唯一');ids.add(b.id);
  for(const k of ['question','change','intention'])if(typeof b[k]!=='string'||!b[k].trim())throw Error('提纲必须有问题、新变化和人物动机');
  const change=b.change.replace(/\s/g,'');if(changes.has(change))throw Error('提纲重复同一变化');changes.add(change);
 }
 if(typeof plan.endingAim!=='string'||!plan.endingAim.trim())throw Error('提纲缺少本场要形成的具体决定');
 return plan;
}
export function validateScreenplay(plan,characters,maxBeats=8,cards=null){
 validatePlan(plan,maxBeats);if(cards?.pacing&&plan.beats.flatMap(b=>b.dialogue||[]).length>cards.pacing.maxLines)throw Error(`本场最多${cards.pacing.maxLines}句，请合并重复商议`);const ids=new Set(characters.map(c=>c.id)),past=new Set();
 for(const b of plan.beats){
  if(!Array.isArray(b.dialogue)||b.dialogue.length<1||b.dialogue.length>4)throw Error(`${b.id} 必须有1到4句对白`);
  for(const [i,d] of b.dialogue.entries()){
   if(cards)validateFactRefs(d,cards);
   if(!ids.has(d.speaker)||!Array.isArray(d.to)||!d.to.length||d.to.some(id=>!ids.has(id)||id===d.speaker))throw Error(`${b.id}:${i} 发话人与对象不合法`);
   if(typeof d.text!=='string'||d.text.length>80)throw Error(`${b.id}:${i} 台词最多80字，当前${d.text?.length}字`);
   if(/[:：]/.test(d.text))throw Error('口语对白不可带冒号或提纲标签');
   if(/周瑞家的/.test(d.text))throw Error('人物名统一周瑞妻子');
   if(!Array.isArray(d.knowledgeRefs)||d.knowledgeRefs.some(ref=>!past.has(ref)))throw Error(`${b.id}:${i} knowledgeRefs只能是此前对白ID ${JSON.stringify([...past])}；角色卡中的固有知识用[]，不要写周瑞或王家等名词作为事件ID`);
   if(!['normal','whisper','call'].includes(d.mode))throw Error('说话方式不合法');
   past.add(`${b.id}:${i}`);
  }
 }
 return plan;
}

// Dialogue stays fixed while the stage compiles timing. Models do not calculate
// reading durations or re-author a conversation to repair a movement constraint.
export function stageScriptBeat(step,blocking){
 if(!Array.isArray(step.dialogue)||!step.dialogue.length||step.dialogue.length>4)throw Error('剧本每段须有1到4句对白');
 if(typeof blocking.narration!=='string')throw Error('缺少与动作一致的旁白');
 const commands=[];const moved=new Set();
 for(const m of blocking.moves||[]){if(moved.has(m.actor))throw Error('同段不能反复搬动同一人物');moved.add(m.actor);commands.push({at:0,type:'move',actor:m.actor,target:m.target,duration:4});}
 let cursor=moved.size?4.5:1;
 for(const e of blocking.expressions||[])commands.push({at:cursor-.4,type:'expression',actor:e.actor,value:e.value});
 if(blocking.camera)commands.push({at:0,type:'camera',target:blocking.camera});
 const dialogue=step.dialogue.map(d=>{
  if(typeof d.text!=='string'||!Array.isArray(d.to)||!d.to.length)throw Error('剧本对白格式无效');
  commands.push({at:cursor-.2,type:'face',actor:d.speaker,target:d.to[0]});
  if(d.mode==='whisper')commands.push({at:cursor-.2,type:'face',actor:d.to[0],target:d.speaker});
  const line={...d,at:cursor,until:cursor+Math.max(4,Math.ceil(d.text.length/5+1))};cursor=line.until+1;return line;
 });
 return {id:step.id,title:step.title||step.question,duration:Math.ceil(cursor+1),narration:blocking.narration,dialogue,commands,memory:step.change};
}
export function applyModelPatches(story,fixes,issues=[]){
 if(!Array.isArray(fixes.patches)||fixes.patches.length>story.beats.length)throw Error('修订格式不合法');
 const out=structuredClone(story);
 for(const patch of fixes.patches){const index=out.beats.findIndex(b=>b.id===patch.beatId);if(index<0)throw Error('修订引用未知段落');const b=out.beats[index];
  for(const k of ['narration','memory'])if(patch[k]!==undefined){if(typeof patch[k]!=='string')throw Error('修订文字须为字符串');b[k]=patch[k];}
  const local=issues.filter(i=>i.beatId===b.id),narrationOnly=local.length&&local.every(i=>i.scope==='narration'||/不要动对白/.test(i.reason));
  for(const d of narrationOnly?[]:patch.dialogue||[]){if(!Number.isInteger(d.index)||!b.dialogue[d.index])throw Error(`${b.id} 可修改句子index仅有0到${b.dialogue.length-1}，禁止增加新句子`);if(typeof d.text!=='string'||!Array.isArray(d.knowledgeRefs))throw Error('修订台词缺字段');Object.assign(b.dialogue[d.index],{text:d.text,knowledgeRefs:d.knowledgeRefs,...(d.factRefs?{factRefs:d.factRefs}:{})});}
  out.beats[index]=stageScriptBeat({...b,change:b.memory}, {narration:b.narration,moves:b.commands.filter(c=>c.type==='move').map(({actor,target})=>({actor,target})),expressions:b.commands.filter(c=>c.type==='expression').map(({actor,value})=>({actor,value})),camera:b.commands.find(c=>c.type==='camera')?.target});
 }return out;
}

// The carryover ledger is built from executed speech, not model-declared audiences.
export function buildHandoff(story,stage,characters,storyline,resolution){
 const node=nodeFor(storyline,story.narrative.nodeId);
 if(!resolution||!node.next.includes(resolution.nextNodeId))throw Error('不允许的下一节点');
 if(!['depart','defer','alternative'].includes(resolution.status))throw Error('缺少明确的行动状态');
 if(resolution.status==='depart'&&resolution.nextNodeId===node.id)throw Error('出发必须指向后续节点');
 if(resolution.status!=='depart'&&resolution.nextNodeId!==node.id)throw Error('未决定出发时不能自动进入荣府场景');
 for(const key of ['purpose','approach','departureCondition'])if(typeof resolution[key]!=='string'||!resolution[key].trim())throw Error('决定缺少 '+key);
 const ids=new Set(characters.map(c=>c.id));const party=resolution.party;
 if(!Array.isArray(party)||new Set(party).size!==party.length||party.some(id=>!ids.has(id)))throw Error('同行名单不合法');
 if(resolution.status==='depart'&&(!party.length||!party.some(id=>!['baner','qinger'].includes(id))))throw Error('出行至少需要一名成人');
 const compiled=compileStory(story,stage,characters),knowledge=personalKnowledge(compiled,compiled.duration);
 const events=Object.fromEntries(compiled.beats.flatMap(b=>b.dialogue.map((d,i)=>[`${b.id}:${i}`,{...d,eventId:`${b.id}:${i}`}])));
 function evidence(refs){
  // Accept a model's explicitly indexed, one-based dialogue alias only when it
  // resolves to a real event; never infer evidence from a name or topic.
  if(Array.isArray(refs))refs=refs.map(ref=>{if(events[ref])return ref;const m=typeof ref==='string'&&ref.match(/^(.*)-d([1-9]\d*)$/);const canonical=m?`${m[1]}:${Number(m[2])-1}`:null;return canonical&&events[canonical]?canonical:ref;});
  if(!Array.isArray(refs)||!refs.length||refs.some(ref=>!events[ref]))throw Error('交接事实必须引用实际发生的对白');
  const knownBy=characters.filter(c=>refs.every(ref=>knowledge[c.id].some(e=>e.eventId===ref))).map(c=>c.id);
  return {evidenceRefs:refs,knownBy};
 }
 const decisionEvidence=evidence(resolution.evidenceRefs);
 if(resolution.status==='depart'&&party.filter(id=>!['baner','qinger'].includes(id)).some(id=>!decisionEvidence.knownBy.includes(id)))throw Error('成人同行者必须听见行动决定，不能由旁白暗自安排');
 const facts=(resolution.facts||[]).map(f=>{if(!['plan','promise','relationship','resource','obstacle'].includes(f.kind)||typeof f.text!=='string'||!f.text.trim())throw Error('交接事实格式不合法');return {kind:f.kind,text:f.text,...evidence(f.evidenceRefs)};});
 if(resolution.status!=='depart'&&!facts.some(f=>f.kind==='obstacle'))throw Error('暂缓或另谋出路必须有实质阻碍，不能只说以后再谈');
 const next=nodeFor(storyline,resolution.nextNodeId);
 return {version:1,sourceStoryId:story.id,sourceNodeId:node.id,nextNodeId:next.id,nextSceneCandidates:next.scenes,transition:'planned-not-travelled',decision:{status:resolution.status,party:[...party],purpose:resolution.purpose,approach:resolution.approach,departureCondition:resolution.departureCondition,...decisionEvidence},facts,characterKnowledge:Object.fromEntries(characters.map(c=>[c.id,knowledge[c.id]]))};
}

export function nextNodeContext(handoff,storyline,cards){
 const departed=handoff.decision.status==='depart';
 const activeIds=departed?handoff.decision.party:cards.characters.map(c=>c.id);
 return {node:nodeFor(storyline,handoff.nextNodeId),transition:handoff.transition,cast:cards.characters.filter(c=>activeIds.includes(c.id)),directorLedger:{decision:handoff.decision,facts:handoff.facts},characterViews:Object.fromEntries(activeIds.map(id=>[id,{heardUtterances:handoff.characterKnowledge[id]||[],facts:handoff.facts.filter(f=>f.knownBy.includes(id)),decision:handoff.decision.knownBy.includes(id)?handoff.decision:null}]))};
}
