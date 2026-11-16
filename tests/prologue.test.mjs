import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {composePrologue,validatePrologue} from '../backend/prologue.mjs';
import {compilePresentation} from '../src/presentation.js';
import {compileSoundtrack} from '../src/soundtrack.js';
const cards=JSON.parse(await readFile(new URL('../data/cards.json',import.meta.url),'utf8'));
test('opening narration cannot invent a seated pose for standing actors',()=>{
 assert.throws(()=>validatePrologue({text:'京郊狗儿家，刘姥姥和女儿女婿围坐在屋里，商量过冬衣食未齐的难处。'}),/站姿/);
});
test('prologue is written and reviewed using only opening facts, never a generated ending',async()=>{
 const text='京郊狗儿家，刘姥姥帮女儿刘氏和女婿狗儿照看两个孩子。秋尽冬初，一家人的冬衣吃食还未置办齐，眼前这道难关，得一起商量个办法。';const calls=[];
 const result=await composePrologue({cards,ask:async(system,input,phase)=>{calls.push({input,phase});return phase.startsWith('prologue-write')?{text}:{passed:true,issues:[]};}});
 assert.equal(result.text,text);assert(result.review.passed);assert.equal(calls.length,2);
 for(const c of calls){assert(c.input.background.family.length);assert(!('turns'in c.input));assert(!('endingAim'in c.input));assert(!('dramaturgy'in c.input.background.scene));}
});
test('music can begin in prologue without mistaking it for a later bridge',()=>{
 const story={presentation:{opening:{title:'开场',duration:3},prologue:{text:'初态背景',duration:12},interludes:[{afterBeat:'a',text:'一夜过去',duration:5}]},soundtrack:{cues:[{section:'prologue',action:'play',track:'music'},{section:'bridge',action:'stop'}]}};
 const p=compilePresentation(story,{duration:10,beats:[{id:'a',start:0,end:10,duration:10}]});
 const cues=compileSoundtrack(story,p,{tracks:[{id:'music'}]});assert.equal(cues[0].time,3);assert.equal(cues[1].time,25);
});
