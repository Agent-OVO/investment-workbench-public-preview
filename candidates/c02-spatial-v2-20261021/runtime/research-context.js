import {REPORTS, candidateHref, parseReport, PUBLIC_BASE, V2_HOME} from '../research-history-data.js';
export const node = (doc, tag, text) => {const value=doc.createElement(tag);if(text!==undefined)value.textContent=text;return value;};
export function link(doc, text, href, external=false) {const value=node(doc,'a',text);value.href=href;if(external){value.target='_blank';value.rel='noopener noreferrer';}return value;}
export function setContext(doc, report) {
  for(const element of doc.querySelectorAll('[data-v2-home]'))element.href=V2_HOME;
  for(const element of doc.querySelectorAll('[data-context-page]'))element.href=candidateHref(element.dataset.contextPage,report?.slug||'');
  const context=doc.querySelector('[data-report-context]');
  if(context)context.textContent=report ? `${report.company} · ${report.researchAsOf} · SHA-256 ${report.sha256}` : '尚未选定研究；不自动回退到其他研究。';
  for(const element of doc.querySelectorAll('[data-shared-original]')){element.hidden=!report;if(report)element.href=PUBLIC_BASE+'research/'+report.slug+'/';else element.removeAttribute('href');}
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
    setContext(doc,result.report);onSelect(result);
  };
  const change=()=>{const slug=select.value;beforeChange();const next=candidateHref(page,slug);if(win.location.pathname+win.location.search!==next)win.history.pushState(null,'',next);apply();};
  const pop=()=>{beforeChange();apply();};
  select.addEventListener('change',change);win.addEventListener('popstate',pop);apply();
  return {refresh:apply,dispose(){select.removeEventListener('change',change);win.removeEventListener('popstate',pop);}};
}
