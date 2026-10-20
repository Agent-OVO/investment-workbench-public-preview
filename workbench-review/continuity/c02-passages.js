// Fixed excerpts from an already delivered public snapshot, never new research or live quotes.
export const C02_PASSAGES=[
  {id:'focus',title:'选中的研究',text:'存量售后能否抵消增量价格战',needle:'最能改变判断的一项新增证据，是同一批新装机在投产后实际产生的累计售后净现金',action:'阅读中密控股全文',section:'一、先给结论'},
  {id:'support',title:'支持线索',text:'原始设计、现场验证与旧图纸复用减少替换时重新设计试错。',needle:'原始设计、现场验证与旧图纸复用减少替换时重新设计试错。',action:'核对优势机制',section:'五、优势成立的机制'},
  {id:'limits',title:'反向证据与约束',text:'截至2026H1，维修增长没有抵消新增项目压力。',needle:'截至2026H1，维修增长没有抵消新增项目压力。',action:'阅读结论及限制',section:'一、先给结论'},
  {id:'evidence',title:'共享证据',text:'H126修复占收入6.09%，却贡献毛利0.404亿元、占合并毛利12.44%。',needle:'H126修复占收入6.09%，却贡献毛利0.404亿元、占合并毛利12.44%。',action:'追溯数据口径',section:'三、收入与利润池'},
  {id:'questions',title:'后续问题',text:'每批装机后续净现金，能否回收初始让利？',needle:'最能改变判断的一项新增证据，是同一批新装机在投产后实际产生的累计售后净现金',action:'核对问题并写复盘',section:'一、下一步证据',paraphrase:true}
];
export function bindPassages(raw,manifest) {
  const lines=raw.split(/\r?\n/);
  return C02_PASSAGES.map(card=>{
    const index=lines.findIndex(line=>line.includes(card.needle));
    if(index<0)throw Error('C02_EXCERPT_NOT_FOUND '+card.id);
    // The reader publishes heading anchors, not paragraph/list-item anchors.
    // Keep the exact excerpt line visible, and navigate to its real enclosing section.
    let heading=index;
    while(heading>=0&&!/^#{1,6}\s+/.test(lines[heading]))heading--;
    if(heading<0)throw Error('C02_SECTION_NOT_FOUND '+card.id);
    return {...card,line:index+1,sectionLine:heading+1,href:`/investment-workbench-public-preview/workbench-review/research/sinoseal/#${manifest.anchorPrefix}-line-${heading+1}`};
  });
}
