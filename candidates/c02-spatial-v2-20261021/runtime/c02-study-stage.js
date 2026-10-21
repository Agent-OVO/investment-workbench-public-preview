import {fitC02Viewport} from './c02-viewport.js?v=c02-spatial-v2-20261021';
import {createBoundedController,bindC02Controls} from './c02-controls.js?v=c02-spatial-v2-20261021';
import {refineAssembly} from './c02-atelier-model.js?v=c02-spatial-v2-20261021';


import {loadStageAsset} from '/investment-workbench-public-preview/cloud/current-20261015-right-workspace/stage-trials-20261017/asset-loader.js';
import {validateStageAsset,inspectAsset,nodeContracts,prepareShadowFlags,findUnique,rawName} from '/investment-workbench-public-preview/cloud/current-20261015-right-workspace/stage-trials-20261017/stage-core.js';
import {FINISH,createFinishLighting} from './c02-study-finish.js?v=c02-spatial-v2-20261021';


export async function mountStage({root:host,variant='c02-platform-b',onUpdate=()=>{},contentMode='syntheticDemo',signal}={}) {
if(!['syntheticDemo','localDraft'].includes(contentMode))throw new Error('Unsupported stage content mode');
const T=globalThis.THREE,canvas=host.querySelector('#trial-canvas'),stage=host.querySelector('#stage');
const status=host.querySelector('#status'),buttons=host.querySelector('#variants'),motion=host.querySelector('#motion');
const motionReset=host.querySelector('#motion-reset'),details=host.querySelector('.diagnostics');
const state={status:'loading',requestedVariant:variant,currentVariant:null,contentMode,
  renderReady:false,visualAccepted:false,businessBound:contentMode==='syntheticDemo',performanceAccepted:false,textMode:'flat',disposed:false,contextLost:false,
  renderCount:0,switchCount:0,webglStatus:'not-initialized',errors:[],animationPlaying:false,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
let manifest,sceneManifest,definitions,group,groupId,renderer,scene,world,camera,controller,lighting,active,pending,observer,inputs;
let generation=0,raf=0,lastTime=null,rendererName=null,calls=0,triangles=0,cpuRenderMs=0,lastDetails=0,pageSuspended=false;
const removers=[];
const setupAbort=new AbortController();
const listen=(target,type,fn,opts)=>{target.addEventListener(type,fn,opts);removers.push(()=>target.removeEventListener(type,fn,opts));};
function show(message,failed=false){status.textContent=message;status.classList.toggle('failed',failed);status.setAttribute('role',failed?'alert':'status');}
function snapshot(){
  if(active)active.root.updateMatrixWorld(true);
  return {...state,errors:[...state.errors],group:groupId,groupVariants:group?.variants||[],
    loadedAssets:active?.handles.map(h=>({...h.receipt}))||[],assetStats:active?.audits||[],assembly:active?.assembly||null,
    mounted:{containers:world?.children.length||0,nodes:active?.combinedStats.nodes||0,meshes:active?.combinedStats.meshes||0,triangles:active?.combinedStats.triangles||0},
    protectedNodes:active?nodeContracts(active.base.object3D,active.contractNames):[],
    animation:{available:!!(active?.mixer||active?.refinement?.hasMotion),playing:state.animationPlaying,time:active?.mixer?.time||active?.refinement?.time||0,clip:active?.clip?.name||null,duration:active?.clip?.duration||0,
      movingNodes:active?.movingNames.map(name=>{const o=findUnique(active.tree.object3D,name);return {name,matrix:o.matrix.toArray(),quaternion:o.quaternion.toArray()};})||[]},
    camera:controller?{...controller.get(),type:camera.isPerspectiveCamera?'perspective':'orthographic',quaternion:camera.quaternion.toArray(),up:camera.up.toArray(),
      projection:camera.projectionMatrix.toArray(),fov:camera.fov,near:camera.near,far:camera.far,source:sceneManifest.matrixSource,
      fitPolicy:'V2 world-space composition; bounded ±4° yaw, ±2° pitch, 0.94–1.06 zoom. All five physical reading faces track the camera. Not a recovered concept-image camera.'}:null,
    lighting:{profile:{...FINISH},materialCalibration:false,refinement:active?.refinement?.audit||null,importedLightsHidden:active?.hiddenLights||[],policy:'18 authored environmental/stage meshes retained; two redundant inner rings omitted with records; source geometry retained; not visually accepted.',reflection:lighting?.reflectionAudit||null},
    renderer:renderer?{name:rendererName,revision:T.REVISION,calls,triangles,cpuRenderMs,pixelRatio:renderer.getPixelRatio(),
      size:renderer.getSize(new T.Vector2()).toArray(),drawingBuffer:[canvas.width,canvas.height],memory:{...renderer.info.memory},programs:renderer.info.programs?.length||0,
      exposure:renderer.toneMappingExposure,outputEncoding:renderer.outputEncoding,toneMapping:renderer.toneMapping}:null};
}
function applyGroup(id){groupId=id;group=manifest.groups[id];controller?.reset();resize();}
function boundedController(){
 return createBoundedController({THREE:T,camera,pose:sceneManifest.camera,getFocusPoint:id=>active?.refinement?.getFocusPoint(id),onChange(){state.renderReady=false;inputs?.update();schedule();}});
}
function getContentAnchors(){
  if(active?.refinement?.getContentAnchors)return active.refinement.getContentAnchors(camera);
  if(!active||!camera)return [];
  active.root.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  return active.contractNames.map(name=>{
    const o=findUnique(active.base.object3D,name),box=new T.Box3().setFromObject(o);
    if(box.isEmpty())return null;
    const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new T.Vector3(x,y,z).project(camera));
    return {name,left:(Math.min(...points.map(p=>p.x))+1)/2,top:(1-Math.max(...points.map(p=>p.y)))/2,right:(Math.max(...points.map(p=>p.x))+1)/2,bottom:(1-Math.min(...points.map(p=>p.y)))/2,inDepth:points.every(p=>p.z>=-1&&p.z<=1)};
  }).filter(Boolean);
}
function publish(){
  onUpdate(api);
  host.dataset.trialStatus=state.status;host.dataset.variant=state.currentVariant||'';
  const p=controller?.get().presentation;if(p)host.querySelector('#angle').textContent=`${p.yawDegrees.toFixed(1)}° / ${p.pitchDegrees.toFixed(1)}°`;
  motion.hidden=motionReset.hidden=!active?.mixer;motion.textContent=state.animationPlaying?'暂停微风':'播放微风';motion.setAttribute('aria-pressed',String(state.animationPlaying));
  host.querySelector('#motion-time').textContent=active?.mixer?`${(active.mixer.time%active.clip.duration).toFixed(2)} / ${active.clip.duration} 秒`:'';
  for(const b of buttons.children)b.setAttribute('aria-pressed',String(b.dataset.variant===state.currentVariant));
  if(details.open&&performance.now()-lastDetails>250){host.querySelector('#diagnostic-output').textContent=JSON.stringify(snapshot(),null,2);lastDetails=performance.now();}
}
function render(time=performance.now()){
  raf=0;if(state.disposed||state.contextLost||pageSuspended)return;
  if((active?.mixer||active?.refinement?.hasMotion)&&state.animationPlaying&&!document.hidden){if(lastTime!==null){const delta=Math.min((time-lastTime)/1000,.25);active.mixer?.update(delta);active.refinement?.tick(active.refinement.time+delta);}lastTime=time;}
  else lastTime=null;
  try{const start=performance.now();active?.refinement?.updatePresentation?.(camera);renderer.info.reset();lighting?.renderReflection?.(camera);renderer.render(scene,camera);cpuRenderMs=performance.now()-start;
    calls=renderer.info.render.calls;triangles=renderer.info.render.triangles;state.renderCount++;state.renderReady=!!active;publish();
  }catch(error){state.status='failed';state.renderReady=false;state.animationPlaying=false;state.errors.push({phase:'render',message:String(error)});show(`渲染失败：${error.message}`,true);publish();}
  if(state.animationPlaying&&!document.hidden)schedule();
}
function schedule(){if(!raf&&renderer&&!state.disposed&&!state.contextLost&&!pageSuspended)raf=requestAnimationFrame(render);}
function resize(){if(!renderer||state.disposed)return;const {width,height}=stage.getBoundingClientRect(),aspect=Math.max(1,width)/Math.max(1,height);renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.75));renderer.setSize(width,height,false);state.renderReady=false;
 const fit=fitC02Viewport({width,height,fovDegrees:sceneManifest.camera.verticalFovDegrees});
 camera.aspect=fit.aspect;camera.fov=fit.fovDegrees;
 camera.updateProjectionMatrix();schedule();}
