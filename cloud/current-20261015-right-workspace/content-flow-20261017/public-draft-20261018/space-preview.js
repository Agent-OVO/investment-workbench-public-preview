import {validateManifest} from './reader.js';

export const PREVIEW_VARIANT='c02-platform-b';
export const PREVIEW_SURFACE='C02_FOCUS_ART_blank_content_plane';
const abortError=()=>new DOMException('Preview cancelled','AbortError');
const shortened=(text,length)=>Array.from(text).length>length?Array.from(text).slice(0,length).join('')+'…':text;

// This is an exact excerpt from one known source section, not a generated research summary.
export function derivePreview(manifest,model) {
  validateManifest(manifest);
  const index=model?.headings?.[0]?.text!==manifest.title?-1:model?.blocks?.findIndex(block=>block.type==='heading'&&block.level===(manifest.previewHeadingLevel??2)&&block.text===manifest.previewHeading)??-1;
  let excerpt=null;
  if(index>=0)for(const block of model.blocks.slice(index+1)) {
    if(block.type==='heading')break;
    if(block.type==='paragraph'&&block.text.trim()) {excerpt={text:block.text,startLine:block.startLine,endLine:block.endLine};break;}
  }
  return Object.freeze({localDocumentRef:manifest.localDocumentRef,sha256:manifest.sha256,title:manifest.title,
    researchAsOf:manifest.researchAsOf,publicationState:manifest.publicationState,excerpt,
    shortTitle:shortened(manifest.title,18),shortExcerpt:excerpt?shortened(excerpt.text,48):null});
}

// Preserve only the two controller inputs accepted by restorePose, never matrices or lens calibration.
export function allowedPose(diagnostics) {
  const p=diagnostics?.camera?.presentation;
  return p&&Number.isFinite(p.yawDegrees)&&Number.isFinite(p.pitchDegrees)
    ?{presentation:{yawDegrees:p.yawDegrees,pitchDegrees:p.pitchDegrees}}:null;
}
export function projectedBox(anchor,rect) {
  if(!anchor?.inDepth||![anchor.left,anchor.top,anchor.right,anchor.bottom,rect.width,rect.height].every(Number.isFinite))return null;
  const width=(anchor.right-anchor.left)*rect.width,height=(anchor.bottom-anchor.top)*rect.height;
  if(anchor.left<0||anchor.top<0||anchor.right>1||anchor.bottom>1||width<105||height<44)return null;
  return {left:`${anchor.left*100}%`,top:`${anchor.top*100}%`,width:`${width}px`,height:`${height}px`};
}

let threePromise=null;
async function ensureLocalThree(doc) {
  if(globalThis.THREE){if(String(globalThis.THREE.REVISION)!=='149')throw Error('Local Three r149 required');return;}
  if(!threePromise)threePromise=new Promise((resolve,reject)=>{
    const script=doc.createElement('script');script.src=new URL('../../vendor/three.min.js',import.meta.url).href;script.async=true;
    script.addEventListener('load',()=>String(globalThis.THREE?.REVISION)==='149'?resolve():reject(Error('Local Three r149 did not load')),{once:true});
    script.addEventListener('error',()=>{script.remove();reject(Error('Local Three script unavailable'));},{once:true});doc.head.append(script);
  }).catch(error=>{threePromise=null;throw error;});
  return threePromise;
}
async function loadExistingStage({root,signal,onUpdate,doc}) {
  if(signal.aborted)throw abortError();
  await ensureLocalThree(doc);
  if(signal.aborted)throw abortError();
  const {mountStage}=await import('../stage.js');
  if(signal.aborted)throw abortError();
  return mountStage({root,variant:PREVIEW_VARIANT,contentMode:'localDraft',signal,onUpdate});
}

