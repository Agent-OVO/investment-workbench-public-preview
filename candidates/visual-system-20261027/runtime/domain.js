import {INPUT, SOURCES} from './data.js';
import {REPORT, SNAPSHOT, REVISION, rows, byId, group, groupDelta, repair, combined, selectedThree, auditGap, comparisonId} from './core.js';
import {getReport, assertAllowedReport} from './registry.js';

// Semantic identities belong to the public research objects, never DOM nodes,
// render order, mesh UUIDs or the current presentation release.
export {REPORT, SNAPSHOT, REVISION, comparisonId};
export const sceneProducts = Object.freeze(['dry-gas-seals', 'auxiliary-systems', 'repair']);
export const recordIdentity = (product, period) => REPORT + ':record:' + product + ':' + period;
export const productIdentity = id => `${REPORT}:product:${id}`;
export const sourceIdentity = alias => `${REPORT}:source:${alias}`;
export const factIdentity = (product, period, metric) => `${REPORT}:fact:${product}:${period}:${metric}`;
export const claimIdentity = id => `${REPORT}:claim:${id}`;
export const groupIdentity = `${REPORT}:group:consolidated`;
export const groupComparisonIdentity = `${REPORT}:comparison:consolidated:gross-profit:2026H1-vs-2025H1`;
const frozen = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(frozen);
    Object.freeze(value);
  }
  return value;
};

export const events = frozen([
  {id:'event:sinoseal:research:2026-10-17', kind:'research-snapshot', date:'2026-10-17', title:'原研究快照', reportId:REPORT, snapshotId:SNAPSHOT,
   description:'固定公开研究原稿；历史价格 26.57 元采用 2026-10-16 未复权收盘，不是实时行情。',
   sha256:getReport('sinoseal').sha256},
  {id:'event:sinoseal:verification:2026-10-24', kind:'source-verification', date:'2026-10-24', title:'来源核验与局部订正', reportId:REPORT, snapshotId:SNAPSHOT,
   description:'核对两期 18 条产品及其他业务输入和来源页；修复＋零配件占比订正为 13.77%，投关问答定位为物理第 1–2 页。这不是新的经营研究快照。'},
  {id:'event:sinoseal:interface:2026-10-25', kind:'interface-release', date:'2026-10-25', title:'研究工作区界面版本', reportId:REPORT, snapshotId:SNAPSHOT,
   description:'同对象选择、精确复算、来源与返回的界面迭代；不增加研究历史，不改变原研究结论。'}
]);

export const claims = frozen([
  {id:claimIdentity('repair-scale'), type:'claim', reportId:REPORT, productId:'repair', title:'修复增长，仍不足以抵消集团毛利压力',
   text:'修复毛利增加 444.18 万元，集团毛利净减少 5,292.78 万元；这是已核原数的量级对照，不是完整集团毛利桥，也不是售后净现金。',
   boundary:'三项选定产品不代表集团全貌；产品分类不等于新增业务分部。'},
  {id:claimIdentity('repair-growth-context'), type:'claim', reportId:REPORT, productId:'repair', title:'增长原因与外推边界须一起读',
   text:'投关问答同时提到部分进口品牌维修转入，以及部分业主在部分项目中选择修复再利用而非更换备件。',
   boundary:'未披露替代金额、售后净现金或全体客户行为；此记录不用于解释干气密封或辅助系统变化。'}
]);

export const sources = frozen(SOURCES.map(source => ({...source, id:sourceIdentity(source.source_id), type:'source', reportId:REPORT, alias:source.source_id})));
export function getSource(aliasOrIdentity) {
  return sources.find(source => source.alias === aliasOrIdentity || source.id === aliasOrIdentity) || null;
}
export function assertAllowedSource(aliasOrIdentity) {
  const source = getSource(aliasOrIdentity);
  if (!source) throw Error('SOURCE_NOT_IN_PUBLIC_ALLOWLIST');
  return source;
}

