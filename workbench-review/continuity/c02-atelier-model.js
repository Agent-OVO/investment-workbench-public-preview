// Original, deterministic geometry and material study, mounted only in the C02 pilot.
// The delivered GLB bytes and every original node transform remain unchanged.
import {refineRockGeometry} from './refine.js';
export const ATELIER_REVISION='c02-glass-brass-stone-v3-map-roughness';
// Linear texture G / 255 is the intended base-layer roughness; scalar stays 1.
// Three r149 subsequently adds geometry roughness and treats clearcoat separately.
export const MATERIAL_ROUGHNESS=Object.freeze({
 mineral:Object.freeze({surface:'polished mineral plinth',bytes:Object.freeze([82,112]),scalar:1}),
 rock:Object.freeze({surface:'uncoated natural rock',bytes:Object.freeze([190,224]),scalar:1}),
 limestone:Object.freeze({surface:'honed limestone',bytes:Object.freeze([160,188]),scalar:1}),
 brushed:Object.freeze({surface:'brushed brass',bytes:Object.freeze([64,88]),scalar:1})
});
export const C02_BOARDS=Object.freeze([
 {id:'support',name:'C02_BIND_related_research_blank_title',center:[-2.16,2.25,.12],width:2.62,height:1.47},
 {id:'limits',name:'C02_BIND_opposing_views_blank_title',center:[2.16,2.25,.12],width:2.62,height:1.47},
 {id:'focus',name:'C02_FOCUS_ART_blank_content_plane',center:[0,1.48,.72],width:1.49,height:1.97},
 {id:'evidence',name:'C02_BIND_shared_evidence_blank_title',center:[-2.18,.57,.62],width:2.66,height:1.61},
 {id:'questions',name:'C02_BIND_followup_questions_blank_title',center:[2.18,.57,.62],width:2.66,height:1.61}
]);
const fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
// Periodic value noise makes repeated physical surfaces continuous at both UV seams.
function noise(x,y,seed,px=11,py=px){
 const wrap=(n,p)=>((n%p)+p)%p;
 const f=(a,b)=>fract(Math.sin(wrap(a,px)*127.1+wrap(b,py)*311.7+seed*19.71)*43758.5453);
 const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy,s=u*u*(3-2*u),t=v*v*(3-2*v);
 return mix(mix(f(ix,iy),f(ix+1,iy),s),mix(f(ix,iy+1),f(ix+1,iy+1),s),t);
}
export function materialPixels(kind,size=256,seed=29){
 if(!Object.hasOwn(MATERIAL_ROUGHNESS,kind)||!Number.isInteger(size)||size<8||size>1024)throw Error('INVALID_PROCEDURAL_TEXTURE');
 const mineral=kind==='mineral'||kind==='rock',[roughnessMin,roughnessMax]=MATERIAL_ROUGHNESS[kind].bytes;
 const color=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4),height=new Float32Array(size*size),normal=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/(size-1),v=y/(size-1),n=noise(u*11,v*11,seed,11)*.5+noise(u*37,v*37,seed,37)*.3+noise(u*107,v*107,seed,107)*.2;
  const vein=Math.pow(Math.abs(Math.sin((u*2+v+noise(u*3,v*3,seed,3)*.38+noise(u*7,v*7,seed,7)*.07)*Math.PI*2)),30),grain=noise(u*151,v*7,seed,151,7),i=(y*size+x)*4;
  const base=mineral?[65,70,64]:kind==='limestone'?[196,188,164]:[184,151,99];
  const shade=kind==='brushed'?(grain-.5)*13:(n-.5)*(mineral?34:18)+vein*(mineral?22:-9);
  height[y*size+x]=kind==='brushed'?grain*.1:n*.2+vein*.12;
  for(let c=0;c<3;c++){color[i+c]=Math.max(0,Math.min(255,base[c]+shade));roughness[i+c]=roughnessMin+(kind==='brushed'?grain:n)*(roughnessMax-roughnessMin);}color[i+3]=roughness[i+3]=255;
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const at=(a,b)=>height[((b+size-1)%(size-1))*size+(a+size-1)%(size-1)],dx=(at(x-1,y)-at(x+1,y))*1.4,dy=(at(x,y-1)-at(x,y+1))*1.4,l=Math.hypot(dx,dy,1),i=(y*size+x)*4;normal[i]=(dx/l*.5+.5)*255;normal[i+1]=(dy/l*.5+.5)*255;normal[i+2]=(1/l*.5+.5)*255;normal[i+3]=255;}
 return {color,roughness,normal,size,seed,kind};
}
function roundedShape(T,w,h,r){const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
export function refineAssembly(T,root,protectedNames=[]){
 const saved=[],surfaceRestores=[],geometries=new Set(),materials=new Set(),textures=new Set(),anchors=[],group=new T.Group();group.name='C02_ATELIER_original_procedural_assembly';
 const keep=/C02_SPACE_generated_fictional_far_vista|C02_SPACE_limestone_ground|C02_SPACE_original_rock_outcrop/;
 root.traverse(o=>{if(o.isMesh&&!keep.test(o.userData?.name||o.name)){saved.push([o,o.visible]);o.visible=false;}});
 const tex=(bytes,size,color=false)=>{const t=new T.DataTexture(bytes,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;if(color)t.encoding=T.sRGBEncoding;textures.add(t);return t;};
 const maps={};for(const kind of ['mineral','limestone','brushed']){const p=materialPixels(kind);maps[kind]={map:tex(p.color,p.size,true),roughnessMap:tex(p.roughness,p.size),normalMap:tex(p.normal,p.size)};}
 // Rock keeps the mineral's original albedo/normal bytes, but owns its roughness map.
 const rockPixels=materialPixels('rock');maps.rock={map:maps.mineral.map,normalMap:maps.mineral.normalMap,roughnessMap:tex(rockPixels.roughness,rockPixels.size)};
 const mat=(name,params)=>{const m=new T.MeshPhysicalMaterial({name,...params});materials.add(m);return m;};
 const stone=mat('ATELIER_original_mineral',{...maps.mineral,roughness:MATERIAL_ROUGHNESS.mineral.scalar,metalness:.05,normalScale:new T.Vector2(.22,.22),clearcoat:.24,clearcoatRoughness:.3});
 const rock=mat('ATELIER_original_uncoated_rock',{...maps.rock,roughness:MATERIAL_ROUGHNESS.rock.scalar,metalness:0,normalScale:new T.Vector2(.22,.22),clearcoat:0});
 const lime=mat('ATELIER_original_honed_limestone',{...maps.limestone,roughness:MATERIAL_ROUGHNESS.limestone.scalar,normalScale:new T.Vector2(.08,.08)});
 const brass=mat('ATELIER_original_brushed_brass',{...maps.brushed,color:'#e8d2a4',metalness:.9,roughness:MATERIAL_ROUGHNESS.brushed.scalar,normalScale:new T.Vector2(.13,.04),envMapIntensity:1.25,clearcoat:.24,clearcoatRoughness:.32});
 const dark=mat('ATELIER_aged_bronze',{color:'#293a36',metalness:.84,roughness:.34});
 const glass=mat('ATELIER_optical_glass',{color:'#f3e9d0',metalness:0,roughness:.12,transmission:.78,thickness:.06,ior:1.46,transparent:true,opacity:.46,depthWrite:false,envMapIntensity:1.1,clearcoat:1});
 root.traverse(o=>{if(!o.isMesh)return;const name=o.userData?.name||o.name;if(/C02_SPACE_limestone_ground/.test(name)){const old=o.material;o.material=lime;surfaceRestores.push(()=>o.material=old);}if(/C02_SPACE_original_rock_outcrop/.test(name)){const old=o.material,geo=o.geometry,scale=o.getWorldScale(new T.Vector3()),refined=refineRockGeometry(T,geo,Math.max(scale.x,scale.y,scale.z));o.material=rock;if(refined){o.geometry=refined;geometries.add(refined);}surfaceRestores.push(()=>{o.material=old;o.geometry=geo;});}});
 const edge=mat('ATELIER_amber_edge',{color:'#f9dca0',emissive:'#ffc66e',emissiveIntensity:1.8,metalness:.45,roughness:.22});
 const line=mat('ATELIER_reading_connection',{color:'#ffeac3',emissive:'#ffbb55',emissiveIntensity:2.1,metalness:.25,roughness:.4});
 const add=(name,geo,m,pos=[0,0,0],parent=group)=>{geometries.add(geo);const o=new T.Mesh(geo,m);o.name=name;o.position.fromArray(pos);o.castShadow=m!==line&&m!==edge&&m!==glass;o.receiveShadow=m!==line&&m!==glass;parent.add(o);return o;};
 const cylinder=(name,r,h,y,m,x=0,z=-.3)=>add(name,new T.CylinderGeometry(r,r,h,128,1),m,[x,y,z]);
 const ring=(name,r,tube,y,m,x=0,z=-.3)=>{const o=add(name,new T.TorusGeometry(r,tube,8,160),m,[x,y,z]);o.rotation.x=Math.PI/2;return o;};
 cylinder('ATELIER_lower_turned_bronze',3.48,.12,-.46,dark);cylinder('ATELIER_mineral_plinth',3.43,.25,-.28,stone);cylinder('ATELIER_upper_honed_disc',3.40,.055,-.125,lime);
 for(const [r,y]of [[3.47,-.42],[3.42,-.155],[3.32,-.093],[2.94,-.091]])ring('ATELIER_plinth_inlay_'+r,r,.009,y,brass);
 // Fine radial machining ticks occupy the outer inlay, never the reading surfaces.
 for(let i=0;i<96;i++){const a=i/96*Math.PI*2,o=add('ATELIER_machining_tick_'+i,new T.BoxGeometry(i%8===0?.009:.004,.002,i%8===0?.07:.035),brass,[Math.sin(a)*3.22,-.095,Math.cos(a)*3.22-.3]);o.rotation.y=a;}
 cylinder('ATELIER_focus_dark_step',.99,.1,-.035,dark,0,.16);cylinder('ATELIER_focus_mineral_step',.87,.14,.085,stone,0,.16);cylinder('ATELIER_focus_brass_disc',.81,.045,.18,brass,0,.16);cylinder('ATELIER_focus_glass_disc',.75,.04,.224,glass,0,.16);
 for(const [r,y]of [[.99,.014],[.88,.158],[.79,.205],[.59,.249]])ring('ATELIER_focus_light_ring_'+r,r,.008,y,edge,0,.16);
 for(const x of [-2.17,2.17]){const o=add('ATELIER_side_mineral_podium_'+x,new T.CylinderGeometry(1.12,1.16,.22,96),stone,[x,-.005,.32]);o.scale.z=.65;const r=ring('ATELIER_side_fine_reveal_'+x,1.11,.007,.11,brass,x,.32);r.scale.y=.65;}
 for(const b of C02_BOARDS){
  const panel=new T.Group();panel.name='ATELIER_panel_'+b.id;panel.position.fromArray(b.center);group.add(panel);
  // A bevelled solid glass leaf and a separate ring frame, with real depth and rear reveals.
  const plate=add('ATELIER_glass_'+b.id,new T.ExtrudeGeometry(roundedShape(T,b.width,b.height,.095),{depth:.035,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:3,steps:1,curveSegments:12}),glass,[0,0,-.02],panel);
  const shape=roundedShape(T,b.width+.03,b.height+.03,.11),hole=roundedShape(T,b.width-.012,b.height-.012,.088);shape.holes.push(new T.Path(hole.getPoints(48).reverse()));
  add('ATELIER_brass_bevel_frame_'+b.id,new T.ExtrudeGeometry(shape,{depth:.026,bevelEnabled:true,bevelSize:.003,bevelThickness:.004,bevelSegments:2,curveSegments:12}),brass,[0,0,-.025],panel);
  const pts=roundedShape(T,b.width-.005,b.height-.005,.09).getPoints(110).map(p=>new T.Vector3(p.x,p.y,.02));pts.push(pts[0]);add('ATELIER_illuminated_glass_edge_'+b.id,new T.TubeGeometry(new T.CatmullRomCurve3(pts,false),224,.003,5,false),edge,[0,0,0],panel);
  for(const x of [-b.width/2+.06,b.width/2-.06])for(const y of [-b.height/2+.06,b.height/2-.06]){const screw=add('ATELIER_recessed_fastener_'+b.id+'_'+x+'_'+y,new T.CylinderGeometry(.012,.012,.012,12),brass,[x,y,.037],panel);screw.rotation.x=Math.PI/2;add('ATELIER_fastener_slot_'+b.id+'_'+x+'_'+y,new T.BoxGeometry(.014,.002,.002),dark,[x,y,.044],panel);}
  if(b.id!=='focus')for(const x of [-b.width*.34,b.width*.34]){const bottom=b.center[1]-b.height/2,height=Math.max(.07,bottom+.1);add('ATELIER_standoff_'+b.id+'_'+x,new T.CylinderGeometry(.012,.012,height,16),brass,[b.center[0]+x,bottom-height/2,b.center[2]-.11]);}
  plate.geometry.computeBoundingBox();
  anchors.push({...b,object:plate,frontZ:plate.geometry.boundingBox.max.z});
 }
 const curve=(name,points,r=.006,m=line)=>{const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return add(name,new T.TubeGeometry(c,100,r,6,false),m);};
 const paths=[
  [[-.745,1.93,.72],[-1.02,2.17,-.05],[-.85,2.52,.12]],
  [[.745,1.93,.72],[1.06,2.18,-.05],[.85,2.49,.12]],
  [[-.745,1.08,.72],[-1.11,.91,.38],[-.85,.61,.62]],
  [[.745,1.08,.72],[1.12,.9,.38],[.85,.61,.62]],
  [[-2.12,2.985,.12],[-.9,3.19,-.35],[.9,3.19,-.35],[2.12,2.985,.12]],
  [[-2.2,-.235,.62],[-1.25,-.07,1.01],[0,.25,1.02],[1.25,-.07,1.01],[2.2,-.235,.62]],
 ];
 paths.forEach((p,i)=>{curve('ATELIER_reading_link_'+i,p);for(const [j,v]of [[0,p[0]],[1,p.at(-1)]])add('ATELIER_link_node_'+i+'_'+j,new T.SphereGeometry(.019,12,8),edge,v);});
 for(let i=0;i<7;i++){const pts=[];for(let k=0;k<=160;k++){const a=k/160*Math.PI*2;pts.push([Math.cos(a)*(1.08+i*.014),1.48+Math.sin(a)*(1.09+i*.014),-.22+Math.sin(a*3+i)*.12]);}curve('ATELIER_decorative_orbit_'+i,pts,.0018,i%2?line:brass);}
 // Layered architecture frames the view. These do not claim source-document meaning.
 for(const x of [-4.55,4.55]){add('ATELIER_limestone_pier_'+x,new T.BoxGeometry(.24,5.8,.7),lime,[x,2.2,-1.35]);add('ATELIER_pier_brass_reveal_'+x,new T.BoxGeometry(.018,5.8,.018),brass,[x+(x<0?.14:-.14),2.2,-.98]);}
 add('ATELIER_upper_architrave',new T.BoxGeometry(9.35,.22,.72),lime,[0,5.02,-1.35]);
 for(const [i,p]of [[0,[-3.58,-.15,1.22]],[1,[3.62,-.15,1.02]],[2,[3.87,-.31,1.7]]])add('ATELIER_reflective_sphere_'+i,new T.SphereGeometry(i===2?.1:.16,40,24),brass,p);
 // A broad, very dim glow is geometry with additive blending, not a bloom/postprocess claim.
 const glow=new T.MeshBasicMaterial({color:'#ffd99a',transparent:true,opacity:.055,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});materials.add(glow);
 for(let i=0;i<8;i++){const o=add('ATELIER_focus_glow_'+i,new T.RingGeometry(.8+i*.035,.87+i*.035,96),glow,[0,1.48,-.45]);o.scale.y=1.05;}
 root.add(group);root.updateMatrixWorld(true);
 const counts={meshes:0,triangles:0};group.traverse(o=>{if(o.isMesh){counts.meshes++;counts.triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
 const audit={revision:ATELIER_REVISION,kind:'original procedural replacement assembly in explicit C02 pilot only',originalGLBUnmodified:true,originalNodeTransformsUnmodified:true,legacyVisibilityChanges:saved.map(([o])=>o.userData?.name||o.name),protectedNames,boards:C02_BOARDS.map(({id,center,width,height})=>({id,center,width,height})),textures:['mineral','limestone','brushed'].map(kind=>({kind,size:256,seed:29,channels:['color','roughness','normal'],externalSource:false})).concat([{kind:'rock',size:256,seed:29,channels:['roughness'],sharedColorAndNormalFrom:'mineral',externalSource:false}]),materialRoughness:{convention:'linear G / 255 times scalar 1; base layer before geometry roughness; clearcoat is separate',profiles:MATERIAL_ROUGHNESS},connectionCount:paths.length,connectionMeaning:'Same-report reading organization only',...counts,visualAccepted:false,hardwareGPUAccepted:false};
 let disposed=false;
 return {audit,hasMotion:false,time:0,tick(){},getContentAnchors(camera){
  if(disposed||!camera)return [];
  root.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  return anchors.map(b=>{
   // Same flat front cap as the rendered glass, including the plate's own transform.
   // Ordered TL, TR, BR, BL; retain clip w so a behind-camera face cannot look valid.
   const quad=[[-b.width/2,b.height/2],[b.width/2,b.height/2],[b.width/2,-b.height/2],[-b.width/2,-b.height/2]].map(([x,y])=>{
    const world=b.object.localToWorld(new T.Vector3(x,y,b.frontZ)),clip=new T.Vector4(world.x,world.y,world.z,1).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
    return {x:(clip.x/clip.w+1)/2,y:(1-clip.y/clip.w)/2,z:clip.z/clip.w,w:clip.w};
   });
   return {name:b.name,id:b.id,quad,projectionAspect:camera.isPerspectiveCamera?camera.aspect:(camera.right-camera.left)/(camera.top-camera.bottom),surface:{width:b.width,height:b.height,localFrontZ:b.frontZ},left:Math.min(...quad.map(p=>p.x)),right:Math.max(...quad.map(p=>p.x)),top:Math.min(...quad.map(p=>p.y)),bottom:Math.max(...quad.map(p=>p.y)),inDepth:quad.every(p=>[p.x,p.y,p.z,p.w].every(Number.isFinite)&&p.w>0&&p.z>=-1&&p.z<=1)};
  });
 },dispose(){if(disposed)return;disposed=true;root.remove(group);surfaceRestores.forEach(fn=>fn());for(const [o,visible]of saved)o.visible=visible;geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());}};
}
