import {loadLocalDraft} from '/investment-workbench-public-preview/workbench-review/content-adapter.js';
import {parseMarkdown} from '/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/markdown.js';
import {derivePreview} from '/investment-workbench-public-preview/workbench-review/content-adapter.js';
import {projectedBox,PREVIEW_SURFACE,allowedPose} from '/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/space-preview.js';
import {resolveReport,reportHref,returnHref,REPORT_BASE,MODEL_VARIANTS} from '/investment-workbench-public-preview/workbench-review/route-model.js';
let threeReady;
async function ensureThree(doc){
 if(globalThis.THREE){if(String(globalThis.THREE.REVISION)!=='149')throw Error('THREE_REVISION_MISMATCH');return;}
 if(!threeReady)threeReady=new Promise((resolve,reject)=>{const s=doc.createElement('script');s.src=new URL('/investment-workbench-public-preview/cloud/current-20261015-right-workspace/vendor/three.min.js',location.origin).href;s.addEventListener('load',()=>String(globalThis.THREE?.REVISION)==='149'?resolve():reject(Error('THREE_REVISION_MISMATCH')),{once:true});s.addEventListener('error',()=>{s.remove();reject(Error('THREE_UNAVAILABLE'));},{once:true});doc.head.append(s);}).catch(e=>{threeReady=null;throw e;});return threeReady;
}
async function loadExistingStage({host,variant,signal,onUpdate}){await ensureThree(host.ownerDocument);if(signal.aborted)throw new DOMException('Cancelled','AbortError');const {mountStage}=await import('/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/stage.js');return mountStage({root:host,variant,contentMode:'localDraft',signal,onUpdate});}

