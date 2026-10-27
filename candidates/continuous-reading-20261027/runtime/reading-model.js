import {rows, groupDelta, repair, pct} from './core.js';

// Keep the original disclosed-row order and row identities. A missing cost is
// still unknown: it is never filled with zero or inferred from a residual.
export const knownProducts = Object.freeze(rows.filter(row => row.delta !== null));
export const unknownProducts = Object.freeze(rows.filter(row => row.delta === null));

const positive = knownProducts.reduce((sum, row) => sum + (row.delta > 0n ? row.delta : 0n), 0n);
const negative = knownProducts.reduce((sum, row) => sum + (row.delta < 0n ? row.delta : 0n), 0n);
const net = positive + negative;

// All amounts are exact integer cents. The eight known product categories and
// consolidated group are distinct scopes; this is not a complete group bridge.
// `unreconciled` is their arithmetic difference only, NOT the gross profit of
// other-business, a missing cost, or an attribution to any undisclosed activity.
export const readingTotals = Object.freeze({
  positive,
  negative,
  net,
  groupDelta,
  unreconciled: groupDelta - net
});

// A scale comparison to the absolute consolidated net decline, not a share of
// revenue, net cash, or an assertion that product categories are business units.
export const repairScaleRatio = pct(repair.delta, groupDelta < 0n ? -groupDelta : groupDelta);
