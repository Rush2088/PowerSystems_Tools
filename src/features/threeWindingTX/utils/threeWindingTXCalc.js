/**
 * 3-Winding Transformer — T-Equivalent Star Impedance Calculator
 * All impedances in % on LV winding MVA base.
 *
 * Method 1  Known: X = Z(HV–LV1LV2), Y = Z(HV–LV1), Z = Z(HV–LV2)
 *   Solves quadratic arising from the three pair-impedance equations.
 *   discriminant = (2X)² – 4(XY + XZ – YZ)
 *   HV = (2X – √discriminant) / 2
 *
 * Method 2  Known: X = Z(LV1–LV2), Y = Z(HV–LV1), Z = Z(HV–LV2)
 *   Closed-form: HV = (Y+Z–X)/2, LV1 = (X+Y–Z)/2, LV2 = (X+Z–Y)/2
 *
 * Negative winding impedances are physically valid — no error is raised for them.
 * HV: HV winding   LV1: LV winding 1   LV2: LV winding 2
 */

export const METHODS = [
  {
    id: 'method2',
    label: 'Method 1 — Z(LV1–LV2), Z(HV–LV1), Z(HV–LV2)',
    xLabel: 'Z (LV1 – LV2)',
    xHint: 'Between LV windings, HV open-circuited',
    yLabel: 'Z (HV – LV1)',
    zLabel: 'Z (HV – LV2)',
  },
  {
    id: 'method1',
    label: 'Method 2 — Z(HV–LV1+LV2), Z(HV–LV1), Z(HV–LV2)',
    xLabel: 'Z (HV – LV1+LV2)',
    xHint: 'HV to both LV windings shorted together',
    yLabel: 'Z (HV – LV1)',
    zLabel: 'Z (HV – LV2)',
  },
];

export const DEFAULT_VALUES = {
  method: 'method2',
  X: '10',
  Y: '8',
  Z: '6',
};

export function validateInputs(values) {
  const X = Number(values.X);
  const Y = Number(values.Y);
  const Z = Number(values.Z);
  if (!Number.isFinite(X) || !Number.isFinite(Y) || !Number.isFinite(Z)) {
    return { valid: false, message: 'Enter valid numeric values for all three impedances.', parsed: null };
  }
  return { valid: true, message: '', parsed: { X, Y, Z, method: values.method } };
}

export function calculateThreeWindingTX({ X, Y, Z, method }) {
  let H, L1, L2;

  if (method === 'method1') {
    // Quadratic: H² – X·H + (XY + XZ – YZ)/2... simplified to discriminant form
    const discriminant = (2 * X) ** 2 - 4 * (X * Y + X * Z - Y * Z);
    if (discriminant < 0) {
      return {
        error:
          'No real solution — discriminant is negative. Check that Z(H–L1L2) is consistent with Z(H–L1) and Z(H–L2).',
      };
    }
    // Select the smaller root (engineering convention — minimises H)
    H  = (2 * X - Math.sqrt(discriminant)) / 2;
    L1 = Y - H;
    L2 = Z - H;
  } else {
    // Method 2: closed-form (no quadratic needed)
    H  = (Y + Z - X) / 2;
    L1 = (X + Y - Z) / 2;
    L2 = (X + Z - Y) / 2;
  }

  // Thevenin equivalent seen from HV (LV windings in parallel)
  // Z_eq = Z_H + (Z_L1 · Z_L2) / (Z_L1 + Z_L2)
  let Z_eq = null;
  let eqNote = '';
  const denom = L1 + L2;
  if (Math.abs(denom) < 1e-12) {
    eqNote = 'Z_L1 + Z_L2 ≈ 0 — Z_eq is undefined (parallel combination collapses).';
  } else {
    Z_eq = H + (L1 * L2) / denom;
  }

  const hasNegative = H < 0 || L1 < 0 || L2 < 0;

  return { H, L1, L2, Z_eq, eqNote, hasNegative };
}
