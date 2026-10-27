// Minimal numerical transcription of the already-public 2026-10-17 question.
// Not a new research period. No source PDF, page image, or private package is distributed.
export const inputs=Object.freeze({
 storage:{label:'储能系统',r0:'17802777589.48',c0:'10696209433.23',r1:'15455765101.22',c1:'10443361762.81'},
 inverter:{label:'光伏逆变器等电力电子转换设备',r0:'15327462208.16',c0:'9848685530.49',r1:'12388453592.48',c1:'7095850685.20'},
 consolidated:{label:'合并口径',r0:'43533124447.18',c0:'28576035628.96',r1:'30912265605.12',c1:'19808104013.62'}
});
const cents=s=>BigInt(s.replace('.',''));
const yuan=c=>`${c<0n?'-':''}${(c<0n?-c:c)/100n}.${String((c<0n?-c:c)%100n).padStart(2,'0')}`;
export const identity=(product,effect='total')=>`report:sungrow:product:${product}:effect:${effect}`;
export const labels={storage:'储能系统',inverter:'逆变器等设备',other:'其他产品余项'};
export const effectLabels={total:'毛利同比变化',revenue:'收入 / 组合效应',margin:'毛利率效应'};
export const SCALE=Object.freeze({min:-40,max:10,unit:'亿元',height:24});
export function calculate(key){
 if(key==='other'){
  const values=['consolidated','storage','inverter'].map(k=>calculate(k));
  const exact= cents(values[0].exactDeltaYuan)-cents(values[1].exactDeltaYuan)-cents(values[2].exactDeltaYuan);
  return {delta:Number(exact)/1e10,exactDeltaYuan:yuan(exact),revenue:null,margin:null};
 }
 const p=inputs[key];if(!p)throw Error('UNKNOWN_SUNGROW_PRODUCT');
 const [r0,c0,r1,c1]=['r0','c0','r1','c1'].map(k=>cents(p[k]));
 const g0=r0-c0,g1=r1-c1,delta=g1-g0;
 // The two rational numerators share r0: their exact sum is delta*r0.
 const revenueNumerator=(r1-r0)*g0,marginNumerator=g1*r0-r1*g0;
 return {delta:Number(delta)/1e10,revenue:Number(revenueNumerator)/Number(r0)/1e10,margin:Number(marginNumerator)/Number(r0)/1e10,exactDeltaYuan:yuan(delta),gross0:Number(g0)/1e10,gross1:Number(g1)/1e10,margin0:Number(g0)/Number(r0),margin1:Number(g1)/Number(r1),rational:{revenueNumerator:String(revenueNumerator),marginNumerator:String(marginNumerator),denominator:String(r0),unit:'分',residual:String(revenueNumerator+marginNumerator-delta*r0)}};
}
export const signed=(value,digits=2)=>(value>0?'+':'')+value.toFixed(digits);
export function lane(value){const x=v=>60+(v-SCALE.min)/(SCALE.max-SCALE.min)*700;return {zero:x(0),end:x(value),x:Math.min(x(0),x(value)),width:Math.abs(x(value)-x(0)),height:SCALE.height};}
