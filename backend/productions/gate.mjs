import {readData as read,readLatest} from './common.mjs';
import {acceptedMemory} from '../story-memory.mjs';
export default async function loadGate(root,base,line,audio){
 const parent=await readLatest(root,'home');if(!parent)throw Error('请先生成第一场');
 const memory=await acceptedMemory(root,parent.id);
 if(!memory)throw Error('请先播放完成并确认第一场，第二场才可继承');
 const handoff=parent.narrative?.handoff;
 if(handoff?.decision?.status!=='depart'||handoff.nextNodeId!=='gate-access')throw Error('当前第一场未决定去荣府门前，不能强行进入第二场');
 const party=handoff.decision.party;
 if(!Array.isArray(party)||!party.includes('granny')||new Set(party).size!==party.length||party.some(id=>!base.characters.some(c=>c.id===id)))throw Error('第一场同行名单无效');
 const upcoming=await read(root,'upcoming-cards'),template=await read(root,'gate-cards');
 const cards=structuredClone(template);const cast=[...party,'gatekeeper','old_servant'];
 cards.characters=[...base.characters.filter(c=>party.includes(c.id)),...upcoming.characters.filter(c=>['gatekeeper','old_servant'].includes(c.id))].map(c=>{
  const {sceneRole,performance,...stable}=structuredClone(c);
  return {...stable,performance:{...performance,atHome:undefined,agency:undefined},sceneRole:c.id==='granny'?'已自愿来访，主动而有礼地问周瑞，遇冷淡可陪笑自嘲、追问实处；不复议谁出发，不向陌生门役训人。':c.sceneRoles?.['gate-access']||'按上一场同意的同行身份参与，目的与分工继承个人经历。',experiencedMemory:memory.characters[c.id]||'无来客家中的经历；不知道她姓名、家境、出行分工。'};
 });
 cards.relationshipFacts=[...base.relationshipFacts.map(f=>({...f,knownBy:f.knownBy.filter(id=>party.includes(id))})).filter(f=>f.knownBy.length),...upcoming.relationshipFacts.filter(f=>f.id.startsWith('gate_')).map(f=>({...f,knownBy:f.knownBy.filter(id=>cast.includes(id))}))];
 cards.scene.initialSituation=`上一场最终出行安排是：${handoff.decision.departureCondition}。场间仅落实其中的出行和半程送返，其他承诺尚未兑现。承接已确定的来访人员：${party.map(id=>base.characters.find(c=>c.id===id).name).join('、')}。路途省略，现在到荣府门外。没有改变同行名单。来客尚未与门役交谈，不知道周瑞今日去向或后街路线。`;
 cards.scene.transition={parentStoryId:parent.id,arrivals:party,rule:'依已确认的出行承诺完成场间路途，不新增同行者、礼物、接见或援助。门役不知来客家中商议。'};
 const stage=await read(root,'gate-stage'),roster=await read(root,'gate-characters');
 const slots=['street_arrival','companion_one','companion_two','companion_three','companion_four'];
 const initial={camera:'wide',lighting:'day',actors:Object.fromEntries(cast.map(id=>[id,{anchor:id==='gatekeeper'?'gatekeeper_reply':id==='old_servant'?'old_servant_reply':slots[party.indexOf(id)],expression:'neutral',facing:'front',visible:true}]))};
 return {rawCards:cards,stage,characters:roster.filter(c=>cast.includes(c.id)),seed:{initial},storyline:line,audioLibrary:audio,nodeId:'gate-access',previousMemory:memory,parent};
}
