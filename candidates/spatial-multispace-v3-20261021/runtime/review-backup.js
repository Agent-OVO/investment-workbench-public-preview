import {downloadName} from '../research-history-data.js';
import {REVIEW_STORAGE_PREFIX, REVIEW_FIELDS, storageKey, draftSnapshot, storageError, validValues} from './review-storage.js';

export const FORMAT = 'spatial-multispace-v3-20261021-review-backup';
export function validateRecord(record) {
  if (!record || record.schema !== 1 || typeof record.updatedAt !== 'string' || !Number.isFinite(Date.parse(record.updatedAt))) throw Error('备份记录时间或版本无效');
  storageKey(record);
  if (!validValues(record.values)) throw Error('备份内容格式或长度无效');
  return {schema:1,slug:record.slug,sha256:record.sha256,updatedAt:record.updatedAt,revision:String(record.revision || ''),values:Object.fromEntries(REVIEW_FIELDS.map(field=>[field,record.values[field]]))};
}
export function scanRecords(storage) {
  const records=[], errors=[];
  for (let i=0;i<storage.length;i++) {
    const key=storage.key(i);
    if (!key?.startsWith(REVIEW_STORAGE_PREFIX)) continue;
    try {
      const record=validateRecord(JSON.parse(storage.getItem(key)));
      if (storageKey(record)!==key) throw Error('存储键与记录身份不一致');
      records.push(record);
    } catch { errors.push(key); }
  }
  records.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  return {records,errors};
}
export function serializeBackup(records, origin, now=new Date().toISOString()) {
  return JSON.stringify({format:FORMAT,schema:1,exportedAt:now,sourceOrigin:origin,records:records.map(validateRecord)},null,2)+'\n';
}
export function parseBackup(text) {
  if (text.length>2_000_000) throw Error('备份超过 2 MB，请拆分后再导入');
  const bundle=JSON.parse(text);
  if (bundle?.format!==FORMAT || bundle.schema!==1 || !Array.isArray(bundle.records) || bundle.records.length>200) throw Error('不支持此备份格式或记录数');
  const records=bundle.records.map(validateRecord), keys=new Set();
  for(const record of records){const key=storageKey(record);if(keys.has(key))throw Error('备份含重复的研究及原稿版本');keys.add(key);}
  return {records,sourceOrigin:String(bundle.sourceOrigin||'未知'),exportedAt:String(bundle.exportedAt||'未知')};
}
// Imports never overwrite an occupied key, including old-source drafts. The file remains a readable alternative.
export function restoreRecord(storage, record) {
  try {
    const valid=validateRecord(record),key=storageKey(valid),existing=storage.getItem(key);
    if(existing!==null){
      const prior=validateRecord(JSON.parse(existing));
      if(storageKey(prior)===key && draftSnapshot(prior.values)===draftSnapshot(valid.values))return {ok:true,unchanged:true};
      return {ok:false,error:'此研究及原稿版本已有不同的本地内容，未覆盖。请保留两份备份并人工核对。'};
    }
    const raw=JSON.stringify(valid);
    storage.setItem(key,raw);
    if(storage.getItem(key)!==raw)throw Error('VERIFY_FAILED');
    return {ok:true,unchanged:false};
  }catch(error){return {ok:false,error:storageError(error)};}
}

