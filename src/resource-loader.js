// TextureLoader rejects with a DOM Event, which has no .message. Preserve the
// failing resource identity and retry a transient transport failure once.
export async function loadResource(label,url,load){
 let last;
 for(let attempt=0;attempt<2;attempt++){
  const target=attempt?url+(url.includes('?')?'&':'?')+'retry='+Date.now():url;
  try{return await load(target);}catch(error){last=error;if(!attempt)await new Promise(resolve=>setTimeout(resolve,250));}
 }
 throw new Error(`${label}加载失败（${url}）。${last?.message?' '+last.message:''} 请点击“重新加载”再试。`);
}
