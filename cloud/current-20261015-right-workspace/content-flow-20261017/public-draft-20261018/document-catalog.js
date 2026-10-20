import {documentManifest,documentManifests} from './document-manifest.js';

// Metadata-only, in-memory discovery. Filtering never loads or changes a report.
const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('zh-CN').trim();
export const catalogTopics=Object.freeze([...new Set(documentManifests.flatMap(item=>item.topics))]);
export function filterCatalog({query='',topic=''}={}) {
  const terms=normalize(query).split(/\s+/u).filter(Boolean);
  return documentManifests.filter(item=>{
    const text=normalize([item.company,item.securityCode,item.title,item.catalogLabel,...item.topics].join(' '));
    return (!topic||item.topics.includes(topic))&&terms.every(term=>text.includes(term));
  });
}

export function mountDocumentCatalog({root}={}) {
  const doc=root.ownerDocument,q=selector=>root.querySelector(selector);
  const picker=q('[data-document-select]'),search=q('[data-catalog-search]'),topic=q('[data-catalog-topic]');
  const status=q('[data-catalog-status]'),clear=q('[data-catalog-clear]');
  // Existing single-reader embedders can omit the optional discovery controls.
  if(!search||!topic||!status||!clear)return {sync(){},dispose(){}};
  let selectedRef=documentManifest.localDocumentRef,disposed=false;
  const option=(value,label)=>{const node=doc.createElement('option');node.value=value;node.textContent=label;return node;};
  topic.replaceChildren(option('','全部主题'),...catalogTopics.map(label=>option(label,label)));topic.value='';search.value='';
  function render() {
    if(disposed)return;
    const matches=filterCatalog({query:search.value,topic:topic.value});
    const selected=documentManifests.find(item=>item.localDocumentRef===selectedRef)||documentManifest;
    const outside=!matches.includes(selected);
    const options=matches.map(item=>option(item.localDocumentRef,item.catalogLabel));
    if(outside)options.unshift(option(selected.localDocumentRef,'当前选择（不在筛选结果中） · '+selected.catalogLabel));
    picker.replaceChildren(...options);picker.value=selected.localDocumentRef;
    status.textContent=`${matches.length} / ${documentManifests.length} 篇符合筛选。`+
      (outside?'当前选择保留在选择器首项；筛选不会自动切稿。':'请选择报告以阅读完整原稿。');
    clear.disabled=!search.value&&!topic.value;
  }
  const onFilter=()=>render();
  const onClear=()=>{search.value='';topic.value='';render();search.focus();};
  search.addEventListener('input',onFilter);topic.addEventListener('change',onFilter);clear.addEventListener('click',onClear);
  render();
  return {sync(ref){if(disposed)return;if(documentManifests.some(item=>item.localDocumentRef===ref))selectedRef=ref;render();},
    dispose(){if(disposed)return;disposed=true;search.removeEventListener('input',onFilter);topic.removeEventListener('change',onFilter);clear.removeEventListener('click',onClear);}};
}