function release(assembly){if(!assembly)return;assembly.mixer?.stopAllAction();if(assembly.mixer)assembly.mixer.uncacheRoot(assembly.tree.object3D);assembly.refinement?.dispose();assembly.handles.slice().reverse().forEach(h=>h.dispose());}
async function selectVariant(id){
  if(state.disposed)throw new Error('Viewer disposed');if(id!=='c02-platform-b')throw new Error('Variant outside frozen flow baseline');
  // Version/content updates share one in-flight scene request instead of restarting it.
  if(pending?.id===id)return pending.promise;
  const reuseCurrent=active&&state.currentVariant===id&&!state.contextLost&&(state.status!=='failed'||state.requestedVariant!==id);
  const token=++generation;pending?.controller.abort();pending=null;state.requestedVariant=id;
  // Returning to the retained scene still invalidates the previous request.
  if(reuseCurrent){state.status='ready';show(state.contentMode==='localDraft'?'空间 V2 已加载 · 本地只读公开稿 · 未保存云端研究库 · 视觉待验收':'空间 V2 已加载 · 合成研究内容接线候选 · 视觉待验收');publish();return snapshot();}
  const request={id,token,controller:new AbortController(),promise:null};pending=request;
  request.promise=loadVariant(request);return request.promise;
}
async function loadVariant(request){
  const {id,token,controller:abort}=request,def=definitions[id];
  state.status='loading';show(`正在核验：${def.title}…`);publish();const handles=[];
  let next,preflightMixer,preflightTree,committed=false;
  try{
    const start=performance.now(),audits=[];
    for(const assetId of [def.assetId,...(def.replacement?[def.replacement.assetId]:[])]){
      const asset=manifest.assets[assetId];const handle=await loadStageAsset({THREE:T,asset,signal:abort.signal,resolveAsset:a=>new URL('../../../'+a.path,new URL('/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/stage.js',location.origin))});handles.push(handle);
      if(abort.signal.aborted||token!==generation||state.disposed){handles.forEach(h=>h.dispose());return snapshot();}
      audits.push({id:assetId,...validateStageAsset(T,handle,asset)});
    }
    const base=handles[0],root=new T.Group();root.name='stage_exclusive_scene';
    for(const handle of handles){const wrapper=handle.object3D;wrapper.userData={...wrapper.userData,originalWrapperName:rawName(wrapper),name:`import_${handle.receipt.id}`};wrapper.name=wrapper.userData.name;}
    root.add(base.object3D);
    const contractNames=manifest.assets[def.assetId].expected.contractNames||[];
    const before=JSON.stringify(nodeContracts(base.object3D,contractNames));
    const removed=[],hiddenLights=[];let tree=null,mixer=null,clip=null,movingNames=[];
    if(def.replacement){
      const replacement=def.replacement;tree=handles[1];
      if(base.receipt.actualSha256!==replacement.baseSha256)throw new Error('Whole-tree replacement baseline hash mismatch');
      const oldNodes=replacement.removeNodes.map(name=>findUnique(base.object3D,name));
      if(new Set(oldNodes).size!==oldNodes.length)throw new Error('Duplicate replacement slot');
      for(const node of oldNodes)for(let parent=node.parent;parent;parent=parent.parent)if(oldNodes.includes(parent))throw new Error('Overlapping replacement roots');
      for(const node of oldNodes){removed.push(rawName(node));node.parent.remove(node);}
      // Both resources already use the same glTF world coordinates. Identity parent only.
      root.add(tree.object3D);
      if(JSON.stringify(nodeContracts(base.object3D,contractNames))!==before)throw new Error('Tree replacement changed protected surfaces or anchors');
      clip=tree.animations.find(c=>c.name===replacement.clipName);
      if(tree.animations.length!==1||!clip)throw new Error('Unexpected breeze clip');
      if(!Array.isArray(replacement.movingNames)||new Set(replacement.movingNames).size!==replacement.movingNames.length)throw new Error('Invalid moving-node contract');
      movingNames=replacement.movingNames;movingNames.forEach(name=>findUnique(tree.object3D,name));
      mixer=preflightMixer=new T.AnimationMixer(tree.object3D);preflightTree=tree;
      mixer.clipAction(clip).setLoop(T.LoopRepeat,Infinity).play();mixer.setTime(0);
    }
    root.traverse(o=>{if(o.isLight){o.visible=false;hiddenLights.push(rawName(o));}});prepareShadowFlags(root);
    const refinement=refineAssembly(T,root,contractNames,{manifest:sceneManifest,assetHash:base.receipt.actualSha256});
    if(JSON.stringify(nodeContracts(base.object3D,contractNames))!==before){refinement.dispose();throw Error('Refinement changed protected geometry');}
    next={root,base,handles,audits,contractNames,tree,mixer,clip,movingNames,hiddenLights,refinement,combinedStats:inspectAsset(T,root),
      assembly:{variant:id,completeScenes:1,wholeTreeReplacement:!!def.replacement,removedStaticNodes:removed,animationInsertedNodes:tree?audits[1].nodes:0,
        duplicateNames:inspectAsset(T,root).duplicateNodeNames,loadMilliseconds:performance.now()-start}};
    if(next.assembly.duplicateNames.length)throw new Error('Unexpected duplicate names in exclusive assembly');
    if(abort.signal.aborted||token!==generation||state.disposed){release(next);return snapshot();}
    if(def.group!==groupId)applyGroup(def.group);const old=active;if(old)world.remove(old.root);world.add(root);active=next;next=null;committed=true;preflightMixer=null;
    state.animationPlaying=false;lastTime=null;state.currentVariant=id;state.status='ready';state.renderReady=false;state.switchCount++;release(old);
    host.querySelector('#trial-title').textContent=def.title;host.querySelector('#variant-note').textContent=def.note||'';
    // Selection URL is owned by the caller; this viewer never assigns research identity.
    show(state.contentMode==='localDraft'?'空间 V2 已加载 · 本地只读公开稿 · 未保存云端研究库 · 视觉待验收':'空间 V2 已加载 · 合成研究内容接线候选 · 视觉待验收');schedule();publish();return snapshot();
  }catch(error){
    if(committed){state.status='failed';state.errors.push({phase:'post-install',variant:id,message:String(error)});show(`候选已装配，但显示诊断失败：${error.message}。可重新加载或切回其他版本。`,true);return {status:state.status,currentVariant:state.currentVariant};}
    if(next)release(next);else {
      if(preflightMixer){preflightMixer.stopAllAction();preflightMixer.uncacheRoot(preflightTree.object3D);preflightMixer=null;}
      handles.slice().reverse().forEach(h=>h.dispose());
    }
    if(abort.signal.aborted||token!==generation||state.disposed)return snapshot();
    state.status='failed';state.errors.push({phase:'asset',variant:id,message:String(error)});
    show(`加载失败：${error.message}。${active?'保留上一已加载版本。':'没有加载候选。'}`,true);publish();return snapshot();
  }finally{if(pending===request)pending=null;}
}
function setView(yaw=0,pitch=0){if(!controller||state.disposed)return;controller.setView(yaw,pitch);inputs?.update();publish();}
function setAnimationPlaying(value){if(!(active?.mixer||active?.refinement?.hasMotion)||state.disposed)return;state.animationPlaying=!!value&&!state.reducedMotion;lastTime=null;schedule();publish();}
function setAnimationTime(seconds){if(!(active?.mixer||active?.refinement?.hasMotion)||!Number.isFinite(seconds))return;state.animationPlaying=false;lastTime=null;active.mixer?.setTime(Math.max(0,seconds));active.refinement?.tick(Math.max(0,seconds));schedule();publish();}
function inspectProtectedVisibility(){
  if(!active||!camera)return[];active.root.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const wanted=new Set(['focus','support','limits','evidence','questions'].map(id=>'V2_'+id+'_reading_face')),targets=[],meshes=[];
  active.root.traverse(o=>{if(o.isMesh&&o.visible){meshes.push(o);if(wanted.has(rawName(o)))targets.push(o);}});
  return targets.map(target=>{
    const box=new T.Box3().setFromObject(target),center=box.getCenter(new T.Vector3()),ndc=center.clone().project(camera),corners=[];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new T.Vector3(x,y,z).project(camera).toArray());
    const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(ndc.x,ndc.y),camera);const distance=ray.ray.origin.distanceTo(center);
    const hits=ray.intersectObjects(meshes,false).filter(hit=>hit.object!==target&&hit.distance<distance-.003).map(hit=>{
      const material=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex||0]:hit.object.material;
      return {name:rawName(hit.object),distance:hit.distance,opacity:material.opacity,transmission:material.transmission||0,transparent:material.transparent};});
    return {name:rawName(target),worldCenter:center.toArray(),projectedCenter:ndc.toArray(),projectedCorners:corners,
      centerInFrame:Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1&&Math.abs(ndc.z)<=1,
      boundsInFrame:corners.every(c=>Math.abs(c[0])<=1&&Math.abs(c[1])<=1&&Math.abs(c[2])<=1),
      opaqueCenterBlockers:hits.filter(h=>h.opacity>0&&!h.transparent&&!h.transmission),transparentIntersections:hits.filter(h=>h.opacity>0&&(h.transparent||h.transmission)),
      scope:'One center ray and world AABB projection; not text safe area, alpha-texture sampling, pixel sorting or business click acceptance.'};
  });
}
function dispose(){if(state.disposed)return;state.disposed=true;state.status='disposed';state.renderReady=false;state.animationPlaying=false;generation++;setupAbort.abort();pending?.controller.abort();if(raf)cancelAnimationFrame(raf);raf=0;
  observer?.disconnect();removers.splice(0).forEach(fn=>fn());inputs?.dispose();controller?.dispose();if(active){world.remove(active.root);release(active);active=null;}lighting?.dispose();renderer?.dispose();publish();}
