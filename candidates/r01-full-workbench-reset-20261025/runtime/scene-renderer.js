import {buildScene,projectPoint,cameraMatrix,pickScene,faceColor,cornerNormal} from './scene-model.js';

/** CPU reference renderer with a real per-pixel depth buffer. Exported for honest
 * software previews; it does not establish GPU, shader-driver, PBR or frame-rate QA. */
export function rasterizeScene(scene,{width=scene.width,height=scene.height,selectedId=null,highlight=1}={}){
  width=Math.max(1,Math.round(width));height=Math.max(1,Math.round(height));
  const pixels=new Uint8ClampedArray(width*height*4),depth=new Float32Array(width*height);depth.fill(-Infinity);
  const sx=width/scene.width,sy=height/scene.height;
  const masks=(scene.clipReadingZones?scene.readingZones:[]).map(r=>({x:r.x*sx,y:r.y*sy,right:(r.x+r.width)*sx,bottom:(r.y+r.height)*sy}));
  let visiblePixels=0;
  for(const mesh of scene.meshes){
    const points=mesh.vertices.map(p=>{const v=projectPoint(p,scene.camera);return {x:v.x*sx,y:v.y*sy,z:v.depth};});
    for(let ti=0;ti<mesh.triangles.length;ti++){
      const [a,b,c]=mesh.triangles[ti].map(i=>points[i]);
      const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-8)continue;
      const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(width-1,Math.ceil(Math.max(a.x,b.x,c.x)));
      const minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(height-1,Math.ceil(Math.max(a.y,b.y,c.y)));
      const rgb=[0,1,2].map(corner=>faceColor(mesh,cornerNormal(mesh,ti,corner),selectedId,highlight,ti).map(v=>v*255));
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        const px=x+.5,py=y+.5;
        if(masks.some(r=>px>=r.x&&px<=r.right&&py>=r.y&&py<=r.bottom))continue;
        const u=((b.y-c.y)*(px-c.x)+(c.x-b.x)*(py-c.y))/den,v=((c.y-a.y)*(px-c.x)+(a.x-c.x)*(py-c.y))/den,w=1-u-v;
        if(u<0||v<0||w<0)continue;
        const z=u*a.z+v*b.z+w*c.z,index=y*width+x;if(z<=depth[index])continue;
        if(depth[index]===-Infinity)visiblePixels++;depth[index]=z;
        const at=index*4;for(let channel=0;channel<3;channel++)pixels[at+channel]=Math.round(u*rgb[0][channel]+v*rgb[1][channel]+w*rgb[2][channel]);pixels[at+3]=255;
      }
    }
  }
  return {width,height,pixels,depth,visiblePixels,renderer:'cpu-depth-buffer',geometry:scene.schema};
}

const VERTEX=`attribute vec3 a_position; attribute vec3 a_color; uniform mat4 u_camera; varying vec3 v_color; void main(){gl_Position=u_camera*vec4(a_position,1.0);v_color=a_color;}`;
const FRAGMENT=`precision mediump float; varying vec3 v_color; uniform vec2 u_viewport; uniform vec2 u_scene_size; uniform int u_mask_count; uniform vec4 u_masks[8]; void main(){vec2 p=vec2(gl_FragCoord.x/u_viewport.x,1.0-gl_FragCoord.y/u_viewport.y)*u_scene_size;for(int i=0;i<8;i++){if(i>=u_mask_count)break;vec4 r=u_masks[i];if(p.x>=r.x&&p.x<=r.z&&p.y>=r.y&&p.y<=r.w)discard;}gl_FragColor=vec4(v_color,1.0);}`;
function webglPath(canvas){
  // WebGL 1 deliberately targets the existing baseline without dependencies.
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});
  if(!gl)throw Error('WEBGL_CONTEXT_UNAVAILABLE');
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error('WEBGL_SHADER_COMPILE:'+message);}return s;}
  const vs=shader(gl.VERTEX_SHADER,VERTEX),fs=shader(gl.FRAGMENT_SHADER,FRAGMENT),program=gl.createProgram();
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const message=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw Error('WEBGL_LINK:'+message);}
  const buffer=gl.createBuffer(),position=gl.getAttribLocation(program,'a_position'),color=gl.getAttribLocation(program,'a_color'),camera=gl.getUniformLocation(program,'u_camera');
  const viewportUniform=gl.getUniformLocation(program,'u_viewport'),sizeUniform=gl.getUniformLocation(program,'u_scene_size'),maskCount=gl.getUniformLocation(program,'u_mask_count'),maskUniform=gl.getUniformLocation(program,'u_masks[0]');
  let disposed=false;
  return {kind:'webgl',gl,
    render(scene,state,width,height){
      if(disposed||gl.isContextLost())throw Error('WEBGL_CONTEXT_LOST');
      gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
      const values=[];for(const mesh of scene.meshes)for(let i=0;i<mesh.triangles.length;i++){
        for(let corner=0;corner<3;corner++){const vi=mesh.triangles[i][corner],rgb=faceColor(mesh,cornerNormal(mesh,i,corner),state.selectedId,state.highlight,i);values.push(...mesh.vertices[vi],...rgb);}
      }
      gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(color);gl.vertexAttribPointer(color,3,gl.FLOAT,false,24,12);
      const zones=scene.clipReadingZones?scene.readingZones:[],maskValues=new Float32Array(8*4);
      zones.forEach((r,i)=>maskValues.set([r.x,r.y,r.x+r.width,r.y+r.height],i*4));
      gl.uniform2f(viewportUniform,width,height);gl.uniform2f(sizeUniform,scene.width,scene.height);gl.uniform1i(maskCount,zones.length);gl.uniform4fv(maskUniform,maskValues);
      gl.uniformMatrix4fv(camera,false,cameraMatrix(scene.width,scene.height,scene.camera));gl.drawArrays(gl.TRIANGLES,0,values.length/6);
      const error=gl.getError();if(error!==gl.NO_ERROR)throw Error('WEBGL_DRAW_'+error);
    },
    dispose(releaseContext=false){if(disposed)return;disposed=true;if(!gl.isContextLost()){gl.deleteBuffer(buffer);gl.deleteProgram(program);if(releaseContext)gl.getExtension('WEBGL_lose_context')?.loseContext();}}
  };
}

