import {validateFactRefs} from './card-context.mjs';

const INVITE_VOICE='当前scene.id=rongfu-invitation，是平儿已问得主人答复后返回传话，不是第五场重新争取许可，也不是第七场初次相见。刘姥姥本场职责是接住消息、主动应下或提出确有必要的顾虑；initiative.volunteerAt可引用她愿随行的回应，不把平儿传邀请当成推派。不得将平儿第八场自己说只领一人说成凤姐禁止周嫂子同行。许可只证明可以相见，不能说米粮已有着落。三两句可说清的事不要拖，避免羞怯、反复感谢、训规矩和再次自我介绍。';
export const DIALOGUE_CHECKS=['responsiveness','helpRoute','decision','voice','redundancy','agency','facts'];
const REPORT_VOICE='当前scene.id=fengjie-report，make-case节点在本分支由平儿独自向凤姐转述。刘姥姥与周瑞妻子不在场，不能强求她们发言、当面讨赏或在本场被直接领入。平儿是本场主动回话者，凤姐本轮第一次听此事，先听才知道身份、关系、所求。周嫂子转述的联宗不能升级为太太认下近亲，刘姥姥当面说的米粮请求保留原话语境；不能凭空说家中断粮、孩子病饿、已有几石米等。凤姐可自主安排接见、查询、回绝或帮助，不固定二十两、先问太太或必须接见；听得懂、问得准、作决定体现能干，不需连串盘诘、办事公文或刻薄警告。若让平儿出去传话，实际即时下一步仅平儿去廊下，下一节点audience-window，留候者尚未听到答复，不自动同行。';
const ARRIVAL_VOICE='当前scene.id=rongfu-reception，是刘姥姥与周瑞妻子已经到倒厅旁、首次见平儿本人。平儿的个人经历已包含第五场来意，不能当作全不知情，也不能知道第六场未听见的原话。不要套第五场周瑞妻子独自来递话的流程，不重复家计、亲属、许可地点等已定内容。刘姥姥本场职责是自然招呼、接话并主动表达眼下实际需要；initiative.volunteerAt可引用这类真实发言，不要求重新自愿出门，不把周嫂子引见当成推派。句子须是活人答话，感谢点到即止，不说规规矩矩站着、别乱走等执行限制。若平儿决定去回禀，决定之后才走向门边，另两人留下；不能凭空接到主人答复，也不能把已同意到此候见偷换为已获准进正房。';
const RETURN_VOICE='本场scene.id=zhou-wife-return，是同一intermediary节点的再次返回，优先依当前dramaturgy，不套首次辨认和问来意流程。刘姥姥早已主动求助；周瑞妻子回来告知可候见、邀请同行，不是推她首次出门。initiative.volunteerAt可用刘姥姥主动接住消息、愿意跟去的原句；delegatedBefore不能把这种转达和邀请误作先前推派。周瑞妻子告知谁许可、去哪里、仍待谁答复，刘姥姥自然回应即可，不强求重讲家计或具体米钱。三两句能达成的安排不要重复确认，不加为了戏剧冲突而产生的反悔，不将候见许可说成奶奶已经准见。转告之前刘姥姥未知平儿答复。双方同意后才离开屋子，不能提前走或以旁白代替应承。';
const RECEPTION_VOICE='audience-window场次特别注意：平儿稳妥利落，也有人情味；说清候见地点与由谁回话即可，不对尚未犯错的来客堆叠别乱走、别张望、别催等禁令。周瑞妻子熟悉府中事务、顾旧情也顾体面，不把递话写成反复壮胆或一味感激免责。站姿是执行限制，不要让人物反复说站着；自然说候着、等回话即可。若追问求米粮还是求见面，下一句应正面接住，而非用别的听奶奶跳开。两人不用重复同一地点、规矩和见不见的未知结果，允许必要的自然答复。';
export const WRITE_CONVERSATION=`你是红楼说书舞台唯一总控的编剧。先写一场连续交谈，不预设段数，不按节点小标题逐格填台词。当前节点只规定要面对的问题，不规定求助结果或同行者；scene.dramaturgy和每人的sceneRole规定本场职责，必须遵循。先确定各成人眼下想达成什么、怕什么，再让每句话接住刚才的问话、顾虑或提议。可以自然打断、回避，但须让观众看得懂，不用旁白替人物补动机。
仅household-decision家中节点：刘姥姥主动拿办法并自己决定去试，动机是真心帮衬一家。狗儿可提供周瑞线索、商量分工，不能先推她出门，迫使她勉强应下。她的乡间智慧和善意要体现在回应家人的具体话里，可自嘲，不持续责骂，不要求家人为失败免责；不要写成不敢包、空手回来别怨我、不兴埋怨。未知接待结果可诚实商量，不等于向家人甩责任。也不要把她写成无所不能或满口牺牲的大好人。其他节点依sceneRole履责：gate-access中她主动有礼问路，以陪笑、具体追问、自嘲应对冷遇，不训门役、不重议出发。门役不知来客姓名与家中私事，需在问答里得知。只问到下一步即收束，别让每人重复确认同一路线。
只输出JSON {"intentions":[{"actor":"id","aim":"当下目的","concern":"顾虑"}],"turns":[{"id":"t1等唯一id","speaker":"id","to":["id"],"mode":"normal/whisper/call","text":"说出口的自然短句，不超过65字","knowledgeRefs":["本人此前听见的turn id"],"factRefs":["本人卡片事实id"],"respondsTo":["正在回应的此前turn id，可为空"],"actionIntent":"none/approach/turn/nod/shake之一，指发话人靠近收话人、转向、点头或摇头；无需动作选none"}],"endingAim":"实际商议形成的决定"}。
knowledgeRefs是信息来源，respondsTo是接话对象，两者不可混为一谈。开新话题时用话语自然承接；重要担忧不能被无关背景覆盖。简短交代中间人为何能联系求助对象、递话给谁、究竟求什么，不反复介绍同一旧交。同行商议以三两句解决为节奏目标，有必要的回应就保留，禁止为了句数删掉因果。没有整场八句限制；删除无效重复，不要求每人发言。按卡片区分性格和各人的知识；孩子可以无台词。不能知道尚未发生的接待结果或未知库存。称周瑞妻子，不用周瑞家的。站姿演员不能坐下、拿物；只为有目的的互动走位，私语需靠近。人物提出的未来动作不是已经执行。`;

