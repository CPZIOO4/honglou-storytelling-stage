export function validatePrologue(value){
 if(!value||typeof value.text!=='string'||value.text.trim().length<30||value.text.length>120)throw Error('开场背景须为30至120字，不是剧情摘要');
 if(/围坐|坐在|坐下|落座|坐定|坐着/.test(value.text))throw Error('当前舞台皆为站姿，开场不能声称人物已围坐或坐下');
 return {text:value.text.trim()};
}
export async function composePrologue({ask,cards}){
 let rejected=null,issues=null;
 const background={scene:{place:cards.scene.place,time:cards.scene.time,initialSituation:cards.scene.initialSituation,factBoundary:cards.scene.factBoundary,stageLimits:'角色皆为站姿；开场期间冻结初态，不描写围坐、落座、端物或已经商定出发。'},characters:cards.characters.map(({id,name,description})=>({id,name,description})),family:cards.relationshipFacts.filter(f=>['family_roles','winter_need'].includes(f.id))};
 for(let attempt=0;attempt<2;attempt++){
  const value=await ask('为红楼说书舞台写开场介绍。只输出JSON {"text":"一小段自然说书文字，建议70至100字，上限120字"}。只用background里的初态：点明京郊这一家、刘姥姥是刘氏母亲及狗儿岳母、她帮女儿女婿照看孩子、秋尽冬初衣食尚未办齐，由此引入商量家计。语言亲切平实，有说书味而不堆套话。不能预先讲谁将出发、找到谁、得到什么；不能夸大为断粮或编造过去灾难。别复述人物卡标签，不评价谁是主角或谁负责推进。旁白不是人物听见的台词。',{background,rejected,issues},'prologue-write-'+attempt);
  try{rejected=validatePrologue(value);}catch(e){if(attempt===1)throw e;rejected=value;issues=[e.message];continue;}
  const review=await ask('只审核开场背景是否帮助第一次观看的人理解家庭关系、时地及眼前难处，且不虚构库存、过去事件或预告决定。输出JSON {"passed":true或false,"issues":["具体问题"]}。用词自然，不以原著固定结局要求它。',{background,prologue:rejected},'prologue-review-'+attempt);
  if(review.passed===true&&Array.isArray(review.issues)&&!review.issues.length)return {...rejected,review};
  if(attempt===1)throw Error('开场背景未通过：'+JSON.stringify(review.issues));issues=review.issues;
 }
}
