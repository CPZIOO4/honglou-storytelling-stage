import {readData as read,readLatest,lineageCurrent} from './common.mjs';
import {acceptedMemory} from '../story-memory.mjs';
import {compileStory,stateAt} from '../../src/engine.js';
export default async function loadAudience(root,base,line,audioLibrary){
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
