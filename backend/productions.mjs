import {readData as read,latestPath} from './productions/common.mjs';
export {latestPath,readLatest,lineageCurrent,productionParents} from './productions/common.mjs';
import loadGate from './productions/gate.mjs';
import loadHomecoming from './productions/homecoming.mjs';
import loadDelivery from './productions/delivery.mjs';
import loadArrange from './productions/arrange.mjs';
import loadAudience from './productions/audience.mjs';
import loadInvite from './productions/invite.mjs';
import loadReport from './productions/report.mjs';
import loadReception from './productions/reception.mjs';
import loadReturnHome from './productions/returnhome.mjs';
import loadWaiting from './productions/waiting.mjs';
import loadZhouHome from './productions/zhouhome.mjs';
import loadBackstreet from './productions/backstreet.mjs';
const loaders={gate:loadGate,homecoming:loadHomecoming,delivery:loadDelivery,arrange:loadArrange,audience:loadAudience,invite:loadInvite,report:loadReport,reception:loadReception,returnhome:loadReturnHome,waiting:loadWaiting,zhouhome:loadZhouHome,backstreet:loadBackstreet};
export async function loadProduction(root,scene='home'){
 latestPath(root,scene);
 const [base,line,audio]=await Promise.all(['cards','storyline','audio-library'].map(n=>read(root,n)));
 if(scene==='home')return {rawCards:base,stage:await read(root,'stage'),characters:await read(root,'characters'),seed:{initial:(await read(root,'deepseek-first-scene')).initial},storyline:line,audioLibrary:audio,nodeId:line.entryNode,previousMemory:null,parent:null};
 return loaders[scene](root,base,line,audio);
}
