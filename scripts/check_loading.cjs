const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-611-0_26.1112.611.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{let browser;try{
 browser=await chromium.launch({channel:'msedge',headless:true});const base='http://127.0.0.1:4173/?qa=1';
 const page=await browser.newPage();let attempts=0;
 await page.route('**/assets/characters/granny/body.png*',route=>++attempts===1?route.abort('failed'):route.continue());
 await page.goto(base);await page.waitForFunction(()=>window.__STAGE_TEST__?.state().ready,null,{timeout:60000});assert.equal(attempts,2);await page.close();
 const failed=await browser.newPage();let blocked=true,failedAttempts=0;
 await failed.route('**/assets/characters/granny/body.png*',route=>{if(blocked){failedAttempts++;return route.abort('failed');}return route.continue();});
 await failed.goto(base);await failed.waitForFunction(()=>document.querySelector('#loading strong').textContent==='舞台未能载入',null,{timeout:60000});
 const message=await failed.locator('#load-status').innerText();assert(message.includes('刘姥姥的正面图片'));assert.equal(failedAttempts,2);assert(await failed.getByRole('button',{name:'重新加载',exact:true}).isVisible());
 await failed.screenshot({path:'qa/loading-resource-error.png',fullPage:true});blocked=false;await failed.getByRole('button',{name:'重新加载',exact:true}).click();await failed.waitForFunction(()=>window.__STAGE_TEST__?.state().ready,null,{timeout:60000});
 const result={passed:true,transientRecovered:true,retriesBounded:true,resourceNamed:true,reloadRecovered:true};fs.writeFileSync('qa/loading-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser?.close();}})().catch(e=>{console.error(e);process.exitCode=1});
