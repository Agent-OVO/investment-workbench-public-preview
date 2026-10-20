import {resolveReport,safeReturnAnchor} from '../route-model.js';

// Material changes keep the same real document and an allowed research return
// anchor. Refresh needs no router, opener window, previous page or fullscreen.
export function materialHref(pathname,search,finish,slug){
  const params=new URLSearchParams();
  const manifest=resolveReport(slug);
  const anchor=manifest?safeReturnAnchor(new URLSearchParams(search).get('return'),manifest):'';
  if(anchor)params.set('return',anchor);
  if(finish==='original')params.set('finish','original');
  return pathname+(params.size?'?'+params.toString():'');
}

export function wireMaterialLinks(doc,location){
  for(const link of doc.querySelectorAll('[data-scene-finish]'))link.href=materialHref(location.pathname,location.search,link.dataset.sceneFinish,doc.body.dataset.document);
}

if(globalThis.document?.body?.classList.contains('wb-scene-root'))wireMaterialLinks(document,location);
