import * as THREE from '../vendor/three.module.js';
import {BUDGET} from './space-model.mjs';
const NS='http://www.w3.org/2000/svg';
const svg=(tag,attrs={},text)=>{const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;};
const colors=['#9cc6d6','#087e91','#be9554','#7967aa'];
const hidden=(element,value)=>{if(value)element.setAttribute('hidden','');else element.removeAttribute('hidden');};
export function createAmountGeometry(mark){if(mark.missing)throw new TypeError('Missing amount has no solid geometry');return new THREE.BoxGeometry(mark.width,Math.abs(mark.height),mark.depth);}
export function shortObjectLabel(label){const short=label.replace('干气密封及控制系统','干气密封').replace('机械密封辅助系统','辅助系统').replace('密封产品修复','产品修复');return short.length>5?short.slice(0,5)+'…':short;}
export function fitResearchCamera(camera,layout,view,width,height){
 const aspect=width/height,middle=(layout.domain.max+layout.domain.min)*layout.domain.scale/2,target=new THREE.Vector3(0,middle,0),r=24;
 camera.position.copy(target).add(new THREE.Vector3(Math.sin(view.yaw)*Math.cos(view.pitch)*r,Math.sin(view.pitch)*r,Math.cos(view.yaw)*Math.cos(view.pitch)*r));camera.lookAt(target);camera.updateMatrixWorld();
 const xs=[-layout.span/2-2.2,layout.span/2+1.5],ys=[layout.domain.min*layout.domain.scale-.65,layout.domain.max*layout.domain.scale+.35],zs=[-layout.periodSpan/2-.6,layout.periodSpan/2+.8];
 let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
 for(const x of xs)for(const y of ys)for(const z of zs){const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);xmin=Math.min(xmin,p.x);xmax=Math.max(xmax,p.x);ymin=Math.min(ymin,p.y);ymax=Math.max(ymax,p.y);}
 const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),offset=right.multiplyScalar((xmin+xmax)/2).add(up.multiplyScalar((ymin+ymax)/2));camera.position.add(offset);target.add(offset);camera.lookAt(target);
 const halfH=Math.max(3.7,(ymax-ymin)/2+.28,(xmax-xmin)/aspect/2+.28)/view.zoom;
 camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();camera.updateMatrixWorld();
 return {position:camera.position.toArray(),target:target.toArray(),halfHeight:halfH,aspect};
}
export function createSpaceRenderer({host,onSelect,onView,onStatus}){
 const frame=document.createElement('div');frame.className='rs-scene';
 const canvas=document.createElement('canvas');canvas.className='rs-webgl';canvas.setAttribute('aria-hidden','true');
 const overlay=svg('svg',{class:'rs-axis-overlay','aria-hidden':'true'}),flat=svg('svg',{class:'rs-flat',role:'img','aria-label':'同一金额模型的正交二维比较图；所有对象亦可在下方精确数字表选择'});
 frame.append(canvas,overlay,flat);host.append(frame);
 let gl=null,failed=false,disposed=false,inView=true,layout=null,state=null,raf=0,drag=null,width=960,height=470,renderCount=0;
 const scene=new THREE.Scene(),group=new THREE.Group();scene.add(group);
 const camera=new THREE.OrthographicCamera(-9,9,5,-5,.1,100);const raycaster=new THREE.Raycaster();
 scene.add(new THREE.HemisphereLight(0xf0f8ff,0x42606d,2));
 const key=new THREE.DirectionalLight(0xfff4df,2.8);key.position.set(-5,10,9);scene.add(key);
 const rim=new THREE.DirectionalLight(0xb0ddec,1.5);rim.position.set(7,5,-7);scene.add(rim);
 let meshes=[],geometrySignature='';
 function clear(){while(group.children.length){const c=group.children[0];group.remove(c);c.geometry?.dispose();if(Array.isArray(c.material))c.material.forEach(m=>m.dispose());else c.material?.dispose();}meshes=[];}
 function line(points,color=0xc8d7dc,opacity=1){const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));group.add(l);return l;}
 function rebuild(){
  const signature=JSON.stringify([layout.marks.map(m=>[m.record.id,m.x,m.z,m.height,m.missing]),layout.domain,state.selectedId,state.measurementId]);if(signature===geometrySignature)return;geometrySignature=signature;clear();
  const xlo=-layout.span/2-1,xhi=layout.span/2+1,zlo=-layout.periodSpan/2-.55,zhi=layout.periodSpan/2+.55;
  for(const tick of layout.domain.ticks){const y=tick*layout.domain.scale;line([[xlo,y,zlo],[xhi,y,zlo]],tick===0?0x718b95:0xd7e1e4);}
  line([[xlo,layout.domain.min*layout.domain.scale,zlo],[xlo,layout.domain.max*layout.domain.scale,zlo]],0x718b95);
  for(const p of layout.periods){const m=layout.marks.find(x=>x.record.period===p.id);if(m)line([[xlo,0,m.z],[xhi,0,m.z]],0xa8c0c9);}
  for(const p of layout.products){const pp=layout.marks.filter(m=>m.record.productId===p.id&&!m.missing);if(pp.length===2)line(pp.map(m=>[m.x,m.height,m.z]),0x5b8191,.55);}
  for(const m of layout.marks){
   if(m.missing)continue;
   const selected=m.record.id===state.measurementId||m.record.id===state.selectedId||m.record.productId===state.selectedId;
   // Fixed footprint; only signed height carries an amount. No bevel distorts extrema.
   const geo=createAmountGeometry(m);
   const material=new THREE.MeshStandardMaterial({color:colors[m.periodIndex%colors.length],metalness:.12,roughness:.34,emissive:selected?0x385d66:0x000000,emissiveIntensity:selected?.22:0});
   const mesh=new THREE.Mesh(geo,material);mesh.position.set(m.x,m.y,m.z);mesh.userData={measurementId:m.record.id};group.add(mesh);meshes.push(mesh);
   if(selected){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0xb57919}));edges.position.copy(mesh.position);group.add(edges);}
  }
 }
 function resize(){const rect=host.getBoundingClientRect();width=Math.max(700,Math.round(rect.width||960));height=470;frame.setAttribute('data-width',String(width));canvas.width=width;canvas.height=height;for(const e of [overlay,flat])e.setAttribute('viewBox',`0 0 ${width} ${height}`);if(gl){const ratio=Math.min(devicePixelRatio||1,BUDGET.maxPixelRatio,Math.sqrt(BUDGET.maxCanvasPixels/(width*height)));gl.setPixelRatio(ratio);gl.setSize(width,height,false);}schedule();}
 function init(){if(gl||failed)return;try{gl=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.18;gl.setClearColor(0xf5f8f8,0);resize();}catch(e){failed=true;onStatus({renderer:'2d',reason:'此环境无法建立 WebGL；已使用同源二维比较，选择与数字不变。'});}}
 function cameraPose(){fitResearchCamera(camera,layout,state.view,width,height);}
 function project(x,y,z){const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x+1)*width/2,y:(1-p.y)*height/2};}
 function labels(){
  overlay.replaceChildren();
  const xlo=-layout.span/2-1,zlo=-layout.periodSpan/2-.55;
  for(const tick of layout.domain.ticks){const p=project(xlo,tick*layout.domain.scale,zlo);overlay.append(svg('text',{x:p.x-9,y:p.y+4,'text-anchor':'end',class:'rs-tick'},tick.toLocaleString('zh-CN')));}
  const unit=project(xlo,layout.domain.max*layout.domain.scale,zlo);overlay.append(svg('text',{x:Math.max(8,unit.x-30),y:Math.max(18,unit.y-15),class:'rs-unit'},'万元'));
  for(const [i,p]of layout.products.entries()){const mm=layout.marks.filter(m=>m.record.productId===p.id),front=mm.at(-1);if(!front)continue;const pos=project(i*1.65-(layout.products.length-1)*1.65/2,Math.min(0,layout.domain.min*layout.domain.scale)-.30,layout.periodSpan/2+.6);const label=svg('text',{x:pos.x,y:pos.y,'text-anchor':'middle',class:'rs-product-number'},shortObjectLabel(p.label));label.append(svg('title',{},p.label));overlay.append(label);}
  if(state.view.preset!=='compare')for(const p of layout.periods){const m=layout.marks.find(x=>x.record.period===p.id);if(!m)continue;const pos=project(layout.span/2+1.15,0,m.z);overlay.append(svg('text',{x:Math.min(width-78,pos.x+5),y:Math.min(height-13,pos.y+4),class:'rs-period-label'},p.label));}
 }
 function drawFlat(){
  flat.replaceChildren();flat.append(svg('title',{},`${layout.products.length} 个产品，${layout.periods.length} 个期间；金额单位万元`));
  const pad={left:76,right:26,top:34,bottom:57},pw=width-pad.left-pad.right,ph=height-pad.top-pad.bottom,d=layout.domain;
  const yy=v=>pad.top+(d.max-v)/(d.max-d.min)*ph,zero=yy(0),step=pw/Math.max(1,layout.products.length),n=layout.periods.length,bw=Math.min(28,step/(n+2));
  for(const tick of d.ticks){const y=yy(tick);flat.append(svg('line',{x1:pad.left,y1:y,x2:width-pad.right,y2:y,class:tick===0?'rs-zero':'rs-grid'}),svg('text',{x:pad.left-11,y:y+4,'text-anchor':'end',class:'rs-tick'},tick.toLocaleString('zh-CN')));}
  flat.append(svg('text',{x:pad.left,y:19,class:'rs-unit'},'万元 · 正交等比例'));
  for(const [i,p]of layout.products.entries()){
   const x=pad.left+step*(i+.5),mm=layout.marks.filter(m=>m.record.productId===p.id);
   const label=svg('text',{x,y:height-23,'text-anchor':'middle',class:'rs-product-number'},shortObjectLabel(p.label));label.append(svg('title',{},p.label));flat.append(label);
   for(const [j,m]of mm.entries()){
    const cx=x+(j-(n-1)/2)*(bw+5),value=m.record.cents===null?null:Number(m.record.cents)/1000000;
    if(value===null){flat.append(svg('text',{x:cx,y:zero-8,'text-anchor':'middle',class:'rs-tick'},'—'));continue;}
    const y=yy(value),selected=m.record.id===state.measurementId||m.record.id===state.selectedId||m.record.productId===state.selectedId;
    const bar=svg('rect',{x:cx-bw/2,y:Math.min(y,zero),width:bw,height:Math.abs(y-zero),fill:colors[m.periodIndex%colors.length],class:selected?'rs-bar is-selected':'rs-bar','data-id':m.record.id});
    bar.append(svg('title',{},`${m.record.productLabel} · ${m.record.period} · ${m.record.amount} 元`));flat.append(bar);
    // Transparent pick area improves tiny/nonzero and zero-value access; no visible invented height.
    flat.append(svg('rect',{x:cx-bw/2-3,y:Math.min(y,zero)-4,width:bw+6,height:Math.max(12,Math.abs(y-zero)+8),fill:'transparent','data-id':m.record.id,class:'rs-hit'}));
   }
  }
 }
 function draw(){raf=0;if(disposed||!layout||!inView||document.hidden)return;const wants=state.mode==='3d';if(wants)init();if(wants&&failed&&state.mode==='3d')onStatus({renderer:'2d',reason:'此环境的 WebGL 不可用；已使用二维比较。'});const spatial=wants&&!!gl&&!failed;frame.dataset.renderer=spatial?'webgl':'2d';hidden(canvas,!spatial);hidden(overlay,!spatial);hidden(flat,spatial);
  if(spatial){rebuild();cameraPose();try{gl.render(scene,camera);labels();}catch(e){failed=true;hidden(canvas,true);hidden(overlay,true);hidden(flat,false);drawFlat();onStatus({renderer:'2d',reason:'三维绘制失败；保留同源二维与全部对象。'});}}else drawFlat();renderCount++;
 }
 function schedule(){if(!raf&&!disposed&&inView&&!document.hidden)raf=requestAnimationFrame(draw);}
 const click=e=>{if(drag?.moved)return;const id=e.target.closest?.('[data-id]')?.getAttribute('data-id');if(id){onSelect(id);return;}if(!gl||failed||state.mode!=='3d')return;const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=raycaster.intersectObjects(meshes)[0];if(hit)onSelect(hit.object.userData.measurementId);};
 const down=e=>{if(e.button!==0||state?.paused||state?.mode!=='3d'||failed)return;drag={x:e.clientX,y:e.clientY,yaw:state.view.yaw,pitch:state.view.pitch,moved:false};canvas.setPointerCapture?.(e.pointerId);};
 const move=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;if(drag.moved)onView({...state.view,preset:'custom',yaw:drag.yaw-dx*.005,pitch:drag.pitch+dy*.004});};
 const up=()=>{if(drag?.moved){const keep=drag;setTimeout(()=>{if(drag===keep)drag=null;},0);}else drag=null;};
 const wheel=e=>{if(state?.paused||state?.mode!=='3d'||failed||!e.ctrlKey)return;e.preventDefault();onView({...state.view,preset:'custom',zoom:state.view.zoom*Math.exp(-e.deltaY*.001)});};
 const cancelDrag=()=>{drag=null;};
 const lost=e=>{e.preventDefault();cancelDrag();failed=true;onStatus({renderer:'2d',reason:'WebGL 上下文丢失；已保留二维、选择和视角状态。'});schedule();};
 canvas.addEventListener('webglcontextlost',lost);frame.addEventListener('click',click);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});
 canvas.addEventListener('lostpointercapture',cancelDrag);globalThis.addEventListener?.('blur',cancelDrag);
 const visible=()=>{if(document.hidden)cancelDrag();schedule();};document.addEventListener('visibilitychange',visible);
 const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;resizeObserver?.observe(host);
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{inView=entries.some(e=>e.isIntersecting);if(!inView&&raf){cancelAnimationFrame(raf);raf=0;}else schedule();}):null;observer?.observe(host);resize();
 return {update(nextLayout,nextState){layout=nextLayout;state=nextState;if(state.paused||state.mode!=='3d')cancelDrag();schedule();},getSnapshot(){return {renderer:state?.mode==='3d'&&gl&&!failed?'webgl':'2d',webglAttempted:!!gl||failed,webglFailed:failed,renderCount,pendingFrame:!!raf,meshCount:meshes.length,continuousAnimation:false,dragging:!!drag};},dispose(){disposed=true;cancelDrag();if(raf)cancelAnimationFrame(raf);resizeObserver?.disconnect();observer?.disconnect();document.removeEventListener('visibilitychange',visible);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('lostpointercapture',cancelDrag);globalThis.removeEventListener?.('blur',cancelDrag);frame.removeEventListener('click',click);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);clear();gl?.dispose();frame.remove();}};
}
