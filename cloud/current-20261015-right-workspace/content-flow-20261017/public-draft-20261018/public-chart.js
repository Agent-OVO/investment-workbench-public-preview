// Fixed local display metadata only. No research-record identity or external asset loading.
function freeze(value) {if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const publicChart=freeze({
  "kind": "public-source-derived-auxiliary-figure",
  "localDocumentRef": "documents/yuntianhua-public-research.md",
  "requiredReportSHA256": "4ac458a96081ba7813d54baf823a30ffdef5c2810b90ecef2c8c12e636cc7f08",
  "title": "云天化磷肥吨毛利 · 公开资料派生辅助图",
  "boundary": "独立辅助图，由公开原表重算；不是原稿内图表或原 PDF 截图，不代表云端研究库成果或登记证据。原稿正文与原稿下载不含此图，保持原字节。",
  "alt": "云天化集团自产磷肥，2025H1 至 2026H1：实现价每吨增加 633.01 元，成本增加 759.72 元，吨毛利下降 126.71 元（10.25%）。完整数值、口径和来源在图下文字中。",
  "fullText": "云天化集团自产磷肥，2025H1与2026H1上半年同口径比较，单位元/吨。两根从零开始的堆叠柱，以营业成本和毛利合计表示实现价。2025H1实现价3151.98，吨成本1916.34，吨毛利1235.64；2026H1实现价3784.99，吨成本2676.06，吨毛利1108.93。实现价增加633.01元/吨（20.08%），成本增加759.72元/吨（39.64%），吨毛利下降126.71元（10.25%）。全部吨值由半年报元单位收入、成本及经营公告披露销量重算；销量披露精度为0.01万吨。各显示值单独四舍五入至0.01元/吨；公告整数售价不参与计算。该图为公开原表派生，不是原PDF截图，半年报未经审计。成本变化受产品组合、库存、采购与耗用时滞等影响，不能全部归因于硫磺；吨毛利也不是净利润或经营现金。",
  "sourceBasis": "离线复用已缓存公开原件，原资料核验日为 2026-10-17 UTC；本次未重新联网核验。PDF 页码按从 1 开始的物理页码记录。",
  "sources": [
    {
      "document": "云南云天化股份有限公司2026年半年度报告",
      "url": "https://static.cninfo.com.cn/finalpage/2026-08-18/1225477770.PDF",
      "pdf_physical_page_one_based": 162,
      "printed_page": "162 / 173",
      "source_values": "主营业务（分产品）磷肥，本年与上年同期营业收入、营业成本",
      "sha256": "52869de81393b6dfa77f9e9a6ca13b30a39b41a8fcbb23d6d794ff85384e344e",
      "bytes": 1801960
    },
    {
      "document": "2025年半年度主要经营数据公告，临2025-063",
      "url": "https://static.cninfo.com.cn/finalpage/2025-08-20/1224519068.PDF",
      "pdf_physical_page_one_based": 1,
      "printed_page": "1",
      "source_values": "集团自产磷肥销量221.91万吨；取整不含税售价3152元/吨仅交叉核对",
      "sha256": "ab5b1e2dd20bdadd8a7354e00d01cb45b0637314a89a976984dcd010320db6e8",
      "bytes": 132834
    },
    {
      "document": "2026年半年度主要经营数据公告，临2026-044",
      "url": "https://static.cninfo.com.cn/finalpage/2026-08-18/1225477777.PDF",
      "pdf_physical_page_one_based": 1,
      "printed_page": "1",
      "source_values": "集团自产磷肥销量215.64万吨；取整不含税售价3785元/吨仅交叉核对",
      "sha256": "ea2a104fa0213edad80f0c54a1938f5a81f2ad94f93b3e6228dff63eb02b9739",
      "bytes": 135564
    }
  ],
  "narrowMedia": "(max-width: 800px)",
  "assets": {
    "desktop": {
      "path": "charts/yuntianhua/chart_desktop.png",
      "sha256": "4d266ca9219dda8aca20e082ace1cb0d39b18741bae7532ade51a7fa211c4a15",
      "bytes": 226410,
      "width": 1600,
      "height": 1080
    },
    "narrow": {
      "path": "charts/yuntianhua/chart_narrow.png",
      "sha256": "0c585870cef72b887dfd70a8dd7bed72073feb45099887898f8488442a434edb",
      "bytes": 217798,
      "width": 720,
      "height": 1690
    }
  }
});

function make(doc,tag,text) {const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;return node;}
export function chartForDocument(manifest) {
  return manifest?.localDocumentRef===publicChart.localDocumentRef&&manifest.sha256===publicChart.requiredReportSHA256?publicChart:null;
}

// Called only after the reader has verified and mounted the selected original report.
// Native picture selects a separately laid-out narrow PNG, never a remote image or font.
export function mountPublicChart({root,manifest}) {
  const host=root.querySelector('[data-public-chart]');
  if(!host)return {dispose(){}};
  host.replaceChildren();host.hidden=true;
  const chart=chartForDocument(manifest);
  if(!chart)return {dispose(){}};
  const doc=root.ownerDocument,figure=make(doc,'figure'),heading=make(doc,'h2',chart.title);
  figure.className='local-public-chart';
  heading.id='local-yuntianhua-chart-title';figure.setAttribute('aria-labelledby',heading.id);
  const boundary=make(doc,'p',chart.boundary);boundary.className='local-chart-boundary';
  const picture=make(doc,'picture'),source=make(doc,'source'),image=make(doc,'img');
  source.media=chart.narrowMedia;source.type='image/png';source.srcset='./'+chart.assets.narrow.path;
  source.setAttribute('width',chart.assets.narrow.width);source.setAttribute('height',chart.assets.narrow.height);
  image.alt=chart.alt;image.width=chart.assets.desktop.width;image.height=chart.assets.desktop.height;
  image.decoding='async';image.referrerPolicy='no-referrer';image.setAttribute('aria-describedby','local-yuntianhua-chart-fulltext');
  const status=make(doc,'p','辅助图正在载入；下方完整文字、数值与来源始终可读。');
  status.className='local-chart-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const caption=make(doc,'figcaption'),fullText=make(doc,'p',chart.fullText);
  fullText.id='local-yuntianhua-chart-fulltext';fullText.className='local-chart-fulltext';
  const details=make(doc,'details'),summary=make(doc,'summary','辅助图口径与公开来源（含页码和原件哈希）');
  details.append(summary,make(doc,'p',chart.sourceBasis),make(doc,'p','绑定原稿 SHA-256：'+chart.requiredReportSHA256));
  const list=make(doc,'ul');
  for(const item of chart.sources){
    const row=make(doc,'li'),link=make(doc,'a',item.document);
    link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';
    const info=make(doc,'p',`PDF 第 ${item.pdf_physical_page_one_based} 页（印刷页 ${item.printed_page}）；${item.source_values}。`);
    const digest=make(doc,'p',`缓存原件 ${item.bytes.toLocaleString('en-US')} 字节；SHA-256：${item.sha256}`);
    row.append(link,info,digest);list.append(row);
  }
  details.append(list,make(doc,'p','外部来源链接只在主动点击后打开；本候选不随图下载 PDF，也不替换原稿下载。'));
  caption.append(fullText,details);picture.append(source,image);figure.append(heading,boundary,picture,status,caption);
  let disposed=false;
  const live=()=>!disposed&&host.contains(figure);
  const onLoad=()=>{if(!live())return;picture.hidden=false;status.textContent='辅助图已载入；下方保留完整文字、数值与来源。';};
  const onError=()=>{if(!live())return;picture.hidden=true;status.textContent='辅助图未能显示；完整文字、数值与来源仍在下方，原稿正文与下载不受影响。';};
  image.addEventListener('load',onLoad);image.addEventListener('error',onError);
  host.append(figure);host.hidden=false;image.src='./'+chart.assets.desktop.path;
  return {dispose(){
    if(disposed)return;disposed=true;image.removeEventListener('load',onLoad);image.removeEventListener('error',onError);
    source.removeAttribute('srcset');image.removeAttribute('src');
    if(host.contains(figure)){host.replaceChildren();host.hidden=true;}
  }};
}
