import {SOURCES} from './data.js';
import {SNAPSHOT, rows, byId, group, groupDelta, repair, combined, selectedThree, auditGap, money, pct, normalize, reduce, comparisonId} from './core.js';
import {createSourceSurface} from './source-surface.js';

// Financial input and arithmetic remain the unchanged C02 core/data modules.
// This controller joins ordinary HTML research content to the same product ID
// used by the paired-period record geometry. Geometry never encodes amounts.
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const KEY = 'sinoseal:source-surface:20261025';
const MAPPED_PRODUCTS = ['dry-gas-seals', 'auxiliary-systems', 'repair'];
const names = {judgment:'问题判断', repair:'密封产品修复', pressure:'选定产品压力', support:'支持 · 两期原数', limit:'限制 · 修复再利用'};
const tabs = {explain:'解释', calculation:'计算与口径', evidence:'支持与限制', assumptions:'假设边界', snapshot:'快照'};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short = (n, signed=false) => money(n, 'wanyuan', signed);
const source = id => SOURCES.find(item => item.source_id === id);
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const narrowQuery = matchMedia('(max-width:720px)');
const sourceButton = (period, prefix) => `<button id="${prefix}-${period.source_id}" data-source="${period.source_id}" class="record-source" aria-label="读取 ${period.period} ${esc(byId[state.product].label)} 原表，物理第 ${period.physical_page} 页">${period.source_id} · p${period.physical_page} ↗</button>`;

function normalizeApp(candidate={}) {
  const result = normalize(candidate);
  // Old object-only URLs still resolve to a real, explicitly named row. A valid
  // full-table product is never replaced just because it lacks scene geometry.
  if (!result.product) result.product = result.selection === 'pressure' ? 'dry-gas-seals' : 'repair';
  if (result.selection === 'repair' && result.product !== 'repair') result.selection = 'pressure';
  if (result.selection === 'pressure' && result.product === 'repair') result.selection = 'repair';
  result.expanded = result.expanded === true || result.expanded === '1';
  return result;
}
let stored = null;
try { stored = JSON.parse(sessionStorage.getItem(KEY)); } catch {}
const params = new URLSearchParams(location.search);
const hasURLState = ['object','product','tab','view','source','mode','paused','evidence','expanded'].some(key => params.has(key));
const saved = stored?.state?.snapshot === SNAPSHOT ? stored : null;
const initial = hasURLState ? Object.fromEntries(params) : saved?.state || {};
let state = normalizeApp({
  ...initial,
  selection: params.get('object') || initial.selection || (initial.product && initial.product !== 'repair' ? 'pressure' : 'repair'),
  product: initial.product || (initial.selection === 'pressure' || params.get('object') === 'pressure' ? 'dry-gas-seals' : 'repair'),
  mode: initial.mode || (narrowQuery.matches ? 'flat' : 'spatial'),
  paused: params.has('paused') ? params.get('paused') === '1' : initial.paused ?? motionQuery.matches
});
const product = () => byId[state.product];
let scene;
let sceneFailure = false;
let rendererStatus = '场景初始化中';
let projection = {columns:{'dry-gas-seals':1/6, 'auxiliary-systems':1/2, repair:5/6}, mobile:narrowQuery.matches};
let pendingReturnPatch = null;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function currentContext() {
  return {state:{...state}, scroll:window.scrollY, focus:document.activeElement?.id || null};
}
function urlFor(s) {
  const q = new URLSearchParams({object:s.selection, product:s.product, tab:s.tab, mode:s.mode, view:s.view});
  if (s.source) q.set('source', s.source);
  if (s.evidence) q.set('evidence', s.evidence);
  // Persist an explicit zero as well: a user who resumed motion is not
  // silently paused by a changed default on a later history navigation.
  q.set('paused', s.paused ? '1' : '0');
  q.set('expanded', s.expanded ? '1' : '0');
  if (s.camera !== 'default') q.set('camera', s.camera);
  return location.pathname + '?' + q;
}
function persist() {
  try { sessionStorage.setItem(KEY, JSON.stringify({...currentContext(), returnContext:history.state?.returnContext})); } catch {}
}
function replaceHistory(extra={}) {
  history.replaceState({...history.state, app:KEY, ...currentContext(), ...extra}, '', urlFor(state));
  persist();
}
function restore(context) {
  requestAnimationFrame(() => {
    window.scrollTo({top:context?.scroll || 0, behavior:'instant'});
    if (context?.focus) document.getElementById(context.focus)?.focus({preventScroll:true});
  });
}
function dispatch(action, {focus=null, scroll=false}={}) {
  const before = document.activeElement?.id;
  state = normalizeApp(reduce(state, action));
  replaceHistory();
  render();
  if (focus) document.getElementById(focus)?.focus({preventScroll:true});
  else if (before) document.getElementById(before)?.focus({preventScroll:true});
  if (scroll) {
    $('#detail').scrollIntoView({behavior:state.paused ? 'instant' : 'smooth', block:'start'});
    $('#detail-title')?.focus({preventScroll:true});
  }
}
function selectProduct(id, options={}) {
  if (!byId[id]) return;
  dispatch({type:'select', id:id === 'repair' ? 'repair' : 'pressure', product:id}, options);
}
function navigate(view, sourceId) {
  const context = currentContext();
  replaceHistory(context);
  state = normalizeApp(reduce(state, view === 'source' ? {type:'source', source:sourceId} : {type:'table'}));
  history.pushState({app:KEY, ...currentContext(), scroll:0, returnContext:context}, '', urlFor(state));
  render();
  window.scrollTo({top:0, behavior:'instant'});
  $('#reader-title')?.focus({preventScroll:true});
  persist();
}
function back() {
  if (history.state?.returnContext) {
    if (state.view === 'table') pendingReturnPatch = {selection:state.selection, product:state.product};
    history.back();
  } else {
    state = normalizeApp({...state, view:'workspace', source:null});
    replaceHistory();
    render();
    restore({scroll:0, focus:'detail-title'});
  }
}
window.addEventListener('popstate', event => {
  if (event.state?.app === KEY) {
    // Native Back and the in-page return button share the same table contract:
    // carry the chosen row into the workspace, but restore its original tab,
    // mode, pause, scroll and focus. Source -> table and forward table/source
    // entries still restore their own snapshots without a selection patch.
    const returnPatch = pendingReturnPatch || (state.view === 'table' && event.state.state?.view === 'workspace'
      ? {selection:state.selection, product:state.product}
      : null);
    state = normalizeApp({...event.state.state, ...returnPatch});
    if (returnPatch) history.replaceState({...event.state, state}, '', urlFor(state));
    pendingReturnPatch = null;
    render();
    restore(event.state);
  } else {
    pendingReturnPatch = null;
    const q = new URLSearchParams(location.search);
    state = normalizeApp({...Object.fromEntries(q), selection:q.get('object') || 'repair', paused:q.get('paused') === '1'});
    render();
    restore({scroll:0});
  }
  persist();
});
window.addEventListener('pagehide', () => { persist(); scene?.setState({product:state.product, paused:state.paused, mode:state.mode, visible:false}); });
window.addEventListener('scroll', () => {
  if (history.state?.app === KEY) history.replaceState({...history.state, scroll:window.scrollY}, '');
  persist();
}, {passive:true});

