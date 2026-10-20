import {createReviewStorage, REVIEW_FIELDS, draftSnapshot, storageKey} from './review-storage.js';
import {mountBackup} from './review-backup.js';
const fields = REVIEW_FIELDS;
const noteFields = fields.slice(1);

export function reviewMarkdown(values, report) {
  if (!report || !/^[a-z]+$/.test(report.slug)) throw Error('UNKNOWN_REPORT');
  const text = key => String(values[key] || '').trim().slice(0, 6000);
  return `# 研究复盘：${report.company}\n\n记录日期：${text('date')}\n研究原稿：${report.title}\n原稿时点：${report.researchAsOf}\nSHA-256：${report.sha256}\n\n## 当时的判断\n\n${text('thesis')}\n\n## 新增证据与来源\n\n${text('evidence')}\n\n## 判断变化与仍未解决的问题\n\n${text('change')}\n\n## 下一次核验\n\n${text('next')}\n\n---\n本记录由使用者填写，仅导出到本机；未上传、未更新原研究稿。\n`;
}

// The book handles editing/export state; the separate storage adapter handles durability.
export function createDraftBook(reports, today) {
  const drafts = new Map();
  const reportMap = new Map(reports.map(report => [report.slug, Object.freeze({...report})]));
  if (reportMap.size !== reports.length) throw Error('DUPLICATE_REPORT_SLUG');
  const keyFor = report => `${report.slug}:${report.sha256}`;
  const blank = () => Object.fromEntries(fields.map(field => [field, field === 'date' ? today : '']));
  const snapshot = values => JSON.stringify(fields.map(field => values[field]));
  const get = slug => {
    const report = reportMap.get(slug);
    if (!report) throw Error('UNKNOWN_REPORT');
    const key = keyFor(report);
    if (!drafts.has(key)) drafts.set(key, {report, values: blank(), exported: null, confirmed: null, edited: false});
    return drafts.get(key);
  };
  const hasContent = draft => draft.edited || noteFields.some(field => draft.values[field].length > 0) || draft.values.date !== today;
  const pending = () => [...drafts.values()].filter(draft => hasContent(draft) && draft.confirmed !== snapshot(draft.values));
  return {
    read(slug) { const draft = get(slug); return {report: draft.report, values: {...draft.values}, canConfirm: draft.exported === snapshot(draft.values), isPending: pending().includes(draft)}; },
    write(slug, values) {
      const draft = get(slug), before = snapshot(draft.values);
      draft.values = Object.fromEntries(fields.map(field => [field, String(values[field] ?? '')]));
      if (snapshot(draft.values) !== before) { draft.exported = null; draft.confirmed = null; draft.edited = true; }
    },
    restore(slug, values) { const draft=get(slug); draft.values={...values}; draft.edited=true; },
    markExported(slug) { const draft = get(slug); draft.exported = snapshot(draft.values); },
    confirmSaved(slug) {
      const draft = get(slug), current = snapshot(draft.values);
      if (draft.exported !== current) return false;
      draft.confirmed = current;
      return true;
    },
    pendingReports() { return pending().map(draft => draft.report); }
  };
}

