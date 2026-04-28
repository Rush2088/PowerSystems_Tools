// IEC 60909-0:2016 cl.6.3.3 — Transformer K_T factor
// K_T = 0.95 · c_max / (1 + 0.6 · x_T)
// where x_T = X_T (pu), derived from Z_T% and X/R ratio

export const DEFAULT_MAIN = {
  mva: '120',
  hv:  '330',
  lv:  '33',
  zt:  '12',
  xr:  '35',
  c:   '1.10',
};

export const DEFAULT_SUT = {
  mva: '7',
  hv:  '33',
  lv:  '0.69',
  zt:  '7',
  xr:  '6',
  c:   '1.10',
};

export function validateTx(values) {
  const p = {
    mva: Number(values.mva),
    hv:  Number(values.hv),
    lv:  Number(values.lv),
    zt:  Number(values.zt),
    xr:  Number(values.xr),
    c:   Number(values.c),
  };
  const ok = Object.values(p).every(v => Number.isFinite(v) && v > 0);
  if (!ok) return { valid: false, message: 'Enter valid positive values.', parsed: p };
  if (p.zt <= 0 || p.zt > 99)   return { valid: false, message: 'Z_T must be 0–99%.', parsed: p };
  if (p.xr < 1)                  return { valid: false, message: 'X/R must be ≥ 1.', parsed: p };
  if (p.c < 0.9 || p.c > 1.15)  return { valid: false, message: 'c must be 0.90–1.15.', parsed: p };
  return { valid: true, message: '', parsed: p };
}

/**
 * @param {object} p  - parsed numeric values from validateTx
 * @returns {{kt, rt, xt, zLV_ohm, zCorr_ohm}}
 */
export function calculateKT(p) {
  const zt  = p.zt / 100;                           // pu
  const rt  = zt / Math.sqrt(1 + p.xr * p.xr);     // R_T pu
  const xt  = p.xr * rt;                            // X_T pu  (= x_T in Eq.12)
  const kt  = (0.95 * p.c) / (1 + 0.6 * xt);       // Eq.12
  const zBase     = (p.lv * p.lv) / p.mva;          // Ω on LV base
  const zLV_ohm   = zt * zBase;
  const zCorr_ohm = kt * zLV_ohm;
  return { kt, rt, xt, zLV_ohm, zCorr_ohm };
}

/**
 * Build sweep data for K_T vs Z_T%
 * @param {object} p  - parsed values
 * @param {number} n  - number of points
 * @returns {Array<{x, y}>}
 */
export function sweepZ(p, n = 120) {
  const zLo = p.zt * 0.8;
  const zHi = p.zt * 1.2;
  return Array.from({ length: n }, (_, i) => {
    const ztPct = zLo + (i / (n - 1)) * (zHi - zLo);
    const { kt } = calculateKT({ ...p, zt: ztPct });
    return { x: ztPct, y: kt };
  });
}

/**
 * Build sweep data for K_T vs c factor
 * @param {object} p  - parsed values
 * @param {number} n  - number of points
 * @returns {Array<{x, y}>}
 */
export function sweepC(p, n = 120) {
  return Array.from({ length: n }, (_, i) => {
    const cv = 0.90 + (i / (n - 1)) * 0.25;
    const { kt } = calculateKT({ ...p, c: cv });
    return { x: cv, y: kt };
  });
}

export function fmtOhm(v) {
  if (v >= 10)    return v.toFixed(3) + ' Ω';
  if (v >= 1)     return v.toFixed(4) + ' Ω';
  if (v >= 0.001) return v.toFixed(5) + ' Ω';
  return v.toExponential(3) + ' Ω';
}
