// Selected public snapshot only. No account, position, quote history or full evidence bundle.
const deepFreeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

export const BANK_CHART_METADATA = deepFreeze({
  "researchAsOf": "2026-10-18",
  "currentPeriod": "2026H1",
  "priorPeriod": "2025H1",
  "inputUnit": "人民币百万元",
  "pairOrder": [
    "2026H1",
    "2025H1"
  ],
  "report": {
    "filename": "银行六家公司_首轮机制深研_20261018.md",
    "sha256": "7132d90e5147038f4d1e5f5752102c1a964f67b35138bbfb3caaa715ee347a62",
    "section": "2. 共同机制：净利息增加，未必意味着资产回报回升",
    "sourceSection": "11. 可复算文件与来源"
  },
  "inputFile": {
    "file": "inputs/banks_normalized.json",
    "sha256": "4c059d1d5b65308a30cb03de2a6054428abf2c566aeaa49ab99a969009ada9c0"
  },
  "calculationFile": {
    "file": "inputs/calculations.json",
    "sha256": "71411c23ab7ab223d2eb9f1cf54258e542516337c631b3e929807f263c7ecaeb"
  },
  "sourceManifest": {
    "file": "source_manifest.json",
    "sha256": "93b3046f74ec3d69e2c47a0df1e318ebe4956d7dc986c30ad3e3075928bcb26c"
  },
  "formulas": {
    "loan": "贷款利息收入（本期）−贷款利息收入（上期）",
    "investment": "投资/债券利息收入（本期）−投资/债券利息收入（上期）",
    "other_assets": "其他资产利息 = 总利息收入−贷款利息收入−投资/债券利息收入；贡献 = 本期−上期",
    "deposits": "存款付息节省 = 存款利息支出（上期）−存款利息支出（本期）",
    "other_funding": "其他融资支出 = 总利息支出−存款利息支出；节省 = 上期−本期",
    "total": "五段贡献相加 = 本期净利息收入−上期净利息收入；净利息收入 = 总利息收入−总利息支出",
    "amount": "亿元 = 百万元÷100",
    "contribution": "对上年净利息收入贡献（百分点）= 各段变动（百万元）÷2025H1净利息收入（百万元）×100"
  },
  "scopeNote": "历史金额变动同时包含规模与利率影响，未分离纯降息效应，也不构成预测。对上年净利息收入的贡献百分点不等于净息差变化。",
  "precisionNote": "金额按原始输入精度展示；百分点由未舍入金额计算，展示至小数点后6位，合计与分项展示值可能存在舍入尾差。"
});

