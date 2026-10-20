import {chartModel, renderChartSvg, escapeXml as esc} from '../integration/chart.js';

// DOM reading surfaces only. Keep the original SVG and the spatial chart renderer unchanged.
export function renderReadableChart(evidence) {
  return `<div class="flow-chart-scroll" role="region" tabindex="0" aria-label="${esc(evidence.id+' · '+evidence.title+'；图表横向滚动区域，可用左右方向键查看')}">${renderChartSvg(evidence)}</div><p class="flow-chart-hint">图表较宽时可左右滑动，或聚焦图表后用左右方向键查看。</p>`;
}

// Use the original model and the SVG's one-decimal percentage convention; do not rebalance rounded rows.
export function renderChartValues(evidence) {
  const model = chartModel(evidence);
  const distribution = model.type === 'distribution';
  const percentage = fraction => (fraction * 100).toFixed(1) + '%';
  const rows = model.values.map((value, i) => `<tr><th scope="row">${esc(model.labels[i])}</th><td>${value}</td>${distribution ? `<td>${percentage(model.segments[i].fraction)}</td>` : ''}</tr>`).join('');
  const total = distribution ? `<tfoot><tr><th scope="row">合计</th><td>${model.total}</td><td>${percentage(1)}</td></tr></tfoot>` : '';
  return `<details class="c01-chart-values"><summary>查看图表数值 · ${model.values.length} 项</summary><table><caption>${esc(evidence.title)} · ${esc(model.units)}</caption><thead><tr><th scope="col">类别 / 阶段</th><th scope="col">数值</th>${distribution ? '<th scope="col">占比</th>' : ''}</tr></thead><tbody>${rows}</tbody>${total}</table></details>`;
}
