import * as THREE from '../../vendor/three/three.module.js';

// Only static, opaque meshes sharing material, attributes and cutaway policy
// are combined. Transparent sorting and individually animated meshes stay intact.
export function batchStaticModel(root,isCutaway=()=>false){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),groups=new Map();let original=0;
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;original++;mesh.userData.stageCutaway=isCutaway(mesh);
  const g=mesh.geometry,m=mesh.material;
  if(mesh.isSkinnedMesh||mesh.isInstancedMesh||Array.isArray(m)||m.transparent||g.drawRange.start!==0||g.drawRange.count!==Infinity||Object.keys(g.morphAttributes).length||Object.values(g.attributes).some(a=>a.isInterleavedBufferAttribute))return;
  const layout=Object.entries(g.attributes).map(([k,a])=>[k,a.itemSize,a.normalized,a.array.constructor.name]);
  const key=JSON.stringify([m.uuid,layout,mesh.userData.stageCutaway,mesh.visible,mesh.castShadow,mesh.receiveShadow,mesh.renderOrder]);
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
 });
 let merged=0;
 for(const meshes of groups.values()){
  if(meshes.length<2)continue;
  const geometries=meshes.map(m=>{const matrix=inverse.clone().multiply(m.matrixWorld),g=m.geometry.clone().applyMatrix4(matrix);return {g,reverse:matrix.determinant()<0};});
  const count=geometries.reduce((n,{g})=>n+g.attributes.position.count,0),geometry=new THREE.BufferGeometry();
  for(const [name,source]of Object.entries(geometries[0].g.attributes)){
   const array=new source.array.constructor(count*source.itemSize);let offset=0;
   for(const {g}of geometries){array.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}
   geometry.setAttribute(name,new THREE.BufferAttribute(array,source.itemSize,source.normalized));
  }
  const indices=[];let vertexOffset=0;
  for(const {g,reverse}of geometries){const index=g.index?.array||Uint32Array.from({length:g.attributes.position.count},(_,i)=>i);
   for(let i=0;i<index.length;i+=3)indices.push(index[i]+vertexOffset,index[i+(reverse?2:1)]+vertexOffset,index[i+(reverse?1:2)]+vertexOffset);
   vertexOffset+=g.attributes.position.count;g.dispose();
  }
  geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const first=meshes[0],batch=new THREE.Mesh(geometry,first.material);batch.name='StaticBatch_'+merged;
  for(const key of ['visible','castShadow','receiveShadow','renderOrder'])batch[key]=first[key];
  batch.userData.stageCutaway=first.userData.stageCutaway;root.add(batch);for(const m of meshes)m.removeFromParent();merged+=meshes.length-1;
 }
 return {original,remaining:original-merged,merged};
}
