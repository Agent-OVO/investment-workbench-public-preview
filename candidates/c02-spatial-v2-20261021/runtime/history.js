import {historyFor, findReport, candidateHref, CORRECTION, HONGHUA_BEFORE, PUBLIC_BASE} from '../research-history-data.js';
import {node,link,mountChoice} from './research-context.js';
export function renderHistory(doc,root,slug) {
  root.replaceChildren();if(!slug)return;
  const data=historyFor(slug),report=data.report;
  root.append(node(doc,'h2',report.company+' · '+data.kind),node(doc,'p',data.limitation));
  const list=node(doc,'ol');list.className='wb-timeline';
  if(data.correction){
    const old=node(doc,'li');old.append(node(doc,'h3','修订前归档 · 相关论证已撤回'),node(doc,'p',CORRECTION.before),link(doc,'阅读完整修订前原件',candidateHref('reader','honghua',{archive:true})),node(doc,'p','SHA-256：'+HONGHUA_BEFORE.sha256));list.append(old);
  }
  const current=node(doc,'li');current.append(node(doc,'h3',data.correction?'2026-10-18 局部修订 · 当前原稿':'当前公开原稿'),node(doc,'p',report.title),node(doc,'p','研究时点：'+report.researchAsOf),node(doc,'p','SHA-256：'+report.sha256));
  if(data.correction){current.append(node(doc,'p',CORRECTION.after),node(doc,'p',CORRECTION.boundary));const sources=node(doc,'ul');for(const [label,href] of CORRECTION.sources){const item=node(doc,'li');item.append(link(doc,label,href,true));sources.append(item);}current.append(sources);}
  const nav=node(doc,'nav');nav.className='wb-context-links';nav.setAttribute('aria-label','本研究导航');nav.append(link(doc,'阅读当前原稿',candidateHref('reader',slug)),link(doc,'记录当前原稿复盘',candidateHref('review',slug)),link(doc,'共享来源页（新标签）',PUBLIC_BASE+'evidence/#'+slug,true));current.append(nav);list.append(current);root.append(list);
  if(data.related.length){root.append(node(doc,'h3','同专题补充关系，不是全文版本替换'));for(const related of data.related){const report=findReport(related);root.append(link(doc,report.company+' · 查看独立记录',candidateHref('history',related)));}}
  if(slug==='banks'){const nav=node(doc,'nav');nav.className='wb-context-links';nav.append(link(doc,'当前公开范围说明（README）',PUBLIC_BASE+'bank-evidence/README.txt',true),link(doc,'六份财报来源索引（JSON）',PUBLIC_BASE+'bank-evidence/source-urls.json',true));root.append(nav,node(doc,'p','索引中的哈希对应原研究留存原件，不表示 PDF 随站点分发，也不表示本次重新下载核验。没有可下载 ZIP 的承诺。'));}
}
export function mountHistory(doc=document,win=window){return mountChoice(doc,win,{page:'history',onSelect:result=>renderHistory(doc,doc.querySelector('[data-history]'),result.report?.slug)});}
if(globalThis.document?.body?.dataset.page==='candidate-history')mountHistory();
