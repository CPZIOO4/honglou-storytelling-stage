import {readData as read,readLatest,lineageCurrent} from './common.mjs';
import {acceptedMemory} from '../story-memory.mjs';
import {compileStory,stateAt} from '../../src/engine.js';
export default async function loadZhouHome(root,base,line,audioLibrary){
 const parent=await readLatest(root,'backstreet');if(!parent||!await lineageCurrent(root,'backstreet',parent))throw Error('第三场缺失或所属分支已变更');
 const previousMemory=await acceptedMemory(root,parent.id);if(!previousMemory)throw Error('请先播放完成并确认第三场，第四场才可继承');
 const handoff=parent.narrative?.handoff;if(handoff?.decision?.status!=='depart'||handoff.nextNodeId!=='intermediary')throw Error('第三场没有决定拜访周瑞妻子，不能强行生成第四场');
 const upcoming=await read(root,'upcoming-cards'),roster=await read(root,'zhouhome-characters'),cards=await read(root,'zhouhome-cards');
 const party=handoff.decision.party;if(!Array.isArray(party)||!party.includes('granny')||new Set(party).size!==party.length||party.length>7||party.includes('zhou_wife')||party.some(id=>!roster.some(c=>c.id===id)))throw Error('第三场来访名单无效');
 const cast=[...party,'zhou_wife'];
 cards.characters=[...base.characters,...upcoming.characters].filter(c=>cast.includes(c.id)).map(c=>{
  const {sceneRole,performance,knowledge,knownFactIds,...stable}=structuredClone(c);
  return {...stable,performance:{...performance,atHome:undefined,agency:undefined},sceneRole:c.id==='granny'?'主动向旧识招呼，顾体面又说清家中过冬无着与希望托话求周济。以亲切、自嘲与实际商量推进，不将自己出门说成被家人逼来，也不重复门前问路。':c.sceneRoles?.intermediary||'依已经同意的实际同行身份参与，不替他人表态。',unknownAtStart:c.id==='zhou_wife'?['来客今日求助的具体难处和目的','其家中、角门和后街的实际交谈','主事者是否愿接见或提供援助']:['本人未听到的消息','周瑞妻子愿意帮到何处','当前具体接见时机与最终援助结果'],experiencedMemory:previousMemory.characters[c.id]||'本轮首次出场；今日来访消息尚待来客说明。'};
 });
 cards.relationshipFacts=[...base.relationshipFacts.filter(f=>f.id!=='winter_need').map(f=>({...f,claim:f.id==='granny_zhou_awareness'?'刘姥姥早年知道周瑞，但多年未与之来往；新近情况以实际听闻为准。':f.claim,knownBy:f.knownBy.filter(id=>party.includes(id))})).filter(f=>f.knownBy.length),...handoff.facts.map((f,i)=>({id:'previous_backstreet_fact_'+i,claim:f.text,knownBy:f.knownBy.filter(id=>party.includes(id)),scope:'只属于上场实际听见此话的人；带路承诺在本场开头落实到住处门前，不自动变成接待或获助。'})).filter(f=>f.knownBy.length),...upcoming.relationshipFacts.filter(f=>['gate_zhou_role','gate_zhou_away','zhou_old_help','fengjie_household_authority'].includes(f.id)).map(f=>({...f,knownBy:f.knownBy.filter(id=>cast.includes(id))})).filter(f=>f.knownBy.length),{id:'zhou_old_acquaintance',claim:'周瑞妻子和刘姥姥早年见过，多年不曾走动；可能需要稍作辨认，认出后可按旧识招呼。',knownBy:['granny','zhou_wife'],scope:'第六回认了半日再招呼的情节依据；不意味着知道今日来意或近年频繁往来。'},{id:'fengjie_identity',claim:'王熙凤是贾琏之妻、王夫人的内侄女，府中可称琏二奶奶；平儿是她身边能安排候见和传话的人。',knownBy:['zhou_wife'],scope:'身份和办事渠道，不是本场已经获准接见。'}];
 for(const c of cards.characters){c.knownFactIds=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.id);c.knowledge=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.claim);}
 cards.scene.initialSituation=`第三场商定由孩童带路，来访者${party.map(id=>roster.find(c=>c.id===id).name).join('、')}现在已到周瑞妻子住处门前小院。${party.includes('guide_child')?'孩童按上场明确同行安排在场。':'孩子只领到门前，未加入本场接待交谈，不编造他的离场对白或赏钱。'}周瑞妻子在屋门边，尚未与来客交谈；刘姥姥尚未获邀入屋，也未说清今日来意。屋门开着，帘子束在两侧，桌碗都是静态布景。`;
 const slots=['visitor_arrival','companion_one','companion_two','companion_three','companion_four','companion_five','companion_six'];
 const initial={camera:'family',lighting:'day',actors:Object.fromEntries(cast.map(id=>[id,{anchor:id==='zhou_wife'?'host_door':slots[party.indexOf(id)],expression:'neutral',facing:'front',visible:true}]))};
 return {rawCards:cards,stage:await read(root,'zhouhome-stage'),characters:roster.filter(c=>cast.includes(c.id)),seed:{initial},storyline:line,audioLibrary,nodeId:'intermediary',previousMemory,parent};
}
