/**
 * Protection Coordination — Curve Calculation Engine
 * IEC / ANSI / IEEE overcurrent relay TCC curves + transformer I²t
 */

// ── Curve coefficient tables ──────────────────────────────────────────────────
export const CC = {
  "IEC SI":   { k: 0,       b: 0.14,    a: 0.02,  i2t: 1 },
  "IEC VI":   { k: 0,       b: 13.5,    a: 1,     i2t: 1 },
  "IEC EI":   { k: 0,       b: 80,      a: 2,     i2t: 1 },
  "IEC LI":   { k: 0,       b: 120,     a: 1,     i2t: 1 },
  "IEC STI":  { k: 0,       b: 0.05,    a: 0.04,  i2t: 1 },
  "ANSI MI":  { k: 0.0226,  b: 0.014,   a: 0.02,  i2t: 1 },
  "ANSI I":   { k: 0.18,    b: 5.95,    a: 2,     i2t: 1 },
  "ANSI VI":  { k: 0.0963,  b: 3.88,    a: 2,     i2t: 1 },
  "ANSI EI":  { k: 0.0252,  b: 5.67,    a: 2,     i2t: 1 },
  "ANSI STI": { k: 0.00262, b: 0.00342, a: 0.02,  i2t: 1 },
  "IEEE EI":  { k: 0.1217,  b: 28.2,    a: 2,     i2t: 1 },
  "IEEE VI":  { k: 0.491,   b: 19.61,   a: 2,     i2t: 1 },
  "IEEE MI":  { k: 0.114,   b: 0.0515,  a: 0.02,  i2t: 1 },
  "GE I2t":   { k: 0,       b: 100,     a: 2,     i2t: 0 },
};

export const CURVE_TYPES = [...Object.keys(CC), "DT"];

export const DEF_COLORS = [
  'rgba(96,165,250,0.7)',   // pastel blue-400
  'rgba(248,113,113,0.7)', // pastel red-400
  'rgba(52,211,153,0.7)',  // pastel emerald-400
  'rgba(251,146,60,0.7)',  // pastel orange-400
  'rgba(196,181,253,0.7)', // pastel violet-300
  'rgba(45,212,191,0.7)',  // pastel teal-400
];

// ── Math helpers ──────────────────────────────────────────────────────────────

export const logSpace = (lo, hi, n) => {
  const a = Math.log10(lo), b = Math.log10(hi);
  return Array.from({ length: n }, (_, i) => 10 ** (a + (b - a) * i / (n - 1)));
};

export function tripTime(I_A, Ip_A, tms, type) {
  if (I_A <= Ip_A) return null;
  if (type === "DT") return tms > 0 ? tms : null;
  const c = CC[type];
  if (!c) return null;
  const den = (I_A / Ip_A) ** c.a - c.i2t;
  if (den <= 0) return null;
  const t = tms * (c.b / den + c.k);
  return t > 0 ? t : null;
}

export function curveT(I_ref_kA, crv, refV) {
  const I_dev = I_ref_kA * refV / crv.voltage * 1000;
  let t = tripTime(I_dev, crv.pickup, crv.tms, crv.curveType);
  if (crv.hs2on && I_dev >= crv.hs2A) t = crv.hs2t || 0.02;
  else if (crv.hs1on && I_dev >= crv.hs1A) t = crv.hs1t || 0.02;
  return t;
}

export function xfmrT(I_ref_kA, xf, refV) {
  const K = xf.Isc ** 2 * xf.dur;
  const I_dev = I_ref_kA * refV / xf.voltage * 1000;
  const t = K / I_dev ** 2;
  return (t > 0 && isFinite(t)) ? t : null;
}

/**
 * Transformer category per IEEE C57.12.00 (three-phase MVA rating).
 * Category I  : ≤ 0.5 MVA  — single curve only, no dog-leg
 * Category II : 0.5–5 MVA  — dog-leg applies
 * Category III: 5–30 MVA   — dog-leg applies
 * Category IV : > 30 MVA   — dog-leg applies
 */
export function txCategory(sMVA) {
  if (sMVA <= 0.5) return 'I';
  if (sMVA <= 5)   return 'II';
  if (sMVA <= 30)  return 'III';
  return 'IV';
}

