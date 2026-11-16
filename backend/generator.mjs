import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {join} from 'node:path';
import {compileStory,stateAt,buildDirectorContext,personalKnowledge,along,distance} from '../src/engine.js';
import {readCredential,hasCredential} from './credentials.mjs';
import {NARRATIVE_VERSION,nodeFor,validatePlan,buildHandoff,nextNodeContext,stageScriptBeat,validateScreenplay,applyModelPatches} from './narrative.mjs';
import {defaultPresentation,compilePresentation} from '../src/presentation.js';
import {compileSoundtrack} from '../src/soundtrack.js';
import {validateFactRefs,runtimeCards,scriptEvidence} from './card-context.mjs';
export const MODEL='deepseek-flash';
const ORIGIN='https://api.deepseek.com';
const load=async p=>JSON.parse(await readFile(p,'utf8'));
const save=async(p,v)=>writeFile(p,JSON.stringify(v,null,2),'utf8');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const SYSTEM=`你是唯一说书总控的舞台编排环节。完整对白已由场次剧本确定，你不能重写或添加对白。只输出JSON {"blocking":{"narration":"<=100字，准确描述本段实际动作与说话，不写内心或未实现的动作","moves":[{"actor":"人物id","target":"站位名"}],"expressions":[{"actor":"人物id","value":"现有表情名"}],"camera":"可选镜头名"}}。
程序会把moves安排在本段开头，4秒完成；所有移动停止后才逐句说话，并自动转向第一收话人，按字数给足显示时间。因此不要给at/duration，不要重写剧本。无理由就不移动，不重复已有站位，不让两个人到同一站位。不要添加端碗、搀扶、坐下、拿衣裳等未支持动作。
context.currentState是实际站位。必须根据planStep.dialogue里的对象和方式，使对方确实听得见；悄悄话双方需同声区且距离<=0.9，普通交谈<=4.5。旁人靠近可能听见，不能用旁白冒充秘密。
站位以anchorDescriptions为准，不把屋中右侧说成桌旁，不把屋中后侧说成炕前；没move就不写走动。旁白可以简短交代说话态度，不必全是移动说明。场景是秋尽冬初的狗儿家，人物名统一周瑞妻子。`;

export function normalizeModelBeat(beat){
 if(!beat||typeof beat!=='object')return beat;
 const b=structuredClone(beat);
 // Syntax normalization only. Actual hearing is always recomputed by the engine.
 if(b.memory&&typeof b.memory==='object'&&typeof b.memory.summary==='string')b.memory=b.memory.summary;
 for(const d of b.dialogue||[])if(Array.isArray(d.knowledgeRefs))d.knowledgeRefs=d.knowledgeRefs.map(ref=>{
  if(typeof ref!=='string'||!ref.startsWith(b.id+'-'))return ref;
  const tail=ref.slice(b.id.length+1);return /^\d{2}$/.test(tail)&&Number(tail)>0?`${b.id}:${Number(tail)-1}`:ref;
 });
 return b;
}

