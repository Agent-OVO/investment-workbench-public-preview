import {BANK_CHART_DATA, BANK_CHART_METADATA} from './bank-chart-data.js';

export {BANK_CHART_DATA, BANK_CHART_METADATA};
export const BANK_REPORT_SHA256 = '7132d90e5147038f4d1e5f5752102c1a964f67b35138bbfb3caaa715ee347a62';
const SCALE = 1_000_000;
const mounted = new WeakMap();
const INPUT_FIELDS = [
  ['loan_interest', '贷款利息收入'],
  ['investment_interest', '投资/债券利息收入'],
  ['total_interest_income', '总利息收入'],
  ['deposit_expense', '存款利息支出'],
  ['total_interest_expense', '总利息支出'],
  ['nii', '净利息收入']
];
const COMPONENTS = [
  ['loan', '贷款利息变化'],
  ['investment', '投资/债券利息变化'],
  ['other_assets', '其他资产利息变化'],
  ['deposits', '存款付息节省'],
  ['other_funding', '其他融资付息节省']
];
const UNITS = Object.freeze({amount: '亿元', contribution: '百分点'});

// Integer arithmetic retains the six-decimal source precision in RMB millions.
// All selected values and intermediate sums remain below Number.MAX_SAFE_INTEGER.
export function deriveBankBridge(inputs) {
  const pairs = Object.fromEntries(INPUT_FIELDS.map(([key]) => {
    const pair = inputs?.[key];
    if (!Array.isArray(pair) || pair.length !== 2 || pair.some(value =>
      typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
      !Number.isSafeInteger(Math.round(value * SCALE)))) throw Error('BANK_INPUT_INVALID');
    return [key, pair.map(value => Math.round(value * SCALE))];
  }));
  const {loan_interest: loan, investment_interest: investment, total_interest_income: income,
    deposit_expense: deposit, total_interest_expense: expense, nii} = pairs;
  if (nii[1] <= 0 || [0, 1].some(i => income[i] - expense[i] !== nii[i])) throw Error('BANK_NII_IDENTITY');
  const integers = [
    loan[0] - loan[1],
    investment[0] - investment[1],
    (income[0] - loan[0] - investment[0]) - (income[1] - loan[1] - investment[1]),
    deposit[1] - deposit[0],
    (expense[1] - deposit[1]) - (expense[0] - deposit[0])
  ];
  const total = integers.reduce((sum, value) => sum + value, 0);
  if (total !== nii[0] - nii[1]) throw Error('BANK_BRIDGE_IDENTITY');
  return {
    rmbMillion: integers.map(value => value / SCALE),
    rmbYi: integers.map(value => value / (SCALE * 100)),
    contributionPp: integers.map(value => value / nii[1] * 100),
    totalRmbMillion: total / SCALE,
    totalRmbYi: total / (SCALE * 100),
    totalContributionPp: total / nii[1] * 100
  };
}

export function getBankChartView(code, unit = 'amount') {
  const bank = BANK_CHART_DATA.find(item => item.code === code);
  if (!bank || !Object.hasOwn(UNITS, unit)) return null;
  const bridge = deriveBankBridge(bank.inputs);
  return {bank, bridge, unit, unitLabel: UNITS[unit],
    values: unit === 'amount' ? bridge.rmbYi : bridge.contributionPp};
}

