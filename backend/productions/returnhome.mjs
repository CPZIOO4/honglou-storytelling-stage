import {readData as read,readLatest,lineageCurrent} from './common.mjs';
import {acceptedMemory} from '../story-memory.mjs';
import {compileStory,stateAt} from '../../src/engine.js';
export default async function loadReturnHome(root,base,line,audioLibrary){
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
