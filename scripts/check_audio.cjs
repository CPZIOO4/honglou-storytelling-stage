const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-611-0_26.1112.611.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{let browser;try{
 const story=JSON.parse(fs.readFileSync('.runtime/latest-story.json','utf8')),library=JSON.parse(fs.readFileSync('data/audio-library.json','utf8'));
 assert.equal(story.generation.authoring.cardsRevision,JSON.parse(fs.readFileSync('data/cards.json','utf8')).revision);assert(!story.generation.presentationRevision);assert(story.soundtrack.cues.some(c=>c.action==='play'));
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.STAGE_BASE_URL||'http://127.0.0.1:4173/')+'?qa=1');await page.waitForFunction(()=>window.__STAGE_TEST__?.state().ready,null,{timeout:90000});
 const decoded=await page.evaluate(async tracks=>{const ctx=new AudioContext();try{const out=[];for(const t of tracks){const r=await fetch(t.url);if(!r.ok)throw Error('music fetch failed');const b=await ctx.decodeAudioData(await r.arrayBuffer());let peak=0,sum=0,n=0;const samples=b.getChannelData(0);for(let i=0;i<samples.length;i+=32){peak=Math.max(peak,Math.abs(samples[i]));sum+=samples[i]**2;n++;}out.push({id:t.id,duration:b.duration,sampleRate:b.sampleRate,peak,rms:Math.sqrt(sum/n)});}return out;}finally{await ctx.close();}},library.tracks);
 assert(decoded.every(t=>t.duration>60&&t.rms>.001));
 await page.click('#play');await page.waitForTimeout(1500);assert((await page.evaluate(()=>__STAGE_TEST__.audio())).unlocked);
 await page.evaluate(()=>__STAGE_TEST__.startAudioCapture());
 let base=0;const samples=[];
 for(const actor of ['gouer','granny','liushi','baner']){
  let at=null;base=0;for(const b of story.beats){const d=b.dialogue.find(d=>d.speaker===actor);if(d){at=base+d.at-.08;break;}base+=b.duration;}if(at===null)continue;
  await page.evaluate(t=>__STAGE_TEST__.seek(t),at);const before=await page.evaluate(()=>__STAGE_TEST__.audio());await page.waitForTimeout(1300);const after=await page.evaluate(()=>__STAGE_TEST__.audio());assert((after.byActor[actor]||0)>(before.byActor[actor]||0),JSON.stringify({actor,before,after}));const visible=await page.locator('#dialogue-visible').innerText(),full=await page.locator('#dialogue').getAttribute('data-full-text');assert(full.startsWith(visible));samples.push({actor,beeps:after.byActor[actor],rms:after.rms});
 }
 const capture=await page.evaluate(()=>__STAGE_TEST__.stopAudioCapture());fs.writeFileSync('qa/live-audio.webm',Buffer.from(capture));assert(capture.length>1000);
 await page.click('#play');const paused=await page.evaluate(()=>__STAGE_TEST__.audio());await page.waitForTimeout(350);const still=await page.evaluate(()=>__STAGE_TEST__.audio());assert.equal(still.beeps,paused.beeps);assert(still.musicPaused);assert(still.rms<.00001);
 const timeline=await page.evaluate(()=>__STAGE_TEST__.presentation());const beginOf=section=>section==='opening'?0:timeline.segments.find(s=>s.beatId===section&&s.kind==='performance').start;
 const pause=story.soundtrack.cues.find(c=>c.action==='pause'),resume=story.soundtrack.cues.find(c=>c.action==='resume');let resumed=null;if(pause&&resume){
 await page.evaluate(t=>__STAGE_TEST__.seekPresentation(t),beginOf(pause.section)+.1);await page.click('#play');await page.waitForTimeout(250);assert((await page.evaluate(()=>__STAGE_TEST__.audio())).musicPaused);
 await page.evaluate(t=>__STAGE_TEST__.seekPresentation(t),beginOf(resume.section)+.2);await page.waitForTimeout(1200);resumed=await page.evaluate(()=>__STAGE_TEST__.audio());assert(!resumed.musicPaused&&resumed.musicPosition>0,JSON.stringify(resumed));}
 await page.locator('.audio-settings summary').click();await page.locator('#audio-mute').click();await page.waitForTimeout(350);const muted=await page.evaluate(()=>__STAGE_TEST__.audio());assert(muted.muted&&muted.rms<.00001);await page.locator('#audio-mute').click();await page.waitForTimeout(700);assert(!(await page.evaluate(()=>__STAGE_TEST__.audio())).muted);
 await page.screenshot({path:'qa/audio-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'qa/audio-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 fs.writeFileSync('qa/audio-check.json',JSON.stringify({passed:true,storyId:story.id,dialogueAuthoring:story.generation.authoring,decoded,samples,paused:still,resumed,captureBytes:capture.length,errors},null,2));console.log(JSON.stringify({passed:true,decoded:decoded.map(x=>({id:x.id,duration:x.duration})),actors:samples.map(x=>x.actor),captureBytes:capture.length}));
 }finally{await browser?.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
