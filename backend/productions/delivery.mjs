import {readData as read,readLatest,lineageCurrent} from './common.mjs';
import {acceptedMemory} from '../story-memory.mjs';
import {compileStory,stateAt} from '../../src/engine.js';
export default async function loadDelivery(root,base,line,audioLibrary){
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
