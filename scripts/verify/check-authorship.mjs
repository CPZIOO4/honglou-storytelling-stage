import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const registry=JSON.parse(await readFile('data/productions.json','utf8'));const scene=Object.hasOwn(registry,process.argv[2])?process.argv[2]:'home';const read=async p=>JSON.parse(await readFile(p,'utf8'));const story=await read(scene==='home'?'.runtime/latest-story.json':`.runtime/latest-${scene}.json`).catch(e=>{if(e.code!=='ENOENT')throw e;return read(registry[scene].story);});
const ids=new Set(story.generation.calls.map(c=>c.responseId)),texts=new Map();
function collect(v,receipt){if(!v||typeof v!=='object')return;if(typeof v.text==='string')texts.set(v.text,{responseId:receipt.responseId,phase:receipt.phase});for(const value of Object.values(v))collect(value,receipt);}
for(const dir of await readdir('.runtime/generations',{withFileTypes:true})){if(!dir.isDirectory())continue;for(const f of await readdir('.runtime/generations/'+dir.name)){if(!f.endsWith('-response.json'))continue;const r=await read('.runtime/generations/'+dir.name+'/'+f);if(!ids.has(r.responseId)||r.finishReason!=='stop')continue;try{collect(JSON.parse(r.content),r);}catch{}}}
const evidence=story.beats.flatMap(b=>b.dialogue.map((d,i)=>({eventId:b.id+':'+i,speaker:d.speaker,text:d.text,source:texts.get(d.text)||null})));
const cardHash=createHash('sha256').update(JSON.stringify(story.cardsSnapshot||await read('data/cards/home.json'))).digest('hex');
const prologueEvidence=story.prologue?{text:story.prologue.text,source:texts.get(story.prologue.text)||null}:null;
if(prologueEvidence&&!prologueEvidence.source)throw Error('开场文字没有对应的真实模型响应');
if(evidence.some(e=>!e.source)||story.generation.presentationRevision||story.generation.editorialReview||cardHash!==story.generation.authoring.cardHash)throw Error('台词来源或运行卡哈希不一致');
await writeFile('qa/model-authorship-'+scene+'.json',JSON.stringify({passed:true,storyId:story.id,cardHash,evidence,prologueEvidence},null,2));console.log(JSON.stringify({passed:true,dialogues:evidence.length,matchedModelResponses:evidence.filter(e=>e.source).length,prologueMatched:prologueEvidence?!!prologueEvidence.source:null,cardHashMatched:true}));
