// C02 V1 only. Source GLB is frozen; instance transforms and visibility are audited.
export const ATELIER_REVISION='c02-complete-space-v1-20261020';
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
 for(const n of records){if(n.action==='retain_visible'&&(!Array.isArray(n.threeWorldMatrix)||n.threeWorldMatrix.length!==16||!n.threeWorldMatrix.every(Number.isFinite)))fail('missing retained matrix');if(n.action==='hide_with_recorded_replacement'&&!['V1_navigation_dom',...ids.map(id=>'V1_'+id+'_assembly')].includes(n.replacement))fail('missing replacement decision');}
 // Wrapper names belong to the loader, not the immutable asset. Resolve only exact
 // authored root names and full parent paths, then reject every unaccounted mesh.
 const roots=records.filter(n=>n.parentIndex===null),assetRoots=[];
 for(const n of roots){const matches=[];root.traverse(o=>{if(rawName(o)===n.name)matches.push(o);});if(matches.length!==1)fail('missing/duplicate root '+n.name);assetRoots.push(matches[0]);}
 function scan(o,parent=''){const path=parent?parent+'/'+rawName(o):rawName(o),n=byPath.get(path);if(!n||objects.has(path)||!!o.isMesh!==n.isMesh)fail('unknown/mismatched node '+path);objects.set(path,o);for(const child of o.children)scan(child,path);}
 assetRoots.forEach(o=>scan(o));if(objects.size!==records.length)fail('incomplete tree');
 root.traverse(o=>{if(o.isMesh&&![...objects.values()].includes(o))fail('unaccounted mesh '+rawName(o));});
 if(ids.some(id=>!manifest.panels[id]?.threeLocalGeometryMatrix||!manifest.panels[id]?.worldSize))fail('missing surface matrix');
 root.updateMatrixWorld(true);
 const group=new T.Group();group.name='C02_V1_COMPLETE_SPACE';
 const add=(name,g,m,position=[0,0,0],parent=group)=>{geometry.add(g);const o=new T.Mesh(g,m);o.name=name;o.position.fromArray(position);o.castShadow=m.transmission?false:true;o.receiveShadow=!m.transmission;parent.add(o);return o;};
 const mat=params=>{const m=new T.MeshPhysicalMaterial(params);materials.add(m);return m;};
 const brass=mat({name:'V1 thin champagne frame',color:'#bc9b62',metalness:.82,roughness:.26,envMapIntensity:.9});
 const glass=mat({name:'V1 physical thick glass',color:'#eff8f5',roughness:.15,metalness:0,transmission:.94,thickness:.032,ior:1.45,transparent:true,opacity:1,depthWrite:false,envMapIntensity:.8});
 const stoneObject=objects.get(byIndex.get(204).path),stone=stoneObject.material;
 const replacements=new Map();
 for(const id of ids){
  const p=manifest.panels[id],panel=new T.Group();panel.name='V1_'+id+'_assembly';panel.matrix.fromArray(p.threeLocalGeometryMatrix);panel.matrix.decompose(panel.position,panel.quaternion,panel.scale);group.add(panel);replacements.set(panel.name,panel);
  const [w,h]=p.worldSize;
  // Extruded glass front is z=.016 in the same local basis as the exported blend.
  const plate=add('V1_'+id+'_glass',new T.ExtrudeGeometry(shape(T,w,h),{depth:.032,bevelEnabled:false,curveSegments:10}),glass,[0,0,-.016],panel);
  const outline=shape(T,w+.018,h+.018,.064);outline.holes.push(new T.Path(shape(T,w-.018,h-.018,.045).getPoints(40).reverse()));
  add('V1_'+id+'_frame',new T.ExtrudeGeometry(outline,{depth:.024,bevelEnabled:false,curveSegments:10}),brass,[0,0,-.012],panel);
  // Narrow rear supports; no posts cross the interior text region. Not a structural rating.
  panel.updateMatrixWorld(true);
  for(const x of [-w*.46,w*.46]){const bottom=new T.Vector3(x,-h/2,-.065).applyMatrix4(panel.matrix),height=Math.max(.08,bottom.y-.28);add('V1_'+id+'_support_'+x,new T.CylinderGeometry(.016,.023,height,12),brass,[bottom.x,bottom.y-height/2,bottom.z]);}
  anchors.push({id,object:plate,width:w,height:h,frontZ:.032});
 }
 add('V1_focus_round_plinth',new T.CylinderGeometry(.94,.94,.20,96),stone,[.1,.16,.45]);
 const audit={revision:ATELIER_REVISION,originalGLBUnmodified:true,originalNodeTransformsUnmodified:false,assetSha256:assetHash,nodeCount:records.length,decisions:[],contentBound:false,connections:[],visualAccepted:false,hardwareGPUAccepted:false,worldMatricesSource:manifest.matrixSource,boards:ids.map(id=>({id,...manifest.panels[id]})),reflection:'separate scene pass; DOM is excluded',fixedViewOnly:true};
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
  for(const n of records.filter(n=>n.action==='hide_with_recorded_replacement')){if(n.replacement!=='V1_navigation_dom'&&!replacements.has(n.replacement))fail('replacement absent '+n.path);}
  if(connections.length!==4||new Set(connections.map(c=>c.to)).size!==4||connections.some(c=>c.from!=='focus'||!ids.includes(c.to)||c.to==='focus'||c.sourceHash!==sourceHash||!Number.isInteger(c.sourceLine)||!['reading-support','reading-counter','reading-evidence','reading-question'].includes(c.type)))fail('reading relation contract');
  for(const n of records.filter(n=>n.action==='hide_with_recorded_replacement'))objects.get(n.path).visible=false;
  audit.contentBound=true;audit.connections=connections.map(c=>({...c}));for(const d of audit.decisions)d.visible=objects.get(d.path).visible;
  // The paths are intentionally not drawn until their fixed-view composition is visually accepted.
  audit.connectionRendering='not drawn in V1; four real reading-view relations retained as data only';
 }
 return {audit,hasMotion:false,time:0,tick(){},activateContent,getContentAnchors(camera){
  if(disposed||!camera||!audit.contentBound)return[];root.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  return anchors.map(b=>{const quad=[[-b.width/2,b.height/2],[b.width/2,b.height/2],[b.width/2,-b.height/2],[-b.width/2,-b.height/2]].map(([x,y])=>{const w=b.object.localToWorld(new T.Vector3(x,y,b.frontZ)),v=new T.Vector4(w.x,w.y,w.z,1).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);return{x:(v.x/v.w+1)/2,y:(1-v.y/v.w)/2,z:v.z/v.w,w:v.w};});return{id:b.id,name:'V1_'+b.id+'_glass',quad,projectionAspect:camera.isPerspectiveCamera?camera.aspect:(camera.right-camera.left)/(camera.top-camera.bottom),surface:{width:b.width,height:b.height,localFrontZ:b.frontZ},inDepth:quad.every(p=>[p.x,p.y,p.z,p.w].every(Number.isFinite)&&p.w>0&&Math.abs(p.z)<=1)};});
 },dispose(){if(disposed)return;disposed=true;root.remove(group);for(const s of saved){s.o.matrix.copy(s.matrix);s.o.position.copy(s.position);s.o.quaternion.copy(s.quaternion);s.o.scale.copy(s.scale);s.o.matrixAutoUpdate=s.matrixAutoUpdate;s.o.visible=s.visible;s.o.castShadow=s.castShadow;s.o.receiveShadow=s.receiveShadow;}root.updateMatrixWorld(true);geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
