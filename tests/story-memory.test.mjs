import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {modelRequest} from '../backend/model-config.mjs';
import {buildWritingContext,validateMemoryUpdate,mergeMemory,commitMemory,acceptedMemory,nextWritingContext} from '../backend/story-memory.mjs';
import {fileURLToPath} from 'node:url';
import {runtimeCards} from '../backend/card-context.mjs';
import {validateScreenplay} from '../backend/narrative.mjs';
const cards=JSON.parse(await readFile(new URL('../data/cards/home.json',import.meta.url),'utf8'));
const evidence={events:[{id:'a:0',speaker:'granny',text:'明早我同刘氏去。'},{id:'a:1',speaker:'liushi',text:'我陪娘去，孩子托他爹照看。'}],heardBy:{granny:['a:0','a:1'],liushi:['a:0','a:1'],gouer:[]}};
const update={summary:'母女决定明早去问活计，尚未出发。',evidenceRefs:['a:0','a:1'],characters:[{id:'liushi',memory:'已答应陪母亲去问活计。',evidenceRefs:['a:0','a:1']}]};
const story={id:'12345678-1234-1234-1234-123456789abc',beats:[{dialogue:[{speaker:'liushi',text:'我陪娘去。'}],commands:[{type:'move',target:'hidden-renderer-data'}]}]};
test('high thinking is explicit for every request and temperature is absent',()=>{const r=modelRequest('s',{a:1});assert.equal(r.model,'deepseek-flash');assert.equal(r.thinking.type,'enabled');assert.equal(r.reasoning_effort,'high');assert(!('temperature'in r));assert(r.max_tokens>=16000);});
test('card update cannot leak unheard whispers or overwrite identity',()=>{
 assert.equal(validateMemoryUpdate(update,evidence,cards),update);
 assert.throws(()=>validateMemoryUpdate({...update,characters:[{...update.characters[0],id:'gouer'}]},evidence,cards),/未听见/);
 assert.throws(()=>validateMemoryUpdate({...update,characters:[{...update.characters[0],personality:'全知'}]},evidence,cards),/稳定字段/);
 assert.throws(()=>validateMemoryUpdate({...update,evidenceRefs:['future:0']},evidence,cards),/未发生/);
 assert.throws(()=>validateMemoryUpdate({...update,summary:'狗儿坐着叹气。'},evidence,cards),/修辞/);
});
test('text context includes BOTH plot and personal memory, never renderer history',()=>{
 const memory=mergeMemory(null,update,story),prompt=buildWritingContext(runtimeCards(cards),memory);
 assert(prompt.includes(update.summary));assert(prompt.includes(update.characters[0].memory));assert(prompt.includes('不能被动态经历覆盖'));
 assert(!prompt.includes('hidden-renderer-data'));assert(!prompt.includes('a:0'));assert(!prompt.includes('"commands"'));
});
test('memory stays bounded across 100 scenes and rewrites do not share branches',()=>{
 let memory;for(let i=0;i<100;i++)memory=mergeMemory(memory,update,story);
 assert.equal(memory.revision,100);assert(memory.summary.length<=900);assert(memory.recentDialogue.length<=600);
 assert(Object.values(memory.characters).every(v=>v.length<=240));assert.equal(JSON.stringify(memory).length<1500,true);
 const other=mergeMemory(null,{...update,characters:[]},{...story,id:'aaaaaaaa-1234-1234-1234-123456789abc'});
 assert(!other.characters.liushi);assert.notEqual(other.branchId,memory.branchId);
 assert.throws(()=>validateMemoryUpdate({...update,summary:'事'.repeat(901)},evidence,cards),/预算/);
});
test('accepted memory is durable and idempotent, a pending version is not history',async()=>{
 const root=await mkdtemp(join(tmpdir(),'honglou-memory-'));
 try{const s={...story,contextMemory:mergeMemory(null,update,story)};
 assert.equal(await acceptedMemory(root,s.id),null);
 await Promise.all([commitMemory(root,s),commitMemory(root,s)]);await commitMemory(root,{...s,contextMemory:{...s.contextMemory,summary:'不能覆盖已确认版本'}});
 assert.equal((await acceptedMemory(root,s.id)).summary,update.summary);
 assert.equal(await acceptedMemory(root,'../other'),null);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('next scene receives the actual environment and selected companions with both memory layers',async()=>{
 const line=JSON.parse(await readFile(new URL('../data/storyline.json',import.meta.url),'utf8'));
 const handoff={nextNodeId:'gate-access',decision:{status:'depart',party:['granny','liushi'],purpose:'问活计',approach:'询问周瑞',departureCondition:'明早'},facts:[]};
 const next=await nextWritingContext(fileURLToPath(new URL('../',import.meta.url)),runtimeCards(cards),line,handoff,mergeMemory(null,update,story));
 assert.equal(next.sceneId,'SC01_JM');assert.deepEqual(next.cast,['granny','liushi']);assert(next.prompt.includes('荣府角门'));assert(next.prompt.includes(update.summary));assert(next.prompt.includes(update.characters[0].memory));assert(!next.prompt.includes('"title":"寒家谋生"'));assert(!next.prompt.includes('## system_prompt'));
 assert(!next.prompt.includes('"sceneRole"'));
});
test('screenplay rejects report-style dialogue without an eight-line scene cap',()=>{
 const d={speaker:'granny',to:['gouer'],mode:'normal',text:'明早：我去。',knowledgeRefs:[],factRefs:[]};
 const plan={endingAim:'决定',beats:[1,2].map(i=>({id:'b'+i,question:'问'+i,change:'变'+i,intention:'问',dialogue:[{...d}]}))};
 assert.throws(()=>validateScreenplay(plan,cards.characters,4,runtimeCards(cards)),/冒号/);
 for(const b of plan.beats)b.dialogue=Array.from({length:4},()=>({...d,text:'我去。'}));
 plan.beats.push({...plan.beats[0],id:'b3',change:'第三变'});
 assert.equal(validateScreenplay(plan,cards.characters,4,runtimeCards(cards)).beats.flatMap(b=>b.dialogue).length,12);
});
