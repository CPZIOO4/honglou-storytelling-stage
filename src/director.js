/** Load the selected, reviewed production. Generation stays on the local server. */
export class RecordedDirector {
 async load(url){if(!url)throw Error('缺少演出路径');const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw Error('无法读取演出数据');return response.json();}
}
