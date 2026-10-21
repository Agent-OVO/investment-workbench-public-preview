import {projectCardToGlass,C02_PROJECTION_REVISION} from '/investment-workbench-public-preview/workbench-review/continuity/c02-plane-projection.js?v=0.1.0-preview.2';
const spatialQuery='(min-width:1100px) and (min-height:640px)';
export const C02_TEXT_MODES=Object.freeze(['flat','affine','perspective']);
export const C02_OVERVIEW_MIN_WIDTH=Object.freeze({focus:245,support:315,limits:315,evidence:330,questions:315});
export const C02_READING_MIN_WIDTH=C02_OVERVIEW_MIN_WIDTH;
export const C02_MIN_PROJECTED_SCALE=.9;
export function minimumC02ProjectedScale(p){if(!p?.ok)return 0;const m=p.matrix;return Math.min(Math.hypot(m[0],m[1]),Math.hypot(m[4],m[5]));}
export function hasC02ReadingRoom(card,p,widths=C02_READING_MIN_WIDTH){return !!p?.ok&&p.width>=widths[card.dataset.c02Card];}
// All three diagnostic modes use the same current world face and the same DOM.
// Flat is not a detached overlay: its four edges are checked against that face.
export function textProjection(p,mode='flat'){
 if(!p?.ok)return p;
 const [a,b,c,d]=p.corners,w=p.width,h=p.height;
 if(mode==='perspective')return {...p,mode,revision:C02_PROJECTION_REVISION};
 if(mode==='affine'){
  const matrix=[(b.x-a.x)/w,(b.y-a.y)/w,(d.x-a.x)/h,(d.y-a.y)/h,0,0];
  const error=Math.hypot(a.x+matrix[0]*w+matrix[2]*h-c.x,a.y+matrix[1]*w+matrix[3]*h-c.y);
  if(error>.75)return {ok:false,reason:'non-affine-face'};
  return {...p,mode,transform:'matrix('+matrix.join(',')+')',maxCornerError:error,revision:'c02-affine-same-face-v2'};
 }
 const corners=[{x:p.left,y:p.top},{x:p.left+w,y:p.top},{x:p.left+w,y:p.top+h},{x:p.left,y:p.top+h}];
 const error=Math.max(...corners.map((x,i)=>Math.hypot(x.x-p.corners[i].x,x.y-p.corners[i].y)));
 if(error>.75)return {ok:false,reason:'face-not-camera-aligned'};
 return {...p,mode:'flat',transform:'none',maxCornerError:error,revision:'c02-flat-same-face-v2'};
}
const properties=['left','top','width','height','transform','transform-origin'];
export function createC02Layout({doc,api,section,container,stage,canvas,onStatus=()=>{},env=globalThis,overview=false}){
 const cards=[...container.children],query=env.matchMedia(spatialQuery),selectors=[...doc.querySelectorAll('[data-text-mode]')];
 const params=new URLSearchParams(env.location?.search||'');let mode=C02_TEXT_MODES.includes(params.get('text'))?params.get('text'):'flat';
 let disposed=false,forcedFlow=false,forcedReason='',frame=0,projectionFrame=0,resizeWaits=0,lastViewKey='';
 const flow=compact=>{doc.body.classList.add('c02-flow','c02-atlas');doc.body.classList.toggle('c02-overview-flow',compact);if(compact&&section.contains(doc.activeElement))doc.querySelector('.c02-reading-nav a')?.focus();section.hidden=compact;section.inert=compact;canvas.setAttribute('data-view-input',compact?'handle-only':'canvas-and-handle');};
 const clear=()=>{for(const card of cards){for(const p of properties)card.style.removeProperty(p);delete card.dataset.projection;}};
 const setStyle=(card,key,value)=>{if(card.style.getPropertyValue(key)!==value)card.style.setProperty(key,value);};
 const update=()=>{
  if(disposed)return;
  const diagnostics=api.getDiagnostics(),anchors=api.getContentAnchors(),ready=diagnostics.status==='ready'&&anchors.length===5;
  const viewKey=JSON.stringify([diagnostics.camera?.presentation,diagnostics.camera?.selected]);
  if(lastViewKey&&viewKey!==lastViewKey){forcedFlow=false;forcedReason='';resizeWaits=0;}lastViewKey=viewKey;
  let compact=forcedFlow||!ready||!query.matches,reason=forcedFlow?forcedReason:!ready?'scene-unavailable':!query.matches?'viewport':'';
  flow(compact);section.dataset.textMode=mode;
  for(const s of selectors)s.value=mode;
  let projected=[];
  if(!compact){
   if(diagnostics.renderReady===false){section.inert=true;section.dataset.layout='pending-spatial';section.dataset.layoutReason='awaiting-scene-frame';return;}
   const rect=stage.getBoundingClientRect(),overlay=section.getBoundingClientRect(),byId=new Map(anchors.map(a=>[a.id,a]));
   if(anchors.some(a=>Math.abs(a.projectionAspect-rect.width/rect.height)>1e-3)){
    section.inert=true;section.dataset.layout='pending-spatial';section.dataset.layoutReason='projection-resizing';clear();
    if(!projectionFrame)projectionFrame=env.requestAnimationFrame(()=>{projectionFrame=0;if(++resizeWaits>4){forcedFlow=true;forcedReason='projection-resize-timeout';}update();});
    onStatus();return;
   }
   projected=cards.map(card=>textProjection(projectCardToGlass(byId.get(card.dataset.c02Card),rect,overlay),mode));
   const failure=projected.find(p=>!p.ok);
   if(failure||cards.length!==5){compact=forcedFlow=true;reason=forcedReason=failure?.reason||'incomplete-surfaces';}
   else if(projected.some((p,i)=>!hasC02ReadingRoom(cards[i],p))){compact=forcedFlow=true;reason=forcedReason='reading-width';}
   flow(compact);
  }
  if(projectionFrame){env.cancelAnimationFrame(projectionFrame);projectionFrame=0;}resizeWaits=0;
  section.dataset.layout=compact?'reading-flow':'spatial';section.dataset.layoutReason=reason;
  if(compact){clear();delete section.dataset.maxCornerError;onStatus();return;}
  section.inert=false;section.dataset.maxCornerError=String(Math.max(...projected.map(p=>p.maxCornerError)));
  for(let i=0;i<cards.length;i++){
   const card=cards[i],p=projected[i];
   for(const key of ['left','top','width','height'])setStyle(card,key,p[key]+'px');
   setStyle(card,'transform-origin','0px 0px');setStyle(card,'transform',p.transform);card.dataset.projection=p.revision;
   card.classList.toggle('c02-selected',diagnostics.camera?.selected===card.dataset.c02Card);
  }
  if(!frame)frame=env.requestAnimationFrame(()=>{
   frame=0;if(disposed||section.dataset.layout!=='spatial')return;
   const clipped=cards.filter(card=>card.scrollHeight>card.clientHeight+2||card.scrollWidth>card.clientWidth+2);
   if(clipped.length){forcedFlow=true;forcedReason='content-overflow:'+clipped.map(c=>c.dataset.c02Card).join(',');update();}
  });
  onStatus();
 };
 const retry=()=>{if(disposed)return;forcedFlow=false;forcedReason='';resizeWaits=0;update();};
 const change=e=>{if(!C02_TEXT_MODES.includes(e.target.value))return;mode=e.target.value;api.setTextMode?.(mode);retry();};
 for(const s of selectors)s.addEventListener('change',change);
 api.setTextMode?.(mode);
 env.addEventListener('resize',retry);query.addEventListener('change',retry);container.addEventListener('load',retry,true);doc.fonts?.addEventListener?.('loadingdone',retry);
 const observer=new env.ResizeObserver(update);observer.observe(stage);
 doc.fonts?.ready?.then(()=>{if(!disposed)retry();});update();
 return {update,getMode:()=>mode,setMode(next){if(C02_TEXT_MODES.includes(next)){mode=next;api.setTextMode?.(mode);retry();}},dispose(){
  if(disposed)return;disposed=true;env.cancelAnimationFrame(frame);env.cancelAnimationFrame(projectionFrame);observer.disconnect();env.removeEventListener('resize',retry);query.removeEventListener('change',retry);container.removeEventListener('load',retry,true);doc.fonts?.removeEventListener?.('loadingdone',retry);for(const s of selectors)s.removeEventListener('change',change);canvas.removeAttribute('data-view-input');clear();doc.body.classList.remove('c02-flow','c02-atlas','c02-overview-flow');
 }};
}
