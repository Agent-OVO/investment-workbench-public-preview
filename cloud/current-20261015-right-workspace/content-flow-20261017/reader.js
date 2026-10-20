import {escapeXml as esc} from '../integration/chart.js';
import {renderReadableChart, renderChartValues} from './chart-reading.js';
import {createContentAdapter} from '../content/art-rebuild/adapter.js';
import {chapterEvidence, displayEvidence} from './content-context.js';

export function mountReader({root, store, content}) {
  if (!root || !store || content.schema !== 'c01-content-v1') throw new Error('READER_CONTRACT');
  const doc = root.ownerDocument;
  const interactions = createContentAdapter({store,content});
  const stylesheet = doc.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('../reader/reader.css', import.meta.url).href;
  stylesheet.dataset.c01Reader = 'true';
  doc.head.append(stylesheet);
  root.classList.add('c01-reader-root');
  root.style.setProperty('--reader-text-scale', 1);
  root.innerHTML = `<dialog class="c01-sheet c01-reading" aria-labelledby="c01-article-title"><header class="c01-toolbar"><span class="c01-kicker">DEEP READING / 深度阅读</span><button type="button" data-close-reading aria-label="关闭正文，返回研究空间">返回空间 <span aria-hidden="true">×</span></button></header><div class="c01-reader-controls"><label>保存版本 <select data-reader-version aria-label="正文版本"></select></label><label>文字大小 <select data-reader-scale aria-label="文字大小"><option value="100">100%</option><option value="125">125%</option><option value="150">150%</option><option value="200">200%</option></select></label></div><div class="c01-read-scroll" tabindex="0" aria-label="可滚动研究正文"><article class="c01-article"></article></div></dialog><dialog class="c01-sheet c01-evidence" aria-labelledby="c01-evidence-title"><header class="c01-toolbar"><span class="c01-kicker">EVIDENCE / 证据详情</span><button type="button" data-close-evidence aria-label="关闭证据，返回此前视图">返回 <span aria-hidden="true">×</span></button></header><div class="c01-evidence-scroll" tabindex="0" aria-label="可滚动证据详情"></div></dialog>`;
  const reading = root.querySelector('.c01-reading');
  const evidenceDialog = root.querySelector('.c01-evidence');
  const article = root.querySelector('.c01-article');
  const scroll = root.querySelector('.c01-read-scroll');
  const evidenceBody = root.querySelector('.c01-evidence-scroll');
  const versions = root.querySelector('[data-reader-version]');
  const scale = root.querySelector('[data-reader-scale]');
  let lastSnapshot = null, renderedResult = null, renderedEvidence = null;
  let previousSpaceView = 'overview', spaceFocus = null, evidenceFocus = null, spaceFocusKey = null;
  let spaceScroll = [0, 0], evidenceFromReading = false;
  const ignoredCloseEvents = new WeakMap();
  const positions = new Map();
  const key = s => JSON.stringify([s.state.researchId, s.state.versionId, s.resultId]);
  // A closed native dialog has no scroll layout; never save its retained/clamped offset.
  const remember = () => { if (reading.open && lastSnapshot && renderedResult) positions.set(renderedResult, scroll.scrollTop); };
  const restoreFocus = target => {
    if (target?.isConnected && !target.closest('dialog:not([open])')) target.focus({preventScroll:true});
    else (reading.open ? root.querySelector('[data-close-reading]') : (spaceFocusKey && [...doc.querySelectorAll('[data-focus-key]')].find(el=>el.dataset.focusKey===spaceFocusKey) || doc.querySelector('#read, [data-c01-read]')))?.focus({preventScroll:true});
  };
  const closeNative = dialog => { if(dialog.open){ ignoredCloseEvents.set(dialog, (ignoredCloseEvents.get(dialog)||0)+1); dialog.close(); } };
  const openNative = (dialog, button) => { if(!dialog.open){ dialog.showModal(); button.focus({preventScroll:true}); } };
  const metadata = (e, s) => `<dl class="c01-provenance"><div><dt>证据身份</dt><dd>${esc(e.id)} · ${esc(s.version.versionId)} · ${esc(s.resultId)}</dd></div><div><dt>来源</dt><dd>${esc(e.source)}</dd></div><div><dt>单位</dt><dd>${esc(e.units || '不适用')}</dd></div><div><dt>时间范围</dt><dd>${esc(e.timeRange)}</dd></div><div><dt>资料性质</dt><dd>合成演示资料</dd></div>${e.displayCorrection ? `<div><dt>演示数据修正</dt><dd>${esc(e.displayCorrection)}</dd></div>` : ''}</dl>`;
  const media = e => {
    if(e.kind === 'chart') return `<div class="c01-chart" data-chart-id="${esc(e.id)}">${renderReadableChart(e)}</div>${renderChartValues(e)}`;
    if(e.kind === 'document') return `<div class="c01-missing-document"><span class="c01-kicker">DOCUMENT RECORD</span><strong>原始 PDF 不存在</strong><p>保留合成附件身份与出处，未提供可打开的原件。</p></div>${e.syntheticPreviewAsset ? `<figure class="c01-figure"><p class="c01-note">合成附件预览 · 原创 SVG，非 PDF 原件</p><img class="c01-evidence-image" data-synthetic-preview src="${esc(e.syntheticPreviewAsset)}" alt="合成研究附件的原创 SVG 缩略预览，不是 PDF 原件"><figcaption>仅保留 V3 的示意预览；没有原件下载。</figcaption></figure>` : ''}`;
    const safe = typeof e.asset === 'string' && /^(data:image\/(svg\+xml|png|jpeg|webp);|\.?\.?\/|assets\/)/.test(e.asset);
    return safe ? `<img class="c01-evidence-image" src="${esc(e.asset)}" alt="${esc(e.alt || e.title)}" width="960" height="640">` : `<p class="c01-empty">此图像未提供可读资产。</p>`;
  };
  const figure = e => `<figure class="c01-figure">${media(e)}<figcaption><button type="button" data-reader-evidence="${esc(e.id)}">${esc(e.id)} · ${esc(e.title)} <span aria-hidden="true">↗</span></button><span>${esc(e.source)} · ${esc(e.timeRange)}</span>${e.displayCorrection ? `<span>${esc(e.displayCorrection)}</span>` : ''}</figcaption></figure>`;
  function renderArticle(s) {
    remember();
    renderedResult = key(s);
    const {research:r,version:v} = s;
    const presentation = interactions.getPresentation();
    versions.innerHTML = r.versions.map(x=>`<option value="${esc(x.versionId)}">${esc(x.versionId.toUpperCase())} · ${esc(x.change)}</option>`).join('');
    versions.value = v.versionId;
    const chapters = v.article.chapters;
    article.innerHTML = `<div class="c01-article-kicker">研究文章 · 合成演示</div><h1 id="c01-article-title">${esc(v.article.title)}</h1><p class="c01-deck">${esc(v.article.deck)}</p><div class="c01-identity">${esc(r.researchId)}<br>${esc(v.versionId.toUpperCase())} / ${esc(v.resultId)} · ${esc(v.dateLabel)}</div><p class="c01-note">全文、图表与关系均为合成演示；事实时点不适用。</p><details class="c01-toc"><summary>文章目录 · ${chapters.length} 章</summary><nav aria-label="正文目录">${chapters.map(ch=>`<a href="#c01-chapter-${esc(ch.id)}" data-reader-anchor="${esc(ch.id)}">${esc(ch.title)}</a>`).join('')}</nav></details>${chapters.map(ch=>`<section id="c01-chapter-${esc(ch.id)}" class="c01-chapter" tabindex="-1"><h2>${esc(ch.title)}</h2>${ch.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}${chapterEvidence(s,ch).map(figure).join('')}</section>`).join('')}<section class="c01-evidence-index"><h2>本版证据与关联</h2><p>${s.evidence.length} 项证据 · ${s.relations.length} 条已登记合成关系</p><div>${s.evidence.map(e=>`<button type="button" data-reader-evidence="${esc(e.id)}">${esc(e.id)} · ${esc(e.title)}${e.kind==='document'?' · 原件缺失':''} <span aria-hidden="true">↗</span></button>`).join('')}</div>${presentation.relations.length ? presentation.relations.map(rel=>`<p class="c01-relation">${esc(rel.label)} · ${esc(rel.fromResultId)} → ${esc(rel.toResultId)}<br>依据：${rel.evidenceIds.map(esc).join('、')}<br><button type="button" data-reader-relation="${esc(rel.id)}">打开关联研究：${esc(rel.target.title)} <span aria-hidden="true">↗</span></button></p>`).join('') : '<p class="c01-empty">本版未登记关联。</p>'}</section><footer class="c01-article-footer">正文结束 · 随时返回研究空间，稍后可从此位置继续。</footer>`;
  }
  function render(s) {
    const previous = lastSnapshot;
    const readingRequested = s.state.view === 'reading';
    const evidenceRequested = s.state.view === 'evidence' && !!s.selectedEvidence;
    const wasSpace = !previous || ['overview','focus','relations','timeline'].includes(previous.state.view);
    if((readingRequested || evidenceRequested) && wasSpace){
      previousSpaceView = s.state.spaceView || previous?.state.view || 'overview';
      spaceFocus = doc.activeElement; spaceFocusKey = spaceFocus?.dataset?.focusKey || null;
      spaceScroll = [window.scrollX, window.scrollY];
    }
    if(evidenceRequested && previous?.state.view !== 'evidence'){
      evidenceFromReading = s.state.evidenceReturnView === 'reading';
      evidenceFocus = doc.activeElement;
      renderedEvidence = null;
    }
    if(evidenceRequested) evidenceFromReading = s.state.evidenceReturnView === 'reading';
    else if(s.state.view !== 'reading') evidenceFromReading = false;
    if(readingRequested || (evidenceRequested && evidenceFromReading)){
      const restorePosition = renderedResult !== key(s) || !reading.open;
      if(renderedResult !== key(s)) renderArticle(s);
      // Opening reading must not place it above an already-open evidence dialog.
      if(!reading.open && evidenceDialog.open) closeNative(evidenceDialog);
      openNative(reading, root.querySelector('[data-close-reading]'));
      // Apply after showModal: setting scrollTop while display:none does not reset a new article.
      if(restorePosition) scroll.scrollTop = positions.get(renderedResult) ?? 0;
    }else{ remember(); closeNative(reading); }
    if(evidenceRequested){
      const identity = `${key(s)}/${s.selectedEvidence.id}`;
      const resetEvidencePosition = renderedEvidence !== identity;
      if(resetEvidencePosition){
        const e = displayEvidence(s.selectedEvidence,s.research.researchId);
        evidenceBody.innerHTML = `<span class="c01-article-kicker">${e.kind==='chart'?'图表与数值':e.kind==='document'?'附件身份记录':'图像证据'} · 合成演示</span><h2 id="c01-evidence-title">${esc(e.title)}</h2>${media(e)}${metadata(e,s)}`;
        renderedEvidence = identity;
      }
      openNative(evidenceDialog, root.querySelector('[data-close-evidence]'));
      // Like reading, evidence has no scroll layout until showModal has opened it.
      if(resetEvidencePosition) evidenceBody.scrollTop = 0;
    }else{ closeNative(evidenceDialog); renderedEvidence = null; }
    if(!readingRequested && !evidenceRequested && previous && ['reading','evidence'].includes(previous.state.view)){
      window.scrollTo(...spaceScroll);
      restoreFocus(spaceFocus);
      evidenceFromReading = false;
    }
    if(readingRequested && previous?.state.view === 'evidence') restoreFocus(evidenceFocus);
    root.dataset.active = readingRequested ? 'reading' : evidenceRequested ? 'evidence' : 'closed';
    root.dispatchEvent(new CustomEvent('c01-reader-visibility',{bubbles:true,detail:{reading:reading.open,evidence:evidenceDialog.open}}));
    lastSnapshot = s;
  }
  const exitReading = () => { remember(); store.dispatch({type:'return-space'}); };
  const exitEvidence = () => { store.dispatch({type:'return-evidence'}); };
  const click = event => {
    const el = event.target.closest('button, a');
    if(!el || !root.contains(el)) return;
    if(el.hasAttribute('data-close-reading')) exitReading();
    else if(el.hasAttribute('data-close-evidence')) exitEvidence();
    else if(el.dataset.readerEvidence) interactions.activate({kind:'evidence',id:el.dataset.readerEvidence});
    else if(el.dataset.readerRelation){const relation=interactions.getPresentation().relations.find(r=>r.id===el.dataset.readerRelation);if(relation)store.dispatch({...relation.action,view:'relations'});}
    else if(el.dataset.readerAnchor){ event.preventDefault(); const target=article.querySelector(`#c01-chapter-${CSS.escape(el.dataset.readerAnchor)}`); target?.focus({preventScroll:true}); target?.scrollIntoView({block:'start'}); }
  };
  const change = event => {
    if(event.target === versions) interactions.activate({kind:'version',id:versions.value});
    if(event.target === scale) root.style.setProperty('--reader-text-scale', Number(scale.value)/100);
  };
  const cancel = event => { event.preventDefault(); if(event.target === evidenceDialog) exitEvidence(); else exitReading(); };
  const trap = event => {
    if(event.key !== 'Tab') return;
    const dialog = evidenceDialog.open ? evidenceDialog : reading.open ? reading : null;
    if(!dialog) return;
    const targets = [...dialog.querySelectorAll('button,select,a[href],summary,[tabindex="0"]')].filter(e=>e.getClientRects().length && !e.disabled);
    const first=targets[0], last=targets.at(-1);
    if(event.shiftKey && (doc.activeElement===first || !dialog.contains(doc.activeElement))){ event.preventDefault(); last?.focus(); }
    else if(!event.shiftKey && (doc.activeElement===last || !dialog.contains(doc.activeElement))){ event.preventDefault(); first?.focus(); }
  };
  const nativeClose = event => { const ignored=ignoredCloseEvents.get(event.target)||0; if(ignored){ignoredCloseEvents.set(event.target,ignored-1);return;} if(lastSnapshot && ['reading','evidence'].includes(lastSnapshot.state.view)){ if(event.target === evidenceDialog) exitEvidence(); else exitReading(); } };
  root.addEventListener('click',click);
  root.addEventListener('change',change);
  root.addEventListener('keydown',trap);
  reading.addEventListener('cancel',cancel); evidenceDialog.addEventListener('cancel',cancel);
  reading.addEventListener('close',nativeClose); evidenceDialog.addEventListener('close',nativeClose);
  const unsubscribe = store.subscribe(render);
  return {
    capture(){remember();return {positions:[...positions],activeResult:reading.open?renderedResult:null,readingPosition:reading.open?scroll.scrollTop:null,spaceScroll:[...spaceScroll],spaceFocusKey,evidenceScroll:evidenceBody.scrollTop};},
    restore(memory){if(!memory)return;for(const [id,top] of memory.positions||[])if(typeof id==='string'&&Number.isFinite(top)&&!positions.has(id))positions.set(id,Math.max(0,top));if(Array.isArray(memory.spaceScroll))spaceScroll=memory.spaceScroll;spaceFocusKey=memory.spaceFocusKey||spaceFocusKey;if(reading.open){if(memory.activeResult===renderedResult&&Number.isFinite(memory.readingPosition))positions.set(renderedResult,Math.max(0,memory.readingPosition));scroll.scrollTop=positions.get(renderedResult)||0;}if(evidenceDialog.open)evidenceBody.scrollTop=memory.evidenceScroll||0;},
    getDiagnostics(){return {readingOpen:reading.open,evidenceOpen:evidenceDialog.open,renderedResult,previousSpaceView,evidenceFromReading,positions:[...positions]};},
    dispose(){ remember(); unsubscribe(); root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('keydown',trap);reading.removeEventListener('cancel',cancel);evidenceDialog.removeEventListener('cancel',cancel);reading.removeEventListener('close',nativeClose);evidenceDialog.removeEventListener('close',nativeClose);closeNative(evidenceDialog);closeNative(reading);root.replaceChildren();stylesheet.remove(); }};
}

