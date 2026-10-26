import {readerIndex} from './readers-index.js';
import {getReport} from './registry.js';
import {publicAsset} from './public-assets.js';
export {readerIndex};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const loaders={
 sinoseal:()=>import('./readers/sinoseal-data.js'),sungrow:()=>import('./readers/sungrow-data.js'),yizumi:()=>import('./readers/yizumi-data.js'),honghua:()=>import('./readers/honghua-data.js'),shaangu:()=>import('./readers/shaangu-data.js'),crsc:()=>import('./readers/crsc-data.js'),zoomlion:()=>import('./readers/zoomlion-data.js'),airtransport:()=>import('./readers/airtransport-data.js'),banks:()=>import('./readers/banks-data.js'),baiyunfollowup:()=>import('./readers/baiyunfollowup-data.js')
};
const cache=new Map(),pending=new Map();
export const publicReaderPath=slug=>slug==='sinoseal'?'originals/sinoseal/':'research/'+slug+'/';
export const getReaderMeta=slug=>Object.hasOwn(readerIndex,slug)?readerIndex[slug]:null;
export const getLoadedReader=slug=>cache.get(slug)||null;
export function loadPublicReader(slug){
 if(!Object.hasOwn(loaders,slug))return Promise.reject(Error('READER_NOT_APPROVED'));
 if(cache.has(slug))return Promise.resolve(cache.get(slug));
 if(pending.has(slug))return pending.get(slug);
 const task=loaders[slug]().then(({readerData:d})=>{const r=getReport(slug);if(d.slug!==slug||d.reportId!==r.id||d.originalSHA256!==r.sha256)throw Error('READER_IDENTITY_MISMATCH');cache.set(slug,d);pending.delete(slug);return d;}).catch(error=>{pending.delete(slug);throw error;});pending.set(slug,task);return task;
}
export const sourceFor=(slug,id)=>getReaderMeta(slug)?.sources.find(s=>s.id===id)||null;
export const publicAnchor=(slug,value)=>{const m=getReaderMeta(slug);return m?.headings.some(h=>h.id===value)?value:m?.headings[0]?.id||'';};
export const sectionIdentity=(slug,anchor)=>'report:'+slug+':section:'+publicAnchor(slug,anchor).replace('local-'+slug+'-','');
export const sourceURL=(slug,s,href,anchor)=>href('sources/'+slug+'/'+s.id+'/',{readerSlug:slug,readerAnchor:publicAnchor(slug,anchor||s.returnAnchor||s.occurrences?.[0]?.returnAnchor)});
const originalURL=(url,slug)=>new URL(url,getReport(slug).legacyUrl).href;
export function adaptedPublicArticle(d,href,assetURL=path=>'/'+path){
 let count=0;const occurrences=d.sources.flatMap(s=>(s.occurrences||[{occurrenceId:d.slug+'-source-'+s.id,returnAnchor:s.returnAnchor,url:s.url,label:s.label}]).map(o=>({...o,source:s})));
 const used=new Set();
 let html=d.articleHTML.replace(/<a\b([^>]*?)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g,(full,before,encoded,after,label)=>{
  const url=encoded.replaceAll('&amp;','&');
  if(url.startsWith('#'))return full;
  const occurrence=occurrences.find((o,i)=>!used.has(i)&&o.url===url);
  if(occurrence){used.add(occurrences.indexOf(occurrence));count++;return `<a id="${esc(occurrence.occurrenceId)}" data-route data-source-id="${esc(occurrence.source.id)}" data-object-id="${esc(d.reportId+':source:'+occurrence.source.id)}" data-original-url="${esc(url)}" href="${sourceURL(d.slug,occurrence.source,href,occurrence.returnAnchor)}">${label}</a>`;}
  // Relative links are historical public references, not fabricated local downloads.
  return `<a href="${esc(originalURL(url,d.slug))}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-original-url="${esc(url)}">${label}</a>`;
 });
 html=html.replace(/<img\b([^>]*?)>/g,(full,attrs)=>{
  const src=attrs.match(/\bsrc="([^"]+)"/)?.[1];if(!src)return full;
  const figure=d.figures.find(f=>f.src===src),asset=publicAsset(originalURL(src,d.slug)),alt=attrs.match(/\balt="([^"]*)"/)?.[1]||'原公开配图';
  if(!asset)return `<span class="public-image-unavailable" role="note"><strong>${alt}</strong><br>当前公开构建未包含该图像字节；原文字替代保留。<a href="${esc(originalURL(src,d.slug))}" target="_blank" rel="noopener noreferrer">原公开图像链接 ↗</a></span>`;
  const id='public-image-'+d.slug+'-'+figure.id,corrected=d.slug==='baiyunfollowup',accessibleAlt=corrected?'白云机场Q2合并税前利润环比增量分解，单位万元。旧页图注单位误标已订正；整数标签合计9,984万元，图题9,983万元，差1万元，原始精度未核。':alt;
  return `<img${attrs.replace(/\s(?:loading|decoding|alt|aria-describedby)="[^"]*"/g,'').replace(/\bsrc="[^"]+"/,'src="'+assetURL(asset.path)+'"')} id="${id}" alt="${esc(accessibleAlt)}" aria-describedby="${id}-status${corrected?' public-figure-correction-baiyunfollowup':''}" data-public-image="${id}" data-original-url="${esc(asset.originalURL)}" data-sha256="${asset.sha256}" loading="lazy" decoding="async"><p class="public-image-status quiet" data-ui-annotation="asset-status" id="${id}-status" role="status">已审原图已随包提供并按原 SHA 校验；原文字替代始终保留，图片加载失败不影响全文。</p>`;
 });
 if(d.slug==='baiyunfollowup'){
  html=html.replace(/(<figcaption\b[^>]*>)([\s\S]*?)(<\/figcaption>)/g,(full,open,body,close)=>open+body.replace('合并口径、单位亿元','<del>合并口径、单位亿元</del>')+close+'<p id="public-figure-correction-baiyunfollowup" class="public-figure-correction" data-ui-annotation="figure-correction"><strong>图注订正：合并税前口径，单位万元。</strong>旧公开页图注误标“亿元”，以原PNG图内“万元”及原文第32行为准；原PNG、原Markdown与旧图注记录均未改写。四个图内显示标签相加为9,984万元，标题为9,983万元，已显示整数标签有1万元残差。缺原始计算附件，不能确认具体舍入过程；保留原图，不宣称显示项精确闭合或原计算附件已运行。</p>');
 }
 html=html.replace(/<source\b[^>]*>/g,'');
 // The legacy Sinoseal article has bare tables; other originals already have scroll shells.
 // Wrap only the displayed tables so narrow readers keep every column without widening the page.
 if(d.slug==='sinoseal'){
  let tableNumber=0;
  html=html.replace(/<table\b[\s\S]*?<\/table>/g,table=>`<div class="local-table-scroll" tabindex="0" role="region" aria-label="中密控股原文表 ${++tableNumber}">${table}</div>`);
 }
 // Source anchors in the older sinoseal HTML are spans; make programmatic focus usable.
 html=html.replace(/<span class="anchor" id="([^"]+)"/g,'<span class="anchor" tabindex="-1" id="$1"');
 return html;
}
export function originalReaderNotes(meta,href,assetURL=path=>'/'+path){return `<section class="public-original-notices" aria-label="原公开页附注与当前可用性">${meta.originalNotices?.length?`<details ${meta.slug==='honghua'?'open':''}><summary>原公开页附注 · 原样保留</summary><p class="quiet">以下说明描述旧公开页当时状态；不是当前候选的附件或图像可用性保证。</p>${meta.originalNotices.map(t=>`<p>${esc(t)}</p>`).join('')}</details>`:''}${meta.relatedReports?.length?`<p>同专题独立原稿：${meta.relatedReports.map(slug=>`<a data-route href="${href(publicReaderPath(slug))}">${esc(getReport(slug).company)} · ${getReport(slug).id} →</a>`).join(' · ')}。不覆盖本稿身份。</p>`:''}${meta.slug==='sinoseal'?'<p class="boundary-note">原稿中的修复＋零配件抵消比例 13.76% 按原字节保留；中密对象工作区已核订正为 13.77%。这是独立核验说明，不是把订正静默写回旧研究稿，也不是新增经营判断。</p>':''}${meta.slug==='banks'?'<p class="boundary-note">本次公开节选 Markdown 可下载；历史价格、历史估值、旧ZIP与完整复算材料仍不公开。不用模拟值填空。</p>':''}${meta.attachmentLinks?.length?`<details><summary>已核公开元数据附件 · 不是原始财报或复算包</summary><p>只提供公开范围说明和六份财报的来源索引。索引中的PDF指纹是原研究登记元数据，不代表PDF随本候选分发或本次重新下载。</p>${meta.attachmentLinks.map(a=>{const asset=publicAsset(a.url);return `<p>${asset?`<a id="public-attachment-${a.filename}" href="${assetURL(asset.path)}" download>下载已核公开 ${esc(a.label)} ↓</a>`:`<span>当前未随包提供 ${esc(a.label)}</span>`} · <a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">原公开入口 ↗</a><br>${esc(a.originalDescription)}<br>公开附件 SHA：<code>${esc(a.originalSHA256)}</code></p>`;}).join('')}</details>`:''}</section>`;}
function boundary(meta){return `<aside class="yt-model-boundary"><strong>公开交付的边界</strong><div><p>${esc(meta.limits?.join(' ')||'保留已批准公开稿，不新增研究结论。')}</p><p>只有当前已登记的原文快照。标题中的“首轮 / 第二轮”不代表本候选拥有完整版本链。原文提到的计算脚本、CSV、JSON、原始 PDF、审阅回执或历史版本，未随本候选交付时均不可下载或运行；不以保留原文陈述声称附件已取得。</p></div></aside>`;}
export function publicReaderLoading({slug,href,pageHeading,error=false}){const r=getReport(slug);return `${pageHeading('PUBLIC READER / '+r.company,error?'原文交互模块未能载入':'正在载入这份公开原文',error?'未覆盖已生成的无 JavaScript 原文回退。可以重试，或主动打开下方无 JavaScript 完整原文。':'仅按需载入当前报告；不请求其他九份长文。')}<p><a href="${href(publicReaderPath(slug))}">刷新当前原文页</a> · <a href="${href('research/') }" data-route>回研究库</a></p><p><a href="${href(publicReaderPath(slug))}&static=1">打开无需交互模块的完整静态原文 →</a></p>${error?'<button id="retry-public-reader">重试交互阅读</button>':''}`;}
export function renderPublicReader({slug,data,state,href,assetURL,pageHeading}){
 const r=getReport(slug),m=getReaderMeta(slug),anchor=publicAnchor(slug,state.readerAnchor),chapter=m.headings.find(h=>h.id===anchor);
 return `<div class="research-topline"><a class="back-link" data-route href="${href('research/')}">← 研究库</a><span>${esc(r.company)} / ${esc(r.securityCode)}</span><span>固定公开原稿 · 不是实时行情</span></div>${pageHeading('PUBLIC RESEARCH / '+r.id,esc(r.company),'完整正文、原表与来源保持同一原稿身份；没有未经数据支持的装饰性模型。')}<div class="research-meta"><span>研究：${esc(r.researchAsOf)}</span><span>行情：${esc(r.priceAsOf)}</span><span>财报：${esc(r.financialAsOf)}</span></div><div class="yt-reader-actions"><a id="public-review-${slug}" data-route href="${href('review/',{reviewReport:slug})}">为此原稿写独立本地复盘 ↗</a>${m.downloadAllowed?`<a href="${assetURL('documents/'+slug+'-public-research.md')}" download>下载原字节公开 Markdown ↓</a>`:''}${slug==='sinoseal'?`<a id="original-return-workspace" data-route data-resume-study="sinoseal" href="${href('research/sinoseal/')}">返回保留的中密三维对象场景 →</a>`:''}<a data-route href="${href('history/')}">已登记快照与缺失边界 →</a></div>${boundary(m)}${originalReaderNotes(m,href,assetURL)}<section class="yt-reading-layout public-reading-layout"><nav class="yt-reading-nav public-reading-nav" aria-label="${esc(r.company)}原文章节"><p class="eyebrow">原文索引 / ${m.headings.length} 标题</p><p id="public-current-section" class="quiet" data-object-id="${sectionIdentity(slug,anchor)}">当前章节：${esc(chapter?.title)}</p>${m.headings.map((h,i)=>`<a id="public-nav-${slug}-${i+1}" data-reader-anchor="${esc(h.id)}" data-object-id="${sectionIdentity(slug,h.id)}" href="#${esc(h.id)}" ${h.id===anchor?'aria-current="location"':''}><span>${String(i+1).padStart(2,'0')}</span>${esc(h.title)}</a>`).join('')}<p class="quiet">${m.tables} 原表 · ${m.sources.length} 登记来源链接<br>${esc(r.id)}<br>SHA-256 ${r.sha256}</p></nav><article class="native-article public-original" id="public-original-${slug}" data-report-id="${r.id}" data-source-sha256="${r.sha256}" aria-label="${esc(r.company)}已审核完整公开原文">${adaptedPublicArticle(data,href,assetURL)}</article></section>`;
}
export function renderPublicSource({slug,source,state,href,pageHeading}){
 const m=getReaderMeta(slug),r=getReport(slug),s=sourceFor(slug,source),anchor=publicAnchor(slug,state.readerAnchor),refs=s.occurrences||[{returnAnchor:s.returnAnchor,label:s.label}];
 return `<button class="back-link" id="public-source-back" data-back>← 返回刚才的原文位置</button>${pageHeading('PUBLIC SOURCE / '+s.id,esc(s.label),r.company+' · '+r.id+'；来源身份只在所属报告内有效。')}<div class="source-reader" data-report-id="${r.id}" data-object-id="${r.id+':source:'+s.id}"><div class="source-reader-body"><p class="subheading">${esc(s.label)}</p><p>登记链接：<code class="source-url">${esc(s.url)}</code></p><p class="boundary-note">这是已审核原文所载的外部链接，不是内嵌 PDF、重新联网核验或附件下载成功回执。本候选不持有此文件的原始字节或可验证指纹；原文若列出页码、日期、指纹，仍需连同其上下文阅读。</p><a class="primary-link" id="public-source-original" href="${esc(originalURL(s.url,slug))}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">主动打开原登记链接 ↗</a><p class="quiet">链接的 HTTP / HTTPS、查询参数与页码片段按原文保留。第三方可达性与页码跳转未在本次重新核验。</p><details class="hash-details"><summary>所属原稿身份（不是外部文件指纹）</summary><code>${r.sha256}</code></details></div><aside class="reverse-index"><p class="eyebrow">ORIGINAL REFERENCES</p><h2>回到引用位置</h2><a id="public-source-direct-return" data-route data-reader-return="${anchor}" href="${href(publicReaderPath(slug),{readerSlug:slug,readerAnchor:anchor})}#${anchor}"><span>当前阅读章节</span><small>${esc(m.headings.find(h=>h.id===anchor)?.title)}</small></a>${refs.map((o,i)=>{const a=publicAnchor(slug,o.returnAnchor);return `<a id="public-reverse-${slug}-${s.id}-${i}" data-route data-reader-return="${a}" href="${href(publicReaderPath(slug),{readerSlug:slug,readerAnchor:a})}#${a}"><span>${esc(o.label||s.label)}</span><small>${esc(m.headings.find(h=>h.id===a)?.title)}</small></a>`;}).join('')}<p class="quiet">引用关系不是因果关系。同名来源不跨报告替换，直接深链也能回真实章节。</p></aside></div>`;
}
export function publicSourceIndex(href){return `<section class="public-source-index"><div class="section-heading"><h2>其余公开全文 · 按报告核对来源</h2></div><p class="quiet">原文链接保持原样；没有据此收录缺失附件或生成新的研究证据记录。</p>${Object.values(readerIndex).map(m=>`<details><summary>${esc(getReport(m.slug).company)} · ${m.sources.length} 个原文链接</summary><a data-route href="${href(publicReaderPath(m.slug),{readerSlug:m.slug})}">阅读同一原稿 →</a><div class="index-rows">${m.sources.map((s,i)=>`<article class="source-index-entry"><span class="row-index">${String(i+1).padStart(2,'0')}</span><div><h3><a data-route id="public-index-${m.slug}-${s.id}" href="${sourceURL(m.slug,s,href)}">${esc(s.label)} ↗</a></h3><small>${m.reportId}:source:${s.id}</small></div></article>`).join('')}</div></details>`).join('')}</section>`;}
export function publicHistory(href){return Object.values(readerIndex).filter(m=>m.slug!=='sinoseal').map(m=>{const r=getReport(m.slug);return `<article><time>${esc(r.researchAsOf)}</time><div><span class="event-type">${esc(r.company)} · 当前已登记公开快照</span><h2>${esc(r.title)}</h2><p>${esc(r.contentScope)}</p><p>只有这个固定快照；未随交付的历史原件不伪造成版本比较。${m.slug==='baiyunfollowup'?'独立补充 report:baiyunfollowup，不覆盖航空四公司专题 report:airtransport。':''}</p><code>${r.sha256}</code><a data-route href="${href(publicReaderPath(m.slug),{readerSlug:m.slug})}">阅读同一原稿 →</a></div></article>`;}).join('');}