function sceneSelectionCaption(s) {
  const p = byId[s.product];
  const coverage = MAPPED_PRODUCTS.includes(p.id)
    ? '两期记录对应同一产品；体积、开合与位置不代表金额。'
    : '此产品未建立空间记录对象；原数与详情仍为当前产品，没有改选修复。';
  let meaning = '产品分类不等于新增业务分部；三项比较不是集团完整毛利桥。';
  if (s.selection === 'repair') meaning = '修复增量只作量级比较，不等于全部存量业务或售后净现金。';
  if (s.selection === 'support') meaning = p.delta === null ? '两期成本原格空白，不直接给出毛利。' : '两期收入与成本支持当前产品毛利变化的复算。';
  if (s.selection === 'limit') meaning = '当前阅读修复的限制证据；IR0908 不用于解释其他产品的变化。';
  return '当前 · ' + p.label + '：' + coverage + ' ' + meaning;
}
function applyProjection(next) {
  if (next?.columns) {
    const columns = {...projection.columns};
    for (const id of MAPPED_PRODUCTS) {
      const x = next.columns[id];
      if (typeof x === 'number' && Number.isFinite(x)) columns[id] = Math.min(1, Math.max(0, x));
    }
    projection = {columns, mobile:!!next.mobile};
  }
  $('#chart').dataset.mobile = String(projection.mobile);
  document.documentElement.dataset.sceneNarrow = String(projection.mobile);
  for (const id of MAPPED_PRODUCTS) {
    document.getElementById('chart-' + id)?.style.setProperty('--column', `${projection.columns[id] * 100}%`);
  }
}
function chart() {
  $('#chart').innerHTML = MAPPED_PRODUCTS.map(id => {
    const r = byId[id], positive = r.delta > 0n;
    // Same 3,200-wanyuan scale on either side of zero. Exact labels use BigInt;
    // this Number conversion is only the visual ratio, never a calculation input.
    const magnitude = Number(positive ? r.delta : -r.delta) / 1000000;
    const ratio = magnitude / 3200;
    const mobilePercent = magnitude / 3700 * 100;
    return `<button id="chart-${id}" class="axis-product ${positive ? 'positive' : 'negative'}" data-product="${id}" data-select="${id === 'repair' ? 'repair' : 'pressure'}" data-comparison="${comparisonId(id)}" style="--column:${projection.columns[id] * 100}%;--value:${ratio};--sign:${positive ? 1 : -1};--bar-size:${mobilePercent}%" aria-pressed="${state.product === id}" aria-label="${r.label}，毛利变化 ${short(r.delta, true)} 万元，2026H1 对 2025H1"><span class="axis-bar" style="--value:${ratio};--bar-size:${mobilePercent}%" aria-hidden="true"></span><span class="axis-value">${short(r.delta, true)}</span><span class="axis-name">${r.label}</span><span class="sr-only">${state.product === id ? '已选，' : ''}单位：万元</span></button>`;
  }).join('');
  applyProjection();
}
function selectedRecords() {
  const p = product(), mapped = MAPPED_PRODUCTS.includes(p.id);
  const displayed = mapped ? MAPPED_PRODUCTS : [p.id];
  const expanded = state.expanded || state.mode === 'flat' || !mapped;
  const rowsHTML = p.periods.map((selectedPeriod, periodIndex) => {
    const sourceID = selectedPeriod.source_id;
    return `<section class="source-row period-${periodIndex}" data-source-layer="${sourceID}" aria-label="${selectedPeriod.period} 披露原数"><header class="source-period"><span class="period-index">${periodIndex + 1}</span><div><strong>${selectedPeriod.period}</strong><button id="selected-${sourceID}" data-source="${sourceID}" class="period-source" aria-label="读取 ${selectedPeriod.period} ${esc(p.label)} 原表，物理第 ${selectedPeriod.physical_page} 页">${sourceID} · 所选原表 p${selectedPeriod.physical_page} ↗</button></div><span class="sheet-title">同一披露来源 · 同一产品次序</span></header><div class="source-values" ${expanded ? '' : 'hidden'}>${displayed.map(id => {
      const row=byId[id], r=row.periods[periodIndex], chosen=id===p.id;
      return `<article class="source-cell" data-record-product="${id}" data-period="${r.period}" data-chosen="${chosen}"><button class="source-product" id="source-product-${id}-${r.period}" data-product="${id}" data-select="${id==='repair'?'repair':'pressure'}" aria-pressed="${chosen}">${row.label}</button><dl><div><dt>营业收入</dt><dd>${money(r.revenueCents,'yuan')}</dd></div><div><dt>营业成本</dt><dd>${r.costCents===null?'未列示（原格空白）':money(r.costCents,'yuan')}</dd></div></dl><button id="record-source-${id}-${r.period}" class="record-source" data-source="${r.source_id}" data-source-product="${id}">${r.source_id} · 原表 p${r.physical_page} ↗</button></article>`;
    }).join('')}</div></section>`;
  }).join('');
  $('#selected-records').innerHTML = `<h2 class="sr-only">选中 · ${p.label}<span class="reading-unit">披露原数 / 元</span></h2>${rowsHTML}`;
  $('#source-field').dataset.expanded = String(expanded);
  $('#source-field').dataset.product = p.id;
  $('#source-field').dataset.mapped = String(mapped);
  $('#unfold-sources').setAttribute('aria-expanded', String(expanded));
  $('#unfold-sources').innerHTML = state.mode === 'flat' || !mapped ? '平面原数 · 完整展开' : expanded ? '收起为来源索引 <span aria-hidden="true">↑</span>' : '展开两期披露原数 <span aria-hidden="true">↓</span>';
  $('#unfold-sources').disabled = state.mode === 'flat' || !mapped;
  $('#source-result').hidden = !expanded;
  $('#source-result').innerHTML = `<span class="result-label">${p.label} · 收入减成本复算</span><p class="record-summary selected-formula">${p.delta === null ? '成本原格空白，保留 null；不直接计算毛利。' : `<span>${money(p.periods[1].gross,'yuan')}</span><span class="formula-sign">−</span><span>${money(p.periods[0].gross,'yuan')}</span><span class="formula-sign">=</span><strong>${money(p.delta,'yuan',true)} <small>元</small></strong>`}</p><span class="result-detail">${p.delta === null ? '不能推算 100% 毛利率' : `${short(p.delta,true)} 万元，回到上方同一产品比较。`}</span>`;
  $('#product-switcher').innerHTML = MAPPED_PRODUCTS.map(id => `<button id="switch-${id}" class="product-switch" data-product="${id}" data-select="${id === 'repair' ? 'repair' : 'pressure'}" aria-pressed="${p.id === id}">${byId[id].label}</button>`).join('');
  if (p.id === 'repair') {
    $('#selected-explanation').innerHTML = `<div class="interpretation-title"><span class="sequence-number">03</span><h2>数字说明增长，原文限制外推。</h2></div><div class="interpretation-body"><button class="explanation-kicker" data-source="IR0908" id="selected-IR0908">IR0908 · 问答2 · 物理 p1–2 ↗</button><p class="selected-quote quote">“优先选择修复再利用，而不是直接更换备件”</p><p class="small-note">另含进口品牌转修；降本仅指部分业主、部分项目。未披露替代金额或净现金，不能外推全生命周期。</p></div>`;
  } else {
    const summary = p.delta === null ? '两期均披露收入，但成本原格空白；无法直接给出毛利变化。' : `${p.label}毛利${p.delta < 0n ? '减少' : '增加'} ${short(p.delta < 0n ? -p.delta : p.delta)} 万元；这是两期收入减成本的结果，不是原因归因。`;
    $('#selected-explanation').innerHTML = `<div class="interpretation-title"><span class="sequence-number">03</span><h2>核对量级，不替产品编写原因。</h2></div><div class="interpretation-body"><p class="selected-brief">${summary}</p><p class="small-note">IR0908 问答2仅解释修复收入增长，不用于支持或归因本产品；产品分类也不等于新增业务分部。</p>${mapped ? '' : '<p class="unmapped-notice">此产品沿用真实两期平面原数，没有套用修复空间模型。</p>'}</div>`;
  }
  $('#flat-view').innerHTML = '';
}

