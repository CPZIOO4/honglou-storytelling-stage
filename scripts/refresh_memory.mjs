import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readCredential} from '../backend/credentials.mjs';
import {modelRequest,THINKING,MODEL,MODEL_TIMEOUT_MS} from '../backend/model-config.mjs';
import {runtimeCards} from '../backend/card-context.mjs';
import {memoryEvidence,validateMemoryUpdate,mergeMemory,nextWritingContext} from '../backend/story-memory.mjs';
const root=new URL('../',import.meta.url),load=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const [story,raw,stage,characters,line]=await Promise.all(['.runtime/latest-story.json','data/cards.json','data/stage.json','data/characters.json','data/storyline.json'].map(load));
const sourceStoryId=story.id,id=randomUUID(),dir=new URL('.runtime/generations/'+id+'/',root);await mkdir(dir,{recursive:true});
const save=(name,data)=>writeFile(new URL(name,dir),JSON.stringify(data,null,2));
const skill=await readFile(new URL('skills/honglou-character-evolution/SKILL.md',root),'utf8'),key=await readCredential(),cards=runtimeCards(raw),evidence=memoryEvidence(story,stage,characters);
const decision=Object.fromEntries(Object.entries(story.narrative.handoff.decision).filter(([k])=>k!=='knownBy'));
const before=createHash('sha256').update(JSON.stringify(story.beats)).digest('hex');
let previousRejected=null;
if(process.argv[2]){if(!/^[a-f0-9-]{36}$/.test(process.argv[2]))throw Error('复核任务ID无效');const old='.runtime/generations/'+process.argv[2]+'/';const [u,r]=await Promise.all([load(old+'memory-refresh-response.json'),load(old+'memory-refresh-review-response.json')]);previousRejected={update:JSON.parse(u.content),review:JSON.parse(r.content)};}
async function call(phase,instruction,input){
 const system=instruction+'\n'+skill;await save(phase+'-request.json',{phase,...THINKING,system,input});
 const r=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(modelRequest(system,input)),signal:AbortSignal.timeout(MODEL_TIMEOUT_MS)});
 if(!r.ok)throw Error('DeepSeek HTTP '+r.status);const data=await r.json(),choice=data.choices?.[0];const receipt={phase,...THINKING,responseId:data.id,model:data.model,usage:data.usage,finishReason:choice?.finish_reason,content:choice?.message?.content};await save(phase+'-response.json',receipt);
 if(receipt.finishReason!=='stop')throw Error('记忆响应未完成，未替换当前演出');story.generation.calls.push({phase,...THINKING,responseId:data.id,model:data.model,usage:data.usage});return JSON.parse(receipt.content);
}
const update=await call('memory-refresh','重新提取这场已通过审核的剧情记忆，不改对白。若previousRejected有审核问题须全部修正。只输出JSON {"summary":"简短剧情因果和承诺，建议250字内，上限900字","evidenceRefs":["事件id"],"characters":[{"id":"人物id","memory":"建议100字内个人新经历，上限240字","evidenceRefs":["本人听见的事件id"]}]}。只记对后续有用的门路、顾虑、商议结果和未来承诺，不记叹气、坐姿、站姿或所处位置，不补对白未提及的具体求助对象。无实质新知识者可以省略。',{cards,evidence,decision,previousRejected});
validateMemoryUpdate(update,evidence,cards);
const review=await call('memory-refresh-review','核对两层文字记忆与对白。特别核对提议改为谁同行的缘由、送到城门口而非进府、尚未动身，以及不能将修辞记成真实坐姿。输出JSON {"passed":true或false,"issues":["具体问题"]}。',{cards,evidence,decision,update,execution:'全员站立，仅转向和表情；无坐姿、移交物品或交易。'});
if(review.passed!==true||!Array.isArray(review.issues)||review.issues.length)throw Error('记忆未通过：'+JSON.stringify(review.issues));
if(createHash('sha256').update(JSON.stringify(story.beats)).digest('hex')!==before)throw Error('对白动作被改动');
story.id=id;story.narrative.handoff.sourceStoryId=id;story.contextMemory=mergeMemory(null,update,story);story.memoryReview=review;story.generation.jobId=id;story.generation.generatedAt=new Date().toISOString();story.generation.memoryRevision={sourceStoryId,source:'live-api',dialogueAndActionHash:before};
await save('memory-evidence.json',{update,evidence});await save('approved.json',story);
await save('next-node-context.json',{status:'pending-playback',...await nextWritingContext(fileURLToPath(root),cards,line,story.narrative.handoff,story.contextMemory)});
const skills=Object.fromEntries(await Promise.all(['honglou-scene-pacing','honglou-character-evolution'].map(async name=>[name,await readFile(new URL('skills/'+name+'/SKILL.md',root),'utf8')]))),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
await save('status.json',{id,phase:'ready',message:'记忆复核完成，待播放确认',createdAt:new Date().toISOString(),total:story.beats.length,completed:story.beats.length,calls:story.generation.calls,inputs:{cardsHash:hash(raw),stageHash:hash(stage),storylineHash:hash(line),narrativeVersion:story.narrative.version,skillsHash:hash(skills)}});
await writeFile(new URL('.runtime/latest-story.tmp',root),JSON.stringify(story,null,2));await rename(new URL('.runtime/latest-story.tmp',root),new URL('.runtime/latest-story.json',root));
console.log(JSON.stringify({passed:true,id,sourceStoryId,unchangedDialogue:true,summary:story.contextMemory.summary}));
