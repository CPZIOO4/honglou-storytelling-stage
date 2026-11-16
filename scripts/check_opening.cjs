const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-611-0_26.1112.611.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{let browser;try{
 const story=JSON.parse(fs.readFileSync('.runtime/latest-story.json','utf8'));assert(story.prologue?.review?.passed);
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}});await page.goto('http://127.0.0.1:4173/?qa=1');await page.waitForFunction(()=>window.__STAGE_TEST__?.state().ready,null,{timeout:60000});
 const timeline=await page.evaluate(()=>__STAGE_TEST__.presentation()),intro=timeline.segments.find(s=>s.kind==='prologue');assert(intro);assert.equal(timeline.segments[0].kind,'opening');assert.equal(timeline.segments[1].kind,'prologue');
 await page.click('#skip-overlay');await page.evaluate(t=>__STAGE_TEST__.seekPresentation(t),intro.start+1);await page.waitForTimeout(700);
 assert.equal(await page.locator('#bridge-text').innerText(),story.prologue.text);assert(!(await page.locator('#dialogue').isVisible()));assert.equal(await page.locator('.actor-label:visible').count(),0);
 const first=await page.evaluate(()=>__STAGE_TEST__.state().state.actors);assert.equal(await page.evaluate(()=>__STAGE_TEST__.state().presentation.storyTime),0);
 await page.evaluate(t=>__STAGE_TEST__.seekPresentation(t),intro.end-.1);assert.deepEqual(await page.evaluate(()=>__STAGE_TEST__.state().state.actors),first);
 await page.screenshot({path:'qa/prologue-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
 const box=await page.locator('#bridge-text').boundingBox(),stage=await page.locator('.stage-shell').boundingBox();assert(box.x>=0&&box.x+box.width<=390);assert(box.y>=stage.y&&box.y+box.height<stage.y+stage.height-35);await page.screenshot({path:'qa/prologue-mobile.png',fullPage:true});
 await page.click('#skip-overlay');assert.equal(await page.evaluate(()=>__STAGE_TEST__.state().presentation.kind),'performance');assert(!(await page.locator('#scene-overlay').isVisible()));await page.click('#restart');assert.equal(await page.evaluate(()=>__STAGE_TEST__.state().presentation.kind),'opening');
 const result={passed:true,storyId:story.id,prologue:story.prologue.text,duration:intro.duration,frozen:true,skip:true,replay:true};fs.writeFileSync('qa/opening-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser?.close();}})().catch(e=>{console.error(e);process.exitCode=1});
