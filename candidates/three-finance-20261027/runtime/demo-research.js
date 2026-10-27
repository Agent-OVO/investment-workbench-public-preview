// Authored fictional teaching graph. These are not claims about a real company.
export const demoResearch = Object.freeze({
  id: 'demo:research:alpha:v1',
  title: '供给约束，如何传导到盈利？',
  nodes: [
    {id:'demo:question:supply',kind:'question',label:'供给约束会改善盈利吗？',short:'研究问题',position:[-34,19,-7],body:'把供给、售价与利润之间的传导拆开，逐项寻找支持与反证。'},
    {id:'demo:industry:materials',kind:'industry',label:'示例材料行业',short:'行业机制',position:[-31,-12,10],body:'观察供给变化与价格响应是否发生在同一市场、同一时间窗口。'},
    {id:'demo:instrument:alpha',kind:'instrument',label:'示例资产A',short:'公司 / 品种',position:[0,5,0],body:'研究对象与行情、成交共用这一品种身份。关联并不意味着价格变化由单一机制导致。'},
    {id:'demo:claim:margin',kind:'claim',label:'售价传导可能改善毛利',short:'待检验判断',position:[29,18,-9],body:'假说需要同时满足售价传导、成本可控与销量不显著受损；不是已经成立的结论。'},
    {id:'demo:evidence:pricing',kind:'evidence',label:'支持：售价传导',short:'支持证据',position:[37,-7,11],body:'设定的示例观察：产品提价与订单兑现方向一致。应回到同口径原表检验，而非只看股价。'},
    {id:'demo:counter:demand',kind:'counter',label:'反证：需求转弱',short:'反证入口',position:[4,-25,-12],body:'如果需求下滑导致量减，即使售价提高，盈利也未必改善。'},
    {id:'demo:condition:cost',kind:'condition',label:'失效条件：成本涨幅更大',short:'失效条件',position:[-7,30,14],body:'若原料成本增幅超过售价传导，原判断不再得到支持；需重估，而不是把反证藏在脚注。'}
  ],
  edges: [
    {id:'demo:edge:01',from:'demo:question:supply',to:'demo:industry:materials',kind:'asks',label:'拆解机制'},
    {id:'demo:edge:02',from:'demo:industry:materials',to:'demo:instrument:alpha',kind:'context',label:'行业语境'},
    {id:'demo:edge:03',from:'demo:question:supply',to:'demo:claim:margin',kind:'hypothesis',label:'形成假说'},
    {id:'demo:edge:04',from:'demo:claim:margin',to:'demo:instrument:alpha',kind:'about',label:'针对对象'},
    {id:'demo:edge:05',from:'demo:evidence:pricing',to:'demo:claim:margin',kind:'supports',label:'支持'},
    {id:'demo:edge:06',from:'demo:counter:demand',to:'demo:claim:margin',kind:'challenges',label:'挑战'},
    {id:'demo:edge:07',from:'demo:condition:cost',to:'demo:claim:margin',kind:'invalidates',label:'满足时失效'}
  ]
});

