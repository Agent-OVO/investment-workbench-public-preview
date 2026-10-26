import {productIds} from './core.js';
import {reports,getReport} from './registry.js';
import {readerIndex} from './readers-index.js';
export const readerMeta=slug=>Object.hasOwn(readerIndex,slug)?readerIndex[slug]:null;
export const safePublicAnchor=(slug,value)=>{const m=readerMeta(slug);return m?.headings.some(h=>h.id===value)?value:m?.headings[0]?.id||'';};
// Route, selection and history contracts contain no DOM or renderer objects.
export const STATE_SCHEMA=1;
export const PRODUCTS=['dry-gas-seals','auxiliary-systems','repair'];
export const SOURCES=['H125','H126','IR0908'];
export const YT_SOURCES=['H126','FY25','OPS26','OPS25','IR','MINE','SULF','POM','PARTNER','FUND8','DIV','MAP','DAP'];
export const YT_METRICS=['price','cost','gross'];
export function safeReturnAnchor(value){return typeof value==='string'&&/^local-yuntianhua-line-\d+$/.test(value)?value:'local-yuntianhua-line-30';}
export const DEFAULT_STATE=Object.freeze({schema:STATE_SCHEMA,product:'repair',selectedId:'report:sinoseal:product:repair',paused:false,mode:'spatial',detail:'evidence',camera:'default',filter:'',chartMode:'delta',ytMetric:'gross',ytSelectedId:'report:yuntianhua:metric:gross',ytAnchor:'local-yuntianhua-line-30',reviewReport:'sinoseal',readerSlug:'sungrow',readerAnchor:'local-sungrow-line-1',readerTarget:null});
const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,160);
export function normalizeState(input={}){
 const s={...DEFAULT_STATE,...input,schema:STATE_SCHEMA};
 if(!productIds.includes(s.product))s.product='repair';
 // This presentation selects a disclosed product; source/record/comparison IDs
 // remain provenance metadata and cannot become a competing business selection.
 s.selectedId='report:sinoseal:product:'+s.product;
 s.paused=s.paused===true||s.paused==='1';s.mode=s.mode==='flat'?'flat':'spatial';
 s.detail=['evidence','numbers','scope'].includes(s.detail)?s.detail:'evidence';
 s.chartMode=s.chartMode==='margin'?'margin':'delta';
 s.ytMetric=YT_METRICS.includes(s.ytMetric)?s.ytMetric:'gross';s.ytSelectedId='report:yuntianhua:metric:'+s.ytMetric;s.ytAnchor=safeReturnAnchor(s.ytAnchor);s.reviewReport=getReport(s.reviewReport)?s.reviewReport:'sinoseal';s.readerSlug=readerMeta(s.readerSlug)?s.readerSlug:'sungrow';s.readerAnchor=safePublicAnchor(s.readerSlug,s.readerAnchor);
 const t=s.readerTarget;s.readerTarget=t&&typeof t==='object'&&t.slug===s.readerSlug&&t.anchor===s.readerAnchor&&['anchor','position','top'].includes(t.kind)?{kind:t.kind,slug:s.readerSlug,anchor:s.readerAnchor,scroll:Number.isFinite(t.scroll)&&t.scroll>=0&&t.scroll<=1e7?t.scroll:0,focus:typeof t.focus==='string'&&/^[a-zA-Z0-9:_-]{1,200}$/.test(t.focus)?t.focus:t.kind==='anchor'?s.readerAnchor:'page-title'}:null;
 s.camera=['default','source'].includes(s.camera)?s.camera:'default';s.filter=clean(s.filter);return s;
}
export function reduceState(state,action){
 const s=normalizeState(state);
 switch(action.type){
  case 'select':return normalizeState({...s,product:action.product??s.product,selectedId:action.id||'report:sinoseal:product:'+(action.product??s.product)});
  case 'ytMetric':return normalizeState({...s,ytMetric:action.value});
  case 'readerAnchor':return normalizeState({...s,readerSlug:action.slug||s.readerSlug,readerAnchor:action.value});
  case 'ytAnchor':return normalizeState({...s,ytAnchor:action.value});
  case 'pause':return normalizeState({...s,paused:action.value??!s.paused});
  case 'detail':return normalizeState({...s,detail:action.value});
  case 'chartMode':return normalizeState({...s,chartMode:action.value});
  case 'mode':return normalizeState({...s,mode:action.value});
  case 'filter':return normalizeState({...s,filter:action.value});
  case 'restore':return normalizeState(action.state);
  default:return s;
 }
}
export function parseRoute(pathname,basePath='/'){
 const suffix=pathname.startsWith(basePath)?pathname.slice(basePath.length):'__outside__';
 const p=suffix.replace(/^\/+|\/+$/g,'').replace(/(?:^|\/)index\.html$/,'').split('/').filter(Boolean);
 if(!p.length)return {kind:'home',path:''};
 if(p[0]==='research'&&p.length===1)return {kind:'catalog',path:'research/'};
 if((p[0]==='research'||p[0]==='space')&&p[1]==='sinoseal'&&p.length===2)return {kind:'workspace',path:p.join('/')+'/',slug:'sinoseal'};
 if((p[0]==='research'||p[0]==='space')&&p[1]==='yuntianhua'&&p.length===2)return {kind:'reader',path:p.join('/')+'/',slug:'yuntianhua'};
 if(p[0]==='sources'&&p.length===3&&p[1]==='yuntianhua'&&YT_SOURCES.includes(p[2]))return {kind:'readerSource',path:p.join('/')+'/',slug:'yuntianhua',source:p[2]};
 if(p[0]==='originals'&&p[1]==='sinoseal'&&p.length===2)return {kind:'publicReader',path:p.join('/')+'/',slug:'sinoseal'};
 if(['research','space'].includes(p[0])&&p.length===2&&readerMeta(p[1])&&p[1]!=='sinoseal')return {kind:'publicReader',path:p.join('/')+'/',slug:p[1]};
 if(p[0]==='sources'&&p.length===3&&readerMeta(p[1])?.sources.some(s=>s.id===p[2]))return {kind:'publicSource',path:p.join('/')+'/',slug:p[1],source:p[2]};
 if(p[0]==='space'&&p.length===1)return {kind:'space',path:'space/'};
 if(['sources','evidence'].includes(p[0])&&p.length===1)return {kind:'sources',path:p[0]+'/'};
 if(p[0]==='sources'&&p.length===3&&p[1]==='sinoseal'&&SOURCES.includes(p[2]))return {kind:'source',path:p.join('/')+'/',slug:'sinoseal',source:p[2]};
 if(['history','review','models'].includes(p[0])&&p.length===1)return {kind:p[0],path:p[0]+'/'};
 return {kind:'notfound',path:suffix};
}
export function stateFromSearch(search,defaults={}){
 const q=new URLSearchParams(search),s={...defaults};
 for(const key of ['product','selectedId','mode','detail','filter','chartMode','ytMetric','ytAnchor','reviewReport','readerSlug','readerAnchor'])if(q.has(key))s[key]=q.get(key);
 if(q.has('product')&&!q.has('selectedId'))s.selectedId='report:sinoseal:product:'+s.product;
 if(q.has('paused'))s.paused=q.get('paused')==='1';
 return normalizeState(s);
}
export function searchFromState(state,{compact=false,scope='all'}={}){
 const s=normalizeState(state),q=new URLSearchParams();
 if(scope==='yuntianhua'){q.set('ytMetric',s.ytMetric);if(s.ytAnchor!=='local-yuntianhua-line-30')q.set('ytAnchor',s.ytAnchor);q.set('paused',s.paused?'1':'0');if(s.mode==='flat')q.set('mode','flat');return q.toString();}
 if(scope==='public'){q.set('readerSlug',s.readerSlug);q.set('readerAnchor',s.readerAnchor);q.set('paused',s.paused?'1':'0');if(s.mode==='flat')q.set('mode','flat');return q.toString();}
 if(scope==='review'){q.set('reviewReport',s.reviewReport);q.set('paused',s.paused?'1':'0');return q.toString();}
 if(!compact||s.product!=='repair')q.set('product',s.product);
 if(s.selectedId!=='report:sinoseal:product:'+s.product)q.set('selectedId',s.selectedId);
 q.set('paused',s.paused?'1':'0');if(s.mode==='flat')q.set('mode','flat');
 if(s.chartMode==='margin')q.set('chartMode','margin');
 if(scope==='all'){q.set('readerSlug',s.readerSlug);q.set('readerAnchor',s.readerAnchor);if(s.ytMetric!=='gross')q.set('ytMetric',s.ytMetric);if(s.ytAnchor!=='local-yuntianhua-line-30')q.set('ytAnchor',s.ytAnchor);if(s.reviewReport!=='sinoseal')q.set('reviewReport',s.reviewReport);}
 if(s.detail!=='evidence')q.set('detail',s.detail);if(s.filter)q.set('filter',s.filter);return q.toString();
}
export function validContext(value){
 if(!value||value.schema!==STATE_SCHEMA||typeof value.path!=='string'||value.path.length>500||!Number.isFinite(value.scroll)||value.scroll<0||value.scroll>1e7)return null;
 return {schema:STATE_SCHEMA,path:value.path,state:normalizeState(value.state),scroll:value.scroll,focus:typeof value.focus==='string'?value.focus.slice(0,200):'',returnContext:value.returnContext||null};
}
