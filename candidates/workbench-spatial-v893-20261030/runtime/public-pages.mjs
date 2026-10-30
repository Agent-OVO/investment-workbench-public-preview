import {moneyToCents,formatMoney} from './space-model.mjs';
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n};
const REPORT='public:report:sinoseal';
const DATE='研究 2026-10-17 · 财务截至 2026-06-30 · 26.57 元为 2026-10-16 历史收盘，非现价。';
export function publicAmountFacts(data){
 const pair=id=>['2025H1','2026H1'].map(period=>data.getMetric(`public:metric:${id}:${period}:grossProfit`));
 const repair=pair('repair'),group=pair('consolidated');
 if([...repair,...group].some(m=>!m||m.datum?.state!=='known'||m.datum?.unit?.currency!=='CNY'))return null;
 return {repair,group,repairDelta:moneyToCents(repair[1].datum.value)-moneyToCents(repair[0].datum.value),groupDelta:moneyToCents(group[1].datum.value)-moneyToCents(group[0].datum.value)};
}
function amounts(data,button,openSource){
 const f=publicAmountFacts(data);if(!f)return node('p','当前四个原数不全，不生成比较。','notice');
 const band=node('section',null,'public-amount-band');band.setAttribute('aria-label','同期间毛利量级对照');
 for(const [label,value,pair]of [['维修产品毛利增量',f.repairDelta,f.repair],['集团毛利净变动',f.groupDelta,f.group]]){
  const item=node('div',null,'public-amount');item.append(node('span',label),node('strong',(value>0n?'+':'')+formatMoney(value,{wan:true})),node('small','万元'));
  const detail=node('details');detail.append(node('summary','核对两期原数'));
  for(const m of pair)detail.append(button(m.datum.period.label+' · '+m.datum.value+' 元',()=>openSource(m.sourceRefs[0],m.id),'amount-source-'+m.id,'text-link'));
  item.append(detail);band.append(item);
 }
 band.append(node('p','2026H1 对 2025H1；同为毛利，不是净利润或现金。集团净变动已包含维修增量，不再相减。','public-amount-scope'));return band;
}
function scopeAside(data,button,go){const box=node('aside',null,'public-scope-window');box.append(node('p','公开阅读范围','eyebrow'),node('h2','一份研究，沿原数核对。'),node('p','只展示已审中密历史原稿、财务输入与 3 项登记来源。不含投资组合、交易或其他研究。'));const list=node('dl',null,'public-counts');for(const [label,value]of [['研究',data.reports.length],['登记来源',data.sources.length],['财务指标',data.metrics.length]]){const row=node('div');row.append(node('dt',label),node('dd',value));list.append(row)}box.append(list,node('p','来源只提供原网址、页码及原数；未分发公告 PDF 或提取全文。','small'),button('查看日期与公开范围 →',()=>go({page:'data'}),'public-scope-open','text-link'));return box;}
export function publicResearch({main,data,heading,button,go,openReport,openSource,query,onQuery}){
 const r=data.getReport(REPORT);heading('研究 / 已审公开子集','从问题进入研究。','一篇历史研究，不是实时结论，也不是完整私有工作台。');
 const layout=node('div',null,'public-directory-layout'),body=node('section',null,'public-directory-main'),card=node('article',null,'public-featured');
 const search=node('label',null,'public-search');search.append(node('span','在这份已审研究中检索','sr-only'));const input=node('input');input.type='search';input.id='research-search';input.placeholder='检索问题、公司或已载入正文';input.value=query||'';search.append(input);body.append(search);
 const result=node('p',null,'result-count');body.append(result);const renderMatch=()=>{const q=input.value.trim().toLowerCase(),match=!q||[r.title,r.fullText,...r.entries.map(e=>e.label)].join(' ').toLowerCase().includes(q);card.hidden=!match;result.textContent=match?'1 / 1 份已审研究':'0 / 1 份已审研究 · 没有匹配项';};input.addEventListener('input',()=>{onQuery(input.value);renderMatch()});
 card.append(node('p','中密控股 / 核心问题','eyebrow'),button(r.entries.find(e=>e.kind==='question').label,()=>openReport(r.id),'open-featured','public-question-link'),node('p','维修在增长，但尚不足以抵消新增项目压力。','public-research-answer'),node('p',DATE,'public-date'));card.append(amounts(data,button,openSource));
 const actions=node('div',null,'public-reading-actions');actions.append(button('打开完整研究 →',()=>openReport(r.id),'public-open-full','primary'),button('先核对来源',()=>go({page:'knowledge',reportId:r.id}),'public-open-sources','text-link'));card.append(actions,node('p',r.title,'public-original-title'));body.append(card);renderMatch();layout.append(body,scopeAside(data,button,go));main.append(layout);
}
export function publicKnowledge({main,data,heading,button,go,openReport,openSource,query,onQuery}){
 heading('证据 / 登记来源','从披露回到原数。','3 项公开来源链接；没有把链接登记当作本次已打开或已校验原件。');
 const layout=node('div',null,'public-directory-layout'),body=node('section',null,'public-directory-main'),search=node('label',null,'public-search'),input=node('input');input.type='search';input.id='evidence-search';input.placeholder='检索来源名称、日期';input.value=query||'';search.append(node('span','检索公开来源','sr-only'),input);body.append(search);const list=node('div',null,'public-source-list');list.id='evidence-list';body.append(list);
 const update=()=>{list.replaceChildren();const q=input.value.trim().toLowerCase(),sources=data.sources.filter(s=>[s.label,s.date].join(' ').toLowerCase().includes(q));list.append(node('p',sources.length+' / 3 项登记来源','result-count'));for(const s of sources){const row=node('article',null,'public-source-row');row.append(node('p',(s.date||'日期以原件为准')+' · 公开链接','eyebrow'),button(s.label,()=>openSource(s.id),null,'title-link'),node('p',s.excerpt,'small'));const footer=node('div',null,'public-source-footer');footer.append(node('span',s.rows.length?`${s.rows.length} 行已审财务输入`:'研究关系记录 · 不含财务输入'),button('定位原数与来源 →',()=>openSource(s.id),null,'text-link'));row.append(footer);list.append(row)}if(!sources.length)list.append(node('p','没有匹配来源。清空关键词可恢复全部 3 项。'));};input.addEventListener('input',()=>{onQuery(input.value);update()});update();layout.append(body,scopeAside(data,button,go));main.append(layout);
}
export function publicDataPage({main,data,heading,button,go,openReport}){
 heading('数据 / 日期与公开边界','知道这份页面展示了什么。','单篇已审历史研究子集；不是完整私有工作台。');const r=data.getReport(REPORT),grid=node('div',null,'public-scope-grid');
 for(const [n,title,body]of [['01','研究与历史时点',DATE],['02','可复算的财务输入',`${data.metrics.length} 项收入、成本和派生毛利指标。元级金额保留；其他业务成本未列示，不填零。八产品和集团合计不强制对平。`],['03','来源与分发范围','3 项登记来源，保留原网址、物理页及输入。未分发公告 PDF、提取全文或离线公告搜索；不含其他研究、账户或交易。']]){const card=node('section');card.append(node('p',n,'eyebrow'),node('h2',title),node('p',body));grid.append(card)}main.append(grid);
 const correction=node('section',null,'public-correction-window');correction.append(node('h2','原稿保留，订正另列。'),node('p',r.correction),node('p','原研究文件与已审基线保持相同字节；页面解释不回写原稿。'),button('回到完整研究 →',()=>openReport(r.id),'data-open-report','text-link'));main.append(correction);
 const rendering=node('section',null,'public-correction-window');rendering.append(node('h2','图形方式与验收边界'),node('p','三维空间和二维精确辅助使用同一组数据。软件 SVG 三维兼容不等于 GPU 或 PBR 材质通过；WebGL 不可用时显示实际限制，不伪称成功。'),node('p','本候选不接入实时行情、账户或交易接口，不向外发送研究文件。'));main.append(rendering);
}
export function composePublicPage({main,data,state,button,openSource}){
 if(state.route.page==='report'){
  const header=main.querySelector('.page-heading'),continuum=main.querySelector('.continuous-research'),verdict=main.querySelector('#research-verdict'),surface=main.querySelector('.research-surface'),bridge=main.querySelector('#reading-bridge'),shell=main.querySelector('.reading-layout'),context=main.querySelector('#reading-object-context');
  if(header){const trail=node('div',null,'public-report-trail');for(const selector of ['.back-link','.breadcrumbs']){const n=main.querySelector(selector);if(n)trail.append(n)}header.insertBefore(trail,header.firstChild);header.classList.add('public-report-heading');header.querySelector('h1').textContent='维修在增长，但尚不足以抵消新增项目压力。';header.querySelector('.lede').textContent=DATE;header.append(amounts(data,button,openSource));}
  if(continuum&&surface){continuum.replaceChildren();if(context)continuum.append(context);continuum.append(surface);if(verdict)continuum.append(verdict);if(bridge)continuum.append(bridge);if(shell)continuum.append(shell);const utilities=main.querySelector('.report-utilities');if(utilities)main.append(utilities);const scope=node('p','变化轨迹、盈利地图与证据空间使用软件三维投影；实体量尺另按实际后端标明，不把软件兼容称作 GPU 通过。','public-graphics-scope');surface.insertBefore(scope,surface.firstChild);}
 }
 if(state.route.page==='evidence'){
  const mainNodes=[...main.children],heading=main.querySelector('.page-heading'),context=main.querySelector('.source-context'),table=main.querySelector('.table-scroll'),actions=main.querySelector('.reading-actions');
  if(heading){heading.classList.add('public-source-heading');const note=node('p','登记来源 · 非离线公告全文','public-date');heading.append(note);}
  const grid=node('div',null,'public-evidence-layout'),reader=node('section',null,'public-evidence-reader'),aside=node('aside',null,'public-evidence-aside');
  if(context)reader.append(context);if(table)reader.append(table);else reader.append(node('p','这项来源登记为关系活动记录，没有新增财务输入行。请通过登记网站核对原件。'));
  if(actions)aside.append(actions);for(const n of mainNodes)if(n!==heading&&n.className!=='back-link'&&n!==context&&n!==table&&n!==actions)aside.append(n);grid.append(reader,aside);main.append(grid);
 }
}
