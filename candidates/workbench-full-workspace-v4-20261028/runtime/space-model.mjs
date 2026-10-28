/** One monetary model for both renderers. No random layout and no inferred data. */
export const BUDGET = Object.freeze({maxMeasurements:128,maxPixelRatio:1.5,maxCanvasPixels:1800000,idleFrames:0,postprocessing:false,textures:0});
export const DEFAULT_VIEW = Object.freeze({preset:'overview',yaw:.48,pitch:.44,zoom:1,order:'source'});
export function moneyToCents(value){
 if(typeof value!=='string'||!/^[-+]?\d+(?:\.\d{1,2})?$/.test(value))throw new TypeError('Amount must be an exact decimal CNY string');
 const negative=value[0]==='-',clean=value.replace(/^[-+]/,''),[whole,frac='']=clean.split('.');
 return (negative?-1n:1n)*(BigInt(whole)*100n+BigInt(frac.padEnd(2,'0')));
}
export function centsToMoney(value){const n=BigInt(value),a=n<0n?-n:n;return `${n<0n?'-':''}${a/100n}.${String(a%100n).padStart(2,'0')}`;}
export function formatMoney(value,{wan=false}={}){
 if(value===null||value===undefined)return '未披露';
 const n=BigInt(value); if(wan)return (Number(n)/1000000).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
 const [whole,frac]=centsToMoney(n).split('.');return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')}.${frac}`;
}
export function normalizeData(data){
 if(!data||!Array.isArray(data.measurements))throw new TypeError('data.measurements required');
 if(data.measurements.length>BUDGET.maxMeasurements)throw new RangeError('Measurement budget exceeded; select a comparable subset');
 const seen=new Set(),products=new Map(),periods=new Map(),metrics=new Set();
 const records=data.measurements.map(r=>{
  if(!r||typeof r.id!=='string'||!r.id||seen.has(r.id))throw new TypeError('Unique measurement id required');seen.add(r.id);
  if(!r.productId||!r.productLabel||!r.period)throw new TypeError('Product identity, label and period required');
  if(r.unit!=='CNY')throw new TypeError('Only CNY amounts share this space; ratios and currencies must not be mixed');
  const metricLabel=r.metricLabel||data.metricLabel||'营业收入'; metrics.add(metricLabel);
  const cents=r.amount===null?null:moneyToCents(r.amount);
  if(cents!==null&&((cents<0n?-cents:cents)>9007199254740991n))throw new RangeError('Amount exceeds safe presentation range');
  const record=Object.freeze({...r,period:String(r.period),cents,metricLabel,sourceRefs:Object.freeze([...(r.sourceRefs||[])]),limitations:Object.freeze([...(r.limitations||[])])});
  if(!products.has(r.productId))products.set(r.productId,{id:r.productId,label:r.productLabel});
  if(!periods.has(record.period))periods.set(record.period,{id:record.period,label:r.periodLabel||record.period});
  return record;
 });
 if(metrics.size>1)throw new TypeError('Different metrics require separate comparable spaces');
 const pairs=new Set();for(const r of records){const k=r.productId+'\0'+r.period;if(pairs.has(k))throw new TypeError('Duplicate product and period; choose one metric');pairs.add(k);}
 let ordered=[...periods.values()],periodOrderTrusted=false;
 if(Array.isArray(data.periodOrder)&&data.periodOrder.length===ordered.length&&new Set(data.periodOrder).size===ordered.length&&data.periodOrder.every(id=>periods.has(id))){ordered=data.periodOrder.map(id=>periods.get(id));periodOrderTrusted=true;}
 else {const parsed=ordered.map(p=>p.id.match(/^(\d{4})(.*)$/));if(parsed.every(Boolean)&&new Set(parsed.map(m=>m[2])).size===1){ordered.sort((a,b)=>Number(a.id.slice(0,4))-Number(b.id.slice(0,4)));periodOrderTrusted=true;}else if(ordered.every(p=>/^\d{4}(?:H[12]|Q[1-4])$/.test(p.id))&&new Set(ordered.map(p=>p.id[4])).size===1){ordered.sort((a,b)=>a.id.localeCompare(b.id));periodOrderTrusted=true;}}
 const extent=data.amountExtent===undefined?null:data.amountExtent.map(moneyToCents);if(extent&&(extent.length!==2||extent[0]>extent[1]||records.some(r=>r.cents!==null&&(r.cents<extent[0]||r.cents>extent[1]))))throw new TypeError('Shared amount extent must contain all records');
 return Object.freeze({amountExtent:extent?Object.freeze(extent):null,id:data.id||'research',revision:data.revision||'',title:data.title||'产品跨期比较',axisLabel:data.axisLabel||'产品',metricLabel:[...metrics][0]||data.metricLabel||'金额',records:Object.freeze(records),products:Object.freeze([...products.values()]),periods:Object.freeze(ordered),periodOrderTrusted,comparablePeriods:periodOrderTrusted&&ordered.length===2,limitations:Object.freeze([...(data.limitations||[]),...(ordered.length>1&&!periodOrderTrusted?['报告期按来源顺序显示；先后未确认，未计算跨期变化。']:[])])});
}
export function normalizeState(model,input={}){
 const view={...DEFAULT_VIEW,...input.view};
 view.yaw=Math.max(-1.12,Math.min(1.12,Number.isFinite(view.yaw)?view.yaw:DEFAULT_VIEW.yaw));
 view.pitch=Math.max(0,Math.min(1.18,Number.isFinite(view.pitch)?view.pitch:DEFAULT_VIEW.pitch));
 view.zoom=Math.max(.65,Math.min(2.6,Number.isFinite(view.zoom)?view.zoom:1));
 if(!['overview','compare','focus','custom'].includes(view.preset))view.preset='overview';
 if(!['source','delta'].includes(view.order))view.order='source';
 if(view.order==='delta'&&!model.comparablePeriods)view.order='source';
 const period=model.periods.some(p=>p.id===input.period)?input.period:'all';
 const focusId=model.products.some(p=>p.id===input.focusId)?input.focusId:null;
 const first=model.records.find(r=>r.cents!==null)||model.records[0];
 const validSelection=model.records.some(r=>r.id===input.selectedId||r.productId===input.selectedId);
 const selectedId=validSelection?input.selectedId:first?.id||'';
 const requested=model.records.find(r=>r.id===input.measurementId&&(r.id===selectedId||r.productId===selectedId));
 const measurementId=requested?.id||model.records.find(r=>r.id===selectedId)?.id||'';
 return {mode:input.mode==='2d'?'2d':'3d',selectedId,measurementId,paused:!!input.paused,period,focusId,view};
}
export function productDelta(model,productId){if(!model.comparablePeriods)return null;const rr=model.periods.map(p=>model.records.find(r=>r.productId===productId&&r.period===p.id));return rr.length===2&&rr.every(r=>r?.cents!==null&&r?.cents!==undefined)?rr[1].cents-rr[0].cents:null;}
export function selectedRecord(model,state){return model.records.find(r=>r.id===state.measurementId)||model.records.find(r=>r.id===state.selectedId)||model.records.find(r=>r.productId===state.selectedId&&r.period===state.period)||model.records.find(r=>r.productId===state.selectedId)||null;}
export function visibleProducts(model,state){let pp=[...model.products];if(state.focusId)pp=pp.filter(p=>p.id===state.focusId);if(state.view.order==='delta')pp.sort((a,b)=>{const aa=productDelta(model,a.id),bb=productDelta(model,b.id);if(aa===null&&bb===null)return 0;if(aa===null)return 1;if(bb===null)return -1;return aa<bb?-1:aa>bb?1:0;});return pp;}
export function amountDomain(model){
 const vv=[...model.records.filter(r=>r.cents!==null).map(r=>Number(r.cents)/1000000),...(model.amountExtent||[]).map(n=>Number(n)/1000000)],lo=Math.min(0,...vv),hi=Math.max(0,...vv);
 const span=hi-lo||1,raw=span/5,power=10**Math.floor(Math.log10(raw)),base=raw/power,step=(base<=1?1:base<=2?2:base<=5?5:10)*power;
 const min=Math.floor(lo/step)*step,max=Math.ceil(hi/step)*step||step;
 const ticks=[];for(let n=min;n<=max+step*.001;n+=step)ticks.push(Number(n.toPrecision(12)));
 return {min,max,step,ticks,height:6,scale:6/(max-min)};
}
export function spatialLayout(model,state){
 const products=visibleProducts(model,state),periods=model.periods.filter(p=>state.period==='all'||p.id===state.period),domain=amountDomain(model);
 const span=Math.max(1,products.length-1)*1.65,periodSpan=Math.max(1,model.periods.length-1)*2.25;
 const marks=[];
 for(const [pi,p]of products.entries())for(const period of periods){
  const r=model.records.find(r=>r.productId===p.id&&r.period===period.id);if(!r)continue;
  const ti=model.periods.findIndex(x=>x.id===period.id),x=pi*1.65-(products.length-1)*1.65/2+(ti-(model.periods.length-1)/2)*.42,z=ti*2.25-periodSpan/2;
  const value=r.cents===null?null:Number(r.cents)/1000000,height=value===null?0:value*domain.scale;
  marks.push({record:r,x,z,height,y:height/2,width:.32,depth:.56,missing:value===null,periodIndex:ti,productIndex:pi});
 }
 return {products,periods,domain,marks,span,periodSpan,zeroY:0};
}
export function presetView(name,previous=DEFAULT_VIEW){return {...previous,preset:name,zoom:1,...(name==='compare'?{yaw:0,pitch:0}:name==='focus'?{yaw:.65,pitch:.30}:{yaw:.48,pitch:.44})};}
