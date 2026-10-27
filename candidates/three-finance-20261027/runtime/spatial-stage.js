import * as THREE from '../vendor/three.module.js';
import {buildFinanceGeometry} from './finance-geometry.js';
import {formatPrice} from './demo-market.js';

const PALETTE={up:0xb54851,down:0x277f78,unchanged:0x626d7b,ink:0x223b52,grid:0xd9e1e6,
  select:0x2562ad,question:0x7189ba,industry:0x648d91,instrument:0x4477ac,claim:0x9a7baf,
  evidence:0x2f8a7a,counter:0xc17b50,condition:0x9b6777};
const V=(x,y,z=0)=>new THREE.Vector3(x,y,z);
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.34,metalness:.18,...extra});

/** One shared true-3D stage. Geometry is derived from raw data, not from rendered pixels. */
export class SpatialStage {
  constructor(host,{onSelect,onStatus,onCameraChange=()=>{}}){
    this.host=host;this.onSelect=onSelect;this.onCameraChange=onCameraChange;
    this.onStatus=onStatus;this.disposed=false;this.renderFrame=0;this.labels=[];this.selectables=[];
    this.resources=new Set();this.view='market';this.paused=false;this.reduced=false;this.transitionFrame=0;
    this.yaw=.28;this.pitch=0;this.zoom=1;this.target=V(0,10,0);
    this.canvas=document.createElement('canvas');this.canvas.className='spatial-canvas';
    this.canvas.setAttribute('aria-label','可旋转和缩放的三维图表，精确值也可用旁边的日期和记录控件读取');
    this.canvas.tabIndex=0;this.host.prepend(this.canvas);
    this.overlay=document.createElement('div');this.overlay.className='scene-labels';this.host.append(this.overlay);
    try{
      this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'default'});
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
      this.renderer.setClearColor(0xf4f7f9,1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
      this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
      this.scene=new THREE.Scene();this.root=new THREE.Group();this.scene.add(this.root);
      this.scene.add(new THREE.HemisphereLight(0xeaf4ff,0xaab3c2,2.3));
      const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(-35,60,70);this.scene.add(key);
      const rim=new THREE.DirectionalLight(0xc8e4fa,2);rim.position.set(50,5,-35);this.scene.add(rim);
      this.camera=new THREE.OrthographicCamera(-70,70,45,-45,.1,600);
      this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();
      this.bindInput();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
      this.onContextLost=e=>{e.preventDefault();this.available=false;this.cancelAnimation();this.overlay.replaceChildren();this.onStatus('lost');};
      this.onContextRestored=()=>{this.available=true;if(this.latestPayload)this.setData(this.latestPayload);else this.resize();this.onStatus('ready');};
      this.canvas.addEventListener('webglcontextlost',this.onContextLost);
      this.canvas.addEventListener('webglcontextrestored',this.onContextRestored);
      this.available=true;this.onStatus('ready');
    }catch(error){
      this.available=false;this.renderer?.dispose();this.canvas.hidden=true;
      this.onStatus('unavailable');
    }
    this.onVisibility=()=>{if(document.hidden)this.cancelAnimation();else this.requestRender();};
    document.addEventListener('visibilitychange',this.onVisibility);
  }
  track(value){this.resources.add(value);return value;}
  mesh(geometry,mat,selection){
    const mesh=new THREE.Mesh(this.track(geometry),this.track(mat));
    if(selection){mesh.userData.selection=selection;this.selectables.push(mesh);}
    this.root.add(mesh);return mesh;
  }
  line(points,color=PALETTE.grid,opacity=1){
    const geo=this.track(new THREE.BufferGeometry().setFromPoints(points));
    const mat=this.track(new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));
    const line=new THREE.Line(geo,mat);this.root.add(line);return line;
  }
  label(text,point,className='axis-label',selection=null){
    const el=document.createElement(selection?'button':'span');el.className=className;el.textContent=text;
    if(selection){el.type='button';el.dataset.objectId=selection.id;el.addEventListener('click',()=>this.onSelect(selection));}
    this.overlay.append(el);this.labels.push({el,point});return el;
  }
  clear(){
    this.cancelAnimation();this.root?.clear();this.selectables=[];this.labels=[];this.overlay.replaceChildren();
    for(const value of this.resources)value.dispose();this.resources.clear();
  }
  setData({view,candles,trades,research,selection,barId,paused,reducedMotion}){
    this.latestPayload={view,candles,trades,research,selection,barId,paused,reducedMotion};
    this.paused=paused;this.reduced=reducedMotion;
    if(!this.available)return;
    const changedView=this.view!==view;this.view=view;this.clear();
    if(changedView)this.reset(false);
    if(view==='market')this.buildMarket(candles,trades,selection,barId);else this.buildResearch(research,selection);
    this.resize();
  }
  buildMarket(candles,trades,selection,barId){
    const model=buildFinanceGeometry(candles);this.geometryModel=model;this.target.set(0,10,0);
    const xOf=x=>x-model.width/2;
    const backdrop=this.mesh(new THREE.PlaneGeometry(110,62),material(0xf7f9fa,{roughness:.95,metalness:0}));
    backdrop.position.set(0,11,-1.4);
    for(const tick of model.priceTicks){
      this.line([V(-50,tick.y,-.8),V(50,tick.y,-.8)]);
      this.label(formatPrice(tick.valueCents),V(-53,tick.y,0),'axis-label price-tick');
    }
    this.label('价格 · 元',V(-53,model.priceHeight+4),'axis-label axis-title');
    for(const tick of model.volumeTicks){
      this.line([V(-50,tick.y,-.8),V(50,tick.y,-.8)],PALETTE.grid,.65);
      this.label(tick.value.toLocaleString('zh-CN'),V(-53,tick.y),'axis-label price-tick volume-tick');
    }
    this.label('成交量 · 股',V(-53,-model.gap+3),'axis-label axis-title');
    this.line([V(-50,0),V(-50,38)],0x8796a5);
    this.line([V(-50,model.volumeBaseline),V(50,model.volumeBaseline)],0x8796a5);
    for(const index of [...new Set([0,Math.floor((candles.length-1)/2),candles.length-1])]){
      const row=model.rows[index];this.label(row.date.slice(5),V(xOf(row.x),model.volumeBaseline-3.5),'axis-label date-tick');
    }
    model.rows.forEach((row,index)=>{
      const candle=candles[index],selected=barId===candle.id,color=PALETTE[row.direction];
      const selectionId={kind:'bar',id:candle.id};
      // A cylinder has exact low/high endpoints; lighting and width do not alter price height.
      const wickHeight=row.highY-row.lowY;
      if(wickHeight>0){
        const wick=this.mesh(new THREE.CylinderGeometry(.075,.075,wickHeight,8),material(color),selectionId);
        wick.position.set(xOf(row.x),(row.highY+row.lowY)/2,.15);
      }
      const bodyHeight=row.bodyTop-row.bodyBottom;
      if(bodyHeight>0){
        const body=this.mesh(new THREE.BoxGeometry(row.bodyWidth,bodyHeight,.92),material(color),selectionId);
        body.position.set(xOf(row.x),(row.bodyTop+row.bodyBottom)/2,.12);
        if(selected){
          const outline=new THREE.LineSegments(this.track(new THREE.EdgesGeometry(body.geometry)),
            this.track(new THREE.LineBasicMaterial({color:PALETTE.select})));
          outline.position.copy(body.position);this.root.add(outline);
        }
      }else{
        // Doji: a zero-height open/close line, never a fake positive-height candle.
        this.line([V(xOf(row.x)-row.bodyWidth/2,row.openY,.62),V(xOf(row.x)+row.bodyWidth/2,row.openY,.62)],color);
      }
      const volumeHeight=row.volumeY-model.volumeBaseline;
      if(volumeHeight>0){
        const volume=this.mesh(new THREE.BoxGeometry(row.bodyWidth,volumeHeight,.92),material(color,{roughness:.55,metalness:.08}),selectionId);
        volume.position.set(xOf(row.x),(row.volumeY+model.volumeBaseline)/2,.12);
      }
      if(selected){
        this.line([V(xOf(row.x),model.volumeBaseline,-.4),V(xOf(row.x),model.priceHeight,-.4)],PALETTE.select,.75);
        this.label(candle.date,V(xOf(row.x),model.priceHeight+6),'axis-label selected-date');
      }
    });
    const byId=new Map(model.rows.map(x=>[x.id,x]));
    for(const trade of trades){
      const row=byId.get(trade.barId);if(!row)continue;
      const buy=trade.side==='buy',dy=buy?-1.7:1.7;
      const shape=new THREE.BufferGeometry();
      shape.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-1.05,dy,0,1.05,dy,0,0,0,.55,-1.05,dy,.55,1.05,dy,.55],3));
      shape.setIndex([0,1,2,3,5,4,0,3,4,0,4,1,1,4,5,1,5,2,2,5,3,2,3,0]);shape.computeVertexNormals();
      const marker=this.mesh(shape,material(buy?0x1b609b:0x9b6525,{side:THREE.DoubleSide}),{kind:'trade',id:trade.id});
      marker.position.set(xOf(row.x),model.priceY(trade.priceCents),1.4);
      const el=this.label(buy?'买':'卖',V(xOf(row.x),model.priceY(trade.priceCents)+dy+(buy?-1:1),2.1),
        'trade-marker'+(selection.id===trade.id?' is-selected':''),{kind:'trade',id:trade.id});
      el.setAttribute('aria-label',`${trade.date} ${buy?'买入':'卖出'} ${trade.quantity} 股，${formatPrice(trade.priceCents)} 元`);
    }
  }
  buildResearch(research,selection){
    this.target.set(0,2,0);const byId=new Map(research.nodes.map(n=>[n.id,n]));
    for(const edge of research.edges){
      const a=V(...byId.get(edge.from).position),b=V(...byId.get(edge.to).position);
      const direction=b.clone().sub(a).normalize();const end=b.clone().addScaledVector(direction,-3.8);
      this.line([a,end],edge.kind==='challenges'||edge.kind==='invalidates'?0xb6846d:0x9bacbb,.9);
      const arrow=this.mesh(new THREE.ConeGeometry(.55,1.6,8),material(0x8397a8));
      arrow.position.copy(end);arrow.quaternion.setFromUnitVectors(V(0,1,0),direction);
    }
    for(const node of research.nodes){
      const selected=node.id===selection.id,color=PALETTE[node.kind];
      let geometry=node.kind==='instrument'?new THREE.IcosahedronGeometry(4.5,1):new THREE.BoxGeometry(4.6,4.6,4.6);
      const body=this.mesh(geometry,material(color,{roughness:.28,metalness:.21}),{kind:'node',id:node.id});
      body.position.set(...node.position);if(node.kind!=='instrument')body.rotation.set(.08,.32,.05);
      if(selected){
        const outline=new THREE.LineSegments(this.track(new THREE.EdgesGeometry(geometry)),this.track(new THREE.LineBasicMaterial({color:0x173e72})));
        outline.position.copy(body.position);outline.rotation.copy(body.rotation);this.root.add(outline);
      }
      this.label(node.label,V(node.position[0],node.position[1]-5.5,node.position[2]),
        'node-label'+(selected?' is-selected':''),{kind:'node',id:node.id});
    }
  }
  resize(){
    if(!this.available||this.disposed)return;
    const {width,height}=this.host.getBoundingClientRect();if(!width||!height)return;
    this.width=width;this.height=height;this.renderer.setSize(width,height,false);
    const aspect=width/height;const worldHeight=Math.max(this.view==='market'?76:84,138/aspect);
    this.camera.left=-worldHeight*aspect/2;this.camera.right=worldHeight*aspect/2;
    this.camera.top=worldHeight/2;this.camera.bottom=-worldHeight/2;
    this.updateCamera();this.requestRender();
  }
  updateCamera(){
    if(!this.camera)return;const radius=180;
    this.camera.position.set(this.target.x+Math.sin(this.yaw)*Math.cos(this.pitch)*radius,
      this.target.y+Math.sin(this.pitch)*radius,this.target.z+Math.cos(this.yaw)*Math.cos(this.pitch)*radius);
    this.camera.lookAt(this.target);this.camera.zoom=this.zoom;this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }
  requestRender(){
    if(!this.available||this.disposed||document.hidden||this.renderFrame)return;
    this.renderFrame=requestAnimationFrame(()=>{this.renderFrame=0;this.render();});
  }
  render(){
    if(!this.available||this.disposed)return;this.renderer.render(this.scene,this.camera);
    for(const {el,point} of this.labels){
      const p=point.clone().project(this.camera);const x=(p.x*.5+.5)*this.width,y=(-p.y*.5+.5)*this.height;
      el.style.left=x+'px';el.style.top=y+'px';el.hidden=p.z<-1||p.z>1||x<0||x>this.width||y<0||y>this.height;
    }
  }
  rotate(deltaYaw,deltaPitch=0){
    this.cancelAnimation();
    this.yaw=Math.max(-.9,Math.min(.9,this.yaw+deltaYaw));
    // Financial plane remains vertical: only yaw changes there. Research layout permits elevation.
    this.pitch=this.view==='market'?0:Math.max(-.5,Math.min(.5,this.pitch+deltaPitch));
    this.updateCamera();this.requestRender();this.onCameraChange();
  }
  zoomBy(factor){this.cancelAnimation();this.zoom=Math.max(.75,Math.min(1.65,this.zoom*factor));this.updateCamera();this.requestRender();this.onCameraChange();}
  reset(render=true){
    const yaw=this.view==='market'?.28:.3,pitch=this.view==='market'?0:.13;
    if(render)this.transitionTo(yaw,pitch,1);else{this.yaw=yaw;this.pitch=pitch;this.zoom=1;this.updateCamera();}
  }
  front(){this.transitionTo(0,0,1);}
  transitionTo(yaw,pitch,zoom){
    this.cancelAnimation();
    if(this.paused||this.reduced||document.hidden){this.yaw=yaw;this.pitch=pitch;this.zoom=zoom;this.updateCamera();this.requestRender();return;}
    const start={yaw:this.yaw,pitch:this.pitch,zoom:this.zoom},began=performance.now();
    const frame=now=>{
      this.transitionFrame=0;if(this.disposed||!this.available||document.hidden||this.paused||this.reduced)return;
      const t=Math.min(1,(now-began)/220),ease=t*t*(3-2*t);
      this.yaw=start.yaw+(yaw-start.yaw)*ease;this.pitch=start.pitch+(pitch-start.pitch)*ease;this.zoom=start.zoom+(zoom-start.zoom)*ease;
      this.updateCamera();this.render();if(t<1)this.transitionFrame=requestAnimationFrame(frame);
    };
    this.transitionFrame=requestAnimationFrame(frame);
  }
  cancelAnimation(){if(this.renderFrame)cancelAnimationFrame(this.renderFrame);if(this.transitionFrame)cancelAnimationFrame(this.transitionFrame);this.renderFrame=0;this.transitionFrame=0;}
  bindInput(){
    this.down=null;
    this.onDown=e=>{if(e.button!==0)return;this.down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};this.canvas.setPointerCapture(e.pointerId);};
    this.onMove=e=>{if(!this.down)return;const d=this.down;
      if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>5)d.moved=true;
      if(d.moved)this.rotate((e.clientX-d.lastX)*-.006,(e.clientY-d.lastY)*.004);
      d.lastX=e.clientX;d.lastY=e.clientY;};
    this.onUp=e=>{
      const d=this.down;this.down=null;if(!d||d.moved)return;
      const rect=this.canvas.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
      this.raycaster.setFromCamera(this.pointer,this.camera);const hit=this.raycaster.intersectObjects(this.selectables,false)[0];
      if(hit)this.onSelect(hit.object.userData.selection);
    };
    this.onCancel=()=>{this.down=null;};
    this.onWheel=e=>{if(!e.ctrlKey)return;e.preventDefault();this.zoomBy(e.deltaY<0?1.08:1/1.08);};
    this.onKey=e=>{
      const actions={ArrowLeft:()=>this.rotate(-.08),ArrowRight:()=>this.rotate(.08),ArrowUp:()=>this.rotate(0,.06),ArrowDown:()=>this.rotate(0,-.06),'+':()=>this.zoomBy(1.1),'-':()=>this.zoomBy(1/1.1),Home:()=>this.reset()};
      if(actions[e.key]){e.preventDefault();actions[e.key]();}
    };
    for(const [event,fn] of [['pointerdown',this.onDown],['pointermove',this.onMove],['pointerup',this.onUp],['pointercancel',this.onCancel],['keydown',this.onKey]])this.canvas.addEventListener(event,fn);
    this.canvas.addEventListener('wheel',this.onWheel,{passive:false});
  }
  dispose(){
    this.disposed=true;this.clear();this.resizeObserver?.disconnect();document.removeEventListener('visibilitychange',this.onVisibility);
    this.canvas.removeEventListener('webglcontextlost',this.onContextLost);this.canvas.removeEventListener('webglcontextrestored',this.onContextRestored);
    for(const [event,fn] of [['pointerdown',this.onDown],['pointermove',this.onMove],['pointerup',this.onUp],['pointercancel',this.onCancel],['keydown',this.onKey],['wheel',this.onWheel]])this.canvas.removeEventListener(event,fn);
    this.renderer?.dispose();this.canvas.remove();this.overlay.remove();
  }
}
