import {readData as read,readLatest,lineageCurrent} from './common.mjs';
import {acceptedMemory} from '../story-memory.mjs';
import {compileStory,stateAt} from '../../src/engine.js';
export default async function loadBackstreet(root,base,line,audioLibrary){
 const parent=await readLatest(root,'gate');if(!parent||!await lineageCurrent(root,'gate',parent))throw Error('第二场缺失或所属分支已变更，请先完成当前分支的第二场');
 const previousMemory=await acceptedMemory(root,parent.id);if(!previousMemory)throw Error('请先播放完成并确认第二场，第三场才可继承');
 const handoff=parent.narrative?.handoff;if(handoff?.decision?.status!=='depart'||handoff.nextNodeId!=='backstreet-contact')throw Error('第二场没有决定进入后街节点，不能强行生成第三场');
 const upcoming=await read(root,'upcoming-cards'),roster=await read(root,'backstreet-characters');
 const party=handoff.decision.party;if(!Array.isArray(party)||!party.includes('granny')||new Set(party).size!==party.length||party.some(id=>!roster.some(c=>c.id===id))||party.length>7||party.includes('guide_child'))throw Error('第二场实际来访名单无效');
 const cards=await read(root,'backstreet-cards'),cast=[...party,'guide_child'];
 cards.characters=[...base.characters,...upcoming.characters].filter(c=>cast.includes(c.id)).map(c=>{
  const {sceneRole,performance,knownFactIds,knowledge,...stable}=structuredClone(c);
  return {...stable,unknownAtStart:c.id==='guide_child'?['未与来客见过面，不知其姓名、来历与求助详情','不知周瑞妻子会如何接待来客']:['本人未听到的消息','周瑞妻子是否愿意接待、帮忙递话，以及后续求助结果'],performance:{...performance,atHome:undefined,agency:undefined},sceneRole:c.id==='granny'?'用老仆已经说清的太太陪房周瑞家身份向孩子确认住处，语气亲切；不忘已经知道的路线，不重新讲全家家计，得到带路回应后再跟上。':c.sceneRoles?.['backstreet-contact']||'保持实际同行身份，依自己经历配合问路。',experiencedMemory:previousMemory.characters[c.id]||'本轮首次出现，尚未与来客交谈。'};
 });
 cards.relationshipFacts=[...base.relationshipFacts.filter(f=>f.id!=='winter_need').map(f=>({...f,claim:f.id==='granny_zhou_awareness'?'刘姥姥早年知道周瑞这个人，但多年未与之来往；新近消息以她实际听闻为准。':f.claim,knownBy:f.knownBy.filter(id=>party.includes(id))})).filter(f=>f.knownBy.length),...handoff.facts.map((f,i)=>({id:'previous_gate_fact_'+i,claim:f.text,knownBy:f.knownBy.filter(id=>party.includes(id)),scope:'来自上场实际听闻；计划或对他人的转述保持原有不确定性。'})).filter(f=>f.knownBy.length),{id:'backstreet_neighbor_zhou',claim:'孩童认识太太陪房周瑞家，知道从敞开的后门进去可到其住处；不清楚周瑞妻子将如何接待来客。',knownBy:['guide_child'],scope:'邻里生活知识，不是府内事务或求援结果。'}];
 for(const c of cards.characters){c.knownFactIds=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.id);c.knowledge=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.claim);}
 cards.scene.initialSituation=`${party.map(id=>roster.find(c=>c.id===id).name).join('、')}听过老仆指点，已沿府墙从角门绕到后街后门外。其目的是${handoff.decision.purpose}。现在刚到街口，摊担靠墙，一个孩子在门前空地。来客还没向孩子说话，未获其带路承诺，也未见到周瑞妻子。${party.some(id=>id!=='granny')?'只承接以上实际名单，其他人物不自动入场。':'原在门上的人未随行，家中人仍不在此场。'}`;
 const slots=['arrive_from_corner','companion_one','companion_two','companion_three','companion_four','companion_five','companion_six'];
 const initial={camera:'wide',lighting:'day',actors:Object.fromEntries(cast.map(id=>[id,{anchor:id==='guide_child'?'child_reply':slots[party.indexOf(id)],expression:'neutral',facing:'front',visible:true}]))};
 return {rawCards:cards,stage:await read(root,'backstreet-stage'),characters:roster.filter(c=>cast.includes(c.id)),seed:{initial},storyline:line,audioLibrary,nodeId:'backstreet-contact',previousMemory,parent};
}
