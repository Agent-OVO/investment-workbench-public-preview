// Numerical geometry only. Mesh thickness, lighting and camera do not enter these transforms.
const finite = (value, label) => {
  if (!Number.isFinite(value)) throw new RangeError(label + '_MUST_BE_FINITE');
  return value;
};
const integer = (value, label, min = 0) => {
  if (!Number.isSafeInteger(value) || value < min) throw new RangeError(label + '_MUST_BE_SAFE_INTEGER');
  return value;
};
const ticks = (min, max, count = 5) => min === max ? [min] : [...new Set(Array.from({length: count}, (_, index) =>
  index === 0 ? min : index === count - 1 ? max : Math.round(min + (max - min) * index / (count - 1))))];

export function buildFinanceGeometry(candles, {width = 100, priceHeight = 38, volumeHeight = 11, gap = 6} = {}) {
  if (!Array.isArray(candles) || !candles.length) throw new RangeError('NONEMPTY_CANDLE_WINDOW_REQUIRED');
  for (const [key, value] of Object.entries({width, priceHeight, volumeHeight})) {
    finite(value, key.toUpperCase());
    if (value <= 0) throw new RangeError(key.toUpperCase() + '_MUST_BE_POSITIVE');
  }
  finite(gap, 'GAP');
  if (gap < 0) throw new RangeError('GAP_MUST_BE_NONNEGATIVE');
  const ids = new Set();
  let priorIndex = -1, priorDate = '', instrumentId = null;
  for (const candle of candles) {
    if (!candle || typeof candle.id !== 'string' || !candle.id || ids.has(candle.id)) throw new Error('UNIQUE_BAR_ID_REQUIRED');
    ids.add(candle.id);
    if (typeof candle.instrumentId !== 'string' || !candle.instrumentId) throw new Error('BAR_INSTRUMENT_REQUIRED');
    if (instrumentId !== null && candle.instrumentId !== instrumentId) throw new Error('MIXED_INSTRUMENT_CHART');
    instrumentId = candle.instrumentId;
    integer(candle.sessionIndex, 'SESSION_INDEX');
    if (candle.sessionIndex <= priorIndex) throw new Error('BARS_NOT_IN_SESSION_ORDER');
    priorIndex = candle.sessionIndex;
    if (typeof candle.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(candle.date) || candle.date <= priorDate ||
        !Number.isFinite(Date.parse(candle.date + 'T00:00:00.000Z')) || new Date(candle.date + 'T00:00:00.000Z').toISOString().slice(0, 10) !== candle.date) throw new Error('VALID_INCREASING_BAR_DATES_REQUIRED');
    priorDate = candle.date;
    for (const field of ['openCents', 'highCents', 'lowCents', 'closeCents']) integer(candle[field], field.toUpperCase(), Number.MIN_SAFE_INTEGER);
    integer(candle.volume, 'VOLUME');
    if (candle.lowCents > Math.min(candle.openCents, candle.closeCents) || candle.highCents < Math.max(candle.openCents, candle.closeCents)) throw new RangeError('OHLC_ORDER_INVALID');
  }
  const minPrice = Math.min(...candles.map(candle => candle.lowCents));
  const maxPrice = Math.max(...candles.map(candle => candle.highCents));
  const span = maxPrice - minPrice;
  if (!Number.isSafeInteger(span)) throw new RangeError('PRICE_DOMAIN_SPAN_OVERFLOW');
  const volumeMax = Math.max(...candles.map(candle => candle.volume));
  const volumeBaseline = -gap - volumeHeight;
  const priceY = cents => {
    integer(cents, 'PRICE_CENTS', Number.MIN_SAFE_INTEGER);
    if (!span) {
      if (cents !== minPrice) throw new RangeError('PRICE_OUTSIDE_CONSTANT_DOMAIN');
      return priceHeight / 2;
    }
    return (cents - minPrice) / span * priceHeight;
  };
  const priceFromY = y => {finite(y, 'PRICE_Y');return !span ? minPrice : minPrice + y / priceHeight * span;};
  const volumeY = volume => {
    integer(volume, 'VOLUME');
    if (!volumeMax) {
      if (volume !== 0) throw new RangeError('VOLUME_OUTSIDE_ZERO_DOMAIN');
      return volumeBaseline;
    }
    return volumeBaseline + volume / volumeMax * volumeHeight;
  };
  const volumeFromY = y => {finite(y, 'VOLUME_Y');return !volumeMax ? 0 : (y - volumeBaseline) / volumeHeight * volumeMax;};
  const slotWidth = width / candles.length;
  const rows = candles.map((candle, index) => {
    const openY = priceY(candle.openCents), closeY = priceY(candle.closeCents);
    return Object.freeze({id: candle.id, barId: candle.id, instrumentId: candle.instrumentId,
      date: candle.date, sessionIndex: candle.sessionIndex, x: (index + .5) * slotWidth,
      openY, closeY, highY: priceY(candle.highCents), lowY: priceY(candle.lowCents),
      bodyBottom: Math.min(openY, closeY), bodyTop: Math.max(openY, closeY),
      volumeY: volumeY(candle.volume), volumeBaseline, bodyWidth: slotWidth * .62,
      direction: candle.closeCents > candle.openCents ? 'up' : candle.closeCents < candle.openCents ? 'down' : 'unchanged'});
  });
  return Object.freeze({priceDomain: Object.freeze([minPrice, maxPrice]), volumeMax, width, priceHeight, volumeHeight, gap,
    slotWidth, volumeBaseline, rows: Object.freeze(rows),
    priceTicks: Object.freeze(ticks(minPrice, maxPrice).map(valueCents => Object.freeze({valueCents, y: priceY(valueCents)}))),
    volumeTicks: Object.freeze(ticks(0, volumeMax, 3).map(value => Object.freeze({value, y: volumeY(value)}))),
    priceY, priceFromY, volumeY, volumeFromY});
}
