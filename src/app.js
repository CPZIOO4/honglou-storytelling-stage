import {compileStory,stateAt,buildDirectorContext} from './engine.js';
import {StageView} from './stage.js';
import {RecordedDirector} from './director.js';
const $=id=>document.getElementById(id);const format=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const names={};let story,stage,characters,cards,compiled,view,playing=false,time=0,speed=1,lastFrame=0,lastBeat=-1,tab='beat',lastState,ready=false,raf;
async function json(url){const r=await fetch(url);if(!r.ok)throw Error(`文件读取失败：${url}`);return r.json();}
function chapters(){const list=$('chapters');list.replaceChildren();compiled.beats.forEach((b,i)=>{const li=document.createElement('li'),btn=document.createElement('button'),number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');btn.append(number,document.createTextNode(b.title));btn.onclick=()=>seek(b.start);li.append(btn);list.append(li);});$('scrubber').max=compiled.duration;$('total').textContent=format(compiled.duration);$('segment-count').textContent=compiled.beats.length+' 段';}
function inspect(){if(!$('inspector').open||!lastState)return;$('instruction-json').textContent=JSON.stringify(tab==='beat'?{source:'assistant-authored',...lastState.beat}:buildDirectorContext(cards,compiled,time),null,2);}
function placeBubble(dialogue){
 const el=$('dialogue');el.classList.toggle('hidden',!dialogue);if(!dialogue)return;
 const recipients=dialogue.to.map(id=>names[id]).join('、');const mode={normal:'对',whisper:'悄悄对',call:'喊向'}[dialogue.mode];
 $('speaker').textContent=`${names[dialogue.speaker]} ${mode} ${recipients}说`;$('dialogue-text').textContent=dialogue.text;
 let audience=$('dialogue-audience');if(!audience){audience=document.createElement('small');audience.id='dialogue-audience';el.append(audience);}
 const others=dialogue.heardBy.filter(id=>id!==dialogue.speaker);audience.textContent=(dialogue.mode==='whisper'?'低语 · ':'听见：')+others.map(id=>names[id]).join('、')+(dialogue.mode==='whisper'?'可闻':'');el.classList.toggle('whisper',dialogue.mode==='whisper');
 const head=view.headScreen(dialogue.speaker);if(!head)return;const w=el.offsetWidth,h=el.offsetHeight;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const top=clamp(head.y-h-25,8,view.height-h-15);
 const candidates=[head.x-w/2,head.x-w+35,head.x-35].map(x=>clamp(x,8,view.width-w-8));
 const heads=characters.filter(c=>c.id!==dialogue.speaker).map(c=>view.headScreen(c.id)).filter(Boolean);
 const score=x=>heads.reduce((sum,p)=>sum+Math.max(0,Math.min(x+w,p.x+28)-Math.max(x,p.x-28))*Math.max(0,Math.min(top+h,p.y+32)-Math.max(top,p.y-18)),0);
 const left=candidates.sort((a,b)=>score(a)-score(b))[0];el.style.left=`${left}px`;el.style.top=`${top}px`;el.style.setProperty('--tail-x',`${clamp(head.x-left,18,w-18)}px`);
 el.dataset.speaker=dialogue.speaker;el.dataset.to=dialogue.to.join(',');el.dataset.mode=dialogue.mode;
}
function draw(){
  if(!ready)return;const state=stateAt(compiled,time);lastState=state;view.update(state);
  $('elapsed').textContent=format(time);$('scrubber').value=time;$('play').textContent=playing?'Ⅱ 暂停':'▶ 播放';$('play').setAttribute('aria-label',playing?'暂停演出':'播放演出');
  $('narration-text').textContent=state.beat.narration;$('beat-number').textContent=`${String(state.index+1).padStart(2,'0')} / ${compiled.beats.length}　${state.beat.title}`;
  $('moment').textContent=({day:'傍晚',night:'夜里',dawn:'次日清晨'}[state.lighting])+' · 狗儿家';
  placeBubble(state.dialogue);
  $('ending').classList.toggle('hidden',!state.finished);
  if(state.index!==lastBeat){lastBeat=state.index;[...$('chapters').querySelectorAll('button')].forEach((b,i)=>{b.classList.toggle('active',i===state.index);b.classList.toggle('past',i<state.index);if(i===state.index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});inspect();}
  const currentCast=Object.entries(state.actors).filter(([,a])=>a.visible).map(([id])=>names[id]).join('|');if($('cast').dataset.cast!==currentCast){$('cast').replaceChildren(...currentCast.split('|').filter(Boolean).map(n=>{const s=document.createElement('span');s.textContent=n;return s;}));$('cast').dataset.cast=currentCast;}
}
function seek(t){time=Math.max(0,Math.min(compiled.duration,t));if(time===compiled.duration)playing=false;draw();inspect();}
function toggle(){if(!ready)return;if(time>=compiled.duration)time=0;playing=!playing;lastFrame=performance.now();draw();}
function tick(now){if(ready&&playing){const dt=Math.min(.1,(now-lastFrame)/1000);time=Math.min(compiled.duration,time+dt*speed);if(time>=compiled.duration)playing=false;}lastFrame=now;if(ready)draw();raf=requestAnimationFrame(tick);}
$('play').onclick=toggle;$('restart').onclick=()=>{playing=false;seek(0);};$('ending-replay').onclick=()=>{seek(0);playing=true;};
$('prev').onclick=()=>seek(compiled.beats[Math.max(0,lastState.index-1)].start);$('next').onclick=()=>seek(lastState.index<compiled.beats.length-1?compiled.beats[lastState.index+1].start:compiled.duration);
$('scrubber').oninput=e=>seek(Number(e.target.value));$('speed').onchange=e=>speed=Number(e.target.value);$('camera-reset').onclick=()=>{view?.showWide();draw();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.performance').requestFullscreen();}catch{$('fullscreen').textContent='当前窗口不支持全屏';}};
$('open-inspector').onclick=()=>{$('inspector').showModal();inspect();};$('close-inspector').onclick=()=>$('inspector').close();
function switchTab(v){tab=v;$('tab-beat').classList.toggle('active',v==='beat');$('tab-context').classList.toggle('active',v==='context');inspect();}$('tab-beat').onclick=()=>switchTab('beat');$('tab-context').onclick=()=>switchTab('context');
$('download-script').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(story,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='honglou-scene-one.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
$('import-script').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>500000)throw Error('演出数据超过 500 KB');const candidate=JSON.parse(await file.text());const result=compileStory(candidate,stage,characters);story=candidate;compiled=result;playing=false;lastBeat=-1;chapters();seek(0);$('import-status').textContent='数据检查通过，已载入。';}catch(err){$('import-status').textContent='未载入，保留当前演出：\n'+err.message;}finally{e.target.value='';}};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','BUTTON','SELECT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('inspector').open){e.preventDefault();toggle();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;draw();}});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);view?.dispose();});
try{
 [story,stage,characters,cards]=await Promise.all([new RecordedDirector().load(),json('data/stage.json'),json('data/characters.json'),json('data/cards.json')]);characters.forEach(c=>names[c.id]=c.name);compiled=compileStory(story,stage,characters);
 view=new StageView($('stage'),stage,characters,text=>$('load-status').textContent=text);await view.load();ready=true;$('loading').classList.add('hidden');$('play').disabled=false;chapters();draw();raf=requestAnimationFrame(tick);
 if(new URLSearchParams(location.search).has('qa'))window.__STAGE_TEST__={seek,play:()=>{playing=true;},pause:()=>{playing=false;},state:()=>({time,playing,ready,state:lastState,drawCalls:view.renderer.info.render.calls,triangles:view.renderer.info.render.triangles}),context:()=>buildDirectorContext(cards,compiled,time)};
}catch(err){console.error(err);$('load-status').textContent=err.message;$('loading').querySelector('strong').textContent='舞台未能载入';$('loading').querySelector('.spinner').hidden=true;}