function format(value, digits = 8, signed = false) {
  const rounded = Number(value.toFixed(digits));
  const magnitude = Math.abs(rounded).toLocaleString('zh-CN', {maximumFractionDigits: digits});
  return `${rounded < 0 ? '−' : signed && rounded > 0 ? '+' : ''}${magnitude}`;
}
function semantics(index, value) {
  if (value === 0) return '无变化，对净利息收入无增减';
  if (index >= 3) return value > 0 ? '付息支出减少，增加净利息收入' : '付息支出增加，减少净利息收入';
  return value > 0 ? '利息收入增加，增加净利息收入' : '利息收入减少，减少净利息收入';
}
function direction(value) { return value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero'; }
function make(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function cell(doc, tag, text, scope) {
  const node = make(doc, tag, '', text);
  if (scope) node.setAttribute('scope', scope);
  return node;
}

/** The caller must verify the report bytes before mounting this separate aside.
 * Returns an idempotent disposer. An incompatible manifest fails closed.
 */
export function mountBankInteractive({host, manifest} = {}) {
  if (!host?.ownerDocument) return () => {};
  mounted.get(host)?.();
  host.replaceChildren();
  host.hidden = true;
  if (manifest?.slug !== 'banks' || manifest?.sha256 !== BANK_REPORT_SHA256) return () => {};
  const doc = host.ownerDocument;
  const section = make(doc, 'section', 'bank-interactive');
  section.setAttribute('aria-label', '六家银行净利息收入变动桥，独立交互辅助图');
  section.dataset.bankInteractive = 'true';
  const title = make(doc, 'h2', 'bank-chart-title', '净利息收入变动桥');
  const sub = make(doc, 'p', 'bank-chart-intro', '2026H1 对比 2025H1 · 六家银行 · 公开历史快照');
  const boundary = make(doc, 'p', 'bank-chart-boundary', BANK_CHART_METADATA.scopeNote);
  const controls = make(doc, 'div', 'bank-chart-controls');
  const bankLabel = make(doc, 'label', '', '选择银行');
  const bankSelect = make(doc, 'select');
  bankSelect.dataset.bankSelect = 'true';
  for (const bank of BANK_CHART_DATA) {
    const option = make(doc, 'option', '', `${bank.name} · ${bank.code}`);
    option.value = bank.code;
    bankSelect.append(option);
  }
  bankLabel.append(bankSelect);
  const unitLabel = make(doc, 'label', '', '图表单位');
  const unitSelect = make(doc, 'select');
  unitSelect.dataset.bankUnit = 'true';
  for (const [value, label] of [['amount', '金额（亿元）'], ['contribution', '对上年净利息贡献（百分点）']]) {
    const option = make(doc, 'option', '', label);
    option.value = value;
    unitSelect.append(option);
  }
  unitLabel.append(unitSelect);
  controls.append(bankLabel, unitLabel);
  const summary = make(doc, 'p', 'bank-chart-summary');
  summary.dataset.bankSummary = 'true';
  const feedback = make(doc, 'p', 'bank-chart-feedback');
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  feedback.dataset.bankFeedback = 'true';
  const chart = make(doc, 'div', 'bank-chart-plot');
  chart.setAttribute('role', 'group');
  const axis = make(doc, 'div', 'bank-chart-axis');
  axis.setAttribute('aria-hidden', 'true');
  const low = make(doc, 'span');
  const zero = make(doc, 'span', '', '0');
  const high = make(doc, 'span');
  axis.append(low, zero, high);
  const chartRows = make(doc, 'div', 'bank-chart-bars');
  const detail = make(doc, 'p', 'bank-chart-detail');
  detail.setAttribute('role', 'status');
  detail.setAttribute('aria-live', 'polite');
  detail.setAttribute('aria-atomic', 'true');
  detail.dataset.bankDetail = 'true';
  const help = make(doc, 'p', 'bank-chart-help', '鼠标悬停、点击或触摸条形可读明细；键盘 Tab 进入，方向键、Home / End 切换，Enter / 空格选择。左右分别表示减少 / 增加净利息收入。每家银行独立缩放，跨行比较请读数值。');
  const bars = COMPONENTS.map(([key, label], index) => {
    const button = make(doc, 'button', 'bank-chart-bar-button');
    button.type = 'button';
    button.dataset.bankItem = String(index);
    button.dataset.component = key;
    const name = make(doc, 'span', 'bank-chart-item-name', label);
    const track = make(doc, 'span', 'bank-chart-track');
    track.setAttribute('aria-hidden', 'true');
    const fill = make(doc, 'span', 'bank-chart-fill');
    track.append(fill);
    const value = make(doc, 'span', 'bank-chart-item-value');
    button.append(name, track, value);
    chartRows.append(button);
    return {button, fill, value};
  });
  chart.append(axis, chartRows);
  const tableWrap = make(doc, 'div', 'bank-chart-table-wrap');
  tableWrap.tabIndex = 0;
  tableWrap.setAttribute('role', 'region');
  tableWrap.setAttribute('aria-label', '净利息收入变动数值表，可横向滚动');
  const table = make(doc, 'table', 'bank-chart-table');
  const caption = make(doc, 'caption');
  const thead = make(doc, 'thead');
  const headings = make(doc, 'tr');
  ['变动项目', '金额（亿元）', '贡献（百分点）', '正负含义'].forEach(label => headings.append(cell(doc, 'th', label, 'col')));
  thead.append(headings);
  const tbody = make(doc, 'tbody');
  tbody.dataset.bankTable = 'true';
  table.append(caption, thead, tbody);
  tableWrap.append(table);
  const precision = make(doc, 'p', 'bank-chart-precision', BANK_CHART_METADATA.precisionNote);
  const provenance = make(doc, 'details', 'bank-chart-provenance');
  provenance.append(make(doc, 'summary', '', '复算输入、公式与来源哈希'));
  const provenanceBody = make(doc, 'div', 'bank-chart-provenance-body');
  provenance.append(provenanceBody);
  const sourceLine = make(doc, 'p', 'bank-chart-source');
  section.append(title, sub, boundary, controls, summary, feedback, chart, help, detail, tableWrap, precision, sourceLine, provenance);
  host.append(section);
  host.hidden = false;
  let code = BANK_CHART_DATA[0].code;
  let unit = 'amount';
  let selected = 0;
  let disposed = false;
  let view;
  const listeners = [];
  const listen = (node, type, handler) => {
    node.addEventListener(type, handler);
    listeners.push(() => node.removeEventListener(type, handler));
  };
  function choose(index, focus = false) {
    if (disposed || !Number.isInteger(index) || index < 0 || index >= bars.length) return false;
    selected = index;
    bars.forEach(({button}, i) => button.setAttribute('aria-pressed', String(i === selected)));
    const [key, label] = COMPONENTS[selected];
    detail.textContent = `${view.bank.name} · ${label}：${format(view.bridge.rmbYi[selected], 8, true)} 亿元；对2025H1净利息收入贡献 ${format(view.bridge.contributionPp[selected], 6, true)} 个百分点。${semantics(selected, view.bridge.rmbYi[selected])}。公式：${BANK_CHART_METADATA.formulas[key]}。`;
    if (focus) bars[index].button.focus();
    return true;
  }
  function sourceLink(bank) {
    const link = make(doc, 'a', '', `${bank.name}2026年半年度报告（外部 PDF）`);
    link.href = bank.source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.referrerPolicy = 'no-referrer';
    return link;
  }
  function renderProvenance() {
    const bank = view.bank;
    provenanceBody.replaceChildren();
    const inputTable = make(doc, 'table', 'bank-chart-table bank-chart-input-table');
    inputTable.append(make(doc, 'caption', '', `${bank.name} · 原始精选输入（人民币百万元）`));
    const header = make(doc, 'thead');
    const row = make(doc, 'tr');
    ['项目', '2026H1', '2025H1'].forEach(label => row.append(cell(doc, 'th', label, 'col')));
    header.append(row);
    const body = make(doc, 'tbody');
    for (const [field, label] of INPUT_FIELDS) {
      const tr = make(doc, 'tr');
      tr.append(cell(doc, 'th', label, 'row'), ...bank.inputs[field].map(value => cell(doc, 'td', format(value, 6))));
      body.append(tr);
    }
    inputTable.append(header, body);
    const inputScroll = make(doc, 'div', 'bank-chart-table-wrap');
    inputScroll.tabIndex = 0;
    inputScroll.setAttribute('role', 'region');
    inputScroll.setAttribute('aria-label', '原始精选输入表，可横向滚动');
    inputScroll.append(inputTable);
    provenanceBody.append(inputScroll);
    const formulas = make(doc, 'ul');
    for (const formula of Object.values(BANK_CHART_METADATA.formulas)) formulas.append(make(doc, 'li', '', formula));
    provenanceBody.append(formulas);
    for (const text of [
      `研究与取数日期：${BANK_CHART_METADATA.researchAsOf}；财务报告期：2026H1 / 2025H1；来源发布日期：${bank.source.publication_date}；原始文件取数日期（UTC）：${bank.source.retrieved_date_utc}。`,
      `披露来源：${bank.source.kind}。来源链接沿用该日已核快照，此次界面构建未重新联网验证链接可达性。`,
      `原稿：${BANK_CHART_METADATA.report.filename}；对应第2节净利息变动桥、第11节公开来源。原稿 SHA-256：${BANK_REPORT_SHA256}`,
      `精选输入：${BANK_CHART_METADATA.inputFile.file}，JSON 位置 ${bank.inputPointer}，仅保留上表六对损益数字。文件 SHA-256：${BANK_CHART_METADATA.inputFile.sha256}`,
      `复核结果文件：${BANK_CHART_METADATA.calculationFile.file}，对应代码 ${bank.code} 的 nii_bridge_rmb_million / nii_bridge_pct_prior_nii。文件 SHA-256：${BANK_CHART_METADATA.calculationFile.sha256}`,
      `来源索引：${BANK_CHART_METADATA.sourceManifest.file}，SHA-256：${BANK_CHART_METADATA.sourceManifest.sha256}`,
      `原始报告文件：${bank.source.file}，SHA-256：${bank.source.sha256}。原始 PDF 与完整证据包未复制到本页。`
    ]) provenanceBody.append(make(doc, 'p', '', text));
  }
  function render() {
    if (disposed) return;
    view = getBankChartView(code, unit);
    bankSelect.value = code;
    unitSelect.value = unit;
    summary.textContent = `${view.bank.name}：净利息收入由 ${format(view.bank.inputs.nii[1] / 100, 2)} 亿元变为 ${format(view.bank.inputs.nii[0] / 100, 2)} 亿元，合计变化 ${format(view.bridge.totalRmbYi, 2, true)} 亿元（同比 ${format(view.bridge.totalContributionPp, 2, true)}%）。`;
    chart.setAttribute('aria-label', `${view.bank.name}，净利息收入五段变动桥，单位${view.unitLabel}`);
    const max = Math.max(...view.values.map(Math.abs), 1e-10);
    low.textContent = `${format(-max, 3)} ${view.unitLabel}`;
    high.textContent = `${format(max, 3, true)} ${view.unitLabel}`;
    bars.forEach(({button, fill, value}, i) => {
      const number = view.values[i];
      const width = Math.abs(number) / max * 50;
      fill.style.setProperty('width', `${width}%`);
      fill.style.setProperty('left', `${number < 0 ? 50 - width : 50}%`);
      button.dataset.direction = direction(number);
      button.dataset.value = String(number);
      value.textContent = `${format(number, 2, true)} ${view.unitLabel}`;
      button.setAttribute('aria-label', `${COMPONENTS[i][1]}，${value.textContent}；${semantics(i, number)}`);
    });
    caption.textContent = `${view.bank.name} · 2026H1 对比 2025H1（两种单位始终列示）`;
    tbody.replaceChildren();
    for (let i = 0; i <= COMPONENTS.length; i++) {
      const total = i === COMPONENTS.length;
      const tr = make(doc, 'tr', total ? 'bank-chart-total' : '');
      const amount = total ? view.bridge.totalRmbYi : view.bridge.rmbYi[i];
      const contribution = total ? view.bridge.totalContributionPp : view.bridge.contributionPp[i];
      tr.dataset.direction = direction(amount);
      tr.append(cell(doc, 'th', total ? '净利息收入合计变化' : COMPONENTS[i][1], 'row'),
        cell(doc, 'td', format(amount, 8, true)), cell(doc, 'td', format(contribution, 6, true)),
        cell(doc, 'td', total ? (amount > 0 ? '净利息收入增加' : amount < 0 ? '净利息收入减少' : '净利息收入无变化') : semantics(i, amount)));
      tbody.append(tr);
    }
    sourceLine.replaceChildren(sourceLink(view.bank), make(doc, 'span', '', ` · ${view.bank.source.publication_date} 发布 · 点击后在外部网站打开`));
    renderProvenance();
    choose(selected);
  }
  listen(bankSelect, 'change', () => {
    if (disposed) return;
    if (!BANK_CHART_DATA.some(bank => bank.code === bankSelect.value)) {
      bankSelect.value = code;
      feedback.textContent = '未识别该银行，已保留原选择。';
      return;
    }
    code = bankSelect.value;
    feedback.textContent = '';
    render();
  });
  listen(unitSelect, 'change', () => {
    if (disposed) return;
    if (!Object.hasOwn(UNITS, unitSelect.value)) {
      unitSelect.value = unit;
      feedback.textContent = '未识别该单位，已保留原选择。';
      return;
    }
    unit = unitSelect.value;
    feedback.textContent = '';
    render();
  });
  bars.forEach(({button}, index) => {
    listen(button, 'click', () => choose(index));
    listen(button, 'focus', () => choose(index));
    listen(button, 'pointerenter', () => choose(index));
    listen(button, 'keydown', event => {
      let next;
      if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (index + 1) % bars.length;
      else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (index + bars.length - 1) % bars.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = bars.length - 1;
      else if (event.key === 'Enter' || event.key === ' ') next = index;
      else return;
      event.preventDefault();
      choose(next, true);
    });
  });
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    listeners.forEach(remove => remove());
    if (mounted.get(host) === dispose) {
      host.replaceChildren();
      host.hidden = true;
      mounted.delete(host);
    }
  };
  mounted.set(host, dispose);
  render();
  return dispose;
}
