import { INPUT } from './data.js';
export const REPORT='report:sinoseal';
export const SNAPSHOT='snapshot:sinoseal:2026-10-17';
export const REVISION='2026-10-24';
export const OBJECTS=['judgment','repair','pressure','support','limit'];
export const TABS=['explain','calculation','evidence','assumptions','snapshot'];
export const cents=v=>v===null?null:BigInt(v.replace('.',''));
export function rounded(n,d){const sign=n<0n?-1n:1n; n=n<0n?-n:n; return sign*((n+d/2n)/d);}
export function decimal(n,places=2){const neg=n<0n;const s=(neg?-n:n).toString().padStart(places+1,'0');return (neg?'−':'')+s.slice(0,-places)+'.'+s.slice(-places);}
export function money(n,unit='wanyuan',signed=false){if(n===null)return '未列示';const val=unit==='yuan'?n:rounded(n,10000n); const s=decimal(val);const [whole,frac]=s.split('.');return (signed&&n>0n?'+':'')+whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+frac;}
export function pct(a,b){return b===0n?'不可计算':decimal(rounded(a*10000n,b))+'%';}
export const productIds=[...new Set(INPUT.rows.map(r=>r.row_id))];
export const rows=productIds.map(id=>{
 const periods=['2025H1','2026H1'].map(p=>{const r=INPUT.rows.find(x=>x.row_id===id&&x.period===p);return {...r,revenueCents:cents(r.revenue),costCents:cents(r.cost),gross:r.cost===null?null:cents(r.revenue)-cents(r.cost)};});
 return {id,label:periods[0].label,periods,delta:periods.some(r=>r.gross===null)?null:periods[1].gross-periods[0].gross};
});
export const byId=Object.fromEntries(rows.map(r=>[r.id,r]));
export const group=INPUT.consolidated.map(r=>({...r,revenueCents:cents(r.revenue),costCents:cents(r.cost),gross:cents(r.revenue)-cents(r.cost)}));
export const groupDelta=group[1].gross-group[0].gross;
export const repair=byId.repair;
export const combined=repair.delta+byId['spare-parts'].delta;
export const selectedThree=repair.delta+byId['dry-gas-seals'].delta+byId['auxiliary-systems'].delta;
export const auditGap=group[0].costCents-rows.reduce((a,r)=>a+(r.periods[0].costCents??0n),0n);
export const defaults={report:REPORT,snapshot:SNAPSHOT,verification:REVISION,selection:'judgment',product:null,tab:'explain',evidence:null,view:'workspace',source:null,mode:'spatial',camera:'default',paused:false};
export function normalize(state={}){const s={...defaults,...state};if(!OBJECTS.includes(s.selection))s.selection='judgment';if(!TABS.includes(s.tab))s.tab='explain';if(!productIds.includes(s.product))s.product=null;if(!['spatial','flat'].includes(s.mode))s.mode='spatial';if(!['workspace','source','table'].includes(s.view))s.view='workspace';if(!['H125','H126','IR0908'].includes(s.source))s.source=null;if(!['default','left','right','top'].includes(s.camera))s.camera='default';s.paused=!!s.paused;s.report=REPORT;s.snapshot=SNAPSHOT;s.verification=REVISION;return s;}
export function reduce(state,action){const s=normalize(state);switch(action.type){case 'select': return normalize({...s,selection:action.id,product:action.product??(action.id==='repair'?'repair':action.id==='pressure'?'dry-gas-seals':s.product),evidence:action.id==='support'?'numeric':action.id==='limit'?'repair-replaces-new':s.evidence,tab:action.id==='support'||action.id==='limit'?'evidence':s.tab});case 'tab':return normalize({...s,tab:action.tab});case 'source':return normalize({...s,view:'source',source:action.source});case 'table':return normalize({...s,view:'table'});case 'view':return normalize({...s,...action.patch});default:return s;}}
export const comparisonId=id=>`${REPORT}:comparison:${id}:gross-profit:2026H1-vs-2025H1`;
