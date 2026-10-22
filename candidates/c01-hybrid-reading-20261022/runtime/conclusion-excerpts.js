import { REPORTS, candidateHref } from '../research-history-data.js';

// Exact excerpts from existing public snapshots, not newly authored judgments.
// LoadSnapshot remains responsible for whole-file SHA/length/UTF-8/title checks.
// This adapter additionally binds the approved quote bytes and existing heading.
const entries = [
  {
    "slug": "yuntianhua",
    "sha256": "4ac458a96081ba7813d54baf823a30ffdef5c2810b90ecef2c8c12e636cc7f08",
    "bytes": 26730,
    "sourceExcerptExact": "最终判断：资源和估值均有可用价值，短期现金回报确定性不及表面PE。保留条件候选，优先补最能改变判断的价差和现金证据，不以统一买点或统一收益率替代判断。",
    "displayText": "最终判断：资源和估值均有可用价值，短期现金回报确定性不及表面PE。保留条件候选，优先补最能改变判断的价差和现金证据，不以统一买点或统一收益率替代判断。",
    "sectionAnchor": "local-yuntianhua-line-170",
    "lineRange": {
      "start": 177,
      "end": 177
    },
    "byteStart": 22692,
    "byteEnd": 22913
  },
  {
    "slug": "sungrow",
    "sha256": "56010814431556710ec040f69db4dc5294733988a9c7cc10cfb054eaa565f414",
    "bytes": 31677,
    "sourceExcerptExact": "单凭16.6倍扣非PE和9.1%的报表现金差额收益率，不能认定现价有充分安全余地。",
    "displayText": "单凭16.6倍扣非PE和9.1%的报表现金差额收益率，不能认定现价有充分安全余地。",
    "sectionAnchor": "local-sungrow-line-5",
    "lineRange": {
      "start": 7,
      "end": 7
    },
    "byteStart": 339,
    "byteEnd": 442
  },
  {
    "slug": "yizumi",
    "sha256": "ddacac6aa2dc3c85cd3803548e1bf8ecae812bc7c32e30cc7eacd12637772952",
    "bytes": 28861,
    "sourceExcerptExact": "研究判断：保留优先跟踪价值，但现价吸引力依赖现金转换与新增资本回报的后续证据。既不因负简化FCF否定扩张，也不因压铸增收和低PE提前确认价值。",
    "displayText": "研究判断：保留优先跟踪价值，但现价吸引力依赖现金转换与新增资本回报的后续证据。既不因负简化FCF否定扩张，也不因压铸增收和低PE提前确认价值。",
    "sectionAnchor": "local-yizumi-line-5",
    "lineRange": {
      "start": 15,
      "end": 15
    },
    "byteStart": 2142,
    "byteEnd": 2345
  },
  {
    "slug": "honghua",
    "sha256": "30643b36d5f7565f1e109da59e0a273b566bfd39b650f12101f8c42ae43bf775",
    "bytes": 30553,
    "sourceExcerptExact": "宏华具备真实的“设备装机带动耗材销售”业务，但这轮证据不足以把它当成稳定收息资产，或仅凭墨水占比提高给更高估值。",
    "displayText": "宏华具备真实的“设备装机带动耗材销售”业务，但这轮证据不足以把它当成稳定收息资产，或仅凭墨水占比提高给更高估值。",
    "sectionAnchor": "local-honghua-line-7",
    "lineRange": {
      "start": 9,
      "end": 9
    },
    "byteStart": 690,
    "byteEnd": 858
  },
  {
    "slug": "shaangu",
    "sha256": "b96b4d0ccf9b7502544f3b31ae7067c63ac67d6265c3d9fe2398f174bcfbba33",
    "bytes": 37571,
    "sourceExcerptExact": "判断：业务有长期价值，但现价的显著安全边际尚未由公开经营证据证明；保留观察，不因订单增长、账上现金或气体长协而直接上调估值。",
    "displayText": "判断：业务有长期价值，但现价的显著安全边际尚未由公开经营证据证明；保留观察，不因订单增长、账上现金或气体长协而直接上调估值。",
    "sectionAnchor": "local-shaangu-line-5",
    "lineRange": {
      "start": 7,
      "end": 7
    },
    "byteStart": 202,
    "byteEnd": 388
  },
  {
    "slug": "crsc",
    "sha256": "818304f06dbbe3bd5924e86f824d3f2fb3f69ce8d0fbe7e3f7b011b0a825514b",
    "bytes": 42672,
    "sourceExcerptExact": "本轮判断是**保留业务研究价值，降低对现金安全垫的直觉信任；等待资金占用和归属兑现，不因报价市盈率或低空叙事直接升级结论**。",
    "displayText": "本轮判断是保留业务研究价值，降低对现金安全垫的直觉信任；等待资金占用和归属兑现，不因报价市盈率或低空叙事直接升级结论。",
    "sectionAnchor": "local-crsc-line-4",
    "lineRange": {
      "start": 6,
      "end": 6
    },
    "byteStart": 415,
    "byteEnd": 596
  },
  {
    "slug": "zoomlion",
    "sha256": "9506722499b20b59e2fcbf0e9f2fea58b93cf079c85bece80235a298727b9ca9",
    "bytes": 38916,
    "sourceExcerptExact": "海外增长是真实的，当前证据尚不能把5.89元对应的低表观PE解释为已经兑现的高股东现金回报。",
    "displayText": "海外增长是真实的，当前证据尚不能把5.89元对应的低表观PE解释为已经兑现的高股东现金回报。",
    "sectionAnchor": "local-zoomlion-line-5",
    "lineRange": {
      "start": 7,
      "end": 7
    },
    "byteStart": 304,
    "byteEnd": 430
  },
  {
    "slug": "airtransport",
    "sha256": "6321a13738632a127b3f19d41ab9ffac172efe90112387b84f90b5258538e4d5",
    "bytes": 37731,
    "sourceExcerptExact": "以现有数据，最值得继续验证的分别是：吉祥的油价—票价利润差；上海的新免税单位经济与参股现金回报；深圳的剔除并表后的增长；白云的租费后增量贡献。",
    "displayText": "以现有数据，最值得继续验证的分别是：吉祥的油价—票价利润差；上海的新免税单位经济与参股现金回报；深圳的剔除并表后的增长；白云的租费后增量贡献。",
    "sectionAnchor": "local-airtransport-line-5",
    "lineRange": {
      "start": 12,
      "end": 12
    },
    "byteStart": 2074,
    "byteEnd": 2287
  },
  {
    "slug": "banks",
    "sha256": "7132d90e5147038f4d1e5f5752102c1a964f67b35138bbfb3caaa715ee347a62",
    "bytes": 30663,
    "sourceExcerptExact": "常熟的高收益小微模式面临资产收益下行和可转债摊薄；邮储有真实的负债与规模优势，也有特殊代理成本及零售信用压力；其余四家需要逐一检验负债成本改善能否转为可持续、可分配的普通股利润。低PB本身没有完成这一步证明。",
    "displayText": "常熟的高收益小微模式面临资产收益下行和可转债摊薄；邮储有真实的负债与规模优势，也有特殊代理成本及零售信用压力；其余四家需要逐一检验负债成本改善能否转为可持续、可分配的普通股利润。低PB本身没有完成这一步证明。",
    "sectionAnchor": "local-banks-line-6",
    "lineRange": {
      "start": 9,
      "end": 9
    },
    "byteStart": 1123,
    "byteEnd": 1431
  },
  {
    "slug": "baiyunfollowup",
    "sha256": "472b68c908e8bb1bbd74607876f0ce255badbe4b88e42a79485cff48df27253c",
    "bytes": 10658,
    "sourceExcerptExact": "7.79元的投资吸引力，主要取决于商业改善能否复现，以及新合同允许上市公司留下多少增量。",
    "displayText": "7.79元的投资吸引力，主要取决于商业改善能否复现，以及新合同允许上市公司留下多少增量。",
    "sectionAnchor": "local-baiyunfollowup-line-5",
    "lineRange": {
      "start": 9,
      "end": 9
    },
    "byteStart": 745,
    "byteEnd": 869
  }
];
const excerpts = new Map(entries.map(entry => [entry.slug, Object.freeze(entry)]));
export const CONCLUSION_FALLBACK = '请进入全文阅读结论';

