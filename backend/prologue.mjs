export function validatePrologue(value){
 if(!value||typeof value.text!=='string'||value.text.trim().length<30||value.text.length>120)throw Error('开场背景须为30至120字，不是剧情摘要');
 if(/围坐|坐在|坐下|落座|坐定|坐着/.test(value.text))throw Error('当前舞台皆为站姿，开场不能声称人物已围坐或坐下');
 return {text:value.text.trim()};
}
export async function composePrologue({ask,cards}){
 let rejected=null,issues=null;
 const background={scene:{place:cards.scene.place,time:cards.scene.time,initialSituation:cards.scene.initialSituation,factBoundary:cards.scene.factBoundary,availableProps:cards.scene.availableProps,environmentCard:cards.scene.environmentCard,narrationPolicy:cards.scene.narrationPolicy,stageLimits:'角色皆为站姿；开场冻结当前初态，不描述未支持的坐下或拿物。已完成的场间路途仅以initialSituation为准。陈设及门帘状态按availableProps和environmentCard，不擅改已经束起的帘子为半垂。'},characters:cards.characters.map(({id,name,description})=>({id,name,description})),family:cards.relationshipFacts.filter(f=>['family_roles','winter_need'].includes(f.id))};
 for(let attempt=0;attempt<2;attempt++){
  const value=await ask((cards.scene.id==='fengjie-report'?'第八场正房回话，30至60字。按background初态，平儿独自从内院门前来到正房堂屋入口，王熙凤在会客炕前空地站着，尚未回话。描写已有窗光、门帘或陈设即可，不写坐下翻账、用完饭、精确院落数量或钟响；刘姥姥与周瑞妻子仍在廊下不在本场，不预告凤姐的回应。只输出JSON {"text":"自然过场"}。':cards.scene.id==='rongfu-reception'?'第七场廊下相见。只依initialSituation写30至60字，交代周瑞妻子已带刘姥姥来到倒厅旁院门外，平儿仍在廊边。尚未交谈，不预告本场回应，不添加奶奶召见、回禀结果、具体经过几重院落或已进正房。不要把第五场周瑞妻子单独到来当作当前初态。只输出JSON {"text":"自然过场"}。':cards.scene.id==='zhou-wife-return'?'这是第六场回屋传信。只用当前初态写30至60字过场，周瑞妻子已从倒厅旁院门外廊边返回自家门边，刘姥姥仍在屋内等消息，尚未交谈。她此前未进入倒厅，不编造经过几重院落等未设定路线。不要提前讲平儿许可、刘姥姥回应、凤姐召见或钱粮；只交代省略的返回路途与当前处境，不重复前情总结。输出JSON {"text":"自然过场"}。':cards.scene.id==='rongfu-waiting'?'这是第五场倒厅旁递话。只依初态，以30至70字交代本轮实际行动者按约来到倒厅旁，影壁与廊边平儿。未在场的刘姥姥不要写成在倒厅等待。不要新增凤姐口信或已经应允，不重复家中故事，不写坐下或正在做未支持动作。只输出JSON {"text":"简短过场"}。':cards.scene.id==='zhou-wife-home'?'这是第四场周瑞妻子住处，承接第三场的带路。只依初态，用30至70字交代孩子已领到门前与小院、束起的帘子。不要提前认亲、邀请、坐下、倒茶、给钱或派丫鬟；不重复前三场的家计与问路。只输出JSON {"text":"自然过场"}。':cards.scene.id==='rongfu-backstreet'?'这是第三场后街寻人，承接已播放的前两场。只用initialSituation简短交代沿墙绕来及后街门口的环境，30至70字。不要重复家庭介绍，不写孩子已答应带路，不新增购物、酬谢或周瑞妻子回应；不让未配置的其他孩子、小贩行动。输出JSON {"text":"自然过场"}。':cards.scene.id==='rongfu-gate'?'这是第二场荣府门前。依initialSituation简短交代上一场决定落实后的路途与初到高门，来访人员必须正确。不能重讲家中未议出发，不能提前泄露周瑞不在、后街住处或本场结果。只输出JSON {"text":"30至120字自然过场"}。':'为红楼说书舞台写开场介绍。只输出JSON {"text":"一小段自然说书文字，建议70至100字，上限120字"}。只用background里的初态：点明京郊这一家、刘姥姥是刘氏母亲及狗儿岳母、她帮女儿女婿照看孩子、秋尽冬初衣食尚未办齐，由此引入商量家计。语言亲切平实，有说书味而不堆套话。不能预先讲谁将出发、找到谁、得到什么；不能夸大为断粮或编造过去灾难。别复述人物卡标签，不评价谁是主角或谁负责推进。旁白不是人物听见的台词。'),{background,rejected,issues},'prologue-write-'+attempt);
  try{rejected=validatePrologue(value);}catch(e){if(attempt===1)throw e;rejected=value;issues=[e.message];continue;}
  const review=await ask('只审核prologue文字是否准确交代background支持的时地、当前处境，不虚构库存、过去事件或预告决定。background是依据，不能把其中未出现在prologue的字段当成旁白错误。若为家中第一场，应介绍家庭关系与难处；若为后续场景，它承接已播放的前场，只需简短明确交代路途、实际来访人员和初到府门，不要求重述整个家庭与求助背景。输出JSON {"passed":true或false,"issues":["具体问题"]}。用词自然，不以原著固定结局要求它。',{background,prologue:rejected},'prologue-review-'+attempt);
  if(review.passed===true&&Array.isArray(review.issues)&&!review.issues.length)return {...rejected,review};
  if(attempt===1)throw Error('开场背景未通过：'+JSON.stringify(review.issues));issues=review.issues;
 }
}
