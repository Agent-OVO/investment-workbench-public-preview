import {projectCardToGlass,C02_PROJECTION_REVISION} from '/investment-workbench-public-preview/workbench-review/continuity/c02-plane-projection.js?v=0.1.0-preview.2';
const spatialQuery='(min-width:1101px) and (min-height:801px) and (aspect-ratio > 3/2)';
export const C02_OVERVIEW_MIN_WIDTH=Object.freeze({focus:285,support:330,limits:330,evidence:330,questions:330});
export const C02_READING_MIN_WIDTH=Object.freeze({focus:300,support:400,limits:400,evidence:400,questions:360});
// Conservative lower bound on the smallest singular value of the homography Jacobian
// over the ENTIRE source rectangle. Bounds are in CSS pixels, not device/GPU pixels.
// det(J)=det(H)/w^3; bound each derivative on rectangle endpoints, then ||J||2
// by the spectral norm of its entrywise absolute upper-bound matrix.
export const C02_MIN_PROJECTED_SCALE=.90;
export function minimumC02ProjectedScale(projection){
 if(!projection?.ok)return 0;
 const {matrix:m,width,height}=projection,[a,d,,,b,e,,h,,,,,c,f,,i]=m,g=m[3];
 const ws=[i,g*width+i,h*height+i,g*width+h*height+i],lo=Math.min(...ws),hi=Math.max(...ws);
 if(![...m,width,height].every(Number.isFinite)||lo<=0||width<=0||height<=0)return 0;
 const bound=(start,slope,extent)=>Math.max(Math.abs(start),Math.abs(start+slope*extent))/(lo*lo);
 const A=bound(a*i-g*c,a*h-g*b,height),B=bound(b*i-h*c,b*g-h*a,width);
 const C=bound(d*i-g*f,d*h-g*e,height),D=bound(e*i-h*f,e*g-h*d,width);
 const sum=A*A+B*B+C*C+D*D,difference=A*A+C*C-B*B-D*D,cross=A*B+C*D;
 const norm=Math.sqrt((sum+Math.hypot(difference,2*cross))/2),det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
 return norm>0?Math.abs(det)/(hi**3*norm):0;
}
export function hasC02ReadingRoom(card,projection,widths=C02_READING_MIN_WIDTH){
 const width=widths[card.dataset.c02Card];
 if(!width||!projection?.ok)return false;
 const [a,b,c,d]=projection.corners;
 return Math.min(Math.hypot(b.x-a.x,b.y-a.y),Math.hypot(c.x-d.x,c.y-d.y))>=width;
}
const properties=['left','top','width','height','transform','transform-origin'];
// Separate controller so lifecycle, fallback and stable DOM identity are executable tests.
export function createC02Layout({doc,api,section,container,stage,canvas,onStatus=()=>{},env=globalThis,overview=false}){
 const cards=[...container.children],query=env.matchMedia(spatialQuery),touchAction=canvas.style.touchAction;
 const transformSupported=!!env.CSS?.supports?.('transform','matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)');
 const widths=overview?C02_OVERVIEW_MIN_WIDTH:C02_READING_MIN_WIDTH;
 const flow=compact=>{doc.body.classList.toggle('c02-flow',overview||compact);if(overview){doc.body.classList.add('c02-atlas');doc.body.classList.toggle('c02-overview-flow',compact);if(compact&&section.contains(doc.activeElement)){const link=doc.querySelector('.c02-reading-nav a');link?.focus();}section.hidden=compact;section.inert=compact;}};
 let disposed=false,forcedFlow=false,forcedReason='',measureFrame=0,projectionFrame=0,projectionWaits=0;
 const clear=()=>{for(const card of cards){for(const p of properties)card.style.removeProperty(p);delete card.dataset.projection;}};
 const setStyle=(card,key,value)=>{if(card.style.getPropertyValue(key)!==value)card.style.setProperty(key,value);};
 const update=()=>{
  if(disposed)return;onStatus();
  const anchors=api.getContentAnchors(),sceneReady=api.getDiagnostics().status==='ready'&&anchors.length===5;
  let compact=forcedFlow||!sceneReady||!query.matches||!transformSupported;
  let reason=forcedFlow?forcedReason:!sceneReady?'scene-unavailable':!query.matches?'viewport':!transformSupported?'css-transform-unavailable':'';
  // Clear flow before measuring: section and stage can change their origin in fullscreen/flow.
  flow(compact);
  let projected=[];
  if(!compact){
   const rect=stage.getBoundingClientRect(),overlay=section.getBoundingClientRect(),byId=new Map(anchors.map(a=>[a.id,a]));
   // Removing flow changes stage height immediately; the renderer updates its lens
   // in ResizeObserver. Never latch overflow using the previous 300px overview lens.
   const aspect=rect.width/rect.height;
   if(anchors.some(a=>!Number.isFinite(a.projectionAspect)||Math.abs(a.projectionAspect-aspect)>1e-3)){
    clear();section.inert=true;section.dataset.layout='pending-spatial';section.dataset.layoutReason='projection-resizing';delete section.dataset.maxCornerError;canvas.style.touchAction='none';
    if(measureFrame){env.cancelAnimationFrame(measureFrame);measureFrame=0;}
    if(!projectionFrame)projectionFrame=env.requestAnimationFrame(()=>{projectionFrame=0;if(disposed)return;if(++projectionWaits>=3){forcedFlow=true;forcedReason='projection-resize-timeout';}update();});
    return;
   }
   projected=cards.map(card=>projectCardToGlass(byId.get(card.dataset.c02Card),rect,overlay));
   const failure=projected.find(p=>!p.ok);
   if(cards.length!==5||byId.size!==5||failure){compact=forcedFlow=true;reason=forcedReason=failure?.reason||'incomplete-surfaces';flow(true);}
   else if(projected.some((p,i)=>!hasC02ReadingRoom(cards[i],p,widths))){compact=forcedFlow=true;reason=forcedReason='reading-width';flow(true);}
   else if(projected.some(p=>minimumC02ProjectedScale(p)<C02_MIN_PROJECTED_SCALE)){compact=forcedFlow=true;reason=forcedReason='reading-scale';flow(true);}
  }
  if(projectionFrame){env.cancelAnimationFrame(projectionFrame);projectionFrame=0;}projectionWaits=0;
  canvas.style.touchAction=compact?'pan-y':'none';
  section.dataset.layout=compact?'reading-flow':'spatial';section.dataset.layoutReason=reason;onStatus();
  if(compact){clear();delete section.dataset.maxCornerError;if(measureFrame){env.cancelAnimationFrame(measureFrame);measureFrame=0;}return;}
  section.inert=false;section.dataset.maxCornerError=String(Math.max(...projected.map(p=>p.maxCornerError)));
  for(let i=0;i<cards.length;i++){
   const card=cards[i],p=projected[i];
   for(const key of ['left','top','width','height'])setStyle(card,key,p[key]+'px');
   setStyle(card,'transform-origin','0px 0px');setStyle(card,'transform',p.transform);card.dataset.projection=C02_PROJECTION_REVISION;
  }
  if(!measureFrame)measureFrame=env.requestAnimationFrame(()=>{
   measureFrame=0;if(disposed||section.dataset.layout!=='spatial')return;
   const clipped=cards.some(card=>card.scrollHeight>card.clientHeight+1||card.scrollWidth>card.clientWidth+1);
   if(clipped){forcedFlow=true;forcedReason='content-overflow';update();}
  });
 };
 const retry=()=>{if(disposed)return;forcedFlow=false;forcedReason='';projectionWaits=0;update();};
 env.addEventListener('resize',retry);query.addEventListener('change',retry);
 container.addEventListener('load',update,true);doc.fonts?.addEventListener?.('loadingdone',retry);
 const observer=new env.ResizeObserver(update);observer.observe(stage);
 // No retry loop: overflow/degenerate projection stays in flow until viewport/font change.
 doc.fonts?.ready?.then(()=>{if(!disposed)retry();});update();
 return {update,dispose(){if(disposed)return;disposed=true;if(projectionFrame)env.cancelAnimationFrame(projectionFrame);projectionFrame=0;if(measureFrame)env.cancelAnimationFrame(measureFrame);measureFrame=0;observer.disconnect();env.removeEventListener('resize',retry);query.removeEventListener('change',retry);container.removeEventListener('load',update,true);doc.fonts?.removeEventListener?.('loadingdone',retry);clear();canvas.style.touchAction=touchAction;doc.body.classList.remove('c02-flow');doc.body.classList.remove('c02-atlas');doc.body.classList.remove('c02-overview-flow');delete section.dataset.layout;delete section.dataset.layoutReason;delete section.dataset.maxCornerError;}};
}
