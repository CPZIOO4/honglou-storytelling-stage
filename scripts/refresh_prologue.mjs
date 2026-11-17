import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {readCredential} from '../backend/credentials.mjs';
import {modelRequest,THINKING,MODEL_TIMEOUT_MS} from '../backend/model-config.mjs';
import {loadProduction,latestPath} from '../backend/productions.mjs';
import {composePrologue} from '../backend/prologue.mjs';
import {compileStory} from '../src/engine.js';
import {compilePresentation,defaultPresentation} from '../src/presentation.js';
import {compileSoundtrack} from '../src/soundtrack.js';
import {nextWritingContext} from '../backend/story-memory.mjs';
import {runtimeCards} from '../backend/card-context.mjs';
const root=process.cwd(),scene=process.argv[2]||'home',read=async p=>JSON.parse(await readFile(p,'utf8')),save=async(p,v)=>writeFile(p,JSON.stringify(v,null,2)+'\n'),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const old=await read(latestPath(root,scene)),p=await loadProduction(root,scene);
if(old.carryover?.parentStoryId!==p.parent?.id||old.generation.authoring.cardHash!==hash(p.rawCards))throw Error('Current inputs changed');
const id=randomUUID(),dir='.runtime/generations/'+id;await mkdir(dir,{recursive:true});
const status={...await read('.runtime/generations/'+old.generation.jobId+'/status.json'),id,phase:'reviewing',createdAt:new Date().toISOString(),message:'重新生成并审核开场旁白，保留演出与个人记忆',resumeFrom:old.id,revisionScope:'prologue-only'};
await save(dir+'/status.json',status);await save(dir+'/source-approved.json',old);
const story=structuredClone(old),key=await readCredential(),skill=await readFile('skills/honglou-scene-pacing/SKILL.md','utf8');
const cards=runtimeCards(p.rawCards);
async function ask(system,input,phase){
 const call=randomUUID();system+='\n'+skill;await save(dir+'/'+call+'-request.json',{phase,model:'deepseek-flash',...THINKING,system,input});
 const response=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(modelRequest(system,input)),signal:AbortSignal.timeout(MODEL_TIMEOUT_MS)});
 if(!response.ok)throw Error('DeepSeek HTTP '+response.status);
 const r=await response.json(),choice=r.choices?.[0],receipt={phase,...THINKING,responseId:r.id,model:r.model,usage:r.usage,finishReason:choice?.finish_reason,content:choice?.message?.content};await save(dir+'/'+call+'-response.json',receipt);
 if(receipt.finishReason!=='stop')throw Error('Incomplete output; no automatic replay');
 status.calls.push({phase,responseId:r.id,model:r.model,...THINKING,usage:r.usage});return JSON.parse(receipt.content);
}
try{
 story.prologue=await composePrologue({cards,ask});story.presentation={...story.presentation,prologue:defaultPresentation(story).prologue};
 story.id=id;story.contextMemory.sourceStoryId=id;
 // All enacted events and private memories are unchanged; accepted old history is kept.
 story.generation={...old.generation,jobId:id,generatedAt:new Date().toISOString(),calls:status.calls,prologueRevision:{sourceStoryId:old.id,scope:'Only model-authored prologue; dialogue, blocking, handoff and private memories preserved'}};
 const compiled=compileStory(story,p.stage,p.characters),timeline=compilePresentation(story,compiled);compileSoundtrack(story,timeline,p.audioLibrary);
 if(JSON.stringify(story.beats)!==JSON.stringify(old.beats)||JSON.stringify(story.narrative)!==JSON.stringify(old.narrative))throw Error('Performance unexpectedly changed');
 const fresh=await loadProduction(root,scene);if(hash(fresh.rawCards)!==hash(p.rawCards)||hash(fresh.stage)!==hash(p.stage)||fresh.parent?.id!==p.parent?.id||(await read(latestPath(root,scene))).id!==old.id)throw Error('Parent or cards changed during refinement');
 await save(dir+'/approved.json',story);await save(dir+'/draft.json',story);await save(dir+'/next-node-context.json',{status:'pending-playback',...await nextWritingContext(root,runtimeCards(story.cardsSnapshot),p.storyline,story.narrative.handoff,story.contextMemory)});
 status.phase='ready';status.message='旁白校订通过，演出内容保留，待重新播放确认';await save(dir+'/status.json',status);
 await save(latestPath(root,scene)+'.tmp',story);await rename(latestPath(root,scene)+'.tmp',latestPath(root,scene));
 console.log(JSON.stringify({id,prologue:story.prologue.text,duration:timeline.duration,dialogueAndBlockingUnchanged:true}));
}catch(e){status.phase='failed';status.message=e.message;await save(dir+'/status.json',status);throw e;}
