// Additive material/terrain candidate. Original GLBs, transforms and cameras stay intact.
export const REFINEMENT = Object.freeze({revision:'strata-warm-optical-20261019',maxWorldDisplacement:.009,maxSubdivisionTriangles:5000,subdivisionPasses:1});

export function rockProfile(name) { return /near_rock_geological|continuous_ridge_rock|cleaved_slate|fictional_ridge/i.test(name); }
export function materialProfile(name) {
  if (/glass|clear_transmission|thin_transmission|thin_carrier_transmission/i.test(name)) return {roughness:.09,envMapIntensity:.85};
  if (/champagne|brushed.*bronze|brushed.*metal/i.test(name)) return {roughness:.31,envMapIntensity:.78};
  if (/dark.*bronze|aged.*bronze/i.test(name)) return {roughness:.38,envMapIntensity:.6};
  if (rockProfile(name)) return {roughness:.82,metalness:0,envMapIntensity:.3};
  if (/limestone|sandstone|warm_marble|Marble_PBR/i.test(name)) return {roughness:.67,envMapIntensity:.42};
  return null;
}

// Subdivide only small geological meshes. Interpolate every authored vertex attribute;
// UVs, colors and tangent seams remain attached to their original triangles.
export function refineRockGeometry(T, original, worldScale=1) {
  if (!original.attributes.position || original.morphAttributes.position?.length || original.attributes.skinIndex) return null;
  const count=(original.index?.count||original.attributes.position.count)/3;
  if (!Number.isInteger(count)||count<1) return null;
  let geometry=original.clone();
  if (count<=REFINEMENT.maxSubdivisionTriangles && !original.groups.length) {
    const source=original.index?original.toNonIndexed():original;
    const attributes=Object.entries(source.attributes).filter(([name])=>!['normal','tangent'].includes(name));
    const output=Object.fromEntries(attributes.map(([name])=>[name,[]]));
    for(let v=0;v<source.attributes.position.count;v+=3){
      for(const [name,attribute] of attributes){
        const points=[0,1,2].map(n=>Array.from({length:attribute.itemSize},(_,c)=>attribute.array[(v+n)*attribute.itemSize+c]));
        const mid=(a,b)=>a.map((value,c)=>(value+b[c])/2),[a,b,c]=points,ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);
        for(const p of [a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca])output[name].push(...p);
      }
    }
    geometry.dispose();geometry=new T.BufferGeometry();
    for(const [name,a] of attributes)geometry.setAttribute(name,new T.Float32BufferAttribute(output[name],a.itemSize,a.normalized));
    if(source!==original)source.dispose();
  }
  geometry.computeVertexNormals();geometry.computeBoundingBox();
  const size=geometry.boundingBox.getSize(new T.Vector3());
  const amplitude=Math.min(size.length()*.0015,REFINEMENT.maxWorldDisplacement/Math.max(.0001,worldScale));
  const p=geometry.attributes.position,center=geometry.boundingBox.getCenter(new T.Vector3()),direction=new T.Vector3();
  // Position-only field keeps UV seams coincident and preserves silhouette scale.
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const strata=Math.sin(y*29+x*1.7+Math.sin(z*5)*.8);
    const fracture=Math.sin(x*13+z*11)*Math.cos(y*17-z*7);
    const d=amplitude*(.68*strata+.32*fracture);
    // A radial field avoids cracks between independently authored normal seams.
    direction.set(x,y,z).sub(center).normalize();
    p.setXYZ(i,x+direction.x*d,y+direction.y*d,z+direction.z*d);
  }
  p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={...original.userData,refinement:REFINEMENT.revision,originalTriangles:count,worldDisplacementBound:amplitude*worldScale};
  return geometry;
}

