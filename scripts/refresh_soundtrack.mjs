import {THINKING,MODEL_TIMEOUT_MS,modelRequest} from '../backend/model-config.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {readCredential} from '../backend/credentials.mjs';
import {compileStory} from '../src/engine.js';
import {defaultPresentation,compilePresentation} from '../src/presentation.js';
import {compileSoundtrack} from '../src/soundtrack.js';
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const [story,cards,library,stage,characters]=await Promise.all(['.runtime/latest-story.json','data/cards.json','data/audio-library.json','data/stage.json','data/characters.json'].map(read));
const hash=()=>createHash('sha256').update(JSON.stringify(story.beats)).digest('hex'),before=hash();
const presentation=defaultPresentation(story);const system='你是这场说书演出的总控。只编排声音与略去时间的过场，不改人物对白。只输出JSON顶层cues和bridgeText。cues格式[{section:"opening或beat.id或bridge",offset:0,action:"play/pause/resume/stop",track:"play时的库内ID",volume:0.16,reason:"为何适合此段"}]。曲目来自audioLibrary；寒舍生计不要配喜庆曲。可保留已有配乐选择，也可留白；不要每句换歌。pause保留进度，resume续播。bridgeText用55字内交代一夜过去、天明，不总结对白、不声称未演出的取物、出发或抵达动作已经完成。不要输出story/cards或包装字段。';
const input={scene:cards.scene,beats:story.beats.map(b=>({id:b.id,dialogue:b.dialogue,memory:b.memory})),decision:story.narrative.handoff.decision,presentation,existing:story.soundtrack,audioLibrary:library};
const id=randomUUID(),dir=new URL('.runtime/audio-revisions/'+id+'/',root);await mkdir(dir,{recursive:true});await writeFile(new URL('request.json',dir),JSON.stringify({...THINKING,system,input},null,2));
const key=await readCredential();const response=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(modelRequest(system,input)),signal:AbortSignal.timeout(MODEL_TIMEOUT_MS)});
if(!response.ok)throw Error('DeepSeek HTTP '+response.status);const result=await response.json();const receipt={...THINKING,responseId:result.id,model:result.model,usage:result.usage,finishReason:result.choices?.[0]?.finish_reason,content:result.choices?.[0]?.message?.content};await writeFile(new URL('response.json',dir),JSON.stringify(receipt,null,2));if(receipt.finishReason!=='stop')throw Error('配乐响应不完整，保留原版');
const score=JSON.parse(receipt.content);story.presentation=presentation;if(presentation.interludes.length){if(typeof score.bridgeText!=='string'||!score.bridgeText||score.bridgeText.length>55)throw Error('过场格式不合法');presentation.interludes[0].text=score.bridgeText;}
story.soundtrack={version:1,cues:score.cues};compileSoundtrack(story,compilePresentation(story,compileStory(story,stage,characters)),library);if(hash()!==before)throw Error('对白动作意外变动');
story.generation.calls.push({phase:'soundtrack-refresh',...THINKING,responseId:receipt.responseId,model:receipt.model,usage:receipt.usage});story.generation.audioRevision={id,source:'live-api',dialogueAndActionHashBefore:before,dialogueAndActionHashAfter:hash()};
await writeFile(new URL('.runtime/latest-story.json',root),JSON.stringify(story,null,2));await writeFile(new URL('approved.json',dir),JSON.stringify(story,null,2));console.log(JSON.stringify({model:receipt.model,dialogueUnchanged:true,cues:score.cues,bridge:score.bridgeText},null,2));
