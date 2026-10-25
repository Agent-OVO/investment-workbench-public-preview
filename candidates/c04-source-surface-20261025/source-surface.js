/**
 * Two source documents, one disclosure field. Original procedural geometry.
 * The broad sheets encode period/provenance, NEVER money or evidence weight.
 * All data and controls are ordinary, screen-facing HTML supplied by app.js.
 * Canvas 2D renders projected triangle meshes with analytic surface normals;
 * this is an illustrative CPU path, not a claim of WebGL/PBR or physical paper.
 */
export const SOURCE_PERIODS = Object.freeze(['2025H1', '2026H1']);
export const SOURCE_IDS = Object.freeze(['H125', 'H126']);
export const SOURCE_PRODUCTS = Object.freeze(['dry-gas-seals', 'auxiliary-systems', 'repair']);
export const SOURCE_DURATION = 500;
const clamp = (n, a=0, b=1) => Math.max(a, Math.min(b, n));
const mix = (a, b, p) => a + (b-a)*p;
const smooth = t => t*t*(3-2*t);
const unit = a => { const length=Math.hypot(...a)||1; return a.map(v=>v/length); };
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub = (a,b) => a.map((v,i)=>v-b[i]);
const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);

/** One layout clock drives paper geometry, HTML row positions AND field height.
 * `height` records the observed host size for diagnostics, never rescales money.
 * Expanded read zones: desktop y60/250 ×160; narrow y60/310 ×190.
 */
export function getLayout(width, height, expanded=1) {
  width=Math.max(1,Number(width)||1);
  const progress=clamp(Number(expanded)), narrow=width<720;
  const finalHeight=narrow?560:460;
  const fieldHeight=mix(150,finalHeight,progress);
  const readX=narrow?30:70, right=narrow?12:35;
  const rowHeight=mix(26,narrow?190:160,progress);
  const periods=SOURCE_PERIODS.map((period,i)=>({
    period,sourceId:SOURCE_IDS[i],x:Math.min(readX,width*.25),
    y:mix(i?70:25,i?(narrow?310:250):60,progress),
    width:Math.max(1,width-readX-right),height:rowHeight,
  }));
  return {width,height:fieldHeight,observedHeight:Number(height)||0,progress,narrow,periods,
    columns:Object.fromEntries(SOURCE_PRODUCTS.map((id,i)=>[id,(periods[0].x+periods[0].width*(i+.5)/3)/width])),
    spineX:narrow?12:28};
}

/** Finite, interruptible animation with immediate pause/reduced-motion results. */
export class SourceSurfaceMotion {
  constructor({reduced=false}={}) {
    this.state={product:'repair',paused:false,mode:'spatial',visible:true,expanded:false,source:null,reduced};
    this.progress=0;this.transition=null;this.pulse=null;
  }
  sample(now=0) {
    if(this.transition){const t=clamp((now-this.transition.start)/SOURCE_DURATION);
      this.progress=mix(this.transition.from,this.transition.to,smooth(t));
      if(t===1)this.transition=null;
    }
    let pulse=0;
    if(this.pulse){const t=clamp((now-this.pulse.start)/SOURCE_DURATION);pulse=Math.sin(Math.PI*t);
      if(t===1){this.pulse=null;pulse=0;}
    }
    return {progress:this.progress,pulse,animating:!!(this.transition||this.pulse)};
  }
  update(next={},now=0) {
    this.sample(now);const before={...this.state};
    for(const key of ['product','source'])if(Object.hasOwn(next,key))this.state[key]=next[key];
    for(const key of ['paused','visible','expanded','reduced'])if(typeof next[key]==='boolean')this.state[key]=next[key];
    if(next.mode==='spatial'||next.mode==='flat')this.state.mode=next.mode;
    const target=+this.state.expanded;
    const motion=this.state.visible&&this.state.mode==='spatial'&&!this.state.paused&&!this.state.reduced;
    if(!motion){this.progress=target;this.transition=null;this.pulse=null;}
    else {
      if(before.expanded!==this.state.expanded)this.transition={from:this.progress,to:target,start:now};
      if(before.product!==this.state.product||before.source!==this.state.source)this.pulse={start:now};
    }
    return Object.keys(this.state).some(key=>this.state[key]!==before[key]);
  }
}

