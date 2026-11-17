const {spawnSync}=require('node:child_process'),fs=require('node:fs');
const {registry}=require('../lib/browser.cjs');
const startedAt=new Date().toISOString(),checks=[];fs.mkdirSync('qa',{recursive:true});
function run(name,args){const result=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true,timeout:240000,maxBuffer:4*1024*1024});fs.writeFileSync('qa/release-'+name+'.log',(result.stdout||'')+(result.stderr||''));const check={name,passed:result.status===0&&!result.error,exitCode:result.status,error:result.error?.message};checks.push(check);fs.writeFileSync('qa/release.json',JSON.stringify({startedAt,checks,completed:false,passed:false},null,2));console.log(JSON.stringify(check));if(!check.passed)throw Error('Verification failed: '+name+'; see qa/release-'+name+'.log');}
try{
 run('unit',['--test','tests/*.test.mjs']);
 run('catalog',['scripts/verify/audit.mjs']);
 run('loading',['scripts/verify/check-loading.cjs']);
 run('bubbles',['scripts/verify/check-bubbles.cjs']);
 run('audio',['scripts/verify/check-audio.cjs']);
 for(const scene of Object.keys(registry())){run('source-'+scene,['scripts/verify/check-authorship.mjs',scene]);run('play-'+scene,['scripts/verify/check-scene.cjs',scene]);}
 fs.writeFileSync('qa/release.json',JSON.stringify({startedAt,completed:true,checks,passed:true},null,2));console.log('All release checks passed');
}catch(error){console.error(error.message);process.exitCode=1;}
