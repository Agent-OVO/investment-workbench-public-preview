import {createReviewStorage, REVIEW_FIELDS, draftSnapshot, storageKey} from './review-storage.js';
import {mountBackup} from './review-backup.js';
import {REPORTS, findReport, downloadName} from '../research-history-data.js';
import {mountChoice} from './research-context.js';
const fields = REVIEW_FIELDS;
const noteFields = fields.slice(1);

export function reviewMarkdown(values, report) {
  if (!report || !findReport(report.slug)) throw Error('UNKNOWN_REPORT');
  const text = key => String(values[key] || '').trim().slice(0, 6000);
  return `# 研究复盘：${report.company}\n\n记录日期：${text('date')}\n研究原稿：${report.title}\n原稿时点：${report.researchAsOf}\nSHA-256：${report.sha256}\n\n## 当时的判断\n\n${text('thesis')}\n\n## 新增证据与来源\n\n${text('evidence')}\n\n## 判断变化与仍未解决的问题\n\n${text('change')}\n\n## 下一次核验\n\n${text('next')}\n\n---\n本记录由使用者填写，属于 C02 V2 候选独立复盘，仅导出到本机；未上传、未更新原研究稿或正式复盘。\n`;
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

const mounted = new WeakMap();
export function mountReview(doc=document,win=window) {
  // Idempotent mounting must retain in-memory drafts even when storage is unavailable.
  if(mounted.has(doc))return mounted.get(doc);
  const form=doc.querySelector('[data-review-form]');if(!form)return;
  const q=selector=>doc.querySelector(selector), today=new Date();
  const date=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const book=createDraftBook(REPORTS,date), persistence=createReviewStorage(()=>win.localStorage), saved=new Map();
  let active=null, disposed=false;
  const listeners=[];
  const on=(target,type,fn)=>{target.addEventListener(type,fn);listeners.push(()=>target.removeEventListener(type,fn));};
  const readValues=()=>Object.fromEntries(fields.map(field=>[field,form.elements[field].value]));
  const unsaved=()=>book.pendingReports().filter(report=>saved.get(report.slug)?.snapshot!==draftSnapshot(book.read(report.slug).values));
  const capture=()=>{if(active)book.write(active,readValues());};
  const persist=()=>{
    if(!active)return;
    const draft=book.read(active), prior=saved.get(active), snapshot=draftSnapshot(draft.values);
    if(prior?.ok && prior.snapshot===snapshot)return;
    const result=persistence.save(draft.report,draft.values);
    saved.set(active,{...result,snapshot:result.ok?snapshot:prior?.snapshot});
  };
  const captureAndSave=()=>{capture();persist();};
  const restore=()=>{for(const field of fields)form.elements[field].value=active?book.read(active).values[field]:'';};
  const render=(message='')=>{
    q('[data-review-fields]').disabled=!active;
    const failed=unsaved();
    if(!active){q('[data-review-preview]').textContent='请先选择研究；未显示或编辑其他研究的复盘。';q('[data-review-status]').textContent=failed.length?'页内仍保留未保存草稿。请切回对应研究导出或重试保存。':'';q('[data-review-storage]').textContent='尚未选定研究，不读取复盘正文。';q('[data-review-confirm]').disabled=true;return;}
    const draft=book.read(active),state=saved.get(active);
    q('[data-review-preview]').textContent=reviewMarkdown(draft.values,draft.report);
    q('[data-review-confirm]').disabled=!draft.canConfirm||!draft.isPending;
    q('[data-review-retry]').disabled=!!state?.ok && state.snapshot===draftSnapshot(draft.values);
    q('[data-review-status]').textContent=message||`正在编辑「${draft.report.company}」当前原稿的候选复盘。切换研究不会串稿。`;
    const storage=q('[data-review-storage]');
    storage.textContent=state.ok?(state.updatedAt?`已保存到此浏览器的独立候选空间，并回读核验（${state.updatedAt}）。`:'此研究暂无候选复盘；输入后自动保存。'):`未保存：${state.error}`;
    if(failed.length)storage.textContent+=' 尚未本地保存：'+failed.map(r=>r.company).join('、')+'。请导出备份后再离开。';
    storage.dataset.state=state.ok&&!failed.length?'saved':'error';
  };
  const choice=mountChoice(doc,win,{page:'review',beforeChange:captureAndSave,onSelect:result=>{
    active=result.report?.slug||null;
    if(active&&!saved.has(active)){
      const report=result.report,loaded=persistence.load(report);
      if(loaded.ok&&loaded.values)book.restore(active,loaded.values);
      saved.set(active,{...loaded,snapshot:loaded.ok?draftSnapshot(book.read(active).values):null});
    }
    restore();render();
  }});
  const edit=()=>{captureAndSave();render();};
  on(form,'input',edit);on(form,'change',edit);
  on(q('[data-review-retry]'),'click',edit);
  on(form,'submit',event=>{
    event.preventDefault();if(!active)return;edit();if(!form.reportValidity())return;
    const draft=book.read(active);let url,anchor;
    try{
      url=win.URL.createObjectURL(new win.Blob([reviewMarkdown(draft.values,draft.report)],{type:'text/markdown;charset=utf-8'}));
      anchor=doc.createElement('a');anchor.href=url;anchor.download=downloadName(draft.report.company,'候选复盘',draft.values.date,'md');anchor.hidden=true;doc.body.append(anchor);anchor.click();
      book.markExported(active);render('已请求下载候选复盘。请打开下载文件核对后再确认；请求下载不等于文件已经保存。');
    }catch{render('无法请求下载。草稿仍在页内，请复制完整预览并自行保存，勿直接离开。');}
    finally{anchor?.remove();if(url)win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);}
  });
  on(q('[data-review-confirm]'),'click',()=>{if(!active)return;edit();if(book.confirmSaved(active))render('已按你的确认标记导出备份；不代表本地自动保存成功，继续编辑后须重新备份。');});
  on(win,'beforeunload',event=>{captureAndSave();if(unsaved().length){event.preventDefault();event.returnValue='';}});
  on(win,'storage',event=>{
    for(const report of REPORTS){if(!saved.has(report.slug))continue;if(event.key!==null&&event.key!==storageKey(report))continue;saved.set(report.slug,{ok:false,snapshot:null,error:'其他标签页修改或清除了候选记录。当前页内容保留；请先导出、再刷新核对，避免覆盖。'});}render();
  });
  const backup=mountBackup(doc,win,{reports:REPORTS,hasUnsaved:()=>unsaved().length>0,onRestored:record=>{
    const report=REPORTS.find(r=>r.slug===record.slug&&r.sha256===record.sha256);if(!report)return;
    const result=persistence.load(report);if(result.ok&&result.values)book.restore(report.slug,result.values);
    saved.set(report.slug,{...result,snapshot:result.ok?draftSnapshot(book.read(report.slug).values):null});restore();render();
  }});
  // bfcache preserves this mount; a fresh document gets a fresh mount. No duplicate listeners.
  const handle={book,getActive:()=>active,dispose(){if(disposed)return;disposed=true;captureAndSave();choice.dispose();backup?.dispose();listeners.forEach(off=>off());mounted.delete(doc);}};
  mounted.set(doc,handle);return handle;
}
if(globalThis.document?.body?.dataset.page==='candidate-review')mountReview();