/** Surface point in an orthographic x/y/z system. Bending lives at the seam
 * and paper edges. The broad read field stays close to screen parallel.
 */
export function sourcePoint(layout,periodIndex,u,v,{pulse=0,product='repair'}={}) {
  const row=layout.periods[periodIndex],p=layout.progress;
  const left=layout.spineX+5,right=layout.width-(layout.narrow?5:12);
  const span=Math.max(1,right-left),x=left+u*span;
  const selected=Math.max(0,SOURCE_PRODUCTS.indexOf(product));
  const focus=layout.narrow?.5:(selected+.5)/3;
  const crease=Math.exp(-u*span/(layout.narrow?20:38));
  const outer=Math.exp(-(1-u)*span/24);
  const lift=(periodIndex?6:9)+(1-p)*13;
  const wave=Math.sin(v*Math.PI)*Math.sin(u*Math.PI)*1.2;
  const focusLift=pulse*2.5*Math.exp(-(((u-focus)/.15)**2))*Math.sin(v*Math.PI);
  const z=lift*crease-3.2*outer*Math.sin(v*Math.PI)+wave+focusLift;
  const y=row.y-19+v*(row.height+34)+Math.sin(v*Math.PI)*crease*6;
  return [x,y,z];
}
export const projectSourcePoint = p => ({x:p[0],y:p[1]-.42*p[2],z:p[2]});
function surfaceColor(normal,periodIndex,u,v) {
  const light=unit([-.35,-.45,1]),n=normal[2]<0?normal.map(v=>-v):normal;
  const diffuse=Math.max(0,dot(n,light));
  // White/ivory read faces remain bright; only curved geometry takes shading.
  const base=periodIndex?[.947,.954,.917]:[.978,.970,.936];
  const lighting=.90+.10*diffuse,grain=.002*Math.sin(u*7+v*3);
  return base.map(value=>Math.round(255*clamp(value*lighting+grain)));
}

/** The same numeric mesh is used by runtime and tests; no static image asset. */
export function sourceSurfaceMesh(layout,{pulse=0,product='repair'}={}) {
  const sheets=[];
  for(let periodIndex=0;periodIndex<2;periodIndex++) {
    const columns=40,rows=10,vertices=[],triangles=[];
    for(let iy=0;iy<=rows;iy++)for(let ix=0;ix<=columns;ix++)
      vertices.push(sourcePoint(layout,periodIndex,ix/columns,iy/rows,{pulse,product}));
    const stride=columns+1;
    for(let iy=0;iy<rows;iy++)for(let ix=0;ix<columns;ix++) {
      const a=iy*stride+ix,b=a+1,c=a+stride,d=c+1;
      for(const indices of [[a,b,c],[b,d,c]]) {
        const points=indices.map(i=>vertices[i]);
        const normal=unit(cross(sub(points[1],points[0]),sub(points[2],points[0])));
        triangles.push({indices,normal,color:surfaceColor(normal,periodIndex,(ix+.5)/columns,(iy+.5)/rows)});
      }
    }
    sheets.push({period:SOURCE_PERIODS[periodIndex],sourceId:SOURCE_IDS[periodIndex],vertices,triangles});
  }
  return sheets;
}

function draw(ctx,layout,mesh) {
  ctx.clearRect(0,0,layout.width,layout.height);
  // A fine continuous seam makes both periods one provenance field. No frame.
  ctx.beginPath();ctx.moveTo(layout.spineX,10);
  ctx.bezierCurveTo(layout.spineX-7,layout.height*.30,layout.spineX+6,layout.height*.70,layout.spineX,layout.height-20);
  ctx.strokeStyle='rgba(99,124,105,.26)';ctx.lineWidth=1;ctx.stroke();
  for(let si=0;si<mesh.length;si++) {
    const sheet=mesh[si],points=sheet.vertices.map(projectSourcePoint);
    // A small cast/contact shadow follows only the lower free paper edge.
    const last=points.slice(-41);ctx.beginPath();ctx.moveTo(last[0].x,last[0].y+3);
    for(const point of last.slice(1))ctx.lineTo(point.x,point.y+3);
    ctx.strokeStyle='rgba(57,77,61,.10)';ctx.lineWidth=3;ctx.stroke();
    for(const tri of sheet.triangles) {
      const p=tri.indices.map(i=>points[i]);ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
      ctx.lineTo(p[1].x,p[1].y);ctx.lineTo(p[2].x,p[2].y);ctx.closePath();
      ctx.fillStyle=`rgb(${tri.color.join(',')})`;ctx.fill();
      // Same-color hairline closes subpixel triangle seams, never a sheet rim.
      ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.45;ctx.stroke();
    }
    // The exposed thin edge is an open arc, not a heavy enclosing box.
    ctx.beginPath();ctx.moveTo(last[0].x,last[0].y);
    for(const point of last.slice(1))ctx.lineTo(point.x,point.y);
    ctx.strokeStyle=si?'rgba(90,114,94,.24)':'rgba(118,117,94,.24)';ctx.lineWidth=.6;ctx.stroke();
  }
}

