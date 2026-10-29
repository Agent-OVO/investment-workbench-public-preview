import {moneyToCents,centsToMoney} from './space-model.mjs';
export const CHARTS=['trajectory','profit','evidence','solid'];
export function pairedProducts(report,measure='revenue'){
 const products=[...new Set(report.metrics.filter(m=>m.scopeKind==='product').map(m=>m.productId))];
 return products.map(id=>{const metrics=['2025H1','2026H1'].map(p=>report.metrics.find(m=>m.productId===id&&m.measureId===measure&&m.datum.period.label===p));return {id,label:metrics[0]?.label.split(' · ')[0]||id,metrics,values:metrics.map(m=>m?.datum.state==='known'?Number(m.datum.value)/10000:null),delta:metrics.some(m=>m?.datum.state!=='known')?null:centsToMoney(moneyToCents(metrics[1].datum.value)-moneyToCents(metrics[0].datum.value))}});
}
export function profitPoints(report,period,measure='grossProfit'){
 return pairedProducts(report,measure).map(p=>{const metric=p.metrics.find(m=>m?.datum.period.label===period),find=k=>report.metrics.find(m=>m.productId===p.id&&m.measureId===k&&m.datum.period.label===period),revenue=find('revenue'),cost=find('cost'),profit=find('grossProfit');return {id:metric.id,productId:p.id,label:p.label,metric,revenue:revenue.datum.value,cost:cost.datum.value,profit:profit.datum.value,x:revenue.datum.value===null?null:Number(revenue.datum.value)/10000,y:profit.datum.value===null?null:Number(profit.datum.value)/10000}});
}
export function evidenceGraph(report,measure='revenue'){
 const nodes=[],edges=[],metrics=report.metrics.filter(m=>m.scopeKind==='product'&&m.measureId===measure);
 const periods=['2025H1','2026H1'];
 for(const [i,p]of pairedProducts(report,measure).entries())for(const [j,m]of p.metrics.entries())nodes.push({id:m.id,kind:'metric',label:p.label+' · '+periods[j],metric:m,x:(i-3.5)*77,y:j===0?-78:78,z:-80});
 const sourceIds=[...new Set(metrics.flatMap(m=>m.sourceRefs))];sourceIds.forEach((id,i)=>nodes.push({id,kind:'source',label:id.split(':').at(-1)+' 原始披露',x:(i-(sourceIds.length-1)/2)*280,y:0,z:90}));
 const sectionIds=[...new Set(metrics.map(m=>m.origin.sectionId))];sectionIds.forEach((id,i)=>nodes.push({id,kind:'section',label:'对应正文',x:(i-(sectionIds.length-1)/2)*180,y:0,z:230}));
 for(const m of metrics){for(const source of m.sourceRefs)edges.push({from:m.id,to:source,kind:'source'});edges.push({from:m.id,to:m.origin.sectionId,kind:'section'});}
 return {nodes,edges};
}
export function project3D(point,{yaw=-.5,pitch=.35,zoom=1}={},width=960,height=480,flat=false){
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const x=point.x*cy+point.z*sy,z0=-point.x*sy+point.z*cy,y=point.y*cp-z0*sp,z=point.y*sp+z0*cp;
 if(flat)return {x:width/2+point.x*zoom,y:height/2-point.y*zoom-point.z*.56*zoom,z:0,scale:zoom};
 const scale=720/(850-z)*zoom;return{x:width/2+x*scale,y:height/2-y*scale,z,scale};
}
export function labelPositions(values,min=62,max=420,gap=35){
 const sorted=values.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v);for(let i=0;i<sorted.length;i++)sorted[i].y=Math.max(min,sorted[i].v,i?sorted[i-1].y+gap:min);if(sorted.at(-1)?.y>max){sorted.at(-1).y=max;for(let i=sorted.length-2;i>=0;i--)sorted[i].y=Math.min(sorted[i].y,sorted[i+1].y-gap);}const out=[];sorted.forEach(x=>out[x.i]=x.y);return out;
}
