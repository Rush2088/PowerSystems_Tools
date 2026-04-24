// =============================================================================
//  Transformer R & X Calculator  — pure calculation engine (no React)
//  Derives series resistance and reactance from FAT (Factory Acceptance Test)
//  nameplate data and short-circuit (load loss) test results.
//
//  Algorithm:
//    Z_pu  = Z% / 100
//    R_pu  = P_load(W) / S(VA)          — from copper / load losses
//    X_pu  = sqrt(Z_pu² − R_pu²)
//    Z_base_HV = V_HV(kV)² / S(MVA)    — base impedance in Ω (HV side)
//    Z_base_LV = V_LV(kV)² / S(MVA)    — base impedance in Ω (LV side)
//    R_HV = R_pu × Z_base_HV  (Ω)
//    X_HV = X_pu × Z_base_HV  (Ω)
//    R_LV = R_pu × Z_base_LV  (mΩ)
//    X_LV = X_pu × Z_base_LV  (mΩ)
// =============================================================================

// All DEFAULT_VALUES are strings — HTML inputs always return strings.
export const DEFAULT_VALUES = {
  vHV:    '33',    // HV winding voltage   [kV]
  vLV:    '0.40',  // LV winding voltage   [kV]
  sMVA:   '0.5',   // Rated apparent power [MVA]
  zPct:   '6',     // Nameplate impedance  [%]
  pLoadKW: '3',    // Load (copper) losses [kW]  — from FAT short-circuit test
};

/**
 * Validates raw string inputs and returns parsed numeric values.
 * @param {object} values — string values from state
 * @returns {{ valid: boolean, message: string, parsed: object }}
 */
export function validateInputs(values) {
  const parsed = {
    vHV:    Number(values.vHV),
    vLV:    Number(values.vLV),
    sMVA:   Number(values.sMVA),
    zPct:   Number(values.zPct),
    pLoadKW: Number(values.pLoadKW),
  };

  // All must be finite and positive
  for (const [key, val] of Object.entries(parsed)) {
    if (!Number.isFinite(val) || val <= 0) {
      return { valid: false, message: `Enter a valid positive value for all fields.`, parsed };
    }
  }

  // HV must be greater than LV
  if (parsed.vHV <= parsed.vLV) {
    return { valid: false, message: 'HV voltage must be greater than LV voltage.', parsed };
  }

  // Z% must be between 0.1 and 25 (realistic transformer range)
  if (parsed.zPct < 0.1 || parsed.zPct > 25) {
    return { valid: false, message: 'Impedance Z% must be between 0.1 % and 25 %.', parsed };
  }

  // Per-unit R must be less than per-unit Z (R < Z, otherwise X would be imaginary)
  const zPu = parsed.zPct / 100;
  const rPu = (parsed.pLoadKW * 1e3) / (parsed.sMVA * 1e6);
  if (rPu >= zPu) {
    return {
      valid: false,
      message: `Load losses imply R_pu (${(rPu * 100).toFixed(3)} %) ≥ Z% (${parsed.zPct} %). Check loss data.`,
      parsed,
    };
  }

  return { valid: true, message: '', parsed };
}

/**
 * Main calculation — receives parsed (numeric) values from validateInputs.
 * @param {object} p — parsed numeric values
 * @returns {object} — all results
 */
export function calculateTransformerRX(p) {
  const { vHV, vLV, sMVA, zPct, pLoadKW } = p;

  // ── Per-unit values ─────────────────────────────────────────────────────
  const zPu = zPct / 100;
  const rPu = (pLoadKW * 1e3) / (sMVA * 1e6);          // R = P_load / S
  const xPu = Math.sqrt(zPu ** 2 - rPu ** 2);           // X = √(Z²−R²)

  // ── Base impedances (Ω) ─────────────────────────────────────────────────
  // Z_base = V(kV)² / S(MVA)   →  (kV² / MVA) = Ω
  const zBaseHV = (vHV ** 2) / sMVA;
  const zBaseLV = (vLV ** 2) / sMVA;

  // ── Ohmic values — HV side (Ω) ─────────────────────────────────────────
  const rHV = rPu * zBaseHV;
  const xHV = xPu * zBaseHV;
  const zHV = zPu * zBaseHV;

  // ── Ohmic values — LV side (mΩ) ────────────────────────────────────────
  const rLV_mOhm = rPu * zBaseLV * 1e3;
  const xLV_mOhm = xPu * zBaseLV * 1e3;
  const zLV_mOhm = zPu * zBaseLV * 1e3;

  // ── Derived metrics ─────────────────────────────────────────────────────
  const xrRatio   = xPu / rPu;
  const scPF      = rPu / zPu;                          // power factor at short-circuit
  const turnsRatio = vHV / vLV;

  // ── Rated currents (3-phase, A) ─────────────────────────────────────────
  const iRatedHV = (sMVA * 1e6) / (Math.sqrt(3) * vHV * 1e3);
  const iRatedLV = (sMVA * 1e6) / (Math.sqrt(3) * vLV * 1e3);

  return {
    // per-unit
    zPu, rPu, xPu,
    // HV side Ω
    zBaseHV, rHV, xHV, zHV,
    // LV side mΩ
    zBaseLV, rLV_mOhm, xLV_mOhm, zLV_mOhm,
    // metrics
    xrRatio, scPF, turnsRatio,
    // currents
    iRatedHV, iRatedLV,
  };
}