export function mountBackup(doc,win,{reports,hasUnsaved,onRestored}) {
  const root=doc.querySelector('[data-review-backups]');if(!root)return;
  const q=s=>root.querySelector(s),select=q('select'),preview=q('pre'),status=q('[role="status"]'),restore=q('[data-backup-restore]'),input=q('input[type="file"]');
  let items=[],sequence=0,disposed=false;const listeners=[];
  const on=(target,type,fn)=>{target.addEventListener(type,fn);listeners.push(()=>target.removeEventListener(type,fn));};
  const label=record=>`${reports.find(r=>r.slug===record.slug)?.company} · ${reports.some(r=>r.slug===record.slug&&r.sha256===record.sha256)?'当前原稿':'宏华修订前归档，论证已撤回'} · ${record.sha256.slice(0,12)} · ${record.updatedAt}`;
  const show=()=>{const record=items[Number(select.value)];preview.textContent=record?`${label(record)}\nSHA-256：${record.sha256}\n\n${REVIEW_FIELDS.map((f,i)=>`${['日期','当时判断','新增证据','判断变化','下一次核验'][i]}：\n${record.values[f]}`).join('\n\n')}`:'尚无待恢复记录。';restore.disabled=!record;};
  const populate=records=>{items=records;select.replaceChildren();items.forEach((record,i)=>{const option=doc.createElement('option');option.value=String(i);option.textContent=label(record);select.append(option);});show();};
  const scan=()=>{sequence++;input.value='';try{const result=scanRecords(win.localStorage);populate(result.records);status.textContent=`此浏览器候选空间有 ${items.length} 份已保存记录。正式复盘未读取。${result.errors.length?'另有损坏或不在白名单内的候选记录，已保留且未导出。':''}`;}catch{populate([]);status.textContent='不能读取候选本地目录，可选择此前导出的候选备份文件。';}};
  on(select,'change',show);on(q('[data-backup-refresh]'),'click',scan);
  on(input,'change',async event=>{
    const token=++sequence,file=event.target.files?.[0];populate([]);
    if(!file){status.textContent='已取消文件选择，未恢复任何记录。';return;}
    status.textContent='正在本机读取候选备份，尚未写入。';
    try{
      if(file.size>2_000_000)throw Error('备份超过 2 MB');
      const text=await file.text();if(disposed||token!==sequence)return;
      const bundle=parseBackup(text);populate(bundle.records);status.textContent=`已在浏览器本机解析 ${items.length} 份候选记录，来源 ${bundle.sourceOrigin}，导出时间 ${bundle.exportedAt}。尚未写入；请核对后逐份恢复。`;
    }catch(error){if(disposed||token!==sequence)return;populate([]);status.textContent=`无法读取候选备份：${error.message}。本地记录未改变。`;}
    finally{if(token===sequence)input.value='';}
  });
  on(q('[data-backup-cancel]'),'click',()=>{sequence++;input.value='';populate([]);status.textContent='已取消文件预览或未完成的读取，没有恢复或删除任何本地记录。';});
  on(restore,'click',()=>{
    if(hasUnsaved()){status.textContent='编辑区仍有未保存内容。请先保存或导出并处理，暂不恢复以免覆盖页内草稿。';return;}
    const record=items[Number(select.value)];if(!record)return;
    let result;try{result=restoreRecord(win.localStorage,record);}catch(error){result={ok:false,error:storageError(error)};}
    status.textContent=result.ok?`${result.unchanged?'已有相同内容，未重复写入':'已保存到独立候选空间并回读核验'}。${reports.some(r=>r.slug===record.slug&&r.sha256===record.sha256)?'当前稿编辑区已同步。':'旧原稿仅留在版本目录，不填入当前修订稿。'}`:result.error;
    if(result.ok)onRestored(record);
  });
  on(q('[data-backup-export]'),'click',()=>{
    let url,anchor;try{
      const result=scanRecords(win.localStorage);if(result.errors.length)throw Error('存在损坏候选记录，本次不导出，以免误认为是完整备份；请保留站点数据');
      url=win.URL.createObjectURL(new win.Blob([serializeBackup(result.records,win.location.origin)],{type:'application/json;charset=utf-8'}));anchor=doc.createElement('a');anchor.href=url;anchor.download=downloadName('','候选复盘备份',new Date().toISOString().slice(0,10),'json');anchor.hidden=true;doc.body.append(anchor);anchor.click();status.textContent=`已请求下载 ${result.records.length} 份候选已保存记录，不含正式复盘或未保存页内内容。请打开文件核对；下载请求不等于保存成功。`;
    }catch(error){status.textContent='候选备份未完成：'+error.message;}
    finally{anchor?.remove();if(url)win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);}
  });
  populate([]);
  return {dispose(){disposed=true;sequence++;listeners.forEach(off=>off());}};
}
