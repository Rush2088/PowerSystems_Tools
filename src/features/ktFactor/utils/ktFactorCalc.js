// IEC 60909-0:2016 cl.6.3.3 — Transformer K_T factor
// K_T = 0.95 · c_max / (1 + 0.6 · x_T)
// where x_T = X_T (pu), derived from Z_T% and X/R ratio

export const DEFAULT_MAIN = {
  mva:    '120',
  hv:     '330',
  lv:     '33',
  zt:     '12',
  xr:     '35',
  c:      '1.10',
  gridKA: '50',
};

export function validateTx(values) {
  const p = {
    mva:    Number(values.mva),
    hv:     Number(values.hv),
    lv:     Number(values.lv),
    zt:     Number(values.zt),
    xr:     Number(values.xr),
    c:      Number(values.c),
    gridKA: Number(values.gridKA),
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
  const zLo = 4;
  const zHi = 20;
  return Array.from({ length: n }, (_, i) => {
    const ztPct = zLo + (i / (n - 1)) * (zHi - zLo);
    const { kt } = calculateKT({ ...p, zt: ztPct });
    return { x: ztPct, y: kt };
  });
}

// ── Total fault current at the LV bus, for a given ZT% override ────────────
// Reuses this page's own X/R-derived x_T (more precise than the Z%-only
// approximation), on the same 100 MVA study base as the fault-calc feature.
const S_BASE = 100e6;

function faultCurrentAt(p, ztPct, considerKFactor, assumeGridZ0) {
  const ztPu = ztPct / 100;
  const rt = ztPu / Math.sqrt(1 + p.xr * p.xr);
  const xt = p.xr * rt;
  const kt = considerKFactor ? (0.95 * p.c) / (1 + 0.6 * xt) : 1;

  const zTxOwnbase = ztPu * (S_BASE / (p.mva * 1e6));
  const zTx = kt * zTxOwnbase;

  let zGrid = 0;
  if (!assumeGridZ0) {
    const iHvBase = S_BASE / (Math.sqrt(3) * p.hv * 1e3);
    const ifPu = (p.gridKA * 1e3) / iHvBase;
    zGrid = p.c / ifPu;
  }

  const zTot = zTx + zGrid;
  const iLvBase = S_BASE / (Math.sqrt(3) * p.lv * 1e3);
  const ifPu = p.c / zTot;
  return (ifPu * iLvBase) / 1000; // kA
}

/**
 * Build sweep data for Fault Current vs ZT%, three series:
 *  - withKt     : K_T correction applied, real (finite) grid impedance
 *  - withoutKt  : no K_T correction, real (finite) grid impedance
 *  - infGridKt  : K_T correction applied, grid impedance = 0 (infinite grid strength)
 * @param {object} p  - parsed values (includes gridKA)
 * @param {number} n  - number of points
 * @returns {Array<{x, withKt, withoutKt, infGridKt}>}
 */
export function sweepFaultCurrent(p, n = 33) {
  const zLo = 4;
  const zHi = 20;
  return Array.from({ length: n }, (_, i) => {
    const ztPct = zLo + (i / (n - 1)) * (zHi - zLo);
    return {
      x: ztPct,
      withKt: faultCurrentAt(p, ztPct, true, false),
      withoutKt: faultCurrentAt(p, ztPct, false, false),
      infGridKt: faultCurrentAt(p, ztPct, true, true),
    };
  });
}

export function fmtOhm(v) {
  if (v >= 10)    return v.toFixed(3) + ' Ω';
  if (v >= 1)     return v.toFixed(4) + ' Ω';
  if (v >= 0.001) return v.toFixed(5) + ' Ω';
  return v.toExponential(3) + ' Ω';
}
