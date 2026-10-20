// Only registered original-report PNGs can become images. Markdown itself never
// grants network access, and bytes are verified before any blob URL is exposed.
async function fetchVerifiedPNG({image,url,fetcher=globalThis.fetch,subtle=globalThis.crypto?.subtle,signal}) {
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  if(!subtle)throw Error('INTEGRITY_UNAVAILABLE');
  const response=await fetcher(url,{method:'GET',credentials:'same-origin',mode:'same-origin',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',...(signal?{signal}:{})});
  if(!response.ok)throw Error('IMAGE_LOAD_FAILED');
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength!==image.bytes)throw Error('IMAGE_INTEGRITY_MISMATCH');
  const hash=Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==image.sha256)throw Error('IMAGE_INTEGRITY_MISMATCH');
  const signature=[137,80,78,71,13,10,26,10];
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length<24||signature.some((v,i)=>bytes[i]!==v)||view.getUint32(16)!==image.width||view.getUint32(20)!==image.height)throw Error('IMAGE_FORMAT_MISMATCH');
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  return bytes;
}

export async function loadVerifiedPNG(options){
 const controller=new AbortController(),parent=options.signal;let timer,abortReject;
 const cancelled=new Promise((_,reject)=>{abortReject=reject;});
 const cancel=()=>{controller.abort();abortReject(new DOMException('Image cancelled','AbortError'));};
 parent?.addEventListener('abort',cancel,{once:true});
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('IMAGE_LOAD_TIMEOUT'));},options.timeoutMs??20000);});
 if(parent?.aborted)cancel();
 try{return await Promise.race([fetchVerifiedPNG({...options,signal:controller.signal}),cancelled,deadline]);}
 finally{clearTimeout(timer);parent?.removeEventListener('abort',cancel);}
}

export function imageURL(manifest,image,baseURL) {
  if(!manifest.images.includes(image)||!/^([a-z]+\/)[^/]+\.png$/u.test(image.ref)||image.ref.includes('..')||/[\\?#%]/u.test(image.ref))throw Error('IMAGE_REF_NOT_ALLOWED');
  const base=new URL(baseURL),report=new URL(manifest.localDocumentRef,base),url=new URL(image.ref,report);
  if(!/^https?:$/.test(base.protocol)||report.origin!==base.origin||url.origin!==base.origin||!url.pathname.startsWith(report.pathname.slice(0,report.pathname.lastIndexOf('/')+1)))throw Error('LOCAL_HTTP_REQUIRED');
  return url.href;
}

export function mountTopicImages({article,model,manifest,baseURL,signal,fetcher,subtle,urlAPI=globalThis.URL,BlobType=globalThis.Blob}) {
  const doc=article.ownerDocument,controller=new AbortController(),figures=[],cleanups=[];
  let disposed=false;
  const stop=()=>controller.abort();signal?.addEventListener('abort',stop,{once:true});if(signal?.aborted)stop();
  const descendants=node=>[...node.children].flatMap(child=>[child,...descendants(child)]);
  for(const block of model.blocks) {
    if(block.type!=='paragraph')continue;
    const match=/^!\[([^\]\n]*)\]\(([^)\n]+)\)$/u.exec(block.text.trim());
    if(!match)continue;
    const image=manifest.images.find(item=>item.ref===match[2]);
    if(!image)continue; // Unregistered syntax remains visible literal text.
    const node=descendants(article).find(n=>n.dataset?.sourceLines===`${block.startLine}-${block.endLine}`);
    if(!node)throw Error('IMAGE_SOURCE_BLOCK_MISSING');
    const figure=doc.createElement('figure'),viewport=doc.createElement('div'),status=doc.createElement('p'),caption=doc.createElement('figcaption'),retry=doc.createElement('button');
    figure.className='wb-original-figure';viewport.className='wb-original-figure-scroll';viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label',match[1]+'；可横向滚动查看原始图表');
    figure.dataset.sourceLines=node.dataset.sourceLines;status.setAttribute('role','status');retry.type='button';retry.textContent='重试原图';retry.hidden=true;
    caption.textContent=`${match[1]} · ${image.caption} · ${image.width} × ${image.height} px`;
    const details=doc.createElement('details'),summary=doc.createElement('summary'),digest=doc.createElement('code');summary.textContent='原图来源与校验';digest.textContent=`${image.ref} · SHA-256 ${image.sha256}`;details.append(summary,digest);
    const original=doc.createElement('a');original.textContent='查看已校验原图（新标签页）';original.target='_blank';original.rel='noopener noreferrer';original.hidden=true;
    figure.append(viewport,caption,status,original,retry,details);
    // The original paragraph remains the source-line wrapper; no raw HTML parsing.
    node.parentElement.replaceChildren(...[...node.parentElement.children].map(child=>child===node?figure:child));
    let objectURL=null,sequence=0;
    const release=()=>{if(objectURL){urlAPI.revokeObjectURL(objectURL);objectURL=null;}viewport.replaceChildren();original.hidden=true;original.removeAttribute('href');};
    async function start(){if(disposed||controller.signal.aborted)return false;const token=++sequence;release();status.textContent='正在核验原报告配套图…';retry.hidden=true;
      try{const bytes=await loadVerifiedPNG({image,url:imageURL(manifest,image,baseURL),fetcher,subtle,signal:controller.signal});
        if(disposed||controller.signal.aborted||token!==sequence)return false;
        objectURL=urlAPI.createObjectURL(new BlobType([bytes],{type:'image/png'}));const img=doc.createElement('img');img.alt=match[1];img.width=image.width;img.height=image.height;img.decoding='async';img.src=objectURL;
        img.addEventListener('error',()=>{if(disposed||token!==sequence)return;release();status.textContent='原图字节校验通过，但浏览器未能解码；正文与表格仍可读。';retry.hidden=false;},{once:true});
        viewport.append(img);original.href=objectURL;original.hidden=false;status.textContent='原报告配套图 · SHA-256 校验通过';return true;
      }catch(error){if(disposed||controller.signal.aborted||token!==sequence)return false;release();status.textContent='原报告配套图未载入或校验失败；正文与原始表格仍可读，不显示替代图。';retry.hidden=false;return false;}
    }
    const onRetry=()=>void start();retry.addEventListener('click',onRetry);
    cleanups.push(()=>{sequence++;release();retry.removeEventListener('click',onRetry);});figures.push(start());
  }
  return {ready:Promise.all(figures),dispose(){if(disposed)return;disposed=true;controller.abort();signal?.removeEventListener('abort',stop);cleanups.forEach(fn=>fn());}};
}
