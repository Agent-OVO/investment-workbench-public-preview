import {loadLocalDraft,mountDraft,showLoadError} from './content-adapter.js';
import {resolveReport,REPORT_BASE,spaceHref,closestReturnAnchor} from './route-model.js';

export function createReportPage({root,slug,win=globalThis.window,loadDraft=loadLocalDraft,mountReader=mountDraft,urlAPI=globalThis.URL,BlobType=globalThis.Blob}={}){
 const manifest=resolveReport(slug);if(!manifest)throw Error('UNKNOWN_REPORT');
 const q=s=>root.querySelector(s),download=q('[data-download]'),retry=q('[data-report-retry]');
 let sequence=0,controller=null,reader=null,blob=null,disposed=false;
 const fallback=q('[data-static-fallback]');
 const fallbackHeadings=fallback?(()=>{const walk=node=>[...node.children].flatMap(child=>[child,...walk(child)]);return walk(fallback).filter(node=>node.id).map(node=>({node,id:node.id}));})():[];
 const showFallback=visible=>{if(!fallback)return;fallback.hidden=!visible;for(const {node,id} of fallbackHeadings)node.id=visible?id:'snapshot-hidden-'+id;};
 const stateKey='workbench-reading:'+slug+':'+manifest.sha256;
 const saveReading=()=>{try{const state=reader?.captureState?.({x:win.scrollX||0,y:win.scrollY||0});if(state)win.sessionStorage?.setItem(stateKey,JSON.stringify(state));}catch{}};
 const restoreReading=()=>{try{const saved=JSON.parse(win.sessionStorage?.getItem(stateKey)||'null');if(saved){reader.restoreState?.(saved,{focus:false});const fromHistory=win.performance?.getEntriesByType?.('navigation')?.[0]?.type==='back_forward';if((fromHistory||!win.location.hash)&&Number.isFinite(saved.y)){win.scrollTo?.(saved.x||0,saved.y);return true;}}}catch{}return false;};
 const release=()=>{saveReading();controller?.abort();controller=null;reader?.dispose();reader=null;q('[data-article]')?.replaceChildren();if(blob){urlAPI.revokeObjectURL(blob);blob=null;}download.hidden=true;download.removeAttribute('href');};
 async function start(){if(disposed)return false;const token=++sequence;release();controller=new AbortController();const request=controller;
  showFallback(true);q('[data-ready]').hidden=true;q('[data-loading]').hidden=false;retry.hidden=true;q('[data-load-status]').textContent='正在读取并校验原稿…';
  try{const {raw,bytes}=await loadDraft({manifest,baseURL:REPORT_BASE.href,signal:request.signal,includeBytes:true});
   if(disposed||token!==sequence||request.signal.aborted)return false;
   showFallback(false);reader=mountReader({root,manifest,raw,anchorPrefix:manifest.anchorPrefix,signal:request.signal});const restoredPosition=restoreReading();
   blob=urlAPI.createObjectURL(new BlobType([bytes],{type:'text/markdown;charset=utf-8'}));download.href=blob;download.download=manifest.originalFilename;download.hidden=false;
   const anchor=win.location.hash.slice(1);if(anchor&&!restoredPosition){const target=root.ownerDocument.getElementById(anchor);if(target&&root.contains(target)){target.focus({preventScroll:true});target.scrollIntoView({block:'start'});}}
   return true;
  }catch(error){if(disposed||token!==sequence||request.signal.aborted)return false;release();showLoadError(root,error);if(fallback){showFallback(true);q('[data-load-status]').textContent+=' 下方完整静态正文仍可阅读。';}q('[data-load-status]').textContent+=' 诊断：'+String(error?.message||'LOAD_FAILED').replace(/[^A-Z0-9_]/g,'').slice(0,80);retry.hidden=false;return false;}}
 const onRetry=()=>void start();retry.addEventListener('click',onRetry);
 const onLink=event=>{const link=event.target.closest?.('a');if(!link||!root.contains(link)||!link.href)return;
  const url=new URL(link.href,win.location.href);if(url.pathname!==spaceHref(slug))return;
  const headings=[...q('[data-article]').querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]')].map(node=>({id:node.id,top:node.getBoundingClientRect().top}));
  link.href=spaceHref(slug,closestReturnAnchor(headings,manifest));
 };root.addEventListener('click',onLink);
 const onHide=event=>{saveReading();if(!event.persisted)dispose();};win.addEventListener('pagehide',onHide);
 function dispose(){if(disposed)return;disposed=true;sequence++;release();retry.removeEventListener('click',onRetry);root.removeEventListener('click',onLink);win.removeEventListener('pagehide',onHide);}
 return {start,dispose,getState:()=>({disposed,sequence,hasReader:!!reader,hasDownload:!!blob})};
}
if(globalThis.document?.body?.dataset.page==='report'){
 const page=createReportPage({root:document.querySelector('[data-report-root]'),slug:document.body.dataset.document});void page.start();
}
