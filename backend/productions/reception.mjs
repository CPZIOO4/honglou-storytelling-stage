import {readData as read,readLatest,lineageCurrent} from './common.mjs';
import {acceptedMemory} from '../story-memory.mjs';
import {compileStory,stateAt} from '../../src/engine.js';
export default async function loadReception(root,base,line,audioLibrary){
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
