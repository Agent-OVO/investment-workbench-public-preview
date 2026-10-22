import {createThreeLoader} from '/investment-workbench-public-preview/workbench-review/continuity/three-loader.js';
import {projectPlane,polygonsOverlap} from './c01-projection.js';
const asset=name=>new URL('../assets/'+name,import.meta.url).href;
export function boundedView(view={}){return {yaw:Math.max(-3,Math.min(3,Number(view.yaw)||0)),pitch:Math.max(-1.5,Math.min(1.5,Number(view.pitch)||0)),zoom:Math.max(.98,Math.min(1.08,Number(view.zoom)||1))};}
export async function mountC01Model({doc=document,win=window,field,layoutLoader,modelLoader}={}){
  const canvas=field.querySelector('canvas'),status=field.querySelector('[data-model-status]'),planes=field.querySelector('[data-composition]'),controls=field.querySelector('[data-scene-controls]'),toggle=field.querySelector('[data-reading-toggle]');
  const state={webgl:'initializing',mode:'reading',assetReady:false,draws:0,projection:'same-camera complete four-corner homography',occlusion:'no per-pixel DOM/WebGL depth compositing; projected panels must not intersect',view:boundedView()};
  let disposed=false,renderer,scene,camera,T,layout,root,resizeObserver,raf=0,forcedReading=false,ready=false,identity='',contentReady=false,fallbackKey=null,fontEpoch=0;
  const q=selector=>field.querySelector(selector);
  const media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const storageKey=()=>identity?'c01-hybrid-reading-20261022:view:v1:'+identity:null;
  const save=()=>{const key=storageKey();if(key)try{win.sessionStorage.setItem(key,JSON.stringify(state.view));}catch{}};
  const setEnabled=enabled=>{for(const b of controls?.querySelectorAll('button')||[])b.disabled=!enabled;};
  function reading(reason,recoverable=false){state.mode='reading';field.dataset.rendering='reading';canvas.hidden=true;setEnabled(false);const reset=q('[data-view-action="reset"]');if(reset){reset.disabled=!(recoverable&&ready&&contentReady);reset.textContent=recoverable?'归位恢复':'归位';}if(toggle){toggle.textContent=forcedReading?'返回空间':'原生阅读';toggle.setAttribute('aria-pressed',String(forcedReading));}for(const el of planes.querySelectorAll('[data-plane]')){el.style.removeProperty('transform');el.style.removeProperty('width');el.style.removeProperty('height');}status.textContent=reason;}
  function updateCamera(){
    const v=state.view,p=layout.camera.position,target=new T.Vector3(...layout.camera.target),offset=new T.Vector3(...p).sub(target);
    const spherical=new T.Spherical().setFromVector3(offset);spherical.theta+=v.yaw*Math.PI/180;spherical.phi+=v.pitch*Math.PI/180;spherical.radius/=v.zoom;
    camera.position.copy(target).add(new T.Vector3().setFromSpherical(spherical));camera.lookAt(target);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
  }
  function project(){
    if(!ready||disposed||!contentReady)return;
    if(forcedReading){reading('原生阅读模式 · 图表和正文完整保留，空间镜头已停用。');return;}
    const width=field.getBoundingClientRect().width,targetHeight=Math.max(760,Math.min(1060,win.innerHeight-64));
    if(width<1180||width/targetHeight<1.42){reading('当前窗口采用清晰阅读布局。放宽窗口后可回到空间；这不是 GPU 视觉验收。');return;}
    const attemptKey=JSON.stringify([width,targetHeight,state.view,identity,fontEpoch]);if(fallbackKey===attemptKey)return;
    field.dataset.rendering='spatial';const rect=field.getBoundingClientRect();
    camera.aspect=rect.width/rect.height;updateCamera();
    renderer.setPixelRatio(Math.min(win.devicePixelRatio||1,1.75));renderer.setSize(rect.width,rect.height,false);
    const results=layout.panels.map(p=>({p,el:planes.querySelector(`[data-plane="${p.id}"]`),projection:projectPlane(T,camera,p,rect.width,rect.height)}));
    if(results.some(x=>!x.el)){reading('内容尚未齐备，空间暂不显示替代面板。');return;}
    for(let i=0;i<results.length;i++)for(let j=i+1;j<results.length;j++)if(polygonsOverlap(results[i].projection.corners,results[j].projection.corners)){fallbackKey=attemptKey;reading('当前投影发生交叠，已切换清晰阅读布局。可用“归位恢复”回到主视角。',true);return;}
    if(results.some(x=>x.projection.corners.some(([x,y])=>x<12||x>rect.width-12||y<90||y>rect.height-55))){fallbackKey=attemptKey;reading('当前视角无法完整容纳三个阅读面，已切换清晰阅读。可用“归位恢复”返回。',true);return;}
    field.dataset.rendering='spatial';state.mode='spatial';canvas.hidden=false;
    for(const {p,el,projection} of results){el.style.width=p.pixels[0]+'px';el.style.height=p.pixels[1]+'px';el.style.transform=projection.transform;}
    // Never crop content to manufacture a passing frame. Overflow is an honest reading fallback.
    if(results.some(({el})=>el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1)){fallbackKey=attemptKey;reading('当前字体或内容超出预设阅读面，已切换完整原生排版，未裁掉文字。',true);return;}
    renderer.render(scene,camera);state.draws++;state.projectedPlanes=results.map(x=>({id:x.p.id,corners:x.projection.corners,homography:x.projection.homography}));
    fallbackKey=null;setEnabled(true);q('[data-view-action="reset"]').textContent='归位';if(toggle){toggle.textContent='原生阅读';toggle.setAttribute('aria-pressed','false');}
    status.textContent='3D 场景已载入 · 原生文字与实体面使用同一相机投影。模型不是投资数据。';
    q('[data-view-readout]').textContent=`水平 ${state.view.yaw.toFixed(1)}° · 俯仰 ${state.view.pitch.toFixed(1)}° · ${Math.round(state.view.zoom*100)}%`;
  }
  const schedule=()=>{if(!raf&&!disposed)raf=win.requestAnimationFrame(()=>{raf=0;try{project();}catch(e){state.projectionError=String(e);state.webgl='render-failed';ready=false;if(toggle)toggle.disabled=true;reading('空间渲染未能安全完成，当前保留完整阅读布局；刷新可重新尝试。');}});};
  const adjust=patch=>{fallbackKey=null;state.view=boundedView({...state.view,...patch});save();schedule();};
  const click=e=>{const b=e.target.closest?.('[data-view-action]');if(!b||b.disabled)return;const action=b.dataset.viewAction,v=state.view;if(action==='left')adjust({yaw:v.yaw-1});if(action==='right')adjust({yaw:v.yaw+1});if(action==='up')adjust({pitch:v.pitch-.5});if(action==='down')adjust({pitch:v.pitch+.5});if(action==='in')adjust({zoom:v.zoom+.02});if(action==='out')adjust({zoom:v.zoom-.02});if(action==='reset')adjust({yaw:0,pitch:0,zoom:1});};
  const key=e=>{if(e.ctrlKey||e.metaKey||e.altKey||!e.target.closest?.('[data-view-handle]')||state.mode!=='spatial')return;const v=state.view,k=e.key;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Escape','+','-','=','_'].includes(k))e.preventDefault();if(k==='ArrowLeft')adjust({yaw:v.yaw-1});if(k==='ArrowRight')adjust({yaw:v.yaw+1});if(k==='ArrowUp')adjust({pitch:v.pitch-.5});if(k==='ArrowDown')adjust({pitch:v.pitch+.5});if(['Home','Escape'].includes(k))adjust({yaw:0,pitch:0,zoom:1});if(k==='+'||k==='=')adjust({zoom:v.zoom+.02});if(k==='-'||k==='_')adjust({zoom:v.zoom-.02});};
  const changeReading=()=>{forcedReading=!forcedReading;fallbackKey=null;schedule();};
  const loss=e=>{e.preventDefault();ready=false;state.webgl='context-lost';if(toggle)toggle.disabled=true;reading('图形上下文已丢失。完整阅读仍可用；刷新可重新尝试 3D。');};
  const refresh=()=>{contentReady=!!planes.dataset.sourceSha256;const next=contentReady?planes.dataset.report+':'+planes.dataset.sourceSha256:'';if(next!==identity){save();identity=next;state.view=boundedView();try{const saved=JSON.parse(win.sessionStorage.getItem(storageKey())||'null');if(saved)state.view=boundedView(saved);}catch{}}schedule();};
  const handle={refresh,clearContent(){save();contentReady=false;identity='';state.view=boundedView();reading('正在核对对应研究，未显示旧研究的空间内容。');},getState:()=>({...state}),dispose(){if(disposed)return;save();disposed=true;win.cancelAnimationFrame(raf);resizeObserver?.disconnect();controls?.removeEventListener('click',click);controls?.removeEventListener('keydown',key);toggle?.removeEventListener('click',changeReading);canvas.removeEventListener('webglcontextlost',loss);media?.removeEventListener?.('change',schedule);win.removeEventListener('pageshow',refresh);win.removeEventListener('resize',schedule);root?.traverse?.(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){for(const k of ['map','normalMap','roughnessMap','metalnessMap'])m[k]?.dispose?.();m.dispose();}});scene?.environment?.dispose?.();renderer?.dispose();}};
  controls?.addEventListener('click',click);controls?.addEventListener('keydown',key);toggle?.addEventListener('click',changeReading);canvas.addEventListener('webglcontextlost',loss);media?.addEventListener?.('change',schedule);win.addEventListener('pageshow',refresh);win.addEventListener('resize',schedule);setEnabled(false);
  try{
    await createThreeLoader(doc,win)();if(disposed)return handle;T=win.THREE;
    const response=layoutLoader?await layoutLoader():await win.fetch(asset('scene-layout.json'),{credentials:'omit',mode:'same-origin',redirect:'error'});layout=layoutLoader?response:await response.json();
    if(!layout?.panels||layout.panels.length!==3||layout.units!=='metres')throw Error('INVALID_SCENE_LAYOUT');
    renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    scene=new T.Scene();scene.background=new T.Color('#d7dfdc');scene.fog=new T.Fog('#d7dfdc',9,25);camera=new T.PerspectiveCamera(layout.camera.fov,1,.05,55);
    scene.add(new T.HemisphereLight('#e6edf1','#6e695a',.8));
    const sun=new T.DirectionalLight('#fff0d5',2.3);sun.position.set(...layout.light.position);sun.target.position.set(...layout.light.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-4;sun.shadow.camera.right=4;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-1;sun.shadow.camera.near=.1;sun.shadow.camera.far=18;sun.shadow.normalBias=.015;sun.shadow.bias=-.0003;scene.add(sun,sun.target);
    const fill=new T.DirectionalLight('#c0d5eb',.55);fill.position.set(4,4,1);scene.add(fill);
    const rear=new T.DirectionalLight('#fff4df',.8);rear.position.set(0,4,-5);scene.add(rear);
    // Original simple light-card environment, not a copied HDR photograph.
    const env=new T.Scene();env.background=new T.Color('#aeb9b5');const sphere=new T.Mesh(new T.SphereGeometry(15,16,12),new T.MeshBasicMaterial({color:'#b7c1bd',side:T.BackSide}));env.add(sphere);
    for(const [p,s,c] of [[[-6,6,4],[5,6],'#fff1d5'],[[5,4,1],[4,5],'#e2efff'],[[0,4,-7],[7,3],'#e5e7da']]){const m=new T.Mesh(new T.PlaneGeometry(...s),new T.MeshBasicMaterial({color:c,side:T.DoubleSide}));m.position.set(...p);m.lookAt(0,0,0);env.add(m);}
    const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.04,.1,30).texture;pmrem.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
    const loaderModule=modelLoader?null:await import('/investment-workbench-public-preview/cloud/current-20261015-right-workspace/assets/art-rebuild/runtime/GLTFLoader.js');
    const gltf=modelLoader?await modelLoader():await new loaderModule.GLTFLoader().loadAsync(asset('c01-atelier.glb'));if(disposed){gltf.scene?.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.();});return handle;}
    root=gltf.scene;root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.envMapIntensity=.62;}}});scene.add(root);
    state.webgl='available';state.assetReady=true;ready=true;resizeObserver=new win.ResizeObserver(schedule);resizeObserver.observe(field);doc.fonts?.ready.then(()=>{fontEpoch++;fallbackKey=null;schedule();});refresh();
  }catch(e){state.webgl='unavailable';state.error=String(e);renderer?.dispose();if(toggle)toggle.disabled=true;reading('3D 未能启动，当前为完整原生阅读布局；不代表空间视觉验收。');}
  return handle;
}