export function buildGraph() {
  const report = assertAllowedReport('sinoseal', '36ede2208d9edcb82f28f4f0947a44f73e0875a2908058d3288e806855585a6c');
  const nodes = [
    {id:REPORT, type:'report', slug:'sinoseal', label:report.company, sha256:report.sha256},
    {id:SNAPSHOT, type:'snapshot', reportId:REPORT, date:'2026-10-17', sha256:report.sha256},
    ...sources,
    ...claims,
    {id:groupIdentity, type:'scope', reportId:REPORT, label:'集团合并', scope:'consolidated'}
  ];
  const edges = [];
  const link = (from,to,predicate,details={}) => edges.push({id:`edge:${from}:${predicate}:${to}`,from,to,predicate,...details});
  link(REPORT,SNAPSHOT,'has-research-snapshot');
  for (const source of sources) link(REPORT,source.id,'registers-source');
  for (const row of rows) {
    const productId = productIdentity(row.id);
    nodes.push({id:productId,type:'product',reportId:REPORT,productId:row.id,label:row.label,rowType:row.periods[0].row_type,sceneMapped:sceneProducts.includes(row.id)});
    link(SNAPSHOT,productId,'includes-disclosed-row');
    for (const period of row.periods) {
      const location = {sourceAlias:period.source_id,physicalPage:period.physical_page,printedPage:period.printed_page,productId:row.id,period:period.period};
      const recordId=recordIdentity(row.id,period.period);
      const operandIds=['revenue','cost'].map(metric=>factIdentity(row.id,period.period,metric));
      nodes.push({id:recordId,type:'disclosed-record',reportId:REPORT,productId:row.id,period:period.period,unit:'CNY',revenue:period.revenue,cost:period.cost,revenueCents:period.revenueCents,costCents:period.costCents,operandIds,...location});
      link(sourceIdentity(period.source_id),recordId,'original-row-at',location);
      link(productId,recordId,'has-period-record');
      for (const metric of ['revenue','cost']) {
        const id = factIdentity(row.id,period.period,metric);
        const value = period[metric];
        nodes.push({id,type:'disclosed-fact',reportId:REPORT,productId:row.id,period:period.period,metric,unit:'CNY',value,valueCents:metric==='revenue'?period.revenueCents:period.costCents,missing:value===null,...location});
        link(sourceIdentity(period.source_id),id,'original-value-at',location);
        link(productId,id,'has-period-value');
        link(recordId,id,'contains-disclosed-value',{metric});
      }
      const grossId = factIdentity(row.id,period.period,'gross-profit');
      nodes.push({id:grossId,type:'calculation',reportId:REPORT,productId:row.id,period:period.period,metric:'gross-profit',unit:'CNY',valueCents:period.gross,formula:'revenue - cost',missing:period.gross===null});
      link(factIdentity(row.id,period.period,'revenue'),grossId,'calculation-input',{role:'minuend'});
      link(factIdentity(row.id,period.period,'cost'),grossId,'calculation-input',{role:'subtrahend'});
      link(recordId,grossId,'calculation-input-bundle',{operandIds,operation:'revenue - cost'});
    }
    const comparison = comparisonId(row.id);
    nodes.push({id:comparison,type:'comparison',reportId:REPORT,productId:row.id,metric:'gross-profit',unit:'CNY',valueCents:row.delta,formula:'2026H1 gross-profit - 2025H1 gross-profit',missing:row.delta===null});
    link(factIdentity(row.id,'2026H1','gross-profit'),comparison,'calculation-input',{role:'minuend'});
    link(factIdentity(row.id,'2025H1','gross-profit'),comparison,'calculation-input',{role:'subtrahend'});
  }
  // Consolidated denominator is independent; it is never reconstructed by
  // treating the undisclosed other-business costs as zero or as a residual.
  for (const period of group) {
    for (const metric of ['revenue','cost']) {
      const id=factIdentity('consolidated',period.period,metric);
      nodes.push({id,type:'disclosed-fact',reportId:REPORT,scope:'consolidated',period:period.period,metric,unit:'CNY',value:period[metric],valueCents:metric==='revenue'?period.revenueCents:period.costCents,physicalPage:period.physical_page,sourceAlias:period.source_id});
      link(sourceIdentity(period.source_id),id,'original-value-at',{physicalPage:period.physical_page,scope:'consolidated'});
      link(groupIdentity,id,'has-period-value');
    }
    const id=factIdentity('consolidated',period.period,'gross-profit');
    nodes.push({id,type:'calculation',reportId:REPORT,scope:'consolidated',period:period.period,metric:'gross-profit',unit:'CNY',valueCents:period.gross,formula:'revenue - cost'});
    link(factIdentity('consolidated',period.period,'revenue'),id,'calculation-input',{role:'minuend'});
    link(factIdentity('consolidated',period.period,'cost'),id,'calculation-input',{role:'subtrahend'});
  }
  nodes.push({id:groupComparisonIdentity,type:'comparison',reportId:REPORT,scope:'consolidated',metric:'gross-profit',unit:'CNY',valueCents:groupDelta});
  link(factIdentity('consolidated','2026H1','gross-profit'),groupComparisonIdentity,'calculation-input',{role:'minuend'});
  link(factIdentity('consolidated','2025H1','gross-profit'),groupComparisonIdentity,'calculation-input',{role:'subtrahend'});
  link(comparisonId('repair'),claimIdentity('repair-scale'),'supports-scale-comparison');
  link(groupComparisonIdentity,claimIdentity('repair-scale'),'supports-scale-comparison');
  link(sourceIdentity('IR0908'),claimIdentity('repair-growth-context'),'explains-with-limits',{productId:'repair',physicalPages:[1,2],quotePage:2});
  link(claimIdentity('repair-growth-context'),claimIdentity('repair-scale'),'limits-extrapolation',{productId:'repair'});
  const ids=new Set(nodes.map(node=>node.id));
  if(ids.size!==nodes.length || edges.some(edge=>!ids.has(edge.from)||!ids.has(edge.to))) throw Error('INVALID_SEMANTIC_GRAPH');
  return frozen({schema:'public-research-semantic-v1',reportId:REPORT,snapshotId:SNAPSHOT,nodes,edges});
}
export const graph=buildGraph();
const nodeById = Object.freeze(Object.fromEntries(graph.nodes.map(node=>[node.id,node])));
export const getNode = id => Object.hasOwn(nodeById,id) ? nodeById[id] : null;
export const edgesFor = id => graph.edges.filter(edge=>edge.from===id||edge.to===id);

