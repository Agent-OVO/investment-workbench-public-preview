import {formatPrice} from './demo-market.js';
import * as THREE from '../vendor/three.module.js';
import {createRenderAdapter,setRenderMode} from './render-adapter.mjs';
import {buildFinanceGeometry} from './finance-geometry.js';
/** Screen-space label boxes are derived from the same camera used to draw and pick.
 * Native SVG supplies measured text bounds; CPU uses conservative 12px-font bounds. */
export function marketLabelSize(text){return {width:[...text].reduce((n,c)=>n+(c.codePointAt(0)>255?13:8),0),height:16}}
export function layoutMarketAxes({camera,width,height,candles,min,max,maxVol,view,measure=marketLabelSize}){
 const priceLabels=Array.from({length:5},(_,i)=>formatPrice(Math.round(min+(max-min)*i/4)));
 const tickWidth=Math.max(...[...priceLabels,'0',String(maxVol)].map(t=>measure(t).width)),lineHeight=Math.max(16,...priceLabels.map(t=>measure(t).height));
 const margins={left:tickWidth+lineHeight+30,right:30,top:36,bottom:64};
 camera.position.set(Math.sin(view.yaw)*115,23,Math.cos(view.yaw)*115);camera.lookAt(0,2,0);camera.updateMatrixWorld();
 // The plate, price/volume marks and date anchors are all inside this authored world box.
 const bounds=new THREE.Box3();for(const x of [-51,51])for(const y of [-28,34])for(const z of [-14,9])bounds.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
 const scale=Math.min((width-margins.left-margins.right)/(bounds.max.x-bounds.min.x),(height-margins.top-margins.bottom)/(bounds.max.y-bounds.min.y));
 const extraX=width-margins.left-margins.right-(bounds.max.x-bounds.min.x)*scale,extraY=height-margins.top-margins.bottom-(bounds.max.y-bounds.min.y)*scale;
 camera.left=bounds.min.x-(margins.left+extraX/2)/scale;camera.right=camera.left+width/scale;camera.top=bounds.max.y+(margins.top+extraY/2)/scale;camera.bottom=camera.top-height/scale;camera.zoom=view.zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const project=(x,y,z=0)=>{const p=new THREE.Vector3(x,y,z).project(camera);return{x:(p.x+1)*width/2,y:(1-p.y)*height/2}};
 const labels=[],label=(id,text,p,anchor='end',rotation=0)=>{const s=measure(text),w=rotation?s.height:s.width,h=rotation?s.width:s.height,b={left:p.x-(anchor==='middle'?w/2:anchor==='end'?w:0),top:p.y-h/2,width:w,height:h};b.right=b.left+w;b.bottom=b.top+h;const n={id,text,...p,anchor,rotation,bbox:b};labels.push(n);return n};
 const priceY=value=>(value-min)/(max-min||1)*38-9;
 for(let i=0;i<5;i++){const value=Math.round(min+(max-min)*i/4),p=project(-47,priceY(value),-1);label('price-'+i,priceLabels[i],{x:p.x-8,y:p.y})}
 const priceTop=project(-47,29,-1);label('price-unit','元/股',{x:priceTop.x-8,y:priceTop.y-lineHeight-8});
 const volumeTop=project(-47,-14,-1),volumeBottom=project(-47,-24,-1),vmax=label('volume-max',String(maxVol),{x:volumeTop.x-8,y:volumeTop.y});
 // At very narrow widths keep both exact ticks; a short leader retains zero's true projected position.
 const zeroY=Math.max(volumeBottom.y,vmax.bbox.bottom+lineHeight/2+4),zero=label('volume-zero','0',{x:volumeBottom.x-8,y:zeroY});if(zeroY!==volumeBottom.y)zero.leader={from:volumeBottom,to:{x:volumeBottom.x-5,y:zeroY}};
 label('volume-unit','量（股）',{x:volumeTop.x-8-tickWidth-lineHeight/2-10,y:(volumeTop.y+volumeBottom.y)/2},'middle',-90);
 const step=88/candles.length,first=project(-44+.5*step,-28),last=project(-44+(candles.length-.5)*step,-28),dateWidth=Math.max(...candles.map(c=>measure(c.date.slice(5)).width));let count=Math.min(6,candles.length,Math.max(2,Math.floor((last.x-first.x)/(dateWidth+14))+1));while(count>2&&Math.floor((candles.length-1)/(count-1))*(last.x-first.x)/(candles.length-1)<dateWidth+12)count--;
 for(let j=0;j<count;j++){const i=Math.round(j*(candles.length-1)/(count-1)),p=project(-44+(i+.5)*step,-28);label('date-'+i,candles[i].date.slice(5),{x:p.x,y:p.y+16},'middle')}
 // Space cramped tick labels in their reserved gutter, never move a data mark.
 // Leaders explicitly connect each displaced label to its unchanged projected tick.
 const ticks=labels.filter(n=>/^price-\d$/.test(n.id)||['volume-max','volume-zero'].includes(n.id)).sort((a,b)=>a.y-b.y),gap=lineHeight+4;
 const targets=ticks.map(n=>n.y),placed=targets.map((v,i)=>v);for(let i=1;i<placed.length;i++)placed[i]=Math.max(placed[i],placed[i-1]+gap);const shift=placed.reduce((n,v,i)=>n+v-targets[i],0)/placed.length;
 const moveLabel=(n,newY)=>{const delta=newY-n.y;n.y=newY;n.bbox.top+=delta;n.bbox.bottom+=delta};
 ticks.forEach((n,i)=>{const y=placed[i]-shift;if(Math.abs(y-n.y)>.01){const original=n.leader?.from||{x:n.x+8,y:n.y};moveLabel(n,y);n.leader={from:original,to:{x:n.x+3,y}}}});
 const unit=labels.find(n=>n.id==='price-unit');moveLabel(unit,labels.find(n=>n.id==='price-4').y-lineHeight-8);
 const vu=labels.find(n=>n.id==='volume-unit');moveLabel(vu,(vmax.y+zero.y)/2);
 const dates=labels.filter(n=>n.id.startsWith('date-')),dateFloor=zero.bbox.bottom+lineHeight/2+6;for(const n of dates)if(n.y<dateFloor){const origin={x:n.x,y:n.y-16};moveLabel(n,dateFloor);n.leader={from:origin,to:{x:n.x,y:n.bbox.top-3}}}
 return {width,height,margins,labels,projection:{left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom,zoom:camera.zoom},bounds:{left:0,top:0,right:width,bottom:height}};
}

