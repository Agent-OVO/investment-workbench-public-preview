import {shadeSurface,cameraEye,SHADING_GLSL} from './scene-shading.js';
import {buildSceneGeometry, geometryStatistics, OBJECT_IDS, rotateVector} from './scene-geometry.js';

const presets={default:{yaw:-.22,pitch:.29},left:{yaw:-.62,pitch:.26},right:{yaw:.62,pitch:.26},top:{yaw:-.12,pitch:.72}};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const unit=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)};
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const IDENTITY_CAMERA={yaw:0,pitch:0,zoom:1,mode:'spatial'};
export function cameraPoint(p,camera=IDENTITY_CAMERA){
  return rotateVector([p[0],p[1]-.18,p[2]],[0,camera.mode==='flat'?0:camera.yaw,0]).map((v,i,arr)=>i===0?v:i===1?arr[1]*Math.cos(camera.mode==='flat'?0:camera.pitch)-arr[2]*Math.sin(camera.mode==='flat'?0:camera.pitch):arr[1]*Math.sin(camera.mode==='flat'?0:camera.pitch)+arr[2]*Math.cos(camera.mode==='flat'?0:camera.pitch));
}
export function projectPoint(p,camera,width,height){
  const q=cameraPoint(p,camera),distance=6.2/(camera.zoom||1),depth=distance-q[2];
  const focal=Math.min(height*1.70,width*1.06)*(camera.fitScale||1);
  const k=camera.mode==='flat'?focal/distance:focal/depth;
  return {x:width/2+q[0]*k,y:height/2+(camera.offsetY||0)-q[1]*k,depth,scale:k,visible:depth>.1};
}
export function fitCamera(scene,camera,width,height){
  const base={...camera,fitScale:1,offsetY:0};
  const points=scene.parts.flatMap(p=>p.vertices.map(v=>projectPoint(v,base,width,height)));
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
  const margin=Math.min(23,width*.055,height*.055);
  const fitScale=Math.min(1,(width-2*margin)/(maxX-minX),(height-2*margin)/(maxY-minY));
  return {fitScale,offsetY:-((minY+maxY)/2-height/2)*fitScale};
}
function triangleNormal(a,b,c){return unit(cross(sub(b,a),sub(c,a)))}
function cssRGB(c,a=1){return `rgba(${c.map(v=>Math.round(clamp(v,0,1)*255)).join(',')},${a})`}
function pointInTriangle(p,a,b,c){
  const s=(p,a,b)=>(p.x-b.x)*(a.y-b.y)-(a.x-b.x)*(p.y-b.y);
  const x=s(p,a,b),y=s(p,b,c),z=s(p,c,a);return !((x<0||y<0||z<0)&&(x>0||y>0||z>0));
}

