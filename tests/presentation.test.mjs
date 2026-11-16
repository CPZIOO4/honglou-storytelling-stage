import test from 'node:test';import assert from 'node:assert/strict';
import {compilePresentation,presentationAt,presentationTimeForStory,defaultPresentation} from '../src/presentation.js';
const compiled={duration:20,beats:[{id:'a',start:0,end:10,duration:10},{id:'b',start:10,end:20,duration:10}]};
const story={title:'寒家谋生',presentation:{opening:{title:'寒家谋生',duration:3},interludes:[{afterBeat:'a',duration:4,text:'一夜无话。'}]}};
test('title and bridge use presentation time without playing the next action',()=>{
 const p=compilePresentation(story,compiled);assert.equal(p.duration,27);assert.equal(presentationAt(p,2).storyTime,0);
 const a=presentationAt(p,13.5),b=presentationAt(p,16);assert.equal(a.kind,'interlude');assert.equal(a.storyTime,b.storyTime);assert(a.storyTime<10);
 assert.equal(a.showText,false);assert.equal(b.showText,true);assert.equal(presentationAt(p,17).storyTime,10);
});
test('seeking and replay reconstruct overlay phase rather than accumulating delays',()=>{
 const p=compilePresentation(story,compiled);assert.equal(presentationTimeForStory(p,5),8);assert.equal(presentationTimeForStory(p,10),17);
 assert.equal(presentationTimeForStory(p,20),27);assert(presentationAt(p,27).finished);
 presentationAt(p,27);assert.equal(presentationAt(p,0).kind,'opening');assert.equal(presentationAt(p,8).obscured,false);
});
test('descriptive beat narration is not automatically presented as an interlude',()=>{
 const p=compilePresentation({title:'一场戏'},compiled);assert.equal(p.segments.filter(s=>s.kind==='interlude').length,0);
 assert.throws(()=>compilePresentation({...story,presentation:{interludes:[{afterBeat:'unknown',text:'过场',duration:3}]}},compiled),/已有段落/);
});
test('background precedes every performance and freezes story time through skip and replay',()=>{
 const s={title:'寒家谋生',prologue:{text:'京郊狗儿家，刘姥姥帮女儿女婿照看孩子。秋尽冬初，一家人的过冬衣食尚未办齐。'},beats:[{id:'a'},{id:'b'}]};s.presentation=defaultPresentation(s);
 const p=compilePresentation(s,compiled),intro=p.segments.find(s=>s.kind==='prologue');assert(intro);assert.equal(presentationAt(p,intro.start+.8).storyTime,0);assert.equal(presentationAt(p,intro.end-.01).storyTime,0);assert(presentationAt(p,intro.start+1).obscured);assert.equal(presentationAt(p,intro.end).kind,'performance');assert.equal(presentationTimeForStory(p,0),intro.end);assert.equal(presentationAt(p,0).kind,'opening');
});
