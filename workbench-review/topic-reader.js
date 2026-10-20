import {topicManifests} from './topic-manifest.js';
import {mountTopicImages} from './topic-images.js';
import {parseMarkdown,renderMarkdown,inlinePlainText} from '../cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/markdown.js';

const identityKeys=['caseId','resultId','revision','versionId','evidenceId','relationId','synthetic'];
export function validateTopicManifest(manifest) {
  const registered=topicManifests.find(item=>item.slug===manifest?.slug);
  if(!registered||manifest.schema!=='local-public-topic-v1'||manifest.mode!=='localDraft'||manifest.businessBound!==false)throw Error('LOCAL_TOPIC_CONTRACT');
  if(identityKeys.some(key=>key in manifest))throw Error('CLOUD_OR_DEMO_IDENTITY_NOT_ALLOWED');
  if(JSON.stringify(manifest)!==JSON.stringify(registered))throw Error('LOCAL_TOPIC_MANIFEST_MISMATCH');
  return registered;
}
export async function verifyTopicBytes(bytes,manifest,subtle=globalThis.crypto?.subtle) {
  validateTopicManifest(manifest);
  if(!subtle)throw Error('INTEGRITY_UNAVAILABLE');
  if(bytes.byteLength!==manifest.bytes)throw Error('INTEGRITY_MISMATCH');
  const hash=Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==manifest.sha256)throw Error('INTEGRITY_MISMATCH');
  const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(!raw.trim())throw Error('LOCAL_DOCUMENT_EMPTY');
  if(parseMarkdown(raw,{anchorPrefix:manifest.anchorPrefix}).headings[0]?.text!==manifest.title)throw Error('LOCAL_DOCUMENT_TITLE_MISMATCH');
  return raw;
}
export async function loadLocalDraft({manifest,baseURL,fetcher=globalThis.fetch,subtle=globalThis.crypto?.subtle,signal,includeBytes=false}) {
  validateTopicManifest(manifest);
  if(signal?.aborted)throw new DOMException('Document cancelled','AbortError');
  const base=new URL(baseURL),url=new URL(manifest.localDocumentRef,base);
  if(!/^https?:$/.test(url.protocol)||url.origin!==base.origin)throw Error('LOCAL_HTTP_REQUIRED');
  const response=await fetcher(url.href,{method:'GET',credentials:'same-origin',mode:'same-origin',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',...(signal?{signal}:{})});
  if(!response.ok)throw Error('LOCAL_DOCUMENT_LOAD_FAILED');
  const bytes=new Uint8Array(await response.arrayBuffer()),raw=await verifyTopicBytes(bytes,manifest,subtle);
  if(signal?.aborted)throw new DOMException('Document cancelled','AbortError');
  return includeBytes?{raw,bytes}:raw;
}
export function derivePreview(manifest,model) {
  validateTopicManifest(manifest);
  const index=model?.headings?.[0]?.text!==manifest.title?-1:model.blocks.findIndex(block=>block.type==='heading'&&block.level===(manifest.previewHeadingLevel??2)&&block.text===manifest.previewHeading);
  let excerpt=null;
  if(index>=0)for(const block of model.blocks.slice(index+1)){if(block.type==='heading')break;if(block.type==='paragraph'&&block.text.trim()&&!block.text.startsWith('![')){excerpt={text:block.text,startLine:block.startLine,endLine:block.endLine};break;}}
  return Object.freeze({localDocumentRef:manifest.localDocumentRef,sha256:manifest.sha256,title:manifest.title,researchAsOf:manifest.researchAsOf,publicationState:manifest.publicationState,excerpt});
}

function make(doc,tag,text) {const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;return node;}
export function showLoadError(root,error) {
  const status=root.querySelector('[data-load-status]');status.setAttribute('role','alert');
  const messages={INTEGRITY_MISMATCH:'原稿校验不一致，未显示内容。请恢复与清单一致的原稿文件。',INTEGRITY_UNAVAILABLE:'此环境不能核对原稿 SHA-256，未显示内容。请通过已有 HTTPS 或 localhost 静态服务打开。',LOCAL_HTTP_REQUIRED:'请通过已有 HTTPS 或 localhost 静态服务打开本入口，不能直接使用 file://。',LOCAL_DOCUMENT_EMPTY:'未提供完整正文。'};
  status.textContent=messages[error?.message]||'公开稿未载入，未显示正文。请检查本候选的本地原稿与路径；不会改用演示或云端内容。';
  root.querySelector('[data-loading]').hidden=false;
  root.querySelector('[data-ready]').hidden=true;
}

export function mountDraft({root,manifest,raw,anchorPrefix='local',signal,fetcher,subtle,urlAPI,BlobType,baseURL=new URL('./',import.meta.url).href}) {
  validateTopicManifest(manifest);
  const doc=root.ownerDocument,model=parseMarkdown(raw,{anchorPrefix});
  if(!raw.trim())throw Error('LOCAL_DOCUMENT_EMPTY');
  if(model.headings[0]?.text!==manifest.title)throw Error('LOCAL_DOCUMENT_TITLE_MISMATCH');
  const article=root.querySelector('[data-article]'),toc=root.querySelector('[data-toc]'),metadata=root.querySelector('[data-metadata]');
  root.style.setProperty('--reader-text-scale','1');
  article.replaceChildren(renderMarkdown(doc,model));
  root.querySelector('[data-raw]').textContent=raw;
  root.querySelector('[data-publication-state]').textContent=manifest.publicationState;
  const fields=[['研究类型',manifest.documentKind==='topic-supplement'?'同专题独立补充':'多公司专题'],['覆盖公司',manifest.companies.map(c=>c.name+' '+c.marketCode).join('；')],['信息截止 / 编制',manifest.researchAsOf],['行情基准',manifest.priceAsOf],['财务截止',manifest.financialAsOf],['本地文件引用',manifest.localDocumentRef],[manifest.originalSourceSHA256?'公开节选 SHA-256':'原稿 SHA-256',manifest.sha256],['来源',`${manifest.sourcesCount} 次原文公开链接引用，${manifest.uniqueSourcesCount} 个唯一 URL。${manifest.sourceHandling}`],['内容范围',manifest.contentScope]];
  metadata.replaceChildren();
  for(const [label,value] of fields) {const row=make(doc,'div');row.append(make(doc,'dt',label),make(doc,'dd',value));metadata.append(row);}
  const limits=root.querySelector('[data-limits]');limits.replaceChildren(...manifest.limits.map(text=>make(doc,'li',text)));
  toc.replaceChildren();
  for(const heading of model.headings.filter(h=>h.level>1)) {
    const link=make(doc,'a',inlinePlainText(heading.text));link.href=`#${heading.anchor}`;link.dataset.localAnchor=heading.anchor;
    if(heading.level>2)link.className='local-subheading';toc.append(link);
  }
  root.querySelector('[data-toc-count]').textContent=`文章目录 · ${model.headings.filter(h=>h.level===2).length} 节`;
  const sourceHeading=model.headings.find(h=>h.text===manifest.sourceHeading);
  const sourceJump=root.querySelector('[data-source-jump]');sourceJump.hidden=!sourceHeading;sourceJump.textContent=manifest.sourceJumpLabel||'查看原文来源链接';
  if(sourceHeading){sourceJump.href=`#${sourceHeading.anchor}`;sourceJump.dataset.localAnchor=sourceHeading.anchor;}
  root.querySelector('[data-ready]').hidden=false;root.querySelector('[data-loading]').hidden=true;
  root.querySelector('[data-load-status]').setAttribute('role','status');
  root.querySelector('[data-load-status]').textContent=`${manifest.originalSourceSHA256?'公开节选校验通过':'原稿校验通过'} · ${manifest.bytes.toLocaleString('en-US')} 字节 · ${manifest.originalSourceSHA256?'当前公开版已载入':'全文已载入'}`;
  const auxiliaryChart=mountTopicImages({article,model,manifest,baseURL,signal,fetcher,subtle,urlAPI,BlobType});
  const interactiveHost=root.querySelector('[data-interactive-chart]');let disposeInteractive=()=>{},interactiveDisposed=false;
  let interactiveReady=Promise.resolve(false);
  if(manifest.slug==='banks'&&interactiveHost){
    interactiveHost.hidden=false;interactiveHost.textContent='正在准备公开数据交互图，完整原文与原配图继续可读…';
    interactiveReady=import('./bank-interactive.js').then(({mountBankInteractive})=>{
      if(interactiveDisposed||signal?.aborted)return false;
      disposeInteractive=mountBankInteractive({host:interactiveHost,manifest});return true;
    }).catch(()=>{if(!interactiveDisposed&&!signal?.aborted){interactiveHost.replaceChildren();interactiveHost.hidden=false;interactiveHost.textContent='交互图暂未载入；完整原文、数值表和原报告配图仍可读。';}return false;});
  }

  const scale=root.querySelector('[data-reader-scale]');scale.value='100';
  const onScale=()=>{if(['100','125','150','200'].includes(scale.value))root.style.setProperty('--reader-text-scale',String(Number(scale.value)/100));};
  const onClick=event=>{const link=event.target.closest?.('a[data-local-anchor]');if(link&&root.contains(link))doc.getElementById(link.dataset.localAnchor)?.focus({preventScroll:true});};
  scale.addEventListener('change',onScale);root.addEventListener('click',onClick);
  let lastFocus=null,disposed=false;
  const isCatalogControl=target=>['document-select','catalog-search','catalog-topic','catalog-clear'].some(name=>target===root.querySelector(`[data-${name}]`));
  const onFocus=event=>{if(!isCatalogControl(event.target))lastFocus=event.target;};
  root.addEventListener('focusin',onFocus);
  const sections=['reader-provenance','reader-toc','reader-raw'];
  const focusPath=target=>{
    if(!target||!root.contains(target))return null;
    const path=[];
    while(target!==root){const parent=target.parentElement;if(!parent)return null;path.unshift([...parent.children].indexOf(target));target=parent;}
    return path;
  };
  return {model,imagesReady:auxiliaryChart.ready,interactiveReady,captureState(position={}) {
    const selected=isCatalogControl(doc.activeElement);
    return {scale:scale.value,details:Object.fromEntries(sections.map(name=>[name,root.querySelector(`[data-${name}]`)?.open])),
      tables:[...article.querySelectorAll('.local-table-scroll')].map(node=>({id:node.id,left:node.scrollLeft})),
      focus:focusPath(position.focus||(selected?lastFocus:doc.activeElement)),x:position.x,y:position.y};
  },restoreState(state,{focus=true}={}) {
    if(!state)return;
    if(['100','125','150','200'].includes(state.scale)){scale.value=state.scale;onScale();}
    for(const name of sections){const node=root.querySelector(`[data-${name}]`);if(node&&typeof state.details?.[name]==='boolean')node.open=state.details[name];}
    for(const table of state.tables||[]){const node=doc.getElementById(table.id);if(node&&article.contains(node))node.scrollLeft=table.left;}
    if(focus&&state.focus){let node=root;for(const index of state.focus)node=node?.children[index];if(node&&root.contains(node)){node.focus?.({preventScroll:true});lastFocus=node;}}
  },dispose(){if(disposed)return;disposed=true;interactiveDisposed=true;disposeInteractive();if(interactiveHost){interactiveHost.replaceChildren();interactiveHost.hidden=true;}auxiliaryChart.dispose();scale.removeEventListener('change',onScale);root.removeEventListener('click',onClick);root.removeEventListener('focusin',onFocus);}};
}