const api={setTextMode(mode){if(['flat','affine','perspective'].includes(mode))state.textMode=mode;},getPublicDiagnostics(){return {candidate:'c02-spatial-v2-20261021',state:state.status,textMode:state.textMode,webgl:{status:state.webglStatus,available:!!renderer&&!state.contextLost&&!state.disposed},initializationFailed:state.errors.some(e=>e.phase==='setup'),camera:controller?.get()||null,viewport:{width:stage.clientWidth,height:stage.clientHeight,devicePixelRatio:globalThis.devicePixelRatio||1,rendererPixelRatio:renderer?.getPixelRatio()??null},visualAccepted:false,GPUAccepted:false};},focusZone(id){controller?.focus(id);inputs?.update();schedule();},activateContent(contract){active?.refinement?.activateContent(contract);if(active){state.businessBound=true;state.contentSourceHash=contract.sourceHash;}schedule();},getDiagnostics:snapshot,inspectProtectedVisibility,selectVariant,getContentAnchors,suspend(value){pageSuspended=!!value;state.animationPlaying=false;if(raf)cancelAnimationFrame(raf);raf=0;if(!value)schedule();},restorePose(pose){if(pose)setView(pose.presentation?.yawDegrees||0,pose.presentation?.pitchDegrees||0);},setView,reset:()=>{controller?.reset();inputs?.update();},setAnimationPlaying,setAnimationTime,renderOnce:()=>{if(raf)cancelAnimationFrame(raf);render();return snapshot();},dispose};