export function selectedContext(productId) {
  const row=Object.hasOwn(byId,productId)?byId[productId]:null;
  if (!row) return null;
  const relatedIds=new Set([productIdentity(productId),comparisonId(productId)]);
  for(const period of row.periods) {
    relatedIds.add(recordIdentity(productId,period.period));
    for(const metric of ['revenue','cost','gross-profit']) relatedIds.add(factIdentity(productId,period.period,metric));
  }
  const edges=graph.edges.filter(edge=>relatedIds.has(edge.from)||relatedIds.has(edge.to));
  return {productId,objectId:productIdentity(productId),row,comparison:getNode(comparisonId(productId)),periods:row.periods.map(period=>({...period,source:getSource(period.source_id)})),sources:row.periods.map(period=>getSource(period.source_id)),claims:productId==='repair'?claims:[],edges,sceneMapped:sceneProducts.includes(productId)};
}
export function sourceContext(alias, productId='repair') {
  const source=getSource(alias), selected=selectedContext(productId);
  if(!source||!selected)return null;
  const period=selected.row.periods.find(period=>period.source_id===source.alias)||null;
  return {source,productId,product:selected.row,period,physicalPage:source.alias==='IR0908'?2:period?.physical_page??null,applicableToSelected:source.alias!=='IR0908'||productId==='repair',outbound:edgesFor(source.id).filter(edge=>edge.from===source.id)};
}
// A visible source rib is a compact presentation of this registered path, not
// an invented source-causes-growth link. The operand facts remain addressable
// individually for exact reading, including a genuinely undisclosed null cost.
export function provenanceBundle(productId, period) {
  const selected=selectedContext(productId);
  const row=selected?.row.periods.find(item=>item.period===period);
  if(!row)return null;
  const recordId=recordIdentity(productId,period), sourceId=sourceIdentity(row.source_id);
  const grossId=factIdentity(productId,period,'gross-profit'), comparison= comparisonId(productId);
  const find=(from,to,predicate)=>graph.edges.find(edge=>edge.from===from&&edge.to===to&&edge.predicate===predicate);
  const originalRow=find(sourceId,recordId,'original-row-at');
  const bundle=find(recordId,grossId,'calculation-input-bundle');
  const comparisonInput=find(grossId,comparison,'calculation-input');
  const operandIds=['revenue','cost'].map(metric=>factIdentity(productId,period,metric));
  const operandPaths=operandIds.map(id=>{
    const contains=find(recordId,id,'contains-disclosed-value');
    const input=find(id,grossId,'calculation-input');
    return {operandId:id,edgeIds:[originalRow.id,contains.id,input.id,comparisonInput.id]};
  });
  return frozen({
    id:'provenance-bundle:' + productId + ':' + period,
    productId,period,sourceId,sourceAlias:row.source_id,recordId,grossId,comparisonId:comparison,
    physicalPage:row.physical_page,printedPage:row.printed_page,
    record:getNode(recordId),operandIds,calculable:row.gross!==null,
    originalRowEdgeId:originalRow.id,calculationBundleEdgeId:bundle.id,comparisonInputEdgeId:comparisonInput.id,
    edgeIds:[originalRow.id,bundle.id,comparisonInput.id],
    paths:{sourceToRecord:[originalRow.id],recordToComparison:[bundle.id,comparisonInput.id],sourceToComparison:[originalRow.id,bundle.id,comparisonInput.id],operands:operandPaths}
  });
}
export const financialAudit = Object.freeze({repairDelta:repair.delta,groupDelta,selectedThree,combined,auditGap,inputRows:INPUT.rows.length,otherBusinessCostIsNull:byId['other-business'].periods.every(period=>period.costCents===null)});
