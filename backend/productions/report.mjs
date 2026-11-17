import {readData as read,readLatest,lineageCurrent} from './common.mjs';
import {acceptedMemory} from '../story-memory.mjs';
import {compileStory,stateAt} from '../../src/engine.js';
export default async function loadReport(root,base,line,audioLibrary){
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
