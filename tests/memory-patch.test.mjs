import test from 'node:test';import assert from 'node:assert/strict';
import {applyMemoryPatch,mergeMemoryPatch,validateMemoryUpdate,MEMORY_LIMITS} from '../backend/story-memory.mjs';
const cards={characters:[{id:'granny'},{id:'fengjie'}]},evidence={events:[{id:'reply:0'}],heardBy:{granny:['reply:0'],fengjie:['reply:0']}};
const original={summary:'凤姐答应稍后向太太回明。',evidenceRefs:['reply:0'],characters:[{id:'granny',memory:'刘姥姥听到答复。',evidenceRefs:['reply:0']},{id:'fengjie',memory:'凤姐尚待向太太回明。',evidenceRefs:['reply:0']}]};
test('field repair changes only named text fields, preserving omitted cards and original evidence',()=>{
 const before=structuredClone(original),patched=applyMemoryPatch(original,{characters:[{id:'fengjie',memory:'凤姐表示稍后会向太太回明此事。'}]},evidence,cards);
 assert.deepEqual(original,before);assert.equal(patched.summary,original.summary);assert.deepEqual(patched.characters[0],original.characters[0]);assert.deepEqual(patched.characters[1].evidenceRefs,original.characters[1].evidenceRefs);assert.notEqual(patched.characters[1].memory,original.characters[1].memory);
});
test('field repair cannot change identity, personality or evidence and cannot add absent characters',()=>{
 for(const patch of [{characters:[{id:'granny',personality:'服从'}]},{evidenceRefs:['invented']},{characters:[{id:'granny',memory:'新文字',evidenceRefs:['invented']}]},{characters:[{id:'zhou_wife',memory:'场外得知答复'}]}])assert.throws(()=>applyMemoryPatch(original,patch,evidence,cards));
});
test('field repair keeps memory budgets and renderer-data boundaries',()=>{
 assert.throws(()=>applyMemoryPatch(original,{summary:'字'.repeat(MEMORY_LIMITS.summary+1)},evidence,cards),/超过预算/);
 assert.throws(()=>applyMemoryPatch(original,{characters:[{id:'granny',memory:'字'.repeat(MEMORY_LIMITS.character+1)}]},evidence,cards),/超过预算/);
 assert.throws(()=>applyMemoryPatch(original,{summary:'{"commands":[]}'},evidence,cards),/动作JSON/);
});
test('a budget failure retains other repaired fields for the next bounded correction',()=>{
 const candidate=mergeMemoryPatch(original,{summary:'凤姐尚未向太太回明，之后会去回话。',characters:[{id:'fengjie',memory:'字'.repeat(241)}]});
 assert.throws(()=>validateMemoryUpdate(candidate,evidence,cards),/超过预算/);
 const fixed=applyMemoryPatch(candidate,{characters:[{id:'fengjie',memory:'凤姐准备稍后向太太回明。'}]},evidence,cards);
 assert.equal(fixed.summary,candidate.summary);assert.deepEqual(fixed.characters[0],original.characters[0]);assert.equal(original.summary,'凤姐答应稍后向太太回明。');
});
