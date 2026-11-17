// Short browser regression for the shared speech-bubble layout, not story playback.
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-611-0_26.1112.611.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
try{const page=await browser.newPage({viewport:{width:390,height:844}});await page.route('**/api/director/status?*',r=>r.fulfill({json:{configured:false,stale:false,latest:null,active:null}}));
for(const [key,def] of Object.entries(JSON.parse(fs.readFileSync('data/productions.json','utf8')))){
 const story=JSON.parse(fs.readFileSync(def.story,'utf8'));await page.goto('http://127.0.0.1:4173/?scene='+key+'&qa=1');await page.waitForFunction(()=>window.__STAGE_TEST__?.state().ready,null,{timeout:60000});
 let start=0,count=0;for(const beat of story.beats){for(const d of beat.dialogue){await page.evaluate(t=>__STAGE_TEST__.seek(t),start+d.at+.3);
 const b=await page.locator('#dialogue').boundingBox(),s=await page.locator('#stage').boundingBox(),geometry=await page.evaluate(()=>({faces:__STAGE_TEST__.faces(),heads:__STAGE_TEST__.heads()}));
 assert(b&&b.x>=0&&b.x+b.width<=391,key+' 气泡越界');const x=b.x-s.x,y=b.y-s.y;
 for(const f of geometry.faces){const overlap=Math.max(0,Math.min(x+b.width,f.right+8)-Math.max(x,f.left-8))*Math.max(0,Math.min(y+b.height,f.bottom+4)-Math.max(y,Math.min(f.top,geometry.heads[f.id].y-4)));assert(overlap<1,key+' 气泡遮住 '+f.id);}
 count++;}start+=beat.duration;}results.push({scene:key,lines:count});
}fs.writeFileSync('qa/bubble-layout-all.json',JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify({passed:true,results}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