export function conclusionExcerpt({ report, loaded } = {}) {
  const known = REPORTS.find(item => item.slug === report?.slug);
  const fallback = {
    verified: false, label: '结论阅读', text: CONCLUSION_FALLBACK,
    href: candidateHref('reader', known?.slug || ''), sourceLabel: '进入完整研究 ↗'
  };
  const entry = known && excerpts.get(known.slug);
  if (!entry || report !== known || known.sha256 !== entry.sha256 ||
      known.bytes !== entry.bytes || loaded?.sha256 !== entry.sha256 ||
      typeof loaded.raw !== 'string' || !(loaded.bytes instanceof Uint8Array) ||
      loaded.bytes.byteLength !== entry.bytes) return fallback;
  try {
    const rawBytes = new TextEncoder().encode(loaded.raw);
    if (rawBytes.length !== entry.bytes || rawBytes.some((value, i) => value !== loaded.bytes[i])) return fallback;
    const exact = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes.subarray(entry.byteStart, entry.byteEnd));
    if (exact !== entry.sourceExcerptExact || exact.replaceAll('**', '') !== entry.displayText ||
        !loaded.model?.headings?.some(heading => heading.anchor === entry.sectionAnchor)) return fallback;
    return {
      verified: true, label: '原稿结论摘录 · 保留边界', text: entry.displayText,
      href: candidateHref('reader', known.slug, { anchor: entry.sectionAnchor }),
      sourceLabel: `原稿 L${entry.lineRange.start}${entry.lineRange.end === entry.lineRange.start ? '' : '–' + entry.lineRange.end} · 查看上下文 ↗`,
      slug: known.slug, sha256: entry.sha256
    };
  } catch { return fallback; }
}
