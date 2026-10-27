// Six already-approved public originals, recovered unchanged from pinned c50b68fb8a09d99bda7b3bfbf83cc3daff251957.
export const publicAssets=Object.freeze([
  {
    "slug": "airtransport",
    "kind": "figure",
    "path": "assets/figures/airtransport/juneyao_equity_bridge.png",
    "originalURL": "https://agent-ovo.github.io/investment-workbench-public-preview/workbench-review/research/airtransport/figures/juneyao_equity_bridge.png",
    "sha256": "1d0d4abc754479b4cafc0741f75b674f69df56bc79fce657b748998b951c57de",
    "bytes": 193121,
    "width": 2340,
    "height": 1368
  },
  {
    "slug": "airtransport",
    "kind": "figure",
    "path": "assets/figures/airtransport/shenzhen_profit_quality.png",
    "originalURL": "https://agent-ovo.github.io/investment-workbench-public-preview/workbench-review/research/airtransport/figures/shenzhen_profit_quality.png",
    "sha256": "46738b33cb5b3db1adbf1c7424d52bd01735645f53be6b1e8761320477de36cc",
    "bytes": 231629,
    "width": 2340,
    "height": 1368
  },
  {
    "slug": "banks",
    "kind": "figure",
    "path": "assets/figures/banks/银行盈利机制_2026H1.png",
    "originalURL": "https://agent-ovo.github.io/investment-workbench-public-preview/workbench-review/research/banks/charts/银行盈利机制_2026H1.png",
    "sha256": "e82ab0dc515ac5851b498a6c1e80a2478cbc362aa85a9772f9d1e206cd73f386",
    "bytes": 268474,
    "width": 2516,
    "height": 1292
  },
  {
    "slug": "banks",
    "kind": "attachment",
    "path": "attachments/banks/README.txt",
    "originalURL": "https://agent-ovo.github.io/investment-workbench-public-preview/workbench-review/bank-evidence/README.txt",
    "sha256": "dd806cda4fb17960a6f936babd085d771f45c238ee1584ef3d7faf75dfbaed85",
    "bytes": 682
  },
  {
    "slug": "banks",
    "kind": "attachment",
    "path": "attachments/banks/source-urls.json",
    "originalURL": "https://agent-ovo.github.io/investment-workbench-public-preview/workbench-review/bank-evidence/source-urls.json",
    "sha256": "3912235850b9fc57168091a8139041dd127e154030a00ad20489db06a60dd0d0",
    "bytes": 3262
  },
  {
    "slug": "baiyunfollowup",
    "kind": "figure",
    "path": "assets/figures/baiyunfollowup/q2_profit_bridge.png",
    "originalURL": "https://agent-ovo.github.io/investment-workbench-public-preview/workbench-review/research/baiyunfollowup/figures/q2_profit_bridge.png",
    "sha256": "402a567bf5f1858ef42904d78d2419671a4e471320745a0a5ec086402abdf0ae",
    "bytes": 194088,
    "width": 2124,
    "height": 1206
  }
].map(Object.freeze));
export const publicAsset=url=>publicAssets.find(a=>new URL(a.originalURL).href===new URL(url).href)||null;
