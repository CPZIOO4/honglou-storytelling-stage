export const MODEL='deepseek-flash';
export const THINKING={thinking:{type:'enabled'},reasoning_effort:'high'};
export const MODEL_TIMEOUT_MS=360000;
export function modelRequest(system,input){return {model:MODEL,...THINKING,messages:[{role:'system',content:system},{role:'user',content:typeof input==='string'?input:JSON.stringify(input)}],response_format:{type:'json_object'},max_tokens:32768,stream:false};}
