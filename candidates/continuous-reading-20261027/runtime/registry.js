/**
 * Public build input registry. Explicitly transcribed from the 11 reviewed
 * public manifests at the pinned source commit below. This module does not
 * discover files, fetch remote content, read browser drafts, or import archives.
 */
export const PUBLIC_SOURCE = Object.freeze({
  repository: 'Agent-OVO/investment-workbench-public-preview',
  commit: 'c50b68fb8a09d99bda7b3bfbf83cc3daff251957',
  documentManifestBlob: '600933f4e9415b227f1216577434f7245891fd96',
  topicManifestBlob: 'bf6a0c06dd393b0825481aa6ce5d1d00a00d416c',
  reviewStorageBlob: 'da9a5243c3406f9c05c2c0f6c3cc225ad89d9950'
});
export const LEGACY_BASE = 'https://agent-ovo.github.io/investment-workbench-public-preview/workbench-review/';
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const manifestRows = [
  {
    "slug": "sinoseal",
    "company": "中密控股",
    "securityCode": "300470",
    "title": "中密控股：存量售后能否抵消增量价格战，26.57元隐含什么",
    "sha256": "36ede2208d9edcb82f28f4f0947a44f73e0875a2908058d3288e806855585a6c",
    "researchAsOf": "2026-10-17 UTC（北京时间2026-10-18）",
    "priceAsOf": "2026-10-16 未复权收盘 26.57 元",
    "financialAsOf": "2026-06-30（半年报未审计；年报 2023—2025）",
    "topics": [
      "耗材与售后",
      "装备制造",
      "现金与估值"
    ],
    "anchorPrefix": "local-sinoseal",
    "sourceDocumentRef": "documents/sinoseal-public-research.md",
    "contentScope": "公开公司事实、原稿算术与明确研究假设；未重新核验或更新行情及财务内容。",
    "limits": [
      "稿件所述日期是历史研究时点，非实时行情或当前事实保证。",
      "本候选展示八份独立本地公开稿；无云端成果身份、保存修订或登记关系。",
      "仅保留原稿表格，不派生结构化证据或图表。",
      "原稿提到的模型、CSV、截图与核验文件未随本候选提供。"
    ]
  },
  {
    "slug": "yuntianhua",
    "company": "云天化",
    "securityCode": "600096",
    "title": "云天化第二轮：磷肥净价差、资源投资与现价股东现金",
    "sha256": "4ac458a96081ba7813d54baf823a30ffdef5c2810b90ecef2c8c12e636cc7f08",
    "researchAsOf": "2026-10-17 UTC",
    "priceAsOf": "2026-10-16 已缓存股价 27.15 元（原稿固定口径）",
    "financialAsOf": "2026-06-30（半年报未经审计；TTM 按原文计算）",
    "topics": [
      "资源与化工",
      "现金与估值"
    ],
    "anchorPrefix": "local-yuntianhua",
    "sourceDocumentRef": "documents/yuntianhua-public-research.md",
    "contentScope": "公开公司事实、原稿算术与明确研究假设；未重新核验或更新行情及财务内容。",
    "limits": [
      "稿件所述日期是历史研究时点，非实时行情或当前事实保证。",
      "本候选展示八份独立本地公开稿；无云端成果身份、保存修订或登记关系。",
      "原稿字节与表格保持不变；另附独立公开资料派生辅助图，不生成结构化证据或研究库记录。",
      "仅已校验正文与原文公开链接，文中提及的本地复算附件尚未关联。"
    ]
  },
  {
    "slug": "sungrow",
    "company": "阳光电源",
    "securityCode": "300274",
    "title": "阳光电源：现金质量与现价隐含假设",
    "sha256": "56010814431556710ec040f69db4dc5294733988a9c7cc10cfb054eaa565f414",
    "researchAsOf": "2026-10-17",
    "priceAsOf": "2026-10-16 收盘 76.86 元；二级报价交叉核对，非交易所原始行情",
    "financialAsOf": "2026-06-30（半年报未经审计；TTM 按原文计算）",
    "topics": [
      "新能源设备",
      "现金与估值"
    ],
    "anchorPrefix": "local-sungrow",
    "sourceDocumentRef": "documents/sungrow-public-research.md",
    "contentScope": "公开公司事实、原稿算术与明确研究假设；本候选未重新核验或更新行情及财务内容。",
    "limits": [
      "稿件日期与价格均是历史研究条件，非实时行情或当前事实保证。",
      "目录仅使用本地报告引用；无云端成果身份、保存修订或登记关系。",
      "仅已校验正文与原文公开链接，文中提及的本地复算附件尚未关联。",
      "原稿结论与假设保持不变；不新增交易、持仓或账户页面。"
    ]
  },
  {
    "slug": "yizumi",
    "company": "伊之密",
    "securityCode": "300415",
    "title": "伊之密：订单增长何时成为股东现金与增量资本回报",
    "sha256": "ddacac6aa2dc3c85cd3803548e1bf8ecae812bc7c32e30cc7eacd12637772952",
    "researchAsOf": "2026-10-17",
    "priceAsOf": "2026-10-16 收盘 17.47 元；沿用原稿留存快照，未更新",
    "financialAsOf": "2026-06-30（半年报未经审计；TTM 按原文计算）",
    "topics": [
      "装备制造",
      "现金与估值"
    ],
    "anchorPrefix": "local-yizumi",
    "sourceDocumentRef": "documents/yizumi-public-research.md",
    "contentScope": "公开公司事实、原稿算术与明确研究假设；本候选未重新核验或更新行情及财务内容。",
    "limits": [
      "稿件日期与价格均是历史研究条件，非实时行情或当前事实保证。",
      "目录仅使用本地报告引用；无云端成果身份、保存修订或登记关系。",
      "仅已校验正文与原文公开链接，文中提及的本地复算附件尚未关联。",
      "原稿结论与假设保持不变；不新增交易、持仓或账户页面。"
    ]
  },
  {
    "slug": "honghua",
    "company": "宏华数科",
    "securityCode": "688789",
    "title": "宏华数科：耗材确有复购，现价仍需要利润与现金修复",
    "sha256": "30643b36d5f7565f1e109da59e0a273b566bfd39b650f12101f8c42ae43bf775",
    "researchAsOf": "2026-10-17",
    "priceAsOf": "2026-10-16 收盘 47.51 元；沿用原稿价格锚，未更新",
    "financialAsOf": "2026-06-30（半年报未经审计；TTM 按原文计算）",
    "topics": [
      "装备制造",
      "耗材与售后",
      "现金与估值"
    ],
    "anchorPrefix": "local-honghua",
    "sourceDocumentRef": "documents/honghua-public-research.md",
    "contentScope": "2026-10-18仅更正第七节天津宏华的比较期间解释；其余内容保留原研究截点，不代表全文重新核验。",
    "limits": [
      "稿件日期与价格均是历史研究条件，非实时行情或当前事实保证。",
      "目录仅使用本地报告引用；无云端成果身份、保存修订或登记关系。",
      "仅已校验正文与原文公开链接，文中提及的本地复算附件尚未关联。",
      "仅撤回天津宏华同比减亏解释，不据此直接判断新工厂盈利恶化；其余内容保留原研究截点。"
    ]
  },
  {
    "slug": "shaangu",
    "company": "陕鼓动力",
    "securityCode": "601369",
    "title": "陕鼓动力：设备、气体运营与工程，是否真正形成股东回报",
    "sha256": "b96b4d0ccf9b7502544f3b31ae7067c63ac67d6265c3d9fe2398f174bcfbba33",
    "researchAsOf": "2026-10-17",
    "priceAsOf": "2026-10-16 未复权收盘 7.92 元；原稿二级来源交叉核验",
    "financialAsOf": "2026-06-30（半年报未经审计；TTM 按原文计算）",
    "topics": [
      "装备制造",
      "气体与工程",
      "现金与估值"
    ],
    "anchorPrefix": "local-shaangu",
    "sourceDocumentRef": "documents/shaangu-public-research.md",
    "contentScope": "公开公司事实、原稿算术与明确研究假设；本候选未重新核验或更新行情及财务内容。",
    "limits": [
      "稿件日期与价格均是历史研究条件，非实时行情或当前事实保证。",
      "目录仅使用本地报告引用；无云端成果身份、保存修订或登记关系。",
      "仅已校验正文与原文公开链接，文中提及的本地复算附件尚未关联。",
      "原稿结论与假设保持不变；不新增交易、持仓或账户页面。"
    ]
  },
  {
    "slug": "crsc",
    "company": "中国通号",
    "securityCode": "688009",
    "title": "中国通号：替换订单能否变成普通股现金回报",
    "sha256": "818304f06dbbe3bd5924e86f824d3f2fb3f69ce8d0fbe7e3f7b011b0a825514b",
    "researchAsOf": "2026-10-17（完成于 2026-10-18）",
    "priceAsOf": "2026-10-16 留存腾讯快照 4.88 元，时间字段 20261016161450；非交易所收盘认证",
    "financialAsOf": "2026-06-30（半年报未经审计；TTM 按原文计算）",
    "topics": [
      "轨交与维护",
      "现金与估值"
    ],
    "anchorPrefix": "local-crsc",
    "sourceDocumentRef": "documents/crsc-public-research.md",
    "contentScope": "公开公司事实、原稿算术与明确研究假设；本候选未重新核验或更新行情及财务内容。",
    "limits": [
      "稿件日期与价格均是历史研究条件，非实时行情或当前事实保证。",
      "目录仅使用本地报告引用；无云端成果身份、保存修订或登记关系。",
      "仅已校验正文与原文公开链接，文中提及的本地复算附件尚未关联。",
      "原稿结论与假设保持不变；不新增交易、持仓或账户页面。"
    ]
  },
  {
    "slug": "zoomlion",
    "company": "中联重科",
    "securityCode": "000157",
    "title": "中联重科：海外与周期改善，距离普通股持续现金还有多远",
    "sha256": "9506722499b20b59e2fcbf0e9f2fea58b93cf079c85bece80235a298727b9ca9",
    "researchAsOf": "2026-10-17（编制于 2026-10-18）",
    "priceAsOf": "2026-10-16 留存腾讯快照 5.89 元，时间字段 20261016161457；单一二级价格锚，未双源核验",
    "financialAsOf": "2026-06-30（半年报未经审计；TTM 按原文计算）",
    "topics": [
      "装备制造",
      "海外经营",
      "现金与估值"
    ],
    "anchorPrefix": "local-zoomlion",
    "sourceDocumentRef": "documents/zoomlion-public-research.md",
    "contentScope": "公开公司事实、原稿算术与明确研究假设；本候选未重新核验或更新行情及财务内容。",
    "limits": [
      "稿件日期与价格均是历史研究条件，非实时行情或当前事实保证。",
      "目录仅使用本地报告引用；无云端成果身份、保存修订或登记关系。",
      "仅已校验正文与原文公开链接，文中提及的本地复算附件尚未关联。",
      "原稿结论与假设保持不变；不新增交易、持仓或账户页面。"
    ]
  },
  {
    "slug": "airtransport",
    "company": "航空与机场",
    "securityCode": "多公司专题 · 4 家公司",
    "title": "航空与机场：四家公司深度首轮研究",
    "sha256": "6321a13738632a127b3f19d41ab9ffac172efe90112387b84f90b5258538e4d5",
    "researchAsOf": "2026-10-18",
    "priceAsOf": "2026-10-16 最近交易日收盘，人民币、不复权。",
    "financialAsOf": "已披露的 2026 年半年报，TTM 用 2025 全年 + 2026H1 − 2025H1 复算。",
    "topics": [
      "航空与机场",
      "多公司专题",
      "租赁与现金"
    ],
    "anchorPrefix": "local-airtransport",
    "sourceDocumentRef": "/investment-workbench-public-preview/workbench-review/research/airtransport/report.md",
    "contentScope": "公开资料多公司专题；保留原文结论、数值表和原报告配套图。不是单股研究记录，不代表最终结案。",
    "limits": [
      "本报告是首轮专题，保留历史日期和价格口径，不代表最新完整结论。",
      "本页提供报告正文和两张PNG图。原文所称“随附包”中的原始PDF、文本提取件、当次行情回执、脚本及JSON/CSV复算文件未在本页提供；可访问文中公开来源链接。",
      "固定公开快照没有正式成果身份、保存修订、私人观察关系、持仓或账户绑定。"
    ]
  },
  {
    "slug": "banks",
    "company": "六家银行",
    "securityCode": "多公司专题 · 6 家公司",
    "title": "六家银行：息差、信用成本与普通股回报的首轮深研",
    "sha256": "7132d90e5147038f4d1e5f5752102c1a964f67b35138bbfb3caaa715ee347a62",
    "researchAsOf": "2026-10-18",
    "priceAsOf": "公开版不分发行情价格与历史估值序列。",
    "financialAsOf": "2026年半年报及其2025年同期比较；资本及资产质量基准为2026年6月末，并单列已核实后续事件。",
    "topics": [
      "银行",
      "多公司专题",
      "信用成本",
      "普通股回报"
    ],
    "anchorPrefix": "local-banks",
    "sourceDocumentRef": "/investment-workbench-public-preview/workbench-review/research/banks/report.md",
    "contentScope": "原稿财报分析的公开节选；行情价格列、历史估值图表和相关下载已明确留空。原始私有稿未修改。",
    "limits": [
      "本页为明确标注删节的公开版，未重做原研究的财报提取或投资判断。",
      "不分发历史行情、估值图表、CSV、旧ZIP、旧复算脚本、第三方PDF原件或完整供应商响应。",
      "保留财报机制分析、自绘盈利机制图及公开财务披露来源索引。"
    ]
  },
  {
    "slug": "baiyunfollowup",
    "company": "白云机场第二轮补充",
    "securityCode": "航空专题补充 · 白云机场 600004",
    "title": "白云机场第二轮：经营修复已有证据，增长收益如何归属仍取决于交易",
    "sha256": "472b68c908e8bb1bbd74607876f0ce255badbe4b88e42a79485cff48df27253c",
    "researchAsOf": "2026-10-18",
    "priceAsOf": "沿用已核 2026-10-16 收盘 7.79 元",
    "financialAsOf": "2026 年半年报减一季报拆分 Q2；后续 IR 与拟议交易信息按原文来源",
    "topics": [
      "航空与机场",
      "同专题补充",
      "经营恢复",
      "交易条件"
    ],
    "anchorPrefix": "local-baiyunfollowup",
    "sourceDocumentRef": "/investment-workbench-public-preview/workbench-review/research/baiyunfollowup/report.md",
    "contentScope": "仅补充白云机场经营修复与拟议资产交易条件，不重新评价航空首轮其余三家公司；不覆盖首轮。",
    "limits": [
      "本补充独立保留，不覆盖航空四公司首轮；经营判断变化和未知交易条件须连同原文阅读。",
      "T3 最终收入分享、场地租金与资产购置条件仍未知；不把低 PE 或季度机械年化当作买卖建议。",
      "只带入本补充全文与一张原报告 PNG；未提供原始 PDF、脚本及全套证据包。",
      "固定公开快照没有正式成果身份、保存修订、私人观察关系、持仓或账户绑定。"
    ]
  }
];
export const reports = freeze(manifestRows.map(row => ({
  ...row,
  id: 'report:' + row.slug,
  legacyUrl: LEGACY_BASE + 'research/' + row.slug + '/',
  legacySpaceUrl: LEGACY_BASE + 'space/' + row.slug + '/',
  reconstructed: row.slug === 'sinoseal'
})));
const allowedBySlug = Object.freeze(Object.fromEntries(reports.map(report => [report.slug, report])));
export const getReport = slug => Object.hasOwn(allowedBySlug, slug) ? allowedBySlug[slug] : null;
export const resolveReport = getReport;
export function assertAllowedReport(slug, sha256) {
  const report = getReport(slug);
  if (!report || (sha256 !== undefined && report.sha256 !== sha256)) throw Error('REPORT_NOT_IN_PUBLIC_ALLOWLIST');
  return report;
}
export function safeReturnAnchor(value, report) {
  if (!report || !getReport(report.slug)) return '';
  return new RegExp('^' + report.anchorPrefix + '-line-\\d+$').test(value || '') ? value : '';
}
export function searchReports(query='') {
  const q = String(query).replace(/[\u0000-\u001f\u007f]/g, '').slice(0,160).trim().toLocaleLowerCase();
  return reports.filter(report => [report.company, report.securityCode, report.title, ...report.topics].join(' ').toLocaleLowerCase().includes(q));
}