export function createSpacePage({root,slug,modelOnly=false,win=globalThis.window,loadDraft=loadLocalDraft,loadStage=loadExistingStage}={}){
 const doc=root.ownerDocument,host=root.querySelector('[data-stage-host]'),q=s=>root.querySelector(s),feedback=q('[data-space-feedback]');
 const manifest=modelOnly?null:resolveReport(slug),variant=modelOnly?MODEL_VARIANTS[slug]:MODEL_VARIANTS.c02;
 if(!variant||(!modelOnly&&!manifest))throw Error('UNKNOWN_SPACE');
 const stage=host.querySelector('#stage'),layer=host.querySelector('#stage-bindings'),canvas=host.querySelector('#trial-canvas');
 let controller=null,handle=null,sequence=0,disposed=false,preview=null,anchor=null,contextLost=false;
 const destination=manifest?returnHref(slug,win.location.search):null;
 if(manifest)for(const link of root.querySelectorAll('a')){if(new URL(link.href,win.location.href).pathname===reportHref(slug))link.href=destination;}
 const poseKey='workbench-view:'+slug;
 const savePose=()=>{const pose=allowedPose(handle?.getDiagnostics());if(pose)try{win.sessionStorage?.setItem(poseKey,JSON.stringify(pose));}catch{}};
 const restorePose=api=>{try{const saved=JSON.parse(win.sessionStorage?.getItem(poseKey)||'null');const p=saved?.presentation;if(p&&Number.isFinite(p.yawDegrees)&&Number.isFinite(p.pitchDegrees))api.restorePose({presentation:{yawDegrees:p.yawDegrees,pitchDegrees:p.pitchDegrees}});}catch{}};
 const removeAnchor=()=>{layer.replaceChildren();anchor=null;};
 function project(api,token){if(disposed||token!==sequence||!preview)return;const d=api.getDiagnostics();
  if(d.disposed||d.contextLost||d.currentVariant!==MODEL_VARIANTS.c02){removeAnchor();return;}
  const box=projectedBox(api.getContentAnchors().find(a=>a.name===PREVIEW_SURFACE),stage.getBoundingClientRect());
  if(!box){removeAnchor();q('[data-anchor-status]').textContent='中央入口当前裁切；页面顶部与下方均保留完整阅读链接。';return;}
  if(!anchor){anchor=doc.createElement('a');anchor.className='wb-scene-anchor';anchor.href=destination;anchor.setAttribute('aria-label','阅读全文：'+manifest.title);const company=doc.createElement('strong');company.textContent=manifest.company;const action=doc.createElement('span');action.textContent='进入完整研究 ↗';anchor.append(company,action);layer.append(anchor);}
  Object.assign(anchor.style,box);anchor.hidden=false;
  if(anchor.scrollWidth>anchor.clientWidth||anchor.scrollHeight>anchor.clientHeight){anchor.hidden=true;q('[data-anchor-status]').textContent='资料面不足以容纳清晰文字；请使用顶部全文链接。';}else q('[data-anchor-status]').textContent='中央资料面可进入当前原稿的独立全文页面。';
 }
 const release=()=>{savePose();controller?.abort();controller=null;handle?.dispose();handle=null;removeAnchor();};
 async function start(){if(disposed)return false;const token=++sequence;release();controller=new AbortController();const request=controller;preview=null;if(manifest){q('[data-preview-excerpt]').textContent='节选将在原稿重新核验后显示。';q('[data-preview-source]').textContent='';}
  feedback.textContent=modelOnly?'正在加载 C02 完整空间，并核验公开研究…':'正在核验公开原稿，再载入全页面空间…';
  try{if(manifest){const {raw}=await loadDraft({manifest,baseURL:REPORT_BASE.href,signal:request.signal,includeBytes:true});if(disposed||token!==sequence||request.signal.aborted)return false;preview=derivePreview(manifest,parseMarkdown(raw,{anchorPrefix:manifest.anchorPrefix}));q('[data-preview-excerpt]').textContent=preview.excerpt?.text||'未提供可确认的原文摘要。';q('[data-preview-source]').textContent=preview.excerpt?`原文第 ${preview.excerpt.startLine}–${preview.excerpt.endLine} 行，未改写。`:'';}
   const api=await loadStage({host,variant,signal:request.signal,onUpdate:current=>project(current,token)});
   if(disposed||token!==sequence||request.signal.aborted){api?.dispose();return false;}handle=api;const d=api.getDiagnostics();if(d.status!=='ready'||d.contextLost||d.disposed)throw Error('SCENE_NOT_READY');
   api.setAnimationPlaying(false);restorePose(api);project(api,token);feedback.textContent=modelOnly?'空间已载入。研究图文绑定状态见页面提示；视觉与性能尚未验收。':'原稿已校验，C02 空间已加载。全文在独立页面，模型不代表已登记证据关系。';
   if(modelOnly)host.querySelector('#status').textContent='C02 完整空间 V1 候选 · 等待图文绑定核验 · 视觉未验收';return true;
  }catch(error){if(disposed||token!==sequence||request.signal.aborted)return false;release();feedback.textContent=manifest?'空间未能载入。请用“阅读全文”进入原稿页面；不会展示替代研究。':'3D 未能载入。已校验研究仍可独立阅读，也可返回模型档案。';host.querySelector('#status').textContent='载入失败：'+String(error.message||error);return false;}}
 const fullscreen=q('[data-fullscreen]'),retry=q('[data-page-retry]');
 const onRetry=()=>{if(contextLost){win.location.reload();return;}void start();};retry.addEventListener('click',onRetry);
 const onFullscreen=async()=>{try{if(doc.fullscreenElement)await doc.exitFullscreen();else if(host.requestFullscreen)await host.requestFullscreen();else feedback.textContent='当前浏览器不支持沉浸全屏，仍可在此独立空间页面阅读。';}catch{feedback.textContent='未进入沉浸全屏，独立空间页面仍保持可用。';}};
 const onFullscreenChange=()=>{fullscreen.textContent=doc.fullscreenElement?'退出全屏':'沉浸全屏';};
 const onHide=event=>{savePose();if(event.persisted)handle?.suspend(true);else dispose();};
 const onShow=event=>{if(event.persisted){if(handle)handle.suspend(false);else void start();}};
 const onLost=()=>{contextLost=true;removeAnchor();feedback.textContent='图形上下文已丢失。全文链接保持可用，可重载模型。';};
 fullscreen.addEventListener('click',onFullscreen);doc.addEventListener('fullscreenchange',onFullscreenChange);win.addEventListener('pagehide',onHide);win.addEventListener('pageshow',onShow);canvas.addEventListener('webglcontextlost',onLost);
 function dispose(){if(disposed)return;disposed=true;sequence++;release();retry.removeEventListener('click',onRetry);fullscreen.removeEventListener('click',onFullscreen);doc.removeEventListener('fullscreenchange',onFullscreenChange);win.removeEventListener('pagehide',onHide);win.removeEventListener('pageshow',onShow);canvas.removeEventListener('webglcontextlost',onLost);}
 return {start,dispose,getState:()=>({disposed,sequence,hasScene:!!handle,modelOnly,variant})};
}
if(['space','model'].includes(globalThis.document?.body?.dataset.page)){const page=createSpacePage({root:document.querySelector('main'),slug:document.body.dataset.document,modelOnly:document.body.dataset.page==='model'});void page.start();}