function heading(title,kicker='研究解释'){return `<div class="mini-eyebrow">${kicker}</div><h2 id="detail-title" tabindex="-1">${title}</h2>`;}
function actions(){return `<div class="inline-actions"><button class="secondary" data-tab="calculation" id="explain-to-calculation">检查计算与口径 ↗</button><button class="secondary" data-tab="evidence" id="explain-to-evidence">看支持与反向证据 ↗</button></div>`;}
function explain(){const p=product();if(state.selection==='repair')return `<div class="detail-grid"><div>${heading('增长是真的，足够大是另一回事。','已选对象 / 密封产品修复')}<p class="lead">毛利从 ${short(repair.periods[0].gross)} 万元增至 ${short(repair.periods[1].gross)} 万元，增量为 <strong>${short(repair.delta)} 万元</strong>。</p><p>收入同比增长 ${pct(repair.periods[1].revenueCents-repair.periods[0].revenueCents,repair.periods[0].revenueCents)}，成本增长 ${pct(repair.periods[1].costCents-repair.periods[0].costCents,repair.periods[0].costCents)}。修复毛利率由 ${pct(repair.periods[0].gross,repair.periods[0].revenueCents)} 降至 ${pct(repair.periods[1].gross,repair.periods[1].revenueCents)}，下降 4.00 个百分点。</p>${actions()}</div><div><div class="key-stat"><strong>${pct(repair.delta,-groupDelta)}</strong><p>修复毛利增量，相当于集团毛利净下降金额的比例。<br>不是“抵消全部负贡献的比例”。</p></div><p>修复的体量仍小于选定产品的压力：干气密封及控制系统减少 ${short(-byId['dry-gas-seals'].delta)} 万元，辅助系统减少 ${short(-byId['auxiliary-systems'].delta)} 万元。</p><p class="small-note">修复不是全部存量业务。毛利不是售后净现金；本页没有把高毛利率当作生命周期回报。</p></div></div>`;
 if(state.selection==='pressure')return `<div class="detail-grid"><div>${heading('产品切面说明压力，不等于新增业务分部。',`已选产品 / ${p.label}`)}<p class="lead">${p.label}毛利变化为 ${p.delta===null?'未直接计算':short(p.delta,true)+' 万元'}。</p><p>三项重点产品的变化合计为 ${short(selectedThree,true)} 万元，集团全部毛利净变化为 ${short(groupDelta,true)} 万元。两者范围不同，不应画成同一个完整桥。</p><p>干气密封及控制系统与机械密封辅助系统是产品分类，不是公司披露的“新增项目”分部，不能把它们全部改名为新增业务。</p>${actions()}</div><div><div class="key-stat"><strong>${short(p.delta,true)}</strong><p>${p.label} · 毛利变化 / 万元</p></div><button id="pressure-all-products" class="secondary" data-open="table">查看八类产品及其他业务</button><p class="small-note" style="margin-top:14px">其他业务的成本原格空白。没有用零成本填平集团变化，也没有制造“其他贡献”柱。</p></div></div>`;
 return `<div class="detail-grid"><div>${heading('修复在增长，整体毛利仍在后退。')}<p class="lead">判断不是“维修没有价值”，而是目前的增长量级，还不足以改变集团毛利下降的事实。</p><p>先点选修复，检查增量与分母；再读公司对增长原因的解释。部分进口维修转入提供了增长机会，但部分业主“修复再利用”的选择也限制了对生命周期增收的推断。</p><div class="inline-actions"><button class="secondary" data-select="repair">选择修复贡献 ↗</button><button class="secondary" data-select="limit">查看判断的限制 ↗</button></div></div><div><div class="key-stat"><strong>+444.18 / −5,292.78</strong><p>修复毛利增量 / 集团毛利净变化，万元<br>2026 年 1–6 月，对 2025 年 1–6 月。</p></div><p class="small-note">披露事实是收入和成本；毛利、同比和占比是按元级原数复算的研究算术。半年报未经审计，不是年度趋势。</p></div></div>`;}
