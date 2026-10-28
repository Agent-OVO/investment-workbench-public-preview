// Deterministic fictional inputs authored for the 3D technical prototype.
// No quotes, holdings, transaction files, private records or network inputs are used.
const INSTRUMENT_ID = 'demo:instrument:alpha';
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

function integer(value, name, {min = 0} = {}) {
  if (!Number.isSafeInteger(value) || value < min) throw new RangeError(name + '_MUST_BE_SAFE_INTEGER');
  return value;
}
function exactSum(a, b, name) {
  const result = a + b;
  if (!Number.isSafeInteger(result)) throw new RangeError(name + '_OVERFLOW');
  return result;
}

function syntheticDates(count) {
  const dates = [];
  const date = new Date('2026-08-03T00:00:00.000Z');
  while (dates.length < count) {
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) dates.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
}

function createCandles() {
  let seed = 0x35ab19e7;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const pulse = [21, -14, 35, 8, -28, 17, 42, -31, 6, 24, -19, 13];
  let priorClose = 3860;
  return syntheticDates(48).map((date, sessionIndex) => {
    const openCents = priorClose + Number(next() % 65) - 32;
    const direction = sessionIndex < 16 ? 11 : sessionIndex < 30 ? -9 : 7;
    const closeCents = sessionIndex === 9 ? openCents : openCents + pulse[sessionIndex % pulse.length] + direction;
    const highCents = Math.max(openCents, closeCents) + 9 + Number(next() % 42);
    const lowCents = Math.min(openCents, closeCents) - 8 - Number(next() % 37);
    const volume = 6200 + Number(next() % 25900) + (sessionIndex % 7) * 450;
    priorClose = closeCents;
    return {id: 'demo:bar:alpha:' + date, instrumentId: INSTRUMENT_ID, date, sessionIndex,
      openCents, highCents, lowCents, closeCents, volume};
  });
}

const candles = createCandles();
const tradePlan = [
  {sessionIndex: 4, side: 'buy', quantity: 150, feeCents: 17},
  {sessionIndex: 12, side: 'sell', quantity: 50, feeCents: 11},
  {sessionIndex: 19, side: 'buy', quantity: 80, feeCents: 13},
  {sessionIndex: 28, side: 'sell', quantity: 90, feeCents: 15},
  {sessionIndex: 35, side: 'buy', quantity: 120, feeCents: 19},
  {sessionIndex: 43, side: 'sell', quantity: 40, feeCents: 9}
];
const trades = tradePlan.map((trade, index) => {
  const bar = candles[trade.sessionIndex];
  return {id: 'demo:trade:alpha:' + String(index + 1).padStart(2, '0'), instrumentId: INSTRUMENT_ID,
    barId: bar.id, date: bar.date, sessionIndex: bar.sessionIndex, side: trade.side,
    quantity: trade.quantity, priceCents: bar.closeCents, feeCents: trade.feeCents};
});

export const demoMarket = deepFreeze({
  id: 'demo:market:alpha:v1',
  instrument: {id: INSTRUMENT_ID, code: 'DEMO-ALPHA', label: '示例资产A', name: '示例资产A',
    currency: 'CNY', priceScale: 100, quantityUnit: '股', volumeUnit: '股'},
  candles,
  trades,
  provenance: {
    kind: 'wholly-fictional', generator: 'authored-integer-sequence-v1',
    inputSources: [], derivedFromRealMarketOrPrivateRecords: false,
    calendar: 'Synthetic weekday sequence; not an exchange holiday calendar',
    prices: 'Integer hundredths of CNY; generated from an authored pulse and deterministic integer seed',
    transactions: 'Six authored fictional fills at the corresponding synthetic close; no real order execution',
    fees: 'Authored integer amounts, not a broker fee schedule',
    generatedFor: '3D geometry, exact-readout and shared-object interaction checks'
  }
});

/** Exact decimal formatting: never reconstruct cents from a rounded display. */
export function formatPrice(cents) {
  if (typeof cents !== 'bigint' && !Number.isSafeInteger(cents)) throw new RangeError('PRICE_CENTS_MUST_BE_INTEGER');
  const value = BigInt(cents), negative = value < 0n, absolute = negative ? -value : value;
  const whole = String(absolute / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (negative ? '−' : '') + whole + '.' + String(absolute % 100n).padStart(2, '0');
}

/** Chronological fills -> exact integer cash totals and quantity. No invented cost-basis/P&L model. */
export function deriveHolding(inputTrades) {
  if (!Array.isArray(inputTrades)) throw new TypeError('TRADES_ARRAY_REQUIRED');
  let quantity = 0, buyQuantity = 0, sellQuantity = 0, buyGrossCents = 0, sellGrossCents = 0, feesCents = 0;
  let previousSession = -1, instrumentId = null;
  const ids = new Set();
  for (const trade of inputTrades) {
    if (!trade || typeof trade.id !== 'string' || !trade.id || ids.has(trade.id)) throw new Error('UNIQUE_TRADE_ID_REQUIRED');
    ids.add(trade.id);
    if (typeof trade.instrumentId !== 'string' || !trade.instrumentId) throw new Error('TRADE_INSTRUMENT_REQUIRED');
    if (instrumentId !== null && trade.instrumentId !== instrumentId) throw new Error('MIXED_INSTRUMENT_HOLDING');
    instrumentId = trade.instrumentId;
    integer(trade.sessionIndex, 'TRADE_SESSION');
    if (trade.sessionIndex < previousSession) throw new Error('TRADES_NOT_CHRONOLOGICAL');
    previousSession = trade.sessionIndex;
    integer(trade.quantity, 'TRADE_QUANTITY', {min: 1});
    integer(trade.priceCents, 'TRADE_PRICE', {min: 1});
    integer(trade.feeCents, 'TRADE_FEE');
    if (trade.side !== 'buy' && trade.side !== 'sell') throw new Error('TRADE_SIDE_REQUIRED');
    const gross = trade.quantity * trade.priceCents;
    if (!Number.isSafeInteger(gross)) throw new RangeError('TRADE_GROSS_OVERFLOW');
    if (trade.side === 'buy') {
      quantity = exactSum(quantity, trade.quantity, 'QUANTITY');
      buyQuantity = exactSum(buyQuantity, trade.quantity, 'BUY_QUANTITY');
      buyGrossCents = exactSum(buyGrossCents, gross, 'BUY_GROSS');
    } else {
      if (trade.quantity > quantity) throw new RangeError('NEGATIVE_HOLDING_NOT_ALLOWED');
      quantity -= trade.quantity;
      sellQuantity = exactSum(sellQuantity, trade.quantity, 'SELL_QUANTITY');
      sellGrossCents = exactSum(sellGrossCents, gross, 'SELL_GROSS');
    }
    feesCents = exactSum(feesCents, trade.feeCents, 'FEES');
  }
  const netCashFlowCents = exactSum(exactSum(sellGrossCents, -buyGrossCents, 'NET_CASH_FLOW'), -feesCents, 'NET_CASH_FLOW');
  return Object.freeze({instrumentId, quantity, buyQuantity, sellQuantity, buyGrossCents, sellGrossCents,
    feesCents, netCashFlowCents, tradeIds: Object.freeze(inputTrades.map(trade => trade.id))});
}

/** Window indexes address immutable synthetic sessions, not calendar-day offsets. */
export function windowCandles(start, count) {
  integer(start, 'WINDOW_START');
  integer(count, 'WINDOW_COUNT', {min: 1});
  return Object.freeze(demoMarket.candles.slice(start, start + count));
}
