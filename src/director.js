import {compileStory,buildDirectorContext} from './engine.js';
/** Current provider: assistant authored, deterministic and fully offline after loading. */
export class RecordedDirector {
  async load(url='data/scene-one.json'){
    const r=await fetch(url);if(!r.ok)throw Error('无法读取预编说书数据');return r.json();
  }
  context(cards,compiled,time){return buildDirectorContext(cards,compiled,time);}
}
/** Future server adapter. API secrets belong on the server, never in this client. */
export class ServerDirector {
  constructor(endpoint='/api/director/next'){this.endpoint=endpoint;}
  async next(context,{signal}={}){
    const response=await fetch(this.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(context),signal});
    if(!response.ok)throw Error(`说书接口未就绪 (${response.status})`);
    return response.json();
  }
  acceptBeat(story,beat,stage,characters){
    const candidate={...story,beats:[...story.beats,beat]};compileStory(candidate,stage,characters);return candidate;
  }
}
