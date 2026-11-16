import {readFile,mkdir,writeFile,link,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {compileStory,personalKnowledge} from '../src/engine.js';

export const MEMORY_LIMITS={summary:900,character:240,recent:600};
const plain=(s,max,label)=>{if(typeof s!=='string'||s.length>max||/[{}]|"(?:commands|duration|eventId)"/.test(s))throw Error(label+'必须是预算内的剧情文字');return s;};
export function memoryEvidence(story,stage,characters){
 const c=compileStory(story,stage,characters),heard=personalKnowledge(c,c.duration);
 return {events:c.beats.flatMap(b=>b.dialogue.map((d,i)=>({id:b.id+':'+i,speaker:d.speaker,text:d.text}))),heardBy:Object.fromEntries(characters.map(a=>[a.id,heard[a.id].map(e=>e.eventId)]))};
}
export function validateMemoryUpdate(update,evidence,cards){
 if(!update||Object.keys(update).some(k=>!['summary','evidenceRefs','characters'].includes(k)))throw Error('记忆只允许summary、evidenceRefs和characters');
 plain(update.summary,MEMORY_LIMITS.summary,'剧情摘要');if(!update.summary.trim())throw Error('剧情摘要不能为空');
 const ids=new Set(evidence.events.map(e=>e.id));
 const refs=(v,allowed)=>{if(!Array.isArray(v)||!v.length||v.some(x=>!allowed.has(x)))throw Error('记忆引用了未发生或本人未听见的事件');};
 refs(update.evidenceRefs,ids);
 if(!Array.isArray(update.characters)||new Set(update.characters.map(c=>c.id)).size!==update.characters.length)throw Error('动态人物卡格式无效');
 for(const c of update.characters){if(!cards.characters.some(a=>a.id===c.id)||Object.keys(c).some(k=>!['id','memory','evidenceRefs'].includes(k)))throw Error('不得改动人物稳定字段');plain(c.memory,MEMORY_LIMITS.character,'人物经历');refs(c.evidenceRefs,new Set(evidence.heardBy[c.id]||[]));}
 // This executor supports standing sprites, not sitting. Rhetorical speech is
 // not evidence of a physical pose; reject the common leakage into summaries.
 if([update.summary,...update.characters.map(c=>c.memory)].some(s=>/(?:狗儿|刘姥姥|刘氏|他|她)(?:先|正|仍)?坐(?:着|在|下)/.test(s)))throw Error('台词修辞不能记成已执行的坐姿；摘要只记催促、顾虑、门路和决定');
 return update;
}
export function mergeMemory(previous,update,story){
 // Bounded replacement, never append renderer records. Earlier drafts use other branches.
 const dynamic={...previous?.characters};for(const c of update.characters)dynamic[c.id]=c.memory;
 const lines=story.beats.flatMap(b=>b.dialogue.map(d=>`${d.speaker}说：“${d.text}”`));let recent='';
 for(const line of lines.reverse()){if((line+'\n'+recent).length>MEMORY_LIMITS.recent)break;recent=line+'\n'+recent;}
 return {version:1,branchId:previous?.branchId||story.id,revision:(previous?.revision||0)+1,sourceStoryId:story.id,summary:update.summary,characters:dynamic,recentDialogue:recent.trim()};
}
export function decisionText(handoff){
 if(!handoff)return '';
 const d=handoff.decision;return `本场已商议，尚未实际旅行。前往下一处的人为${d.party.join('、')||'尚未决定'}。目的为${d.purpose}。开口方式为${d.approach}。出发条件为${d.departureCondition}。${handoff.facts.map(f=>f.text).join('；')}`;
}
export function buildWritingContext(cards,memory=null,{node=null,handoff=null}={}){
 const topic=[node?.question,node?.requiredChange,cards.scene.initialSituation,memory?.summary].filter(Boolean).join('\n');
 const lore=(cards.worldbook||[]).filter(e=>e.keys.some(k=>topic.includes(k))).map(e=>e.content).join('\n');
 return ['【当前场景】',JSON.stringify(cards.scene),'【稳定人物卡与各自动态经历】',...cards.characters.map(c=>`${JSON.stringify(c)}\n${c.name}的动态经历：${memory?.characters?.[c.id]||'尚无本轮经历。'}`),'【关系与知识归属】',JSON.stringify(cards.relationshipFacts||[]),'【相关世界信息】',lore,'【剧情摘要，仅供总控，不是共享知识】',memory?.summary||'这是新分支的开头，尚无已演剧情。','【承接决定，不得重置】',decisionText(handoff),'【近期对白，仅供总控追踪，角色知识以个人卡为准】',memory?.recentDialogue||'','【本场问题】',node?.question||'','【临近输出提醒】','人物只按自己的知识与承诺开口。提议不等于同意，承诺不等于完成。姓名、身份、核心性格不能被动态经历覆盖。已定之事无新原因不再商议。'].join('\n');
}
export async function nextWritingContext(root,cards,line,handoff,memory){
 const node=line.nodes.find(n=>n.id===handoff.nextNodeId);if(!node)throw Error('未知承接节点');
 const files={SC01_JM:'01_荣府角门.md',SC11_HJ:'11_荣府后街.md',SC12_ZRZ:'12_周瑞妻子住处.md',SC13_DT:'13_候见倒厅与院落.md',SC14_FJZF:'14_王熙凤正房.md'};
 const sceneId=node.scenes[0],file=files[sceneId];let scene=cards.scene;
 if(file){const source=await readFile(join(root,'cards/environment',file),'utf8');const section=name=>{const start=source.indexOf('## '+name+'\n'),crlf=source.indexOf('## '+name+'\r\n');const at=Math.max(start,crlf);if(at<0)return '';const body=source.slice(at+name.length+3);return body.split(/\r?\n## /)[0].replace(/```/g,'').trim();};
  // Import descriptive data, not source-card instructions or a fixed original plot.
  scene={id:sceneId,title:section('name'),description:section('description').replaceAll('周瑞家的','周瑞妻子'),atmosphere:section('personality'),boundary:'下一场的候选环境；尚未到达。只承接已确认分支，不执行来源卡的预定剧情。'};
 }
 const active=handoff.decision.status==='depart'?handoff.decision.party:cards.characters.map(c=>c.id);
 const nextCards={...cards,scene,characters:cards.characters.filter(c=>active.includes(c.id)).map(c=>{
  if(node.id===line.entryNode)return c;
  // These roles describe the household scene. The next node inherits character
  // identity and experience, not a renewed instruction to decide who sets out.
  const {sceneRole,...stable}=c;const {atHome,agency,...performance}=stable.performance||{};return {...stable,performance};
 })};
 return {nextNodeId:node.id,sceneId,cast:active,prompt:buildWritingContext(nextCards,memory,{node,handoff})};
}
export async function commitMemory(root,story){
 if(!/^[a-f0-9-]{36}$/.test(story.id)||!story.contextMemory)throw Error('当前演出无可确认的剧情记忆');
 const dir=join(root,'.runtime/campaigns',story.id);await mkdir(dir,{recursive:true});const path=join(dir,'accepted.json'),temp=join(dir,randomUUID()+'.tmp');
 try{await writeFile(temp,JSON.stringify(story.contextMemory,null,2),{encoding:'utf8',flag:'wx'});try{await link(temp,path);}catch(e){if(e.code!=='EEXIST')throw e;}}finally{await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
 return JSON.parse(await readFile(path,'utf8'));
}
export async function acceptedMemory(root,storyId){if(!/^[a-f0-9-]{36}$/.test(storyId))return null;try{return JSON.parse(await readFile(join(root,'.runtime/campaigns',storyId,'accepted.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
