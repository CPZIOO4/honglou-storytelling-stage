// Reconstruct ownership on every seek. Amounts remain unspecified narrative grants.
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
export function propState(story,stage,events,time,actors){
 const result={};
 for(const [id,owner]of Object.entries(story.initial.propOwners||{}))result[id]={owner,transferring:null};
 for(const e of events){if(e.time>time)break;if(e.type!=='transfer')continue;const p=result[e.prop];if(!p)continue;
  if(time>=e.time+e.duration){p.owner=e.target;p.transferring=null;}else p.transferring={from:e.actor,to:e.target,progress:(time-e.time)/e.duration};
 }
 for(const [id,p]of Object.entries(result)){const spec=stage.props[id],offset=spec.offset||[.28,0,.68],a=actors[p.owner];let position=a.position.map((v,i)=>v+offset[i]);
  if(p.transferring){const b=actors[p.transferring.to],t=p.transferring.progress;position=position.map((v,i)=>v+(b.position[i]+offset[i]-v)*t);position[2]+=.16*Math.sin(t*Math.PI);}
  Object.assign(p,{position,visible:a.visible&&(!p.transferring||actors[p.transferring.to].visible),label:spec.label});
 }
 return result;
}
export function validateTransfers(compiled,stateAt){
 const errors=[],owners={...compiled.story.initial.propOwners},ids=new Set(compiled.characters.map(c=>c.id)),last={};
 for(const [id,owner]of Object.entries(owners))if(!compiled.stage.props?.[id]||!ids.has(owner))errors.push('道具初始归属无效 '+id);
 for(const e of compiled.events.filter(e=>e.type==='transfer')){
  if(!compiled.stage.props?.[e.prop]||owners[e.prop]!==e.actor||!ids.has(e.target)||e.target===e.actor){errors.push('只能交出自己实际持有的道具 '+e.prop);continue;}
  if((last[e.prop]??0)>e.time)errors.push('同一道具交接重叠 '+e.prop);
  const samples=new Set([e.time,e.time+e.duration-.001]);for(let t=e.time;t<e.time+e.duration;t+=.1)samples.add(t);for(const x of compiled.events)if(x.time>=e.time&&x.time<e.time+e.duration)samples.add(x.time);
  for(const t of samples){const s=stateAt(compiled,t),a=s.actors[e.actor],b=s.actors[e.target];
   if(!a?.visible||!b?.visible||a.moving||b.moving||distance(a.position,b.position)>1.6)errors.push('交接双方须可见、停步并靠近至1.6以内');
  }
  for(const b of compiled.beats)for(const d of b.dialogue)if(b.start+d.at<e.time+e.duration&&b.start+d.until>e.time)errors.push('交接需置于对白间隙，收物后才说后续台词');
  owners[e.prop]=e.target;last[e.prop]=e.time+e.duration;
 }
 return [...new Set(errors)];
}
