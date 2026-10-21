import {parseReader, HONGHUA_BEFORE, CORRECTION, historyFor, findReport, downloadName} from '../research-history-data.js';
import {node,link,mountChoice} from './research-context.js';
import {parseMarkdown,renderMarkdown,inlinePlainText} from '/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/markdown.js';
import {resolveReport} from '/investment-workbench-public-preview/workbench-review/route-model.js';
import {mountTopicImages} from '/investment-workbench-public-preview/workbench-review/topic-images.js';
// Same public bytes and renderer; this wrapper owns only candidate context and request lifecycle.
export async function loadSnapshot({report,archive=false,baseURL,fetcher=globalThis.fetch,subtle=globalThis.crypto?.subtle,signal}) {
  const known=findReport(report?.slug);
  if(!known || known.sha256!==report.sha256 || known.source!==report.source || known.bytes!==report.bytes)throw Error('UNKNOWN_REPORT');
  const source=archive?HONGHUA_BEFORE:known,base=new URL(baseURL),url=new URL(source.source,base);
  if(archive&&report.slug!=='honghua')throw Error('UNKNOWN_SNAPSHOT');
  if(!/^https?:$/.test(url.protocol)||url.origin!==base.origin)throw Error('SAME_ORIGIN_REQUIRED');
  if(!subtle)throw Error('INTEGRITY_UNAVAILABLE');
  const response=await fetcher(url.href,{method:'GET',credentials:'omit',mode:'same-origin',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal});
  if(!response.ok)throw Error('SOURCE_HTTP_'+response.status);
  const bytes=new Uint8Array(await response.arrayBuffer());if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  const hash=Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==source.sha256 || (!archive&&bytes.length!==report.bytes))throw Error('INTEGRITY_MISMATCH');
  const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const model=parseMarkdown(raw,{anchorPrefix:report.anchorPrefix});
  if(model.headings[0]?.text!==report.title)throw Error('TITLE_MISMATCH');
  return {raw,bytes,model,sha256:source.sha256};
}
const mounted=new WeakMap();
export function mountReader(doc=document,win=window,{load=loadSnapshot}={}) {
  mounted.get(doc)?.dispose();const q=s=>doc.querySelector(s),article=q('[data-reader-article]'),status=q('[data-reader-status]');
  let sequence=0,controller=null,disposeImages=()=>{},blob=null,disposed=false,result=null;
  const release=()=>{controller?.abort();controller=null;disposeImages();disposeImages=()=>{};if(blob){win.URL.revokeObjectURL(blob);blob=null;}article.replaceChildren();q('[data-reader-toc]').replaceChildren();q('[data-reader-raw]').textContent='';q('[data-reader-raw-box]').hidden=true;q('[data-reader-download]').hidden=true;q('[data-reader-download]').removeAttribute('href');};
  const start=async selection=>{
    result=selection;const token=++sequence;release();q('[data-reader-retry]').hidden=true;q('[data-reader-notice]').hidden=true;
    if(!selection.report){status.textContent='未选定有效研究，不显示替代原文。';return false;}
    const report=selection.report;
    if(selection.archive)q('[data-report-context]').textContent=`${report.company} · 修订前归档（相关论证已撤回） · 研究时点 ${report.researchAsOf} · SHA-256 ${HONGHUA_BEFORE.sha256}`;
    controller=new AbortController();const request=controller;let timer=win.setTimeout(()=>request.abort(),20000);
    status.setAttribute('role','status');status.textContent='正在读取并校验对应公开原稿…';
    const note=q('[data-reader-notice]');note.hidden=false;note.replaceChildren(node(doc,'p',historyFor(report.slug).limitation));
    const manifest=resolveReport(report.slug);
    if(!selection.archive&&manifest?.sha256===report.sha256){
      const details=node(doc,'details');details.append(node(doc,'summary','原公开稿的日期、来源与提供范围'),node(doc,'p',manifest.dateStatement),node(doc,'p',manifest.sourceHandling));const limits=node(doc,'ul');for(const text of manifest.limits||[])limits.append(node(doc,'li',text));details.append(limits);note.append(details);
    }
    if(report.slug==='honghua')note.append(node(doc,'p',selection.archive?'这是修订前归档，相关论证已撤回。候选复盘导航明确绑定当前修订稿，不把归档当作有效结论。':CORRECTION.after));
    try{
      const loaded=await load({report,archive:selection.archive,baseURL:win.location.href,signal:request.signal});
      if(disposed||token!==sequence||request.signal.aborted)return false;
      article.replaceChildren(renderMarkdown(doc,loaded.model));q('[data-reader-raw]').textContent=loaded.raw;q('[data-reader-raw-box]').hidden=false;
      for(const heading of loaded.model.headings.filter(h=>h.level>1))q('[data-reader-toc]').append(link(doc,inlinePlainText(heading.text),'#'+heading.anchor));
      // The existing image loader validates the public manifest and image hashes.
      if(!selection.archive&&manifest?.sha256===report.sha256&&manifest.schema==='local-public-topic-v1'){
        const images=mountTopicImages({article,model:loaded.model,manifest,baseURL:win.location.href,signal:request.signal});disposeImages=()=>images.dispose?.();
      }
      blob=win.URL.createObjectURL(new win.Blob([loaded.bytes],{type:'text/markdown;charset=utf-8'}));const download=q('[data-reader-download]');download.href=blob;download.download=downloadName(report.company,selection.archive?'已撤回旧稿':'公开研究原稿',report.researchAsOf.slice(0,10),'md');download.hidden=false;
      status.textContent=`${selection.archive?'撤回论证的归档原稿':'当前公开原稿'}校验通过 · SHA-256 ${loaded.sha256}。未重新核验原研究事实。`;
      const anchor=win.location.hash.slice(1);if(new RegExp('^'+report.anchorPrefix+'-line-\\d+$').test(anchor)){const target=doc.getElementById(anchor);if(target&&article.contains(target)){target.focus?.({preventScroll:true});target.scrollIntoView?.({block:'start'});}}
      return true;
    }catch(error){if(disposed||token!==sequence)return false;release();status.textContent='对应原稿载入或校验失败，未显示替代内容。可重试或打开本研究的共享原文页。'+(request.signal.aborted?' 请求已取消或超时。':'');status.setAttribute('role','alert');q('[data-reader-retry]').hidden=false;return false;}
    finally{win.clearTimeout(timer);}
  };
  const choice=mountChoice(doc,win,{page:'reader',parse:parseReader,onSelect:selection=>void start(selection)});
  const retry=()=>{status.setAttribute('role','status');void start(result);};q('[data-reader-retry]').addEventListener('click',retry);
  const handle={start,getState:()=>({sequence,disposed,report:result?.report?.slug||null}),dispose(){if(disposed)return;disposed=true;sequence++;release();choice.dispose();q('[data-reader-retry]').removeEventListener('click',retry);mounted.delete(doc);}};
  mounted.set(doc,handle);return handle;
}
if(globalThis.document?.body?.dataset.page==='candidate-reader')mountReader();
