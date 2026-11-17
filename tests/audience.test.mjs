import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile,cp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {loadProduction,lineageCurrent,latestPath} from '../backend/productions.mjs';import {commitMemory,mergeMemory} from '../backend/story-memory.mjs';import {validateFactRefs} from '../backend/card-context.mjs';import {compileStory,stateAt,route,along} from '../src/engine.js';
import {auditGeneratedStory} from '../backend/generator.mjs';import {stageScriptBeat} from '../backend/narrative.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8')),ninth=await read(new URL('../data/deepseek-ninth-scene.json',import.meta.url));
async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'honglou-audience-'));try{await cp(new URL('../data',import.meta.url),join(root,'data'),{recursive:true});await mkdir(join(root,'.runtime'));await fn(root);}finally{await rm(root,{recursive:true,force:true});}}
test('audience requires accepted ninth and only its actual two arrivals meet the resident',()=>fixture(async root=>{
 await assert.rejects(loadProduction(root,'audience'),/确认第九场/);await commitMemory(root,ninth);const p=await loadProduction(root,'audience');assert.deepEqual(p.characters.map(c=>c.id),['granny','ping_er','fengjie']);assert.equal(p.previousMemory.revision,9);assert(!p.seed.initial.actors.zhou_wife);
 const invalid=structuredClone(ninth);invalid.narrative.handoff.decision.party.push('zhou_wife');await writeFile(latestPath(root,'invite'),JSON.stringify(invalid));await assert.rejects(loadProduction(root,'audience'),/留候者/);
}));
test('Fengjie retains her actual position and her own last memory from the eighth scene',()=>fixture(async root=>{
 await commitMemory(root,ninth);const p=await loadProduction(root,'audience'),eighth=await read(join(root,'data/deepseek-eighth-scene.json')),stage=await read(join(root,'data/report-stage.json')),roster=await read(join(root,'data/report-characters.json'));
 const c=compileStory(eighth,stage,roster.filter(a=>eighth.castIds.includes(a.id)));assert.equal(p.seed.initial.actors.fengjie.anchor,stateAt(c,c.duration).actors.fengjie.anchor);assert.equal(p.rawCards.characters.find(c=>c.id==='fengjie').experiencedMemory,ninth.contextMemory.characters.fengjie);
}));
test('private corridor promise and unrelayed household inquiry stay with their actual listeners',()=>fixture(async root=>{
 await commitMemory(root,ninth);const {rawCards:cards}=await loadProduction(root,'audience');
 const promise=cards.relationshipFacts.find(f=>f.id.startsWith('arrival_heard_')&&f.claim.includes('一道'));assert(promise);
 validateFactRefs({speaker:'granny',factRefs:[promise.id]},cards);assert.throws(()=>validateFactRefs({speaker:'fengjie',factRefs:[promise.id]},cards));
 validateFactRefs({speaker:'fengjie',factRefs:['host_heard_2']},cards);assert.throws(()=>validateFactRefs({speaker:'granny',factRefs:['host_heard_2']},cards));
 const family=cards.relationshipFacts.find(f=>f.id==='current_household_members');assert(family.claim.includes('五人'));assert.deepEqual(family.knownBy,['granny']);validateFactRefs({speaker:'granny',factRefs:[family.id]},cards);assert.throws(()=>validateFactRefs({speaker:'fengjie',factRefs:[family.id]},cards));
}));
test('guest response and exit routes avoid furniture and keep the two exit positions separate',()=>fixture(async root=>{
 await commitMemory(root,ninth);const {stage}=await loadProduction(root,'audience');assert.notDeepEqual(stage.anchors.return_exit,stage.anchors.guest_exit);
 for(const [a,b]of [['door_entry','guest_reply'],['guest_reply','guest_exit'],['attendant','return_exit'],['guest_reply','private_near']]){const path=route(stage,a,b);for(let t=0;t<=1;t+=.01){const p=along(path,t);assert(!stage.obstacles.some(o=>p[0]>o.min[0]&&p[0]<o.max[0]&&p[1]>o.min[1]&&p[1]<o.max[1]));}}
}));
test('new private audience decisions do not reach Zhou wife and any changed ancestor invalidates the audience',()=>fixture(async root=>{
 const m=mergeMemory(ninth.contextMemory,{summary:'主客开始当面交谈。',characters:[{id:'granny',memory:'刘姥姥当面陈说。'},{id:'fengjie',memory:'凤姐听来客陈说。'}]},{id:'tenth',beats:[{dialogue:[]}]});assert.equal(m.revision,10);assert.equal(m.characters.zhou_wife,ninth.contextMemory.characters.zhou_wife);
 assert(await lineageCurrent(root,'audience',{carryover:{parentStoryId:ninth.id}}));const eighth=await read(join(root,'data/deepseek-eighth-scene.json'));await writeFile(latestPath(root,'report'),JSON.stringify({...eighth,id:'different-eighth'}));assert(!await lineageCurrent(root,'audience',{carryover:{parentStoryId:ninth.id}}));
}));
test('a guest approaches only after the spoken invitation and the route avoids the host',()=>fixture(async root=>{
 await commitMemory(root,ninth);const p=await loadProduction(root,'audience'),step={id:'call-near',title:'招呼',change:'凤姐请来客走近',dialogue:[{speaker:'fengjie',to:['granny'],mode:'normal',text:'老人家，进前些说话。',knowledgeRefs:[],factRefs:[]}]};
 const make=after=>({version:1,scene:p.stage.id,initial:p.seed.initial,beats:[stageScriptBeat(step,{narration:'凤姐招呼来客走近。',[after?'afterMoves':'moves']:[{actor:'granny',target:'private_near'}],camera:'family'})]});
 assert.throws(()=>auditGeneratedStory(make(false),p.stage,p.characters,p.rawCards),/靠近邀请尚未说完/);assert.doesNotThrow(()=>auditGeneratedStory(make(true),p.stage,p.characters,p.rawCards));
 const path=route(p.stage,'guest_reply','private_near'),host=p.stage.anchors.host;for(let t=0;t<=1;t+=.01){const v=along(path,t);assert(Math.hypot(v[0]-host[0],v[1]-host[1])>.6,'不能从凤姐站位穿过');}
}));