export function createSpacePreview({root,manifest,model,win=globalThis.window,loadStage=loadExistingStage}) {
  const preview=derivePreview(manifest,model),doc=root.ownerDocument,q=selector=>root.querySelector(selector);
  const openButton=q('[data-open-space]'),closeButton=q('[data-close-space]'),readButton=q('[data-space-read]'),shell=q('[data-space-shell]');
  const host=q('[data-space-host]'),layer=host.querySelector('#stage-bindings'),stage=host.querySelector('#stage'),canvas=host.querySelector('#trial-canvas');
  const feedback=q('[data-space-feedback]'),status=q('[data-space-status]'),anchorStatus=q('[data-anchor-status]');
  const title=q('[data-preview-title]'),date=q('[data-preview-date]'),excerpt=q('[data-preview-excerpt]'),source=q('[data-preview-source]');
  title.textContent=preview.title;date.textContent=`研究核验日：${preview.researchAsOf} · ${preview.publicationState}`;
  excerpt.textContent=preview.excerpt?.text||'未提供可确认的原文摘要。完整正文仍可阅读。';
  source.textContent=preview.excerpt?`原文节选：第 ${preview.excerpt.startLine}–${preview.excerpt.endLine} 行；空间内可能显示带省略号的短节选，上方保留整段原文。`:'不从其他段落或标题补造摘要。';
  let active=false,disposed=false,sequence=0,controller=null,handle=null,lastPose=null,readingPosition=null,anchorButton=null;
  const removers=[];
  const listen=(target,name,fn)=>{target.addEventListener(name,fn);removers.push(()=>target.removeEventListener(name,fn));};
  const refocusFallback=()=>{if(doc.activeElement===anchorButton)readButton.focus({preventScroll:true});};
  const clearAnchor=(restoreFocus=true)=>{if(restoreFocus)refocusFallback();layer.replaceChildren();anchorButton=null;};

  function updateAnchor(api,token) {
    if(!active||disposed||token!==sequence)return;
    const diagnostic=api.getDiagnostics();
    if(diagnostic.currentVariant!==PREVIEW_VARIANT||diagnostic.disposed||diagnostic.contextLost){clearAnchor();return;}
    const box=projectedBox(api.getContentAnchors().find(anchor=>anchor.name===PREVIEW_SURFACE),stage.getBoundingClientRect());
    if(!box){clearAnchor();anchorStatus.textContent='中央资料面因裁切或可读空间不足未显示按钮；完整标题、节选及全文入口保留在下方。';return;}
    if(!anchorButton) {
      anchorButton=doc.createElement('button');anchorButton.type='button';anchorButton.className='local-source-anchor';
      anchorButton.dataset.surface=PREVIEW_SURFACE;anchorButton.setAttribute('aria-label',`阅读全文：${preview.title}；${preview.publicationState}`);
      for(const [tag,name,text] of [['b','title',preview.shortTitle],['span','date',preview.researchAsOf],['span','excerpt',preview.shortExcerpt||''],['span','action','阅读全文']]){
        const node=doc.createElement(tag);node.dataset.previewPart=name;node.textContent=text;anchorButton.append(node);
      }
      anchorButton.addEventListener('click',()=>close({destination:'article'}));layer.append(anchorButton);
    }
    Object.assign(anchorButton.style,box);anchorButton.hidden=false;
    const parts=Object.fromEntries([...anchorButton.children].map(node=>[node.dataset.previewPart,node]));
    for(const part of Object.values(parts))part.hidden=false;
    if(!preview.shortExcerpt)parts.excerpt.hidden=true;
    const overflow=()=>anchorButton.scrollHeight>anchorButton.clientHeight||anchorButton.scrollWidth>anchorButton.clientWidth;
    // Reduce only this displayed excerpt. The complete source preview remains in the normal DOM.
    if(overflow())parts.excerpt.hidden=true;
    if(overflow())parts.date.hidden=true;
    if(overflow())parts.title.hidden=true;
    if(overflow()){refocusFallback();anchorButton.hidden=true;anchorStatus.textContent='原锚点放不下可读按钮；请使用下方完整阅读入口。';}
    else anchorStatus.textContent='中央入口使用原固定资料面；标题或节选可省略，完整原文在下方。实际布局与遮挡仍待浏览器验收。';
  }

  function close({destination='restore',message=null}={}) {
    const wasActive=active;
    if(!wasActive&&!handle&&!controller)return;
    lastPose=allowedPose(handle?.getDiagnostics())||lastPose;
    active=false;sequence++;controller?.abort();controller=null;handle?.dispose();handle=null;clearAnchor(false);
    shell.hidden=true;root.classList.remove('space-preview-active');openButton.setAttribute('aria-expanded','false');
    if(message)feedback.textContent=message;
    else feedback.textContent='已返回纯阅读。空间模型与渲染资源已释放；再次打开可恢复允许范围内的视角。';
    if(!wasActive||disposed||destination==='none')return;
    if(destination==='article') {
      const article=q('[data-article]');article.focus({preventScroll:true});article.scrollIntoView({block:'start'});
    } else {
      const target=readingPosition?.focus;
      (target?.isConnected?target:openButton).focus({preventScroll:true});
      if(readingPosition)win.scrollTo(readingPosition.x,readingPosition.y);
    }
  }

  async function open() {
    if(disposed||active)return;
    readingPosition={x:win.scrollX,y:win.scrollY,focus:doc.activeElement};active=true;const token=++sequence;
    const request=controller=new AbortController();shell.hidden=false;root.classList.add('space-preview-active');
    openButton.setAttribute('aria-expanded','true');status.textContent='正在加载固定本地场景，全文保持可读…';
    feedback.textContent='空间预览只绑定这一份已校验公开稿。';closeButton.focus({preventScroll:true});shell.scrollIntoView({block:'start'});
    try {
      const api=await loadStage({root:host,doc,signal:request.signal,onUpdate:current=>updateAnchor(current,token)});
      if(!active||disposed||token!==sequence||request.signal.aborted){api?.dispose();return;}
      handle=api;
      const diagnostic=api.getDiagnostics();
      if(diagnostic.disposed||diagnostic.contextLost||diagnostic.status!=='ready')throw Error('本地场景未能完成装配');
      api.setAnimationPlaying(false);if(lastPose)api.restorePose(lastPose);api.suspend(false);updateAnchor(api,token);
      status.textContent='本地只读公开稿空间预览 · 未保存云端研究库 · 浏览器视觉未验收';
    } catch(error) {
      if(active&&!disposed&&token===sequence)close({message:'空间预览未能加载，完整正文仍可阅读。'+String(error.message||error)});
    }
  }

  openButton.setAttribute('aria-expanded','false');openButton.setAttribute('aria-controls','local-space-preview');shell.id='local-space-preview';
  listen(openButton,'click',()=>{void open();});listen(closeButton,'click',()=>close());listen(readButton,'click',()=>close({destination:'article'}));
  listen(canvas,'webglcontextlost',event=>{
    if(!active)return;event.preventDefault();const token=sequence;
    // Let the existing stage listener record its context-loss state before this caller disposes it.
    Promise.resolve().then(()=>{if(active&&token===sequence)close({message:'图形上下文已丢失，已返回完整正文。可由你重新打开空间预览。'});});
  });
  listen(root,'click',event=>{
    const anchor=event.target.closest?.('a[data-local-anchor]');
    if(active&&anchor&&root.contains(anchor))close({destination:'none'});
  });
  listen(win,'hashchange',()=>{
    if(!active)return;close({destination:'none'});
    if(win.location.hash==='#local-document'||model.headings.some(heading=>'#'+heading.anchor===win.location.hash)){
      const target=doc.getElementById(win.location.hash.slice(1));target?.focus({preventScroll:true});target?.scrollIntoView({block:'start'});
    }
  });
  // mountDraft installs the scale setter first; read layout in this same change event,
  // rather than waiting for camera motion or another renderer update.
  listen(q('[data-reader-scale]'),'change',()=>{if(active&&handle)updateAnchor(handle,sequence);});
  listen(win,'pagehide',()=>close({destination:'none'}));
  return {open,close,preview,getReadingPosition:()=>active?readingPosition:null,getState:()=>({active,disposed,pending:!!controller&&!handle,hasHandle:!!handle,sequence,lastPose}),
    dispose(){if(disposed)return;disposed=true;close({destination:'none'});removers.splice(0).forEach(remove=>remove());}};
}
