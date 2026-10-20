// Catalog state is local to this fixed route. Query text never becomes HTML or a destination.
export const CATALOG_PATH='/investment-workbench-public-preview/workbench-review/research/';
export const QUERY_LIMIT=160;
export function normalizeQuery(value){return String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,QUERY_LIMIT).replace(/[\ud800-\udbff]$/,'');}
export function queryFromSearch(search){return normalizeQuery(new URLSearchParams(search).get('q'));}
export function catalogHref(query,{resume=false}={}){
 const params=new URLSearchParams(),q=normalizeQuery(query);
 if(q)params.set('q',q);if(resume)params.set('resume','1');
 return CATALOG_PATH+(params.size?'?'+params.toString():'');
}
export function catalogReportHref(href,query,baseURL){
 const url=new URL(href,baseURL),base=new URL(baseURL);
 if(url.origin!==base.origin||!/^\/investment-workbench-public-preview\/workbench-review\/research\/[a-z][a-z0-9-]*\/$/.test(url.pathname))return null;
 const params=new URLSearchParams(),q=normalizeQuery(query);
 if(q)params.set('q',q);params.set('catalog','1');
 return url.pathname+'?'+params.toString()+url.hash;
}
export function validSnapshot(value,query){
 if(!value||value.query!==normalizeQuery(query)||!Number.isFinite(value.scrollY)||value.scrollY<0||value.scrollY>10000000||typeof value.focus!=='string'||!/^(?:|search|clear|link-\d{1,3})$/.test(value.focus))return null;
 return {query:value.query,scrollY:value.scrollY,focus:value.focus};
}
const key=query=>'workbench-catalog:'+normalizeQuery(query);
export function loadSnapshot(win,query){try{return validSnapshot(JSON.parse(win.sessionStorage.getItem(key(query))),query);}catch{return null;}}
export function saveSnapshot(win,snapshot){try{win.sessionStorage.setItem(key(snapshot.query),JSON.stringify(snapshot));}catch{/* URL query and ordinary navigation still work without storage. */}}