export function mountReview(doc = document, win = window) {
  const form = doc.querySelector('[data-review-form]');
  if (!form) return;
  const reports = [...form.elements.report.options].map(option => ({...option.dataset, slug: option.value}));
  const requested = new URLSearchParams(win.location.search).get('report');
  if (reports.some(report => report.slug === requested)) form.elements.report.value = requested;
  let active = form.elements.report.value;
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const book = createDraftBook(reports, date);
  const preview = doc.querySelector('[data-review-preview]');
  const status = doc.querySelector('[data-review-status]');
  const confirm = doc.querySelector('[data-review-confirm]');
  const pendingList = doc.querySelector('[data-review-pending]');
  const storageStatus = doc.querySelector('[data-review-storage]');
  const retry = doc.querySelector('[data-review-retry]');
  const persistence = createReviewStorage(() => win.localStorage);
  const saved = new Map();
  for (const report of reports) {
    const result = persistence.load(report);
    if (result.ok && result.values) book.restore(report.slug, result.values);
    saved.set(report.slug, {...result, snapshot:result.ok ? draftSnapshot(book.read(report.slug).values) : null});
  }
  let watching = false;
  const values = () => Object.fromEntries(fields.map(field => [field, form.elements[field].value]));
  const capture = () => book.write(active, values());
  const unsaved = () => book.pendingReports().filter(report => saved.get(report.slug).snapshot !== draftSnapshot(book.read(report.slug).values));
  const persist = () => {
    const draft=book.read(active), prior=saved.get(active), snapshot=draftSnapshot(draft.values);
    if (prior.ok && prior.snapshot === snapshot) return;
    const result=persistence.save(draft.report,draft.values);
    saved.set(active,{...result,snapshot:result.ok?snapshot:prior.snapshot});
  };
  const beforeUnload = event => {
    capture();
    if (!unsaved().length) return;
    event.preventDefault();
    event.returnValue = '';
  };
  const render = (message = '') => {
    const draft = book.read(active), pending = book.pendingReports();
    preview.textContent = reviewMarkdown(draft.values, draft.report);
    doc.querySelector('[data-review-source]').href = '/investment-workbench-public-preview/workbench-review/research/' + draft.report.slug + '/';
    doc.querySelector('[data-review-evidence]').href = '/investment-workbench-public-preview/workbench-review/evidence/#' + draft.report.slug;
    confirm.disabled = !draft.canConfirm || !draft.isPending;
    pendingList.textContent = pending.length ? `尚未确认导出备份 ${pending.length} 份：${pending.map(report => report.company).join('、')}。本地保存与导出备份分别记录。` : '当前没有尚未确认导出备份的复盘内容。';
    status.textContent = message || `正在编辑「${draft.report.company}」的独立复盘；切换研究不会改变原稿绑定。`;
    const state=saved.get(active), failed=unsaved();
    if (storageStatus) {
      storageStatus.textContent = state.ok ? (state.updatedAt ? `「${draft.report.company}」已保存到此浏览器，并已回读核验（${state.updatedAt}）。` : '此研究暂无本地复盘；输入后自动保存到此浏览器。') : `「${draft.report.company}」未保存到此浏览器：${state.error}`;
      if (failed.length) storageStatus.textContent += ` 尚未本地保存：${failed.map(report=>report.company).join('、')}。`;
      storageStatus.dataset.state = state.ok && !failed.length ? 'saved' : 'error';
    }
    if (retry) retry.disabled = state.ok && !failed.length;
    if (failed.length && !watching) { win.addEventListener('beforeunload', beforeUnload); watching = true; }
    if (!failed.length && watching) { win.removeEventListener('beforeunload', beforeUnload); watching = false; }
  };
  const restore = () => {
    const draft = book.read(active);
    for (const field of fields) form.elements[field].value = draft.values[field];
  };
  const handleEdit = () => {
    if (form.elements.report.value !== active) {
      // The selector changes before its event runs, while the old text fields remain in place.
      // Capture those fields under the OLD identity, then restore the selected draft.
      capture();
      persist();
      const previous = book.read(active).report.company;
      active = form.elements.report.value;
      if (win.history?.replaceState) {
        const url = new URL(win.location.href);
        url.searchParams.set('report', active);
        win.history.replaceState(null, '', url);
      }
      restore();
      render(`已切换到「${book.read(active).report.company}」。「${previous}」的保存结果见本地保存状态；切回可继续。`);
      return;
    }
    capture();
    persist();
    render();
  };
  form.addEventListener('input', handleEdit);
  form.addEventListener('change', handleEdit);
  form.addEventListener('submit', event => {
    event.preventDefault();
    handleEdit();
    if (!form.reportValidity()) return;
    const draft = book.read(active);
    let url, anchor;
    try {
      const blob = new Blob([reviewMarkdown(draft.values, draft.report)], {type: 'text/markdown;charset=utf-8'});
      url = URL.createObjectURL(blob);
      anchor = doc.createElement('a');
      anchor.href = url;
      anchor.download = `review-${draft.report.slug}-${draft.values.date}.md`;
      anchor.hidden = true;
      doc.body.append(anchor);
      anchor.click();
      book.markExported(active);
      render('已请求下载 Markdown。请先在浏览器下载列表打开文件核对，再点「我已确认保存当前稿」；下载请求不等于文件已保存，本地自动保存状态单独显示。');
    } catch {
      render('无法请求下载，草稿仍保留在本页。请重试，或复制右侧完整预览后自行保存；请勿刷新或离开。');
    } finally {
      anchor?.remove();
      if (url) win.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  confirm.addEventListener('click', () => {
    handleEdit();
    if (book.confirmSaved(active)) render('已按你的确认标记当前稿的导出备份。此确认不代表浏览器本地保存成功；继续编辑后需重新导出备份。');
  });
  retry?.addEventListener('click', () => {capture();persist();render();});
  win.addEventListener('storage', event => {
    for (const report of reports) {
      if (event.key !== null && event.key !== storageKey(report)) continue;
      saved.set(report.slug,{ok:false,snapshot:null,error:'其他标签页更改或清除了本地记录。当前内容保留在本页；请先导出，再刷新核对，避免覆盖。'});
    }
    render();
  });
  restore();
  render();
  mountBackup(doc,win,{reports,hasUnsaved:()=>unsaved().length>0,onRestored:record=>{
    const report=reports.find(r=>r.slug===record.slug&&r.sha256===record.sha256);
    if(!report)return;
    const result=persistence.load(report);
    if(result.ok&&result.values)book.restore(report.slug,result.values);
    saved.set(report.slug,{...result,snapshot:result.ok?draftSnapshot(book.read(report.slug).values):null});
    restore();render();
  }});
}
if (globalThis.document?.body?.dataset.page === 'review') mountReview();