export function generationContext(cards,stage,characters,story){
 if(story.beats.length){const c=compileStory(story,stage,characters);const ctx=buildDirectorContext(cards,c,c.duration);return {scene:ctx.scene,characters:ctx.characters,worldbook:ctx.worldbook,narratorHistory:ctx.recentHistory,characterViews:ctx.characterViews,currentState:ctx.currentState};}
 return {scene:cards.scene,characters:cards.characters,worldbook:cards.worldbook,narratorHistory:[],characterViews:Object.fromEntries(characters.map(c=>[c.id,{present:true,position:stage.anchors[story.initial.actors[c.id].anchor],heardUtterances:[],addressedBy:null}])),currentState:{actors:Object.fromEntries(characters.map(c=>[c.id,{...story.initial.actors[c.id],position:stage.anchors[story.initial.actors[c.id].anchor]}])),camera:story.initial.camera,lighting:story.initial.lighting}};
}
export function auditGeneratedStory(story,stage,characters,cards=null){
 const compiled=compileStory(story,stage,characters);const errors=[];
 for(const b of compiled.beats){
  if(b.narration.length>140)errors.push(`${b.id} 旁白过长`);
  if(typeof b.memory!=='string')errors.push(`${b.id} memory必须是字符串`);
  if(/(?:把|将).{0,8}手.{0,8}(?:牵|拉)|(?:牵|拉)(?:着|住|起).{0,5}(?:手|板儿|青儿)/.test(b.narration))errors.push(`${b.id} 旁白声称牵手，但舞台没有手部动作，改为描述实际交谈或将来的安排`);
  for(const c of characters){const claimsMove=new RegExp(c.name+'(?:从[^，。；说问答]{0,10}|往[^，。；说问答]{0,6}|向[^，。；说问答]{0,6})?(?:走|挪|退|移|迈|踱|跨)').test(b.narration);if(claimsMove&&!b.commands.some(e=>e.type==='move'&&e.actor===c.id))errors.push(`${b.id} 旁白声称${c.name}移动，但没有对应move指令`);}
  for(const [i,d]of b.dialogue.entries()){
   if(cards)validateFactRefs(d,cards);
   if(d.text.length>90)errors.push(`${b.id} 台词超过90字`);
   if(d.until-d.at<d.text.length/5+1)errors.push(`${b.id}:${i} 台词${d.text.length}字，至少需要${Math.ceil(d.text.length/5+1)}秒；当前at=${d.at},until=${d.until}只有${d.until-d.at}秒。延长until并顺延后续对白/转向及本段duration，不要改短其他句子。`);
   if(d.speaker==='baner'&&d.text.length>2)errors.push(`${b.id} 板儿台词超过两个字`);
   if(d.speaker==='qinger')errors.push(`${b.id} 青儿本场不承担对白`);
   if(!Array.isArray(d.knowledgeRefs))errors.push(`${b.id} 缺少 knowledgeRefs`);
   const allowed=new Set(personalKnowledge(compiled,b.start+d.at)[d.speaker].map(e=>e.eventId));
   for(const ref of d.knowledgeRefs||[])if(!allowed.has(ref))errors.push(`${b.id}:${i} ${d.speaker}引用了没有听见的事件 ${ref}；此时允许的事件ID为 ${JSON.stringify([...allowed])}`);
   const at=stateAt(compiled,b.start+d.at);if(at.actors[d.speaker].facingTarget!==d.to[0])errors.push(`${b.id} ${d.speaker}发话前未朝向 ${d.to[0]}`);
   for(let t=d.at;t<d.until;t+=.25){const s=stateAt(compiled,b.start+t);if(s.actors[d.speaker].moving){errors.push(`${b.id}说话人仍在移动`);break;}}
  }
 }
 for(const e of compiled.events.filter(e=>e.type==='move')){
  if(e.path.length<2)errors.push(`${e.beatId} ${e.actor}已经在${e.target}，不能再用move假装走动，请删除该move并保持旁白一致`);
  for(let t=0;t<=1;t+=.02){const p=along(e.path,t);for(const o of stage.obstacles)if(p[0]>o.min[0]&&p[0]<o.max[0]&&p[1]>o.min[1]&&p[1]<o.max[1])errors.push(`${e.beatId} 移动穿过 ${o.id}`);}
 }
 if(errors.length)throw Error([...new Set(errors)].join('\n'));
 return {passed:true,beats:compiled.beats.length,duration:compiled.duration,dialogues:compiled.beats.reduce((n,b)=>n+b.dialogue.length,0),moves:compiled.events.filter(e=>e.type==='move').length,whispers:compiled.beats.flatMap(b=>b.dialogue).filter(d=>d.mode==='whisper').length};
}

