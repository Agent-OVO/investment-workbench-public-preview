// Preserve the original eight-report whitelist and rendering contracts.
import * as legacy from '../cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/reader.js';
import {derivePreview as legacyPreview} from '../cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/space-preview.js';
import * as topic from './topic-reader.js';
const isTopic=manifest=>manifest?.schema==='local-public-topic-v1';
export async function loadLocalDraft(options){
 const controller=new AbortController(),parent=options.signal,fetcher=options.fetcher||globalThis.fetch;
 let timer,abortReject;
 const cancelled=new Promise((_,reject)=>{abortReject=reject;});
 const cancel=()=>{controller.abort();abortReject(new DOMException('Document cancelled','AbortError'));};
 parent?.addEventListener('abort',cancel,{once:true});
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('LOCAL_DOCUMENT_TIMEOUT'));},options.timeoutMs??20000);});
 if(parent?.aborted)cancel();
 try{return await Promise.race([(isTopic(options.manifest)?topic:legacy).loadLocalDraft({...options,signal:controller.signal,fetcher:async(...args)=>{const response=await fetcher(...args);if(!response.ok)throw Error('LOCAL_DOCUMENT_HTTP_'+response.status);return response;}}),deadline,cancelled]);}
 finally{clearTimeout(timer);parent?.removeEventListener('abort',cancel);}
}
export const mountDraft=options=>(isTopic(options.manifest)?topic:legacy).mountDraft(options);
export const derivePreview=(manifest,model)=>(isTopic(manifest)?topic.derivePreview:legacyPreview)(manifest,model);
export const showLoadError=legacy.showLoadError;