function calculation(){const p=product(),[a,b]=p.periods;const growth=(x,y)=>y===null||x===null?'原格空白':pct(y-x,x);return `${heading('把显示值还原到原表精度。',`当前产品 / ${p.label} · 元`)}<p>2026 年 1–6 月对 2025 年 1–6 月；集团合并口径，原表“合计”列。收入和成本披露至分，以下毛利为收入减成本，不是净利润或净现金。</p><div class="table-wrap"><table class="calculation-table"><thead><tr><th>项目 / 元</th><th>2025H1</th><th>2026H1</th><th>同比</th></tr></thead><tbody><tr><th>收入 · 披露</th><td>${money(a.revenueCents,'yuan')}</td><td>${money(b.revenueCents,'yuan')}</td><td>${growth(a.revenueCents,b.revenueCents)}</td></tr><tr><th>成本 · 披露</th><td>${money(a.costCents,'yuan')}</td><td>${money(b.costCents,'yuan')}</td><td>${growth(a.costCents,b.costCents)}</td></tr><tr class="calc-highlight"><th>毛利 · 复算</th><td>${money(a.gross,'yuan')}</td><td>${money(b.gross,'yuan')}</td><td>${a.gross===null||b.gross===null?'不可直接计算':growth(a.gross,b.gross)}</td></tr></tbody></table></div><div class="formula">${p.delta===null?'其他业务：成本原格空白，保留 null，不直接给出毛利。':`毛利增量 = ${money(b.gross,'yuan')} − ${money(a.gross,'yuan')} = <strong>${money(p.delta,'yuan',true)} 元</strong><br>最后一步换算为 <strong>${short(p.delta,true)} 万元</strong>，不使用万元显示值倒推。`}</div><div class="detail-grid"><div><h3>分母也来自合并原数</h3><p>集团毛利：${short(group[0].gross)} → ${short(group[1].gross)} 万元，净变化 ${short(groupDelta,true)} 万元。修复增量 ÷ 净下降金额 = ${pct(repair.delta,-groupDelta)}。</p><div class="inline-actions"><button class="secondary" data-source="H125" id="calc-H125">2025 原表 · 第 ${a.physical_page} 页 ↗</button><button class="secondary" data-source="H126" id="calc-H126">2026 原表 · 第 ${b.physical_page} 页 ↗</button><button id="calc-all-products" class="secondary" data-open="table">全部产品明细 ↗</button></div></div><div class="note-box"><h3>两类差异，不混为一谈</h3><p>2025H1 产品成本明细比合并成本少 ${money(auditGap,'yuan')} 元，原因未明，不分摊给其他业务。万元显示值逐项求和的舍入差另行存在，不能拿它解释原数差。</p><p style="margin-top:10px">数值订正：修复＋零配件毛利增量相当于集团净下降金额的 ${pct(combined,-groupDelta)}，不是旧稿的 13.76%。原研究快照保留不改。</p></div></div>`;}

