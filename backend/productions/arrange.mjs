import {readData as read,readLatest,lineageCurrent} from './common.mjs';
import {acceptedMemory} from '../story-memory.mjs';
import {compileStory,stateAt} from '../../src/engine.js';
export default async function loadArrange(root,base,line,audioLibrary){
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
