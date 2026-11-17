import {readData as read,readLatest,lineageCurrent} from './common.mjs';
import {acceptedMemory} from '../story-memory.mjs';
import {compileStory,stateAt} from '../../src/engine.js';
export default async function loadHomecoming(root,base,line,audioLibrary){
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