/** Public controller. Parent owns HTML, route/state, selection and source links. */
export function createSourceSurface({canvas,host=canvas?.parentElement,onStatus=()=>{},onProjection=()=>{}}={}) {
  if(!canvas||!host)throw new TypeError('Source surface needs canvas and host');
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)throw new Error('Source surface Canvas 2D context unavailable');
  const view=canvas.ownerDocument?.defaultView||globalThis;
  const query=view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const motion=new SourceSurfaceMotion({reduced:!!query?.matches});
  const clock=()=>view.performance?.now?.()||0;
  let raf=0,destroyed=false,frames=0,lastWidth=0,lastHeight=0,lastLayout=null;
  const cancel=()=>{if(raf)view.cancelAnimationFrame(raf);raf=0;};
  function publish(layout) {
    host.dataset.sourceReadable=String(layout.progress>=.82);
    const vars={'--source-height':`${layout.height}px`,'--source-progress':String(layout.progress),
      '--source-read-x':`${layout.periods[0].x}px`,'--source-read-width':`${layout.periods[0].width}px`,
      '--source-row-height':`${layout.periods[0].height}px`,
      '--source-2025-y':`${layout.periods[0].y}px`,'--source-2026-y':`${layout.periods[1].y}px`};
    for(const [key,value]of Object.entries(vars))host.style.setProperty(key,value);
  }
  function render(now=clock()) {
    raf=0;if(destroyed)return;
    const sample=motion.sample(now),rect=host.getBoundingClientRect();
    const width=rect.width||host.clientWidth||lastWidth||1;
    const layout=getLayout(width,rect.height,sample.progress);lastLayout=layout;publish(layout);
    lastWidth=width;lastHeight=layout.height;
    onProjection({columns:layout.columns,mobile:layout.narrow});
    if(!motion.state.visible||motion.state.mode!=='spatial')return;
    const dpr=Math.min(2,view.devicePixelRatio||1);
    const rw=Math.max(1,Math.round(layout.width*dpr)),rh=Math.max(1,Math.round(layout.height*dpr));
    if(canvas.width!==rw||canvas.height!==rh){canvas.width=rw;canvas.height=rh;}
    ctx.setTransform(dpr,0,0,dpr,0,0);
    draw(ctx,layout,sourceSurfaceMesh(layout,{pulse:sample.pulse,product:motion.state.product}));
    frames++;
    if(sample.animating)raf=view.requestAnimationFrame(render);
  }
  function resize(){if(!destroyed){cancel();render();}}
  const Observer=view.ResizeObserver||globalThis.ResizeObserver;
  const observer=Observer?new Observer(()=>{const width=host.getBoundingClientRect().width;
    if(Math.abs(width-lastWidth)>.5)resize();}):null;
  observer?.observe(host);
  const reducedChange=event=>{motion.update({reduced:event.matches},clock());resize();};
  query?.addEventListener?.('change',reducedChange);
  if(!observer)view.addEventListener?.('resize',resize);
  onStatus('连续披露纸面 · CPU 投影几何，非 GPU 材质');render();
  return {
    setState(next={}){if(destroyed)return;const changed=motion.update(next,clock());
      if(changed){cancel();render();}},
    resize,destroy(){destroyed=true;cancel();observer?.disconnect();query?.removeEventListener?.('change',reducedChange);
      if(!observer)view.removeEventListener?.('resize',resize);},
    stats(){return {renderer:'cpu-projected-source-mesh',sheets:2,triangles:1600,frames,
      animating:!!(motion.transition||motion.pulse),width:lastWidth,height:lastHeight,
      state:{...motion.state},layout:lastLayout};}
  };
}
