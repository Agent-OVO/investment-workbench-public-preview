/**
 * C02 original research-instrument geometry, 2026-10-25.
 * No imported model, image, texture, font, or network dependency.
 * Coordinates and triangles are real object-space geometry, not CSS depth.
 * Copyright: original project contribution; follows the repository license.
 */
export const OBJECT_IDS = Object.freeze(['judgment', 'repair', 'pressure', 'support', 'limit']);
export const SCENE_VERSION = 'c02-research-instrument-1.1.0';
export const MATERIALS = Object.freeze({
  shell: { color: [0.40, 0.57, 0.58], roughness: 0.38, specular: 0.34 },
  silver: { color: [0.64, 0.76, 0.73], roughness: 0.28, specular: 0.48 },
  dark: { color: [0.10, 0.20, 0.23], roughness: 0.72, specular: 0.06 },
  face: { color: [0.22, 0.39, 0.42], roughness: 0.82, specular: 0.04 },
  inset: { color: [0.15, 0.29, 0.32], roughness: 0.88, specular: 0.025 },
  aqua: { color: [0.45, 0.79, 0.74], roughness: 0.42, specular: 0.16 },
  gold: { color: [0.78, 0.64, 0.40], roughness: 0.46, specular: 0.22 },
  paper: { color: [0.73, 0.80, 0.72], roughness: 0.86, specular: 0.02 },
  glass: { color: [0.52, 0.83, 0.81], roughness: 0.22, specular: 0.34, alpha: 0.55 },
  ground: { color: [0.075, 0.14, 0.16], roughness: 0.85, specular: 0.015 },
  structure: { color: [0.24, 0.36, 0.37], roughness: 0.58, specular: 0.13 },
});
const TAU = Math.PI * 2;
const add = (a,b) => a.map((v,i)=>v+b[i]);
const sub = (a,b) => a.map((v,i)=>v-b[i]);
const mul = (a,s) => a.map(v=>v*s);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm = a => mul(a,1/(Math.hypot(...a)||1));
function rotate(v,r=[0,0,0]) {
  let [x,y,z]=v; let c=Math.cos(r[0]),s=Math.sin(r[0]); [y,z]=[c*y-s*z,s*y+c*z];
  c=Math.cos(r[1]);s=Math.sin(r[1]);[x,z]=[c*x+s*z,-s*x+c*z];
  c=Math.cos(r[2]);s=Math.sin(r[2]);[x,y]=[c*x-s*y,s*x+c*y]; return [x,y,z];
}
function roundedOutline(w,h,b) {
  const x=w/2,y=h/2;
  return [[-x+b,-y],[x-b,-y],[x,-y+b],[x,y-b],[x-b,y],[-x+b,y],[-x,y-b],[-x,-y+b]];
}
/** Closed convex polyhedron with four depth rings and bevelled edges. */
export function bevelBox(w,h,d,b=Math.min(w,h,d)*.17) {
  b=Math.min(b,w*.2,h*.2,d*.45);
  const rings=[[-d/2,w-2*b,h-2*b],[ -d/2+b,w,h],[d/2-b,w,h],[d/2,w-2*b,h-2*b]];
  const vertices=rings.flatMap(([z,ww,hh])=>roundedOutline(ww,hh,b).map(([x,y])=>[x,y,z]));
  const triangles=[];
  for(let j=0;j<3;j++)for(let i=0;i<8;i++){
    let a=j*8+i,n=j*8+(i+1)%8,c=(j+1)*8+(i+1)%8,d=(j+1)*8+i;
    triangles.push([a,n,c],[a,c,d]);
  }
  vertices.push([0,0,-d/2],[0,0,d/2]);
  for(let i=0;i<8;i++){triangles.push([32,(i+1)%8,i]); triangles.push([33,24+i,24+(i+1)%8]);}
  return {vertices,triangles};
}
/** Closed chamfered rim with a genuine open center. The read surface sits
 * behind its inner bevel; this is not another solid rectangle on the face. */
