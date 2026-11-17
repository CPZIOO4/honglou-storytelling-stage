const fs=require('node:fs');
function loadPlaywright(){
 if(process.env.PLAYWRIGHT_PACKAGE)return require(process.env.PLAYWRIGHT_PACKAGE);
 try{return require('playwright');}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
 return require('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-611-0_26.1112.611.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright');
}
const registry=()=>JSON.parse(fs.readFileSync('data/productions.json','utf8'));
function readStory(scene,{published=false}={}){
 const item=registry()[scene];if(!item)throw Error('Unknown scene '+scene);
 const local=scene==='home'?'.runtime/latest-story.json':`.runtime/latest-${scene}.json`;
 return JSON.parse(fs.readFileSync(!published&&fs.existsSync(local)?local:item.story,'utf8'));
}
module.exports={loadPlaywright,registry,readStory};