function cpuPath(canvas){const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw Error('CPU_CANVAS_UNAVAILABLE');return {kind:'cpu',render(scene,state,width,height){const frame=rasterizeScene(scene,{width,height,selectedId:state.selectedId,highlight:state.highlight});const img=ctx.createImageData(width,height);img.data.set(frame.pixels);ctx.putImageData(img,0,0);},dispose(){}};}

/** Both adapters receive precisely the same scene meshes. Only material rasterization
 * differs. Controller never owns financial data or route state. */
export function createSceneRenderer({canvas,onSelect=()=>{},onStatus=()=>{}}={}){
  if(!canvas?.getContext)throw new TypeError('Scene renderer requires a canvas');
  const win=canvas.ownerDocument?.defaultView||globalThis;
  let drawCanvas=canvas,path=null,scene=null,disposed=false,frameHandle=0,frames=0,lastFrame=0,transition=null;
  let fallbackCanvas=null,observer=null,lastFailure=null,contextLost=false;
  const state={selectedId:null,paused:false,visible:true,highlight:1};
  const now=()=>win.performance?.now?.()||Date.now();
  const request=fn=>win.requestAnimationFrame?win.requestAnimationFrame(fn):win.setTimeout(()=>fn(now()),16);
  const cancel=()=>{if(frameHandle){if(win.cancelAnimationFrame)win.cancelAnimationFrame(frameHandle);else win.clearTimeout(frameHandle);frameHandle=0;}};
  function status(emit=true){const info={requested:'webgl',effective:path?.kind||'unavailable',contextLost,error:lastFailure,
    label:path?.kind==='webgl'?'实时 WebGL · 几何与 CPU 共源 · 本环境视觉验收另记':path?.kind==='cpu'?'软件三维预览 · CPU 深度缓冲 · 非 GPU 验收':'空间渲染不可用 · 正文仍可阅读',
    shader:'shared-ceramic-v1',pbr:false,gpuVisualAcceptance:false};if(emit)onStatus(info);return info;}
  function cpuFallback(error){
    path?.dispose();lastFailure=String(error?.message||error);path=null;
    // Once a canvas has a WebGL context it cannot become a 2D canvas. Keep the
    // original event surface; a sibling is the explicit rendering fallback.
    try{path=cpuPath(canvas);drawCanvas=canvas;}catch{
      const doc=canvas.ownerDocument;if(!doc?.createElement)throw Error('CPU_FALLBACK_CANVAS_UNAVAILABLE');
      if(!fallbackCanvas){fallbackCanvas=doc.createElement('canvas');fallbackCanvas.className=canvas.className;fallbackCanvas.setAttribute('aria-hidden','true');fallbackCanvas.dataset.rendererFallback='cpu';
        fallbackCanvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';canvas.parentNode?.insertBefore(fallbackCanvas,canvas.nextSibling);}
      path=cpuPath(fallbackCanvas);drawCanvas=fallbackCanvas;
    }
    status();
  }
  try{path=webglPath(canvas);}catch(error){cpuFallback(error);}
  status();
  function dimensions(){
    const rect=canvas.getBoundingClientRect?.()||{width:scene?.width||1,height:scene?.height||1};
    const cssWidth=Math.max(1,rect.width||scene?.width||1),cssHeight=Math.max(1,rect.height||scene?.height||1);
    // CPU frames are deliberately capped, not passed off as native GPU output.
    const dpr=path?.kind==='webgl'?Math.min(2,win.devicePixelRatio||1):Math.min(1,1200/cssWidth);
    return {cssWidth,cssHeight,width:Math.max(1,Math.round(cssWidth*dpr)),height:Math.max(1,Math.round(cssHeight*dpr)),dpr};
  }
  function render(t=now()){
    frameHandle=0;if(disposed||!scene||!state.visible)return;
    if(transition&&!state.paused){const p=Math.min(1,Math.max(0,(t-transition.start)/180));state.highlight=p;if(p===1)transition=null;}
    else {state.highlight=1;transition=null;}
    const d=dimensions();if(drawCanvas.width!==d.width)drawCanvas.width=d.width;if(drawCanvas.height!==d.height)drawCanvas.height=d.height;
    try{path?.render(scene,state,d.width,d.height);}catch(error){if(path?.kind==='webgl'){cpuFallback(error);return render(t);}throw error;}
    frames++;lastFrame=t;
    if(transition)frameHandle=request(next=>{if(path?.kind==='cpu'&&next-lastFrame<48){frameHandle=request(render);}else render(next);});
  }
  function schedule(){cancel();if(!disposed&&scene&&state.visible)frameHandle=request(render);}
  const click=event=>{if(!scene||disposed)return;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;const x=(event.clientX-rect.left)*scene.width/rect.width,y=(event.clientY-rect.top)*scene.height/rect.height;
    const hit=pickScene(scene,x,y);if(hit)onSelect(hit.id,hit);};
  const move=event=>{if(!scene)return;const rect=canvas.getBoundingClientRect();const hit=pickScene(scene,(event.clientX-rect.left)*scene.width/rect.width,(event.clientY-rect.top)*scene.height/rect.height);canvas.style.cursor=hit?'pointer':'';};
  const lost=event=>{event.preventDefault?.();contextLost=true;cpuFallback(Error('WEBGL_CONTEXT_LOST'));schedule();};
  const restored=()=>{if(disposed||!contextLost)return;try{const recovered=webglPath(canvas);path?.dispose();path=recovered;drawCanvas=canvas;fallbackCanvas?.remove();fallbackCanvas=null;contextLost=false;lastFailure=null;status();schedule();}catch(error){lastFailure=String(error.message||error);status();}};
  canvas.addEventListener?.('click',click);canvas.addEventListener?.('pointermove',move);canvas.addEventListener?.('webglcontextlost',lost);canvas.addEventListener?.('webglcontextrestored',restored);
  const Observer=win.ResizeObserver||globalThis.ResizeObserver;if(Observer){observer=new Observer(schedule);observer.observe(canvas);}else win.addEventListener?.('resize',schedule);
  return {
    setScene(spec){scene=spec?.schema&&spec.meshes?spec:buildScene(spec);transition=null;state.highlight=1;schedule();return scene;},
    setState(next={}){const previous=state.selectedId;
      if(Object.hasOwn(next,'selectedId'))state.selectedId=next.selectedId;
      if(typeof next.paused==='boolean')state.paused=next.paused;if(typeof next.visible==='boolean')state.visible=next.visible;
      transition=previous!==state.selectedId&&!state.paused&&state.visible?{start:now()}:null;schedule();},
    /** Move the same event/context canvas into a freshly rendered same-route
     * shell. No WebGL context, semantic scene or selection is reallocated. */
    reparentTo(placeholder){
      if(disposed)throw Error('SCENE_RENDERER_DISPOSED');
      if(!placeholder?.parentNode)throw new TypeError('Scene reparent requires an attached canvas placeholder');
      if(placeholder!==canvas){
        for(const name of ['id','class','aria-hidden','aria-label']){
          const value=placeholder.getAttribute?.(name);if(value!==null&&value!==undefined)canvas.setAttribute?.(name,value);
        }
        placeholder.parentNode.replaceChild(canvas,placeholder);
      }
      if(fallbackCanvas)canvas.parentNode.insertBefore(fallbackCanvas,canvas.nextSibling);
      canvas.style.cursor='';schedule();return canvas;
    },
    resize:schedule,
    renderNow(){cancel();render();},
    dispose(){if(disposed)return;disposed=true;cancel();observer?.disconnect();win.removeEventListener?.('resize',schedule);canvas.removeEventListener?.('click',click);canvas.removeEventListener?.('pointermove',move);canvas.removeEventListener?.('webglcontextlost',lost);canvas.removeEventListener?.('webglcontextrestored',restored);path?.dispose(true);fallbackCanvas?.remove();},
    diagnostics(){return {...status(false),schema:scene?.schema||null,meshes:scene?.meshes.length||0,triangles:scene?.triangles||0,frames,disposed,paused:state.paused,visible:state.visible,selectedId:state.selectedId,animating:!!transition,viewport:dimensions()};}
  };
}
