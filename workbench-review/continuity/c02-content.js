import {loadLocalDraft} from '../content-adapter.js';
import {resolveReport,REPORT_BASE} from '../route-model.js';
import {bindPassages} from './c02-passages.js';
import {deriveC02Visuals} from './c02-research-visuals.js';
import {createC02Layout} from './c02-layout.js';
const activeMounts=new WeakMap();
const BASE='/investment-workbench-public-preview/workbench-review/',ASSET=BASE+'continuity/c02-assets/';
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export async function mountC02Content({doc=document,api,host,signal,loadDraft=loadLocalDraft,env=globalThis}) {
 activeMounts.get(host)?.dispose();
 host.querySelector('.c02-reading')?.remove();
 const manifest=resolveReport('sinoseal'),section=doc.createElement('section');
 section.className='c02-reading';section.setAttribute('aria-label','中密控股：同一研究的五个阅读视角');
 section.innerHTML='<header class="c02-reading-heading"><p>RESEARCH IN CONTEXT · C02</p><h2>让判断，回到证据。</h2><span data-c02-source>正在核验中密控股公开研究快照…</span><nav class="c02-reading-nav" aria-label="独立研究页面"><a href="/investment-workbench-public-preview/workbench-review/research/sinoseal/">阅读完整研究 ↗</a><a href="/investment-workbench-public-preview/workbench-review/evidence/#sinoseal">来源与下载 ↗</a></nav></header><div class="c02-cards"></div><p class="c02-scope">同一份研究 · 五个阅读视角<br>连线组织阅读，不表示跨研究引用或已证实因果</p>';
 host.append(section);
 const overview=doc.createElement('section');overview.className='c02-spatial-overview';overview.setAttribute('aria-label','3D 阅读关系概览：五个阅读视角，完整内容在下方');overview.hidden=true;host.querySelector('#stage').append(overview);
 let disposed=false,layout;const request=new AbortController();
 const handle={manifest,update(){layout?.update();},dispose(){
  if(disposed)return;disposed=true;request.abort();signal?.removeEventListener('abort',handle.dispose);layout?.dispose();section.remove();overview.remove();
  if(activeMounts.get(host)===handle){activeMounts.delete(host);doc.body.classList.remove('c02-flow');}
 }};
 activeMounts.set(host,handle);signal?.addEventListener('abort',handle.dispose,{once:true});
 if(signal?.aborted){handle.dispose();return handle;}
 try{
  const {raw}=await loadDraft({manifest,baseURL:REPORT_BASE.href,includeBytes:true,signal:request.signal});
  if(disposed)return handle;
  const cards=bindPassages(raw,manifest),visuals=deriveC02Visuals(raw),container=section.querySelector('.c02-cards');
  Object.assign(handle,{cards,visuals});
  const sectionHref=line=>{const lines=raw.split(/\r?\n/);let i=line-1;while(i>=0&&!/^#{1,6}\s/.test(lines[i]))i--;if(i<0)throw Error('C02_MISSING_SECTION');return BASE+'research/sinoseal/#'+manifest.anchorPrefix+'-line-'+(i+1);};
  const source=id=>visuals.excerpts.find(x=>x.id===id);
  const thumb=id=>{const e=source(id);return `<div class="c02-source-item"><a class="c02-source-tile" href="${sectionHref(e.line)}" data-source-line="${e.line}"><img src="${ASSET}source-${id}.svg" alt="已校验原稿第${e.line}行的重新排印节选：${esc(e.title)}，不是公告原页" width="640" height="360"><strong>${esc(e.label)}</strong><span class="c02-source-detail">${esc(e.detail)}</span><span class="c02-source-citation">${esc(e.source)}</span></a><a class="c02-image-link" href="${ASSET}source-${id}.svg">查看完整资料图 ↗</a></div>`;};
  const chart=(id,title,caption)=>{const d=visuals.tables[id];return `<figure class="c02-data-figure"><a href="${sectionHref(d.line)}" data-source-line="${d.line}"><img src="${ASSET}${id==='concentration'?'contribution':id}.svg" alt="${esc(title)}。单位：${esc(d.unit)}。${esc(d.values.map((v,i)=>d.labels[i]+' '+v).join('；'))}。${esc(d.scope)}" width="640" height="360"></a><figcaption>${esc(caption)} · 原稿 L${d.line}<a class="c02-image-link" href="${ASSET}${id==='concentration'?'contribution':id}.svg">查看完整图表 ↗</a></figcaption></figure>`;};
  for(const item of cards){
   const card=doc.createElement('article');card.className='c02-card c02-'+item.id;card.dataset.c02Card=item.id;card.id='c02-reading-'+item.id;
   let content='';
   if(item.id==='focus')content=`<div class="c02-focus-kicker">选中的研究 / 01</div><h3>中密控股</h3><p class="c02-focus-question">存量售后，能否抵消增量价格战？</p><div class="c02-seal-emblem" aria-hidden="true"><i></i><i></i><i></i><span>证据 → 判断 → 核验</span></div><p class="c02-focus-note"><strong>当前判断</strong>优势存在。能否兑现为可持续的后续现金，仍需核验。</p><div class="c02-focus-metrics"><div><b>6.09<span>%</span></b><small>修复收入占比</small></div><div><b>12.44<span>%</span></b><small>修复毛利占比</small></div></div><small class="c02-focus-period">2026H1 · 分母不同 · 非全部存量业务</small>`;
   if(item.id==='support')content=`<div class="c02-card-title"><span>01 / SUPPORT</span><h3>支持线索</h3></div><p class="c02-card-deck">工况经验、及时服务与已发生的转化。以下为原稿重排节选，不是公告原页。</p><div class="c02-source-grid">${['design','service','conversion'].map(thumb).join('')}</div><p class="c02-interpretation">原稿支持执行能力，未证明所有装机组合都能回收初装让利。</p>`;
   if(item.id==='limits')content=`<div class="c02-card-title"><span>02 / COUNTER-EVIDENCE</span><h3>反向证据与约束</h3></div><div class="c02-limit-layout">${chart('bridge','三个选定产品毛利同比变化','仅选三项，不是集团完整毛利桥')}<div class="c02-limit-notes"><a href="${sectionHref(source('closure').line)}"><b>装置会退出</b><span>老旧产能关闭可永久损失存量</span></a><a href="${sectionHref(source('replace').line)}"><b>维修会替代新件</b><span>收入增长不等于生命周期收入增长</span></a></div></div><p class="c02-interpretation">维修毛利增量尚未抵消新增项目压力。</p>`;
   if(item.id==='evidence')content=`<div class="c02-card-title"><span>03 / SHARED EVIDENCE</span><h3>共享证据</h3></div><p class="c02-card-deck">同一原稿中的数据，保留期间与口径</p><div class="c02-chart-pair">${chart('repairs','修复收入年度与半年分组','年度 / 半年分开，不能直连同比')}${chart('concentration','修复业务收入和毛利占比','2026H1 · 两个分母不同')}</div><div class="c02-evidence-footnote"><span>原稿表格重绘</span><span>已核验 SHA-256</span><span>固定快照</span></div>`;
   if(item.id==='questions')content=`<div class="c02-card-title"><span>04 / NEXT QUESTIONS</span><h3>后续问题</h3></div><p class="c02-card-deck">下一次阅读，带着可核验的问题回来</p><ol class="c02-question-list"><li><b>01</b><span>同批新装机的累计售后净现金，何时覆盖初始让利？</span></li><li><b>02</b><span>扣除关闭装置、维修替代后，还剩多少真实存量？</span></li><li><b>03</b><span>服务成本、应收与资本投入，是否吃掉高毛利？</span></li></ol><small class="c02-question-boundary">根据原稿 L${source('cash').line} 拆解的问题 · 尚未获证</small>`;
   const firstLink=item.id==='focus'?'<span>进入全文</span>':'<span>'+esc(item.action)+'</span>';
   card.innerHTML=content+`<footer class="c02-card-footer"><a class="c02-primary-link" href="${item.href}">${firstLink}<span aria-hidden="true">↗</span></a>${item.id==='evidence'?`<a class="c02-secondary-link" href="${BASE}evidence/#sinoseal">来源与下载 ↗</a>`:item.id==='questions'?`<a class="c02-secondary-link" href="${BASE}review/?report=sinoseal">写复盘 ↗</a>`:''}</footer>`;
   container.append(card);
  }
  const summaries={
   focus:['选中的研究','中密控股','存量售后，能否抵消增量价格战？'],
   support:['01 / 支持','支持线索','工况经验、及时服务与已发生的转化。'],
   limits:['02 / 约束','反向证据','维修毛利增量尚未抵消新增项目压力。'],
   evidence:['03 / 口径','共享证据','2026H1 · 收入占比与毛利占比的分母不同。'],
   questions:['04 / 核验','后续问题','累计售后净现金，何时覆盖初装让利？']
  };
  for(const item of cards){
   const tile=doc.createElement('article'),[label,title,summary]=summaries[item.id];
   tile.className='c02-overview-card';tile.dataset.c02Card=item.id;
   const visual=item.id==='support'?`<div class="c02-overview-previews" aria-hidden="true">${['design','service','conversion'].map(id=>`<img src="${ASSET}source-${id}.svg" alt="" width="640" height="360">`).join('')}<span>资料预览 · 下方展开</span></div>`:item.id==='evidence'?'<p class="c02-overview-metric">6.09% / 12.44%<small>修复收入占比 / 修复毛利占比</small></p>':'';
   tile.innerHTML=`${item.id==='focus'?`<span class="c02-overview-kicker">${label}</span>`:''}<h3>${title}</h3><p>${summary}</p>${visual}<a href="#c02-reading-${item.id}">阅读${item.id==='focus'?'研究判断':title} ↓</a>`;
   overview.append(tile);
  }
  const meta=section.querySelector('[data-c02-source]');meta.textContent=`中密控股 · 固定快照 2026-10-17 UTC · SHA ${manifest.sha256.slice(0,12)}…`;
  section.dataset.contentVerified='true';section.dataset.sourceSha256=manifest.sha256;
  section.dataset.layout='reading-flow';
  const status=host.querySelector('#status'),setStatus=()=>{status.textContent=['failed','disposed'].includes(api.getDiagnostics().status)?'3D 显示失败 · 已保留可读研究、原稿与来源入口':'公开原稿已核验 · C02 精修样板 · 连线仅组织阅读 · 非投资建议';};setStatus();
  layout=createC02Layout({doc,api,section:overview,container:overview,overview:true,stage:host.querySelector('#stage'),canvas:host.querySelector('canvas'),onStatus:setStatus,env});
  return handle;
 }catch(error){if(disposed)return handle;doc.body.classList.add('c02-flow');section.dataset.layout='reading-flow';section.querySelector('[data-c02-source]').textContent='研究原稿未通过载入或校验，未显示替代数据。请返回工作台查看原稿。';section.dataset.contentVerified='false';handle.error=String(error);return handle;}
}
