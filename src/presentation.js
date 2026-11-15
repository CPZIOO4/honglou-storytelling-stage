// Presentation time includes title cards and short, frozen narrative bridges.
// Story time advances only while characters perform.
export function defaultPresentation(story){
 const morning=story.narrative?.handoff?.decision.status==='depart'&&/明早|明日|次日|天亮/.test(story.narrative?.handoff?.decision.departureCondition||'');
 return {opening:{title:story.title||'寒家谋生',subtitle:'京郊 · 狗儿家',duration:3.2},interludes:morning?[{afterBeat:story.beats.at(-1).id,duration:5.5,text:'一夜无话。\n天将明，正是约定动身的时候。',lighting:'dawn'}]:[]};
}
export function compilePresentation(story,compiled){
 const p=story.presentation||defaultPresentation(story);const opening=p.opening||{title:story.title||'寒家谋生',subtitle:'京郊 · 狗儿家',duration:3.2};
 const interludes=p.interludes||[];const segments=[],beatStarts={};let cursor=0;
 const add=s=>{if(!Number.isFinite(s.duration)||s.duration<=0||s.duration>30&&s.kind!=='performance')throw Error('过场时长不合法');segments.push({...s,start:cursor,end:cursor+s.duration});cursor+=s.duration;};
 if(opening.title)add({kind:'opening',title:opening.title,subtitle:opening.subtitle||'',duration:opening.duration??3.2,storyTime:0});
 const ids=new Set(compiled.beats.map(b=>b.id));for(const b of interludes)if(!ids.has(b.afterBeat)||typeof b.text!=='string'||!b.text.trim())throw Error('过场必须附在已有段落之后并有文本');
 for(const b of compiled.beats){beatStarts[b.id]=cursor;add({kind:'performance',beatId:b.id,storyTime:b.start,duration:b.duration});
  for(const bridge of interludes.filter(x=>x.afterBeat===b.id))add({kind:'interlude',text:bridge.text,duration:bridge.duration??5,storyTime:b.end===compiled.duration?b.end:b.end-.00001,lighting:bridge.lighting});
 }
 return {segments,beatStarts,duration:cursor,storyDuration:compiled.duration};
}
export function presentationAt(p,time){
 const t=Math.max(0,Math.min(p.duration,time));const s=p.segments.find(s=>t<s.end)||p.segments.at(-1);const local=t-s.start;
 return {...s,local,storyTime:s.kind==='performance'?s.storyTime+local:s.storyTime,finished:t>=p.duration,obscured:s.kind==='opening'||s.kind==='interlude',showText:s.kind==='opening'||local>=.65};
}
export function presentationTimeForStory(p,time){
 if(time>=p.storyDuration)return p.duration;
 const s=p.segments.find(s=>s.kind==='performance'&&time>=s.storyTime&&time<s.storyTime+s.duration);
 return s?s.start+time-s.storyTime:0;
}
