import {REVIEW_STORAGE_PREFIX, REVIEW_FIELDS, storageKey, draftSnapshot, storageError} from './review-storage.js';

const FORMAT = 'workbench-review-backup';
export function validateRecord(record) {
  if (!record || record.schema !== 1 || typeof record.updatedAt !== 'string' || !Number.isFinite(Date.parse(record.updatedAt))) throw Error('备份记录时间或版本无效');
  storageKey(record);
  if (!record.values || !REVIEW_FIELDS.every(field => typeof record.values[field] === 'string' && record.values[field].length <= (field === 'date' ? 10 : 6000))) throw Error('备份内容格式或长度无效');
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
  const select=root.querySelector('select'),preview=root.querySelector('pre'),status=root.querySelector('[role="status"]');
  const restore=root.querySelector('[data-backup-restore]');
  let items=[];
  const label=record=>{const current=reports.find(r=>r.slug===record.slug);return `${current?.company||record.slug} · ${current?.sha256===record.sha256?'当前原稿':'旧版 / 非当前原稿'} · ${record.sha256.slice(0,12)} · ${record.updatedAt}`;};
  const show=()=>{
    const record=items[Number(select.value)];
    preview.textContent=record ? `${label(record)}\n完整原稿 SHA-256：${record.sha256}\n\n${REVIEW_FIELDS.map((f,i)=>`${['日期','当时判断','新增证据','判断变化','下一次核验'][i]}：\n${record.values[f]}`).join('\n\n')}` : '暂无可查看的记录。旧版记录始终按原始 SHA 归档，不会自动填入新原稿。';
    restore.disabled=!record;
  };
  const populate=records=>{
    items=records;select.replaceChildren();
    items.forEach((record,i)=>{const option=doc.createElement('option');option.value=String(i);option.textContent=label(record);select.append(option);});
    show();
  };
  const scan=()=>{
    try{const result=scanRecords(win.localStorage);populate(result.records);status.textContent=`本浏览器此站点找到 ${items.length} 份记录。${result.errors.length?'另有 '+result.errors.length+' 份损坏记录，已保留且未导出；请勿清除站点数据。':''}`;}
    catch{status.textContent='无法读取此浏览器的本地备份目录；可以选择已导出的文件在本页查看。';}
  };
  select.addEventListener('change',show);
  root.querySelector('[data-backup-refresh]').addEventListener('click',scan);
  root.querySelector('input[type="file"]').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{if(file.size>2_000_000)throw Error('备份超过 2 MB');const bundle=parseBackup(await file.text());populate(bundle.records);status.textContent=`已在本机解析 ${items.length} 份记录，来源 ${bundle.sourceOrigin}，导出时间 ${bundle.exportedAt}。尚未写入。逐份核对后可恢复；已有不同内容不会被覆盖。`;}
    catch(error){populate([]);status.textContent=`无法读取备份：${error.message}。本地记录未改变。`;}
    event.target.value='';
  });
  restore.addEventListener('click',()=>{
    if(hasUnsaved()){status.textContent='编辑区仍有未保存内容，请先重试保存或导出 Markdown；当前不执行恢复，以免刷新编辑区丢失内容。';return;}
    const record=items[Number(select.value)];if(!record)return;
    let result;
    try { result=restoreRecord(win.localStorage,record); }
    catch(error) { result={ok:false,error:storageError(error)}; }
    status.textContent=result.ok?`${result.unchanged?'本地已有相同内容，未重复写入':'已写入原稿版本并回读核验'}。${reports.some(r=>r.slug===record.slug&&r.sha256===record.sha256)?'编辑区已同步。':'这是旧版 / 非当前原稿，仅保留在版本目录，未填入当前复盘。'}`:result.error;
    if(result.ok)onRestored(record);
  });
  root.querySelector('[data-backup-export]').addEventListener('click',()=>{
    let url,anchor;
    try{
      const result=scanRecords(win.localStorage);
      if(result.errors.length)throw Error('发现损坏记录；为避免不完整备份被误认为完整，本次不导出，请保留站点数据');
      const text=serializeBackup(result.records,win.location.origin);
      url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
      anchor=doc.createElement('a');anchor.href=url;anchor.download='研究复盘本地备份-'+new Date().toISOString().slice(0,10)+'.json';anchor.hidden=true;doc.body.append(anchor);anchor.click();
      status.textContent=`已请求下载 ${result.records.length} 份已保存记录（含旧原稿版本）。请重新选择下载文件，核对目录和内容以验证备份。未保存的页内草稿请另行导出 Markdown。`;
    }catch(error){status.textContent=`备份未完成：${error.message}`;}
    finally{anchor?.remove();if(url)win.setTimeout(()=>URL.revokeObjectURL(url),1000);}
  });
  scan();
}