/**
 * Frequent-fault mechanical damage curve per IEEE C57.12.00 (Categories II–IV).
 *
 * The curve has THREE distinct segments on a log-log TCC chart:
 *
 *  Segment 1 — Lower diagonal (I ≤ I_brk):
 *    t = K1 / I²   same slope and same line as the infrequent thermal curve
 *
 *  Segment 2 — Near-vertical drop at I = I_brk:
 *    Time drops abruptly from K1/I_brk² to K2/I_brk² at constant current.
 *    With 300 log-spaced data points the two adjacent values either side of I_brk
 *    produce a near-vertical line segment on the chart — this is the dog-leg elbow.
 *
 *  Segment 3 — Upper (more restrictive) diagonal (I > I_brk):
 *    t = K2 / I²   parallel to Segment 1 but shifted down by K2 = K1 / 4
 *    At Isc_max with dur = 2 s  →  t = dur / 4 = 0.5 s  (4× more restrictive)
 *
 *  Breakpoint: I_brk = 50 % of Isc_max (where the vertical step occurs).
 *
 * The curve is capped at Isc_max — no fault can exceed the bolted short-circuit level.
 */
export function xfmrTFrequent(I_ref_kA, xf, refV) {
  const I_dev = I_ref_kA * refV / xf.voltage * 1000; // amps at xfmr voltage
  const { Isc, dur } = xf;
  if (I_dev <= 0 || I_dev > Isc) return null;         // beyond Isc_max
  const K1    = Isc ** 2 * dur;                        // thermal K (same as infrequent)
  const K2    = K1 / 4;                                // frequent-fault K (4× restrictive)
  const I_brk = 0.5 * Isc;                             // dog-leg breakpoint at 50% Isc_max
  // Segment 1 (I ≤ breakpoint): same as thermal → overlaps the infrequent curve here
  // Segment 2 (at breakpoint): the abrupt K1→K2 step creates the near-vertical dog-leg
  // Segment 3 (I > breakpoint): parallel diagonal, shifted down
  const t = I_dev <= I_brk
    ? K1 / I_dev ** 2    // Segment 1
    : K2 / I_dev ** 2;   // Segment 3
  return (t > 0 && isFinite(t)) ? t : null;
}

export function minorTks(maj) {
  const out = [];
  for (let i = 0; i < maj.length - 1; i++) {
    if (Math.abs(maj[i + 1] / maj[i] - 10) < 0.1)
      for (let j = 2; j <= 9; j++) out.push(maj[i] * j);
  }
  return out;
}

// ── Default state ─────────────────────────────────────────────────────────────

export const mkCrv = (i, overrides = {}) => ({
  enabled: i < 2,
  label: `Curve ${i + 1}`,
  color: DEF_COLORS[i],
  voltage: 33,
  pickup: 400,
  tms: 0.1,
  curveType: "IEC SI",
  hs1on: false, hs1A: 5000, hs1t: 0,
  hs2on: false, hs2A: 10000, hs2t: 0,
  ...overrides,
});

export const INIT_CURVES = [
  mkCrv(0, { label: "33kV Feeder 1", voltage: 33,  pickup: 750, tms: 0.07, curveType: "IEC SI", hs1on: true, hs1A: 5000, hs1t: 0.1 }),
  mkCrv(1, { label: "11kV Feeder",   voltage: 11,  pickup: 300, tms: 0.2,  curveType: "IEC VI", hs1on: true, hs1A: 3000, hs1t: 0 }),
  mkCrv(2, { label: "0.4kV Board",   voltage: 0.4, pickup: 600, tms: 0.4,  curveType: "IEC EI" }),
  mkCrv(3), mkCrv(4), mkCrv(5),
];

export const INIT_FAULTS = [
  { en: true, label: "Max 3ph fault",  I: 10,  V: 33 },
  { en: true, label: "Min fault 11kV", I: 2.5, V: 11 },
];

export const INIT_XFMR = {
  en: true, label: "Tx I²t", voltage: 11, Isc: 500, dur: 2,
  sMVA: 5,            // transformer MVA rating — used to determine IEEE C57.12.00 category
  showFrequent: true, // show frequent-fault mechanical damage curve (dog-leg)
};

export const INIT_PLOT = { refV: 33, Ilo: 0.01, Ihi: 50, tlo: 0.05, thi: 100, tlim: 100 };
