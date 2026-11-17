import {batchStaticModel} from './render/static-batches.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {loadResource} from './resource-loader.js';
const convert=p=>new THREE.Vector3(p[0],p[2],-p[1]);
export class StageView{
  constructor(container,stage,characters,onProgress){
    this.container=container;this.stage=stage;this.characters=characters;this.actors=new Map();this.cameraId=null;this.override=null;this.progress=onProgress;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.AgXToneMapping;this.renderer.toneMappingExposure=1.6;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.append(this.renderer.domElement);
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-6,6,4,-4,.1,100);
    this.ambient=new THREE.HemisphereLight(0xe6eee5,0x6b6150,2.0);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight(0xffe0ac,3.1);this.sun.position.copy(convert([-3,-4,8]));this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:30});this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.025;this.scene.add(this.sun);
    this.fill=new THREE.DirectionalLight(0xb5d1ee,1.4);this.fill.position.copy(convert([4,4,6]));this.scene.add(this.fill);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);
  }
  async load(){
    const gltfLoader=new GLTFLoader();const gltf=await loadResource('屋舍模型',this.stage.model,url=>gltfLoader.loadAsync(url));this.model=gltf.scene;this.model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});this.batchStats=batchStaticModel(this.model,o=>!!this.stage.cutaway?.prefixes.some(p=>o.name.startsWith(p)));this.cutawayMeshes=[];this.model.traverse(o=>{if(o.isMesh&&o.userData.stageCutaway)this.cutawayMeshes.push(o);});this.scene.add(this.model);this.progress('屋舍已就位，正在载入本场人物');
    const loader=new THREE.TextureLoader();let done=0;
    for(const c of this.characters){
      const prefix=`assets/characters/${c.id}/`;const tex={};
      await Promise.all(['body','back',...c.expressions.map(x=>'head-'+x)].map(async k=>{tex[k]=await loadResource(`${c.name}的${k==='body'?'正面':k==='back'?'背面':'表情'}图片`,prefix+k+'.png',url=>loader.loadAsync(url));tex[k].colorSpace=THREE.SRGBColorSpace;tex[k].magFilter=THREE.LinearFilter;tex[k].minFilter=THREE.LinearMipmapLinearFilter;}));
      const bottom=(c.canvasHeight-c.alphaBounds[3])/c.canvasHeight,top=(c.canvasHeight-c.alphaBounds[1])/c.canvasHeight;
      const ph=c.height/(top-bottom),pw=ph*c.width/c.canvasHeight,center=ph/2-bottom*ph,neck=(1-(c.neckY??435)/c.canvasHeight-bottom)*ph;
      const group=new THREE.Group();const geo=new THREE.PlaneGeometry(pw,ph);
      const material=map=>new THREE.MeshBasicMaterial({map,transparent:true,alphaTest:.035,side:THREE.DoubleSide,depthWrite:true,toneMapped:false});
      const body=new THREE.Mesh(geo,material(tex.body));body.position.y=center;group.add(body);
      const pivot=new THREE.Group();pivot.position.y=neck;group.add(pivot);
      const head=new THREE.Mesh(geo,material(tex['head-neutral']));head.position.set(0,center-neck,.004);pivot.add(head);
      const back=new THREE.Mesh(geo,material(tex.back));back.position.y=center;back.visible=false;group.add(back);
      this.scene.add(group);
      const shadow=new THREE.Mesh(new THREE.CircleGeometry(.24,32),new THREE.MeshBasicMaterial({color:0x263728,transparent:true,opacity:.15,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.y=.56;this.scene.add(shadow);
      const cue=new THREE.Mesh(new THREE.RingGeometry(.25,.28,48),new THREE.MeshBasicMaterial({color:0xe6c78a,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}));cue.rotation.x=-Math.PI/2;cue.scale.y=.65;this.scene.add(cue);
      const label=document.createElement('span');label.className='actor-label';label.dataset.actor=c.id;label.textContent=c.name;this.container.append(label);
      this.actors.set(c.id,{group,body,head,pivot,back,shadow,cue,label,tex,height:c.height,expression:null});
      done++;this.progress(`人物 ${done} / ${this.characters.length} 已就位`);
    }
    this.resize();
  }
  resize(){const {width,height}=this.container.getBoundingClientRect();if(!width||!height)return;this.width=width;this.height=height;this.renderer.setSize(width,height);if(this.currentCamera)this.applyCamera(this.currentCamera);this.invalidate?.();}
  applyCamera(id){let c=this.stage.cameras[id];if(this.width<600&&id==='wide'&&!this.override)c={...this.stage.cameras.family,scale:7.7};if(this.width<600&&c.mobile&&this.override!=='wide')c={...c,...c.mobile};this.currentCamera=id;const aspect=(this.width||800)/(this.height||450);const half=c.scale/2;Object.assign(this.camera,{left:-half,right:half,top:half/aspect,bottom:-half/aspect});this.camera.position.copy(convert(c.position));this.camera.lookAt(convert(c.target));this.camera.updateProjectionMatrix();}
  showWide(){this.override=this.currentCamera==='wide'?'family':'wide';this.applyCamera(this.override);}
  headScreen(id){const a=this.actors.get(id);if(!a?.group.visible)return null;const p=a.group.position.clone();p.y+=a.height+.05;p.project(this.camera);return {x:(p.x*.5+.5)*this.width,y:(-p.y*.5+.5)*this.height};}
  faceRects(){return [...this.actors].filter(([,a])=>a.group.visible).map(([id,a])=>{const p=this.headScreen(id),height=a.height/(this.camera.top-this.camera.bottom)*this.height;return {id,left:p.x-height*.18,right:p.x+height*.18,top:p.y+height*.06,bottom:p.y+height*.34};});}
  layoutNames(){
    const faces=this.faceRects(),placed=[];const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
    for(const [id,a] of this.actors){if(a.label.hidden)continue;const h=this.headScreen(id),w=a.label.offsetWidth,height=a.label.offsetHeight,y=parseFloat(a.label.style.top),offset=Math.min(18,w*.3);
      const choices=[h.x,h.x-offset,h.x+offset].map(x=>Math.max(w/2+5,Math.min(this.width-w/2-5,x))).map(x=>({x,left:x-w/2,right:x+w/2,top:y-height,bottom:y}));
      const score=r=>faces.filter(f=>f.id!==id).reduce((n,f)=>n+overlap(r,f)*10,0)+placed.reduce((n,f)=>n+overlap(r,f)*8,0)+Math.abs(r.x-h.x);
      const best=choices.sort((a,b)=>score(a)-score(b))[0];a.label.style.left=best.x+'px';placed.push(best);
    }
  }
  update(state){
    if(this.stage.cutaway){const indoors=Object.values(state.actors).some(a=>a.visible&&a.position[1]>this.stage.cutaway.minY);for(const mesh of this.cutawayMeshes||[])mesh.visible=!indoors;}
    if(state.camera!==this.cameraId){this.cameraId=state.camera;this.override=null;this.applyCamera(state.camera);}else if(!this.currentCamera)this.applyCamera(state.camera);
    const light={day:[2,3.1,1.4,1.6],night:[.75,.55,.35,1.25],dawn:[1.7,2.4,1.9,1.5]}[state.lighting];this.ambient.intensity=light[0];this.sun.intensity=light[1];this.fill.intensity=light[2];this.renderer.toneMappingExposure=light[3];
    for(const [id,a]of this.actors){
      const s=state.actors[id];const speaking=state.dialogue?.speaker===id,receiving=!!s.addressedBy;const covered=state.presentationObscured;
      a.group.visible=s.visible;a.shadow.visible=s.visible;a.label.hidden=!s.visible||speaking||covered;
      const pos=convert(s.position);a.group.position.copy(pos);a.group.position.y+=s.moving?Math.abs(Math.sin(state.time*8))*.021:0;
      a.group.rotation.y=Math.atan2(this.camera.position.x-pos.x,this.camera.position.z-pos.z);
      a.group.scale.x=s.facing==='left'?-1:1;
      const focus=s.addressedBy||s.facingTarget;
      if(state.actors[focus]){const target=convert(state.actors[focus].position).project(this.camera),self=pos.clone().project(this.camera);a.group.scale.x=target.x<self.x?-1:1;}
      const rear=s.facing==='back';a.body.visible=!rear;a.pivot.visible=!rear;a.back.visible=rear;
      if(a.expression!==s.expression){a.head.material.map=a.tex['head-'+s.expression];a.head.material.needsUpdate=true;a.expression=s.expression;}
      a.pivot.rotation.z=0;a.pivot.rotation.y=0;
      if(s.gesture){const v=Math.sin(s.gesture.progress*Math.PI*4)*Math.sin(s.gesture.progress*Math.PI);if(s.gesture.kind==='nod')a.pivot.rotation.z=v*.065;else a.pivot.rotation.y=v*.18;}
      a.shadow.position.set(pos.x,pos.y+.009,pos.z);a.shadow.material.opacity=state.dialogue?.speaker===id ? .21:.14;
      a.cue.visible=s.visible&&!covered&&(speaking||receiving);a.cue.position.set(pos.x,pos.y+.016,pos.z);a.cue.material.color.set(speaking?0xfff4d5:0xd8b36b);a.cue.material.opacity=speaking?.65:.48;
      const tint=state.dialogue&&!speaking&&!receiving ? .93 : 1;for(const mesh of [a.body,a.head,a.back])mesh.material.color.setRGB(tint,tint,tint);
      const head=this.headScreen(id);if(head){a.label.style.left=`${Math.max(34,Math.min(this.width-34,head.x))}px`;a.label.style.top=`${Math.max(25,head.y+3)}px`;}else a.label.hidden=true;a.label.classList.toggle('speaking',speaking);a.label.classList.toggle('receiving',receiving);a.label.dataset.speaking=String(speaking);a.label.dataset.receiving=String(receiving);
    }
    this.propMeshes??=new Map();
    for(const [id,p]of Object.entries(state.props||{})){
      let group=this.propMeshes.get(id);if(!group){group=new THREE.Group();const rice=this.stage.props[id].kind==='rice';
        const cloth=new THREE.MeshStandardMaterial({color:rice?0xcbb98d:0x884b39,roughness:1,flatShading:true});
        const bag=new THREE.Mesh(new THREE.CylinderGeometry(rice?.15:.085,rice?.21:.105,rice?.40:.22,8),cloth);bag.castShadow=true;group.add(bag);
        const neck=new THREE.Mesh(new THREE.CylinderGeometry(rice?.07:.045,rice?.11:.06,.08,8),cloth);neck.position.y=rice?.22:.13;group.add(neck);
        const tie=new THREE.Mesh(new THREE.TorusGeometry(rice?.075:.045,.018,4,8),new THREE.MeshStandardMaterial({color:0x5c4931,roughness:1}));tie.rotation.x=Math.PI/2;tie.position.y=rice?.21:.125;group.add(tie);
        if(!rice){const coin=new THREE.Mesh(new THREE.TorusGeometry(.045,.015,4,8),new THREE.MeshStandardMaterial({color:0xb89a57,roughness:.85}));coin.position.set(0,.04,.105);group.add(coin);}
        this.scene.add(group);this.propMeshes.set(id,group);
      }group.visible=p.visible;group.position.copy(convert(p.position));
    }
    for(const [id,g]of this.propMeshes)if(!state.props?.[id])g.visible=false;
    this.layoutNames();this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.resizeObserver.disconnect();for(const a of this.actors.values())for(const texture of Object.values(a.tex))texture.dispose();this.scene.traverse(o=>{o.geometry?.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)if(m){m.map?.dispose();m.dispose();}});this.renderer.dispose();}
}
