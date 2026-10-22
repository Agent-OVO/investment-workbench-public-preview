// Metadata of existing public snapshots only. This file never contains local review notes.
export const PUBLIC_BASE = '/investment-workbench-public-preview/workbench-review/';
export const CANDIDATE_BASE = '/investment-workbench-public-preview/candidates/c01-hybrid-reading-20261022/';
export const V2_HOME = CANDIDATE_BASE + '?report=sinoseal';
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const REPORTS = freeze([
  {
    "slug": "sinoseal",
    "company": "中密控股",
    "title": "中密控股：存量售后能否抵消增量价格战，26.57元隐含什么",
    "researchAsOf": "2026-10-17 UTC（北京时间2026-10-18）",
    "sha256": "36ede2208d9edcb82f28f4f0947a44f73e0875a2908058d3288e806855585a6c",
    "bytes": 37759,
    "anchorPrefix": "local-sinoseal",
    "source": "/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/documents/sinoseal-public-research.md"
  },
  {
    "slug": "yuntianhua",
    "company": "云天化",
    "title": "云天化第二轮：磷肥净价差、资源投资与现价股东现金",
    "researchAsOf": "2026-10-17 UTC",
    "sha256": "4ac458a96081ba7813d54baf823a30ffdef5c2810b90ecef2c8c12e636cc7f08",
    "bytes": 26730,
    "anchorPrefix": "local-yuntianhua",
    "source": "/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/documents/yuntianhua-public-research.md"
  },
  {
    "slug": "sungrow",
    "company": "阳光电源",
    "title": "阳光电源：现金质量与现价隐含假设",
    "researchAsOf": "2026-10-17",
    "sha256": "56010814431556710ec040f69db4dc5294733988a9c7cc10cfb054eaa565f414",
    "bytes": 31677,
    "anchorPrefix": "local-sungrow",
    "source": "/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/documents/sungrow-public-research.md"
  },
  {
    "slug": "yizumi",
    "company": "伊之密",
    "title": "伊之密：订单增长何时成为股东现金与增量资本回报",
    "researchAsOf": "2026-10-17",
    "sha256": "ddacac6aa2dc3c85cd3803548e1bf8ecae812bc7c32e30cc7eacd12637772952",
    "bytes": 28861,
    "anchorPrefix": "local-yizumi",
    "source": "/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/documents/yizumi-public-research.md"
  },
  {
    "slug": "honghua",
    "company": "宏华数科",
    "title": "宏华数科：耗材确有复购，现价仍需要利润与现金修复",
    "researchAsOf": "2026-10-17",
    "sha256": "30643b36d5f7565f1e109da59e0a273b566bfd39b650f12101f8c42ae43bf775",
    "bytes": 30553,
    "anchorPrefix": "local-honghua",
    "source": "/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/documents/honghua-public-research.md"
  },
  {
    "slug": "shaangu",
    "company": "陕鼓动力",
    "title": "陕鼓动力：设备、气体运营与工程，是否真正形成股东回报",
    "researchAsOf": "2026-10-17",
    "sha256": "b96b4d0ccf9b7502544f3b31ae7067c63ac67d6265c3d9fe2398f174bcfbba33",
    "bytes": 37571,
    "anchorPrefix": "local-shaangu",
    "source": "/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/documents/shaangu-public-research.md"
  },
  {
    "slug": "crsc",
    "company": "中国通号",
    "title": "中国通号：替换订单能否变成普通股现金回报",
    "researchAsOf": "2026-10-17（完成于 2026-10-18）",
    "sha256": "818304f06dbbe3bd5924e86f824d3f2fb3f69ce8d0fbe7e3f7b011b0a825514b",
    "bytes": 42672,
    "anchorPrefix": "local-crsc",
    "source": "/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/documents/crsc-public-research.md"
  },
  {
    "slug": "zoomlion",
    "company": "中联重科",
    "title": "中联重科：海外与周期改善，距离普通股持续现金还有多远",
    "researchAsOf": "2026-10-17（编制于 2026-10-18）",
    "sha256": "9506722499b20b59e2fcbf0e9f2fea58b93cf079c85bece80235a298727b9ca9",
    "bytes": 38916,
    "anchorPrefix": "local-zoomlion",
    "source": "/investment-workbench-public-preview/cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/documents/zoomlion-public-research.md"
  },
  {
    "slug": "airtransport",
    "company": "航空与机场",
    "title": "航空与机场：四家公司深度首轮研究",
    "researchAsOf": "2026-10-18",
    "sha256": "6321a13738632a127b3f19d41ab9ffac172efe90112387b84f90b5258538e4d5",
    "bytes": 37731,
    "anchorPrefix": "local-airtransport",
    "source": "/investment-workbench-public-preview/workbench-review/research/airtransport/report.md"
  },
  {
    "slug": "banks",
    "company": "六家银行",
    "title": "六家银行：息差、信用成本与普通股回报的首轮深研",
    "researchAsOf": "2026-10-18",
    "sha256": "7132d90e5147038f4d1e5f5752102c1a964f67b35138bbfb3caaa715ee347a62",
    "bytes": 30663,
    "anchorPrefix": "local-banks",
    "source": "/investment-workbench-public-preview/workbench-review/research/banks/report.md"
  },
  {
    "slug": "baiyunfollowup",
    "company": "白云机场第二轮补充",
    "title": "白云机场第二轮：经营修复已有证据，增长收益如何归属仍取决于交易",
    "researchAsOf": "2026-10-18",
    "sha256": "472b68c908e8bb1bbd74607876f0ce255badbe4b88e42a79485cff48df27253c",
    "bytes": 10658,
    "anchorPrefix": "local-baiyunfollowup",
    "source": "/investment-workbench-public-preview/workbench-review/research/baiyunfollowup/report.md"
  }
]);
export const HONGHUA_BEFORE = freeze({slug:'honghua', sha256:'99b17836f113b2c4d6af876b7d945078de0975d5247fb9fdc6dc2b533894d310', source:PUBLIC_BASE+'continuity/reports/honghua-before-correction.md', label:'修订前归档 · 相关论证已撤回'});
export const CORRECTION = freeze({
  date:'2026-10-18',
  before:'原稿将天津宏华 2026H1 净亏约 242 万元与误标为 2025H1 的净亏约 1132 万元相比，据此写出“同比减亏、改善与爬坡并存”。该论证已撤回。',
  after:'当前修订稿撤回“同比减亏”。2026 半年报比较栏的净亏 1131.57 万元及经营现金 1468.75 万元与 2025 全年值相同，不能当作 2025H1；2025 半年报另列净利 473.16 万元。期间与并表口径尚未核清，也不据此反向断言新工厂盈利恶化。',
  boundary:'只修订这一处可比性论证，不代表全文重新核验；保留原研究截点。',
  sources:[
    ['2026 半年报 p152','https://static.cninfo.com.cn/finalpage/2026-08-27/1225509968.PDF'],
    ['2025 年报 p213–214','https://static.cninfo.com.cn/finalpage/2026-04-22/1225136997.PDF'],
    ['2025 半年报 p156','https://static.cninfo.com.cn/finalpage/2025-08-30/1224618799.PDF']
  ]
});
export const findReport = slug => REPORTS.find(report => report.slug === slug) || null;
// Repeated parameters are rejected, even if their values agree. No first-value wins.
export function parseReport(search='') {
  const values = new URLSearchParams(search).getAll('report');
  if (!values.length) return {kind:'choose', report:null, message:'请先选择研究。未默认选择中密控股，也未读取任何复盘正文。'};
  if (values.length !== 1) return {kind:'error', report:null, message:'report 参数重复或冲突。请明确选择一份研究；未自动采用任何一个值。'};
  const report = findReport(values[0]);
  return report ? {kind:'selected', report, message:''} : {kind:'error',report:null,message:'未知或空的研究标识。仅接受已公开的 11 份研究，请重新选择。'};
}
export function parseReader(search='') {
  const result=parseReport(search), snapshots=new URLSearchParams(search).getAll('snapshot');
  if(result.kind!=='selected') return result;
  if(snapshots.length>1 || (snapshots.length && !(result.report.slug==='honghua' && snapshots[0]==='before'))) return {kind:'error',report:null,message:'未知或重复的原稿快照；未载入替代版本。'};
  return {...result, archive:snapshots.length===1};
}
export function candidateHref(page, slug='', {archive=false,anchor=''}={}) {
  if(!['history','review','reader'].includes(page)) throw Error('UNKNOWN_PAGE');
  if(slug && !findReport(slug)) throw Error('UNKNOWN_REPORT');
  if(archive && !(page==='reader' && slug==='honghua')) throw Error('UNKNOWN_SNAPSHOT');
  const query=slug?'?report='+encodeURIComponent(slug)+(archive?'&snapshot=before':''):'';
  const safeAnchor=slug && new RegExp('^local-'+slug+'-line-\\d+$').test(anchor) ? '#'+anchor : '';
  return CANDIDATE_BASE+page+'/'+query+safeAnchor;
}
export function allowedIdentity(report) {
  const current=findReport(report?.slug);
  return !!current && (current.sha256===report.sha256 || (report.slug==='honghua' && HONGHUA_BEFORE.sha256===report.sha256));
}
export function historyFor(slug) {
  const report=findReport(slug);if(!report)throw Error('UNKNOWN_REPORT');
  const history={report, snapshotCount:slug==='honghua'?2:1, kind:'单一公开快照',
    limitation:'当前仅有这一份公开快照，缺少可供逐段比对的前版原件；不能据此生成判断变化、增量证据或虚构版本。', related:[]};
  if(slug==='honghua') Object.assign(history,{kind:'局部修订 · 两份留存原件',limitation:CORRECTION.boundary,correction:CORRECTION});
  if(slug==='yuntianhua') Object.assign(history,{kind:'第二轮原稿 · 首轮未公开',limitation:'标题标为第二轮，但当前公开白名单没有首轮原件。只展示已留存的第二轮，不能补造首轮或推断两轮之间的变化。'});
  if(slug==='airtransport') Object.assign(history,{kind:'首轮专题',limitation:'当前专题首轮包含四家公司。白云第二轮是独立专题补充，不是四家公司全文的新版本，也没有重新评价其他三家公司。',related:['baiyunfollowup']});
  if(slug==='baiyunfollowup') Object.assign(history,{kind:'同专题独立补充',limitation:'仅补充白云机场经营修复与拟议交易条件，不覆盖航空四公司首轮，不重新评价其余三家公司；不是同一全文的版本替换。',related:['airtransport']});
  if(slug==='banks') Object.assign(history,{kind:'财报分析公开节选',limitation:'研究时点为 2026-10-18，公开适配为 2026-10-20。当前只提供公开节选、说明和六份财报来源索引；不提供旧 ZIP、行情 CSV、历史估值序列、旧复算脚本或 PDF 原件。不能完整离线复算，不代表更新研究结论。'});
  return history;
}
// Human-readable Chinese filenames; never URL-encoded, path-like or control-bearing.
export function downloadName(company,kind,date,extension) {
  if(!['md','json'].includes(extension))throw Error('INVALID_EXTENSION');
  const clean=value=>String(value||'').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g,'').replace(/[.\s]+$/g,'').trim().slice(0,80);
  const safeDate=/^\d{4}-\d{2}-\d{2}$/.test(date||'')?date:'日期未填写';
  return [clean(company),clean(kind)||'导出文件',safeDate].filter(Boolean).join('_')+'.'+extension;
}
