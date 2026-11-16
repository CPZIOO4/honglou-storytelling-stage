export function validateFactRefs(dialogue,cards){
 if(!Array.isArray(dialogue.factRefs))throw Error('每句需有factRefs；自己的感受或提问可用[]');
 const allowed=(cards.relationshipFacts||[]).filter(f=>f.knownBy.includes(dialogue.speaker)).map(f=>f.id);
 for(const ref of dialogue.factRefs)if(!allowed.includes(ref))throw Error(`${dialogue.speaker}不可使用卡片事实${ref}；可用${JSON.stringify(allowed)}。听别人讲到的事情引用knowledgeRefs，不改成自己的经历。`);
}
export function runtimeCards(cards){
 return {revision:cards.revision,pacing:cards.pacing,knowledgePolicy:cards.knowledgePolicy,relationshipFacts:cards.relationshipFacts,worldbook:cards.worldbook,
  scene:Object.fromEntries(['id','title','place','time','initialSituation','availableProps','boundary','factBoundary','narrationPolicy','environmentCard'].map(k=>[k,cards.scene[k]])),
  characters:cards.characters.map(c=>Object.fromEntries(['id','name','description','personality','motivation','speech','knowledge','knownFactIds','unknownAtStart','understanding','performance','characterCore'].map(k=>[k,c[k]])))};
}
export function scriptEvidence(plan){
 const past=new Map();return plan.beats.flatMap(b=>b.dialogue.map((d,i)=>{const entry={eventId:b.id+':'+i,speaker:d.speaker,to:d.to,mode:d.mode,text:d.text,cardFacts:d.factRefs||[],citedSpeech:(d.knowledgeRefs||[]).map(ref=>past.has(ref)?{eventId:ref,speaker:past.get(ref).speaker,text:past.get(ref).text}:{eventId:ref,missing:true})};past.set(entry.eventId,entry);return entry;}));
}