/** Authored sample chart: price, time and volume retain their explicit distinct scales. */
export function createMarketSpace(host,{candles,trades,selectedId,mode,paused,view={yaw:.28,zoom:1},onSelect,onView,onStatus}){
 let disposed=false,frame=0,currentView={...view},down=null,axisLayout=null;
 const canvas=document.createElement('canvas');canvas.className='market-canvas';canvas.tabIndex=0;canvas.setAttribute('aria-label','样本K线空间。左右方向键转动，Home正视；日期列表可精确选择。');host.append(canvas);
 setRenderMode(mode,{url:false});const renderer=createRenderAdapter({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,2));renderer.setClearColor(0xeaf2f5);const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-60,60,38,-38,.1,1000),root=new THREE.Group();scene.add(root);scene.add(new THREE.HemisphereLight(0xffffff,0x577687,2.7));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-20,40,65);scene.add(light);const overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');overlay.setAttribute('class','market-axis-overlay');overlay.setAttribute('aria-hidden','true');host.append(overlay);const resources=[],hits=[],geo=buildFinanceGeometry(candles),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function mesh(g,c,x,y,z,id){const m=new THREE.MeshStandardMaterial({color:c,roughness:.32,metalness:.24}),o=new THREE.Mesh(g,m);o.position.set(x,y,z);root.add(o);resources.push(g,m);if(id){o.userData.id=id;hits.push(o)}return o}
 const prices=candles.flatMap(b=>[b.lowCents,b.highCents]),min=Math.min(...prices),max=Math.max(...prices),range=max-min||1,y=v=>(v-min)/range*38-9,step=88/candles.length,maxVol=Math.max(...candles.map(b=>b.volume));
 mesh(new THREE.BoxGeometry(101,.35,21),0xd4e3e9,0,-26,-3);
 const line=(a,b,c=0xa8bdc7)=>{const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]),m=new THREE.LineBasicMaterial({color:c}),l=new THREE.Line(g,m);root.add(l);resources.push(g,m)};
 for(let i=0;i<5;i++){const yy=-9+i*9.5;line([-47,yy,-1],[47,yy,-1]);}line([-47,-10,-1],[-47,30,-1],0x486e82);line([-47,-24,-1],[-47,-14,-1],0x486e82);
 candles.forEach((b,i)=>{const x=-44+(i+.5)*step,color=b.closeCents>b.openCents?0xb45057:b.closeCents<b.openCents?0x27867e:0x6c7781,body=Math.abs(y(b.closeCents)-y(b.openCents));if(body===0)line([x-step*.32,y(b.openCents),0],[x+step*.32,y(b.openCents),0],color);else mesh(new THREE.BoxGeometry(Math.min(1.5,step*.65),body,1.6),b.id===selectedId?0xc6973e:color,x,(y(b.openCents)+y(b.closeCents))/2,0,b.id);mesh(new THREE.BoxGeometry(.18,y(b.highCents)-y(b.lowCents),.35),color,x,(y(b.highCents)+y(b.lowCents))/2,0,b.id);const volume=b.volume/maxVol*10;mesh(new THREE.BoxGeometry(Math.min(1.5,step*.65),volume,1.6),0x88aab8,x,-24+volume/2,0,b.id);for(const t of trades.filter(t=>t.barId===b.id)){mesh(new THREE.ConeGeometry(Math.min(.8,step*.35),1.8,8),0xb78a36,x,y(b.highCents)+2,1,t.id)}});
 function draw(){frame=0;if(disposed||!host.isConnected)return;const r=host.getBoundingClientRect(),w=Math.max(280,r.width),h=Math.max(260,r.height);renderer.setSize(w,h,false);overlay.setAttribute('viewBox',`0 0 ${w} ${h}`);overlay.replaceChildren();
 const measured=new Map(),measure=text=>{if(measured.has(text))return measured.get(text);const n=document.createElementNS('http://www.w3.org/2000/svg','text');n.setAttribute('class','market-tick');n.textContent=text;overlay.append(n);let size=marketLabelSize(text);try{const b=n.getBBox();if(b.width>0&&b.height>0)size={width:Math.ceil(b.width)+2,height:Math.max(16,Math.ceil(b.height)+2)}}catch{}n.remove();measured.set(text,size);return size};
 axisLayout=layoutMarketAxes({camera,width:w,height:h,candles,min,max,maxVol,view:currentView,measure});renderer.render(scene,camera);
 for(const item of axisLayout.labels){if(item.leader){const l=document.createElementNS('http://www.w3.org/2000/svg','line');for(const[k,v]of Object.entries({x1:item.leader.from.x,y1:item.leader.from.y,x2:item.leader.to.x,y2:item.leader.to.y}))l.setAttribute(k,String(v));l.setAttribute('class','market-axis-leader');overlay.append(l)}const n=document.createElementNS('http://www.w3.org/2000/svg','text');n.setAttribute('x',String(item.x));n.setAttribute('y',String(item.y));n.setAttribute('text-anchor',item.anchor);n.setAttribute('dominant-baseline','central');n.setAttribute('data-axis-label',item.id);if(item.rotation)n.setAttribute('transform',`rotate(${item.rotation} ${item.x} ${item.y})`);n.setAttribute('class','market-tick');n.textContent=item.text;overlay.append(n)}onStatus?.(renderer.available===false?'3D不可用，请切换2D辅助视图。':'');}

 function request(){if(!frame&&!disposed)frame=requestAnimationFrame(draw)}
 const resize=new ResizeObserver(request);resize.observe(host);document.fonts?.ready.then(()=>{if(!disposed)request()});const move=delta=>{if(paused)return;currentView.yaw=Math.max(-.65,Math.min(.65,currentView.yaw+delta));onView?.(currentView);request()};
 const downFn=e=>{down={x:e.clientX,y:e.clientY,moved:false,last:e.clientX};canvas.setPointerCapture?.(e.pointerId)},moveFn=e=>{if(!down)return;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.moved=true;if(down.moved)move((e.clientX-down.last)*.006);down.last=e.clientX},upFn=e=>{if(!down)return;const hitAllowed=!down.moved;down=null;if(!hitAllowed)return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(hits,false)[0];if(hit)onSelect(hit.object.userData.id)},cancel=()=>{down=null},key=e=>{if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){e.preventDefault();if(paused)return;if(e.key==='Home'){currentView={yaw:0,zoom:1};onView?.(currentView);request()}else move(e.key==='ArrowLeft'?-.08:.08)}};
 for(const[k,fn]of Object.entries({pointerdown:downFn,pointermove:moveFn,pointerup:upFn,pointercancel:cancel,keydown:key}))canvas.addEventListener(k,fn);request();
 return{setMode(m){setRenderMode(m,{url:false});request()},setPaused(p){paused=p;if(paused)down=null},getSnapshot(){return{scene:scene.uuid,camera:camera.uuid,view:{...currentView},mode:renderer.mode,objects:hits.map(h=>h.userData.id),sourceBars:candles.map(b=>b.id),geometry:geo,axes:axisLayout?structuredClone(axisLayout):null}},dispose(){disposed=true;cancelAnimationFrame(frame);resize.disconnect();renderer.dispose();for(const r of resources)r.dispose();canvas.remove();overlay.remove()}};
}
