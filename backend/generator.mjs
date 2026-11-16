import {loadProduction,latestPath,readLatest} from './productions.mjs';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {join} from 'node:path';
import {compileStory,stateAt,buildDirectorContext,personalKnowledge,along,distance} from '../src/engine.js';
import {readCredential,hasCredential} from './credentials.mjs';
import {NARRATIVE_VERSION,nodeFor,buildHandoff,stageScriptBeat,validateScreenplay} from './narrative.mjs';
import {defaultPresentation,compilePresentation} from '../src/presentation.js';
import {compileSoundtrack} from '../src/soundtrack.js';
import {validateFactRefs,runtimeCards} from './card-context.mjs';
import {MODEL,THINKING,MODEL_TIMEOUT_MS,modelRequest} from './model-config.mjs';
import {buildWritingContext,memoryEvidence,validateMemoryUpdate,mergeMemory,commitMemory,acceptedMemory,nextWritingContext} from './story-memory.mjs';
import {composeConversation,assertDialoguePreserved} from './conversation.mjs';
import {composePrologue} from './prologue.mjs';
export {MODEL};
const ORIGIN='https://api.deepseek.com';
const load=async p=>JSON.parse(await readFile(p,'utf8'));
const save=async(p,v)=>writeFile(p,JSON.stringify(v,null,2),'utf8');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const SYSTEM=`你是唯一说书总控的舞台编排环节。完整对白已由场次剧本确定，你不能重写或添加对白。只输出JSON {"blocking":{"narration":"<=100字，准确描述本段实际动作与说话，不写内心或未实现的动作","moves":[{"actor":"人物id","target":"站位名"}],"expressions":[{"actor":"人物id","value":"现有表情名"}],"camera":"可选镜头名"}}。
程序会把moves安排在本段开头，4秒完成；所有移动停止后才逐句说话，并自动转向第一收话人，按字数给足显示时间。因此不要给at/duration，不要重写剧本。无理由就不移动，不重复已有站位，不让两个人到同一站位。不要添加端碗、搀扶、坐下、拿衣裳等未支持动作。
context.currentState是实际站位。必须根据planStep.dialogue里的对象和方式，使对方确实听得见；悄悄话双方需同声区且距离<=0.9，普通交谈<=4.5。旁人靠近可能听见，不能用旁白冒充秘密。
站位以anchorDescriptions为准，不把屋中右侧说成桌旁，不把屋中后侧说成炕前；没move就不写走动。旁白可以简短交代说话态度，不必全是移动说明。场景以context.scene为准，人物名统一周瑞妻子。`;

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
   if(d.speaker==='baner'&&d.text.length>18)errors.push(`${b.id} 板儿只说眼前具体事情的短句，最多18字`);
   if(/[:：]/.test(d.text))errors.push(`${b.id} 口语对白不能含冒号或提纲标签`);
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
 async function latest(scene='home'){return readLatest(root,scene);}
 async function callModel(key,system,input,job,phase){
  const skill=job.skills[phase.startsWith('memory-')?'honglou-character-evolution':'honglou-scene-pacing'];
  system+='\n'+skill;
  const callId=randomUUID();await save(join(dir,job.id,callId+'-request.json'),{phase,model:MODEL,...THINKING,system,input});
  const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),MODEL_TIMEOUT_MS);const onAbort=()=>abort.abort();controller?.signal.addEventListener('abort',onAbort,{once:true});
  try{
   const response=await fetch(ORIGIN+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(modelRequest(system,input)),signal:abort.signal});
   const data=await response.json();if(!response.ok)throw Error(`DeepSeek HTTP ${response.status} (${data.error?.code||'request_failed'})`);
   const receipt={phase,...THINKING,responseId:data.id,model:data.model,usage:data.usage,finishReason:data.choices?.[0]?.finish_reason,content:data.choices?.[0]?.message?.content};job.calls.push({phase,responseId:data.id,model:data.model,...THINKING,usage:data.usage});await save(join(dir,job.id,callId+'-response.json'),receipt);
   if(receipt.finishReason!=='stop')throw Error('模型输出未完整结束，未自动重放请求');
   return JSON.parse(receipt.content);
  }catch(e){if(e.name==='AbortError')throw Error('模型请求超时或被取消；请求结果不确定，未自动重试');throw e;}
  finally{clearTimeout(timeout);controller?.signal.removeEventListener('abort',onAbort);}
 }
 async function persist(job){const {skills,...status}=job;await save(join(dir,job.id,'status.json'),status);}
 async function run(job){
  try{
   const production=await loadProduction(root,job.scene);const {rawCards,stage,characters,seed,storyline,audioLibrary,previousMemory,parent,nodeId}=production;if(parent?.id!==job.parentStoryId)throw Error('上场版本已改变，须重新选择分支');
   job.skills=Object.fromEntries(await Promise.all(['honglou-scene-pacing','honglou-character-evolution'].map(async name=>[name,await readFile(join(root,'skills',name,'SKILL.md'),'utf8')])));const cards=runtimeCards(rawCards);const key=await readCredential();job.inputs={cardsHash:hash(rawCards),stageHash:hash(stage),storylineHash:hash(storyline),narrativeVersion:NARRATIVE_VERSION,skillsHash:hash(job.skills)};
   const story=job.resumeFrom?await load(join(dir,job.resumeFrom,job.resumeFile||'draft.json')):{version:1,communicationVersion:1,id:job.id,title:rawCards.scene.title,subtitle:rawCards.scene.place,production:job.scene,castIds:characters.map(c=>c.id),cardsSnapshot:rawCards,carryover:parent?{parentStoryId:parent.id,branchId:previousMemory.branchId,parentRevision:previousMemory.revision,transition:rawCards.scene.initialSituation}:null,scene:stage.id,mode:'deepseek-generated',summary:'DeepSeek Flash 根据当前场景、人物与个人听闻生成的演出。',initial:seed.initial,beats:[]};story.id=job.id;delete story.generation;
   const node=nodeFor(storyline,nodeId);
   const compose=async(rejected=null,feedback=null)=>composeConversation({cards,context:buildWritingContext(cards,previousMemory,{node,handoff:parent?.narrative?.handoff}),rejected,feedback,ask:(system,input,phase)=>callModel(key,system,input,job,phase),onPhase:async message=>{job.phase='planning';job.message=message;await persist(job);}});
   if(!story.narrative||job.reviewNotes?.length){const result=await compose(story.narrative?.conversation||null,job.reviewNotes?.length?{reviewNotes:job.reviewNotes}:null);story.narrative={version:NARRATIVE_VERSION,nodeId:node.id,...result};story.beats=[];job.completed=0;job.total=result.plan.beats.length;await save(join(dir,job.id,'draft.json'),story);await persist(job);}
   validateScreenplay(story.narrative.plan,characters,12,cards);
   await save(join(dir,job.id,'draft.json'),story);
   const protocol={beatShape:{id:'唯一字符串',title:'短标题',duration:'12到55的数字',narration:'一到两句字符串',memory:'字符串',dialogue:[{at:5,until:14,speaker:'人物id',to:['对话对象id'],mode:'normal',text:'模型原创台词',knowledgeRefs:[]}],commands:[]},expression:['neutral','smile','thinking','sad','surprised','laugh'],commands:{move:['at','type','actor','target','duration'],face:['at','type','actor','target'],expression:['at','type','actor','value'],gesture:['at','type','actor','value','duration'],camera:['at','type','target'],lighting:['at','type','value'],visibility:['at','type','actor','value']},gestures:['nod','shake'],lighting:['day','night','dawn'],cameras:Object.keys(stage.cameras),anchors:stage.anchors,anchorDescriptions:stage.anchorDescriptions||{granny_home:'炕前偏右的家人站位',gouer_home:'屋中后侧、炕的右方',gouer_pace:'屋中右后侧，远离低语的母女',gouer_listen:'屋中靠前的交谈位',liushi_home:'屋中右侧，靠近门边',liushi_near:'屋中右侧交谈位，不是桌旁',whisper_guest:'刘姥姥旁的独立低语位，与granny_home间距约0.83米',room_center:'屋中活动空地',baner_near:'靠近刘姥姥的孩子站位',door_inside:'院门内侧',yard_entry:'门外小院',yard_end:'小院远端'},edges:stage.edges,acoustics:stage.acoustics};
   let review=null;
   for(let productionPass=0;productionPass<3;productionPass++){
   for(let i=story.beats.length;i<job.total;i++){
    if(controller.signal.aborted)throw Error('已取消生成');job.phase='generating';job.message=`Flash 正在生成第 ${i+1} / ${job.total} 段`;await persist(job);
    const actual=generationContext(cards,stage,characters,story);const context={scene:cards.scene,currentState:actual.currentState,recentStory:story.beats.map(b=>b.memory).join('。'),characters:cards.characters};const input={context,protocol,node,scenePlan:story.narrative.plan,planStep:story.narrative.plan.beats[i],segment:i+1,totalSegments:job.total,request:i===0?'从当前场景真实初态开场，解决本节点的问题；不重复上一场已经决定的分工。':i===job.total-1?'形成可交给下一节点的具体决定，同行成人须听见并回应；不自动切场。':'根据已发生的对白，实现本段的新变化；不要重复已经谈妥的问题。',quality:'走位应服务人物目的，不以走动或低语填时长。人物互相答话，可以反驳、讨价还价、拿定主意。'};
    let output=await callModel(key,SYSTEM,input,job,`beat-${i+1}`);let accepted=false;
    for(let attempt=0;attempt<3;attempt++){
     try{const normalized=stageScriptBeat(story.narrative.plan.beats[i],output.blocking);if(normalized?.id!==story.narrative.plan.beats[i].id)throw Error('本段ID必须使用planStep.id');const candidate={...story,beats:[...story.beats,normalized]};auditGeneratedStory(candidate,stage,characters,cards);story.beats.push(normalized);accepted=true;break;}
     catch(e){if(attempt===2)throw Error(`第${i+1}段三次校验未通过：${e.message}`);job.message=`第 ${i+1} 段正在修正对白与动作配合`;await persist(job);output=await callModel(key,SYSTEM,{...input,rejected:output,validationErrors:e.message,repair:'只修改本段blocking的站位、表情或旁白，不修改dialogue。输出完整blocking JSON。'},job,`beat-${i+1}-repair-${attempt+1}`);}
    }
    if(!accepted)throw Error('未得到可执行段落');job.completed=i+1;await save(join(dir,job.id,'draft.json'),story);await persist(job);
   }
   assertDialoguePreserved(story.narrative.conversation,story);
   job.phase='reviewing';job.message='对白锁定，核对实际听闻与动作呈现';await persist(job);
   const compiled=compileStory(story,stage,characters);
   const executionFacts=compiled.beats.map(b=>({beatId:b.id,narration:b.narration,moves:b.commands.filter(c=>c.type==='move').map(m=>({...m,targetDescription:protocol.anchorDescriptions[m.target],distanceToOthers:characters.filter(c=>c.id!==m.actor).map(c=>({actor:c.id,before:distance(stateAt(compiled,b.start).actors[m.actor].position,stateAt(compiled,b.start).actors[c.id].position),after:distance(stateAt(compiled,b.start+m.at+m.duration+.001).actors[m.actor].position,stateAt(compiled,b.start+m.at+m.duration+.001).actors[c.id].position)}))})),gestures:b.commands.filter(c=>c.type==='gesture'),expressions:b.commands.filter(c=>c.type==='expression'),dialogue:b.dialogue.map(d=>({speaker:d.speaker,text:d.text,to:d.to,heardBy:stateAt(compiled,b.start+d.at+.001).dialogue?.heardBy}))}));
   review=await callModel(key,'仅审核执行后的事实与知识边界。moves含站位描述与实际到他人距离的变化，距离减小即可以说走近，不要求站位ID含人名；gestures的nod/shake就是已执行的点头/摇头，不能因moves里没有而否认。连续对白已独立审核，不能任意润色或压缩。检查旁白是否声称未执行的移动、坐下、拿物，发话是否使用未听见的秘密或错误归属的关系。未来打算不是已经执行，修辞责备不代表实际坐姿。输出JSON {"passed":true或false,"issues":[{"beatId":"id","scope":"narration或dialogue","reason":"具体错误"}],"narrationPatches":[{"beatId":"id","narration":"只修正不符动作的旁白"}]}。无问题issues为空。不得用旁白修补缺失的决定或人物回应。', {cards,executionFacts},job,'execution-review-'+productionPass);
   await save(join(dir,job.id,'execution-review.json'),review);
   if(review.passed===true&&Array.isArray(review.issues)&&!review.issues.length)break;
   if(!Array.isArray(review.issues)||!review.issues.length)throw Error('执行审核格式错误');
   if(review.issues.every(i=>i.scope==='narration')&&Array.isArray(review.narrationPatches)&&review.narrationPatches.length){
    for(const patch of review.narrationPatches){const b=story.beats.find(b=>b.id===patch.beatId);if(!b||typeof patch.narration!=='string')throw Error('旁白修订无效');b.narration=patch.narration;}
    auditGeneratedStory(story,stage,characters,cards);assertDialoguePreserved(story.narrative.conversation,story);
    if(productionPass===2)throw Error('旁白修订仍需复核，未发布');
    await save(join(dir,job.id,'draft.json'),story);continue;
   }
   if(productionPass===1)throw Error('执行后的内容未通过：'+JSON.stringify(review.issues));
   const result=await compose(story.narrative.conversation,{executionIssues:review.issues});
   story.narrative={version:NARRATIVE_VERSION,nodeId:node.id,...result};story.beats=[];job.completed=0;job.total=result.plan.beats.length;
   validateScreenplay(result.plan,characters,12,cards);await save(join(dir,job.id,'draft.json'),story);
   }
   assertDialoguePreserved(story.narrative.conversation,story);
   const audit=auditGeneratedStory(story,stage,characters,cards);
   job.message='提取本场实际决定与下一节点的个人记忆';await persist(job);
   const actualEvents=story.beats.flatMap(b=>b.dialogue.map((d,i)=>({eventId:b.id+':'+i,speaker:d.speaker,text:d.text})));
   let handoff, handoffReview, rejectedResolution=null, handoffErrors=null;
   for(let attempt=0;attempt<3;attempt++){
    const resolution=await callModel(key,`只提取实际对白形成的场末决定，输出JSON {"status":"depart/defer/alternative","nextNodeId":"允许的节点ID","party":["实际决定同行人物ID"],"purpose":"去做什么","approach":"怎样开口","departureCondition":"何时及前提","evidenceRefs":["从actualEvents.eventId原样选择"],"facts":[{"kind":"plan/promise/relationship/obstacle","text":"有证据的计划、承诺或事实","evidenceRefs":["从actualEvents.eventId原样选择"]}]}。本场未操作道具或交易，只谈未来，不能把拟备礼物、答应烙饼写成已有库存或resource。party是实际进入下一节点场景的人员，不是所有出过门的人；只送到路口就返回的半程送行者不能放入party，其承诺记在facts中。party不能默认板儿，只提取实际同意的人。引用必须如b1:0，禁止写b1、b1-d1或人名。拒绝稿有错误时按validationErrors修复，不修改剧本。`,{node,story,actualEvents,allowedNext:node.next.map(id=>nodeFor(storyline,id)),rejected:rejectedResolution,validationErrors:handoffErrors},job,'scene-handoff-'+attempt);
    try{
     handoff=buildHandoff(story,stage,characters,storyline,resolution);
     if(handoff.facts.some(f=>f.kind==='resource'))throw Error('本场没有道具交易执行，未来食物衣服只能记plan或promise，不能记resource库存');
     handoffReview=await callModel(key,`核对交接记录与actualEvents原句的实质一致性。这里所有decision字段都是已商议的未来计划：status=depart表示决定要出发，不是已经出发；departureCondition是计划时间和前提，写明早不等于声称已到明早；plan、promise也明确未完成。父母同意安排孩子同行足够，不要给孩子安排正式表决，不要求儿童发言。party仅指到达下一节点的人员，半程送行后返回的人不能混入。检查名单与请求是否确有对话依据，是否凭空改成另一人，是否将承诺改成已经拿到钱或完成交易。不要纠缠一般润色、没有立即应答或句子措辞，后文的承诺可支持前文分工。只输出JSON {"passed":true或false,"issues":["最多4项具体实质矛盾"]}。无实质矛盾则passed=true、issues=[]。`,{actualEvents,handoff:{transition:handoff.transition,nextNodeId:handoff.nextNodeId,decision:Object.fromEntries(Object.entries(handoff.decision).filter(([k])=>k!=='knownBy')),facts:handoff.facts.map(({knownBy,...f})=>f)}},job,'handoff-review-'+attempt);
     if(handoffReview.passed!==true||!Array.isArray(handoffReview.issues)||handoffReview.issues.length)throw Error(JSON.stringify(handoffReview.issues));
     break;
    }catch(e){if(attempt===2)throw Error('场末决定尚未落实：'+e.message);rejectedResolution=resolution;handoffErrors=e.message;}
   }
   story.narrative.handoff=handoff;story.narrative.handoffReview=handoffReview;
   job.message='为当前场景写开场背景';await persist(job);
   story.prologue=await composePrologue({cards,ask:(system,input,phase)=>callModel(key,system,input,job,phase)});
   story.presentation=defaultPresentation(story);
   job.message='总控正在选择配乐、留白与过场';await persist(job);
   let musicErrors=null;
   for(let attempt=0;attempt<2;attempt++){
    const scoring=await callModel(key,`你是同一说书总控的声音编排环节。依据环境、实际剧情和音库标签选择国风纯音乐，可播放、暂停、续播或停止，也可有意留白。输出JSON {"cues":[{"section":"opening或prologue或某个beat.id或bridge","offset":0,"action":"play/pause/resume/stop","track":"仅play时填库内id","volume":0.22,"reason":"结合本段具体情境的选择理由"}],"bridgeText":"若有时间过场，用一句到两句交代略去时间，不总结对白，不宣称未演出的动作已做完；无过场填空字符串"}。pause保留曲目进度，resume续播，stop清空；无旧曲不能resume。最多8条指令，不按每句台词切歌，不在寒舍愁生计时配欢庆曲。曲目可一直延续，紧要对白可暂停；volume为0.12至0.28左右。桥段section仅当presentation确实有interludes时可用。不要输出URL，禁止人声朗读。`,{cards:cards.scene,story,presentation:story.presentation,audioLibrary,validationErrors:musicErrors},job,'soundtrack-'+attempt);
    try{
     story.soundtrack={version:1,cues:scoring.cues};
     if(story.presentation.interludes.length&&scoring.bridgeText){if(typeof scoring.bridgeText!=='string'||scoring.bridgeText.length>55)throw Error('过场文本须为55字内字符串');story.presentation.interludes[0].text=scoring.bridgeText;}
     compileSoundtrack(story,compilePresentation(story,compileStory(story,stage,characters)),audioLibrary);break;
    }catch(e){if(attempt===1)throw e;musicErrors=e.message;}
   }

   job.message='压缩剧情摘要与各人的新经历，核对个人听闻';await persist(job);
   const turnMap=Object.fromEntries(story.beats.flatMap(b=>b.dialogue.map((d,i)=>[d.sourceTurnId,b.id+':'+i])));const conversationThreads=story.narrative.dialogueReview.concerns.map(c=>({raisedAt:turnMap[c.raisedAt],responseAt:c.responseAt.map(id=>turnMap[id]),kind:c.kind,status:c.status}));
   const evidence=memoryEvidence(story,stage,characters);let memoryUpdate,memoryReview,memoryErrors=null;
   for(let attempt=0;attempt<3;attempt++){
    memoryUpdate=await callModel(key,'生成本场待确认记忆。个人记录使用人物姓名作主语的第三人称；每项是谁说的、谁听见的须对照evidence.events.speaker，不能把听见的发问记成自己问过。若提议后来改变，旧提议只写成最初提过，当前承诺采用最后说定的版本，并交代改变原因；不能把等待和送到即返并列为同时有效。若有rejected，保留其中无误的内容，只修validationErrors指出的问题，再输出完整对象。除决定结果外，还须保留主要顾虑、回应及改变人选的实际原因，未解决的顾虑保持未解决，不用摘要补对白缺口。只输出JSON {"summary":"900字内剧情因果与未兑现承诺","evidenceRefs":["本场事件id"],"characters":[{"id":"人物id","memory":"240字内本人动态经历","evidenceRefs":["本人确实听见的本场事件id"]}]}。无新经历的人省略。保留姓名与既定性格，仅补经历。previousMemory若存在，summary须保留其中尚有效的目的和未兑现承诺并加入本场变化；角色memory整合本人的旧经历与新听闻。新增信息引用本场事件，旧信息来自对应个人旧卡；不复制其他分支、不把总控摘要写入不知情者。', {cards,previousMemory,evidence,conversationThreads,rejected:memoryUpdate||null,decision:Object.fromEntries(Object.entries(handoff.decision).filter(([k])=>k!=='knownBy')),validationErrors:memoryErrors},job,'memory-update-'+attempt);
    try{
     validateMemoryUpdate(memoryUpdate,evidence,cards);
     memoryReview=await callModel(key,'只审核update中的摘要与动态卡，逐条对照真实对白及previousMemory。cards、evidence和conversationThreads是输入依据或索引，不是本次待审输出，不能把输入索引的格式意见当作update失败。以evidence.events原句为准。逐个核对每句话是谁提出、谁回应，人物听见不等于自己说过。计划前后调整时检查是否清楚标明先后及理由，不能把被替代的旧提议与最终承诺并列。检查同行者、拒绝范围、改变原因、计划未完成、儿童理解能力、私语边界。不能把只送村口写成进府，也不能将总控摘要泄露到不知情人物卡。输出JSON {"passed":true或false,"issues":["具体问题"]}。', {cards,previousMemory,evidence,conversationThreads,update:memoryUpdate,decision:Object.fromEntries(Object.entries(handoff.decision).filter(([k])=>k!=='knownBy'))},job,'memory-review-'+attempt);
     if(memoryReview.passed!==true||!Array.isArray(memoryReview.issues)||memoryReview.issues.length)throw Error(JSON.stringify(memoryReview.issues));break;
    }catch(e){if(attempt===2)throw e;memoryErrors=e.message;}
   }
   story.contextMemory=mergeMemory(previousMemory,memoryUpdate,story);story.memoryReview=memoryReview;
   await save(join(dir,job.id,'memory-evidence.json'),{update:memoryUpdate,evidence});
   await save(join(dir,job.id,'next-node-context.json'),{status:'pending-playback',...await nextWritingContext(root,cards,storyline,handoff,story.contextMemory)});
   story.generation={authoring:{dialogue:'DeepSeek Flash 原始生成及模型自动修订，无人工改写台词',cardsRevision:cards.revision,cardHash:hash(rawCards)},provider:'DeepSeek',model:MODEL,...THINKING,generatedAt:new Date().toISOString(),source:'live-api',jobId:job.id,calls:job.calls.map(c=>({responseId:c.responseId,model:c.model,phase:c.phase,thinking:c.thinking,reasoning_effort:c.reasoning_effort,usage:c.usage})),validation:{...audit,semanticReview:review}};
   if(parent&&(await latest('home'))?.id!==parent.id)throw Error('第一场版本已变更，第二场未发布');
   await save(join(dir,job.id,'approved.json'),story);const target=latestPath(root,job.scene),temp=target+'.tmp';await save(temp,story);await rename(temp,target);
   job.phase='ready';job.message='整场生成与检查完成，可以播放';job.validation=audit;await persist(job);
  }catch(e){job.phase='failed';job.message=String(e.message).slice(0,1500);await persist(job);}
  finally{active=null;controller=null;}
 }
 return {
  async status(scene='home'){const saved=await latest(scene);const parent=scene==='gate'?await latest('home'):null;const {skills,...publicJob}=jobs.get(active)||{};return {configured:hasCredential(),model:MODEL,scene,stale:!!(saved&&parent&&saved.carryover?.parentStoryId!==parent.id),active:active?publicJob:null,latest:saved?{id:saved.id,generatedAt:saved.generation.generatedAt,beats:saved.beats.length}:null};},
  async start({scene='home',beats=4,resumeFrom=null,reviewNotes=[]}={}){if(active)throw Error('已有生成任务在进行');if(!Number.isInteger(beats)||beats<2||beats>12)throw Error('段落预算须为2至12');if(!hasCredential())throw Error('尚未配置本地密钥');if(!Array.isArray(reviewNotes)||reviewNotes.length>12||reviewNotes.some(n=>typeof n.beatId!=='string'||typeof n.reason!=='string'||n.reason.length>1000))throw Error('复核说明格式无效');const selected=await loadProduction(root,scene);let previous=null,resumeFile='draft.json';if(resumeFrom){if(!/^[a-f0-9-]{36}$/.test(resumeFrom))throw Error('任务ID无效');previous=await load(join(dir,resumeFrom,'status.json'));if(previous.phase!=='failed'&&!(previous.phase==='ready'&&reviewNotes.length))throw Error('只允许继续已终止任务或明确复核已生成版本');if((previous.scene||'home')!==scene||previous.parentStoryId!==selected.parent?.id)throw Error('不能跨场景或跨上场分支恢复');const currentCards=selected.rawCards;const currentStage=selected.stage;const currentStoryline=await load(join(root,'data/storyline.json'));if(previous.inputs.narrativeVersion!==NARRATIVE_VERSION||previous.inputs.storylineHash!==hash(currentStoryline)||previous.inputs.cardsHash!==hash(currentCards)||previous.inputs.stageHash!==hash(currentStage))throw Error('卡片或场景已改变，不能沿用旧草稿');if(previous.phase==='ready')resumeFile='approved.json';await load(join(dir,resumeFrom,resumeFile));const currentSkills=Object.fromEntries(await Promise.all(['honglou-scene-pacing','honglou-character-evolution'].map(async name=>[name,await readFile(join(root,'skills',name,'SKILL.md'),'utf8')])));if(previous.inputs.skillsHash!==hash(currentSkills))throw Error('技能已改变，须开启新分支');beats=previous.total;if(reviewNotes.length){const saved=await latest(scene);if(saved?.id===resumeFrom){await save(join(root,'.runtime/withheld-'+scene+'.json'),{storyId:resumeFrom});await rename(latestPath(root,scene),join(dir,resumeFrom,'withheld-latest.json')).catch(e=>{if(e.code!=='ENOENT')throw e;});}}}
   const job={id:randomUUID(),scene,parentStoryId:selected.parent?.id,phase:'queued',total:beats,completed:previous?.completed||0,createdAt:new Date().toISOString(),message:previous?'继续检查已生成草稿':'准备生成',calls:previous?.calls||[],resumeFrom,resumeFile,reviewNotes};jobs.set(job.id,job);active=job.id;controller=new AbortController();await mkdir(join(dir,job.id),{recursive:true});await persist(job);void run(job);return job;},
  async job(id){if(jobs.has(id)){const {skills,...publicJob}=jobs.get(id);return publicJob;}if(!/^[a-f0-9-]{36}$/.test(id))return null;try{const j=await load(join(dir,id,'status.json'));if(!['ready','failed'].includes(j.phase)){j.phase='failed';j.message='服务曾中断，本任务未自动重放';}return j;}catch{return null;}},
  latest,
  async complete(storyId,scene='home'){const story=await latest(scene);if(scene==='gate'&&story?.carryover?.parentStoryId!==(await latest('home'))?.id)throw Error('上场分支已改变，不能确认旧版第二场');if(story?.id!==storyId)throw Error('只能确认当前通过审核的版本');return commitMemory(root,story);},
  async nextContext(scene='home'){const story=await latest(scene);if(scene==='gate'&&story&&story.carryover?.parentStoryId!==(await latest('home'))?.id)return {status:'stale',message:'上场分支已改变，须重新生成第二场'};if(!story?.narrative?.handoff)return null;const memory=await acceptedMemory(root,story.id);if(!memory)return {status:'pending-playback',message:'当前版本尚未播放完成，未写入已演剧情。'};const [line,raw]=await Promise.all([load(join(root,'data/storyline.json')),load(join(root,'data/cards.json'))]);const cards=runtimeCards(story.cardsSnapshot||raw);return {status:'accepted',branchId:memory.branchId,...await nextWritingContext(root,cards,line,story.narrative.handoff,memory)};},
  cancel(){controller?.abort();},
 };
}
