const deepFreeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;};
export const topicManifests=deepFreeze([
  {
    "schema": "local-public-topic-v1",
    "mode": "localDraft",
    "businessBound": false,
    "documentKind": "multi-company-topic",
    "slug": "airtransport",
    "company": "航空与机场",
    "companies": [
      {
        "name": "上海机场",
        "code": "600009",
        "marketCode": "600009.SH"
      },
      {
        "name": "吉祥航空",
        "code": "603885",
        "marketCode": "603885.SH"
      },
      {
        "name": "深圳机场",
        "code": "000089",
        "marketCode": "000089.SZ"
      },
      {
        "name": "白云机场",
        "code": "600004",
        "marketCode": "600004.SH"
      }
    ],
    "securityCode": "多公司专题 · 4 家公司",
    "catalogLabel": "航空与机场 · 首轮研究",
    "topics": [
      "航空与机场",
      "多公司专题",
      "租赁与现金"
    ],
    "localDocumentRef": "/investment-workbench-public-preview/workbench-review/research/airtransport/report.md",
    "sourceFile": "topics/airtransport/report.md",
    "title": "航空与机场：四家公司深度首轮研究",
    "originalFilename": "航空与机场_深度首轮研究_20261018.md",
    "sha256": "6321a13738632a127b3f19d41ab9ffac172efe90112387b84f90b5258538e4d5",
    "bytes": 37731,
    "characters": 18097,
    "dateStatement": "研究日：2026-10-18。价格基准：2026-10-16 最近交易日收盘，人民币、不复权。财务基准：已披露的 2026 年半年报，TTM 用 2025 全年 + 2026H1 − 2025H1 复算。月度经营资料更新至 2026 年 9 月。本报告不把四家公司等同为一种商业模式，不提供交易指令。",
    "researchAsOf": "2026-10-18",
    "priceAsOf": "2026-10-16 最近交易日收盘，人民币、不复权。",
    "financialAsOf": "已披露的 2026 年半年报，TTM 用 2025 全年 + 2026H1 − 2025H1 复算。",
    "publicationState": "多公司首轮专题 · 公开静态快照 · 未保存正式研究库",
    "contentScope": "公开资料多公司专题；保留原文结论、数值表和原报告配套图。不是单股研究记录，不代表最终结案。",
    "sourceHandling": "原文公开链接，点击前往外部网站；页面没有自动取外部数据或更新行情。链接可达性未在此次前端构建中重验。",
    "limits": [
      "本报告是首轮专题，保留历史日期和价格口径，不代表最新完整结论。",
      "本页提供报告正文和两张PNG图。原文所称“随附包”中的原始PDF、文本提取件、当次行情回执、脚本及JSON/CSV复算文件未在本页提供；可访问文中公开来源链接。",
      "固定公开快照没有正式成果身份、保存修订、私人观察关系、持仓或账户绑定。"
    ],
    "sourcesCount": 39,
    "uniqueSourcesCount": 27,
    "anchorPrefix": "local-airtransport",
    "previewHeading": "先给结论",
    "previewHeadingLevel": 2,
    "sourceHeading": "8. 来源、复算与审阅边界",
    "images": [
      {
        "ref": "figures/juneyao_equity_bridge.png",
        "sha256": "1d0d4abc754479b4cafc0741f75b674f69df56bc79fce657b748998b951c57de",
        "bytes": 193121,
        "width": 2340,
        "height": 1368,
        "alt": "吉祥航空合并归母权益桥，单位亿元",
        "caption": "原报告配套图；保留原图，未重画"
      },
      {
        "ref": "figures/shenzhen_profit_quality.png",
        "sha256": "46738b33cb5b3db1adbf1c7424d52bd01735645f53be6b1e8761320477de36cc",
        "bytes": 231629,
        "width": 2340,
        "height": 1368,
        "alt": "深圳机场上半年归母净利润及扣非构成，单位亿元",
        "caption": "原报告配套图；保留原图，未重画"
      }
    ],
    "topicGroup": "airtransport",
    "stageLabel": "首轮研究",
    "isFinal": false,
    "pendingSupplementNote": ""
  },
  {
    "schema": "local-public-topic-v1",
    "mode": "localDraft",
    "businessBound": false,
    "documentKind": "multi-company-topic",
    "slug": "banks",
    "company": "六家银行",
    "companies": [
      {
        "name": "常熟银行",
        "code": "601128",
        "marketCode": "601128.SH"
      },
      {
        "name": "邮储银行",
        "code": "601658",
        "marketCode": "601658.SH"
      },
      {
        "name": "无锡银行",
        "code": "600908",
        "marketCode": "600908.SH"
      },
      {
        "name": "瑞丰银行",
        "code": "601528",
        "marketCode": "601528.SH"
      },
      {
        "name": "张家港行",
        "code": "002839",
        "marketCode": "002839.SZ"
      },
      {
        "name": "浙商银行",
        "code": "601916",
        "marketCode": "601916.SH"
      }
    ],
    "securityCode": "多公司专题 · 6 家公司",
    "catalogLabel": "六家银行 · 首轮研究",
    "topics": [
      "银行",
      "多公司专题",
      "信用成本",
      "普通股回报"
    ],
    "localDocumentRef": "/investment-workbench-public-preview/workbench-review/research/banks/report.md",
    "sourceFile": "topics/banks/report.md",
    "title": "六家银行：息差、信用成本与普通股回报的首轮深研",
    "originalFilename": "banks-public-excerpt-20261020.md",
    "sha256": "7132d90e5147038f4d1e5f5752102c1a964f67b35138bbfb3caaa715ee347a62",
    "bytes": 30663,
    "characters": 13891,
    "dateStatement": "研究日：2026-10-18；财务基准：2026H1。2026-10-20 公开节选保留财报分析，暂不公开价格与历史估值材料；不代表更新后的研究结论。",
    "researchAsOf": "2026-10-18",
    "priceAsOf": "公开版不分发行情价格与历史估值序列。",
    "financialAsOf": "2026年半年报及其2025年同期比较；资本及资产质量基准为2026年6月末，并单列已核实后续事件。",
    "publicationState": "公开节选版 · 财报分析 · 行情部分暂不分发",
    "contentScope": "原稿财报分析的公开节选；行情价格列、历史估值图表和相关下载已明确留空。原始私有稿未修改。",
    "sourceHandling": "原文公开链接，点击前往外部网站；页面没有自动取外部数据或更新行情。链接可达性未在此次前端构建中重验。",
    "limits": [
      "本页为明确标注删节的公开版，未重做原研究的财报提取或投资判断。",
      "不分发历史行情、估值图表、CSV、旧ZIP、旧复算脚本、第三方PDF原件或完整供应商响应。",
      "保留财报机制分析、自绘盈利机制图及公开财务披露来源索引。"
    ],
    "sourcesCount": 15,
    "uniqueSourcesCount": 15,
    "anchorPrefix": "local-banks",
    "previewHeading": "先说结论",
    "previewHeadingLevel": 2,
    "sourceHeading": "11. 可复算文件与来源",
    "images": [
      {
        "ref": "charts/银行盈利机制_2026H1.png",
        "sha256": "e82ab0dc515ac5851b498a6c1e80a2478cbc362aa85a9772f9d1e206cd73f386",
        "bytes": 268474,
        "width": 2516,
        "height": 1292,
        "alt": "银行盈利机制",
        "caption": "原报告配套图；保留原图，未重画"
      }
    ],
    "topicGroup": "banks",
    "stageLabel": "首轮研究",
    "isFinal": false,
    "pendingSupplementNote": "",
    "originalSourceSHA256": "1ebbbe4ccc64451a260ad51e09abd568309186dc5b0e8963329e62b5dbb9801b"
  },
  {
    "schema": "local-public-topic-v1",
    "mode": "localDraft",
    "businessBound": false,
    "documentKind": "topic-supplement",
    "slug": "baiyunfollowup",
    "company": "白云机场第二轮补充",
    "companies": [
      {
        "name": "白云机场",
        "code": "600004",
        "marketCode": "600004.SH"
      }
    ],
    "securityCode": "航空专题补充 · 白云机场 600004",
    "catalogLabel": "白云机场 · 第二轮关键增量",
    "topics": [
      "航空与机场",
      "同专题补充",
      "经营恢复",
      "交易条件"
    ],
    "localDocumentRef": "/investment-workbench-public-preview/workbench-review/research/baiyunfollowup/report.md",
    "sourceFile": "topics/baiyunfollowup/report.md",
    "title": "白云机场第二轮：经营修复已有证据，增长收益如何归属仍取决于交易",
    "originalFilename": "白云机场_第二轮关键增量_20261018.md",
    "sha256": "472b68c908e8bb1bbd74607876f0ce255badbe4b88e42a79485cff48df27253c",
    "bytes": 10658,
    "characters": 5068,
    "dateStatement": "研究日2026-10-18；价格沿用已核2026-10-16收盘7.79元。独立补充首轮，不覆盖首轮文件。本轮聚焦白云，未重新评价其余三家公司。",
    "researchAsOf": "2026-10-18",
    "priceAsOf": "沿用已核 2026-10-16 收盘 7.79 元",
    "financialAsOf": "2026 年半年报减一季报拆分 Q2；后续 IR 与拟议交易信息按原文来源",
    "publicationState": "航空专题第二轮独立补充 · 公开静态快照 · 未保存正式研究库",
    "contentScope": "仅补充白云机场经营修复与拟议资产交易条件，不重新评价航空首轮其余三家公司；不覆盖首轮。",
    "sourceHandling": "原文公开链接，点击前往外部网站；页面没有自动取外部数据或更新行情。链接可达性未在此次前端构建中重验。",
    "limits": [
      "本补充独立保留，不覆盖航空四公司首轮；经营判断变化和未知交易条件须连同原文阅读。",
      "T3 最终收入分享、场地租金与资产购置条件仍未知；不把低 PE 或季度机械年化当作买卖建议。",
      "只带入本补充全文与一张原报告 PNG；未提供原始 PDF、脚本及全套证据包。",
      "固定公开快照没有正式成果身份、保存修订、私人观察关系、持仓或账户绑定。"
    ],
    "sourcesCount": 11,
    "uniqueSourcesCount": 11,
    "anchorPrefix": "local-baiyunfollowup",
    "previewHeading": "判断变化",
    "previewHeadingLevel": 2,
    "sourceHeading": "1. 新经营证据：非航增长真实，季度利润改善不能全部归因于主营",
    "images": [
      {
        "ref": "figures/q2_profit_bridge.png",
        "sha256": "402a567bf5f1858ef42904d78d2419671a4e471320745a0a5ec086402abdf0ae",
        "bytes": 194088,
        "width": 2124,
        "height": 1206,
        "alt": "Q2税前利润环比增量分解",
        "caption": "原报告配套图；合并口径、单位亿元，保留原图，未重画"
      }
    ],
    "topicGroup": "airtransport",
    "stageLabel": "第二轮独立补充",
    "isFinal": false,
    "pendingSupplementNote": "",
    "sourceJumpLabel": "查看正文首处来源所在章节"
  }
]);
