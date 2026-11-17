import {readData as read,readLatest,lineageCurrent} from './common.mjs';
import {acceptedMemory} from '../story-memory.mjs';
import {compileStory,stateAt} from '../../src/engine.js';
export default async function loadInvite(root,base,line,audioLibrary){
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