function evidence() {
  const p = product(), [a,b] = p.periods;
  const financialTitle = p.id === 'repair' ? '修复毛利确实增加了 444.18 万元' : p.delta === null ? p.label + '：成本未列示，不直接给出毛利' : p.label + '毛利变化 ' + short(p.delta, true) + ' 万元';
  const financialMeaning = p.id === 'repair'
    ? '两期“密封产品修复”行的收入与成本可以直接复算毛利。它支持“修复在增长”，同时可以与集团合并毛利比较规模。'
    : p.delta === null ? '两期收入已列示，但成本原格空白。这里保留原数，不把空白当成零成本，也不据此推算100%毛利率。'
    : '两期当前产品行的收入与成本可以直接复算毛利变化。数值支持量级比较，但不能单凭财务输入归因于新增项目，也不是完整集团毛利桥。';
  return `${heading('同时保留支持，与限制判断的证据。','证据层 / 本条已核两类来源')}<p>财务原数对应当前产品“${p.label}”；下方 IR0908 仅解释修复增长，不是对其他产品的归因。管理层没有披露替代金额或同群售后净现金。</p><div class="evidence-grid"><article class="evidence-card ${state.selection === 'support' ? 'selected' : ''}"><div class="evidence-type"><span>支持 · 当前产品原始财务输入</span><span>H125 / H126</span></div><h3>${financialTitle}</h3><p>${financialMeaning}</p><span class="source-location">2025 半年度报告 · 物理/印刷第${a.physical_page}页<br>2026 半年度报告 · 物理/印刷第${b.physical_page}页<br>集团合并分母：第118 / 121页</span><div class="source-actions"><button data-select="support" id="evidence-support-select">选择此证据</button><button data-source="H125" id="evidence-H125">2025 原数与来源 ↗</button><button data-source="H126" id="evidence-H126">2026 原数与来源 ↗</button></div><p class="small-note">不支持：修复＝全部存量业务；毛利＝净现金；三项＝完整集团桥。</p></article><article class="evidence-card limit ${state.selection === 'limit' ? 'selected' : ''}"><div class="evidence-type"><span>限制 · 仅涉及修复</span><span>IR0908</span></div><h3>修复增长，不必然增加生命周期收入</h3><p class="quote">“优先选择修复再利用，而不是直接更换备件”</p><p>管理层给出两个原因：部分进口品牌维修转入，以及部分业主出于降本选择修复。不能只摘第二个原因，抹去进口替代机会。</p><span class="source-location">2026-09-08 投关记录 · 问答2跨物理第1–2页<br>短引文在第2页开头，原件未印页码。</span><div class="source-actions"><button data-select="limit" id="evidence-limit-select">选择此证据</button><button data-source="IR0908" id="evidence-IR0908">读摘录上下文与原件 ↗</button></div><p class="small-note">仅涉及部分业主、部分项目；没有替代金额、净现金或全体客户行为数据。${p.id === 'repair' ? '' : '当前产品仍为“'+p.label+'”；此记录不作为该产品的增长原因或支持证据。'}</p></article></div>`;
}
function detail() {
  const renderers = {explain, calculation, evidence, assumptions, snapshot};
  $('#selection-badge').textContent = '当前 · ' + product().label + (['support','limit','judgment'].includes(state.selection) ? ' / ' + names[state.selection] : '');
  $('#selection-live').textContent = '已选择' + product().label + '，两期原数同步，当前' + tabs[state.tab];
  $$('[role=tab]').forEach(button => {
    const selected = button.dataset.tab === state.tab;
    button.setAttribute('aria-selected', selected);
    button.tabIndex = selected ? 0 : -1;
  });
  $('#detail-content').setAttribute('aria-labelledby', 'tab-' + state.tab);
  $('#detail-content').innerHTML = renderers[state.tab]();
}
function assumptions(){return `<div class="detail-grid"><div>${heading('高维修毛利率，不能代替现金回收。','假设边界 / 不制作未经核验的滑块')}<p class="lead">真正需要回答的是：让出初装利润后，未来究竟留下多少售后净现金？</p><p>原研究设有有限年限实验：额外牺牲初装现金、延后收到售后现金、限定有效年限并折现。它与公司披露的收入、成本事实分开。</p><p>本轮没有恢复并核对原研究模型的输入与计算源，因此不把新写的公式冒充原模型，也不开放参数操作。财务原数的确定性计算仍可完整检查。</p></div><div class="no-model"><span class="mini-eyebrow">当前状态 · 模型源待核</span><h3>不把未知变成交互演示</h3><p>缺少同群装机回款、服务成本与资本占用，就不能从 80.80% 的修复毛利率推出项目净现值为正。</p><button class="secondary" data-tab="calculation" style="margin-top:16px">返回已核财务计算</button></div></div>`;}
function snapshot(){return `${heading('只有一份真实研究快照，不制造历史回放。','时间与版本 / 内容版本不等于界面版本')}<div class="timeline"><time>2026-10-17</time><div><h3>原研究快照</h3><p>现有公开研究的固定版本。其历史价格 26.57 元为 2026-10-16 未复权收盘，不是实时行情。本页不把年度与半年串成同频趋势。</p><p class="small-note">原稿 SHA256：36ede2208d9edcb82f28f4f0947a44f73e0875a2908058d3288e806855585a6c</p></div></div><div class="timeline"><time>2026-10-24</time><div><h3>最小来源核验与数值订正</h3><p>两期18条产品/其他业务输入和6张原页已核；修复＋零配件占比订正为13.77%，投关摘录位置改为物理第1–2页。不是新一轮经营判断。</p></div></div><div class="timeline"><time>2026-10-25</time><div><h3>研究工作区界面版本</h3><p>加入同对象选择、计算口径、证据阅读与返回。只是界面实施版本，不是新研究快照。</p></div></div>`;}
function table(){return `<article class="reader-main"><button class="back-btn" data-back>← 返回刚才的研究位置</button><div class="mini-eyebrow" style="margin-top:18px">完整范围 / 八类产品及其他业务</div><h1 id="reader-title" tabindex="-1">三项相加，不等于集团全貌。</h1><p>毛利按元级收入减成本复算，单位：万元。点击产品名可选择对应行；其他业务成本为空，不把空白改成披露零。</p><div class="table-wrap"><table class="product-table"><thead><tr><th>产品或业务</th><th>2025H1 毛利</th><th>2026H1 毛利</th><th>毛利变化</th></tr></thead><tbody>${rows.map(r=>`<tr data-selected="${state.product===r.id}" id="row-${r.id}"><th><button data-select="${r.id==='repair'?'repair':'pressure'}" data-product="${r.id}" id="table-${r.id}" aria-pressed="${state.product===r.id}">${r.label}</button></th><td class="${r.delta===null?'null-cell':''}">${r.periods[0].gross===null?'成本原格空白':short(r.periods[0].gross)}</td><td class="${r.delta===null?'null-cell':''}">${r.periods[1].gross===null?'成本原格空白':short(r.periods[1].gross)}</td><td>${r.delta===null?'不直接给出':short(r.delta,true)}</td></tr>`).join('')}<tr class="calc-highlight"><th>集团合并（直接复算）</th><td>${short(group[0].gross)}</td><td>${short(group[1].gross)}</td><td>${short(groupDelta,true)}</td></tr></tbody></table></div><div class="note-box"><p>其他业务两期收入为 ${money(byId['other-business'].periods[0].revenueCents,'yuan')} 元、${money(byId['other-business'].periods[1].revenueCents,'yuan')} 元；成本为 null。没有据此显示100%实际毛利率。</p><p style="margin-top:10px">2025H1成本明细比合并少0.01元，原因未明。分项万元显示值有舍入差，集团合计独立从合并元级原数计算。未绘制“补差贡献”。</p></div><div class="inline-actions"><button class="secondary" data-source="H125" id="table-source-H125">2025 原表与来源 ↗</button><button class="secondary" data-source="H126" id="table-source-H126">2026 原表与来源 ↗</button></div><div class="reader-return"><button class="back-btn" data-back>← 返回并保留阅读位置</button></div></article>`;}
function sourceReader(){const s=source(state.source);if(!s)return `<article class="reader-main"><h1 id="reader-title" tabindex="-1">来源不存在</h1><p>未匹配到当前已核来源，未跳转到其他记录。</p><button data-back class="back-btn">返回研究</button></article>`;const isIR=s.source_id==='IR0908',p=product(),period=isIR?null:p.periods.find(r=>r.source_id===s.source_id),page=isIR?2:period.physical_page;return `<article class="reader-main"><button class="back-btn" data-back>← 返回刚才的研究位置</button><div class="mini-eyebrow" style="margin-top:18px">来源阅读 / ${s.source_id} · 已核定位</div><h1 id="reader-title" tabindex="-1">${isIR?'修复再利用：两种增长原因要一起读':p.label+'：收入与成本的原数'}</h1><div class="source-meta"><p><strong>${s.formal_title}</strong></p><p>文件日期：${s.document_date} · ${s.hosting_identity}</p><p>${isIR?'问答2跨物理第1–2页，原件未印页码；短引文在第2页开头。':`物理/印刷第${page}页，营业收入、营业成本的分解信息，“合计”列，${p.label}行。`}</p></div>${isIR?`${p.id==='repair'?'':`<p class="note-box">当前对照对象仍为${p.label}。以下问答只解释修复收入增长，不用于归因当前产品。</p>`}<h2>已核短摘录</h2><p class="quote">“优先选择修复再利用，而不是直接更换备件”</p><h2>上下文与研究解释</h2><p>问答2询问2026年上半年修复收入增长原因。公司先指出部分进口品牌的高端机械密封维修转入，是存量市场进口替代的机会；随后指出，部分业主出于降本，在部分项目中优先修复再利用。</p><p>这段解释支持“存在新增维修机会”，也限制“修复增长必然增加单台装置生命周期收入”的推断。上述是研究概括，不是发行人逐字全文。</p><div class="note-box"><p>范围：部分业主、部分项目。未披露替代金额、售后净现金或全体客户行为。旧稿仅标第1页不完整，本处订正为跨物理第1–2页。</p></div>`:`<p>以下是已核原数的语义化重排，不是PDF原页截图。原表单位为元，“分部1”与“合计”是并列列组，未重复相加。</p><div class="table-wrap"><table class="calculation-table"><thead><tr><th>原表行</th><th>营业收入 / 元</th><th>营业成本 / 元</th></tr></thead><tbody><tr class="calc-highlight"><th>${period.period} · ${p.label}</th><td>${money(period.revenueCents,'yuan')}</td><td>${money(period.costCents,'yuan')}</td></tr></tbody></table></div><p><strong>研究复算：</strong>${period.gross===null?'成本原格空白，不能直接计算实际毛利。':`${money(period.revenueCents,'yuan')} − ${money(period.costCents,'yuan')} = ${money(period.gross,'yuan')} 元毛利。`}</p><p>集团合并分母分别位于2025报告第118页、2026报告第121页。毛利由收入减成本得到，不是发行人另行披露的净现金。</p>`}<h2>读取完整原件</h2><p>下面链接打开登记的PDF。页码深链取决于阅读器支持；如果未定位，请前往物理第 ${isIR?'1–2':page} 页。新标签打开，不清空当前选择；若原件加载失败，本页仍保留来源与已核摘录，不将其冒充已读原件。</p><a class="external" id="external-${s.source_id}" href="${esc(s.original_url)}#page=${page}" target="_blank" rel="noopener">打开 ${s.source_id} 原件 PDF ↗</a><p class="sha">文件 SHA256：${s.sha256}</p><div class="reader-return"><button class="back-btn" data-back>← 返回并恢复选择、滚动与焦点</button></div></article>`;}

