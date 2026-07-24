// ─── 3-Winding TX — T-Equivalent Impedances & Winding Loss Split ─────────────
//
// Combines the equivalent-impedance solver (radio-selectable known measurement)
// with the load-loss breakdown engine.
//
// All impedances in % on LV winding MVA base.
//
// Known-measurement options (radio):
//   'method2' — Z(LV1–LV2) known   → closed-form star split
//               HV = (Y+Z–X)/2, LV1 = (X+Y–Z)/2, LV2 = (X+Z–Y)/2
//   'method1' — Z(HV–LV1+LV2) known → quadratic
//               discriminant = (2X)² – 4(XY + XZ – YZ)
//               HV = (2X – √discriminant)/2
//
// Loss split assumption (FAT test condition):
//   HV loaded at 2 × LV MVA base, each LV at 1 × LV MVA base
//   → P_total = 4·P_H + P_L1 + P_L2   (loss ∝ I² ∝ pu²)
//
// Base conversion: Z%(new) = Z%(old) × (MVA_new / MVA_old); S_HV = 2 × S_LV
// Negative star legs are physically valid for impedance results, but the loss
// split is only computed when all legs are positive.

export const DEFAULT_VALUES = {
  method: 'method2',   // 'method2' = Z(LV1-LV2) known; 'method1' = Z(HV-LV1+LV2) known
  X_lv: '13.39',       // Z(LV1-LV2) — active by default
  X_hv: '3.65',        // Z(HV-LV1+LV2) — greyed out by default
  Y: '7.1',            // Z(HV-LV1)
  Z: '7',              // Z(HV-LV2)
  pTotal: '55',        // total load loss, kW
  mvaBase: '3.65',     // LV winding MVA base (see note 1)
};

export function validateInputs(values) {
  const X = Number(values.X);
  const Y = Number(values.Y);
  const Z = Number(values.Z);
  if (!Number.isFinite(X) || !Number.isFinite(Y) || !Number.isFinite(Z)) {
    return { valid: false, message: 'Enter valid numeric values for all three impedances.', parsed: null };
  }
  // Loss inputs are optional — loss split is skipped when invalid
  const pTotal  = Number(values.pTotal);
  const mvaBase = Number(values.mvaBase);
  return {
    valid: true,
    message: '',
    parsed: {
      X, Y, Z,
      method: values.method,
      pTotal:  Number.isFinite(pTotal)  && pTotal  > 0 ? pTotal  : null,
      mvaBase: Number.isFinite(mvaBase) && mvaBase > 0 ? mvaBase : null,
    },
  };
}

export function calculateThreeWdgTx({ X, Y, Z, method, pTotal, mvaBase }) {
  let H, L1, L2;

  if (method === 'method1') {
    // Z(HV–LV1+LV2) known — quadratic
    const discriminant = (2 * X) ** 2 - 4 * (X * Y + X * Z - Y * Z);
    if (discriminant < 0) {
      return {
        error:
          'No real solution — discriminant is negative. Check that Z(HV–LV1+LV2) is consistent with Z(HV–LV1) and Z(HV–LV2).',
      };
    }
    H  = (2 * X - Math.sqrt(discriminant)) / 2;
    L1 = Y - H;
    L2 = Z - H;
  } else {
    // Z(LV1–LV2) known — closed form
    H  = (Y + Z - X) / 2;
    L1 = (X + Y - Z) / 2;
    L2 = (X + Z - Y) / 2;
  }

  // ── Equivalent impedances ──────────────────────────────────────────────────
  let Z_eq = null;
  let Z_eq_hv = null;
  let eqNote = '';
  const denom = L1 + L2;
  if (Math.abs(denom) < 1e-12) {
    eqNote = 'Z_LV1 + Z_LV2 ≈ 0 — Z_eq is undefined (parallel combination collapses).';
  } else {
    Z_eq = H + (L1 * L2) / denom;      // on LV MVA base
    Z_eq_hv = Z_eq * 2;                // on HV MVA base (S_HV = 2 × S_LV)
  }
  const Z_lv = L1 + L2;                // Z(LV1–LV2) derived
  const hasNegative = H < 0 || L1 < 0 || L2 < 0;

  // ── Loss split (only when all legs positive and pTotal provided) ──────────
  let losses = null;
  if (!hasNegative && H > 0 && L1 > 0 && L2 > 0 && pTotal !== null) {
    const a = H / L1;
    const b = H / L2;
    const P_L1 = pTotal / (4 * a + 1 + a / b);
    const P_L2 = (a / b) * P_L1;
    const P_H  = a * P_L1;
    const P_check  = 4 * P_H + P_L1 + P_L2;
    const verified = Math.abs(P_check - pTotal) < 0.5;
    losses = {
      P_H, P_L1, P_L2,
      P_HL1:  P_H + P_L1,
      P_HL2:  P_H + P_L2,
      P_L1L2: P_L1 + P_L2,
      P_HL12: pTotal,
      P_check, verified,
    };
  }

  return { H, L1, L2, Z_eq, Z_eq_hv, Z_lv, eqNote, hasNegative, losses, mvaBase };
}
