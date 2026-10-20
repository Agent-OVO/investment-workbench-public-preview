import {createSpacePage} from '../space.js';
import {createThreeLoader} from './three-loader.js';
import {isC02Study} from './c02-study.js';
import {createC02ContentSession} from './c02-content-session.js';
const ensureThree=createThreeLoader(document,globalThis);
const study=isC02Study(location.pathname,location.search);
const studySession=study?createC02ContentSession():null;
async function mountStudyContent(api,host,contentTicket,signal){
 if(!contentTicket?.current()||signal.aborted)return;
 const {mountC02Content}=await import('./c02-content.js');
 if(contentTicket.current()&&!signal.aborted){
  const content=await mountC02Content({api,host,signal:contentTicket.signal});
  studySession.adopt(contentTicket,content);
 }
}
async function loadStage({host,variant,signal,onUpdate}) {
  const contentTicket=studySession?.begin();
  let api;
  try{
    await ensureThree();
    if(signal.aborted)throw new DOMException('Cancelled','AbortError');
    const original=new URLSearchParams(location.search).get('finish')==='original';
    const module=await import(original?'./original-framed-stage.js':study?'./c02-study-stage.js':'./refined-stage.js');
    api=await module.mountStage({root:host,variant,signal,onUpdate:api=>{onUpdate(api);studySession?.update();},contentMode:'localDraft'});
  }catch(error){
    // Public reading does not depend on Three, stage-module loading or WebGL startup.
    if(study)await mountStudyContent({getContentAnchors:()=>[],getDiagnostics:()=>({status:'failed'})},host,contentTicket,signal);
    throw error;
  }
  if(signal.aborted||(study&&!contentTicket?.current()))return api;
  // Read-only diagnostics handle for reproducible browser checks, no account data.
  globalThis.__workbenchStage=api;
  if(study)await mountStudyContent(api,host,contentTicket,signal);
  if(signal.aborted||(study&&!contentTicket?.current()))return api;
  const controls=document.querySelector('[data-breeze-controls]'),button=document.querySelector('[data-breeze]');
  if(controls){controls.hidden=!api.getDiagnostics().animation.available||api.getDiagnostics().reducedMotion;button.onclick=()=>{const next=!api.getDiagnostics().animation.playing;api.setAnimationPlaying(next);button.setAttribute('aria-pressed',String(next));button.textContent=next?'暂停树冠微风':'播放树冠微风';};document.querySelector('[data-breeze-reset]').onclick=()=>{api.setAnimationTime(0);button.setAttribute('aria-pressed','false');button.textContent='播放树冠微风';};}
  return api;
}
if(study){document.body.classList.add('c02-study');const css=document.createElement('link');css.rel='stylesheet';css.href='/investment-workbench-public-preview/workbench-review/continuity/c02-content.css';document.head.append(css);}
const kind=document.body.dataset.page;
if(['refined-space','refined-model'].includes(kind)){
  const page=createSpacePage({root:document.querySelector('main'),slug:document.body.dataset.document,modelOnly:kind==='refined-model',loadStage});
  if(studySession){const disposePage=page.dispose;page.dispose=()=>{studySession.dispose();disposePage();};}
  globalThis.__workbenchPage=page;void page.start().then(()=>studySession?.update());
  const original=new URLSearchParams(location.search).get('finish')==='original';
  const label=document.querySelector('[data-finish-label]');if(label)label.textContent=original?'V6 原始材质与灯光 · 窄屏取景适配':'本地精修候选 · 原始机位 · 窄屏取景适配';
  if(label&&isC02Study(location.pathname,location.search))label.textContent='C02 玻璃／金属／石材精修样板 · 同稿五视角 · 视觉待验收';
}