function syncScene() {
  const visible = state.view === 'workspace' && MAPPED_PRODUCTS.includes(state.product) && !document.hidden;
  scene?.setState({product:state.product, paused:state.paused, mode:state.mode, visible, expanded:state.expanded || state.mode==='flat' || !MAPPED_PRODUCTS.includes(state.product), source:state.source});
  // A newly revealed canvas also needs a measurement when ResizeObserver is
  // unavailable. Never measure/render the hidden reader's workspace.
  if (visible && state.mode === 'spatial') scene?.resize();
}
function updateRenderStatus() {
  const label = MAPPED_PRODUCTS.includes(state.product) ? rendererStatus : '该产品未建立空间对象，当前显示平面原数';
  $('#render-status').textContent = label;
  $('#scene-diagnostics').textContent = '当前渲染：' + label + '。两个来源曲面与三产品列共用位置；文字和金额为正视 HTML。曲面不编码金额。此候选尚未完成浏览器与移动真机验收。';
}
function render() {
  const isWork = state.view === 'workspace';
  const mapped = MAPPED_PRODUCTS.includes(state.product);
  const showFlat = state.mode === 'flat' || !mapped;
  $('#workspace').hidden = !isWork;
  $('#reader').hidden = isWork;
  $('#scene-selection-caption').textContent = sceneSelectionCaption(state);
  document.body.classList.toggle('paused', state.paused);
  $('#pause').textContent = state.paused ? '继续动效' : '暂停动效';
  $('#pause').setAttribute('aria-pressed', state.paused);
  $('#motion-setting').checked = state.paused;
  $('#mode-spatial').setAttribute('aria-pressed', state.mode === 'spatial');
  $('#mode-flat').setAttribute('aria-pressed', state.mode === 'flat');
  $('#flat-view').hidden = true;
  $('#scene').hidden = showFlat;
  $('#scene-labels').hidden = true;
  chart();
  selectedRecords();
  detail();
  $$('[data-select]').forEach(button => {
    if (button.closest('#reader') || button.closest('#scene-labels')) return;
    button.setAttribute('aria-pressed', button.dataset.product ? button.dataset.product === state.product : button.dataset.select === state.selection);
  });
  if (!isWork) $('#reader').innerHTML = state.view === 'table' ? table() : sourceReader();
  syncScene();
  updateRenderStatus();
  document.documentElement.dataset.selection = state.selection;
  document.documentElement.dataset.product = state.product;
  document.documentElement.dataset.tab = state.tab;
  document.documentElement.dataset.mode = state.mode;
  document.documentElement.dataset.view = state.view;
  document.documentElement.dataset.sceneMapped = String(MAPPED_PRODUCTS.includes(state.product));
}
document.addEventListener('click', event => {
  const anchor = event.target.closest('a');
  if (anchor?.getAttribute('href') === '#selected-records') {
    event.preventDefault?.();
    dispatch({type:'view', patch:{view:'workspace', source:null, expanded:true}});
    $('#source-field').scrollIntoView({behavior:state.paused ? 'instant' : 'smooth', block:'start'});
    $('#selected-records').focus({preventScroll:true});
    return;
  }
  if (anchor && ['#question','#selected-records'].includes(anchor.getAttribute('href')) && state.view !== 'workspace') {
    dispatch({type:'view', patch:{view:'workspace', source:null}});
  }
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-back')) return back();
  if (button.dataset.source) {
    if (button.dataset.sourceProduct && byId[button.dataset.sourceProduct] && button.dataset.sourceProduct !== state.product) selectProduct(button.dataset.sourceProduct);
    // Source period follows the chosen row. IR is explicitly repair-only text,
    // not a command to silently replace a dry/auxiliary/full-table selection.
    if (button.closest('.evidence-card')) dispatch({type:'select', id:button.dataset.source === 'IR0908' ? 'limit' : 'support'});
    return navigate('source', button.dataset.source);
  }
  if (button.dataset.open === 'table') return navigate('table');
  if (button.dataset.product && button.dataset.select) return selectProduct(button.dataset.product);
  if (button.dataset.select) return dispatch({type:'select', id:button.dataset.select});
  if (button.dataset.tab) {
    const jump = button.hasAttribute('data-jump-detail');
    return dispatch(jump ? {type:'view', patch:{tab:button.dataset.tab, view:'workspace', source:null}} : {type:'tab', tab:button.dataset.tab}, {scroll:jump});
  }
  switch (button.id) {
    case 'unfold-sources': dispatch({type:'view', patch:{expanded:!state.expanded}}); break;
    case 'start-repair': selectProduct('repair', {scroll:true}); break;
    case 'all-products': navigate('table'); break;
    case 'mode-flat': dispatch({type:'view', patch:{mode:'flat'}}); break;
    case 'mode-spatial':
      if (!sceneFailure) dispatch({type:'view', patch:{mode:'spatial'}});
      break;
    case 'pause': dispatch({type:'view', patch:{paused:!state.paused}}); break;
    case 'settings-toggle':
      $('#settings').hidden = !$('#settings').hidden;
      button.setAttribute('aria-expanded', !$('#settings').hidden);
      break;
  }
});
$('#motion-setting').addEventListener('change', event => dispatch({type:'view', patch:{paused:event.target.checked}}));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (state.view !== 'workspace') { event.preventDefault(); back(); }
    else if (!$('#settings').hidden) {
      $('#settings').hidden = true;
      $('#settings-toggle').setAttribute('aria-expanded', false);
      $('#settings-toggle').focus({preventScroll:true});
    }
  }
  if (event.target.matches('[role=tab]') && ['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) {
    event.preventDefault();
    const list = $$('[role=tab]');
    let i = list.indexOf(event.target);
    i = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
    dispatch({type:'tab', tab:list[i].dataset.tab}, {focus:list[i].id});
  }
});
document.addEventListener('visibilitychange', syncScene);
motionQuery.addEventListener?.('change', event => {
  // A new OS request to reduce motion stops all transitions; turning the OS
  // preference off never silently resumes a manually paused workspace.
  if (event.matches) dispatch({type:'view', patch:{paused:true}});
});
render();
try {
  scene = createSourceSurface({
    canvas:$('#scene'), host:$('#source-field'), onProjection:applyProjection,
    onStatus:status => {
      rendererStatus = typeof status === 'string' ? status : status.label || JSON.stringify(status);
      updateRenderStatus();
    }
  });
  if (scene.stats?.().renderer === 'unavailable') throw new Error('Record scene drawing context unavailable');
  // A refreshed/returned expanded route must be readable before restoring its
  // source-button focus; animate only subsequent user-initiated unfolds.
  scene.setState({product:state.product, paused:state.paused, mode:state.mode, visible:false,
    expanded:state.expanded || state.mode==='flat' || !MAPPED_PRODUCTS.includes(state.product), source:state.source});
  syncScene();
} catch (error) {
  sceneFailure = true;
  rendererStatus = '空间初始化失败，原数与平面仍可用';
  $('#mode-spatial').setAttribute('disabled', '');
  state = normalizeApp({...state, mode:'flat'});
  render();
  console.error('Record scene initialization failed', error);
}
const restoreContext = !hasURLState && saved ? saved : history.state?.app === KEY ? history.state : null;
replaceHistory(history.state?.app === KEY ? {returnContext:history.state.returnContext} : {});
if (restoreContext) restore(restoreContext);
window.addEventListener('pageshow', () => { syncScene(); if (state.view === 'workspace') scene?.resize(); });
