// ─── 3-Winding Transformer — Z & Load Loss Breakdown ─────────────────────────
//
// Uses the star (T) equivalent circuit to split the measured winding-pair
// impedances (HV-LV1, HV-LV2, LV1-LV2) into per-winding star legs, then
// allocates the measured total load loss proportionally.
//
// Convention:
//   HV  = high-voltage winding
//   LV1 = first LV winding  (tap 1)
//   LV2 = second LV winding (tap 2)
//
//   Test condition: HV loaded at 2 x LV MVA base, each LV at 1 x LV MVA base.
//   Therefore: P_total = 4*P_H + P_L1 + P_L2  (loss ~ I^2 ~ pu^2)

export const DEFAULT_VALUES = {
  mvaBase: '175',
  zHL1:    '17.10',
  zHL2:    '17.10',
  zL1L2:   '35.57',
  pTotal:  '1185',
};

export function validateInputs(values) {
  const parsed = {
    mvaBase: Number(values.mvaBase),
    zHL1:    Number(values.zHL1),
    zHL2:    Number(values.zHL2),
    zL1L2:   Number(values.zL1L2),
    pTotal:  Number(values.pTotal),
  };

  const allFinite = Object.values(parsed).every(v => Number.isFinite(v) && v > 0);
  if (!allFinite) {
    return { valid: false, message: 'All fields must be positive numeric values.', parsed };
  }

  const Z_L1 = (parsed.zHL1 + parsed.zL1L2 - parsed.zHL2) / 2;
  const Z_L2 = (parsed.zHL2 + parsed.zL1L2 - parsed.zHL1) / 2;
  if (Z_L1 <= 0 || Z_L2 <= 0) {
    return {
      valid: false,
      message: 'Star equivalent LV impedances must be positive. Check that Z_LV1-LV2 < Z_HV-LV1 + Z_HV-LV2.',
      parsed,
    };
  }

  return { valid: true, message: '', parsed };
}

export function calculateTxLoss({ zHL1, zHL2, zL1L2, pTotal }) {
  const Z_H  = (zHL1 + zHL2  - zL1L2) / 2;
  const Z_L1 = (zHL1 + zL1L2 - zHL2)  / 2;
  const Z_L2 = (zHL2 + zL1L2 - zHL1)  / 2;

  const a = Z_H / Z_L1;
  const b = Z_H / Z_L2;

  const P_L1 = pTotal / (4 * a + 1 + a / b);
  const P_L2 = (a / b) * P_L1;
  const P_H  = a * P_L1;

  const P_HL1  = P_H + P_L1;
  const P_HL2  = P_H + P_L2;
  const P_L1L2 = P_L1 + P_L2;

  const P_check = 4 * P_H + P_L1 + P_L2;
  const verified = Math.abs(P_check - pTotal) < 0.5;

  // Z equivalent seen from HV with both LV windings in parallel
  // Z_eq (on LV MVA base) = Z_H + Z_L1||Z_L2
  // Convert to HV MVA base: divide by 2  (S_HV = 2 x S_LV)
  const Z_L_parallel = (Z_L1 * Z_L2) / (Z_L1 + Z_L2);
  const Z_eq_LV = Z_H + Z_L_parallel;
  const Z_eq_HV = Z_eq_LV / 2;

  return { Z_H, Z_L1, Z_L2, P_H, P_L1, P_L2, P_HL1, P_HL2, P_L1L2, P_check, verified, Z_L_parallel, Z_eq_LV, Z_eq_HV };
}
