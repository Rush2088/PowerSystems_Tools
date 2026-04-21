export const HV_VOLTAGE_OPTIONS = [
  { value: '500', label: '500' },
  { value: '330', label: '330' },
  { value: '275', label: '275' },
  { value: '220', label: '220' },
  { value: '132', label: '132' },
  { value: '66', label: '66' },
  { value: '33', label: '33' },
  { value: '22', label: '22' },
  { value: '11', label: '11' },
];

export const DEFAULT_VALUES = {
  V_LL_kV: '132',
  I_LLL_kA: '40',
  I_LG_kA: '40',
  XR_LLL: '14',
  XR_LG: '14',
};

function calcRxFromZAndXr(zMag, xrRatio) {
  const R = zMag / Math.sqrt(1 + xrRatio ** 2);
  const X = R * xrRatio;
  return { R, X };
}

export function calculateSequenceImpedance(V_LL_kV, I_LLL_kA, I_LG_kA, XR_LLL, XR_LG) {
  const S_base_MVA = 100.0;
  const V_LL = V_LL_kV * 1e3;
  const S_base = S_base_MVA * 1e6;

  const Z_base_ohm = (V_LL ** 2) / S_base;
  const I_base_A = S_base / (Math.sqrt(3) * V_LL);
  const I_base_kA = I_base_A / 1e3;
  const V_ph_kV = V_LL_kV / Math.sqrt(3);

  const I_LLL_pu = I_LLL_kA / I_base_kA;
  const I_LG_pu = I_LG_kA / I_base_kA;

  const Z1_pu = 1 / I_LLL_pu;
  const { R: R1_pu, X: X1_pu } = calcRxFromZAndXr(Z1_pu, XR_LLL);

  const Z2_pu = Z1_pu;
  const R2_pu = R1_pu;
  const X2_pu = X1_pu;

  const Z_total_LG_pu = 3 / I_LG_pu;
  const Z0_pu = Z_total_LG_pu - Z1_pu - Z2_pu;
  const { R: R0_pu, X: X0_pu } = calcRxFromZAndXr(Z0_pu, XR_LG);

  const Z1_ohm = Z1_pu * Z_base_ohm;
  const R1_ohm = R1_pu * Z_base_ohm;
  const X1_ohm = X1_pu * Z_base_ohm;

  const Z0_ohm = Z0_pu * Z_base_ohm;
  const R0_ohm = R0_pu * Z_base_ohm;
  const X0_ohm = X0_pu * Z_base_ohm;

  const Z1_mag_pu = Math.sqrt(R1_pu ** 2 + X1_pu ** 2);
  const Z1_mag_ohm = Math.sqrt(R1_ohm ** 2 + X1_ohm ** 2);
  const Z0_mag_pu = Math.sqrt(R0_pu ** 2 + X0_pu ** 2);
  const Z0_mag_ohm = Math.sqrt(R0_ohm ** 2 + X0_ohm ** 2);

  return {
    base: {
      V_LL_kV,
      V_ph_kV,
      S_base_MVA,
      I_base_kA,
      Z_base_ohm,
    },
    fault_currents: {
      I_LLL_kA,
      I_LG_kA,
      I_LLL_pu,
      I_LG_pu,
    },
    xr_ratios: {
      XR_LLL,
      XR_LG,
    },
    Z1: {
      pu: { Z: Z1_pu, R: R1_pu, X: X1_pu },
      ohm: { Z: Z1_ohm, R: R1_ohm, X: X1_ohm },
      magnitude: { pu: Z1_mag_pu, ohm: Z1_mag_ohm },
    },
    Z0: {
      pu: { Z: Z0_pu, R: R0_pu, X: X0_pu },
      ohm: { Z: Z0_ohm, R: R0_ohm, X: X0_ohm },
      magnitude: { pu: Z0_mag_pu, ohm: Z0_mag_ohm },
    },
  };
}

export function validateInputs(values) {
  const parsed = {
    V_LL_kV: Number(values.V_LL_kV),
    I_LLL_kA: Number(values.I_LLL_kA),
    I_LG_kA: Number(values.I_LG_kA),
    XR_LLL: Number(values.XR_LLL),
    XR_LG: Number(values.XR_LG),
  };

  const valid = Object.values(parsed).every((v) => Number.isFinite(v) && v > 0);

  if (!valid) {
    return {
      valid: false,
      message: 'Please enter valid positive values for all parameters.',
      parsed,
    };
  }

  return {
    valid: true,
    message: '',
    parsed,
  };
}
