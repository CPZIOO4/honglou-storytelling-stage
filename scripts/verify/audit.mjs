import {createHash} from 'node:crypto';
import fs from 'node:fs';import assert from 'node:assert/strict';
import {compileStory,stateAt} from '../../src/engine.js';import {compilePresentation} from '../../src/presentation.js';
import {compileSoundtrack} from '../../src/soundtrack.js';import {loadProduction,lineageCurrent,readLatest} from '../../backend/productions.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),registry=read('data/productions.json'),audio=read('data/audio/library.json'),results=[];
for(const [id,entry]of Object.entries(registry)){
 for(const key of ['story','stage','cards','characters'])assert(fs.existsSync(entry[key]),id+': missing '+entry[key]);
 const story=read(entry.story),stage=read(entry.stage),characters=read(entry.characters).filter(c=>!story.castIds||story.castIds.includes(c.id));
 assert(fs.existsSync(stage.model));for(const c of characters)for(const layer of ['body','back',...c.expressions.map(e=>'head-'+e)])assert(fs.existsSync(`assets/characters/${c.id}/${layer}.png`));
 if(entry.parent)assert.equal(story.carryover.parentStoryId,read(registry[entry.parent].story).id);
 const c=compileStory(story,stage,characters),p=compilePresentation(story,c);compileSoundtrack(story,p,audio);const latest=await readLatest(process.cwd(),id);assert(await lineageCurrent(process.cwd(),id,latest));const production=await loadProduction(process.cwd(),id);assert.equal(createHash('sha256').update(JSON.stringify(production.rawCards)).digest('hex'),story.generation.authoring.cardHash,id+': runtime cards drifted');
 results.push({scene:id,storyId:story.id,lines:c.beats.reduce((n,b)=>n+b.dialogue.length,0),duration:p.duration,props:stateAt(c,c.duration).props});
}
for(const track of audio.tracks)assert(fs.existsSync(track.url));fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/catalog-audit.json',JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify({passed:true,scenes:results.length,lines:results.reduce((n,r)=>n+r.lines,0)}));
