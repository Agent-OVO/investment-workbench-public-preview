/** Pure shared-scale geometry. Amounts are presentation-only values in 万元.
 * Exact money remains in core.js as integer cents (BigInt).
 */
export const AMOUNT_DOMAIN = Object.freeze({min:-4000,max:1000});
const finite = value => typeof value === 'number' && Number.isFinite(value);
export function amountGeometry(value,{left=0,right=500,domainMin=AMOUNT_DOMAIN.min,domainMax=AMOUNT_DOMAIN.max}={}) {
  if (![value,left,right,domainMin,domainMax].every(finite) || right<=left || domainMax<=domainMin || domainMin>0 || domainMax<0) throw new RangeError('INVALID_SHARED_AMOUNT_SCALE');
  if(value<domainMin||value>domainMax) throw new RangeError('AMOUNT_OUTSIDE_DECLARED_SCALE');
  const scale=(right-left)/(domainMax-domainMin),zeroX=left-domainMin*scale,endX=zeroX+value*scale;
  return Object.freeze({value,zeroX,endX,x0:Math.min(zeroX,endX),x1:Math.max(zeroX,endX),width:Math.abs(value)*scale,positive:value>0,negative:value<0,scale});
}
export function chartRows(rows,{left=0,right=500,top=40,gap=82,height=24,domainMin=AMOUNT_DOMAIN.min,domainMax=AMOUNT_DOMAIN.max}={}) {
  const ids=new Set();
  return rows.map((row,index)=>{
    if(typeof row.id!=='string'||!row.id||ids.has(row.id))throw new Error('INVALID_OR_DUPLICATE_CHART_ID');
    ids.add(row.id);
    return {...row,...amountGeometry(row.value,{left,right,domainMin,domainMax}),y:top+index*gap,height};
  });
}
/** Normalize AFTER the authored angle; perspective cannot change the amount. */
export function normalizeProjectedPositions(array,length) {
  if(!finite(length)||length<0||array.length%3)throw new RangeError('INVALID_BEAM_POSITIONS');
  if(!array.length)return {positions:new Float32Array(),minX:0,maxX:0};
  let min=Infinity,max=-Infinity;
  for(let i=0;i<array.length;i++){if(!finite(array[i]))throw new RangeError('INVALID_BEAM_COORDINATE');if(i%3===0){min=Math.min(min,array[i]);max=Math.max(max,array[i]);}}
  const span=max-min,result=new Float32Array(array);
  for(let i=0;i<result.length;i+=3)result[i]=span?(array[i]-min)/span*length:0;
  return {positions:result,minX:0,maxX:length};
}
export function rendererCanAnimate({paused=false,visible=true,mode='spatial',reduced=false,inViewport=true,contextLost=false,disposed=false}={}) {
  return !paused&&visible&&mode!=='flat'&&!reduced&&inViewport&&!contextLost&&!disposed;
}
