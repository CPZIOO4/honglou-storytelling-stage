import {compileStory,stateAt,buildDirectorContext} from './engine.js';
import {StageView} from './stage.js';
import {StageAudio} from './audio.js';
import {dialogueFrame,compileSoundtrack} from './soundtrack.js';
import {RecordedDirector} from './director.js';
import {compilePresentation,presentationAt,presentationTimeForStory} from './presentation.js';
const $=id=>document.getElementById(id);const format=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const requestedScene=new URLSearchParams(location.search).get('scene');const sceneKey=['gate','backstreet','zhouhome','waiting','returnhome','reception','report','invite','audience'].includes(requestedScene)?requestedScene:'home';
const api=path=>'/api/director/'+path+'?scene='+sceneKey;
const names={};let story,stage,characters,cards,compiled,presentation,view,audioLibrary,sound,playing=false,time=0,speed=1,lastFrame=0,lastBeat=-1,tab='beat',lastState,presentState,ready=false,raf;
async function json(url){const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw Error(`文件读取失败：${url}`);return r.json();}
function chapters(){const list=$('chapters');list.replaceChildren();compiled.beats.forEach((b,i)=>{const li=document.createElement('li'),btn=document.createElement('button'),number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');btn.append(number,document.createTextNode(b.title));btn.onclick=()=>seek(presentation.beatStarts[b.id]);li.append(btn);list.append(li);});$('scrubber').max=presentation.duration;$('total').textContent=format(presentation.duration);$('segment-count').textContent=compiled.beats.length+' 段';}
function inspect(){if(!$('inspector').open||!lastState)return;$('instruction-json').textContent=JSON.stringify(tab==='beat'?{source:story.mode,generation:story.generation,...lastState.beat}:buildDirectorContext(cards,compiled,presentState?.storyTime||0),null,2);}
function installStory(next){const validated=compileStory(next,stage,characters);const timeline=compilePresentation(next,validated);compileSoundtrack(next,timeline,audioLibrary);story=next;cards=next.cardsSnapshot||cards;compiled=validated;document.title='红楼说书 · '+next.title;presentation=timeline;sound?.install(story,presentation);playing=false;time=0;lastBeat=-1;chapters();document.querySelector('h1').textContent=story.title||'寒家谋生';$('source-status').textContent=story.mode==='deepseek-generated'?'由 DeepSeek Flash 生成 · 已检查后播放':'助手预编示例';document.querySelector('#ending h2').textContent='这一场，暂且说到这里。';draw();}
let generationTimer=null;
async function pollGeneration(id){
 try{const job=await json('/api/director/jobs/'+id);$('generation-status').textContent=job.message;
  if(job.phase==='ready'){location.reload();return;}
  if(job.phase==='failed'){$('generate-story').disabled=false;$('generate-story').textContent=job.completed?'继续修订':'重新生成';if(job.completed)$('generate-story').dataset.resume=job.id;return;}
  generationTimer=setTimeout(()=>pollGeneration(id),2000);
 }catch(e){$('generation-status').textContent='无法读取任务进度：'+e.message;$('generate-story').disabled=false;}
}
$('generate-story').onclick=async()=>{playing=false;draw();$('generate-story').disabled=true;$('generation-status').textContent='正在请 Flash 编排当前场景……';try{const r=await fetch('/api/director/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scene:sceneKey,beats:4,...($('generate-story').dataset.resume?{resumeFrom:$('generate-story').dataset.resume}:{})})});const job=await r.json();if(!r.ok)throw Error(job.error);delete $('generate-story').dataset.resume;pollGeneration(job.id);}catch(e){$('generation-status').textContent=e.message;$('generate-story').disabled=false;}};
async function connectLocalDirector(){
 if(!['127.0.0.1','localhost'].includes(location.hostname))return;
 try{const status=await json(api('status'));$('generation-panel').classList.remove('hidden');$('generate-story').disabled=!status.configured;$('generation-status').textContent=status.configured?'可根据人物卡、环境卡和个人听闻生成新一场':'请在本机配置 DeepSeek 密钥';
  if(new URLSearchParams(location.search).has('demo'))return;
  if(status.stale){$('generation-status').textContent='前序分支已改变，请重新生成当前场';$('play').disabled=true;playing=false;return;}
  if(status.active&&status.active.scene===sceneKey){$('generate-story').disabled=true;pollGeneration(status.active.id);}else if(status.latest){installStory(await json(api('latest')));$('generation-status').textContent='已载入上次检查通过的 Flash 演出';$('generate-story').textContent='重新生成';}
 }catch{/* Static preview is still available without a local API server. */}
}
function placeBubble(dialogue,frame){
 const el=$('dialogue');el.classList.toggle('hidden',!dialogue);if(!dialogue)return;
 $('dialogue-text').setAttribute('aria-label',dialogue.text);$('dialogue-visible').textContent=frame.text;$('dialogue-pending').textContent=frame.remaining;el.dataset.fullText=dialogue.text;el.classList.toggle('whisper',dialogue.mode==='whisper');
 const head=view.headScreen(dialogue.speaker);if(!head)return;const w=el.offsetWidth,h=el.offsetHeight;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),baseTop=clamp(head.y-h-25,8,view.height-h-15),baseLeft=clamp(head.x-w/2,8,view.width-w-8);
 const faces=view.faceRects().map(r=>({...r,left:r.left-8,right:r.right+8,top:Math.min(r.top,view.headScreen(r.id).y-4),bottom:r.bottom+4}));
 const xs=[head.x-w/2,head.x-w+35,head.x-35].map(x=>clamp(x,8,view.width-w-8));
 const ys=[baseTop,...faces.map(r=>r.top-h-12)].map(y=>clamp(y,8,view.height-h-15));
 const score=({left,top})=>faces.reduce((sum,r)=>sum+Math.max(0,Math.min(left+w,r.right)-Math.max(left,r.left))*Math.max(0,Math.min(top+h,r.bottom)-Math.max(top,r.top)),0);
 const candidates=ys.flatMap(top=>xs.map(left=>({left,top}))),travel=p=>(p.left-baseLeft)**2+(p.top-baseTop)**2;
 const {left,top}=candidates.sort((a,b)=>score(a)-score(b)||travel(a)-travel(b))[0];el.style.left=`${left}px`;el.style.top=`${top}px`;el.style.setProperty('--tail-x',`${clamp(head.x-left,18,w-18)}px`);
 el.dataset.speaker=dialogue.speaker;el.dataset.to=dialogue.to.join(',');el.dataset.mode=dialogue.mode;
}
function draw(){
  if(!ready)return;presentState=presentationAt(presentation,time);const raw=stateAt(compiled,presentState.storyTime);
  const obscured=presentState.obscured&&!presentState.finished;
  const state={...raw,lighting:presentState.lighting||raw.lighting,dialogue:obscured?null:raw.dialogue,finished:presentState.finished,presentationObscured:obscured};lastState=state;view.update(state);
  $('elapsed').textContent=format(time);$('scrubber').value=time;$('play').textContent=playing?'Ⅱ 暂停':'▶ 播放';$('play').setAttribute('aria-label',playing?'暂停演出':'播放演出');
  const overlay=$('scene-overlay'),opening=presentState.kind==='opening';overlay.classList.toggle('hidden',!obscured);overlay.classList.toggle('opening',opening);overlay.classList.toggle('bridge',!opening);overlay.classList.toggle('prologue',presentState.kind==='prologue');overlay.classList.toggle('text-ready',presentState.showText);
  $('opening-title').textContent=opening?presentState.title:'';$('opening-subtitle').textContent=opening?presentState.subtitle:'';$('bridge-text').textContent=opening?'':presentState.text||'';
  $('stage').classList.toggle('veiled',obscured);$('camera-reset').classList.toggle('hidden',obscured);const frame=state.dialogue?dialogueFrame(state.dialogue,presentState.storyTime-state.beat.start,audioLibrary.voices[state.dialogue.speaker]):null;placeBubble(state.dialogue,frame);sound.sync({time,playing,speed,dialogue:state.dialogue,frame,finished:state.finished});$('audio-status').textContent=sound.stats.error||(sound.muted?'已静音':sound.ctx?.state==='running'?'配乐随剧情播放':'播放时启用声音');
  if(state.dialogue){const el=$('dialogue'),left=parseFloat(el.style.left),top=parseFloat(el.style.top),right=left+el.offsetWidth,bottom=top+el.offsetHeight;
   for(const actor of view.actors.values()){if(actor.label.hidden)continue;const x=parseFloat(actor.label.style.left),y=parseFloat(actor.label.style.top);if(x+30>left&&x-30<right&&y>top&&y-26<bottom)actor.label.hidden=true;}
  }
  $('ending').classList.toggle('hidden',!state.finished);
  if(state.index!==lastBeat){lastBeat=state.index;[...$('chapters').querySelectorAll('button')].forEach((b,i)=>{b.classList.toggle('active',i===state.index);b.classList.toggle('past',i<state.index);if(i===state.index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});inspect();}
}

function seek(t){sound?.resetSeek();time=Math.max(0,Math.min(presentation.duration,t));if(time===presentation.duration)playing=false;draw();inspect();}
function toggle(){if(!ready)return;void sound.unlock();if(time>=presentation.duration)time=0;playing=!playing;lastFrame=performance.now();draw();}
const committedStories=new Set();
async function confirmPlayedStory(){const id=story.id;if(committedStories.has(id)||!story.contextMemory||!['127.0.0.1','localhost'].includes(location.hostname))return;committedStories.add(id);try{const r=await fetch(api('complete'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId:id})});if(!r.ok)throw Error();$('generation-status').textContent='本场已演完，剧情摘要和人物经历已保存';}catch{committedStories.delete(id);$('generation-status').textContent='剧情记忆保存失败，重播完成后可重试';}}
function tick(now){if(ready&&playing){const dt=Math.max(0,Math.min(.1,(now-lastFrame)/1000));time=Math.max(0,Math.min(presentation.duration,time+dt*speed));if(time>=presentation.duration){playing=false;void confirmPlayedStory();}}lastFrame=now;if(ready)draw();raf=requestAnimationFrame(tick);}
$('audio-mute').onclick=()=>{void sound.unlock();sound.setMuted(!sound.muted);$('audio-mute').textContent=sound.muted?'开启声音':'静音';$('audio-mute').setAttribute('aria-pressed',String(sound.muted));};
$('music-volume').oninput=e=>{sound.musicVolume=Number(e.target.value);sound.settings();};$('voice-volume').oninput=e=>{sound.voiceVolume=Number(e.target.value);sound.settings();};
$('play').onclick=toggle;$('restart').onclick=()=>{playing=false;seek(0);};$('ending-replay').onclick=()=>{void sound.unlock();seek(0);playing=true;};
$('prev').onclick=()=>seek(presentation.beatStarts[compiled.beats[Math.max(0,lastState.index-1)].id]);$('next').onclick=()=>seek(lastState.index<compiled.beats.length-1?presentation.beatStarts[compiled.beats[lastState.index+1].id]:presentation.duration);
$('skip-overlay').onclick=()=>seek(presentState.end);
$('scrubber').oninput=e=>seek(Number(e.target.value));$('speed').onchange=e=>speed=Number(e.target.value);$('camera-reset').onclick=()=>{view?.showWide();draw();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.performance').requestFullscreen();}catch{$('fullscreen').textContent='当前窗口不支持全屏';}};
$('open-inspector').onclick=()=>{$('inspector').showModal();inspect();};$('close-inspector').onclick=()=>$('inspector').close();
function switchTab(v){tab=v;$('tab-beat').classList.toggle('active',v==='beat');$('tab-context').classList.toggle('active',v==='context');inspect();}$('tab-beat').onclick=()=>switchTab('beat');$('tab-context').onclick=()=>switchTab('context');
$('download-script').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(story,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='honglou-scene-'+sceneKey+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
$('import-script').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>500000)throw Error('演出数据超过 500 KB');const candidate=JSON.parse(await file.text());installStory(candidate);$('import-status').textContent='数据检查通过，已载入。';}catch(err){$('import-status').textContent='未载入，保留当前演出：\n'+err.message;}finally{e.target.value='';}};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','BUTTON','SELECT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('inspector').open){e.preventDefault();toggle();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;draw();}});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);clearTimeout(generationTimer);view?.dispose();sound?.dispose();});
try{
 const registry=await json('data/productions.json'),production=registry[sceneKey];
 $('generate-story').textContent='生成'+production.title.split(' · ')[0];
 document.querySelector('#ending > span').textContent=production.title.split(' · ')[0]+' · 完';$('stage').setAttribute('aria-label',production.title+'的三维舞台与纸片人物');
 const nav=document.createElement('nav');nav.className='scene-navigation';nav.setAttribute('aria-label','演出场次');for(const [key,item]of Object.entries(registry)){const link=document.createElement('a');link.href='?scene='+key;link.textContent=item.title;if(key===sceneKey)link.setAttribute('aria-current','page');nav.append(link);}document.querySelector('main').prepend(nav);
 let localStory=null;if(['127.0.0.1','localhost'].includes(location.hostname)&&!new URLSearchParams(location.search).has('demo')){try{const status=await json(api('status'));if(status.stale)throw Error('前序演出已更换分支，请重新生成当前场，不能播放旧分支。');if(status.latest)localStory=await json(api('latest'));}catch(e){if(e.message.includes('分支'))throw e;}}
 [story,stage,characters,cards,audioLibrary]=await Promise.all([localStory||new RecordedDirector().load(new URLSearchParams(location.search).has('demo')&&sceneKey==='home'?'data/scene-one.json':production.story),json(production.stage),json(production.characters),json(production.cards),json('data/audio-library.json')]);
 if(story.castIds)characters=characters.filter(c=>story.castIds.includes(c.id));cards=story.cardsSnapshot||cards;
 const onward=document.createElement('a');onward.className='scene-onward';onward.href='?scene='+(production.next||'home');onward.textContent=production.next?'继续'+registry[production.next].title:'返回第一场';$('ending').append(onward);
 sound=new StageAudio(audioLibrary);characters.forEach(c=>names[c.id]=c.name);compiled=compileStory(story,stage,characters);
 view=new StageView($('stage'),stage,characters,text=>$('load-status').textContent=text);await view.load();ready=true;$('loading').classList.add('hidden');$('play').disabled=false;installStory(story);raf=requestAnimationFrame(tick);await connectLocalDirector();
 if(new URLSearchParams(location.search).has('qa'))window.__STAGE_TEST__={seek:t=>seek(presentationTimeForStory(presentation,t)),seekPresentation:seek,presentation:()=>presentation,audio:()=>sound.debug(),startAudioCapture:()=>sound.startCapture(),stopAudioCapture:async()=>Array.from(new Uint8Array(await sound.stopCapture())),cutaway:()=>({total:view.cutawayMeshes?.length||0,hidden:view.cutawayMeshes?.filter(m=>!m.visible).length||0}),faces:()=>view.faceRects(),heads:()=>Object.fromEntries([...view.actors.keys()].map(id=>[id,view.headScreen(id)])),focus:()=>Object.fromEntries([...view.actors].map(([id,a])=>[id,a.cue.visible])),play:()=>{playing=true;},pause:()=>{playing=false;},state:()=>({time,playing,ready,presentation:presentState,state:lastState,drawCalls:view.renderer.info.render.calls,triangles:view.renderer.info.render.triangles}),context:()=>buildDirectorContext(cards,compiled,presentState?.storyTime||0)};
}catch(err){if(sceneKey!=='home'&&['127.0.0.1','localhost'].includes(location.hostname)) {$('generation-panel').classList.remove('hidden');$('generate-story').disabled=false;$('generation-status').textContent='可从已确认的前序分支生成当前场';}console.error(err);$('load-status').textContent=err?.message||'加载被中断，请重新加载页面。';$('loading').querySelector('strong').textContent='舞台未能载入';$('loading').querySelector('.spinner').hidden=true;const retry=document.createElement('button');retry.textContent='重新加载';retry.onclick=()=>location.reload();$('loading').append(retry);}
