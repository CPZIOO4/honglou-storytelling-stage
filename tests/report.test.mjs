import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile,cp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {loadProduction,lineageCurrent,latestPath} from '../backend/productions.mjs';import {commitMemory,mergeMemory} from '../backend/story-memory.mjs';
import {validateFactRefs} from '../backend/card-context.mjs';import {route,along} from '../src/engine.js';import {validateConversation} from '../backend/conversation.mjs';
import {handoffAuditContext} from '../backend/generator.mjs';import {buildHandoff,stageScriptBeat} from '../backend/narrative.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8')),seventh=await read(new URL('../data/deepseek-seventh-scene.json',import.meta.url));
async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'honglou-report-'));try{await cp(new URL('../data',import.meta.url),join(root,'data'),{recursive:true});await mkdir(join(root,'.runtime'));await fn(root);}finally{await rm(root,{recursive:true,force:true});}}
test('eighth scene requires accepted seventh and brings only the reporter to the householder',()=>fixture(async root=>{
 await assert.rejects(loadProduction(root,'report'),/确认第七场/);await commitMemory(root,seventh);const p=await loadProduction(root,'report');
 assert.deepEqual(p.characters.map(c=>c.id),['ping_er','fengjie']);assert.equal(p.previousMemory.revision,7);assert(!p.seed.initial.actors.granny&&!p.seed.initial.actors.zhou_wife);
 const invalid=structuredClone(seventh);invalid.narrative.handoff.decision.party.push('granny');await writeFile(latestPath(root,'reception'),JSON.stringify(invalid));await assert.rejects(loadProduction(root,'report'),/单独回话/);
}));
test('Fengjie knows her household role but has not received the private visitor history',()=>fixture(async root=>{
 await commitMemory(root,seventh);const {rawCards:cards}=await loadProduction(root,'report'),host=cards.characters.find(c=>c.id==='fengjie');assert(host.experiencedMemory.includes('首次出现'));assert(!host.knownFactIds.some(id=>id.startsWith('report_')));
 validateFactRefs({speaker:'fengjie',factRefs:['fengjie_own_family']},cards);validateFactRefs({speaker:'ping_er',factRefs:['report_heard_0']},cards);assert.throws(()=>validateFactRefs({speaker:'fengjie',factRefs:['report_heard_0']},cards));
}));
test('reporting, whisper and exit routes avoid the kang, desk, partition and front wall',()=>fixture(async root=>{
 await commitMemory(root,seventh);const {stage}=await loadProduction(root,'report');for(const [a,b] of [['door_entry','report'],['report','private_near'],['report','return_exit']]){const path=route(stage,a,b);for(let t=0;t<=1;t+=.01){const p=along(path,t);assert(!stage.obstacles.some(o=>p[0]>o.min[0]&&p[0]<o.max[0]&&p[1]>o.min[1]&&p[1]<o.max[1]));}}
 const [a,b]=['host','private_near'].map(k=>stage.anchors[k]);assert(Math.hypot(a[0]-b[0],a[1]-b[1])<.9);
}));
test('permission can be carried back to waiting guests, without unsupported seated or tea actions',()=>fixture(async root=>{
 await commitMemory(root,seventh);const p=await loadProduction(root,'report');assert(p.storyline.nodes.find(n=>n.id==='make-case').next.includes('audience-window'));
 const make=text=>({intentions:[{actor:'fengjie',aim:'决定接待',concern:'问清事情'}],endingAim:'传达决定',turns:[{id:'t1',speaker:'fengjie',to:['ping_er'],mode:'normal',text,knowledgeRefs:[],factRefs:[],respondsTo:[],actionIntent:'none'}]});
 assert.doesNotThrow(()=>validateConversation(make('请她过来说话罢。'),p.rawCards));assert.throws(()=>validateConversation(make('请她进来坐下喝茶。'),p.rawCards),/仅站姿/);
}));
test('a private household reply does not update waiting guests and older branch changes invalidate it',()=>fixture(async root=>{
 const m=mergeMemory(seventh.contextMemory,{summary:'平儿到正房回话。',characters:[{id:'ping_er',memory:'平儿听到凤姐的答复。'},{id:'fengjie',memory:'凤姐听到平儿转述。'}]},{id:'eighth',beats:[{dialogue:[]}]});assert.equal(m.revision,8);assert.equal(m.characters.granny,seventh.contextMemory.characters.granny);assert.equal(m.characters.zhou_wife,seventh.contextMemory.characters.zhou_wife);
 assert(await lineageCurrent(root,'report',{carryover:{parentStoryId:seventh.id}}));const sixth=await read(join(root,'data/deepseek-sixth-scene.json'));await writeFile(latestPath(root,'returnhome'),JSON.stringify({...sixth,id:'different-sixth'}));assert(!await lineageCurrent(root,'report',{carryover:{parentStoryId:seventh.id}}));
}));
test('handoff review distinguishes going out to notify from later returning with the invited visitor',()=>fixture(async root=>{
 await commitMemory(root,seventh);const p=await loadProduction(root,'report');
 const beat=stageScriptBeat({id:'invite',title:'请客',change:'决定请来客相见',dialogue:[{speaker:'fengjie',to:['ping_er'],mode:'normal',text:'你去请她进来。',knowledgeRefs:[],factRefs:[]},{speaker:'ping_er',to:['fengjie'],mode:'normal',text:'是，我这就去。',knowledgeRefs:['invite:0'],factRefs:[]}]},{narration:'平儿领命后去传话。',moves:[{actor:'ping_er',target:'report'}],afterMoves:[{actor:'ping_er',target:'return_exit'}],camera:'family'});
 const story={version:1,scene:p.stage.id,cardsSnapshot:p.rawCards,initial:p.seed.initial,beats:[beat],narrative:{nodeId:'make-case'}};
 const resolution={status:'depart',nextNodeId:'audience-window',party:['ping_er'],purpose:'回倒厅传话',approach:'通知来客',departureCondition:'现在',evidenceRefs:['invite:0','invite:1'],facts:[{kind:'promise',text:'传达接见安排',evidenceRefs:['invite:0','invite:1']}]};
 const handoff=buildHandoff(story,p.stage,p.characters,p.storyline,resolution),context=handoffAuditContext(story,p.stage,p.characters,p.storyline,handoff);
 assert.equal(context.nextDestination.places[0].id,'SC13_DT');assert(context.nextDestination.places[0].name.includes('候见处'));assert(context.nextDestination.places[0].name.includes('不是凤姐正房'));
 assert.deepEqual(context.currentScene.cast.map(c=>c.id),['ping_er','fengjie']);assert(context.stageOutcome.finalPositions.ping_er.includes('门外终点'));assert.deepEqual(context.handoff.decision.party,['ping_er']);
 assert.throws(()=>buildHandoff(story,p.stage,p.characters,p.storyline,{...resolution,party:['ping_er','granny']}),/同行/);
}));
