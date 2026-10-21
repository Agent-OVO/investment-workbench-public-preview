import {mountSpatialModel} from './spatial-model.js';
// Context is supplied by the reviewed reader/history route modules; this file never reads review content.
if(document.body.dataset.page==='candidate-history') {let model=null;mountSpatialModel({field:document.querySelector('.time-field'),mode:'history'}).then(h=>{model=h;});window.addEventListener('pagehide',e=>{if(!e.persisted)model?.dispose();});}
if(document.body.dataset.page==='candidate-reader') {const button=document.querySelector('[data-reader-font]'),folio=document.querySelector('.reading-folio');button.addEventListener('click',()=>{const enabled=folio.classList.toggle('is-large');button.setAttribute('aria-pressed',String(enabled));button.textContent=enabled?'标准字号':'大字阅读';});}

if(globalThis.document?.fonts){document.fonts.ready.then(()=>{const faces=[...document.fonts].filter(f=>['Atelier Sans','Atelier Serif'].includes(f.family.replaceAll('\"','')));document.body.dataset.fontsState=faces.length===2&&faces.every(f=>f.status==='loaded')&&document.fonts.check('18px "Atelier Sans"','研究来源')&&document.fonts.check('28px "Atelier Serif"','研究总览')?'loaded':'fallback';});}
