export function compileSoundtrack(story,presentation,library){
 const cues=story.soundtrack?.cues||[],tracks=new Set(library.tracks.map(t=>t.id));
 if(!Array.isArray(cues)||cues.length>24)throw Error('配乐指令过多或格式不正确');
 const result=cues.map((cue,i)=>{
  const segment=presentation.segments.find(s=>cue.section==='opening'?s.kind==='opening':cue.section===`bridge:${s.beatId||''}`?s.kind==='interlude':s.kind==='performance'&&s.beatId===cue.section)||
   (cue.section==='bridge'?presentation.segments.find(s=>s.kind==='interlude'):null);
  if(!segment)throw Error('配乐指令引用不存在的演出段 '+cue.section);
  if(!['play','pause','resume','stop'].includes(cue.action))throw Error('未知配乐操作');
  if(cue.action==='play'&&!tracks.has(cue.track))throw Error('配乐必须选用库内曲目');
  if(cue.volume!==undefined&&(!Number.isFinite(cue.volume)||cue.volume<0||cue.volume>.6))throw Error('配乐音量须在0到0.6之间');
  const offset=cue.offset??0;if(!Number.isFinite(offset)||offset<0||offset>=segment.duration)throw Error('配乐时点超出段落');
  return {...cue,id:i,time:segment.start+offset};
 }).sort((a,b)=>a.time-b.time);
 let current=null;for(const cue of result){if(cue.action==='play')current=cue.track;if(cue.action==='stop')current=null;if(cue.action==='resume'&&!current)throw Error('没有已暂停曲目可续播');}
 return result;
}
export function musicAt(cues,time){
 let track=null,status='stopped',position=0,last=0,volume=.22,epoch=-1;
 for(const cue of cues){if(cue.time>time)break;if(status==='playing')position+=cue.time-last;last=cue.time;
  if(cue.action==='play'){track=cue.track;position=0;status='playing';epoch=cue.id;}
  if(cue.action==='pause')status=track?'paused':'stopped';
  if(cue.action==='resume')status='playing';
  if(cue.action==='stop'){track=null;position=0;status='stopped';epoch=cue.id;}
  if(cue.volume!==undefined)volume=cue.volume;
 }
 if(status==='playing')position+=Math.max(0,time-last);return {track,status,position,volume,epoch};
}
export function dialogueFrame(d,localTime,profile={rate:9}){
 if(!d)return {count:0,text:'',remaining:'',glyph:null};
 if(localTime<d.at)return {count:0,text:'',remaining:d.text,glyph:null};
 const chars=Array.from(d.text),weights=chars.map(c=>/[，。！？；：、,.!?;:\s]/u.test(c)?2.3:1);
 const total=weights.reduce((a,b)=>a+b,0);const seconds=Math.min(Math.max(.3,d.until-d.at-.7),total/(profile.rate||9));
 const progress=Math.max(0,localTime-d.at),limit=progress/seconds*total;let sum=0,count=0;
 for(const w of weights){if(sum>limit)break;sum+=w;count++;}
 count=Math.min(chars.length,count);return {count,text:chars.slice(0,count).join(''),remaining:chars.slice(count).join(''),glyph:chars[count-1]||null};
}
export function voiceSamples(profile,index=0,sampleRate=44100){
 const duration=profile.duration,buffer=new Float32Array(Math.ceil(duration*sampleRate));
 const frequency=profile.frequency*2**(([-1,0,1,0,-.5,.5][index%6])/12);let seed=(index+1)*137;
 for(let i=0;i<buffer.length;i++){const t=i/sampleRate,phase=2*Math.PI*frequency*t;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed/4294967296*2-1)*profile.grit;
  const wave=Math.sin(phase)+(profile.wave==='square'?.22:profile.wave==='triangle'?.09:0)*Math.sin(phase*3)+.08*Math.sin(phase*2);
  const envelope=Math.min(1,t/.005)*Math.max(0,1-t/duration)**1.6;buffer[i]=(wave+noise)*envelope*.26;
 }return buffer;
}
