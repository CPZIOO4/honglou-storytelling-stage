const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-611-0_26.1112.611.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{let browser;try{
 const story=JSON.parse(fs.readFileSync('.runtime/latest-story.json','utf8'));assert(story.narrative.dialogueReview.passed);assert(story.narrative.dialogueReview.checks.every(c=>c.passed));
 browser=await chromium.launch({channel:'msedge',headless:true});const p=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4173/?qa=1');await p.waitForFunction(()=>window.__STAGE_TEST__?.state().ready,null,{timeout:60000});
 const lines=[];let base=0;for(const b of story.beats){for(const d of b.dialogue)lines.push({...d,time:base+d.at+Math.min(2,(d.until-d.at)/2)});base+=b.duration;}
 for(const d of lines){await p.evaluate(t=>__STAGE_TEST__.seek(t),d.time);assert.equal(await p.locator('#dialogue').getAttribute('data-full-text'),d.text);assert.equal(await p.locator('#dialogue').getAttribute('data-speaker'),d.speaker);}
 const longest=lines.reduce((a,b)=>a.text.length>b.text.length?a:b);await p.evaluate(t=>__STAGE_TEST__.seek(t),longest.time);await p.screenshot({path:'qa/conversation-desktop.png',fullPage:true});
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);const box=await p.locator('#dialogue').boundingBox();assert(box.x>=0&&box.x+box.width<=390);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:'qa/conversation-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 const result={passed:true,storyId:story.id,lines:lines.length,connections:story.narrative.dialogueReview.connections.length,longestLine:longest.text.length,errors};fs.writeFileSync('qa/conversation-playback.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser?.close();}})().catch(e=>{console.error(e);process.exitCode=1});
