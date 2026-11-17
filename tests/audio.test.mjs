import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,statSync} from 'node:fs';
import {compileSoundtrack,musicAt,dialogueFrame,voiceSamples} from '../src/soundtrack.js';
import {validateFactRefs,runtimeCards} from '../backend/card-context.mjs';
const lib=JSON.parse(readFileSync(new URL('../data/audio/library.json',import.meta.url),'utf8'));
const timeline={segments:[{kind:'opening',start:0,duration:3},{kind:'performance',beatId:'a',start:3,duration:10},{kind:'performance',beatId:'b',start:13,duration:10}]};
test('music pause and resume retain position; seeking backwards reconstructs it',()=>{
 const cues=compileSoundtrack({soundtrack:{cues:[{section:'opening',action:'play',track:'taohua'},{section:'a',action:'pause'},{section:'b',action:'resume'}]}},timeline,lib);
 assert.equal(musicAt(cues,9).position,3);assert.equal(musicAt(cues,9).status,'paused');assert.equal(musicAt(cues,15).position,5);assert.equal(musicAt(cues,1).position,1);
});
test('director cannot request external tracks or invalid section/timing',()=>{
 for(const cue of [{section:'a',action:'play',track:'https://example.com/a.mp3'},{section:'missing',action:'pause'},{section:'a',action:'play',track:'taohua',offset:99},{section:'a',action:'resume'}])assert.throws(()=>compileSoundtrack({soundtrack:{cues:[cue]}},timeline,lib));
});
test('typewriter progressively reveals text and seeking gives the same prefix',()=>{
 const d={at:2,until:10,text:'娘，咱们先想个办法。'};const a=dialogueFrame(d,2.2),b=dialogueFrame(d,4);assert(a.count>0&&a.count<b.count);assert.equal(a.text+a.remaining,d.text);assert.equal(dialogueFrame(d,9).text,d.text);assert.deepEqual(dialogueFrame(d,2.2),a);
});
test('all available voices differ and have bounded samples without abrupt final edges',()=>{
 const signatures=new Set();for(const v of Object.values(lib.voices)){const s=voiceSamples(v);assert(Math.max(...s.map(Math.abs))<.5);assert(s[0]===0);assert(Math.abs(s.at(-1))<.001);signatures.add(Array.from(s.slice(0,150)).join(','));}assert.equal(signatures.size,Object.keys(lib.voices).length);
});
test('every library recording exists with source and attribution',()=>{assert(lib.tracks.length>=3);for(const t of lib.tracks){assert.equal(statSync(new URL('../'+t.url,import.meta.url)).size,t.bytes);assert(t.source.startsWith('https://peritune.com/'));assert.equal(t.license,'CC BY 4.0');}});
test('relationship evidence distinguishes awareness from the other family old connection',()=>{
 const cards=JSON.parse(readFileSync(new URL('../data/cards/home.json',import.meta.url),'utf8'));
 assert.throws(()=>validateFactRefs({speaker:'granny',factRefs:['gouer_zhou_connection']},cards));
 validateFactRefs({speaker:'granny',factRefs:['granny_zhou_awareness']},cards);
 validateFactRefs({speaker:'gouer',factRefs:['gouer_zhou_connection']},cards);
 const runtime=runtimeCards(cards);assert(runtime.relationshipFacts.length>0);assert(!JSON.stringify(runtime).includes('modifiedCard'));assert(!JSON.stringify(runtime).includes('比画儿还强'));
});