export function createGenerator(root){
 let active=null;let controller=null;const jobs=new Map();const dir=join(root,'.runtime/generations');
 async function latest(){try{return await load(join(root,'.runtime/latest-story.json'));}catch{return null;}}
 async function callModel(key,system,input,job,phase){
  const callId=randomUUID();await save(join(dir,job.id,callId+'-request.json'),{phase,model:MODEL,system,input});
  const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),90000);const onAbort=()=>abort.abort();controller?.signal.addEventListener('abort',onAbort,{once:true});
  try{
   const response=await fetch(ORIGIN+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(input)}],thinking:{type:'disabled'},response_format:{type:'json_object'},temperature:.8,max_tokens:6000,stream:false}),signal:abort.signal});
   const data=await response.json();if(!response.ok)throw Error(`DeepSeek HTTP ${response.status} (${data.error?.code||'request_failed'})`);
   const receipt={phase,responseId:data.id,model:data.model,usage:data.usage,finishReason:data.choices?.[0]?.finish_reason,content:data.choices?.[0]?.message?.content};job.calls.push({phase,responseId:data.id,model:data.model,usage:data.usage});await save(join(dir,job.id,callId+'-response.json'),receipt);
   if(receipt.finishReason!=='stop')throw Error('模型输出未完整结束，未自动重放请求');
   return JSON.parse(receipt.content);
  }catch(e){if(e.name==='AbortError')throw Error('模型请求超时或被取消；请求结果不确定，未自动重试');throw e;}
  finally{clearTimeout(timeout);controller?.signal.removeEventListener('abort',onAbort);}
 }
 async function persist(job){await save(join(dir,job.id,'status.json'),job);}
 async function run(job){
  try{
   const [rawCards,stage,characters,seed,storyline,audioLibrary]=await Promise.all(['cards','stage','characters','scene-one','storyline','audio-library'].map(n=>load(join(root,'data',n+'.json'))));
   const cards=runtimeCards(rawCards);const key=await readCredential();job.inputs={cardsHash:hash(rawCards),stageHash:hash(stage),storylineHash:hash(storyline),narrativeVersion:NARRATIVE_VERSION};
   const story=job.resumeFrom?await load(join(dir,job.resumeFrom,job.resumeFile||'draft.json')):{version:1,communicationVersion:1,id:job.id,title:'寒家谋生',scene:stage.id,mode:'deepseek-generated',summary:'DeepSeek Flash 根据当前人物、环境与个人听闻生成的第一场。',initial:seed.initial,beats:[]};story.id=job.id;delete story.generation;
   const node=nodeFor(storyline,storyline.entryNode);
   if(!story.narrative){
    job.phase='planning';job.message='先规划本场怎样从困境推进到行动决定';await persist(job);
    let plan=validatePlan(await callModel(key,`你是唯一说书总控，先写完整一场戏，再交程序编排动作。依据人物卡、环境卡与当前故事节点，输出JSON {"endingAim":"本场实际形成的决定","beats":[{"id":"短英文ID","title":"短标题","question":"本段要处理的问题","change":"本段对白已经带来的新变化，作为事实摘要","intention":"谁对谁想达到什么","dialogue":[{"speaker":"id","to":["id"],"mode":"normal/whisper/call","text":"原创对白<=65字","knowledgeRefs":["已听见事件ID"],"factRefs":["本人可用卡片事实ID"]}]}]}。
整场优先3到6段，最多maxBeats段，每段1到4句，必须有自然接话和明确推进。因为你一次看完整场，任何旧线索已说过就不能再当新线索发现，已经同意的事不能又回去征询。允许有不同利益和实质新理由的争论。最后说清谁去、同行者、找谁、求什么和何时动身；成人同行者要明确同意。若不去须实际新阻碍与替代行动。人物公开讨论时用normal；只在确有理由避人时低语，避人者不得从私语得到信息。
刘姥姥按performance在家敢数落女婿，会拿出具体办法，有算计、有担当，不写成反复安慰别愁的长辈；乡谚要针对眼前事，不每句塞口头禅。刘氏可以主动提议同行，狗儿也可以去，不能自动默认板儿。不要为了偏离原著硬指定某人，同伴由有来有往的商议形成。角色称谓与关系准确：狗儿父亲与周瑞有旧；刘氏父亲并非狗儿父亲。讲给刘氏听须说你公公或狗儿他爹，不说你爹。场景是秋尽冬初，不是年关除夕。统一名字周瑞妻子，不用周瑞家的。
人物卡是资料，家庭场次覆盖后期入园情境。只读取当前运行卡，不从原著记忆补出事实。relationshipFacts中的knownBy决定谁一开始知道什么，scope限制事实能支持的说法：知道周瑞不是与周瑞交情深，狗儿家的旧交不能挪成刘姥姥自己的关系；人物可问、可猜，但必须用疑问或推测口气。每句factRefs只引本人knownFactIds，听来的事引knowledgeRefs。家中瓜果、钱粮余量未建立，不凭空说已有可送礼的库存。环境卡的factBoundary与narrationPolicy都须遵守。不复述原著，原著只给问题与关系；绝不预知门房和周瑞妻子的接待结果。后续台词只能依赖当时该人物已听到的话或自己卡片知识，不能把结局提前当作事实。事件ID是本段id:从0开始的对白序号，如abc:0；新信息用[]。板儿几乎不开口、最多两字，青儿不说成人台词。台词可提出将来动作，不声称未实现的道具操作已完成。`,{node,cards,initial:story.initial,maxBeats:job.total},job,'scene-plan'),job.total);
    let scriptReview;
    for(let attempt=0;attempt<2;attempt++){
     scriptReview=await callModel(key,`你是场次内容审核员，检查是否能按人物卡自由创作并推进到节点。只阻止明确的事实矛盾、虚构具体过去经历、人物知道未听见的秘密、明显张冠李戴、反复同一结论却无推进、或结尾根本没有行动决定。每项指出具体原句和矛盾，最多6项；一般润色建议不算失败。
特别注意：knownBy限定开场知识，scriptEvidence.citedSpeech表示前文新听到的内容；人物听到狗儿讲旧交后可以讨论这条关系。factRefs/knowledgeRefs是上下文依据，不要求每个引用分别证明整句话，也不因引用稍宽就否决。提议、询问、推测、承诺准备东西，均不等于声称事情已完成或已获帮助。人物可以提出卡片未列出的新办法。父母商议同意带孩子就够，不要求孩子签约，不默认板儿同行不等于禁止选择板儿。不要求照原著顺序或原话说。
仍须严格检查：不能凭空说自己曾受过谁的恩惠、拥有谁家的旧交，不能编造具体旧日荒年经历或确知尚未知的库存、府中接待结果；不能让人物在未听见前就知道秘密。回顾整场是否有新信息、不同反应、可行动的决定。输出JSON {"passed":true或false,"issues":["具体实质问题"]}；没有实质问题时passed=true且issues=[]。`,{cards,node,plan,scriptEvidence:scriptEvidence(plan)},job,'script-review-'+attempt);
     if(scriptReview.passed===true&&Array.isArray(scriptReview.issues)&&scriptReview.issues.length===0)break;
     if(attempt===1)throw Error('文字剧本未通过：'+JSON.stringify(scriptReview.issues));
     plan=validatePlan(await callModel(key,`修订完整场次剧本。只输出JSON顶层endingAim与beats，禁止输出cards、node、issues或plan包装字段，不要复述输入资料。根据issues消除重复、无推进、人物失真或决定不明。不要只换说法，要合并已经谈过的事，并给后段新的具体问题。保留角色知识边界、每句knowledgeRefs、1到4句一段及最多maxBeats段。`,{cards,node,plan,issues:scriptReview.issues,maxBeats:job.total},job,'script-rewrite'),job.total);
    }
    story.narrative={version:NARRATIVE_VERSION,nodeId:node.id,plan,scriptReview};job.total=plan.beats.length;await save(join(dir,job.id,'draft.json'),story);await persist(job);
   }
   for(let preflight=0;preflight<3;preflight++){
    try{validateScreenplay(story.narrative.plan,characters,12,cards);break;}
    catch(e){if(preflight===2||story.beats.length)throw e;
     job.message='修正完整剧本的事件引用和对白长度';await persist(job);
     story.narrative.plan=await callModel(key,`修正完整场次剧本。只输出JSON顶层endingAim与beats，禁止输出cards、node、validationErrors或plan包装。严格依据validationErrors改格式。knowledgeRefs只能引用实际此前对白的段落id:0，角色自己卡中的知识用[]，不能写人名或知识短语。每句factRefs使用本人knownFactIds，空数组允许；不要删除该字段。每句不超过65字。不得凭空断言家里有多余枣儿倭瓜等礼物，可询问还有没有可带的东西或不带礼物；不能套用二进大观园送瓜果。保留人物互相接话、已明确的同行决定和其他合理内容。`,{plan:story.narrative.plan,cards,node,validationErrors:e.message},job,'script-preflight-'+preflight);
     story.narrative.plan=story.narrative.plan.plan||story.narrative.plan;validatePlan(story.narrative.plan,12);job.total=story.narrative.plan.beats.length;await save(join(dir,job.id,'draft.json'),story);await persist(job);
    }
   }
   await save(join(dir,job.id,'draft.json'),story);
   const protocol={beatShape:{id:'唯一字符串',title:'短标题',duration:'12到55的数字',narration:'一到两句字符串',memory:'字符串',dialogue:[{at:5,until:14,speaker:'人物id',to:['对话对象id'],mode:'normal',text:'模型原创台词',knowledgeRefs:[]}],commands:[]},expression:['neutral','smile','thinking','sad','surprised','laugh'],commands:{move:['at','type','actor','target','duration'],face:['at','type','actor','target'],expression:['at','type','actor','value'],gesture:['at','type','actor','value','duration'],camera:['at','type','target'],lighting:['at','type','value'],visibility:['at','type','actor','value']},gestures:['nod','shake'],lighting:['day','night','dawn'],cameras:Object.keys(stage.cameras),anchors:stage.anchors,anchorDescriptions:{granny_home:'炕前偏右的家人站位',gouer_home:'屋中后侧、炕的右方',gouer_pace:'屋中右后侧，远离低语的母女',gouer_listen:'屋中靠前的交谈位',liushi_home:'屋中右侧，靠近门边',liushi_near:'屋中右侧交谈位，不是桌旁',whisper_guest:'刘姥姥旁的独立低语位，与granny_home间距约0.83米',room_center:'屋中活动空地',baner_near:'靠近刘姥姥的孩子站位',door_inside:'院门内侧',yard_entry:'门外小院',yard_end:'小院远端'},edges:stage.edges,acoustics:stage.acoustics};
   for(let i=story.beats.length;i<job.total;i++){
    if(controller.signal.aborted)throw Error('已取消生成');job.phase='generating';job.message=`Flash 正在生成第 ${i+1} / ${job.total} 段`;await persist(job);
    const context=generationContext(cards,stage,characters,story);const input={context,protocol,node,scenePlan:story.narrative.plan,planStep:story.narrative.plan.beats[i],segment:i+1,totalSegments:job.total,request:i===0?'从真实初态开场，把困境具体化。':i===job.total-1?'形成可交给下一节点的具体决定，同行成人须听见并回应；不自动切场。':'根据已发生的对白，实现本段的新变化；不要重复已经谈妥的问题。',quality:'走位应服务人物目的，不以走动或低语填时长。人物互相答话，可以反驳、讨价还价、拿定主意。'};
    let output=await callModel(key,SYSTEM,input,job,`beat-${i+1}`);let accepted=false;
    for(let attempt=0;attempt<3;attempt++){
     try{const normalized=stageScriptBeat(story.narrative.plan.beats[i],output.blocking);if(normalized?.id!==story.narrative.plan.beats[i].id)throw Error('本段ID必须使用planStep.id');const candidate={...story,beats:[...story.beats,normalized]};auditGeneratedStory(candidate,stage,characters,cards);story.beats.push(normalized);accepted=true;break;}
     catch(e){if(attempt===2)throw Error(`第${i+1}段三次校验未通过：${e.message}`);job.message=`第 ${i+1} 段正在修正对白与动作配合`;await persist(job);output=await callModel(key,SYSTEM,{...input,rejected:output,validationErrors:e.message,repair:'只修改本段blocking的站位、表情或旁白，不修改dialogue。输出完整blocking JSON。'},job,`beat-${i+1}-repair-${attempt+1}`);}
    }
    if(!accepted)throw Error('未得到可执行段落');job.completed=i+1;await save(join(dir,job.id,'draft.json'),story);await persist(job);
   }
   job.phase='reviewing';job.message='整场已生成，正在核对人物知情范围与对白、动作是否一致';await persist(job);
   let review=null;
   for(let reviewPass=0;reviewPass<3;reviewPass++){
    const compiled=compileStory(story,stage,characters);
    const knowledgeAtEachBeat=compiled.beats.map(b=>({id:b.id,heardAtStart:personalKnowledge(compiled,b.start)}));
    const executionFacts=compiled.beats.map(b=>({beatId:b.id,moves:compiled.events.filter(e=>e.beatId===b.id&&e.type==='move').map(e=>({actor:e.actor,to:e.target,description:protocol.anchorDescriptions[e.target],distance:e.path.slice(1).reduce((n,p,i)=>n+distance(e.path[i],p),0)})),noMoveActors:characters.map(c=>c.id).filter(id=>!b.commands.some(c=>c.type==='move'&&c.actor===id)),heard:b.dialogue.map(d=>({speaker:d.speaker,to:d.to,text:d.text,heardBy:stateAt(compiled,b.start+d.at+.001).dialogue?.heardBy}))}));
    review=reviewPass===0&&job.reviewNotes?.length?{passed:false,issues:job.reviewNotes}:await callModel(key,`你是剧情审查员。只审核输入，不补剧情。先读完整场，人物可以在后段回应前段安排，不要求每句都有立即答应。issues只放最终确认的实质矛盾，撤回的疑虑、润色建议和正常创作选择不得放进去。只报明确矛盾和无法执行的内容；提议、询问和准备的承诺不等于既成事实，人物可用自己刚听到的知识。引用稍宽或普通创作选择不是错误；父母同意即可决定孩子同行。核对executionFacts：noMoveActors中的人物本段没有走动，旁白不得声称他走了、挪了、退了。逐句检查relationshipFacts的关系归属及scope，factRefs不得张冠李戴、不得把知道写成熟交；环境factBoundary未知的库存与接待结果不可当成事实。核对白话中是否肯定知道自己未听见的私语，是否描写未支持的手部/坐姿动作，是否超出人物卡。还要检查叙事质量：每段是否带来新信息/冲突/选择，重复叮嘱衣裳、成败免责或明早再谈是否造成停滞；刘姥姥是否按performance在家拿办法而非泛泛劝解。整场须落实节点requiredChange，交代谁去、找谁、求什么、同行者与出发条件，或有实质阻碍的替代行动。不合格就报错，不能只检查动作能播放。区分条件句和已知事实：“若您肯去”“明早要走的话”是在假设，不等于已知道决定，不应因此误判。普通可见表情、合理推测和环境底噪可用，不必逐个都变成动作。输出JSON {"passed":true或false,"issues":[{"beatId":"...","reason":"..."}]}。没有问题issues为空。`,{cards,node,story:{beats:story.beats},knowledgeAtEachBeat,executionFacts},job,'semantic-review-'+reviewPass);
    await save(join(dir,job.id,'semantic-review.json'),review);
    if(review.passed===true&&Array.isArray(review.issues)&&review.issues.length===0)break;
    if(reviewPass===2)throw Error('内容审核未通过：'+JSON.stringify(review.issues||[]));
    job.message='Flash 正在修订未听见的信息或旁白与动作不符之处';await persist(job);
    let fixes=await callModel(key,`你是同一个说书总控的修订环节。只修改审核指出的文字，不改走位、ID和人物对象。只准改原有句子，不得增加新index或新句子，时间由程序按字数重新计算。人物可在后段答应前段安排，不为重复确认而加对白。输出JSON {"patches":[{"beatId":"...","narration":"可选的新旁白","memory":"可选的简短新摘要","dialogue":[{"index":0,"text":"可选的新台词，<=40字","knowledgeRefs":[]}]}]}。对白的index从0开始。没有听见的人只能询问、推测或说自己已知的事，不能假装知道秘密。没有move的人不要写他走动。不要添加道具或新事件，不复述原著。保留其余内容。`,{story:{beats:story.beats},issues:review.issues,executionFacts,knowledgeAtEachBeat},job,'semantic-repair-'+reviewPass);
    for(let repairFormat=0;repairFormat<2;repairFormat++){
     try{const candidate=applyModelPatches(story,fixes,review.issues);auditGeneratedStory(candidate,stage,characters,cards);Object.assign(story,candidate);break;}
     catch(e){if(repairFormat===1)throw e;fixes=await callModel(key,`修复patches格式或执行错误，只输出 {"patches":[...]}。每个index必须是原有句子的从0开始编号，禁止增加句子或改说话人。不要输出输入story。`,{rejected:fixes,validationErrors:e.message,story:{beats:story.beats}},job,'semantic-format-'+reviewPass);}
    }
    auditGeneratedStory(story,stage,characters,cards);await save(join(dir,job.id,'draft.json'),story);
   }
   const audit=auditGeneratedStory(story,stage,characters,cards);if(audit.moves<1)throw Error('整场没有实际走位');
   job.message='提取本场实际决定与下一节点的个人记忆';await persist(job);
   const actualEvents=story.beats.flatMap(b=>b.dialogue.map((d,i)=>({eventId:b.id+':'+i,speaker:d.speaker,text:d.text})));
   let handoff, handoffReview, rejectedResolution=null, handoffErrors=null;
   for(let attempt=0;attempt<3;attempt++){
    const resolution=await callModel(key,`只提取实际对白形成的场末决定，输出JSON {"status":"depart/defer/alternative","nextNodeId":"允许的节点ID","party":["实际决定同行人物ID"],"purpose":"去做什么","approach":"怎样开口","departureCondition":"何时及前提","evidenceRefs":["从actualEvents.eventId原样选择"],"facts":[{"kind":"plan/promise/relationship/obstacle","text":"有证据的计划、承诺或事实","evidenceRefs":["从actualEvents.eventId原样选择"]}]}。本场未操作道具或交易，只谈未来，不能把拟备礼物、答应烙饼写成已有库存或resource。party是实际进入下一节点场景的人员，不是所有出过门的人；只送到路口就返回的半程送行者不能放入party，其承诺记在facts中。party不能默认板儿，只提取实际同意的人。引用必须如b1:0，禁止写b1、b1-d1或人名。拒绝稿有错误时按validationErrors修复，不修改剧本。`,{node,story,actualEvents,allowedNext:node.next.map(id=>nodeFor(storyline,id)),rejected:rejectedResolution,validationErrors:handoffErrors},job,'scene-handoff-'+attempt);
    try{
     handoff=buildHandoff(story,stage,characters,storyline,resolution);
     if(handoff.facts.some(f=>f.kind==='resource'))throw Error('本场没有道具交易执行，未来食物衣服只能记plan或promise，不能记resource库存');
     handoffReview=await callModel(key,`核对交接记录与actualEvents原句的实质一致性。这里所有decision字段都是已商议的未来计划：status=depart表示决定要出发，不是已经出发；departureCondition是计划时间和前提，写明早不等于声称已到明早；plan、promise也明确未完成。父母同意安排孩子同行足够，孩子说“去”就是愿意，不要求成人合同式措辞。party仅指到达下一节点的人员，半程送行后返回的人不能混入。检查名单与请求是否确有对话依据，是否凭空改成另一人，是否将承诺改成已经拿到钱或完成交易。不要纠缠一般润色、没有立即应答或句子措辞，后文的承诺可支持前文分工。只输出JSON {"passed":true或false,"issues":["最多4项具体实质矛盾"]}。无实质矛盾则passed=true、issues=[]。`,{actualEvents,handoff:{transition:handoff.transition,nextNodeId:handoff.nextNodeId,decision:Object.fromEntries(Object.entries(handoff.decision).filter(([k])=>k!=='knownBy')),facts:handoff.facts.map(({knownBy,...f})=>f)}},job,'handoff-review-'+attempt);
     if(handoffReview.passed!==true||!Array.isArray(handoffReview.issues)||handoffReview.issues.length)throw Error(JSON.stringify(handoffReview.issues));
     break;
    }catch(e){if(attempt===2)throw Error('场末决定尚未落实：'+e.message);rejectedResolution=resolution;handoffErrors=e.message;}
   }
   story.narrative.handoff=handoff;story.narrative.handoffReview=handoffReview;
   story.presentation=defaultPresentation(story);
   job.message='总控正在选择配乐、留白与过场';await persist(job);
   let musicErrors=null;
   for(let attempt=0;attempt<2;attempt++){
    const scoring=await callModel(key,`你是同一说书总控的声音编排环节。依据环境、实际剧情和音库标签选择国风纯音乐，可播放、暂停、续播或停止，也可有意留白。输出JSON {"cues":[{"section":"opening或某个beat.id或bridge","offset":0,"action":"play/pause/resume/stop","track":"仅play时填库内id","volume":0.22,"reason":"结合本段具体情境的选择理由"}],"bridgeText":"若有时间过场，用一句到两句交代略去时间，不总结对白，不宣称未演出的动作已做完；无过场填空字符串"}。pause保留曲目进度，resume续播，stop清空；无旧曲不能resume。最多8条指令，不按每句台词切歌，不在寒舍愁生计时配欢庆曲。曲目可一直延续，紧要对白可暂停；volume为0.12至0.28左右。桥段section仅当presentation确实有interludes时可用。不要输出URL，禁止人声朗读。`,{cards:cards.scene,story,presentation:story.presentation,audioLibrary,validationErrors:musicErrors},job,'soundtrack-'+attempt);
    try{
     story.soundtrack={version:1,cues:scoring.cues};
     if(story.presentation.interludes.length&&scoring.bridgeText){if(typeof scoring.bridgeText!=='string'||scoring.bridgeText.length>55)throw Error('过场文本须为55字内字符串');story.presentation.interludes[0].text=scoring.bridgeText;}
     compileSoundtrack(story,compilePresentation(story,compileStory(story,stage,characters)),audioLibrary);break;
    }catch(e){if(attempt===1)throw e;musicErrors=e.message;}
   }

   await save(join(dir,job.id,'next-node-context.json'),nextNodeContext(handoff,storyline,cards));
   story.generation={authoring:{dialogue:'DeepSeek Flash 原始生成及模型自动修订，无人工改写台词',cardsRevision:cards.revision,cardHash:hash(rawCards)},provider:'DeepSeek',model:MODEL,generatedAt:new Date().toISOString(),source:'live-api',jobId:job.id,calls:job.calls.map(c=>({responseId:c.responseId,model:c.model,phase:c.phase,usage:c.usage})),validation:{...audit,semanticReview:review}};
   await save(join(dir,job.id,'approved.json'),story);const temp=join(root,'.runtime/latest-story.tmp');await save(temp,story);await rename(temp,join(root,'.runtime/latest-story.json'));
   job.phase='ready';job.message='整场生成与检查完成，可以播放';job.validation=audit;await persist(job);
  }catch(e){job.phase='failed';job.message=String(e.message).slice(0,1500);await persist(job);}
  finally{active=null;controller=null;}
 }
 return {
  async status(){const saved=await latest();return {configured:hasCredential(),model:MODEL,active:active?jobs.get(active):null,latest:saved?{id:saved.id,generatedAt:saved.generation.generatedAt,beats:saved.beats.length}:null};},
  async start({beats=8,resumeFrom=null,reviewNotes=[]}={}){if(active)throw Error('已有生成任务在进行');if(!Number.isInteger(beats)||beats<6||beats>12)throw Error('段落数须为6至12');if(!hasCredential())throw Error('尚未配置本地密钥');if(!Array.isArray(reviewNotes)||reviewNotes.length>12||reviewNotes.some(n=>typeof n.beatId!=='string'||typeof n.reason!=='string'||n.reason.length>1000))throw Error('复核说明格式无效');let previous=null,resumeFile='draft.json';if(resumeFrom){if(!/^[a-f0-9-]{36}$/.test(resumeFrom))throw Error('任务ID无效');previous=await load(join(dir,resumeFrom,'status.json'));if(previous.phase!=='failed'&&!(previous.phase==='ready'&&reviewNotes.length))throw Error('只允许继续已终止任务或明确复核已生成版本');const currentCards=await load(join(root,'data/cards.json'));const currentStage=await load(join(root,'data/stage.json'));const currentStoryline=await load(join(root,'data/storyline.json'));if(previous.inputs.narrativeVersion!==NARRATIVE_VERSION||previous.inputs.storylineHash!==hash(currentStoryline)||previous.inputs.cardsHash!==hash(currentCards)||previous.inputs.stageHash!==hash(currentStage))throw Error('卡片或场景已改变，不能沿用旧草稿');if(previous.phase==='ready')resumeFile='approved.json';await load(join(dir,resumeFrom,resumeFile));beats=previous.total;if(reviewNotes.length){const saved=await latest();if(saved?.id===resumeFrom)await rename(join(root,'.runtime/latest-story.json'),join(dir,resumeFrom,'withheld-latest.json'));}}
   const job={id:randomUUID(),phase:'queued',total:beats,completed:previous?.completed||0,createdAt:new Date().toISOString(),message:previous?'继续检查已生成草稿':'准备生成',calls:previous?.calls||[],resumeFrom,resumeFile,reviewNotes};jobs.set(job.id,job);active=job.id;controller=new AbortController();await mkdir(join(dir,job.id),{recursive:true});await persist(job);void run(job);return job;},
  async job(id){if(jobs.has(id))return jobs.get(id);if(!/^[a-f0-9-]{36}$/.test(id))return null;try{const j=await load(join(dir,id,'status.json'));if(!['ready','failed'].includes(j.phase)){j.phase='failed';j.message='服务曾中断，本任务未自动重放';}return j;}catch{return null;}},
  latest,
  async nextContext(){const story=await latest();if(!story?.narrative?.handoff)return null;const [line,cards]=await Promise.all([load(join(root,'data/storyline.json')),load(join(root,'data/cards.json'))]);return nextNodeContext(story.narrative.handoff,line,cards);},
  cancel(){controller?.abort();},
 };
}
