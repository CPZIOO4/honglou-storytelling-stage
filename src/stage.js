import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
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
    const gltf=await new GLTFLoader().loadAsync(this.stage.model);this.model=gltf.scene;this.model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});this.scene.add(this.model);this.progress('屋舍已就位，正在载入五位人物');
    const loader=new THREE.TextureLoader();let done=0;
    for(const c of this.characters){
      const prefix=`assets/characters/${c.id}/`;const tex={};
      await Promise.all(['body','back',...c.expressions.map(x=>'head-'+x)].map(async k=>{tex[k]=await loader.loadAsync(prefix+k+'.png');tex[k].colorSpace=THREE.SRGBColorSpace;tex[k].magFilter=THREE.LinearFilter;tex[k].minFilter=THREE.LinearMipmapLinearFilter;}));
      const bottom=(c.canvasHeight-c.alphaBounds[3])/c.canvasHeight,top=(c.canvasHeight-c.alphaBounds[1])/c.canvasHeight;
      const ph=c.height/(top-bottom),pw=ph*c.width/c.canvasHeight,center=ph/2-bottom*ph,neck=(1-435/c.canvasHeight-bottom)*ph;
      const group=new THREE.Group();const geo=new THREE.PlaneGeometry(pw,ph);
      const material=map=>new THREE.MeshBasicMaterial({map,transparent:true,alphaTest:.035,side:THREE.DoubleSide,depthWrite:true,toneMapped:false});
      const body=new THREE.Mesh(geo,material(tex.body));body.position.y=center;group.add(body);
      const pivot=new THREE.Group();pivot.position.y=neck;group.add(pivot);
      const head=new THREE.Mesh(geo,material(tex['head-neutral']));head.position.set(0,center-neck,.004);pivot.add(head);
      const back=new THREE.Mesh(geo,material(tex.back));back.position.y=center;back.visible=false;group.add(back);
      this.scene.add(group);
      const shadow=new THREE.Mesh(new THREE.CircleGeometry(.24,32),new THREE.MeshBasicMaterial({color:0x263728,transparent:true,opacity:.15,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.y=.56;this.scene.add(shadow);
      const label=document.createElement('span');label.className='actor-label';label.textContent=c.name;this.container.append(label);
      this.actors.set(c.id,{group,body,head,pivot,back,shadow,label,tex,height:c.height,expression:null});
      done++;this.progress(`人物 ${done} / ${this.characters.length} 已就位`);
    }
    this.resize();
  }
  resize(){const {width,height}=this.container.getBoundingClientRect();if(!width||!height)return;this.width=width;this.height=height;this.renderer.setSize(width,height);if(this.currentCamera)this.applyCamera(this.currentCamera);}
  applyCamera(id){let c=this.stage.cameras[id];if(this.width<600&&id==='wide'&&!this.override)c={...this.stage.cameras.family,scale:7.7};this.currentCamera=id;const aspect=(this.width||800)/(this.height||450);const half=c.scale/2;Object.assign(this.camera,{left:-half,right:half,top:half/aspect,bottom:-half/aspect});this.camera.position.copy(convert(c.position));this.camera.lookAt(convert(c.target));this.camera.updateProjectionMatrix();}
  showWide(){this.override=this.currentCamera==='wide'?'family':'wide';this.applyCamera(this.override);}
  update(state){
    if(state.camera!==this.cameraId){this.cameraId=state.camera;this.override=null;this.applyCamera(state.camera);}else if(!this.currentCamera)this.applyCamera(state.camera);
    const light={day:[2,3.1,1.4,1.6],night:[.75,.55,.35,1.25],dawn:[1.7,2.4,1.9,1.5]}[state.lighting];this.ambient.intensity=light[0];this.sun.intensity=light[1];this.fill.intensity=light[2];this.renderer.toneMappingExposure=light[3];
    for(const [id,a]of this.actors){
      const s=state.actors[id];a.group.visible=s.visible;a.shadow.visible=s.visible;a.label.hidden=!s.visible;
      const pos=convert(s.position);a.group.position.copy(pos);a.group.position.y+=s.moving?Math.abs(Math.sin(state.time*8))*.021:0;
      a.group.rotation.y=Math.atan2(this.camera.position.x-pos.x,this.camera.position.z-pos.z);
      a.group.scale.x=s.facing==='left'?-1:1;
      const rear=s.facing==='back';a.body.visible=!rear;a.pivot.visible=!rear;a.back.visible=rear;
      if(a.expression!==s.expression){a.head.material.map=a.tex['head-'+s.expression];a.head.material.needsUpdate=true;a.expression=s.expression;}
      a.pivot.rotation.z=0;a.pivot.rotation.y=0;
      if(s.gesture){const v=Math.sin(s.gesture.progress*Math.PI*4)*Math.sin(s.gesture.progress*Math.PI);if(s.gesture.kind==='nod')a.pivot.rotation.z=v*.065;else a.pivot.rotation.y=v*.18;}
      a.shadow.position.set(pos.x,pos.y+.009,pos.z);a.shadow.material.opacity=state.dialogue?.speaker===id ? .21:.14;
      const projected=pos.clone().project(this.camera);a.label.style.left=`${(projected.x*.5+.5)*this.width}px`;a.label.style.top=`${(-projected.y*.5+.5)*this.height+8}px`;a.label.classList.toggle('speaking',state.dialogue?.speaker===id);
    }
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.resizeObserver.disconnect();this.scene.traverse(o=>{o.geometry?.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)if(m){m.map?.dispose();m.dispose();}});this.renderer.dispose();}
}
