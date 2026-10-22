import {spaceHref} from './multispace-data.js';
import {REPORTS, candidateHref, parseReport, PUBLIC_BASE, V2_HOME, HONGHUA_BEFORE} from '../research-history-data.js';
export const node = (doc, tag, text) => {const value=doc.createElement(tag);if(text!==undefined)value.textContent=text;return value;};
export function link(doc, text, href, external=false) {const value=node(doc,'a',text);value.href=href;if(external){value.target='_blank';value.rel='noopener noreferrer';}return value;}
export function setContext(doc, report, {archive=false}={}) {
  archive=archive&&report?.slug==='honghua';
  for(const element of doc.querySelectorAll('[data-v2-home]')){element.href=spaceHref('overview',report?.slug||'');if(!(element.className||'').includes('brand')){if(!element.dataset.homeLabel)element.dataset.homeLabel=element.textContent;element.textContent=archive?'返回当前修订稿总览':element.dataset.homeLabel;}if(archive)element.setAttribute('aria-label','返回当前修订稿总览，退出归档');else element.removeAttribute('aria-label');}
  for(const element of doc.querySelectorAll('[data-context-page]')){
    const page=element.dataset.contextPage;if(!element.dataset.contextLabel)element.dataset.contextLabel=element.textContent;
    let href=['overview','study'].includes(page)?spaceHref(page,report?.slug||''):candidateHref(page,report?.slug||'',{archive:archive&&page==='reader'});
    if(archive&&page==='history')href+='&version=before';element.href=href;
    if(archive&&page==='review')element.textContent='记录当前修订稿复盘';
    else if(archive&&page==='overview')element.textContent='01 当前总览';
    else if(archive&&page==='study')element.textContent='02 当前关系';
    else element.textContent=element.dataset.contextLabel;
  }
  const context=doc.querySelector('[data-report-context]');
  if(context)context.textContent=report ? `${report.company} · ${archive?'修订前归档（相关论证已撤回） · ':''}${report.researchAsOf} · SHA-256 ${archive?HONGHUA_BEFORE.sha256:report.sha256}` : '尚未选定研究；不自动回退到其他研究。';
  for(const element of doc.querySelectorAll('[data-shared-original]')){element.hidden=!report;if(report){element.href=archive?HONGHUA_BEFORE.source:PUBLIC_BASE+'research/'+report.slug+'/';element.textContent=archive?'共享修订前原件（已撤回论证） ↗':'共享当前原文页 ↗';}else element.removeAttribute('href');}
  for(const element of doc.querySelectorAll('[data-shared-evidence]')){element.hidden=!report;if(report)element.href=PUBLIC_BASE+'evidence/#'+report.slug;else element.removeAttribute('href');}
}
// The selector is explicit; URL changes are same-origin fixed candidate paths only.
export function mountChoice(doc, win, {page, onSelect, beforeChange=()=>{}, parse=parseReport}) {
  const select=doc.querySelector('[data-report-select]'), status=doc.querySelector('[data-route-status]');
  const option=node(doc,'option','请选择一份公开研究');option.value='';
  select.replaceChildren(option,...REPORTS.map(report=>{const option=node(doc,'option',report.company);option.value=report.slug;return option;}));
  const apply=()=>{
    const result=parse(win.location.search);select.value=result.report?.slug||'';
    status.textContent=result.message||'已按地址绑定研究；历史、原文和复盘导航保持同一研究标识。';
    status.setAttribute('role',result.kind==='error'?'alert':'status');
    setContext(doc,result.report,{archive:!!result.archive});onSelect(result);
  };
  const change=()=>{const slug=select.value;beforeChange();const next=candidateHref(page,slug);if(win.location.pathname+win.location.search!==next)win.history.pushState(null,'',next);apply();};
  const pop=()=>{beforeChange();apply();};
  select.addEventListener('change',change);win.addEventListener('popstate',pop);apply();
  return {refresh:apply,dispose(){select.removeEventListener('change',change);win.removeEventListener('popstate',pop);}};
}
