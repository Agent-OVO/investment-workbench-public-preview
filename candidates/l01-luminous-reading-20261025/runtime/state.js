// Route, selection and history contracts contain no DOM or renderer objects.
export const STATE_SCHEMA=1;
export const PRODUCTS=['dry-gas-seals','auxiliary-systems','repair'];
export const SOURCES=['H125','H126','IR0908'];
export const DEFAULT_STATE=Object.freeze({schema:STATE_SCHEMA,product:'repair',selectedId:'report:sinoseal:product:repair',paused:false,mode:'spatial',detail:'evidence',camera:'default',filter:''});
const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,160);
export function normalizeState(input={}){
 const s={...DEFAULT_STATE,...input,schema:STATE_SCHEMA};
 if(!/^[a-z][a-z0-9-]*$/.test(s.product))s.product='repair';
 if(!Object.hasOwn(input,'selectedId')||typeof s.selectedId!=='string'||s.selectedId.length>200||(s.selectedId.includes(':product:')&&!s.selectedId.endsWith(':product:'+s.product)))s.selectedId='report:sinoseal:product:'+s.product;
 s.paused=s.paused===true||s.paused==='1';s.mode=s.mode==='flat'?'flat':'spatial';
 s.detail=['evidence','numbers','scope'].includes(s.detail)?s.detail:'evidence';
 s.camera=['default','source'].includes(s.camera)?s.camera:'default';s.filter=clean(s.filter);return s;
}
export function reduceState(state,action){
 const s=normalizeState(state);
 switch(action.type){
  case 'select':return normalizeState({...s,product:action.product??s.product,selectedId:action.id||'report:sinoseal:product:'+(action.product??s.product)});
  case 'pause':return normalizeState({...s,paused:action.value??!s.paused});
  case 'detail':return normalizeState({...s,detail:action.value});
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
 if(p[0]==='space'&&p.length===1)return {kind:'space',path:'space/'};
 if(['sources','evidence'].includes(p[0])&&p.length===1)return {kind:'sources',path:p[0]+'/'};
 if(p[0]==='sources'&&p.length===3&&p[1]==='sinoseal'&&SOURCES.includes(p[2]))return {kind:'source',path:p.join('/')+'/',slug:'sinoseal',source:p[2]};
 if(['history','review','models'].includes(p[0])&&p.length===1)return {kind:p[0],path:p[0]+'/'};
 return {kind:'notfound',path:suffix};
}
export function stateFromSearch(search,defaults={}){
 const q=new URLSearchParams(search),s={...defaults};
 for(const key of ['product','selectedId','mode','detail','filter'])if(q.has(key))s[key]=q.get(key);
 if(q.has('product')&&!q.has('selectedId'))s.selectedId='report:sinoseal:product:'+s.product;
 if(q.has('paused'))s.paused=q.get('paused')==='1';
 return normalizeState(s);
}
export function searchFromState(state,{compact=false}={}){
 const s=normalizeState(state),q=new URLSearchParams();
 if(!compact||s.product!=='repair')q.set('product',s.product);
 if(s.selectedId!=='report:sinoseal:product:'+s.product)q.set('selectedId',s.selectedId);
 q.set('paused',s.paused?'1':'0');if(s.mode==='flat')q.set('mode','flat');
 if(s.detail!=='evidence')q.set('detail',s.detail);if(s.filter)q.set('filter',s.filter);return q.toString();
}
export function validContext(value){
 if(!value||value.schema!==STATE_SCHEMA||typeof value.path!=='string'||value.path.length>500||!Number.isFinite(value.scroll)||value.scroll<0||value.scroll>1e7)return null;
 return {schema:STATE_SCHEMA,path:value.path,state:normalizeState(value.state),scroll:value.scroll,focus:typeof value.focus==='string'?value.focus.slice(0,200):'',returnContext:value.returnContext||null};
}
