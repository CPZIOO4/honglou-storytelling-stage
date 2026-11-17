import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {acceptedMemory} from './story-memory.mjs';
const read=async(root,name)=>JSON.parse(await readFile(join(root,'data',name+'.json'),'utf8'));
export const productionParents={home:null,gate:'home',backstreet:'gate',zhouhome:'backstreet',waiting:'zhouhome'};
const publishedFiles={home:'deepseek-first-scene',gate:'deepseek-second-scene',backstreet:'deepseek-third-scene',zhouhome:'deepseek-fourth-scene',waiting:'deepseek-fifth-scene'};
export function latestPath(root,scene='home'){
 if(!Object.hasOwn(productionParents,scene))throw Error('未知演出场景');
 return join(root,'.runtime',scene==='home'?'latest-story.json':`latest-${scene}.json`);
}
export async function readLatest(root,scene='home'){
 const path=latestPath(root,scene);
 try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 try{await readFile(join(root,'.runtime/withheld-'+scene+'.json'));return null;}catch(e){if(e.code!=='ENOENT')throw e;}
 try{return await read(root,publishedFiles[scene]);}catch(e){if(e.code==='ENOENT')return null;throw e;}
}
export async function lineageCurrent(root,scene,story){
 latestPath(root,scene);if(!story)return false;const key=productionParents[scene];if(!key)return true;
 const parent=await readLatest(root,key);return !!parent&&story.carryover?.parentStoryId===parent.id&&await lineageCurrent(root,key,parent);
}
export async function loadProduction(root,scene='home'){
 latestPath(root,scene);
 const [base,line,audio]=await Promise.all(['cards','storyline','audio-library'].map(n=>read(root,n)));
 if(scene==='home')return {rawCards:base,stage:await read(root,'stage'),characters:await read(root,'characters'),seed:await read(root,'scene-one'),storyline:line,audioLibrary:audio,nodeId:line.entryNode,previousMemory:null,parent:null};
 if(scene==='backstreet')return loadBackstreet(root,base,line,audio);
 if(scene==='zhouhome')return loadZhouHome(root,base,line,audio);
 if(scene==='waiting')return loadWaiting(root,base,line,audio);
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
async function loadWaiting(root,base,line,audioLibrary){
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
async function loadZhouHome(root,base,line,audioLibrary){
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
async function loadBackstreet(root,base,line,audioLibrary){
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
