import {loadLocalDraft} from '/investment-workbench-public-preview/workbench-review/content-adapter.js';
import {resolveReport,REPORT_BASE} from '/investment-workbench-public-preview/workbench-review/route-model.js';
import {bindPassages} from '/investment-workbench-public-preview/workbench-review/continuity/c02-passages.js?v=0.1.0-preview.2';
import {deriveC02Visuals} from '/investment-workbench-public-preview/workbench-review/continuity/c02-research-visuals.js?v=0.1.0-preview.2';
import {createC02Layout} from './c02-layout.js?v=c02-spatial-v2-20261021';
const activeMounts=new WeakMap();
const BASE='/investment-workbench-public-preview/workbench-review/',ASSET=BASE+'continuity/c02-assets/';
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
// The readable page owns this binding, not the disposable WebGL renderer.
export function bindC02PublicDiagnostics({host,api,env=globalThis}){
 const button=host.querySelector('[data-copy-diagnostics]'),out=host.querySelector('[data-public-diagnostics]');
 if(!button||!out)return ()=>{};
 let disposed=false;
 const copy=async()=>{
  const stage=host.querySelector('#stage');
  const diagnostics=api.getPublicDiagnostics?.()||{candidate:'c02-spatial-v2-20261021',state:api.getDiagnostics?.().status||'failed',textMode:host.querySelector('[data-text-mode]')?.value||'flat',webgl:{status:'not-initialized',available:false},initializationFailed:true,camera:null,viewport:{width:stage?.clientWidth||0,height:stage?.clientHeight||0,devicePixelRatio:env.devicePixelRatio||1,rendererPixelRatio:null},visualAccepted:false,GPUAccepted:false};
  const text=JSON.stringify(diagnostics,null,2);out.textContent=text;button.textContent='请复制下方诊断';
  // Never request a new clipboard permission: readable output works without it.
  try{const permission=await env.navigator?.permissions?.query({name:'clipboard-write'});if(!disposed&&permission?.state==='granted'&&env.navigator?.clipboard?.writeText){await env.navigator.clipboard.writeText(text);if(!disposed)button.textContent='诊断已复制';}}catch{}
 };
 button.addEventListener('click',copy);
 return ()=>{disposed=true;button.removeEventListener('click',copy);};
}
export async function mountC02Content({doc=document,api,host,signal,loadDraft=loadLocalDraft,env=globalThis}) {
 activeMounts.get(host)?.dispose();
 host.querySelector('.c02-reading')?.remove();
 const manifest=resolveReport('sinoseal'),section=doc.createElement('section');
 section.className='c02-reading';section.setAttribute('aria-label','中密控股：同一研究的五个阅读视角');
 section.innerHTML='<header class="c02-reading-heading"><p>RESEARCH IN CONTEXT · C02</p><h2>让判断，回到证据。</h2><span data-c02-source>正在核验中密控股公开研究快照…</span><nav class="c02-reading-nav" aria-label="独立研究页面"><a href="/investment-workbench-public-preview/workbench-review/research/sinoseal/">阅读完整研究 ↗</a><a href="/investment-workbench-public-preview/workbench-review/evidence/#sinoseal">来源与下载 ↗</a><a href="/investment-workbench-public-preview/workbench-review/history/?report=sinoseal">版本记录 ↗</a><a href="/investment-workbench-public-preview/workbench-review/review/?report=sinoseal">复盘 ↗</a></nav></header><div class="c02-cards"></div><p class="c02-scope">同一份研究 · 五个阅读视角<br>连线组织阅读，不表示跨研究引用或已证实因果</p>';
 host.append(section);
 const overview=doc.createElement('section');overview.className='c02-spatial-overview';overview.setAttribute('aria-label','空间 V2：五个真实阅读视角，可选中文字；拖动请用空白或视角手柄');overview.hidden=true;host.querySelector('#stage').append(overview);
 let disposed=false,layout;const request=new AbortController(),disposeDiagnostics=bindC02PublicDiagnostics({host,api,env});
 const handle={manifest,update(){if(handle.error){const status=host.querySelector('#status');status.textContent='研究原稿载入或校验失败 · 未显示替代数据，请返回工作台核对原稿';status.setAttribute('role','alert');}else layout?.update();},dispose(){
  if(disposed)return;disposed=true;disposeDiagnostics();request.abort();signal?.removeEventListener('abort',handle.dispose);layout?.dispose();section.remove();overview.remove();
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
   if(item.id==='questions')content=`<div class="c02-card-title"><span>04 / NEXT QUESTIONS</span><h3>后续问题</h3></div><p class="c02-card-deck">下一次阅读，带着可核验的问题回来</p><ol class="c02-question-list"><li><b>01</b><span>同批新装机的累计售后净现金，何时覆盖初始让利？</span></li><li><b>02</b><span>扣除关闭装置、维修替代后，还剩多少真实存量？</span></li><li><b>03</b><span>服务成本、应收与资本投入，对售后净现金有何影响？</span></li></ol><small class="c02-question-boundary">根据原稿 L${source('cash').line} 拆解的问题 · 尚未获证</small>`;
   const firstLink=item.id==='focus'?'<span>进入全文</span>':'<span>'+esc(item.action)+'</span>';
   card.innerHTML=content+`<footer class="c02-card-footer"><a class="c02-primary-link" href="${item.href}">${firstLink}<span aria-hidden="true">↗</span></a>${item.id==='evidence'?`<a class="c02-secondary-link" href="${BASE}evidence/#sinoseal">来源与下载 ↗</a>`:item.id==='questions'?`<a class="c02-secondary-link" href="${BASE}review/?report=sinoseal">写复盘 ↗</a>`:''}</footer>`;
   container.append(card);
  }
  const paper=html=>`<div class="c02-reading-block">${html}</div>`;
  const repairs=visuals.tables.repairs,bridge=visuals.tables.bridge;
  const repairChart=()=>`<div class="c02-native-chart" role="group" aria-label="修复收入，亿元；年度与半年分组，不连接同比"><div class="c02-chart-caption">修复收入 / 亿元 · 年度与半年分组</div><div class="c02-repair-bars">${repairs.values.map((v,i)=>`<div class="c02-bar-column ${i===3?'c02-half-year':''}"><b>${v.toFixed(3)}</b><svg viewBox="0 0 32 44" aria-hidden="true"><rect x="5" y="${44-v/1.044*42}" width="22" height="${v/1.044*42}" fill="${i<3?'#718477':'#b3945d'}"/></svg><span>${repairs.labels[i]}</span></div>`).join('')}</div></div>`;
  const bridgeChart=()=>`<div class="c02-native-chart" role="group" aria-label="2026H1相比2025H1，三个选定产品毛利变化，万元；不是集团完整毛利桥"><div class="c02-chart-caption">毛利变化 / 万元 · 2026H1 同比</div><div class="c02-bridge-bars">${bridge.values.map((v,i)=>`<div class="c02-bridge-row"><span>${bridge.labels[i]}</span><b>${v>0?'+':''}${v.toFixed(2)}</b><svg viewBox="0 0 180 20" aria-hidden="true"><path d="M145 0V20" stroke="#8d9789"/><rect x="${v<0?145-Math.abs(v)/3102.3*140:145}" y="3" width="${Math.abs(v)/3102.3*140}" height="14" fill="${v<0?'#a26c58':'#648174'}"/></svg></div>`).join('')}</div></div>`;
  const summaries={focus:['核心研究 · SINOSEAL','中密控股'],support:['01 / SUPPORT','支持线索'],limits:['02 / COUNTER','反向证据'],evidence:['03 / EVIDENCE','修复收入 / 亿元'],questions:['04 / QUESTIONS','下一次核验什么']};
  for(const item of cards){
   const tile=doc.createElement('article'),[label,title]=summaries[item.id];tile.className='c02-overview-card c02-v2-tile';tile.dataset.c02Card=item.id;
   let detail='';
   if(item.id==='focus')detail=paper('<p class="c02-v2-question">存量售后能否抵消增量价格战？</p>')+paper('<p class="c02-v2-judgment"><b>当前判断</b>优势存在；同批装机累计售后净现金，仍待验证。</p>')+paper('<dl class="c02-snapshot-dates"><div><dt>研究核验</dt><dd>2026-10-17 UTC</dd></div><div><dt>行情</dt><dd>2026-10-16</dd></div><div><dt>财务</dt><dd>2026-06-30</dd></div></dl>');
   if(item.id==='support')detail=['design','service','conversion'].map(id=>{const e=source(id);return paper(`<a href="${sectionHref(e.line)}" data-source-line="${e.line}"><b>${esc(e.label)}</b> ${esc(e.detail)}<small>${esc(e.source)} · 原稿 L${e.line}</small></a>`);}).join('')+'<small class="c02-v2-note c02-overview-extra">原稿重排，非公告原页 · 抢修次数≠留存率</small>';
   if(item.id==='limits')detail=paper(`<a href="${sectionHref(bridge.line)}">${bridgeChart()}</a>`)+paper('<p class="c02-v2-chart-note">仅三项非完整桥；修复增量未抵消压力。</p>');
   if(item.id==='evidence')detail=paper(`<a href="${sectionHref(repairs.line)}">${repairChart()}</a>`)+paper(`<p class="c02-v2-ratios">2026H1：收入 <b>${visuals.tables.concentration.values[0]}%</b> / 毛利 <b>${visuals.tables.concentration.values[1]}%</b></p><small>分母不同，不相加；修复非全部存量业务</small>`);
   if(item.id==='questions')detail=paper('<ol class="c02-v2-questions"><li><span class="c02-question-full">同批新装机售后净现金，何时覆盖初始让利？</span><span class="c02-question-compact">售后净现金何时覆盖同批初装让利？</span></li><li><span class="c02-question-full">扣除关闭与维修替代，还剩多少真实存量？</span><span class="c02-question-compact">扣除关闭与维修替代，真实存量多少？</span></li><li><span class="c02-question-full">服务、应收与资本投入，对售后净现金有何影响？</span><span class="c02-question-compact">服务及资金占用后，净现金还剩多少？</span></li></ol>')+`<small class="c02-v2-note">根据原稿 L${source('cash').line} 拆解 · 尚未获证</small>`;
   tile.innerHTML=`<header class="c02-leaf-heading"><div><span class="c02-overview-kicker">${label}</span><h3>${title}</h3></div><button type="button" data-focus-zone="${item.id}" aria-label="聚焦${title}" aria-pressed="false">聚焦</button></header>`+detail+`<a class="c02-v2-go" href="${item.href}">${item.id==='focus'?'阅读完整研究':item.id==='evidence'?'年度 / 半年分组 · 原文口径':'核对原文与口径'} <span aria-hidden="true">↗</span></a>`;
   overview.append(tile);
  }
  const connections=cards.filter(c=>c.id!=='focus').map(c=>({from:'focus',to:c.id,type:({support:'reading-support',limits:'reading-counter',evidence:'reading-evidence',questions:'reading-question'})[c.id],sourceHash:manifest.sha256,sourceLine:c.line}));
  // Hide old carriers only after replacement DOM and the real source are present.
  try{api.activateContent?.({contentIds:[...cards.map(c=>c.id),'navigation'],sourceHash:manifest.sha256,connections});}catch(error){handle.bindingError=String(error);overview.dataset.bindingError=String(error);}
  overview.dataset.sourceSha256=manifest.sha256;
  const meta=section.querySelector('[data-c02-source]');meta.textContent=`中密控股 · 固定快照 2026-10-17 UTC · SHA ${manifest.sha256.slice(0,12)}…`;
  section.dataset.contentVerified='true';section.dataset.sourceSha256=manifest.sha256;
  section.dataset.layout='reading-flow';
  const status=host.querySelector('#status'),setStatus=()=>{const diagnostics=api.getDiagnostics(),reason=overview.dataset.layoutReason;status.textContent=handle.bindingError?'空间绑定未完成 · 已保留校验后的研究阅读 · 完整空间未验收':['failed','disposed'].includes(diagnostics.status)?'3D 不可用 · 阅读降级 · 完整空间未验收；已保留真实原稿、来源与导航':reason?'阅读降级：'+reason+' · 完整空间未验收':'C02 空间 V2 候选 · 拖动空白或手柄，滚轮适度缩放 · 原稿已核验，实机视觉待验收';};setStatus();
  layout=createC02Layout({doc,api,section:overview,container:overview,overview:true,stage:host.querySelector('#stage'),canvas:host.querySelector('canvas'),onStatus:setStatus,env});
  handle.setTextMode=mode=>layout?.setMode(mode);
  return handle;
 }catch(error){if(disposed)return handle;doc.body.classList.add('c02-flow','c02-overview-flow');host.querySelector('canvas')?.setAttribute('data-view-input','handle-only');section.dataset.layout='reading-flow';section.querySelector('[data-c02-source]').textContent='研究原稿未通过载入或校验，未显示替代数据。请返回工作台查看原稿。';section.dataset.contentVerified='false';handle.error=String(error);handle.update();return handle;}
}