export function bevelFrame(w,h,d,rail=.085,b=.024) {
  const z=[-d/2,-d/2+b,d/2-b,d/2];
  const vertices=[];
  for(let ring=0;ring<4;ring++){
    const outerInset=ring===0||ring===3?b:0;
    const innerInset=ring===3?rail-b:rail;
    for(const [ww,hh] of [[w-2*outerInset,h-2*outerInset],[w-2*innerInset,h-2*innerInset]])
      vertices.push(...roundedOutline(ww,hh,.02).map(([x,y])=>[x,y,z[ring]]));
  }
  const triangles=[],quad=(a,b,c,d)=>triangles.push([a,b,c],[a,c,d]);
  for(let ring=0;ring<3;ring++)for(let i=0;i<8;i++){
    const n=(i+1)%8,a=ring*16;
    quad(a+i,a+n,a+16+n,a+16+i);
    quad(a+8+n,a+8+i,a+24+i,a+24+n);
  }
  for(let i=0;i<8;i++){
    const n=(i+1)%8;
    quad(i,8+i,8+n,n);
    quad(48+i,48+n,56+n,56+i);
  }
  return {vertices,triangles};
}
export function cylinder(radius,length,segments=12) {
  const vertices=[],triangles=[];
  for(const z of [-length/2,length/2])for(let i=0;i<segments;i++)vertices.push([Math.cos(i*TAU/segments)*radius,Math.sin(i*TAU/segments)*radius,z]);
  vertices.push([0,0,-length/2],[0,0,length/2]);
  for(let i=0;i<segments;i++){
    const n=(i+1)%segments;triangles.push([i,n,n+segments],[i,n+segments,i+segments]);
    triangles.push([segments*2,n,i],[segments*2+1,i+segments,n+segments]);
  }
  return {vertices,triangles};
}
export function buildSceneGeometry() {
  const parts=[];
  const objects=[
    {id:'judgment',label:'当前判断',role:'判断板',center:[0,1.08,-.73],rotation:[0,-.055,0],width:2.04,height:.93,anchor:[0,-.02,.15],accent:'aqua'},
    {id:'repair',label:'修复增量',role:'比较板',center:[-1.25,.12,.17],rotation:[0,.10,0],width:1.58,height:.86,anchor:[0,-.06,.18],accent:'aqua'},
    {id:'pressure',label:'产品压力',role:'比较板',center:[1.25,.12,.10],rotation:[0,-.10,0],width:1.58,height:.86,anchor:[0,-.06,.18],accent:'gold'},
    {id:'support',label:'支持证据',role:'承托盘',center:[-1.06,-.80,.59],rotation:[0,.04,0],width:1.72,height:.08,anchor:[0,-.02,.48],accent:'aqua'},
    {id:'limit',label:'限制证据',role:'承托盘',center:[1.06,-.80,.59],rotation:[0,-.04,0],width:1.72,height:.08,anchor:[0,-.02,.48],accent:'gold'},
  ];
  function part(geom,name,owner,material,position=[0,0,0],rotation=[0,0,0],root) {
    let vertices=geom.vertices.map(v=>add(rotate(v,rotation),position));
    if(root)vertices=vertices.map(v=>add(rotate(v,root.rotation),root.center));
    parts.push({name,objectId:owner,material,vertices,triangles:geom.triangles});
  }
  const box=(name,owner,mat,sz,p,r,root,b)=>part(bevelBox(...sz,b),name,owner,mat,p,r,root);
  const cyl=(name,owner,mat,r,l,p,rot,root)=>part(cylinder(r,l),name,owner,mat,p,rot,root);
  for(const o of objects) {
    const id=o.id,w=o.width,h=o.height;
    if(id==='support'||id==='limit'){
      box(`${id}:tray-base`,id,'shell',[w,.12,.73],[0,-.015,0],[0,0,0],o,.026);
      box(`${id}:tray-undercut`,id,'dark',[w-.13,.035,.61],[0,-.086,-.015],[0,0,0],o,.012);
      box(`${id}:recess`,id,'dark',[w-.15,.025,.55],[0,.057,0],[0,0,0],o,.009);
      box(`${id}:front-lip`,id,'silver',[w,.09,.095],[0,.09,.35],[0,0,0],o,.015);
      box(`${id}:back-rail`,id,'shell',[w,.18,.065],[0,.11,-.36],[0,0,0],o,.018);
      for(const s of [-1,1]) {
        box(`${id}:side-rail:${s}`,id,'shell',[.065,.14,.71],[s*(w/2-.033),.085,0],[0,0,0],o,.018);
        box(`${id}:slot:${s}`,id,'dark',[.04,.035,.55],[s*.42,.08,0],[0,0,0],o,.008);
        box(`${id}:foot:${s}`,id,'dark',[.25,.12,.39],[s*.53,-.145,0],[0,0,0],o,.024);
      }
      for(let i=0;i<3;i++){
        box(`${id}:evidence-card:${i}`,id,i===0?'paper':'face',[.42,.25,.035],[-.51+i*.51,.22,-.02+i*.018],[-.15,0,0],o,.009);
        box(`${id}:card-tab:${i}`,id,o.accent,[.13,.026,.043],[-.51+i*.51,.345,-.04+i*.018],[-.15,0,0],o,.004);
      }
      cyl(`${id}:connector`,id,o.accent,.052,.07,[0,.15,-.42],[Math.PI/2,0,0],o);
    } else {
      box(`${id}:rear-layer`,id,'dark',[w-.07,h-.07,.072],[0,0,-.20],[0,0,0],o,.018);
      for(const x of [-1,1])for(const y of [-1,1])cyl(`${id}:spacer:${x}:${y}`,id,'gold',.036,.14,[x*(w/2-.15),y*(h/2-.14),-.115],[0,0,0],o);
      part(bevelFrame(w,h,.22,.10,.026),`${id}:chamfered-shell`,id,'shell',[0,0,.035],[0,0,0],o);
      box(`${id}:back-pan`,id,'structure',[w-.13,h-.13,.045],[0,0,-.072],[0,0,0],o,.012);
      box(`${id}:read-face`,id,'face',[w-.115,h-.115,.023],[0,0,.042],[0,0,0],o,.009);
      box(`${id}:inset-field`,id,'inset',[w-.23,h-.25,.012],[0,-.015,.061],[0,0,0],o,.005);
      box(`${id}:header-inlay`,id,o.accent,[w*.31,.027,.016],[-w*.21,h*.29,.075],[0,0,0],o,.004);
      box(`${id}:glass-edge`,id,'glass',[.027,h-.25,.018],[w/2-.13,0,.074],[0,0,0],o,.008);
      for(const x of [-1,1])cyl(`${id}:front-fastener:${x}`,id,'silver',.019,.012,[x*(w/2-.071),h/2-.067,.15],[0,0,0],o);
      cyl(`${id}:connector`,id,o.accent,.048,.072,[0,-h/2-.045,.015],[Math.PI/2,0,0],o);
      box(`${id}:lower-foot`,id,'dark',[.34,.13,.14],[0,-h/2-.055,-.15],[0,0,0],o,.014);
    }
    o.labelAnchor=add(rotate(o.anchor,o.rotation),o.center);
  }
  // A low original plinth and rails support, rather than replace, the geometry.
  box('structure:plinth',null,'ground',[4.8,.095,2.15],[0,-1.045,.05],[0,0,0],null,.035);
  box('structure:rear-rail',null,'structure',[3.65,.08,.11],[0,-.54,-.92],[0,0,0],null,.018);
  for(const x of [-.63,.63])box(`structure:judgment-mount:${x}`,null,'structure',[.07,1.15,.07],[x,.02,-.94],[0,0,0],null,.012);
  function rod(name,owner,start,end,material,r=.014){
    const direction=norm(sub(end,start)),right=norm(cross(Math.abs(direction[1])>.9?[1,0,0]:[0,1,0],direction)),up=cross(direction,right);
    const geo=cylinder(r,Math.hypot(...sub(end,start)),8),center=mul(add(start,end),.5);
    geo.vertices=geo.vertices.map(([x,y,z])=>add(center,add(mul(right,x),add(mul(up,y),mul(direction,z)))));
    part(geo,name,owner,material);
  }
  // Finite static relation conduits: geometry, not animated data/cash flow.
  rod('support:relation:vertical','support',[-1.06,-.65,.17],[-1.06,-.36,.17],'aqua');
  rod('limit:relation:vertical','limit',[1.06,-.65,.17],[1.06,-.36,.17],'gold');
  rod('repair:relation:back','repair',[-.63,.48,-.04],[-.42,.58,-.67],'dark');
  rod('pressure:relation:back','pressure',[.63,.48,-.04],[.42,.58,-.67],'dark');
  return {version:SCENE_VERSION,license:'Original project contribution; repository license applies.',units:'Design units, not physical company equipment dimensions.',materials:MATERIALS,objects,parts};
}
export function geometryStatistics(scene=buildSceneGeometry()) {
  const objectStats={};
  for(const id of OBJECT_IDS){
    const pp=scene.parts.filter(p=>p.objectId===id),vv=pp.flatMap(p=>p.vertices);
    objectStats[id]={parts:pp.length,vertices:vv.length,triangles:pp.reduce((s,p)=>s+p.triangles.length,0),bounds:{min:[0,1,2].map(i=>Math.min(...vv.map(v=>v[i]))),max:[0,1,2].map(i=>Math.max(...vv.map(v=>v[i])))}};
  }
  return {version:scene.version,objectCount:scene.objects.length,partCount:scene.parts.length,vertices:scene.parts.reduce((s,p)=>s+p.vertices.length,0),triangles:scene.parts.reduce((s,p)=>s+p.triangles.length,0),materials:Object.keys(MATERIALS).length,textures:0,externalRuntimeDependencies:0,objects:objectStats};
}
export {rotate as rotateVector};
