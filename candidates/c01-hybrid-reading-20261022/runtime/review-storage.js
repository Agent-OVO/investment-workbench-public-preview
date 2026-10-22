import {allowedIdentity} from '../research-history-data.js';
export const REVIEW_STORAGE_PREFIX = 'c01-hybrid-reading-20261022:review:v1:';
export const REVIEW_FIELDS = ['date', 'thesis', 'evidence', 'change', 'next'];
export const draftSnapshot = values => JSON.stringify(REVIEW_FIELDS.map(field => values[field]));
export function storageKey(report) {
  if (!allowedIdentity(report)) throw Error('INVALID_IDENTITY');
  return REVIEW_STORAGE_PREFIX + report.slug + ':' + report.sha256;
}
export function validReviewDate(value) {
  if(value==='')return true;
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000'))return false;
  const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function validValues(values) {
  return values && validReviewDate(values.date) && REVIEW_FIELDS.every(field => typeof values[field] === 'string' && values[field].length <= (field === 'date' ? 10 : 6000));
}
const reasons = {
  INVALID_RECORD: '本地记录损坏或版本不匹配，未覆盖原记录。请先导出当前内容，再处理本地记录。',
  CONFLICT: '其他标签页已更改这份复盘，未覆盖它。请先导出当前内容，再刷新核对两份内容。',
  VERIFY_FAILED: '写入后的回读核验不一致，不能确认保存成功。请保留本页并导出备份。',
  INVALID_VALUES: '内容格式或长度超出保存范围，请检查后重试。'
};
export function storageError(error) {
  return reasons[error.message] || (error.name === 'QuotaExceededError'
    ? '浏览器存储空间不足，本次内容未保存。请导出备份，释放空间后重试。'
    : '浏览器本地存储不可用，本次内容未保存。请保留本页、导出备份，并检查浏览器存储权限。');
}

// Read only our own keys. A stale tab must never silently overwrite a newer record.
export function createReviewStorage(getStorage, {now = () => new Date().toISOString(), nonce = () => globalThis.crypto.randomUUID()} = {}) {
  const observed = new Map(), blocked = new Set();
  return {
    load(report) {
      const key = storageKey(report);
      try {
        const raw = getStorage().getItem(key);
        if (raw === null) { observed.set(key, raw); return {ok:true, values:null}; }
        let record;
        try { record = JSON.parse(raw); } catch { throw Error('INVALID_RECORD'); }
        if (record?.schema !== 1 || record.slug !== report.slug || record.sha256 !== report.sha256 || !validValues(record.values) || typeof record.updatedAt !== 'string' || !Number.isFinite(Date.parse(record.updatedAt))) throw Error('INVALID_RECORD');
        observed.set(key, raw);
        return {ok:true, values:{...record.values}, updatedAt:record.updatedAt};
      } catch (error) {
        if (error.message === 'INVALID_RECORD') blocked.add(key);
        return {ok:false, error:storageError(error)};
      }
    },
    save(report, values) {
      const key = storageKey(report);
      try {
        if (blocked.has(key)) throw Error('INVALID_RECORD');
        if (!validValues(values)) throw Error('INVALID_VALUES');
        const storage = getStorage(), current = storage.getItem(key);
        // A failed initial read can be retried only if it cannot discard an existing record.
        if (!observed.has(key) && current === null) observed.set(key, null);
        if (!observed.has(key) || observed.get(key) !== current) throw Error('CONFLICT');
        const updatedAt = now();
        const raw = JSON.stringify({schema:1, slug:report.slug, sha256:report.sha256, updatedAt, revision:nonce(), values:Object.fromEntries(REVIEW_FIELDS.map(field => [field,values[field]]))});
        storage.setItem(key, raw);
        if (storage.getItem(key) !== raw) throw Error('VERIFY_FAILED');
        // A failed write/readback must not advance the last confirmed version.
        // Retrying against unchanged storage is safe; a real intervening write still conflicts.
        observed.set(key, raw);
        return {ok:true, updatedAt};
      } catch (error) { return {ok:false, error:storageError(error)}; }
    }
  };
}