/** Small actual WebGL renderer. It never changes browser/GPU flags. */
function makeGLRenderer(scene,onLoss){
  const surface=document.createElement('canvas');
  let gl;try {gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});}catch{return null}
  if(!gl)return null;
  const vs=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;attribute float aOwner;attribute float aAlpha;attribute vec2 aSurface;attribute vec3 aCenter;
  uniform float uYaw,uPitch,uDistance,uFocal,uWidth,uHeight,uSelected,uFlat,uOffsetY;
  varying vec3 vColor;varying float vAlpha;
  ${SHADING_GLSL}
  void main(){vec3 p=aPosition;if(aOwner==uSelected)p.z+=0.055;
  float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);p.y-=0.18;
  vec3 q=vec3(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);q=vec3(q.x,cp*q.y-sp*q.z,sp*q.y+cp*q.z);
  float d=uDistance-q.z;float den=mix(d,uDistance,uFlat);
  // Standard perspective clip depth preserves the same nearest-surface order
  // as software reciprocal-distance rasterization and mesh picking.
  float perspectiveZ=(12.2/12.0)*d-(2.0*12.1*0.1/12.0);
  float flatZ=((2.0*d-12.2)/12.0)*uDistance;
  gl_Position=vec4(q.x*uFocal*2.0/uWidth,q.y*uFocal*2.0/uHeight-uOffsetY*2.0/uHeight*den,mix(perspectiveZ,flatZ,uFlat),den);
  vec3 eye=vec3(-sy*cp*uDistance,sp*uDistance+0.18,cy*cp*uDistance);
  vec3 center=aCenter;if(aOwner==uSelected)center.z+=0.055;
  vColor=shadeSurface(aColor,aNormal,center,eye,aSurface.x,aSurface.y);
  if(aOwner==uSelected)vColor=mix(vColor,vec3(0.72,0.89,0.81),0.12);
  vAlpha=aAlpha;}`;
  const fs=`precision mediump float;varying vec3 vColor;varying float vAlpha;void main(){gl_FragColor=vec4(vColor,vAlpha);}`;
  const compile=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error('Scene shader compilation failed');return sh;};
  let program,buffer,shaders=[];
  try{program=gl.createProgram();shaders.push(compile(gl.VERTEX_SHADER,vs));shaders.push(compile(gl.FRAGMENT_SHADER,fs));shaders.forEach(s=>gl.attachShader(program,s));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Scene shader link failed');}
  catch{if(program)gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));return null}
  const opaque=[],transparent=[];
  for(const part of scene.parts){
    const m=scene.materials[part.material],target=m.alpha?transparent:opaque;
    for(const t of part.triangles){const v=t.map(i=>part.vertices[i]),normal=triangleNormal(...v);const center=v[0].map((x,i)=>(x+v[1][i]+v[2][i])/3);for(const p of v)target.push(...p,...normal,...m.color,OBJECT_IDS.indexOf(part.objectId)+1,m.alpha||1,m.roughness??.7,m.specular??.04,...center);}
  }
  const data=new Float32Array([...opaque,...transparent]);
  gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  const stride=16*4;
  for(const [name,size,offset] of [['aPosition',3,0],['aNormal',3,3],['aColor',3,6],['aOwner',1,9],['aAlpha',1,10],['aSurface',2,11],['aCenter',3,13]]){
    const l=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,size,gl.FLOAT,false,stride,offset*4);
  }
  const uniforms=Object.fromEntries(['Yaw','Pitch','Distance','Focal','Width','Height','Selected','Flat','OffsetY'].map(k=>[k,gl.getUniformLocation(program,`u${k}`)]));
  let lost=false;
  const loss=e=>{e.preventDefault();lost=true;onLoss();};surface.addEventListener('webglcontextlost',loss);
  return {
    name:'WebGL · 真实三角网格',
    draw(ctx,width,height,dpr,camera,selected){
      if(lost||gl.isContextLost())return false;
      if(surface.width!==Math.round(width*dpr)||surface.height!==Math.round(height*dpr)){surface.width=Math.round(width*dpr);surface.height=Math.round(height*dpr);}
      gl.viewport(0,0,surface.width,surface.height);gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.disable(gl.BLEND);gl.useProgram(program);
      const values={Yaw:camera.mode==='flat'?0:camera.yaw,Pitch:camera.mode==='flat'?0:camera.pitch,Distance:6.2/camera.zoom,Focal:Math.min(height*1.70,width*1.06)*(camera.fitScale||1),Width:width,Height:height,Selected:OBJECT_IDS.indexOf(selected)+1,Flat:camera.mode==='flat'?1:0,OffsetY:camera.offsetY||0};
      for(const [k,v]of Object.entries(values))gl.uniform1f(uniforms[k],v);
      gl.drawArrays(gl.TRIANGLES,0,opaque.length/16);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,opaque.length/16,transparent.length/16);gl.depthMask(true);
      ctx.drawImage(surface,0,0,width,height);return true;
    },
    destroy(){surface.removeEventListener('webglcontextlost',loss);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));const ext=gl.getExtension('WEBGL_lose_context');if(ext)ext.loseContext();surface.width=surface.height=1;},
    info(){return {api:'WebGL 1',renderer:gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION)}}
  };
}

export function createScene({canvas,labels,onSelect=()=>{},onStatus=()=>{}}={}) {
  if(!canvas||!labels)throw new TypeError('createScene requires canvas and labels elements.');
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx){onStatus('绘图不可用，请使用同对象的平面操作。');return {select(){},setMotion(){},setView(){},setCamera(){},resize(){},destroy(){},stats(){return {renderer:'unavailable'}}};}
  const scene=buildSceneGeometry(),counts=geometryStatistics(scene),camera={...presets.default,zoom:1,mode:'spatial'};
  let selected='judgment',paused=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false,width=0,height=0,dpr=1,frame=0,destroyed=false,projected=[],drag=null,animation=null,drawCount=0,drawMs=0;
  let usingSoftware=true;
  let glRenderer=null,rendererName='软件几何 · 真实三角网格';
  const originalLabelClass=labels.className;labels.classList.add('research-scene-labels');
  const originalTabindex=canvas.getAttribute('tabindex'),originalRole=canvas.getAttribute('role'),originalAria=canvas.getAttribute('aria-label');
  canvas.classList.add('research-scene-canvas');canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','三维研究板。拖动旋转，方向键调整视角；五个文字按钮可直接选择相同研究对象。');
  const buttons=new Map();
  for(const o of scene.objects){const b=document.createElement('button');b.type='button';b.className=`scene-object-label scene-object-label--${o.id}`;b.dataset.objectId=o.id;b.textContent=o.label;b.setAttribute('aria-label',`${o.role}：${o.label}`);b.setAttribute('aria-pressed',String(o.id===selected));b.addEventListener('click',()=>onSelect(o.id));labels.append(b);buttons.set(o.id,b);}
  function status(){onStatus(camera.mode==='flat'?'平面定位 · 同对象选择':rendererName);}
  function requestDraw(){if(!destroyed&&!frame)frame=requestAnimationFrame(render);}
  glRenderer=makeGLRenderer(scene,()=>{usingSoftware=true;rendererName='软件几何 · WebGL已中断，研究选择保留';status();requestDraw();});
  if(glRenderer){rendererName=glRenderer.name;usingSoftware=false;}
  function allTriangles(){
    const triangles=[];
    for(const part of scene.parts){const shift=part.objectId===selected?.055:0;
      const verts=part.vertices.map(v=>[v[0],v[1],v[2]+shift]);
      for(const indices of part.triangles){const world=indices.map(i=>verts[i]),view=world.map(v=>cameraPoint(v,camera));
        const normal=triangleNormal(...world),normalView=triangleNormal(...view),center=view[0].map((v,i)=>(v+view[1][i]+view[2][i])/3);
        if(dot(normalView,[-center[0],-center[1],6.2/camera.zoom-center[2]])<=0)continue;
        const p=world.map(v=>projectPoint(v,camera,width,height));if(!p.every(v=>v.visible))continue;
        triangles.push({p,normal,position:world[0].map((v,i)=>(v+world[1][i]+world[2][i])/3),depth:p.reduce((s,v)=>s+v.depth,0)/3,objectId:part.objectId,material:part.material,name:part.name});
      }
    }
    return triangles.sort((a,b)=>b.depth-a.depth);
  }
  function drawSoftware(){
    // Real per-pixel depth testing is essential here. Average-depth painter
    // sorting alone lets the rear shell overwrite a thin inset at side angles.
    ctx.save();ctx.setTransform(1,0,0,1,0,0);
    const rw=canvas.width,rh=canvas.height,image=ctx.getImageData(0,0,rw,rh),pixels=image.data;
    const depths=new Float32Array(rw*rh);depths.fill(Infinity);
    const opaque=projected.filter(t=>!scene.materials[t.material].alpha),glass=projected.filter(t=>scene.materials[t.material].alpha);
    const eye=cameraEye(camera);
    for(const t of [...opaque,...glass]){
      const m=scene.materials[t.material],alpha=m.alpha||1;
      const c=shadeSurface(m,t.normal,t.position,eye,t.objectId===selected);
      const rgb=c.map(v=>Math.round(clamp(v,0,1)*255));
      const [a,b,c2]=t.p.map(p=>({x:p.x*dpr,y:p.y*dpr,depth:p.depth}));
      const denominator=(b.y-c2.y)*(a.x-c2.x)+(c2.x-b.x)*(a.y-c2.y);
      if(Math.abs(denominator)<.00001)continue;
      const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c2.x))),maxX=Math.min(rw-1,Math.ceil(Math.max(a.x,b.x,c2.x)));
      const minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c2.y))),maxY=Math.min(rh-1,Math.ceil(Math.max(a.y,b.y,c2.y)));
      const dax=(b.y-c2.y)/denominator,day=(c2.x-b.x)/denominator,dbx=(c2.y-a.y)/denominator,dby=(a.x-c2.x)/denominator;
      const izA=1/a.depth,izB=1/b.depth,izC=1/c2.depth;
      for(let y=minY;y<=maxY;y++){
        let wa=dax*(minX+.5-c2.x)+day*(y+.5-c2.y),wb=dbx*(minX+.5-c2.x)+dby*(y+.5-c2.y);
        for(let x=minX;x<=maxX;x++,wa+=dax,wb+=dbx){
          const wc=1-wa-wb;if(wa<-.00001||wb<-.00001||wc<-.00001)continue;
          const depth=camera.mode==='flat'?wa*a.depth+wb*b.depth+wc*c2.depth:1/(wa*izA+wb*izB+wc*izC),index=y*rw+x;
          if(depth>depths[index]+.00001)continue;
          const pi=index*4;
          if(alpha===1){depths[index]=depth;pixels[pi]=rgb[0];pixels[pi+1]=rgb[1];pixels[pi+2]=rgb[2];}
          else {pixels[pi]=rgb[0]*alpha+pixels[pi]*(1-alpha);pixels[pi+1]=rgb[1]*alpha+pixels[pi+1]*(1-alpha);pixels[pi+2]=rgb[2]*alpha+pixels[pi+2]*(1-alpha);}
          pixels[pi+3]=255;
        }
      }
    }
    ctx.putImageData(image,0,0);ctx.restore();
  }
  function placeLabels(){
    const occupied=[];
    // Selected object is laid out first; collision avoidance never changes identity.
    const ordered=[...scene.objects].sort((a,b)=>(b.id===selected)-(a.id===selected));
    for(const o of ordered){const b=buttons.get(o.id),anchor=[...o.labelAnchor];if(o.id===selected)anchor[2]+=.055;
      const p=projectPoint(anchor,camera,width,height),bw=b.offsetWidth||92,bh=b.offsetHeight||30;
      let x=clamp(p.x,bw/2+8,width-bw/2-8),y=clamp(p.y,bh/2+8,height-bh/2-8);
      for(let attempt=0;attempt<5&&occupied.some(r=>Math.abs(r.x-x)<(r.w+bw)/2+5&&Math.abs(r.y-y)<(r.h+bh)/2+4);attempt++)y=clamp(y+(attempt%2===0?1:-1)*(bh+6)*(Math.floor(attempt/2)+1),bh/2+8,height-bh/2-8);
      occupied.push({x,y,w:bw,h:bh});b.style.left=`${x}px`;b.style.top=`${y}px`;b.style.setProperty('--label-depth',String(Math.round(100-p.depth)));b.classList.toggle('is-selected',o.id===selected);b.setAttribute('aria-pressed',String(o.id===selected));
      // Always-visible labels are explicit overlay selectors, not occluded text planes.
      b.hidden=!p.visible;b.disabled=!p.visible;
      if(Math.hypot(x-p.x,y-p.y)>12){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(x,y);ctx.strokeStyle=o.id===selected?'#b9dcd3':'#577477';ctx.lineWidth=1;ctx.stroke();}
    }
  }
  function render(now){
    frame=0;if(destroyed||!width||!height)return;
    const begin=performance.now();
    if(animation){const t=clamp((now-animation.start)/220,0,1),e=1-(1-t)**3;camera.yaw=animation.from.yaw+(animation.to.yaw-animation.from.yaw)*e;camera.pitch=animation.from.pitch+(animation.to.pitch-animation.from.pitch)*e;if(t===1)animation=null;else requestDraw();}
    Object.assign(camera,fitCamera(scene,camera,width,height));
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#10282d';ctx.fillRect(0,0,width,height);
    const bg=ctx.createRadialGradient(width*.46,height*.33,0,width*.5,height*.42,Math.max(width,height)*.62);bg.addColorStop(0,'#244449');bg.addColorStop(.58,'#163238');bg.addColorStop(1,'#10272d');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
    // Restrained contact shadow only; all visible structures remain triangulated.
    const shadow=projectPoint([0,-1.06,.05],camera,width,height);ctx.save();ctx.translate(shadow.x,shadow.y);ctx.scale(1,.13);const g=ctx.createRadialGradient(0,0,5,0,0,Math.min(width*.37,height*.65));g.addColorStop(0,'rgba(0,0,0,.27)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,Math.min(width*.37,height*.65),0,Math.PI*2);ctx.fill();ctx.restore();
    projected=allTriangles();
    if(!glRenderer||!glRenderer.draw(ctx,width,height,dpr,camera,selected)){if(!usingSoftware){usingSoftware=true;rendererName='软件几何 · WebGL不可用，研究选择保留';status();}drawSoftware();}
    placeLabels();drawCount++;drawMs=performance.now()-begin;
  }
  function resize(){
    const rect=canvas.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);dpr=Math.min(Math.max(window.devicePixelRatio||1,1.5),2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);requestDraw();
  }
  function pointerDown(e){if(e.button!==0)return;animation=null;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:camera.yaw,pitch:camera.pitch,moved:false,touch:e.pointerType==='touch'};if(!drag.touch)canvas.setPointerCapture?.(e.pointerId);}
  function pointerMove(e){
    if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    // Touch keeps native vertical page scrolling. Only a predominantly horizontal
    // gesture changes yaw; vertical touch movement never locks the document.
    if(drag.touch&&Math.abs(dy)>Math.abs(dx)*1.1){drag=null;return;}
    if(Math.hypot(dx,dy)>5)drag.moved=true;if(!drag.moved)return;
    camera.yaw=clamp(drag.yaw+dx*.006,-1.05,1.05);if(!drag.touch)camera.pitch=clamp(drag.pitch+dy*.004,.06,.85);requestDraw();
  }
  function pointerUp(e){if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(moved)return;
    const r=canvas.getBoundingClientRect(),p={x:e.clientX-r.left,y:e.clientY-r.top};
    // Pick the nearest surface at this pixel, not a panel's bounding box or
    // average triangle depth. The hit uses the exact projected mesh vertices.
    let nearest=null,nearestDepth=Infinity;
    for(const t of projected){if(!pointInTriangle(p,...t.p))continue;
      const [a,b,c]=t.p,den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-8)continue;
      const wa=((b.y-c.y)*(p.x-c.x)+(c.x-b.x)*(p.y-c.y))/den,wb=((c.y-a.y)*(p.x-c.x)+(a.x-c.x)*(p.y-c.y))/den,wc=1-wa-wb;
      const depth=camera.mode==='flat'?wa*a.depth+wb*b.depth+wc*c.depth:1/(wa/a.depth+wb/b.depth+wc/c.depth);
      if(depth<nearestDepth){nearestDepth=depth;nearest=t;}
    }
    if(nearest?.objectId)onSelect(nearest.objectId);
  }
  function cancelPointer(){drag=null;}
  function keydown(e){const actions={ArrowLeft:()=>camera.yaw-=.10,ArrowRight:()=>camera.yaw+=.10,ArrowUp:()=>camera.pitch+=.07,ArrowDown:()=>camera.pitch-=.07,'+':()=>camera.zoom+=.08,'=':()=>camera.zoom+=.08,'-':()=>camera.zoom-=.08};if(e.key==='Home'){e.preventDefault();setCamera('default');return;}if(actions[e.key]){e.preventDefault();animation=null;actions[e.key]();camera.yaw=clamp(camera.yaw,-1.05,1.05);camera.pitch=clamp(camera.pitch,.06,.85);camera.zoom=clamp(camera.zoom,.80,1.08);requestDraw();}}
  function setCamera(preset){const to=presets[preset]||presets.default;if(paused){Object.assign(camera,to);animation=null;}else animation={from:{yaw:camera.yaw,pitch:camera.pitch},to,start:performance.now()};requestDraw();}
  const listeners=[['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',cancelPointer],['keydown',keydown]];listeners.forEach(([type,fn])=>canvas.addEventListener(type,fn));
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(canvas);if(!observer)window.addEventListener('resize',resize);
  resize();status();
  return {
    select(id){if(!OBJECT_IDS.includes(id))return;selected=id;requestDraw();},
    setMotion(value){paused=!!value;if(paused&&animation){Object.assign(camera,animation.to);animation=null;}labels.classList.toggle('motion-paused',paused);requestDraw();},
    setView(mode){camera.mode=mode==='flat'?'flat':'spatial';animation=null;status();requestDraw();},
    setCamera,resize,
    destroy(){destroyed=true;if(frame)cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',resize);listeners.forEach(([type,fn])=>canvas.removeEventListener(type,fn));glRenderer?.destroy();buttons.forEach(b=>b.remove());labels.className=originalLabelClass;canvas.classList.remove('research-scene-canvas');for(const [attr,val]of [['tabindex',originalTabindex],['role',originalRole],['aria-label',originalAria]])if(val===null)canvas.removeAttribute(attr);else canvas.setAttribute(attr,val);projected=[];},
    stats(){return {...counts,renderer:rendererName,backend:usingSoftware?{api:'Canvas2D depth-buffered mesh projection'}:glRenderer.info(),viewport:{width,height,dpr},selected,mode:camera.mode,paused,camera:{...camera},drawCount,lastDrawMs:Number(drawMs.toFixed(2)),automaticRotation:false,softwareFallback:true,shading:'stylized diffuse + roughness-controlled facet highlights; not PBR'};}
  };
}