// Optional caller cancellation can reach the existing disposal path before initialization resolves.
if(signal?.aborted){dispose();return api;}
if(signal)listen(signal,'abort',dispose,{once:true});

try{
  if(String(T?.REVISION)!=='149')throw new Error('Local Three r149 required');
  const response=await fetch(new URL('../stage-trials-20261017/asset-manifest.json',new URL('/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/stage.js',location.origin)),{signal:setupAbort.signal});if(!response.ok)throw new Error(`Manifest HTTP ${response.status}`);manifest=await response.json();
  if(state.disposed||setupAbort.signal.aborted)throw new DOMException('Viewer initialization cancelled','AbortError');
  const cameraResponse=await fetch(new URL('./c02-scene-manifest.v2.json',import.meta.url),{signal:setupAbort.signal});if(!cameraResponse.ok)throw new Error('C02 V2 manifest missing');sceneManifest=await cameraResponse.json();
  if(state.disposed||setupAbort.signal.aborted)throw new DOMException('Viewer initialization cancelled','AbortError');
  definitions=manifest.viewerVariants||Object.fromEntries(Object.entries(manifest.assets).filter(([,a])=>a.group).map(([id,a])=>[id,{...a,assetId:id}]));
  const initial=definitions[state.requestedVariant];if(!initial)throw new Error(`Unknown variant: ${state.requestedVariant}`);
  groupId=initial.group;group=manifest.groups[groupId];
  T.ColorManagement.legacyMode=false;state.webglStatus='initializing';renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
  state.webglStatus='available';renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=FINISH.exposure;renderer.physicallyCorrectLights=true;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.info.autoReset=false;
  const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');rendererName=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  scene=new T.Scene();world=new T.Group();scene.add(world);scene.background=new T.Color('#becdd3');scene.fog=null;
  const pose=sceneManifest.camera;
  camera=new T.PerspectiveCamera(pose.verticalFovDegrees,1672/941,pose.near,pose.far);
  controller=boundedController();inputs=bindC02Controls({host,canvas,controller,onChange:()=>{schedule();publish();}});canvas.setAttribute('aria-label','C02 空间 V2；拖动改变有限视角，滚轮缩放，方向键移动，Home 复位，Escape 返回总览；Tab 访问真实研究链接');
  lighting=createFinishLighting(T,renderer,scene);
  listen(host.querySelector('#reset'),'click',()=>{controller.reset();inputs?.update();});listen(host.querySelector('#retry'),'click',()=>state.contextLost?location.reload():selectVariant(state.requestedVariant));
  listen(motion,'click',()=>setAnimationPlaying(!state.animationPlaying));listen(motionReset,'click',()=>setAnimationTime(0));listen(details,'toggle',()=>{lastDetails=0;publish();});
  listen(canvas,'webglcontextlost',event=>{event.preventDefault();state.contextLost=true;state.webglStatus='context-lost';state.status='failed';state.renderReady=false;state.animationPlaying=false;if(raf)cancelAnimationFrame(raf);raf=0;show('图形上下文已丢失；点击重新加载以重建完整渲染资源。',true);publish();});
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');listen(reducedMotion,'change',event=>{state.reducedMotion=event.matches;if(event.matches)setAnimationPlaying(false);});
  listen(document,'visibilitychange' ,()=>{lastTime=null;if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else schedule();});
  listen(window,'pagehide',event=>{if(event.persisted){pageSuspended=true;if(raf)cancelAnimationFrame(raf);raf=0;lastTime=null;}else dispose();});
  listen(window,'pageshow',event=>{if(event.persisted){pageSuspended=false;lastTime=null;schedule();}});
  observer=new ResizeObserver(resize);observer.observe(stage);resize();await selectVariant(state.requestedVariant);
}catch(error){if(!state.disposed){if(state.webglStatus==='initializing')state.webglStatus='initialization-failed';state.status='failed';state.errors.push({phase:'setup',message:String(error)});show(`试装未启动：${error.message}。旧入口仍可使用。`,true);publish();}}


return api;
}
