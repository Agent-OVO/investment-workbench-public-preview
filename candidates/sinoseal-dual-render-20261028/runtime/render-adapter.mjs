import * as THREE from '../vendor/three.module.js';
import {SVGRenderer} from '../vendor/SVGRenderer.js';
import {Projector} from '../vendor/Projector.js';

// SVG presentation attributes, not inline CSS: preserve the original strict CSP.
const SVG_STYLE_KEYS=Object.freeze(['fill','fill-opacity','stroke','stroke-opacity','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray']);
export function applySVGPresentationStyle(node,style){
 const values=new Map();for(const declaration of style.split(';').filter(Boolean)){
  const colon=declaration.indexOf(':'),key=declaration.slice(0,colon).trim(),value=declaration.slice(colon+1).trim();
  if(!SVG_STYLE_KEYS.includes(key)||values.has(key))throw Error('Unsupported SVG style property: '+key);
  let valid=false;
  if(key==='fill'||key==='stroke')valid=/^(?:none|#[0-9a-f]{3,8}|rgb\([\d.,%+\-\s]+\))$/i.test(value);
  else if(key==='stroke-linecap')valid=['butt','round','square'].includes(value);
  else if(key==='stroke-linejoin')valid=['bevel','miter','round'].includes(value);
  else if(key==='stroke-dasharray')valid=value.split(',').every(v=>v.trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0);
  else valid=value!==''&&Number.isFinite(Number(value))&&Number(value)>=0&&(!key.endsWith('opacity')||Number(value)<=1);
  if(!valid)throw Error('Unsupported SVG presentation value: '+key+'='+value);values.set(key,value);
 }
 for(const key of SVG_STYLE_KEYS)node.removeAttribute(key);node.removeAttribute('style');
 for(const [key,value]of values)node.setAttribute(key,value);
}

// One scene/camera/selection controller; only the drawing backend changes.
// The original input canvas stays mounted, so pointer capture, focus and hits use
// exactly the same camera and stable IDs in either drawing mode.
const adapters=new Set(),listeners=new Set();
const modeFromURL=()=>{try{return new URL(globalThis.location.href).searchParams.get('render')==='2d'?'2d':'3d'}catch{return '3d'}};
let mode=modeFromURL();
export const getRenderMode=()=>mode;
export const getRenderDiagnostics=()=>[...adapters].map(a=>({state:a.getDebugState(),audit:a.getDrawAudit()}));
export function onRenderModeChange(fn){listeners.add(fn);return()=>listeners.delete(fn)}
export function setRenderMode(next,{url=true}={}){
 if(!['3d','2d'].includes(next))throw Error('Render mode must be 3d or 2d');
 if(url&&globalThis.location?.href&&globalThis.history?.replaceState){const u=new URL(location.href);u.searchParams.set('render',next);history.replaceState(history.state,'',u.href)}
 if(next===mode)return;mode=next;
 for(const adapter of adapters)adapter.switchMode(next);
 for(const fn of listeners)fn(next);
}
if(typeof globalThis.addEventListener==='function')globalThis.addEventListener('popstate',()=>setRenderMode(modeFromURL(),{url:false}));
export function renderStatus(renderer,fallback,paused=false){
 if(!renderer?.isDualRenderer)return fallback;
 if(!renderer.available)return renderer.mode==='2d'?'2D SVG 绘制失败，未显示完整场景；请检查错误证据。':'3D WebGL 不可用；请选择 2D 查看同一场景。未宣称 3D 视觉通过。';
 if(renderer.mode==='2d')return '2D SVG · 无需 WebGL；同一场景、精确轴、数值与选择。'+(paused?'视角变化已暂停。':'拖动、键盘与对象选择可用。');
 return fallback;
}
export function createRenderAdapter(options={}){
 const input=options.canvas||document.createElement('canvas');
 let webgl=null,svg=null,disposed=false,failed3d=null,failed2d=null,width=1,height=1,pixelRatio=1,clearColor=0,clearAlpha=0,lastScene=null,lastCamera=null,drawCount=0,lastObjects=[];
 let activeMode=mode;const flatMaterials=new Map();
 const api={isDualRenderer:true,domElement:input,onModeChange:null,outputColorSpace:THREE.SRGBColorSpace,toneMapping:THREE.NoToneMapping,toneMappingExposure:1,
  get mode(){return activeMode},get webgl(){return webgl},get available(){return activeMode==='2d'?!!svg&&!failed2d:!!webgl&&!failed3d},
  setPixelRatio(value){pixelRatio=value;webgl?.setPixelRatio(value)},
  setClearColor(color,alpha=1){clearColor=color;clearAlpha=alpha;webgl?.setClearColor(color,alpha);svg?.setClearColor(color)},
  setSize(w,h,updateStyle=false){width=w;height=h;webgl?.setSize(w,h,false);svg?.setSize(w,h);if(!webgl){input.width=Math.round(w*pixelRatio);input.height=Math.round(h*pixelRatio);}},
  switchMode(next){if(disposed||next===activeMode)return;activeMode=next;ensure();syncSurface();if(lastScene&&lastCamera&&input.isConnected!==false)api.render(lastScene,lastCamera);api.onModeChange?.(next)},
  render(scene,camera){
   if(disposed)return;lastScene=scene;lastCamera=camera;ensure();syncSurface();
   if(!api.available)return false;
   if(activeMode==='3d'){
    webgl.outputColorSpace=api.outputColorSpace;webgl.toneMapping=api.toneMapping;webgl.toneMappingExposure=api.toneMappingExposure;
    try{webgl.render(scene,camera)}catch(error){failed3d=String(error.message||error);syncSurface();api.onModeChange?.(activeMode);return false}
   }else{
    // Flat SVG material is temporary; original 3D PBR materials and identity survive.
    const restored=[];lastObjects=[];scene.updateMatrixWorld(true);
    try{
     scene.traverseVisible(object=>{
      if(object.userData?.renderDecoration==='texture-shadow'){restored.push([object,'visible',object.visible]);object.visible=false;return}
      if(object.isInstancedMesh)throw Error('InstancedMesh is not supported by the SVG adapter; no incomplete success is reported');
      if(object.isMesh&&object.material){restored.push([object,'material',object.material]);object.material=Array.isArray(object.material)?object.material.map(flat):flat(object.material)}
      if(object.geometry){object.geometry.computeBoundingBox();const box=object.geometry.boundingBox;const b=box?.clone().applyMatrix4(object.matrixWorld);lastObjects.push({uuid:object.uuid,id:object.userData.metricId||object.userData.partId||object.userData.edgeId||object.userData.nodeId||object.userData.selection?.id||object.userData.objectId||object.userData.id||null,type:object.type,vertices:object.geometry.attributes.position?.count||0,bounds:b?{min:b.min.toArray(),max:b.max.toArray()}:null})}
     });
     svg.render(scene,camera);svg.domElement.removeAttribute('style');const background=scene.background?.isColor?scene.background:(clearAlpha>0?new THREE.Color(clearColor):null);if(background){const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('x',String(-width/2));rect.setAttribute('y',String(-height/2));rect.setAttribute('width',String(width));rect.setAttribute('height',String(height));rect.setAttribute('fill',background.getStyle(THREE.SRGBColorSpace));rect.setAttribute('fill-opacity',String(scene.background?.isColor?1:clearAlpha));rect.setAttribute('data-render-decoration','background');svg.domElement.insertBefore(rect,svg.domElement.firstChild)}drawCount++;
     svg.domElement.dataset.sceneObjects=String(lastObjects.length);svg.domElement.dataset.drawCount=String(drawCount);
     svg.domElement.dataset.faces=String(svg.info.render.faces);svg.domElement.dataset.vertices=String(svg.info.render.vertices);
    }catch(error){failed2d=String(error.message||error);syncSurface();api.onModeChange?.(activeMode);return false}
    finally{for(const [object,key,value]of restored)object[key]=value}
   }
   return true;
  },
  getDrawAudit(){
   if(!lastScene||!lastCamera)return null;
   const projected=new Projector().projectScene(lastScene,lastCamera,true,true),rows=new Map();
   for(const item of projected.elements){const points=[item.v1,item.v2,item.v3].filter(Boolean).map(v=>v.positionScreen);if(!points.length)continue;const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));if(maxX < -1||minX>1||maxY < -1||minY>1)continue;const row=rows.get(item.id)||{elements:0,minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};row.elements++;row.minX=Math.min(row.minX,minX);row.maxX=Math.max(row.maxX,maxX);row.minY=Math.min(row.minY,minY);row.maxY=Math.max(row.maxY,maxY);rows.set(item.id,row)}
   const objects=[];lastScene.traverseVisible(o=>{const id=o.userData.metricId||o.userData.partId||o.userData.selection?.id||o.userData.objectId||o.userData.id;if(id&&o.geometry)objects.push({id,type:o.geometry.type,...(rows.get(o.id)||{elements:0})})});return {mode:activeMode,svgPaths:svg?.domElement.querySelectorAll?.('path').length??0,svgFaces:svg?.info.render.faces??0,objects};
  },
  getDebugState(){return{mode:activeMode,available:api.available,failed3d,failed2d,width,height,drawCount,sceneUuid:lastScene?.uuid,cameraUuid:lastCamera?.uuid,objectCount:lastObjects.length,objects:lastObjects,svgPaths:svg?.domElement.querySelectorAll?.('path').length??null,svgFaces:svg?.info.render.faces??null}},
  dispose(){if(disposed)return;disposed=true;adapters.delete(api);webgl?.dispose();svg?.domElement.remove();for(const material of flatMaterials.values())material.dispose();flatMaterials.clear();api.onModeChange=null;input.removeEventListener('webglcontextlost',lost);input.removeEventListener('webglcontextrestored',restored)}
 };
 function flat(original){let material=flatMaterials.get(original);if(!material){material=new THREE.MeshBasicMaterial();flatMaterials.set(original,material)}material.color.copy(original.color||new THREE.Color(0x708998));material.opacity=original.opacity;material.transparent=original.transparent;material.side=original.side;material.visible=original.visible;material.vertexColors=original.vertexColors;material.wireframe=original.wireframe;return material}
 function ensure(){
  if(activeMode==='2d'&&!svg&&!failed2d){try{svg=new SVGRenderer();svg.setPathStyle=applySVGPresentationStyle;svg.setBackgroundColor=()=>{};svg.overdraw=0;svg.setPrecision(5);svg.setSize(width,height);svg.setClearColor(clearColor);svg.domElement.classList?.add('dual-svg-surface');svg.domElement.setAttribute('aria-hidden','true');}catch(error){failed2d=String(error.message||error)}}
  if(activeMode==='3d'&&!webgl&&!failed3d){try{webgl=new THREE.WebGLRenderer({...options,canvas:input});webgl.setPixelRatio(pixelRatio);webgl.setClearColor(clearColor,clearAlpha);webgl.setSize(width,height,false)}catch(error){failed3d=String(error.message||error)}}
 }
 function syncSurface(){
  if(svg&&input.parentNode&&svg.domElement.parentNode!==input.parentNode)input.parentNode.insertBefore(svg.domElement,input);
  if(svg){if(activeMode==='2d'&&api.available)svg.domElement.removeAttribute('hidden');else svg.domElement.setAttribute('hidden','')}
  input.dataset.renderMode=activeMode;input.dataset.renderAvailable=String(api.available);
  if(input.parentNode?.dataset){input.parentNode.dataset.renderMode=activeMode;input.parentNode.dataset.renderAvailable=String(api.available)}
 }
 function lost(event){event.preventDefault?.();failed3d='WebGL context lost';if(activeMode==='3d'){syncSurface();api.onModeChange?.(activeMode)}}
 function restored(){failed3d=null;if(activeMode==='3d'&&lastScene)api.render(lastScene,lastCamera);api.onModeChange?.(activeMode)}
 input.addEventListener('webglcontextlost',lost);input.addEventListener('webglcontextrestored',restored);
 ensure();adapters.add(api);return api;
}
