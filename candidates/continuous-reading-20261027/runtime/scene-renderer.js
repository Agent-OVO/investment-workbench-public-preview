import * as THREE from '../vendor/three.module.js';
import {normalizeProjectedPositions,rendererCanAnimate} from './chart-model.js';

// Original authored geometry and studio-light texture. No reference images or
// private blueprint code are embedded. Rendering never changes financial state.
export function createBeamGeometry(length,height=24,depth=12) {
  if(!Number.isFinite(length)||length<=0)throw new RangeError('BEAM_LENGTH_MUST_BE_POSITIVE');
  const b=Math.min(1.45,height/8,length/8),w=Math.max(length-2*b,.001),h=height-2*b,r=Math.min(1.4,h/4,w/4);
  const shape=new THREE.Shape();
  shape.moveTo(r,0);shape.lineTo(w-r,0);shape.quadraticCurveTo(w,0,w,r);
  shape.lineTo(w,h-r);shape.quadraticCurveTo(w,h,w-r,h);
  shape.lineTo(r,h);shape.quadraticCurveTo(0,h,0,h-r);
  shape.lineTo(0,r);shape.quadraticCurveTo(0,0,r,0);
  const g=new THREE.ExtrudeGeometry(shape,{depth:depth-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:3,steps:1,curveSegments:4});
  g.translate(-w/2,-h/2,-(depth-2*b)/2);
  g.rotateX(-.46);g.rotateY(.32);
  // Orthographic camera looks along -Z. Projected x is therefore world x;
  // normalize all bevel/cap vertices to the exact intended monetary interval.
  const normalized=normalizeProjectedPositions(g.attributes.position.array,length);
  g.setAttribute('position',new THREE.BufferAttribute(normalized.positions,3));
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
  return g;
}
function studioTexture(){
  const w=128,h=64,pixels=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const u=x/w,v=y/h;
    const longbox=Math.exp(-(Math.pow((u-.23)/.075,2)+Math.pow((v-.29)/.17,2)));
    const rim=Math.exp(-(Math.pow((u-.77)/.035,2)+Math.pow((v-.49)/.30,2)));
    const ceiling=Math.exp(-Math.pow((v-.16)/.12,2))*.24;
    const floor=Math.max(0,v-.62)*.20,light=longbox*.67+rim*.62+ceiling-floor;
    const i=(y*w+x)*4;
    pixels[i]=Math.min(255,Math.max(0,101+light*155));
    pixels[i+1]=Math.min(255,Math.max(0,132+light*123));
    pixels[i+2]=Math.min(255,Math.max(0,146+light*109));pixels[i+3]=255;
  }
  const t=new THREE.DataTexture(pixels,w,h,THREE.RGBAFormat);t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;
}
function shadowTexture(){
  const w=64,h=32,p=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const xx=(x+.5)/w*2-1,yy=(y+.5)/h*2-1,i=(y*w+x)*4;p[i]=21;p[i+1]=57;p[i+2]=70;p[i+3]=Math.round(74*Math.exp(-yy*yy*7)*Math.pow(Math.max(0,1-xx*xx),.45));}
  const t=new THREE.DataTexture(p,w,h,THREE.RGBAFormat);t.needsUpdate=true;return t;
}
function materials(positive){
  const color=positive?0xb79a5c:0x087e9c;
  return [new THREE.MeshPhysicalMaterial({color,metalness:.54,roughness:.29,clearcoat:.8,clearcoatRoughness:.17,envMapIntensity:.95,emissive:color,emissiveIntensity:0}),new THREE.MeshPhysicalMaterial({color:positive?0x998054:0x225c70,metalness:.72,roughness:.25,clearcoat:.4,clearcoatRoughness:.18,envMapIntensity:1.15,emissive:color,emissiveIntensity:0})];
}
// Mirrored by --motion-selection in style.css and checked by the visual contract.
export const SELECTION_TRANSITION_MS=180;
const noop=()=>{};
export function createSceneRenderer({canvas,onSelect=noop,onStatus=noop}={}) {
  if(!canvas)throw new Error('SCENE_CANVAS_REQUIRED');
  let disposed=false,contextLost=false,renderer=null,environment=null,shadowMap=null,spec=null,frame=0,animationStart=null,environmentTexture=null;
  let state={selectedId:'',product:'',hoveredId:'',paused:false,visible:true,mode:'spatial'},inViewport=true;
  let activeCanvas=canvas,host=canvas.parentElement,objects=new Map(),observer=null;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,1,1,0,.1,3000),content=new THREE.Group();scene.add(content);camera.position.set(0,0,1000);
  const ambient=new THREE.HemisphereLight(0xe9f8ff,0x7a929b,2.1);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xf4fcff,3.2);key.position.set(-220,300,500);scene.add(key);
  const edge=new THREE.DirectionalLight(0xffffff,1.6);edge.position.set(340,-70,250);scene.add(edge);
  let reduced=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
  const raf=typeof requestAnimationFrame==='function'?requestAnimationFrame.bind(globalThis):null,caf=typeof cancelAnimationFrame==='function'?cancelAnimationFrame.bind(globalThis):noop;
  const publish=(kind,label,detail='')=>{activeCanvas.dataset.renderer=kind;if(host?.dataset)host.dataset.renderer=kind;onStatus({kind,label,detail});};
  const mayAnimate=()=>rendererCanAnimate({...state,reduced:!!reduced?.matches,inViewport,contextLost,disposed})&&!!renderer&&!!raf;
  const stop=()=>{if(frame)caf(frame);frame=0;animationStart=null;};
  function selected(row){const target=state.selectedId||state.product;return row.id===target||row.productId===target;}
  function refreshMaterials(progress=1){
    for(const entry of objects.values()){
      const isSelected=selected(entry.row),hovered=entry.row.id===state.hoveredId||entry.row.productId===state.hoveredId;
      const flash=progress<1?Math.sin(progress*Math.PI)*.05:0;
      entry.mesh.material.forEach((m,i)=>{m.emissiveIntensity=(isSelected?.026:0)+(hovered?.038:0)+(isSelected?flash:0);m.envMapIntensity=(i?1.15:.95)+(isSelected?.09:0);});
      entry.shadow.material.opacity=isSelected?.76:.52;
    }
    key.position.x=-220; // Fixed lighting: selection feedback is not a moving data signal.
  }
  function draw(){
    if(disposed||!renderer||contextLost||!spec||!state.visible||!inViewport||state.mode==='flat')return;
    try{renderer.render(scene,camera);}catch(error){contextLost=true;stop();activeCanvas.style.visibility='hidden';publish('fallback','二维保底 · WebGL 不可用',String(error?.message||'WebGL render failed'));}
  }
  function animate(now){
    frame=0;if(!mayAnimate()){stop();refreshMaterials();draw();return;}
    if(animationStart===null)animationStart=now;
    const progress=Math.min(1,(now-animationStart)/SELECTION_TRANSITION_MS);refreshMaterials(progress);draw();
    if(progress<1)frame=raf(animate);else animationStart=null;
  }
  function schedule({selectionChanged=false}={}){
    stop();refreshMaterials();activeCanvas.style.display=state.mode==='flat'?'none':'block';
    if(selectionChanged&&mayAnimate()){animationStart=null;frame=raf(animate);}else draw();
  }
  function clearObjects(){for(const e of objects.values()){content.remove(e.mesh,e.shadow);e.mesh.geometry.dispose();e.mesh.material.forEach(m=>m.dispose());e.shadow.geometry.dispose();e.shadow.material.dispose();}objects.clear();}
  function attachObserver(){observer?.disconnect();if(typeof IntersectionObserver==='function'&&host){observer=new IntersectionObserver(entries=>{const previous=inViewport;inViewport=entries.some(e=>e.isIntersecting);if(!inViewport)stop();else if(!previous){refreshMaterials();draw();}},{threshold:0});observer.observe(host);}}
  const lost=event=>{event.preventDefault?.();contextLost=true;stop();activeCanvas.style.visibility='hidden';publish('fallback','二维保底 · WebGL 不可用','WebGL context lost; HTML values remain available');};
  const restored=()=>{contextLost=false;activeCanvas.style.visibility='visible';publish('webgl','三维实体图');schedule();};
  const motionChange=()=>schedule();
  try{
    renderer=new THREE.WebGLRenderer({canvas:activeCanvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
    const pmrem=new THREE.PMREMGenerator(renderer);
    // Initialization may fail after allocating generator resources. Release the
    // temporary texture and generator on both success and exception paths.
    try{environmentTexture=studioTexture();environment=pmrem.fromEquirectangular(environmentTexture);scene.environment=environment.texture;}
    finally{environmentTexture?.dispose();environmentTexture=null;pmrem.dispose();}
    shadowMap=shadowTexture();
    activeCanvas.addEventListener('webglcontextlost',lost,false);activeCanvas.addEventListener('webglcontextrestored',restored,false);reduced?.addEventListener?.('change',motionChange);activeCanvas.style.pointerEvents='none';publish('webgl','三维实体图');attachObserver();
  }catch(error){renderer?.dispose();renderer=null;activeCanvas.style.visibility='hidden';publish('fallback','二维保底 · WebGL 不可用',String(error?.message||'WebGL unavailable'));}
  return {
    setScene(next){
      if(disposed)return;
      if(!next||!Number.isFinite(next.width)||!Number.isFinite(next.height)||next.width<=0||next.height<=0)return;
      spec=next;if(!renderer)return;
      camera.left=0;camera.right=next.width;camera.top=0;camera.bottom=-next.height;camera.updateProjectionMatrix();renderer.setSize(next.width,next.height,false);
      const rows=(next.rows||[]).filter(r=>typeof r.id==='string'&&[r.x0,r.x1,r.y].every(Number.isFinite)&&r.x1>r.x0);
      const ids=new Set(rows.map(r=>r.id));
      for(const [id,e]of objects){if(!ids.has(id)){content.remove(e.mesh,e.shadow);e.mesh.geometry.dispose();e.mesh.material.forEach(m=>m.dispose());e.shadow.geometry.dispose();e.shadow.material.dispose();objects.delete(id);}}
      for(const row of rows){
        const length=row.x1-row.x0,height=row.height||24,positive=row.positive??row.value>0;let entry=objects.get(row.id);
        if(!entry){
          const mesh=new THREE.Mesh(createBeamGeometry(length,height),materials(positive));mesh.userData={objectId:row.id,productId:row.productId};
          const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,opacity:.52}));shadow.renderOrder=-1;
          entry={mesh,shadow,row,length,height,positive};objects.set(row.id,entry);content.add(mesh,shadow);
        }else if(entry.length!==length||entry.height!==height){entry.mesh.geometry.dispose();entry.mesh.geometry=createBeamGeometry(length,height);entry.length=length;entry.height=height;}
        if(entry.positive!==positive){entry.mesh.material.forEach(m=>m.dispose());entry.mesh.material=materials(positive);entry.positive=positive;}
        entry.row=row;entry.mesh.position.set(row.x0,-row.y,6);entry.shadow.position.set((row.x0+row.x1)/2,-row.y-height*.54,-16);entry.shadow.scale.set(length+7,height*1.42,1);
      }
      if(next.selectedId&&!state.selectedId)state.selectedId=next.selectedId;
      schedule();
    },
    setState(next={}){if(disposed)return;const before=state.selectedId||state.product;state={...state,...next};const after=state.selectedId||state.product;schedule({selectionChanged:before!==after});},
    reparentTo(placeholder){
      if(disposed||!placeholder||placeholder===activeCanvas)return;
      const nextHost=placeholder.parentElement;if(placeholder.id)activeCanvas.id=placeholder.id;if(placeholder.className)activeCanvas.className=placeholder.className;
      if(typeof placeholder.replaceWith==='function')placeholder.replaceWith(activeCanvas);else nextHost?.replaceChild?.(activeCanvas,placeholder);
      host=nextHost;attachObserver();if(host?.dataset)host.dataset.renderer=renderer&&!contextLost?'webgl':'fallback';schedule();
    },
    dispose(){if(disposed)return;disposed=true;stop();observer?.disconnect();reduced?.removeEventListener?.('change',motionChange);activeCanvas.removeEventListener?.('webglcontextlost',lost);activeCanvas.removeEventListener?.('webglcontextrestored',restored);clearObjects();environment?.dispose();environmentTexture?.dispose();shadowMap?.dispose();scene.environment=null;renderer?.dispose();renderer=null;},
    getDebugState(){return {disposed,contextLost,renderer:renderer?'webgl':'fallback',objects:[...objects.keys()],framePending:!!frame,visible:state.visible,inViewport,mode:state.mode,paused:state.paused,selectedId:state.selectedId,hoveredId:state.hoveredId};}
  };
}