export const BANK_CHART_DATA = deepFreeze([
  {
    "code": "601128",
    "name": "常熟银行",
    "inputPointer": "/banks/0",
    "inputs": {
      "loan_interest": [
        6382.175,
        6558.172
      ],
      "investment_interest": [
        1223.829,
        1215.445
      ],
      "total_interest_income": [
        7849.369,
        8005.411
      ],
      "deposit_expense": [
        2448.079,
        2976.843
      ],
      "total_interest_expense": [
        2939.203,
        3365.471
      ],
      "nii": [
        4910.166,
        4639.94
      ]
    },
    "derived": {
      "rmbMillion": [
        -175.997,
        8.384,
        11.571,
        528.764,
        -102.496
      ],
      "rmbYi": [
        -1.75997,
        0.08384,
        0.11571,
        5.28764,
        -1.02496
      ],
      "contributionPp": [
        -3.793087841653125,
        0.18069199170678932,
        0.24937822471842308,
        11.395923223145127,
        -2.2089940818200233
      ],
      "totalRmbMillion": 270.226,
      "totalRmbYi": 2.70226,
      "totalContributionPp": 5.823911516097191
    },
    "source": {
      "file": "sources/601128_2026H1.pdf",
      "url": "https://static.cninfo.com.cn/finalpage/2026-08-27/1225511920.PDF",
      "publication_date": "2026-08-27",
      "retrieved_date_utc": "2026-10-18",
      "period": "2026H1",
      "kind": "法定披露平台",
      "bytes": 6895501,
      "sha256": "2ebaac9bbc6dec6c5582ea96045ebe33cc3203be54c5513a76e5c1662bf1d058"
    }
  },
  {
    "code": "601658",
    "name": "邮储银行",
    "inputPointer": "/banks/1",
    "inputs": {
      "loan_interest": [
        147614,
        151626
      ],
      "investment_interest": [
        69892,
        69356
      ],
      "total_interest_income": [
        237627,
        241658
      ],
      "deposit_expense": [
        82665,
        95851
      ],
      "total_interest_expense": [
        90480,
        102600
      ],
      "nii": [
        147147,
        139058
      ]
    },
    "derived": {
      "rmbMillion": [
        -4012.0,
        536.0,
        -555.0,
        13186.0,
        -1066.0
      ],
      "rmbYi": [
        -40.12,
        5.36,
        -5.55,
        131.86,
        -10.66
      ],
      "contributionPp": [
        -2.8851270692804443,
        0.3854506752578061,
        -0.3991140387464224,
        9.482374261099684,
        -0.766586604150786
      ],
      "totalRmbMillion": 8089.0,
      "totalRmbYi": 80.89,
      "totalContributionPp": 5.816997224179839
    },
    "source": {
      "file": "sources/601658_2026H1.pdf",
      "url": "https://www.psbc.com/cn/gyyc/tzzgx/gsgg/aggg/202608/P020260828636432934868.pdf",
      "publication_date": "2026-08-28",
      "retrieved_date_utc": "2026-10-18",
      "period": "2026H1",
      "kind": "发行人官网",
      "bytes": 26198720,
      "sha256": "dbd073aa2a086aaa3f017e57d9a59c2872cadf06fd160423b2a7d1f8fa587014"
    }
  },
  {
    "code": "600908",
    "name": "无锡银行",
    "inputPointer": "/banks/2",
    "inputs": {
      "loan_interest": [
        2779.281,
        2854.919
      ],
      "investment_interest": [
        735.307,
        818.324
      ],
      "total_interest_income": [
        3756.452,
        3888.594
      ],
      "deposit_expense": [
        1745.771,
        2010.886
      ],
      "total_interest_expense": [
        1895.011,
        2112.725
      ],
      "nii": [
        1861.441,
        1775.869
      ]
    },
    "derived": {
      "rmbMillion": [
        -75.638,
        -83.017,
        26.513,
        265.115,
        -47.401
      ],
      "rmbYi": [
        -0.75638,
        -0.83017,
        0.26513,
        2.65115,
        -0.47401
      ],
      "contributionPp": [
        -4.259210561139363,
        -4.674725444275451,
        1.4929592216543,
        14.928747559645446,
        -2.6691721067263408
      ],
      "totalRmbMillion": 85.572,
      "totalRmbYi": 0.85572,
      "totalContributionPp": 4.818598669158592
    },
    "source": {
      "file": "sources/600908_2026H1.pdf",
      "url": "https://static.cninfo.com.cn/finalpage/2026-08-27/1225511625.PDF",
      "publication_date": "2026-08-27",
      "retrieved_date_utc": "2026-10-18",
      "period": "2026H1",
      "kind": "法定披露平台",
      "bytes": 1054353,
      "sha256": "ab4bc6bca78e4798d7244b666cf83af8efff53194b675b17a689734b07a4997c"
    }
  },
  {
    "code": "601528",
    "name": "瑞丰银行",
    "inputPointer": "/banks/3",
    "inputs": {
      "loan_interest": [
        2384.651,
        2546.561
      ],
      "investment_interest": [
        871.976,
        866.048
      ],
      "total_interest_income": [
        3403.184,
        3524.571
      ],
      "deposit_expense": [
        1382.339,
        1655.448
      ],
      "total_interest_expense": [
        1646.124,
        1956.293
      ],
      "nii": [
        1757.06,
        1568.278
      ]
    },
    "derived": {
      "rmbMillion": [
        -161.91,
        5.928,
        34.595,
        273.109,
        37.06
      ],
      "rmbYi": [
        -1.6191,
        0.05928,
        0.34595,
        2.73109,
        0.3706
      ],
      "contributionPp": [
        -10.324062443010742,
        0.3779942076596114,
        2.2059226744237947,
        17.414578282676924,
        2.363101439923279
      ],
      "totalRmbMillion": 188.782,
      "totalRmbYi": 1.88782,
      "totalContributionPp": 12.037534161672866
    },
    "source": {
      "file": "sources/601528_2026H1.pdf",
      "url": "https://file.finance.sina.com.cn/211.154.219.97:9494/MRGG/CNSESH_STOCK/2026/2026-8/2026-08-25/12524883.PDF",
      "publication_date": "2026-08-25",
      "retrieved_date_utc": "2026-10-18",
      "period": "2026H1",
      "kind": "发行人原始PDF的新浪镜像；SSE原路径请求失败",
      "bytes": 3308359,
      "sha256": "a68c6ab5b9adc95ea15d70a7d0e60d2faae0ac7ad313b73e69e775046c8eac95"
    }
  },
  {
    "code": "002839",
    "name": "张家港行",
    "inputPointer": "/banks/4",
    "inputs": {
      "loan_interest": [
        2475.342836,
        2632.664865
      ],
      "investment_interest": [
        551.65748,
        617.754461
      ],
      "total_interest_income": [
        3128.491054,
        3364.763786
      ],
      "deposit_expense": [
        1347.750934,
        1544.096042
      ],
      "total_interest_expense": [
        1578.966952,
        1810.964697
      ],
      "nii": [
        1549.524102,
        1553.799089
      ]
    },
    "derived": {
      "rmbMillion": [
        -157.322029,
        -66.096981,
        -12.853722,
        196.345108,
        35.652637
      ],
      "rmbYi": [
        -1.57322029,
        -0.66096981,
        -0.12853722,
        1.96345108,
        0.35652637
      ],
      "contributionPp": [
        -10.124991713133898,
        -4.253894951279637,
        -0.8272447893036446,
        12.636454055740536,
        2.294546138712532
      ],
      "totalRmbMillion": -4.274987,
      "totalRmbYi": -0.04274987,
      "totalContributionPp": -0.27513125926411197
    },
    "source": {
      "file": "sources/002839_2026H1.pdf",
      "url": "https://file.finance.sina.com.cn/211.154.219.97:9494/MRGG/CNSESZ_STOCK/2026/2026-8/2026-08-28/12562635.PDF",
      "publication_date": "2026-08-28",
      "retrieved_date_utc": "2026-10-18",
      "period": "2026H1",
      "kind": "发行人原始PDF的新浪镜像；已核正文报告期",
      "bytes": 1409768,
      "sha256": "f2ccde460ef1c60c8462dbf1b9e1b26e85827edf34eb75c7ff1665502e6aa571"
    }
  },
  {
    "code": "601916",
    "name": "浙商银行",
    "inputPointer": "/banks/5",
    "inputs": {
      "loan_interest": [
        34127,
        37611
      ],
      "investment_interest": [
        11966,
        12597
      ],
      "total_interest_income": [
        48413,
        52652
      ],
      "deposit_expense": [
        15740,
        17964
      ],
      "total_interest_expense": [
        26061,
        29606
      ],
      "nii": [
        22352,
        23046
      ]
    },
    "derived": {
      "rmbMillion": [
        -3484.0,
        -631.0,
        -124.0,
        2224.0,
        1321.0
      ],
      "rmbYi": [
        -34.84,
        -6.31,
        -1.24,
        22.24,
        13.21
      ],
      "contributionPp": [
        -15.11759090514623,
        -2.7380022563568516,
        -0.538054326130348,
        9.650264688015273,
        5.732014232404755
      ],
      "totalRmbMillion": -694.0,
      "totalRmbYi": -6.94,
      "totalContributionPp": -3.0113685672133994
    },
    "source": {
      "file": "sources/601916_2026H1_official.pdf",
      "url": "https://www.czbank.com/cn/investor/financial_info/reports_3904/2026new/2026new/202608/P020260826743565903640.pdf",
      "publication_date": "2026-08-27",
      "retrieved_date_utc": "2026-10-18",
      "period": "2026H1",
      "kind": "发行人官网；与下载镜像相同哈希",
      "bytes": 2271468,
      "sha256": "aec3fdbbc84f05c816c705e076dbfa298cfb0b9813abbf26d61fea174760f576"
    }
  }
]);
