import {readData as read,readLatest,lineageCurrent} from './common.mjs';
import {acceptedMemory} from '../story-memory.mjs';
import {compileStory,stateAt} from '../../src/engine.js';
export default async function loadWaiting(root,base,line,audioLibrary){
 const parent=await readLatest(root,'zhouhome');if(!parent||!await lineageCurrent(root,'zhouhome',parent))throw Error('第四场缺失或所属分支已变更');
 const previousMemory=await acceptedMemory(root,parent.id);if(!previousMemory)throw Error('请先播放完成并确认第四场，第五场才可继承');
 const handoff=parent.narrative?.handoff;if(handoff?.decision?.status!=='depart'||handoff.nextNodeId!=='audience-window')throw Error('第四场没有决定前往通报候见节点，不能强行进入第五场');
 const upcoming=await read(root,'upcoming-cards'),roster=await read(root,'waiting-characters'),cards=await read(root,'waiting-cards');
 const party=handoff.decision.party;if(!Array.isArray(party)||!party.length||new Set(party).size!==party.length||party.length>6||party.includes('ping_er')||party.some(id=>!roster.some(c=>c.id===id)))throw Error('第四场即时行动名单无效');
 const scope=parent.generation?.handoffScopeReview?.explanations||[];
 if(scope.some(e=>party.includes(e.actor)&&e.scope!=='立即行动'))throw Error('上场等候者或条件性随后者不能加入当前即时名单');
 const cast=[...party,'ping_er'];cards.scene.dramaturgy.protagonist=party.includes('zhou_wife')?'zhou_wife':party[0];
 cards.characters=[...base.characters,...upcoming.characters].filter(c=>cast.includes(c.id)).map(c=>{
  const {sceneRole,performance,knowledge,knownFactIds,...stable}=structuredClone(c);
  return {...stable,performance:{...performance,atHome:undefined,agency:undefined},sceneRole:c.id==='ping_er'?'听清来客是谁、有什么事、现在在哪里，然后在接待权限内决定如何传话或候见；不预知来客经历，不替奶奶决定资助。':c.id==='zhou_wife'?'依第四场承诺主动找到平儿，如实转述刘姥姥身份、难处与所求，争取实际安排；若需回去接人，要先说定再动身，不能把留屋的刘姥姥当作就在身旁。':c.sceneRoles?.['audience-window']||'依上场实际行动安排参与，不替未在场的人作决定。',unknownAtStart:c.id==='ping_er'?['本次来客的身份、来意、所在位置与此前交谈，须听来人说明','王熙凤对这次请求的最终答复']:['平儿将如何安排这次传话与候见','王熙凤是否接见及资助结果'],experiencedMemory:previousMemory.characters[c.id]||'本轮首次出现，尚未听到本次来客消息。'};
 });
 const inherited=(parent.cardsSnapshot?.relationshipFacts||[]).map(f=>({...f,knownBy:f.knownBy.filter(id=>party.includes(id))})).filter(f=>f.knownBy.length);
 const currentFacts=handoff.facts.map((f,i)=>({id:'previous_reception_fact_'+i,claim:f.text,knownBy:f.knownBy.filter(id=>party.includes(id)),scope:'只属于上场实际听见的人。待取得许可再领人的承诺尚未兑现，不据此认定来客已经在倒厅。'})).filter(f=>f.knownBy.length);
 const localFacts=[{id:'ping_reception_authority',claim:'平儿是王熙凤身边处理接待事务的心腹丫鬟；能安排来人等候、询问轻重缓急和传话，不能替王熙凤决定是否给钱米。',knownBy:['ping_er',...(party.includes('zhou_wife')?['zhou_wife']:[])],scope:'身份与本职权限，不等于已经答应本次请求。'},{id:'waiting_initial_order',claim:'当前倒厅与院门外可短暂交谈。本场开始时，平儿尚未接到关于这次来客的召见或资助答复。',knownBy:['ping_er'],scope:'本轮环境初态；不凭空添加奶奶吃饭、午睡或已派丫鬟回报的具体消息。'}];
 cards.relationshipFacts=[...inherited,...currentFacts,...localFacts,...(party.includes('zhou_wife')?[{id:'zhou_knows_old_affiliation',claim:'周瑞妻子知道刘姥姥是狗儿家来的旧识，狗儿祖上与金陵王家曾经联宗，王夫人属于这门王家。不是刘姥姥本人与周瑞家有血亲，也不是王夫人已经答应本次求助。',knownBy:['zhou_wife'],scope:'第六回周瑞妻子把来客按太太的旧亲接待；结合本书联宗关系校订。平儿须实际听到转述才知此联系。',source:'《红楼梦》第六回接待与人物关系'}]:[])];
 for(const c of cards.characters){c.knownFactIds=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.id);c.knowledge=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.claim);}
 const waitingGranny=!party.includes('granny')&&scope.some(e=>e.actor==='granny'&&e.scope==='原地等候');
 cards.scene.initialSituation=`${party.map(id=>roster.find(c=>c.id===id).name).join('、')}按第四场已确认安排，来到倒厅旁的院门外，目的是${handoff.decision.purpose}。${waitingGranny?'刘姥姥仍在周瑞妻子住处等候，没有跟来。':'未在此名单中的人不自动来到现场。'}平儿在院门外廊边，尚未与来人交谈，也尚不知道本次来客是谁、求什么；当前没有凤姐对这次请求的答复。`;
 const slots=['arrival','companion_one','companion_two','companion_three','companion_four','companion_five'];
 const initial={camera:'family',lighting:'day',actors:Object.fromEntries(cast.map(id=>[id,{anchor:id==='ping_er'?'ping_home':slots[party.indexOf(id)],expression:'neutral',facing:'front',visible:true}]))};
 return {rawCards:cards,stage:await read(root,'waiting-stage'),characters:roster.filter(c=>cast.includes(c.id)),seed:{initial},storyline:line,audioLibrary,nodeId:'audience-window',previousMemory,parent};
}
