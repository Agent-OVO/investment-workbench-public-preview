import { REPORTS, candidateHref } from '../research-history-data.js';
import { GROUPS, categoryFor, searchReports, spaceHref, initialSelection, paragraphPreview } from './multispace-data.js';
import { loadSnapshot } from './reader.js';
import { createHybridReadingHost } from './hybrid-reading-host.js';
import { renderHybridBody } from './hybrid-content.js';
import { applyVerifiedResearchIdentity } from './apply-authored-surfaces.js';
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const mounted = new WeakMap();

// This increment wires native reading only. There is deliberately no new B
// renderer, old three-plane renderer, static art image, or fake world position.
export function mountC01(doc = document, win = window, { load = loadSnapshot, scenePort = null } = {}) {
  mounted.get(doc)?.dispose();
  const q = s => doc.querySelector(s), root = q('#main'), workspace = q('[data-hybrid-workspace]');
  let query = '', group = 'all', currentReport = null, disposed = false, sceneUnsubscribe = null;
  function paintCatalog() {
    const rows = searchReports(query, group);
    q('[data-catalog-list]').innerHTML = rows.map(r => `<article class="catalog-entry" aria-current="${r.slug === currentReport?.slug}"><small>${esc(GROUPS.find(x => x[0] === categoryFor(r.slug))[1])} · ${esc(r.researchAsOf.slice(0,10))}</small><h3>${esc(r.company)}</h3><p>${esc(r.title.replace(/^.*?[:：]/,''))}</p><nav><a href="${spaceHref('overview',r.slug)}" data-select-report="${r.slug}">选择这份研究 ↗</a><a href="${candidateHref('reader',r.slug)}">全文</a><a href="${candidateHref('history',r.slug)}">版本</a></nav></article>`).join('') || '<p class="empty-state">没有匹配的公开研究。</p>';
    q('[data-search-status]').textContent = `显示 ${rows.length} / ${REPORTS.length} 份固定公开样本；不是全市场覆盖。`;
  }
  function setLinks(report) {
    for (const a of doc.querySelectorAll('[data-space-link]')) {
      const page = a.dataset.spaceLink;
      a.href = ['overview','study'].includes(page) ? spaceHref(page, report?.slug || '') : candidateHref(page, report?.slug || '');
    }
  }
  const host = createHybridReadingHost({ doc, win, root,
    panel:q('[data-hybrid-reader]'), body:q('[data-hybrid-body]'), shell:q('[data-reader-shell]'), title:q('[data-hybrid-title]'),
    load, renderBody:renderHybridBody,
    onClear() {
      delete workspace.dataset.report; delete workspace.dataset.sourceSha256;
      q('[data-selected-name]').textContent = currentReport ? currentReport.company : '未选定有效研究';
      q('[data-selected-question]').textContent = '';
      q('[data-selected-date]').textContent = '';
      q('[data-selected-preview]').textContent = '';
      if (scenePort?.root) applyVerifiedResearchIdentity(scenePort.root, null);
    },
    onVerified({report,loaded}) {
      workspace.dataset.report = report.slug;
      workspace.dataset.sourceSha256 = loaded.sha256;
      q('[data-selected-name]').textContent = report.company;
      q('[data-selected-question]').textContent = report.title.replace(/^.*?[:：]/,'');
      q('[data-selected-date]').textContent = `研究截点 ${report.researchAsOf} · 固定公开快照，非当前报价`;
      q('[data-selected-preview]').textContent = paragraphPreview(loaded.raw, 180);
    },
    onStatus(message, level = 'status') { const status = q('[data-load-status]'); status.setAttribute('role', level === 'status' ? 'status' : 'alert'); status.textContent = message; },
    onState(state) {
      workspace.dataset.readerOpen = String(state.reader.open);
      // A future real scene consumes this eligibility before its first draw.
      // This is not a claim that a renderer or world labels exist in this build.
      if (scenePort?.root) applyVerifiedResearchIdentity(scenePort.root, state.printedResearchEligibility);
      scenePort?.onReadingState?.(state);
    },
    onDispose() { cleanup(); }
  });
  function cleanup() {
    if (disposed) return;
    disposed = true;
    doc.removeEventListener('click', click);
    q('[data-search]').removeEventListener('input', search);
    q('[data-open-catalog]').removeEventListener('click', openCatalog);
    win.removeEventListener('popstate', render);
    sceneUnsubscribe?.();
    if (scenePort?.root) applyVerifiedResearchIdentity(scenePort.root, null);
    scenePort?.dispose?.();
    mounted.delete(doc);
  }
  async function render() {
    if (disposed) return false;
    const selection = initialSelection(win.location.search);
    if (selection.isDefault) win.history.replaceState(win.history.state, '', spaceHref('overview', selection.report.slug));
    currentReport = selection.report || null;
    setLinks(currentReport); paintCatalog();
    if (!currentReport) {
      host.clear();
      const status = q('[data-load-status]'); status.setAttribute('role','alert'); status.textContent = selection.message;
      return false;
    }
    return host.select(currentReport, { baseURL:win.location.href });
  }
  function click(e) {
    const a = e.target.closest?.('[data-select-report]');
    if (a && !e.defaultPrevented && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (e.button == null || e.button === 0)) {
      e.preventDefault(); win.history.pushState(null,'',spaceHref('overview',a.dataset.selectReport));
      void render(); root.scrollIntoView?.({block:'start',behavior:'auto'}); q('[data-selected-name]').focus?.({preventScroll:true});
    }
    const b = e.target.closest?.('[data-group]');
    if (b) {
      group = b.dataset.group;
      for (const el of q('[data-filters]').children) el.setAttribute('aria-pressed',String(el.dataset.group === group));
      paintCatalog();
    }
  }
  function search(e) { query = e.target.value; paintCatalog(); }
  function openCatalog(e) { if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || (e.button != null && e.button !== 0)) return; e.preventDefault(); q('#catalog').scrollIntoView?.({block:'start',behavior:'auto'}); q('[data-search]').focus({preventScroll:true}); }
  q('[data-filters]').innerHTML = GROUPS.map(([id,title]) => `<button type="button" data-group="${id}" aria-pressed="${id === 'all'}">${title}</button>`).join('');
  doc.addEventListener('click',click);
  q('[data-search]').addEventListener('input',search);
  q('[data-open-catalog]').addEventListener('click',openCatalog);
  win.addEventListener('popstate',render);
  if (scenePort?.root) applyVerifiedResearchIdentity(scenePort.root,null);
  if (scenePort?.subscribeAvailability) sceneUnsubscribe = scenePort.subscribeAvailability(state => host.sceneChanged(state));
  const handle = { render, getState:() => ({report:currentReport?.slug || null, disposed, reading:host.getState(), scene:'unconnected unless an explicit real scene port is supplied'}), dispose(){host.dispose();cleanup();} };
  mounted.set(doc,handle); void render(); return handle;
}
if (globalThis.document?.body?.dataset.spacePage === 'c01-hybrid') mountC01();
if (globalThis.document?.fonts) document.fonts.ready.then(() => { document.body.dataset.fontsState = document.fonts.check('18px "Atelier Sans"','研究摘要来源') && document.fonts.check('24px "Atelier Serif"','研究总览') ? 'loaded' : 'fallback'; });
