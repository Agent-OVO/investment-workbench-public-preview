import {productIdentity,sourceIdentity} from './domain.js';
// Live DOM rectangles provide layout anchors; no screenshot coordinates or value re-scaling.
const rect=r=>r&&[r.left,r.top,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0;
export function readingSpatialSpec({product,base,selectedRow,focus,ports=[]}) {
 if(!rect(base)||!rect(focus))return {nodes:[],links:[]};
 const local=r=>({x:r.left-base.left+r.width/2,y:r.top-base.top+r.height/2});
 const focusPoint=local(focus),owner=productIdentity(product);
 const nodes=[{id:owner,kind:'selected-product',...focusPoint,width:Math.min(22,focus.width),height:Math.min(26,focus.height),targetId:'selected-title'}],links=[];
 if(rect(selectedRow)){
  const a={x:selectedRow.left-base.left+selectedRow.width,y:selectedRow.top-base.top+selectedRow.height/2};
  // Route only through the chart/evidence gutter; narrow layout uses the outer rail.
  const narrow=focus.top>=selectedRow.top+selectedRow.height;
  const rail=narrow?Math.max(a.x,focusPoint.x)+8:(a.x+focusPoint.x)/2;
  links.push({id:owner+':reading-focus',kind:'same-object',from:owner,to:owner,points:[a,{x:rail,y:a.y},{x:rail,y:focusPoint.y},focusPoint]});
 }
 for(const p of ports){
  if(!rect(p.rect)||!['H125','H126','IR0908'].includes(p.alias)||p.alias==='IR0908'&&product!=='repair')continue;
  const at=local(p.rect),id=sourceIdentity(p.alias);
  nodes.push({id,kind:'source',alias:p.alias,...at,width:Math.min(22,p.rect.width),height:Math.min(28,p.rect.height),targetId:'port-'+p.alias});
  const rail=Math.min(focusPoint.x,at.x)-14;
  links.push({id:owner+':cites:'+id,kind:'citation',from:owner,to:id,points:[focusPoint,{x:rail,y:focusPoint.y},{x:rail,y:at.y},at]});
 }
 return {nodes,links};
}
