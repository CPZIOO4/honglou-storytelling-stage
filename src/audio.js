import {compileSoundtrack,musicAt,voiceSamples} from './soundtrack.js';

export class StageAudio{
 constructor(library){this.library=library;this.cues=[];this.musicVolume=.45;this.voiceVolume=.55;this.muted=false;this.voices=new Set();this.buffers=new Map();this.timers=new Set();this.retired=new Set();this.current=null;this.lastText=null;this.lastCount=0;this.discontinuous=true;this.stats={beeps:0,byActor:{},error:null};}
 install(story,presentation){const cues=compileSoundtrack(story,presentation,this.library);this.stopAll();this.cues=cues;this.resetSeek();}
 async unlock(){
  if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createGain();this.musicBus=this.ctx.createGain();this.voiceBus=this.ctx.createGain();this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=1024;
   this.musicBus.connect(this.master);this.voiceBus.connect(this.master);this.master.connect(this.analyser);this.analyser.connect(this.ctx.destination);this.settings();}
  try{await this.ctx.resume();this.stats.error=null;}catch{this.stats.error='请点击播放或声音按钮启用声音';}
 }
 settings(){if(!this.ctx)return;const now=this.ctx.currentTime;this.master.gain.setTargetAtTime(this.muted?0:1,now,.02);this.musicBus.gain.setTargetAtTime(this.musicVolume,now,.03);this.voiceBus.gain.setTargetAtTime(this.voiceVolume,now,.02);}
 setMuted(value){this.muted=value;this.settings();if(value)this.stopVoices();}
 resetSeek(){this.discontinuous=true;this.lastText=null;this.lastCount=0;this.stopVoices();}
 stopVoices(){for(const s of this.voices){try{s.stop();}catch{}s.disconnect();}this.voices.clear();}
 disposeTrack(t){if(!t)return;t.element.pause();t.element.removeAttribute('src');t.element.load();t.source.disconnect();t.gain.disconnect();this.retired.delete(t);}
 stopAll(){this.stopVoices();for(const timer of this.timers)clearTimeout(timer);this.timers.clear();this.disposeTrack(this.current);for(const t of this.retired)this.disposeTrack(t);this.current=null;}
 replaceTrack(want){
  const old=this.current;if(old){this.retired.add(old);old.gain.gain.cancelScheduledValues(this.ctx.currentTime);old.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.12);const timer=setTimeout(()=>{this.disposeTrack(old);this.timers.delete(timer);},650);this.timers.add(timer);}
  this.current=null;if(!want.track)return;
  const record=this.library.tracks.find(t=>t.id===want.track);const element=new Audio(record.url);element.loop=true;element.preload='auto';element.preservesPitch=true;
  const source=this.ctx.createMediaElementSource(element),gain=this.ctx.createGain();gain.gain.value=0;source.connect(gain);gain.connect(this.musicBus);
  const t={element,source,gain,id:want.track,epoch:want.epoch,targetGain:-1,pending:false};this.current=t;
  element.addEventListener('error',()=>{if(this.current===t)this.stats.error='配乐载入失败，文字音效仍可使用';});
 }
 beep(actor,glyph,count,mode){
  if(this.muted||!glyph||/[，。！？；：、,.!?;:\s]/u.test(glyph)||this.ctx?.state!=='running')return;
  const now=this.ctx.currentTime;if(now-(this.lastBeepAt||-1)<.055)return;this.lastBeepAt=now;
  const profile=this.library.voices[actor];if(!profile)return;const key=actor+':'+count%6;let buffer=this.buffers.get(key);
  if(!buffer){const samples=voiceSamples(profile,count%6,this.ctx.sampleRate);buffer=this.ctx.createBuffer(1,samples.length,this.ctx.sampleRate);buffer.copyToChannel(samples,0);this.buffers.set(key,buffer);}
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.value=mode==='whisper'?.45:1;source.connect(gain);gain.connect(this.voiceBus);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start();this.stats.beeps++;this.stats.byActor[actor]=(this.stats.byActor[actor]||0)+1;
 }
 sync({time,playing,speed,dialogue,frame,finished}){
  const want=musicAt(this.cues,time),active=playing&&!finished;
  if(this.ctx?.state==='running'){
   if(this.current?.id!==want.track||this.current?.epoch!==want.epoch){if(want.track||this.current)this.replaceTrack(want);}
   const t=this.current;if(t){const el=t.element;el.playbackRate=speed;const offset=Number.isFinite(el.duration)&&el.duration>0?want.position%el.duration:want.position;
    if(el.readyState>=1&&(this.discontinuous||Math.abs(el.currentTime-offset)>1.2)){try{el.currentTime=offset;}catch{}}
    const shouldPlay=active&&want.status==='playing';const level=shouldPlay?want.volume*(dialogue ? .52 : 1):0;
    if(t.targetGain!==level){t.targetGain=level;t.gain.gain.setTargetAtTime(level,this.ctx.currentTime,.16);}
    if(shouldPlay&&el.paused&&!t.pending){t.pending=true;el.play().catch(e=>{if(e.name!=='AbortError')this.stats.error='点击播放按钮启用配乐';}).finally(()=>{t.pending=false;});}
    if(!shouldPlay&&!el.paused)el.pause();
   }
   if(!active){this.stopVoices();for(const old of this.retired)old.element.pause();}
  }
  const key=dialogue?.eventId||null,newLine=key!==this.lastText;const previous=newLine?0:this.lastCount;
  if(active&&!this.discontinuous&&frame&&frame.count>previous)this.beep(dialogue.speaker,frame.glyph,frame.count,dialogue.mode);
  this.lastText=key;this.lastCount=frame?.count||0;this.discontinuous=false;
 }
 debug(){const data=new Float32Array(this.analyser?.fftSize||0);this.analyser?.getFloatTimeDomainData(data);const rms=data.length?Math.sqrt(data.reduce((n,v)=>n+v*v,0)/data.length):0;return {...this.stats,unlocked:this.ctx?.state==='running',muted:this.muted,music:this.current?.id||null,musicPaused:this.current?.element.paused??true,musicPosition:this.current?.element.currentTime||0,activeVoices:this.voices.size,rms};}
 startCapture(){if(!this.ctx||this.capture)throw Error('声音尚未启用或正在录制');const destination=this.ctx.createMediaStreamDestination(),chunks=[];this.master.connect(destination);const recorder=new MediaRecorder(destination.stream,{mimeType:'audio/webm;codecs=opus'});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start(100);this.capture={destination,chunks,recorder};}
 stopCapture(){const capture=this.capture;if(!capture)throw Error('没有录制');return new Promise(resolve=>{capture.recorder.onstop=async()=>{this.master.disconnect(capture.destination);capture.destination.stream.getTracks().forEach(t=>t.stop());this.capture=null;resolve(await new Blob(capture.chunks,{type:'audio/webm'}).arrayBuffer());};capture.recorder.stop();});}
 dispose(){this.stopAll();if(this.capture){this.capture.recorder.stop();this.capture.destination.stream.getTracks().forEach(t=>t.stop());}void this.ctx?.close();}
}