function applyStrataShader(material) {
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vStrataPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStrataPosition = position;');
    shader.fragmentShader='varying vec3 vStrataPosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float layer = sin(vStrataPosition.y * 47.0 + sin(vStrataPosition.x * 3.1) * 1.8 + vStrataPosition.z * 2.0);
      float grain = sin(dot(vStrataPosition, vec3(127.1,311.7,74.7))) * sin(dot(vStrataPosition,vec3(61.7,197.3,83.1)));
      diffuseColor.rgb *= 0.96 + 0.055 * layer + 0.025 * grain;`);
  };
  material.customProgramCacheKey=()=>REFINEMENT.revision+'-rock';
}

export function refineAssembly(T, root, protectedNames=[]) {
  const materials=new Map(),changed=[],geometryChanges=[],restores=[];
  const protectedSet=new Set(protectedNames);root.updateMatrixWorld(true);
  const protectedNode=o=>{for(let p=o;p;p=p.parent)if(protectedSet.has(p.userData?.name||p.name))return true;return false;};
  root.traverse(o=>{
    if(!o.isMesh||protectedNode(o))return;
    const source=o.material,sourceList=Array.isArray(source)?source:[source];
    const next=sourceList.map(m=>{
      const values=materialProfile(m.name||'');if(!values||!m.isMeshStandardMaterial)return m;
      if(!materials.has(m)){const copy=m.clone();Object.assign(copy,values);if(rockProfile(m.name))applyStrataShader(copy);copy.needsUpdate=true;materials.set(m,copy);changed.push({material:m.name,values});}
      return materials.get(m);
    });
    if(next.some((m,i)=>m!==sourceList[i])){o.material=Array.isArray(source)?next:next[0];restores.push(()=>{o.material=source;});}
    if(sourceList.some(m=>rockProfile(m.name||''))){
      const old=o.geometry,scale=o.getWorldScale(new T.Vector3()),maximumScale=Math.max(Math.abs(scale.x),Math.abs(scale.y),Math.abs(scale.z));
      const refined=refineRockGeometry(T,old,maximumScale);if(refined){o.geometry=refined;geometryChanges.push({node:o.userData?.name||o.name,...refined.userData,triangles:refined.attributes.position.count/3});restores.push(()=>{o.geometry=old;refined.dispose();});}
    }
  });
  // Move the complete authored tree about a shared trunk pivot; never flutter
  // disconnected leaf cards. The original nodes and local transforms are restored.
  const treeNodes=[];
  root.traverse(o=>{if(/^C04_(?:olive_(?:main_trunk|secondary_branch|leaf_cluster_)|static_combined_connected_twigs)/.test(o.userData?.name||o.name)&&!protectedNode(o))treeNodes.push(o);});
  const treeRoots=treeNodes.filter(o=>!treeNodes.includes(o.parent));
  const commonParent=treeRoots[0]?.parent;
  let wind=null,time=0;
  if(treeRoots.length>1&&treeRoots.every(o=>o.parent===commonParent)){
    const box=new T.Box3();treeRoots.forEach(o=>box.expandByObject(o));
    const pivot=box.getCenter(new T.Vector3());pivot.y=box.min.y;
    wind=new T.Group();wind.name='local_coherent_tree_breeze';commonParent.add(wind);wind.position.copy(commonParent.worldToLocal(pivot));wind.updateMatrixWorld(true);
    const poses=treeRoots.map(o=>({o,position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()}));
    treeRoots.forEach(o=>wind.attach(o));
    restores.push(()=>{wind.rotation.z=0;for(const p of poses){commonParent.add(p.o);p.o.position.copy(p.position);p.o.quaternion.copy(p.quaternion);p.o.scale.copy(p.scale);p.o.updateMatrix();}commonParent.remove(wind);});
  }
  const audit={revision:REFINEMENT.revision,materials:changed,geometries:geometryChanges,protectedNames,motion:wind?'12 second coherent tree pivot, +/-0.10 degrees, default paused':null,visualAccepted:false};
  return {audit,hasMotion:!!wind,get time(){return time;},tick(seconds){time=seconds;if(wind){wind.rotation.z=Math.sin(seconds*Math.PI/6)*.0018;wind.updateMatrixWorld(true);}},dispose(){restores.reverse().forEach(fn=>fn());materials.forEach(m=>m.dispose());}};
}
