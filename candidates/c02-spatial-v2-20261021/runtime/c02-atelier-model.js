// C02 V2 isolated candidate. Source GLB is frozen; instance transforms and visibility are audited.
export const ATELIER_REVISION='c02-spatial-v2-20261021';
const rawName=o=>o.userData?.name||o.name;
const ids=['focus','support','limits','evidence','questions'];
const fail=message=>{throw Error('C02_MANIFEST '+message);};
function shape(T,w,h,r=.055){const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
export function refineAssembly(T,root,_protectedNames=[],{manifest,assetHash}={}){
 if(!manifest||manifest.assetSha256!==assetHash)fail('asset hash mismatch');
 const records=manifest.nodes,byPath=new Map(),byIndex=new Map(),objects=new Map(),saved=[],geometry=new Set(),materials=new Set(),anchors=[];
 const actions=new Set(['retain_visible','retain_nonrendering_hierarchy','hide_with_recorded_replacement','omit_with_reason']);
 for(const n of records){if(byPath.has(n.path)||byIndex.has(n.nodeIndex)||!n.reason||!actions.has(n.action))fail('duplicate or invalid decision');byPath.set(n.path,n);byIndex.set(n.nodeIndex,n);}
 if(records.length!==215)fail('node coverage');
 for(const n of records){if(n.action==='retain_visible'&&(!Array.isArray(n.threeWorldMatrix)||n.threeWorldMatrix.length!==16||!n.threeWorldMatrix.every(Number.isFinite)))fail('missing retained matrix');if(n.action==='hide_with_recorded_replacement'&&!['V2_navigation_dom',...ids.map(id=>'V2_'+id+'_assembly')].includes(n.replacement))fail('missing replacement decision');}
 // Wrapper names belong to the loader, not the immutable asset. Resolve only exact
 // authored root names and full parent paths, then reject every unaccounted mesh.
 const roots=records.filter(n=>n.parentIndex===null),assetRoots=[];
 for(const n of roots){const matches=[];root.traverse(o=>{if(rawName(o)===n.name)matches.push(o);});if(matches.length!==1)fail('missing/duplicate root '+n.name);assetRoots.push(matches[0]);}
 function scan(o,parent=''){const path=parent?parent+'/'+rawName(o):rawName(o),n=byPath.get(path);if(!n||objects.has(path)||!!o.isMesh!==n.isMesh)fail('unknown/mismatched node '+path);objects.set(path,o);for(const child of o.children)scan(child,path);}
 assetRoots.forEach(o=>scan(o));if(objects.size!==records.length)fail('incomplete tree');
 root.traverse(o=>{if(o.isMesh&&![...objects.values()].includes(o))fail('unaccounted mesh '+rawName(o));});
 if(ids.some(id=>!manifest.panels[id]?.threeLocalGeometryMatrix||!manifest.panels[id]?.worldSize))fail('missing surface matrix');
 root.updateMatrixWorld(true);
 const group=new T.Group();group.name='C02_V2_SPATIAL_FOLIO';
 const add=(name,g,m,position=[0,0,0],parent=group)=>{geometry.add(g);const o=new T.Mesh(g,m);o.name=name;o.position.fromArray(position);o.castShadow=m.transmission?false:true;o.receiveShadow=!m.transmission;parent.add(o);return o;};
 const mat=params=>{const m=new T.MeshPhysicalMaterial(params);materials.add(m);return m;};
 const brass=mat({name:'V2 brushed champagne edge',color:'#a88b58',metalness:.78,roughness:.32,envMapIntensity:.85});
 const glass=mat({name:'V2 bevelled frosted glass',color:'#e6eadf',roughness:.27,metalness:0,transmission:.42,thickness:.07,ior:1.46,transparent:true,opacity:1,depthWrite:false,envMapIntensity:.72});
 const ivory=mat({name:'V2 ivory reading face',color:'#eeeadd',roughness:.78,metalness:.02,envMapIntensity:.32});
 const forest=mat({name:'V2 forest enamel folio',color:'#30483e',roughness:.54,metalness:.18,envMapIntensity:.55});
 const stoneObject=objects.get(byIndex.get(204).path),stone=stoneObject.material;
 const replacements=new Map(),supports=[],faces=new Map();
 const rod=(name,start,end,radius=.028,material=brass)=>{
  const a=new T.Vector3(...start),b=new T.Vector3(...end),o=add(name,new T.CylinderGeometry(radius,radius,a.distanceTo(b),16),material);
  o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());return o;
 };
 for(const id of ids){
  const p=manifest.panels[id],panel=new T.Group();panel.name='V2_'+id+'_assembly';panel.matrix.fromArray(p.threeLocalGeometryMatrix);panel.matrix.decompose(panel.position,panel.quaternion,panel.scale);group.add(panel);replacements.set(panel.name,panel);
  const [w,h]=p.worldSize;
  // Physical edge, backing and readable front share one plane. DOM is the selectable
  // ink layer, not a texture and not part of the ground reflection.
  const plate=add('V2_'+id+'_glass',new T.ExtrudeGeometry(shape(T,w,h,.085),{depth:.062,bevelEnabled:true,bevelThickness:.009,bevelSize:.009,bevelSegments:3,curveSegments:12}),glass,[0,0,-.042],panel);
  const outline=shape(T,w+.026,h+.026,.098);outline.holes.push(new T.Path(shape(T,w-.034,h-.034,.07).getPoints(48).reverse()));
  add('V2_'+id+'_frame',new T.ExtrudeGeometry(outline,{depth:.068,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:2,curveSegments:12}),brass,[0,0,-.044],panel);
  const face=add('V2_'+id+'_reading_face',new T.ExtrudeGeometry(shape(T,w-.12,h-.12,.06),{depth:.012,bevelEnabled:false,curveSegments:12}),id==='focus'?forest:ivory,[0,0,.026],panel);
  if(id==='focus'){
   add('V2_focus_folio_spine',new T.BoxGeometry(.048,h-.22,.105),brass,[-w/2+.06,0,-.009],panel);
   for(const y of [-h*.34,h*.34])add('V2_focus_binding_'+y,new T.BoxGeometry(.11,.085,.11),brass,[-w/2+.055,y,-.007],panel);
  }
  const collar=add('V2_'+id+'_rear_collar',new T.BoxGeometry(id==='focus'?.52:.38,.14,.16),brass,[0,-h/2+.18,-.13],panel);
  faces.set(id,{panel,width:w,height:h,collar});
  anchors.push({id,object:face,width:w-.12,height:h-.12,frontZ:.013});
 }
 // A shared rear spine for each two-leaf wing replaces ten long perimeter posts.
 // Crossarms join dynamic rear collars; all connection points stay behind the ink.
 for(const [side,upper,lower] of [['left','support','evidence'],['right','limits','questions']]){
  const a=faces.get(upper),b=faces.get(lower),x=(a.panel.position.x+b.panel.position.x)/2,z=Math.min(a.panel.position.z,b.panel.position.z)-.38;
  const top=a.panel.position.y-a.height/2+.24;
  rod('V2_'+side+'_shared_spine',[x,.07,z],[x,top,z],.052);
  add('V2_'+side+'_root_shoe',new T.BoxGeometry(.58,.14,.36),brass,[x,.07,z]);
  for(const id of [upper,lower]){
   const f=faces.get(id),start=new T.Vector3(x,f.panel.position.y-f.height/2+.18,z),arm=rod('V2_'+id+'_crossarm',start.toArray(),[start.x,start.y,start.z+.5],.035);
   supports.push({arm,start,face:f});
  }
 }
 const central=faces.get('focus'),centerFoot=central.panel.position.clone();
 add('V2_focus_folio_rest',new T.BoxGeometry(.78,.16,.72),brass,[centerFoot.x,.34,centerFoot.z-.22]);
 const stemTop=centerFoot.y-central.height/2+.18;
 rod('V2_focus_broad_stem',[centerFoot.x,.34,centerFoot.z-.22],[centerFoot.x,stemTop,centerFoot.z-.22],.085);
 const focusStart=new T.Vector3(centerFoot.x,stemTop,centerFoot.z-.22),focusArm=rod('V2_focus_crossarm',focusStart.toArray(),[focusStart.x,focusStart.y,focusStart.z+.5],.048);supports.push({arm:focusArm,start:focusStart,face:central});
 add('V2_focus_mineral_foot',new T.CylinderGeometry(.72,.80,.16,64),stone,[centerFoot.x,.19,centerFoot.z-.12]);
 const relationMaterial=mat({name:'V2 reading relation bronze',color:'#a58e62',metalness:.65,roughness:.42,emissive:'#5b451f',emissiveIntensity:.14});
 const relationGroup=new T.Group();relationGroup.name='V2_verified_reading_relations';group.add(relationGroup);
 for(const id of ids.filter(id=>id!=='focus')){
  const a=central.panel.position.clone(),b=faces.get(id).panel.position.clone();
  const direction=Math.sign(b.x-a.x);a.x+=direction*central.width*.47;b.x-=direction*faces.get(id).width*.47;a.z-=.16;b.z-=.16;
  const mid=a.clone().lerp(b,.5);mid.y+=id==='support'||id==='limits'?.23:-.12;mid.z-=.18;
  const curve=new T.QuadraticBezierCurve3(a,mid,b);
  add('V2_relation_focus_'+id,new T.TubeGeometry(curve,32,.009,6,false),relationMaterial,[0,0,0],relationGroup);
 }
 relationGroup.visible=false;
 const audit={revision:ATELIER_REVISION,originalGLBUnmodified:true,originalNodeTransformsUnmodified:false,assetSha256:assetHash,nodeCount:records.length,decisions:[],contentBound:false,connections:[],visualAccepted:false,hardwareGPUAccepted:false,worldMatricesSource:manifest.matrixSource,boards:ids.map(id=>({id,...manifest.panels[id]})),reflection:'separate scene pass; DOM is excluded',fixedViewOnly:false,cameraFacingReadingFaces:true,defaultTextProjection:'flat',retainedRockVerticalScale:1,animatedAutoplay:false};
 for(const n of records){const o=objects.get(n.path);saved.push({o,visible:o.visible,matrix:o.matrix.clone(),position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone(),matrixAutoUpdate:o.matrixAutoUpdate,castShadow:o.castShadow,receiveShadow:o.receiveShadow});
  const before=o.matrixWorld.toArray();
  if(n.action==='retain_visible'){
   if(!n.threeWorldMatrix)fail('missing retained world matrix '+n.path);
   const world=new T.Matrix4().fromArray(n.threeWorldMatrix),local=new T.Matrix4().copy(o.parent.matrixWorld).invert().multiply(world);local.decompose(o.position,o.quaternion,o.scale);o.updateMatrix();o.visible=true;
   o.castShadow=n.nodeIndex!==195&&n.nodeIndex!==196;o.receiveShadow=n.nodeIndex!==195;
  }
  if(n.action==='omit_with_reason')o.visible=false;
  audit.decisions.push({nodeIndex:n.nodeIndex,path:n.path,action:n.action,reason:n.reason,replacement:n.replacement||null,beforeWorldMatrix:before,afterLocalMatrix:o.matrix.toArray(),visible:o.visible});
 }
 root.add(group);root.updateMatrixWorld(true);
 let disposed=false;
 function activateContent({contentIds,sourceHash,connections=[]}={}){
  if(disposed)fail('disposed assembly');if(sourceHash!==manifest.sourceSha256||!Array.isArray(contentIds)||[...ids,'navigation'].some(id=>!contentIds.includes(id)))fail('unverified DOM replacement');
  for(const n of records.filter(n=>n.action==='hide_with_recorded_replacement')){if(n.replacement!=='V2_navigation_dom'&&!replacements.has(n.replacement))fail('replacement absent '+n.path);}
  if(connections.length!==4||new Set(connections.map(c=>c.to)).size!==4||connections.some(c=>c.from!=='focus'||!ids.includes(c.to)||c.to==='focus'||c.sourceHash!==sourceHash||!Number.isInteger(c.sourceLine)||!['reading-support','reading-counter','reading-evidence','reading-question'].includes(c.type)))fail('reading relation contract');
  for(const n of records.filter(n=>n.action==='hide_with_recorded_replacement'))objects.get(n.path).visible=false;
  audit.contentBound=true;audit.connections=connections.map(c=>({...c}));for(const d of audit.decisions)d.visible=objects.get(d.path).visible;
  // Only the verified same-document reading relations are drawn; they do not imply citation counts or causality.
  relationGroup.visible=true;audit.connectionRendering='four restrained world-space bronze reading relations; not citations or causal claims';
 }
 function updatePresentation(camera){
  if(disposed||!camera)return;
  camera.updateMatrixWorld(true);
  for(const f of faces.values())f.panel.quaternion.copy(camera.quaternion);
  group.updateMatrixWorld(true);
  for(const s of supports){
   const end=s.face.collar.getWorldPosition(new T.Vector3()),start=s.start;
   const length=start.distanceTo(end);s.arm.position.copy(start).add(end).multiplyScalar(.5);
   s.arm.scale.y=length/.5;s.arm.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());
  }
  root.updateMatrixWorld(true);
 }
 return {audit,hasMotion:false,time:0,tick(){},activateContent,updatePresentation,getFocusPoint(id){return faces.get(id)?.panel.position.clone();},getContentAnchors(camera){
  if(disposed||!camera||!audit.contentBound)return[];updatePresentation(camera);
  return anchors.map(b=>{const quad=[[-b.width/2,b.height/2],[b.width/2,b.height/2],[b.width/2,-b.height/2],[-b.width/2,-b.height/2]].map(([x,y])=>{const w=b.object.localToWorld(new T.Vector3(x,y,b.frontZ)),v=new T.Vector4(w.x,w.y,w.z,1).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);return{x:(v.x/v.w+1)/2,y:(1-v.y/v.w)/2,z:v.z/v.w,w:v.w};});return{id:b.id,name:'V2_'+b.id+'_reading_face',quad,projectionAspect:camera.isPerspectiveCamera?camera.aspect:(camera.right-camera.left)/(camera.top-camera.bottom),surface:{width:b.width,height:b.height,localFrontZ:b.frontZ},inDepth:quad.every(p=>[p.x,p.y,p.z,p.w].every(Number.isFinite)&&p.w>0&&Math.abs(p.z)<=1)};});
 },dispose(){if(disposed)return;disposed=true;root.remove(group);for(const s of saved){s.o.matrix.copy(s.matrix);s.o.position.copy(s.position);s.o.quaternion.copy(s.quaternion);s.o.scale.copy(s.scale);s.o.matrixAutoUpdate=s.matrixAutoUpdate;s.o.visible=s.visible;s.o.castShadow=s.castShadow;s.o.receiveShadow=s.receiveShadow;}root.updateMatrixWorld(true);geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
