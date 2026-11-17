import {validateCatalog} from '../shared/production-catalog.js';
import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {batchStaticModel} from '../src/render/static-batches.js';
import {compileStory,personalKnowledge,stateAt,listenersFor} from '../src/engine.js';
import {readFileSync} from 'node:fs';
test('static batching preserves transformed vertices and triangle count while separating cutaways',()=>{
 const root=new THREE.Group();root.position.set(2,3,1);root.rotation.y=.3;const material=new THREE.MeshStandardMaterial();
 for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),material);m.position.set(i*.7,i%2,.3);m.scale.x=i===1?-1:1;m.name=i>2?'Door_'+i:'Wall_'+i;root.add(m);}
 const vertices=()=>{root.updateMatrixWorld(true);const points=[];let triangles=0;root.traverse(m=>{if(!m.isMesh)return;triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);points.push(p.toArray().map(x=>x.toFixed(5)).join(','));}});return {points:points.sort(),triangles};};
 const before=vertices(),stats=batchStaticModel(root,m=>m.name.startsWith('Door'));assert.equal(stats.remaining,2);assert.deepEqual(vertices(),before);assert.equal(root.children.filter(m=>m.userData.stageCutaway).length,1);
});
test('transparent, partial-range and multi-material geometry retains independent ordering',()=>{
 const root=new THREE.Group(),mat=new THREE.MeshBasicMaterial({transparent:true,opacity:.5});for(let i=0;i<2;i++)root.add(new THREE.Mesh(new THREE.BoxGeometry(),mat));root.add(new THREE.Mesh(new THREE.BoxGeometry(),[new THREE.MeshBasicMaterial()]));const opaque=new THREE.MeshBasicMaterial();for(let i=0;i<2;i++){const g=new THREE.BoxGeometry();g.setDrawRange(0,3);root.add(new THREE.Mesh(g,opaque));}const original=[...root.children];assert.equal(batchStaticModel(root).merged,0);assert.deepEqual(root.children,original);
});
test('cached hearing is equivalent to full-interval sampling, rewind-safe and isolated from callers',()=>{
 const j=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8')),c=compileStory(j('tests/fixtures/engine-story.json'),j('data/stages/home.json'),j('data/characters/home.json'));
 for(const time of [0,25,80,200,100,233,0]){const expected=Object.fromEntries(c.characters.map(x=>[x.id,[]]));for(const b of c.beats)for(const [i,d]of b.dialogue.entries()){if(b.start+d.until>time)continue;const heard=new Set(c.characters.map(x=>x.id));for(let t=b.start+d.at;t<b.start+d.until;t+=.25){const audible=listenersFor(c.stage,stateAt(c,t).actors,d);for(const id of heard)if(!audible.includes(id))heard.delete(id);}for(const id of heard)expected[id].push({eventId:b.id+':'+i,speaker:d.speaker,to:d.to,mode:d.mode,text:d.text});}assert.deepEqual(personalKnowledge(c,time),expected);}
 const result=personalKnowledge(c,233),first=result.granny[0];first.text='污染';first.to.push('intruder');assert.notEqual(personalKnowledge(c,233).granny[0].text,'污染');assert(!personalKnowledge(c,233).granny[0].to.includes('intruder'));
});

test('shared production catalog rejects cycles and broken navigation before loading a scene',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../data/productions.json',import.meta.url),'utf8'));assert.equal(validateCatalog(catalog),catalog);
 for(const mutate of [x=>x.home.parent='home',x=>x.gate.parent='missing',x=>x.home.next='missing',x=>x.home.story='data/../secret.json']){const copy=structuredClone(catalog);mutate(copy);assert.throws(()=>validateCatalog(copy));}
});
