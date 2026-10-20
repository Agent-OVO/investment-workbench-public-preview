import {mountDocumentCatalog} from './document-catalog.js';
import {documentManifest,documentManifests} from './document-manifest.js';
import {loadLocalDraft,mountDraft,showLoadError} from './reader.js';

// Owns one reader and one optional bridge. No saved research records or report cache.
export function createDocumentReader({root,baseURL,win=globalThis.window,
  loadDraft=loadLocalDraft,mountReader=mountDraft,loadPreview=()=>import('./space-preview.js'),urlAPI=globalThis.URL,BlobType=globalThis.Blob}={}) {
  const doc=root.ownerDocument,q=selector=>root.querySelector(selector);
  const picker=q('[data-document-select]'),retry=q('[data-document-retry]'),download=q('[data-document-download]');
  picker.disabled=false;
  const catalog=mountDocumentCatalog({root});
  const states=new Map();
  let reader=null,bridge=null,current=null,requested=null,controller=null,sequence=0,disposed=false,loading=false,downloadURL=null;
  const stateKey=manifest=>manifest.localDocumentRef+':'+manifest.sha256;
  const find=ref=>documentManifests.find(manifest=>manifest.localDocumentRef===ref);
  const fromHash=hash=>documentManifests.find(manifest=>hash===`#${manifest.anchorPrefix}-document`||
    new RegExp(`^#${manifest.anchorPrefix}-line-\\d+$`).test(hash))||(/^#local-line-\d+$/.test(hash)?documentManifest:null);
  const isCurrent=(token,request)=>!disposed&&token===sequence&&!request.signal.aborted;

  function clearDownload() {
    if(downloadURL){urlAPI.revokeObjectURL(downloadURL);downloadURL=null;}
    download.hidden=true;download.removeAttribute('href');download.removeAttribute('download');
  }
  function release() {
    if(reader&&current) {
      const position=bridge?.getReadingPosition()||{x:win.scrollX,y:win.scrollY};
      states.set(stateKey(current),reader.captureState(position));
    }
    // A pending scene is aborted synchronously before any new document load or DOM mount.
    bridge?.dispose();bridge=null;reader?.dispose();reader=null;current=null;
    controller?.abort();controller=null;clearDownload();
  }
  function clearDocument() {
    q('[data-ready]').hidden=true;q('[data-loading]').hidden=false;q('[data-space-shell]').hidden=true;
    for(const name of ['article','toc','metadata','raw','limits','preview-title','preview-date','preview-excerpt','preview-source','space-status','anchor-status'])q(`[data-${name}]`).replaceChildren();
    q('[data-source-jump]').hidden=true;q('[data-source-jump]').removeAttribute('href');
    delete q('[data-source-jump]').dataset.localAnchor;
    clearDownload();download.textContent='下载当前原稿（校验后可用）';
    q('[data-toc-count]').textContent='文章目录';
    q('[data-open-space]').disabled=true;retry.hidden=true;
    for(const [name,open] of [['reader-provenance',true],['reader-toc',true],['reader-raw',false]])q(`[data-${name}]`).open=open;
    root.style.setProperty('--reader-text-scale','1');q('[data-reader-scale]').value='100';
  }
  function navigate(hash,manifest) {
    let id=hash.slice(1);
    if(manifest===documentManifest&&/^local-line-\d+$/.test(id))id=id.replace('local-',manifest.anchorPrefix+'-');
    const target=id===`${manifest.anchorPrefix}-document`?q('[data-article]'):doc.getElementById(id);
    if(target&&root.contains(target)){target.focus({preventScroll:true});target.scrollIntoView({block:'start'});return true;}
    return false;
  }
  async function selectDocument(ref,{hash='',updateURL=false}={}) {
    const manifest=find(ref);if(disposed||!manifest)return false;
    if(current===manifest){if(hash){bridge?.close({destination:'none'});navigate(hash,manifest);}return true;}
    const token=++sequence;release();clearDocument();requested=manifest;picker.value=ref;catalog.sync(ref);loading=true;
    const request=controller=new AbortController();
    const status=q('[data-load-status]');status.setAttribute('role','status');status.textContent=`正在读取并校验：${manifest.title}`;
    doc.title=`正在校验 · 本地只读公开研究稿`;
    if(updateURL)win.history.replaceState(win.history.state,'',`#${manifest.anchorPrefix}-document`);
    try {
      const {raw,bytes}=await loadDraft({manifest,baseURL,signal:request.signal,includeBytes:true});
      if(!isCurrent(token,request))return false;
      reader=mountReader({root,manifest,raw,anchorPrefix:manifest.anchorPrefix});current=manifest;loading=false;
      const saved=states.get(stateKey(manifest));
      doc.title=`${manifest.title} · 本地只读公开研究稿`;
      // Preserve the exact verified response bytes (including any BOM); never refetch the source on download.
      try {
        downloadURL=urlAPI.createObjectURL(new BlobType([bytes],{type:'text/markdown;charset=utf-8'}));
        download.href=downloadURL;download.download=manifest.originalFilename;download.hidden=false;
        download.textContent=`下载当前已校验原稿：${manifest.originalFilename}`;
      } catch {clearDownload();}
      reader.restoreState(saved,{focus:!hash});
      if(hash)navigate(hash,manifest);
      else if(saved&&Number.isFinite(saved.y))win.scrollTo(saved.x||0,saved.y);
      else if(updateURL){q('[data-article]').focus({preventScroll:true});q('[data-article]').scrollIntoView({block:'start'});}
      q('[data-space-feedback]').textContent='正文默认可读；只有主动打开空间预览才加载本地三维场景。';
      try {
        const {createSpacePreview}=await loadPreview();
        if(!isCurrent(token,request))return false;
        bridge=createSpacePreview({root,manifest,model:reader.model,win});q('[data-open-space]').disabled=false;
      } catch {
        if(!isCurrent(token,request))return false;
        q('[data-open-space]').disabled=true;
        q('[data-space-feedback]').textContent='空间预览模块未就绪，完整正文仍可阅读。';
      }
      return true;
    } catch(error) {
      if(!isCurrent(token,request))return false;
      // Failed or corrupt B never leaves A's title, download, table, source or preview in view.
      bridge?.dispose();bridge=null;reader?.dispose();reader=null;current=null;clearDocument();
      loading=false;showLoadError(root,error);doc.title='原稿未载入 · 本地只读公开研究稿';retry.hidden=false;
      return false;
    }
  }
  const onSelect=()=>{void selectDocument(picker.value,{updateURL:true});};
  const onRetry=()=>{if(requested)void selectDocument(requested.localDocumentRef);};
  const onHash=()=>{const manifest=fromHash(win.location.hash);if(manifest)void selectDocument(manifest.localDocumentRef,{hash:win.location.hash});};
  // pagehide only releases scene resources via the bridge; keep the reader valid for bfcache returns.
  picker.addEventListener('change',onSelect);retry.addEventListener('click',onRetry);win.addEventListener('hashchange',onHash);
  return {start:()=>{const manifest=fromHash(win.location.hash)||documentManifest;return selectDocument(manifest.localDocumentRef,{hash:win.location.hash});},
    selectDocument,getState:()=>({disposed,pending:loading,currentRef:current?.localDocumentRef||null,requestedRef:requested?.localDocumentRef||null,sequence}),
    dispose(){if(disposed)return;disposed=true;loading=false;sequence++;release();catalog.dispose();picker.removeEventListener('change',onSelect);retry.removeEventListener('click',onRetry);win.removeEventListener('hashchange',onHash);}};
}