export const REVIEW_CONVERSATION=`独立审核一场戏。你只有实际对白、人物与环境资料，没有编剧的结局说明、意图解释或段落摘要。不要替缺失的对白脑补理由。逐句连读，判断发言是在回应、推进还是无缘无故换话题。知识有依据不等于接话自然。重要顾虑如被有意回避，须有可见的语言依据；修辞问句不要求机械回答。无需每个人逐个表示同意。
重点核对：亲人对受委屈的担心是否被回应；中间人的关系、递话对象与求助目的是否清楚；同行提议被改动时缘由是否可见、实际去向是否一致。求助目的要有实际对白支持，如求活、借米、临时周济；不能仅凭说过冬事和去求人就补出具体请求。不要为了修复旧稿而要求新稿必须包含同样的担忧或同行者。
输出JSON {"passed":true或false,"checks":[{"kind":"responsiveness/helpRoute/decision/voice/redundancy/agency/facts，七项各一次","passed":true或false,"evidenceRefs":["实际turn id"],"reason":"指出原话及其联系，不能泛说符合"}],"initiative":{"volunteerAt":"刘姥姥主动承担本场职责的id（家中自愿出门、门前主动问路、后街主动确认住处、住处主动向旧识说明来意），无则null","delegatedBefore":["此前别人先推她出门的id，无则空数组"],"reason":"主动承担或被推后的应承，用实际原话说明"},"connections":[{"turnId":"除第一句外每句id","connectsTo":["此前id，可空"],"reason":"如何接话或转换，跳脱则指出"}],"concerns":[{"raisedAt":"提出实质顾虑的turn id","responseAt":["后续回应id"],"kind":"external-uncertainty或actionable","status":"answered/deferred/evaded/unresolved","reason":"顾虑怎样被处理，或仍悬而未决"}],"issues":[{"turnIds":["id"],"reason":"具体需要重写的断裂、重复、失真或关系错误"}]}。
facts逐条核对关系、过去经历和路线的归属与范围。早年与女儿去过王家，不等于与狗儿夫妻都去过，也不等于去过荣府、熟悉荣府路线或周瑞今日住处。知道旧交不等于知道能否见到人。不能为显得能干而凭空给人物添已经确认的经历或资源。
agency检查以scene.dramaturgy和sceneRole为准。仅家中household-decision节点由刘姥姥自愿提出出门，不是狗儿先让她去后她无奈应下。人物有顾虑不等于推脱责任；她可以商量门路，但若反复要求家人别埋怨、预先免责，或全场只冷硬数落人，agency/voice应不通过。不要用她最后确实答应去来掩盖主动性被别人取代。initiative.delegatedBefore不包含仅提供周瑞线索的句子。gate-access依主动问路评判，不要求重新决定出发，不要求门役讨论家中求活或借米细节；本场helpRoute只需确认找谁、问到可用下一步，不能泄露尚未得知的后台信息。backstreet-contact只需把已知的太太陪房周瑞家身份说给孩子、问清近处住处或获得带路，不要求向孩子重讲求米借钱或家中顾虑。孩子答应领路即可，不需要成人式同行表决；称呼已经明确时无需重演哪位周大娘的误会。intermediary节点的职责是刘姥姥主动向旧识说明来意、周瑞妻子辨认和问清后衡量帮助。她知道府内分工但不知今日来客家中细节；可提议带去找平儿候见，不要求先获取未在场者的同意，也不能把能通报等同已准见。若邀入屋，应在邀请结束处分段，下一段才展开屋内谈事。audience-window节点按当前出场者审核：若来者是周瑞妻子，就由她主动递话，平儿先听后回应；不要强求未在场的刘姥姥主动发言。区分平儿本职范围内安排候见与凤姐亲自答应接见；平儿还没有听到的身份与求助详情不能预知。眼下只需把来客身份、所求及实际等待处说明，不能让双方复述前四场。后续其他节点按environment.dramaturgy判断。
external-uncertainty指对方在不在、愿不愿帮忙等必须到后续才能知道的结果，可以暂未解决。actionable指本场谁去、谁看孩子、反对同行、拒绝范围等人物当场可回应的问题。actionable若unresolved不能通过；deferred或evaded必须有对白证据表明主动保留、回避或仍有分歧，不能把沉默或换话题当作同意。尤其不能把“我反对两人同去，但我只送到街口”误读为反对已经消失。
不接话、无意义重复、人物只替提纲宣读、接话对象含混，均属于内容失败，不是可忽略的润色。需有可追踪的实际决定，不能用尚未谈过的结局补足。事实只依稳定卡、本人experiencedMemory和实际听闻，未知只能询问或推测。passed=true要求七项检查全过且issues为空。`;

