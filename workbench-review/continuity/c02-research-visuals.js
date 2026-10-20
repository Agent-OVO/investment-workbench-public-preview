// All visual data is derived from the delivered, hash-checked public draft.
// A source thumbnail is a new typesetting of that draft, never an issuer PDF screenshot.
export const C02_VISUAL_REVISION='c02-research-atlas-20261019';
export function deriveC02Visuals(raw){
 const lines=raw.split(/\r?\n/),find=(needle)=>{const i=lines.findIndex(x=>x.includes(needle));if(i<0)throw Error('C02_VISUAL_SOURCE_MISSING '+needle);return i+1;};
 const tables={
  repairs:{needle:'| 密封产品修复 | 0.678 / 86.71% | 0.859 / 84.58% | 1.044 / 85.44% | 0.424 / 84.80% | 0.500 / 80.80% |',values:[.678,.859,1.044,.424,.500],labels:['2023','2024','2025','25H1','26H1'],unit:'收入 / 亿元',scope:'年度与半年分组，不连成同频趋势'},
  margin:{needle:'| 干气密封及控制系统 | 3.602 / 51.66% |',optional:true},
  bridge:{needle:'| 干气密封及控制系统 | 9,948.11 | 6,845.81 | -3,102.30 |',values:[-3102.30,-1194.96,444.18],labels:['干气密封','辅助系统','修复'],unit:'毛利同比变化 / 万元',scope:'2026H1 对比 2025H1，三个选定产品；不是集团完整毛利桥'},
  concentration:{needle:'H126修复占收入6.09%，却贡献毛利0.404亿元、占合并毛利12.44%。',values:[6.09,12.44],labels:['收入占比','毛利占比'],unit:'2026H1 / %',scope:'两个分母不同，不相加'},
 };
 for(const [id,entry]of Object.entries(tables)){if(entry.optional){delete tables[id];continue;}entry.line=find(entry.needle);}
 // Verify every displayed bridge value independently, fail closed on source drift.
 find('| 机械密封辅助系统 | 1,059.55 | -135.41 | -1,194.96 |');find('| 密封产品修复 | 3,593.97 | 4,038.15 | 444.18 |');
 const excerpts=[
  {id:'design',label:'设计与工况',title:'原始设计与现场验证',needle:'原始设计、现场验证与旧图纸复用减少替换时重新设计试错。',detail:'旧图纸复用，降低替换试错',source:'A25 p13 · IR0314 pp1–2'},
  {id:'service',label:'服务网络',title:'执行能力已有记录',needle:'H126有近40个办事处、10余个国内外维修中心，完成110次抢修',detail:'近40个办事处 · 10余维修中心',source:'H126 p20'},
  {id:'conversion',label:'实际案例',title:'首轮检修与替代维修',needle:'2024年中科炼化80万吨/年乙烯三机干气密封首轮大修完成',detail:'中科炼化 · 古雷石化 · 抚顺石化',source:'A24 p21 · A25 p21'},
  {id:'closure',label:'反向约束',title:'老旧产能退出',needle:'装置关闭会永久损失存量',detail:'装置关闭，客户可能永久流失',source:'IR0908 p2 · IR0213 p2'},
  {id:'replace',label:'替代效应',title:'维修可能替代新件',needle:'维修可能替代更贵的新密封',detail:'维修增长≠生命周期收入增长',source:'IR0908 p1'},
  {id:'cash',label:'待核验问题',title:'同批装机的后续净现金',needle:'最能改变判断的一项新增证据，是同一批新装机在投产后实际产生的累计售后净现金',detail:'扣除服务、应收与资本投入',source:'原稿研究问题 · 尚未获证'},
 ];
 return {revision:C02_VISUAL_REVISION,tables,excerpts:excerpts.map(x=>({...x,line:find(x.needle)})),scope:'同一份中密控股研究的五个阅读视角；连线仅组织阅读，不代表跨研究引用、公司关联或已证实因果。'};
}
