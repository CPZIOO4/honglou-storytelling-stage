import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {acceptedMemory} from './story-memory.mjs';
import {compileStory,stateAt} from '../src/engine.js';
const read=async(root,name)=>JSON.parse(await readFile(join(root,'data',name+'.json'),'utf8'));
export const productionParents={home:null,gate:'home',backstreet:'gate',zhouhome:'backstreet',waiting:'zhouhome',returnhome:'waiting',reception:'returnhome',report:'reception',invite:'report',audience:'invite',arrange:'audience',delivery:'arrange',homecoming:'delivery'};
const publishedFiles={home:'deepseek-first-scene',gate:'deepseek-second-scene',backstreet:'deepseek-third-scene',zhouhome:'deepseek-fourth-scene',waiting:'deepseek-fifth-scene',returnhome:'deepseek-sixth-scene',reception:'deepseek-seventh-scene',report:'deepseek-eighth-scene',invite:'deepseek-ninth-scene',audience:'deepseek-tenth-scene',arrange:'deepseek-eleventh-scene',delivery:'deepseek-twelfth-scene',homecoming:'deepseek-thirteenth-scene'};
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
 if(scene==='returnhome')return loadReturnHome(root,base,line,audio);
 if(scene==='reception')return loadReception(root,base,line,audio);
 if(scene==='report')return loadReport(root,base,line,audio);
 if(scene==='invite')return loadInvite(root,base,line,audio);
 if(scene==='audience')return loadAudience(root,base,line,audio);
 if(scene==='arrange')return loadArrange(root,base,line,audio);
 if(scene==='delivery')return loadDelivery(root,base,line,audio);
 if(scene==='homecoming')return loadHomecoming(root,base,line,audio);
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
async function loadHomecoming(root,base,line,audioLibrary){
 const parent=await readLatest(root,'delivery');if(!parent||!await lineageCurrent(root,'delivery',parent))throw Error('第十二场缺失或所属分支已变更');
 const previousMemory=await acceptedMemory(root,parent.id);if(!previousMemory)throw Error('请先播放完成并确认第十二场，第十三场才可继承');
 const handoff=parent.narrative?.handoff;
 if(handoff?.decision?.status!=='depart'||handoff.nextNodeId!=='household-decision'||JSON.stringify(handoff.decision.party)!==JSON.stringify(['granny']))throw Error('第十二场没有形成刘姥姥独自返家的安排');
 const oldStage=await read(root,'delivery-stage'),oldRoster=await read(root,'waiting-characters'),old=compileStory(parent,oldStage,oldRoster.filter(c=>parent.castIds.includes(c.id))),end=stateAt(old,old.duration);
 if(end.props?.rice?.owner!=='granny'||end.props?.coins?.owner!=='granny')throw Error('米钱未实际归刘姥姥，不能在返家时凭空补齐');
 const cards=await read(root,'homecoming-cards'),stage=await read(root,'homecoming-stage'),roster=await read(root,'characters'),first=await readLatest(root,'home');
 const roles={granny:'按约独自返家，亲自说清得到什么及主要来由，有松快、体贴和乡间老练。可接住家人关心，交给家人安排眼前日用，不讲一大段功劳、不数落女婿证明自己正确。没有带糕，若孩子问就诚实温和回应，不用大道理压孩子，也不假称已买、藏起来或下场自动有糕。',gouer:'原先焦躁、爱面子，仍是想撑起一家却缺少门路的乡下人。现在先看到岳母回来，听她实际说才知结果，可关心她一路是否受累、接手眼前家用，不预知府内关系和数目。可以露出惊讶、羞赧或松口气，不必强行跪谢、自我批斗，也不要仍无端迁怒或突然成了说教的贤人。',liushi:'先在意母亲回来是否平安，再问带回什么、如何安排家用。温和务实，可接手米粮，但没有交接动作就不说已经抱走、入锅或饭已熟。不重复劝母亲再走一趟。',baner:'盼姥姥回来和她答应的糕，只关注眼前具体东西、吃食和亲近的人。可以问糕或看见的袋子，最多一两句短话，不替成人总结人情、辛劳和经济账。若没有问也不强行制造孩子台词。',qinger:'年幼，留在家人旁边，以现有表情和朝向反应，不承担对白或提纲总结。'};
 cards.characters=base.characters.map(c=>{const {sceneRole,performance,knowledge,knownFactIds,...stable}=structuredClone(c);return {...stable,performance:{...performance,atHome:undefined,agency:undefined},sceneRole:roles[c.id],unknownAtStart:c.id==='granny'?['离家期间家人未告诉自己的新事情']:['刘姥姥在荣府见了谁、谁如何帮助、米钱来由及具体过程，须听本人转述','米钱数目与是否足够整个冬天，尚不能据袋子推知'],experiencedMemory:previousMemory.characters[c.id]||'年幼，未经历府内交谈。'};});
 const carry=(facts,prefix,ids)=>facts.map(f=>({...f,id:prefix+f.id,knownBy:f.knownBy.filter(id=>ids.includes(id))})).filter(f=>f.knownBy.length);
 const heard=(facts,prefix,ids)=>facts.map((f,i)=>({id:prefix+i,claim:f.text,knownBy:f.knownBy.filter(id=>ids.includes(id)),scope:'仅此前本人实际听到；不把府内经历分发给家里人。'})).filter(f=>f.knownBy.length);
 const family=['gouer','liushi','baner','qinger'];
 cards.relationshipFacts=[...carry(parent.cardsSnapshot.relationshipFacts||[],'granny_prior_',['granny']),...heard(handoff.facts,'granny_return_',['granny']),...carry(first.cardsSnapshot?.relationshipFacts||base.relationshipFacts||[],'family_prior_',family),...heard(first.narrative.handoff.facts,'family_heard_',family),{id:'actual_rice_money',claim:'刘姥姥已经在廊下从平儿手里实际接到米袋和钱袋，并带回来。数量未具体化，没有新借贷或附加条件，也尚未买糕。',knownBy:['granny'],scope:'归属来自第十二场实际transfer终点；家人需听她说明来由。'}];
 for(const c of cards.characters){c.knownFactIds=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.id);c.knowledge=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.claim);}
 cards.scene.initialSituation='按第十二场已说定的送行与返家安排，省略周瑞妻子送到后门、在后门分手、刘姥姥自行走回村里的路程。刘姥姥已进狗儿家屋门内，米袋和钱袋仍由她持有，尚未交给家人；途中未购物或花钱。狗儿先前送到村口后便返家，现与刘氏、板儿、青儿在屋里，尚未问答。家里人只看见她和带回的东西，不知道荣府经历。周瑞妻子和平儿没有跟来，也不知本场谈话。';
 const initial={camera:'family',lighting:'day',propOwners:{rice:end.props.rice.owner,coins:end.props.coins.owner},actors:{granny:{anchor:'door_inside',expression:'neutral',facing:'front',visible:true},gouer:{anchor:'gouer_home',expression:'neutral',facing:'front',visible:true},liushi:{anchor:'liushi_home',expression:'neutral',facing:'front',visible:true},baner:{anchor:'baner_home',expression:'neutral',facing:'front',visible:true},qinger:{anchor:'qinger_home',expression:'neutral',facing:'front',visible:true}}};
 return {rawCards:cards,stage,characters:roster,seed:{initial},storyline:line,audioLibrary,nodeId:'household-return',previousMemory,parent};
}
async function loadDelivery(root,base,line,audioLibrary){
 const parent=await readLatest(root,'arrange');if(!parent||!await lineageCurrent(root,'arrange',parent))throw Error('第十一场缺失或所属分支已变更');
 const previousMemory=await acceptedMemory(root,parent.id);if(!previousMemory)throw Error('请先播放完成并确认第十一场，第十二场才可继承');
 const handoff=parent.narrative?.handoff;
 if(handoff?.decision?.status!=='depart'||handoff.nextNodeId!=='aid-fulfillment'||JSON.stringify(handoff.decision.party)!==JSON.stringify(['ping_er'])||!(/米/.test(handoff.decision.purpose)&&/钱/.test(handoff.decision.purpose)))throw Error('第十一场没有形成平儿独自备米取钱送回的安排');
 const oldStage=await read(root,'arrange-stage'),roster=await read(root,'waiting-characters'),old=compileStory(parent,oldStage,roster.filter(c=>parent.castIds.includes(c.id))),end=stateAt(old,old.duration);
 const cast=['granny','zhou_wife','ping_er'],cards=await read(root,'delivery-cards'),stage=await read(root,'delivery-stage'),upcoming=await read(root,'upcoming-cards');
 for(const id of ['granny','zhou_wife'])if(!end.actors[id]?.visible||!oldStage.anchors[end.actors[id].anchor]||handoff.decision.party.includes(id))throw Error('廊下留候者记录无效');
 const roles={granny:'已亲自争取到帮助，现在看到平儿带物回来。接住对方交代，实际收下后才说收妥；有松快与自尊，感谢落在具体回应中，不反复自贬、空许报恩或代家人承诺。之后若告辞，和周嫂子商量眼下实际去哪，不默认她一路送到村里。',zhou_wife:'一直在廊下陪候，已听到米钱安排，现在看见平儿回来。自然接话或协助告辞，不知道内院具体办理细节，也不复述见凤姐经过、训规矩或邀功。是否同行及同行到哪里由本场应答决定。',ping_er:'已经按凤姐和自己应承的安排，入内传达、待米钱备妥并携回廊下。将现有米袋与钱袋交给刘姥姥，交代清楚而不训诫，不再去问许可、不改成借贷或新要求。数量仍只说些米和几串钱，不擅填斤两串数；办理没有额外波折或太太新口信。'};
 cards.characters=[...base.characters,...upcoming.characters].filter(c=>cast.includes(c.id)).map(c=>{const {sceneRole,performance,knowledge,knownFactIds,...stable}=structuredClone(c);return {...stable,performance:{...performance,atHome:undefined,agency:undefined},sceneRole:roles[c.id],unknownAtStart:c.id==='ping_er'?['离开期间两位留候者未向自己说的事情','来客将怎样接物和告辞']:['平儿内院办理时的具体过程，旁白不是本人听闻','家里当下的新事、王夫人是否知晓或答复'],experiencedMemory:previousMemory.characters[c.id]};});
 cards.relationshipFacts=[...(parent.cardsSnapshot.relationshipFacts||[]).map(f=>({...f,id:'prior_'+f.id})),...handoff.facts.map((f,i)=>({id:'heard_'+i,claim:f.text,knownBy:f.knownBy,scope:'上场结束时的计划；平儿已经通过本场明确过场完成例行准备并携回，但还没交到来客手里。'})),{id:'routine_preparation',claim:'平儿照已有吩咐入内传达，待米和钱备妥后携回；没有新条件、新许可或王夫人回信。米袋和钱袋尚由平儿持有，未交给刘姥姥。',knownBy:['ping_er'],scope:'本场明确省略的例行办理，由开场旁白向观众交代；未替来客作收物决定。'}];
 for(const c of cards.characters){c.knownFactIds=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.id);c.knowledge=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.claim);}
 cards.scene.initialSituation='这一场以短过场省略已说定的例行办理：平儿入内传下量米取钱的吩咐，待物备妥，携米袋和钱袋回到廊下。没有额外条件、太太口信或插曲，数量不具体化。她在交接位持有两件物品，刘姥姥和周瑞妻子仍在第十一场的候办站位，三人还未开口；刘姥姥尚未接到米钱，家人也未收到。两位留候者只看见平儿携物回来，不自动知道内院过程。';
 cards.scene.routineElision={kind:'fulfill-established-errand',sourceStoryId:parent.id,actor:'ping_er',evidenceRefs:handoff.decision.evidenceRefs,steps:['传达既有备米取钱吩咐','例行备妥，不具体化数量','携物返回廊下'],notCompleted:['向来客交付','送回家']};
 const initial={camera:'gate',lighting:'day',propOwners:{rice:'ping_er',coins:'ping_er'},actors:{granny:{...end.actors.granny,anchor:end.actors.granny.anchor},zhou_wife:{...end.actors.zhou_wife,anchor:end.actors.zhou_wife.anchor},ping_er:{anchor:'delivery_giver',expression:'neutral',facing:'front',visible:true}}};
 for(const id of ['granny','zhou_wife'])initial.actors[id]={anchor:end.actors[id].anchor,expression:end.actors[id].expression,facing:'front',visible:true};
 return {rawCards:cards,stage,characters:roster.filter(c=>cast.includes(c.id)),seed:{initial},storyline:line,audioLibrary,nodeId:'aid-fulfillment',previousMemory,parent};
}
async function loadArrange(root,base,line,audioLibrary){
 const parent=await readLatest(root,'audience');if(!parent||!await lineageCurrent(root,'audience',parent))throw Error('第十场缺失或所属分支已变更');
 const previousMemory=await acceptedMemory(root,parent.id);if(!previousMemory)throw Error('请先播放完成并确认第十场，第十一场才可继承');
 const handoff=parent.narrative?.handoff,party=handoff?.decision?.party;
 if(handoff?.decision?.status!=='depart'||handoff.nextNodeId!=='audience-window'||!Array.isArray(party)||party.length!==2||new Set(party).size!==2||!party.includes('granny')||!party.includes('ping_er'))throw Error('第十场未形成平儿与刘姥姥回廊下的安排');
 const ninth=await readLatest(root,'invite'),oldStage=await read(root,'invite-stage'),roster=await read(root,'waiting-characters');
 const old=compileStory(ninth,oldStage,roster.filter(c=>ninth.castIds.includes(c.id))),resident=stateAt(old,old.duration).actors.zhou_wife;
 if(!resident?.visible||!oldStage.anchors[resident.anchor]||ninth.narrative.handoff.decision.party.includes('zhou_wife'))throw Error('周瑞妻子留候记录无效');
 const cards=await read(root,'arrange-cards'),stage=await read(root,'arrange-stage'),upcoming=await read(root,'upcoming-cards'),cast=['granny','zhou_wife','ping_er'];
 const roles={granny:'亲自求助已经得到安排，刚随平儿回廊下。以松一口气后的乡间老练和亲切回应周嫂子，可说明自己怎么接住这份帮助，有尊严地道谢；不重新求一遍、不反复不敢包、不替家里许下劳作或还钱的新承诺。米钱未拿到，不说已装好或已送回家。',zhou_wife:'仍在廊下等刘姥姥出来。本次正房答复必须听她或平儿实际说出才知晓。关心结果，回应实际消息，可按情分提出具体帮助；不重复自我介绍、领见许可和站姿礼数，不拿帮忙邀功或无故训诫。',ping_er:'已经接到奶奶的备米取钱吩咐，先把姥姥带回廊下，现在落实办理。简明说明下一步，由实际交谈明确谁候着、谁去办，随后才行动；不再次回正房请求同一个许可，不把还没传出的吩咐写成管事已经备齐，不擅改主人的帮助为借贷、劳役或额外担保。'};
 cards.characters=[...base.characters,...upcoming.characters].filter(c=>cast.includes(c.id)).map(c=>{const {sceneRole,performance,knowledge,knownFactIds,...stable}=structuredClone(c);return {...stable,performance:{...performance,atHome:undefined,agency:undefined},sceneRole:roles[c.id],unknownAtStart:c.id==='zhou_wife'?['第十场正房中如何交谈、凤姐是否及怎样答应，须听本场转述','米钱是否备妥、何时实际送来，尚未发生']:['离开廊下期间周瑞妻子未向自己说过的事情','米钱是否已量好取出、具体数目及交付结果，尚未发生'],experiencedMemory:previousMemory.characters[c.id]};});
 const carry=(facts,prefix,ids)=>facts.map(f=>({...f,id:prefix+f.id,knownBy:f.knownBy.filter(id=>ids.includes(id))})).filter(f=>f.knownBy.length);
 const heard=(facts,prefix,ids)=>facts.map((f,i)=>({id:prefix+i,claim:f.text,knownBy:f.knownBy.filter(id=>ids.includes(id)),scope:'仅本人实际听闻；口头吩咐尚待办理，不等于实物已到手。'})).filter(f=>f.knownBy.length);
 cards.relationshipFacts=[...carry(parent.cardsSnapshot.relationshipFacts||[],'returning_',party),...heard(handoff.facts,'audience_result_',party),...carry(ninth.cardsSnapshot.relationshipFacts||[],'waiting_prior_',['zhou_wife']),...heard(ninth.narrative.handoff.facts,'waiting_heard_',['zhou_wife'])];
 for(const c of cards.characters){c.knownFactIds=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.id);c.knowledge=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.claim);}
 cards.scene.initialSituation='接第十场已经应允的安排，平儿带刘姥姥从正房门外走完回廊下的路。周瑞妻子仍在第九场结束的原站位；两人回到她旁边，尚未向她说正房结果。凤姐留在正房，不在本场。只有返回路途已完成，米未量、钱未取、吩咐尚未传给经办者，没有新增丫鬟、回禀或交付。';
 const initial={camera:'gate',lighting:'day',actors:{granny:{anchor:'hall_wait',expression:'neutral',facing:'front',visible:true},zhou_wife:{anchor:resident.anchor,expression:resident.expression||'neutral',facing:'front',visible:true},ping_er:{anchor:'ping_home',expression:'neutral',facing:'front',visible:true}}};
 return {rawCards:cards,stage,characters:roster.filter(c=>cast.includes(c.id)),seed:{initial},storyline:line,audioLibrary,nodeId:'audience-window',previousMemory,parent};
}
async function loadAudience(root,base,line,audioLibrary){
 const parent=await readLatest(root,'invite');if(!parent||!await lineageCurrent(root,'invite',parent))throw Error('第九场缺失或所属分支已变更');
 const previousMemory=await acceptedMemory(root,parent.id);if(!previousMemory)throw Error('请先播放完成并确认第九场，第十场才可继承');
 const handoff=parent.narrative?.handoff,party=handoff?.decision?.party;
 if(handoff?.decision?.status!=='depart'||handoff.nextNodeId!=='make-case'||!Array.isArray(party)||party.length!==2||new Set(party).size!==2||!party.includes('granny')||!party.includes('ping_er'))throw Error('第九场未形成平儿与刘姥姥同行的安排，不能把留候者带进正房');
 const eighth=await readLatest(root,'report'),oldStage=await read(root,'report-stage'),roster=await read(root,'report-characters');
 const old=compileStory(eighth,oldStage,roster.filter(c=>eighth.castIds.includes(c.id))),host=stateAt(old,old.duration).actors.fengjie;
 if(!host?.visible||!oldStage.anchors[host.anchor]||eighth.narrative.handoff.decision.party.includes('fengjie'))throw Error('凤姐留在正房的记录无效');
 const cards=await read(root,'audience-cards'),stage=await read(root,'audience-stage'),upcoming=await read(root,'upcoming-cards'),cast=['granny','ping_er','fengjie'];
 const roles={granny:'已主动来求周济、听到邀请并随平儿入内，现在亲自面对主事者。有礼而不卑怯，局促可以有，却不反复自贬免责。用自己的话说清当下实际难处与所求，接住凤姐问题；亲切、自嘲和老练应落在具体回应里，不替人物卡背标签。',ping_er:'已将来客带到，知道前几次自己亲耳听到的消息。可简短引见，必要时答所问，不替刘姥姥包办每句回应。接到吩咐可应承安排，但不能把米银说成已备齐、已经递到来客手中。',fengjie:'已听平儿回明身份、关系与米粮所求，也已经决定接见；本场首次见本人，不重演完全不知谁来的盘问。用必要追问和实际决定掌握场面，既顾体面也有自己的判断，不句句挖苦或纯粹宣讲善心。不强制二十两或先问太太；若需要查问、安排或给付，要在本场说清而非假定已办。'};
 cards.characters=[...base.characters,...upcoming.characters].filter(c=>cast.includes(c.id)).map(c=>{const {sceneRole,performance,knowledge,knownFactIds,...stable}=structuredClone(c);return {...stable,performance:{...performance,atHome:undefined,agency:undefined},sceneRole:roles[c.id],unknownAtStart:c.id==='fengjie'?['廊下第九场具体交谈与刘姥姥、周瑞妻子的私下约定，尚未向自己转述','刘姥姥本人这次将怎样陈说和回应']:c.id==='granny'?['凤姐与平儿第八场没有向自己转达的私下回话，包括太太是否问过','凤姐这次会如何处置，接见不等于已答应周济']:['主客当面交谈后形成的新决定','未亲见或未听见的场外消息'],experiencedMemory:previousMemory.characters[c.id]};});
 const carry=(facts,prefix,ids)=>facts.map(f=>({...f,id:prefix+f.id,knownBy:f.knownBy.filter(id=>ids.includes(id))})).filter(f=>f.knownBy.length);
 const heard=(facts,prefix,ids)=>facts.map((f,i)=>({id:prefix+i,claim:f.text,knownBy:f.knownBy.filter(id=>ids.includes(id)),scope:'此前实际听闻；未向另一方传达的事情不自动共享，未兑现的承诺保持未兑现。'})).filter(f=>f.knownBy.length);
 cards.relationshipFacts=[...carry(parent.cardsSnapshot.relationshipFacts||[],'arriving_',party),...heard(handoff.facts,'arrival_heard_',party),...carry(eighth.cardsSnapshot.relationshipFacts||[],'host_prior_',['fengjie']),...heard(eighth.narrative.handoff.facts,'host_heard_',['fengjie']),{id:'current_household_members',claim:'当前同住的一家共五人：狗儿、刘氏、板儿、青儿和刘姥姥。没有已设定的第六位同住家人。',knownBy:['granny'],scope:'第六回先写狗儿夫妇和两个孩子一家四口，再接岳母同住；与本项目初始家庭卡一致。凤姐和平儿须听实际回答才得知人数。',source:'https://zh.wikisource.org/zh-hans/紅樓夢/第006回'}];
 for(const c of cards.characters){c.knownFactIds=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.id);c.knowledge=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.claim);}
 cards.scene.initialSituation='按第九场实际应允和引路，平儿已带刘姥姥走完余下路途，来到王熙凤正房堂屋。刘姥姥在来客答话空地，平儿在侍立位，凤姐仍在第八场结束的会客炕前空地。三人尚未开始当面交谈，没有礼物、茶水或钱米交接。周瑞妻子仍在廊下等刘姥姥出来，没有跟进；凤姐不知道廊下两人出来再一道走的约定。';
 const initial={camera:'family',lighting:'day',actors:{granny:{anchor:'guest_reply',expression:'neutral',facing:'front',visible:true},ping_er:{anchor:'attendant',expression:'neutral',facing:'front',visible:true},fengjie:{anchor:host.anchor,expression:host.expression||'neutral',facing:'front',visible:true}}};
 return {rawCards:cards,stage,characters:roster.filter(c=>cast.includes(c.id)),seed:{initial},storyline:line,audioLibrary,nodeId:'make-case',previousMemory,parent};
}
async function loadInvite(root,base,line,audioLibrary){
 const parent=await readLatest(root,'report');if(!parent||!await lineageCurrent(root,'report',parent))throw Error('第八场缺失或所属分支已变更');
 const previousMemory=await acceptedMemory(root,parent.id);if(!previousMemory)throw Error('请先播放完成并确认第八场，第九场才可继承');
 const handoff=parent.narrative?.handoff;
 if(handoff?.decision?.status!=='depart'||handoff.nextNodeId!=='audience-window'||JSON.stringify(handoff.decision.party)!==JSON.stringify(['ping_er']))throw Error('第八场未形成平儿独自回廊下传话的安排');
 const seventh=await readLatest(root,'reception'),oldStage=await read(root,'reception-stage'),roster=await read(root,'waiting-characters');
 const old=compileStory(seventh,oldStage,roster.filter(c=>seventh.castIds.includes(c.id))),end=stateAt(old,old.duration);
 for(const id of ['granny','zhou_wife'])if(!end.actors[id]?.visible||!oldStage.anchors[end.actors[id].anchor]||seventh.narrative.handoff.decision.party.includes(id))throw Error('第七场留候者记录无效，不能强行回到廊下');
 const cards=await read(root,'invite-cards'),stage=await read(root,'invite-stage'),upcoming=await read(root,'upcoming-cards'),cast=['granny','zhou_wife','ping_er'];
 const roles={granny:'已在此候见，并不知正房刚才的答复。听平儿如实传话后，主动、自然地回应是否跟去；有乡间老练和自尊，可亲切向周嫂子告一声，不只反复谢恩、不重复免责或求助背景。',zhou_wife:'仍在原处陪刘姥姥等信，听到本次安排后自然回应自己在此候着或另有何事；不预知正房交谈，不把平儿只领一人的安排说成凤姐下令禁止自己进去，不制造无由争执。',ping_er:'按第八场实际吩咐传达凤姐请刘姥姥相见、米粮当面问。自己曾表示只领刘姥姥一人，安排时以自己的口吻说明，不冒称凤姐另下不准周嫂子入内的命令。得到来客回应后带路；不把接见许可说成已答应资助。'};
 cards.characters=[...base.characters,...upcoming.characters].filter(c=>cast.includes(c.id)).map(c=>{const {sceneRole,performance,knowledge,knownFactIds,...stable}=structuredClone(c);return {...stable,performance:{...performance,atHome:undefined,agency:undefined},sceneRole:roles[c.id],unknownAtStart:c.id==='ping_er'?['离开廊下后两位候见者的私人交谈，未发生的新场外消息','本次传话之后来客的回应，仍须实际听见']:['凤姐刚才在正房的答复和平儿的具体应答，须听本场实际传达','是否获得米粮或其他资助，尚未决定'],experiencedMemory:previousMemory.characters[c.id]};});
 const carry=(facts,prefix,ids)=>facts.map(f=>({...f,id:prefix+f.id,knownBy:f.knownBy.filter(id=>ids.includes(id))})).filter(f=>f.knownBy.length);
 const heard=(facts,prefix,ids)=>facts.map((f,i)=>({id:prefix+i,claim:f.text,knownBy:f.knownBy.filter(id=>ids.includes(id)),scope:'此前本人实际听闻；只领一人是平儿自己的应答，不升级成凤姐另下禁令；未传达的许可不共享给等候者。'})).filter(f=>f.knownBy.length);
 cards.relationshipFacts=[...carry(seventh.cardsSnapshot.relationshipFacts||[],'waiting_prior_',['granny','zhou_wife']),...heard(seventh.narrative.handoff.facts,'waiting_heard_',['granny','zhou_wife']),...carry(parent.cardsSnapshot.relationshipFacts||[],'ping_prior_',['ping_er']),...heard(handoff.facts,'new_reply_',['ping_er'])];
 for(const c of cards.characters){c.knownFactIds=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.id);c.knowledge=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.claim);}
 cards.scene.initialSituation='平儿按第八场已确认的安排独自从正房回到倒厅旁院门外，尚未向留候的两人开口。刘姥姥和周瑞妻子仍在第七场结束时的候信位置，没有移动到正房，也未听见第八场交谈。场间只完成平儿返回的路途，不替来客接受邀请，不增加钱米、礼物或别的口信。王熙凤仍在正房，不在本场。';
 const initial={camera:'gate',lighting:'day',actors:{granny:{anchor:end.actors.granny.anchor,expression:end.actors.granny.expression||'neutral',facing:'front',visible:true},zhou_wife:{anchor:end.actors.zhou_wife.anchor,expression:end.actors.zhou_wife.expression||'neutral',facing:'front',visible:true},ping_er:{anchor:'gate_wait',expression:'neutral',facing:'front',visible:true}}};
 return {rawCards:cards,stage,characters:roster.filter(c=>cast.includes(c.id)),seed:{initial},storyline:line,audioLibrary,nodeId:'audience-window',previousMemory,parent};
}
async function loadReport(root,base,line,audioLibrary){
 const parent=await readLatest(root,'reception');if(!parent||!await lineageCurrent(root,'reception',parent))throw Error('第七场缺失或所属分支已变更');
 const previousMemory=await acceptedMemory(root,parent.id);if(!previousMemory)throw Error('请先播放完成并确认第七场，第八场才可继承');
 const handoff=parent.narrative?.handoff;
 if(handoff?.decision?.status!=='depart'||handoff.nextNodeId!=='make-case'||JSON.stringify(handoff.decision.party)!==JSON.stringify(['ping_er']))throw Error('第七场未形成平儿单独回话的安排，不能自动让候见者进入正房');
 const upcoming=await read(root,'upcoming-cards'),roster=await read(root,'report-characters'),cards=await read(root,'report-cards'),stage=await read(root,'report-stage'),cast=['ping_er','fengjie'];
 cards.characters=upcoming.characters.filter(c=>cast.includes(c.id)).map(c=>{
  const {sceneRole,performance,knowledge,knownFactIds,...stable}=structuredClone(c);
  return {...stable,performance:{...performance,atHome:undefined,agency:undefined},sceneRole:c.id==='ping_er'?'履行刚才回话的承诺。以亲耳听到的消息简明说明谁来、何种旧亲、所求和等候位置，注明周嫂子的转述与刘姥姥自己的话，不把旧亲说成太太已经认下或授意。接住奶奶问话，得到具体吩咐再退回传达，不提前替主人答应。':'本轮首次听这桩来访。先听平儿转述，用必要的问题判断事情，既有掌家的利落和体面，也保留对穷亲的客气；不句句挖苦、不一味训人、不宣读办事流程。可以作接见、查询、转达或婉拒等实际决定，结果由本场交谈形成，不固定原著银两。',unknownAtStart:c.id==='fengjie'?['此次来客是谁、与王家何种关系、来意及眼下在哪里，须听平儿回明','太太对这一次请求的实际态度，尚无人问过或传回消息','此前家中与门外的交谈及未传入的话']:['王熙凤对本次来访的实际回应','王夫人对本次请求的态度，未曾问过','刘姥姥和周瑞妻子留候期间的新交谈'],experiencedMemory:previousMemory.characters[c.id]||'本轮首次出现，尚未听到这次来访的情况。'};
 });
 cards.relationshipFacts=[...(parent.cardsSnapshot.relationshipFacts||[]).map(f=>({...f,id:'report_prior_'+f.id,knownBy:f.knownBy.filter(id=>id==='ping_er')})).filter(f=>f.knownBy.length),...handoff.facts.map((f,i)=>({id:'report_heard_'+i,claim:f.text,knownBy:f.knownBy.filter(id=>id==='ping_er'),scope:'平儿亲耳听到的消息；待回话不是已经回话，来客未准见。保留“奶奶若问”的语境，当前米粮所求不等于衣食难处已解决。'})).filter(f=>f.knownBy.length),...upcoming.relationshipFacts.filter(f=>['gate_zhou_role','fengjie_household_authority'].includes(f.id)).map(f=>({...f,id:'local_'+f.id,knownBy:f.knownBy.filter(id=>cast.includes(id))})),{id:'fengjie_own_family',claim:'王熙凤是贾琏之妻、王夫人的内侄女，府中可称琏二奶奶；平儿是身边办事的心腹丫鬟。',knownBy:cast,scope:'既有身份，不等于知道这次来客的亲缘、请求或已获得王夫人答复。'}];
 for(const c of cards.characters){c.knownFactIds=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.id);c.knowledge=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.claim);}
 cards.scene.initialSituation='接第七场实际安排，平儿独自从内院门前来到王熙凤正房的堂屋入口，尚未开口回话。王熙凤在会客炕前空地站着，本轮第一次出现，尚不知这次来客的详情。刘姥姥和周瑞妻子仍在倒厅旁廊下候信，不在本场也听不见正房交谈。场间只完成平儿来回话的路途，不增加掀帘、端茶、翻账、来客入内、主人答复或资助。';
 const initial={camera:'family',lighting:'day',actors:{ping_er:{anchor:'door_entry',expression:'neutral',facing:'front',visible:true},fengjie:{anchor:'host',expression:'neutral',facing:'front',visible:true}}};
 return {rawCards:cards,stage,characters:roster.filter(c=>cast.includes(c.id)),seed:{initial},storyline:line,audioLibrary,nodeId:'make-case',previousMemory,parent};
}
async function loadReception(root,base,line,audioLibrary){
 const parent=await readLatest(root,'returnhome');if(!parent||!await lineageCurrent(root,'returnhome',parent))throw Error('第六场缺失或所属分支已变更');
 const previousMemory=await acceptedMemory(root,parent.id);if(!previousMemory)throw Error('请先播放完成并确认第六场，第七场才可继承');
 const handoff=parent.narrative?.handoff;
 if(handoff?.decision?.status!=='depart'||handoff.nextNodeId!=='audience-window')throw Error('第六场没有前往候见的安排');
 const party=handoff.decision.party;
 if(!Array.isArray(party)||party.length!==2||new Set(party).size!==2||!party.includes('granny')||!party.includes('zhou_wife'))throw Error('此候见接续需第六场实际决定的刘姥姥与周瑞妻子同行，不增添其他人');
 const fifth=await readLatest(root,'waiting'),roster=await read(root,'waiting-characters'),oldStage=await read(root,'waiting-stage');
 const prior=compileStory(fifth,oldStage,roster.filter(c=>fifth.castIds.includes(c.id))),ping=stateAt(prior,prior.duration).actors.ping_er;
 if(!ping?.visible||!oldStage.anchors[ping.anchor]||!previousMemory.characters.ping_er)throw Error('平儿的既有位置或个人经历缺失，不能凭空重置');
 const cards=await read(root,'reception-cards'),stage=await read(root,'reception-stage'),upcoming=await read(root,'upcoming-cards'),cast=[...party,'ping_er'];
 cards.characters=[...base.characters,...upcoming.characters].filter(c=>cast.includes(c.id)).map(c=>{
  const {sceneRole,performance,knowledge,knownFactIds,...stable}=structuredClone(c);
  const roles={granny:'自己已主动求助并应下同行。首次见平儿时有礼但不卑怯，接住对方的话，说清眼下确有必要补充的具体意思；乡间老练与亲切体现在回应里，不背规矩、不反复谢恩，不把求助责任推给周嫂子。',zhou_wife:'已经把人领到，简短引见即可；平儿早已知来意，不再完整转述家计与旧亲。按第六场承诺为来客答必要的问题、照顾体面，不抢刘姥姥自己开口的机会。',ping_er:'已经从周瑞妻子听到来客身份、求助目的和候见安排，此刻首次见本人。自然招呼，必要时只问会影响传话的一项实事；关照中有分寸，爽利落实接待或开始去回话，不用反复禁令显身份，不替奶奶许钱米或接见。'};
  return {...stable,performance:{...performance,atHome:undefined,agency:undefined},sceneRole:roles[c.id],unknownAtStart:c.id==='ping_er'?['周瑞妻子回屋后与刘姥姥具体说了什么、她当时的原话与私下顾虑','王熙凤的实际答复，尚未回禀']:['平儿离开视线后做过什么，不能自行编造','王熙凤是否接见、怎样处置'],experiencedMemory:previousMemory.characters[c.id]};
 });
 const carry=(facts,prefix,allowed)=>facts.map(f=>({...f,id:prefix+f.id,knownBy:f.knownBy.filter(id=>allowed.includes(id))})).filter(f=>f.knownBy.length);
 const heard=(facts,prefix,allowed)=>facts.map((f,i)=>({id:prefix+i,claim:f.text,knownBy:f.knownBy.filter(id=>allowed.includes(id)),scope:'此前实际听闻；消息未向不在场的人自动同步，约定不等于已经完成。'})).filter(f=>f.knownBy.length);
 cards.relationshipFacts=[...carry(parent.cardsSnapshot.relationshipFacts||[],'arriver_',party),...heard(handoff.facts,'previous_home_',party),...carry(fifth.cardsSnapshot.relationshipFacts||[],'ping_prior_',['ping_er']),...heard(fifth.narrative.handoff.facts,'ping_heard_',['ping_er'])];
 for(const c of cards.characters){c.knownFactIds=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.id);c.knowledge=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.claim);}
 cards.scene.initialSituation='周瑞妻子按第六场已说定的同行安排，带刘姥姥走到倒厅旁院门外；只省略这段路途，两人刚到，尚未与平儿交谈。平儿仍在第五场结束的院门外答话位置，记得周瑞妻子先前转述的来意，但未听到她们回屋后的交谈。刘姥姥已听周嫂子转告可以候信，尚未与平儿本人说过话。平儿尚未向凤姐回禀，没有接见或资助答复。';
 const initial={camera:'family',lighting:'day',actors:{granny:{anchor:'arrival',expression:'neutral',facing:'front',visible:true},zhou_wife:{anchor:'relay',expression:'neutral',facing:'front',visible:true},ping_er:{anchor:ping.anchor,expression:ping.expression||'neutral',facing:'front',visible:true}}};
 return {rawCards:cards,stage,characters:roster.filter(c=>cast.includes(c.id)),seed:{initial},storyline:line,audioLibrary,nodeId:'audience-window',previousMemory,parent};
}
async function loadReturnHome(root,base,line,audioLibrary){
 const parent=await readLatest(root,'waiting');if(!parent||!await lineageCurrent(root,'waiting',parent))throw Error('第五场缺失或所属分支已变更');
 const previousMemory=await acceptedMemory(root,parent.id);if(!previousMemory)throw Error('请先播放完成并确认第五场，第六场才可继承');
 const handoff=parent.narrative?.handoff;
 if(handoff?.decision?.status!=='depart'||handoff.nextNodeId!=='intermediary'||JSON.stringify(handoff.decision.party)!==JSON.stringify(['zhou_wife']))throw Error('第五场未形成周瑞妻子独自返回住处的安排，不能强行接人');
 const fourth=await readLatest(root,'zhouhome');
 const grannyScope=fourth.generation?.handoffScopeReview?.explanations?.find(e=>e.actor==='granny');
 if(grannyScope?.scope!=='原地等候'||fourth.narrative.handoff.decision.party.includes('granny'))throw Error('第四场没有刘姥姥留在住处的有效记录');
 const roster=await read(root,'zhouhome-characters'),homeStage=await read(root,'zhouhome-stage');
 const old=compileStory(fourth,homeStage,roster.filter(c=>fourth.castIds.includes(c.id)));
 const resident=stateAt(old,old.duration).actors.granny;
 if(!resident?.visible||!homeStage.anchors[resident.anchor])throw Error('等候者的真实终点缺失');
 const cards=await read(root,'returnhome-cards'),stage=await read(root,'returnhome-stage'),upcoming=await read(root,'upcoming-cards');
 const cast=['granny','zhou_wife'];
 cards.characters=[...base.characters,...upcoming.characters].filter(c=>cast.includes(c.id)).map(c=>{
  const {sceneRole,performance,knowledge,knownFactIds,...stable}=structuredClone(c);
  return {...stable,performance:{...performance,atHome:undefined,agency:undefined},sceneRole:c.id==='granny'?'已主动出门求助，此刻听周嫂子带回的实际消息。接住对方的话，简短表达感激或实在的顾虑，自行回应是否跟去候见；可有乡间自嘲，不自贬成累赘、不反复免责、不重新讲家计。':'兑现回来传话的承诺，向刘姥姥如实说清平儿允许在哪里候见、愿意传话而奶奶尚未答复。语气熟络能干，照顾来客体面，不趁机训规矩；商量好才带路。',unknownAtStart:c.id==='granny'?['平儿在第五场说过什么，须听周瑞妻子这次转告才能知道','王熙凤是否接见或资助']:['刘姥姥对这次候见安排的回应','凤姐是否接见或资助，以及平儿离开视线后的行动'],experiencedMemory:previousMemory.characters[c.id]||'没有这次交谈的新经历。'};
 });
 const former=(fourth.cardsSnapshot.relationshipFacts||[]).map(f=>({...f,knownBy:f.knownBy.filter(id=>cast.includes(id))})).filter(f=>f.knownBy.length);
 const latest=(parent.cardsSnapshot.relationshipFacts||[]).map(f=>({...f,id:'relay_card_'+f.id,knownBy:f.knownBy.filter(id=>id==='zhou_wife')})).filter(f=>f.knownBy.length);
 const heard=handoff.facts.map((f,i)=>({id:'return_message_'+i,claim:f.text,knownBy:f.knownBy.filter(id=>id==='zhou_wife'),scope:'第五场亲耳听到的安排，仅周瑞妻子已知；刘姥姥须听本场转告，不代表平儿已经回禀或凤姐准见。'})).filter(f=>f.knownBy.length);
 cards.relationshipFacts=[...former,...latest,...heard];
 for(const c of cards.characters){c.knownFactIds=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.id);c.knowledge=cards.relationshipFacts.filter(f=>f.knownBy.includes(c.id)).map(f=>f.claim);}
 cards.scene.initialSituation=`承接第五场，周瑞妻子已独自从倒厅返回自己住处门边，尚未向刘姥姥说话。刘姥姥仍在第四场结束时的位置（${homeStage.anchorDescriptions[resident.anchor]}）等消息；她不知道平儿刚才的具体答复。场间仅完成周瑞妻子返回的路途，未替刘姥姥答应同行，未发生凤姐接见、平儿回禀或资助。`;
 const initial={camera:'room',lighting:'day',actors:{granny:{anchor:resident.anchor,expression:resident.expression||'neutral',facing:'front',visible:true},zhou_wife:{anchor:'host_door',expression:'neutral',facing:'front',visible:true}}};
 return {rawCards:cards,stage,characters:roster.filter(c=>cast.includes(c.id)),seed:{initial},storyline:line,audioLibrary,nodeId:'intermediary',previousMemory,parent};
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