export function transcript(draft,cards){
 const names=Object.fromEntries(cards.characters.map(c=>[c.id,c.name]));
 return draft.turns.map(t=>`[${t.id}] ${names[t.speaker]||t.speaker}对${t.to.map(id=>names[id]||id).join('、')}（${t.mode}）说：“${t.text}”`).join('\n');
}
export function validateConversation(draft,cards){
 if(!draft||!Array.isArray(draft.turns)||!draft.turns.length||draft.turns.length>48)throw Error('连续对白须为1至48句，48仅为单次请求保护上限');
 const actors=new Set(cards.characters.map(c=>c.id)),past=new Set();
 if(typeof draft.endingAim!=='string'||!draft.endingAim.trim())throw Error('缺少实际场末决定');
 if(!Array.isArray(draft.intentions)||draft.intentions.some(v=>!actors.has(v.actor)||!v.aim||!v.concern))throw Error('缺少人物当下目的与顾虑');
 for(const t of draft.turns){
  if(typeof t.id!=='string'||!t.id||past.has(t.id))throw Error('对白ID必须唯一');
  if(!actors.has(t.speaker)||!Array.isArray(t.to)||!t.to.length||t.to.some(id=>!actors.has(id)||id===t.speaker))throw Error('说话人与对象无效');
  if(typeof t.text!=='string'||!t.text.trim()||t.text.length>80||/[:：]|周瑞家的/.test(t.text))throw Error('对白须为80字内口语，不含冒号或周瑞家的');
  if(t.speaker==='baner'&&t.text.length>18)throw Error('板儿只说眼前具体事情的短句，最多18字');
  if(t.speaker==='guide_child'&&t.text.length>30)throw Error('引路孩童的话须短而具体，最多30字，不讲成人求援策略');
  if((cards.scene.id==='zhou-wife-home'||cards.scene.dramaturgy?.standingOnly)&&/坐(?:吧|罢|等|候|着|在|下|坐|定)|讨个坐|进屋坐|先坐|落座|端.{0,3}茶|喝.{0,3}茶/.test(t.text))throw Error('本场仅站姿，不能邀请或接受坐下、坐等、端茶喝茶；可邀请说话或稍候，再以真实走位兑现。');
  if(t.speaker==='qinger')throw Error('青儿本场不承担对白');
  if(cards.scene?.dramaturgy?.protagonist==='granny'&&t.speaker==='granny'&&/不敢包|别怨我|不兴埋怨|不许.{0,3}埋怨|成不成.{0,8}[包怨怪]/.test(t.text))throw Error(`${t.id} 本场刘姥姥主动承担，不向家人预先免责；可谈门路的未知，不能索取别埋怨的保证`);
  if(t.actionIntent!==undefined&&!['none','approach','turn','nod','shake'].includes(t.actionIntent))throw Error(`${t.id} actionIntent只允许none/approach/turn/nod/shake；没有坐下、摸头、拉衣服等动作，请连同指向该动作的对白一起重写`);
  if(!['normal','whisper','call'].includes(t.mode))throw Error('发话方式无效');
  for(const k of ['knowledgeRefs','respondsTo'])if(!Array.isArray(t[k])||t[k].some(id=>!past.has(id)))throw Error(k+'必须引用实际此前对白');
  validateFactRefs(t,cards);past.add(t.id);
 }
 return draft;
}
export function validateDialogueReview(review,draft,cards=null){
 const ids=draft.turns.map(t=>t.id),valid=new Set(ids),refs=v=>Array.isArray(v)&&v.every(id=>valid.has(id));
 if(!review||!Array.isArray(review.checks)||review.checks.length!==DIALOGUE_CHECKS.length||new Set(review.checks.map(c=>c.kind)).size!==DIALOGUE_CHECKS.length||review.checks.some(c=>!DIALOGUE_CHECKS.includes(c.kind)||typeof c.passed!=='boolean'||!refs(c.evidenceRefs)||!c.evidenceRefs.length||!c.reason))throw Error('内容审核须有七项检查及真实对白证据');
 if(cards?.scene?.dramaturgy?.protagonist==='granny'){
  const a=review.initiative;if(!a||!refs(a.delegatedBefore)||!a.reason||(a.volunteerAt!==null&&!draft.turns.some(t=>t.id===a.volunteerAt&&t.speaker==='granny')))throw Error('须用刘姥姥实际发言证明主动承担，不能填旁白或别人的句子');
  if(a.volunteerAt&&a.delegatedBefore.some(id=>ids.indexOf(id)>=ids.indexOf(a.volunteerAt)))throw Error('推派证据须在自愿发言之前');
  if(review.passed===true&&(!a.volunteerAt||a.delegatedBefore.length))throw Error('本场主动担当不成立，不能将被推派后的应承判为通过');
 }
 if(!Array.isArray(review.connections)||review.connections.length!==ids.length-1||new Set(review.connections.map(c=>c.turnId)).size!==ids.length-1)throw Error('须逐句检查接话关系');
 for(const c of review.connections)if(!ids.slice(1).includes(c.turnId)||!refs(c.connectsTo)||c.connectsTo.some(id=>ids.indexOf(id)>=ids.indexOf(c.turnId))||!c.reason)throw Error('接话审核引用无效');
 if(!Array.isArray(review.concerns)||review.concerns.some(c=>!valid.has(c.raisedAt)||!refs(c.responseAt)||c.responseAt.some(id=>ids.indexOf(id)<=ids.indexOf(c.raisedAt))||!['external-uncertainty','actionable'].includes(c.kind)||!['answered','deferred','evaded','unresolved'].includes(c.status)||!c.reason||(c.status!=='unresolved'&&!c.responseAt.length)))throw Error('顾虑须区分外部未知与当场可回应问题，并有后续证据或未解决状态');
 if(review.passed===true&&review.concerns.some(c=>c.kind==='actionable'&&c.status==='unresolved'))throw Error('审核不能一边确认当场反对意见未处理一边判通过：'+JSON.stringify(review.concerns.filter(c=>c.kind==='actionable'&&c.status==='unresolved')));
 if(!Array.isArray(review.issues)||review.issues.some(i=>!refs(i.turnIds)||!i.turnIds.length||!i.reason))throw Error('问题须定位到对白');
 if(review.passed===true&&(review.issues.length||review.checks.some(c=>!c.passed)))throw Error('有失败项不能标记内容通过');
 return review;
}
export function partitionConversation(draft,partition){
 const segments=partition?.segments;
 if(!Array.isArray(segments)||!segments.length||segments.length>12)throw Error('舞台分段须为1至12段');
 const source=draft.turns.map(t=>t.id),assigned=segments.flatMap(s=>s.turnIds||[]);
 if(JSON.stringify(assigned)!==JSON.stringify(source))throw Error('分段必须按原顺序完整覆盖对白，不得删除、重复或调换');
 const map=new Map(),segmentIds=new Set();
 for(const s of segments){if(!s.id||segmentIds.has(s.id)||!s.title||!s.change||!s.turnIds.length||s.turnIds.length>8)throw Error('分段元数据无效，每段至多8句');const duration=6+s.turnIds.reduce((n,id)=>n+Math.max(4,Math.ceil(draft.turns.find(t=>t.id===id).text.length/5+1))+1,0);if(duration>120)throw Error('本段超过执行器120秒上限，请在自然停顿处再分段');segmentIds.add(s.id);s.turnIds.forEach((id,i)=>map.set(id,`${s.id}:${i}`));}
 const turns=new Map(draft.turns.map(t=>[t.id,t]));
 return {endingAim:draft.endingAim,beats:segments.map(s=>({id:s.id,title:s.title,question:s.title,change:s.change,intention:s.intention||s.change,dialogue:s.turnIds.map(id=>{const t=turns.get(id);return {speaker:t.speaker,to:[...t.to],mode:t.mode,text:t.text,knowledgeRefs:t.knowledgeRefs.map(id=>map.get(id)),factRefs:[...t.factRefs],respondsTo:t.respondsTo.map(id=>map.get(id)),sourceTurnId:t.id,actionIntent:t.actionIntent||''};})}))};
}
export function assertDialoguePreserved(draft,story){
 const original=draft.turns.map(t=>[t.speaker,t.to,t.mode,t.text,t.factRefs]),actual=story.beats.flatMap(b=>b.dialogue.map(t=>[t.speaker,t.to,t.mode,t.text,t.factRefs]));
 if(JSON.stringify(original)!==JSON.stringify(actual))throw Error('动作编排改变了已通过审核的对白，必须重回连续对白审核');
}
export async function composeConversation({ask,cards,context,rejected=null,feedback=null,onPhase=()=>{}}){
 let draft=rejected,review,errors=feedback;
 for(let attempt=0;attempt<3;attempt++){
  await onPhase(attempt?'根据接话审核重写完整交谈':'先写人物之间的连续交谈');
  draft=await ask(WRITE_CONVERSATION+(cards.scene.id==='rongfu-invitation'?'\n'+INVITE_VOICE:'')+(cards.scene.id==='fengjie-report'?'\n'+REPORT_VOICE:'')+(cards.scene.id==='rongfu-reception'?'\n'+ARRIVAL_VOICE:'')+(cards.scene.id==='zhou-wife-return'?'\n'+RETURN_VOICE:'')+(cards.scene.id==='rongfu-waiting'?'\n'+RECEPTION_VOICE:'')+(draft?'\n这是修订。可以增删、合并或重写一段乃至整场交谈，重新编号并修复引用，保留合理内容，不受旧句数和原句index限制。':''),{writingContext:context,rejected:draft,feedback:errors},'conversation-write-'+attempt);
  try{validateConversation(draft,cards);}catch(e){if(attempt===2)throw e;errors=e.message;continue;}
  await onPhase('独立连读对白，逐句核对回应、门路和决定');
  review=await ask(REVIEW_CONVERSATION+(cards.scene.id==='rongfu-invitation'?'\n'+INVITE_VOICE:'')+(cards.scene.id==='fengjie-report'?'\n'+REPORT_VOICE:'')+(cards.scene.id==='rongfu-reception'?'\n'+ARRIVAL_VOICE:'')+(cards.scene.id==='zhou-wife-return'?'\n'+RETURN_VOICE:'')+(cards.scene.id==='rongfu-waiting'?'\n'+RECEPTION_VOICE+'若把性格、节奏要求写成同一安排的反复确认，或无故堆叠训诫，voice/redundancy不能判通过。':''),{characters:cards.characters,relationshipFacts:cards.relationshipFacts,environment:cards.scene,transcript:transcript(draft,cards)},'conversation-review-'+attempt);
  try{validateDialogueReview(review,draft,cards);}catch(e){if(attempt===2)throw e;errors={validationError:e.message,review};continue;}
  if(review.passed===true)break;
  if(attempt===2)throw Error('连续对白未通过：'+JSON.stringify(review.issues));errors=review;
 }
 let plan;
 for(let attempt=0;attempt<2;attempt++){
  await onPhase('对白已通过，按交谈自然停顿划分舞台段落');
  const partition=await ask('只划分已通过审核的对白，不输出或改写任何台词。返回JSON {"segments":[{"id":"短英文段落id","title":"短标题","turnIds":["连续且有序的对白id"],"change":"这几句话实际形成的新变化，不能虚构","intention":"人物交谈目的"}]}。完整覆盖所有对白。尽量在一个问题谈完或场面变化时切分，不切断问答；每段至多8句且按每句字数/5+2估算总长不超过100秒。无固定段数。不为凑段数拆开同行商议。intermediary场若含主人邀请入屋，邀请及应答完成后作为分段点，入屋后的对话放下一段，不能把邀请后的移动倒置到整场开头。',{environment:cards.scene,transcript:transcript(draft,cards),validationErrors:plan?.error},'conversation-partition-'+attempt);
  try{plan=partitionConversation(draft,partition);break;}catch(e){if(attempt===1)throw e;plan={error:e.message};}
 }
 return {conversation:draft,dialogueReview:review,plan};
}
