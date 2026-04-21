export const HV_VOLTAGE_OPTIONS = [
  {value: '500', label: '500'},
  {value: '330', label: '330'},
  {value: '275', label: '275'},
  {value: '220', label: '220'},
  {value: '132', label: '132'},
  {value: '66', label: '66'},
  {value: '33', label: '33'},
  {value: '11', label: '11'},
];

export const LV_VOLTAGE_OPTIONS = [
  {value: '132', label: '132'},
  {value: '66', label: '66'},
  {value: '33', label: '33'},
  {value: '11', label: '11'},
  {value: '0.77', label: '0.770'},
  {value: '0.69', label: '0.690'},
  {value: '0.66', label: '0.660'},
  {value: '0.415', label: '0.415'},
  {value: '0.4', label: '0.400'},
];

export const C_FACTOR_OPTIONS = [
  {value: '0.9', label: '0.9'},
  {value: '0.95', label: '0.95'},
  {value: '1.0', label: '1.0'},
  {value: '1.1', label: '1.1'},
];

export const DEFAULT_VALUES = {
  gridKA: '50',
  hvKV: '330',
  lvKV: '33',
  txMVA: '180',
  txZ: '14.5',
  cFactor: '1.1',
  considerKFactor: false,
  addInverterContribution: false,
  inverterMVA: '2.4',
  inverterCount: '30',
  inverterMaxCurrentFactor: '1.2',
};

export function inverterContribution(S, V, num, maxI) {
  return num * S / (Math.sqrt(3) * V) * maxI;
}

export function calculateFaultLevel(
    gridKA, hvKV, lvKV, txMVA, txZ, cFactor = 1.1, considerKFactor = false,
    addInverterContribution = false, inverterMVA = 0, inverterCount = 0,
    inverterMaxCurrentFactor = 0) {
  const Sbase = 100e6;

  const I_HVbase = Sbase / (Math.sqrt(3) * hvKV * 1e3);
  const If_PU = (gridKA * 1e3) / I_HVbase;
  const Z_grid_pu = cFactor / If_PU;

  const Z_TX_pu_uncorrected = (txZ * 0.01 / txMVA) * 100;

  const xT = txZ / 100;
  const K_T = (0.95 * cFactor) / (1 + 0.6 * xT);
  const K_T_applied = considerKFactor ? K_T : 1;

  const Z_TX_pu = K_T_applied * Z_TX_pu_uncorrected;
  const Ztot_pu = Z_TX_pu + Z_grid_pu;

  const I_LVbase = Sbase / (Math.sqrt(3) * lvKV * 1e3);
  const If_pu = cFactor / Ztot_pu;
  const gridContributionKA = Math.round((If_pu * I_LVbase / 1e3) * 100) / 100;

  const inverterContributionKA = addInverterContribution ?
      Math.round(
          inverterContribution(
              inverterMVA,
              lvKV,
              inverterCount,
              inverterMaxCurrentFactor,
              ) *
              100,
          ) /
          100 :
      0;

  const totalFaultCurrentKA =
      Math.round((gridContributionKA + inverterContributionKA) * 100) / 100;

  return {
    I_HVbase,
    If_PU,
    Z_grid_pu,
    I_LVbase,
    K_T,
    K_T_applied,
    Z_TX_pu_uncorrected,
    Z_TX_pu,
    Ztot_pu,
    If_pu,
    IF_max: gridContributionKA,
    gridContributionKA,
    inverterContributionKA,
    totalFaultCurrentKA,
    cFactor,
    considerKFactor,
    addInverterContribution,
    inverterMVA,
    inverterCount,
    inverterMaxCurrentFactor,
    kFactorApplied: considerKFactor,
  };
}

export function validateInputs(values) {
  const parsed = {
    gridKA: Number(values.gridKA),
    hvKV: Number(values.hvKV),
    lvKV: Number(values.lvKV),
    txMVA: Number(values.txMVA),
    txZ: Number(values.txZ),
    cFactor: Number(values.cFactor),
    considerKFactor: Boolean(values.considerKFactor),
    addInverterContribution: Boolean(values.addInverterContribution),
    inverterMVA: Number(values.inverterMVA),
    inverterCount: Number(values.inverterCount),
    inverterMaxCurrentFactor: Number(values.inverterMaxCurrentFactor),
  };

  const baseValid = [
    parsed.gridKA,
    parsed.hvKV,
    parsed.lvKV,
    parsed.txMVA,
    parsed.txZ,
    parsed.cFactor,
  ].every((v) => Number.isFinite(v) && v > 0);

  if (!baseValid) {
    return {
      valid: false,
      message: 'Please enter valid positive values for all base parameters.',
      parsed,
    };
  }

  if (parsed.lvKV >= parsed.hvKV) {
    return {
      valid: false,
      message: 'LV bus voltage should be lower than HV bus voltage.',
      parsed,
    };
  }

  if (parsed.addInverterContribution) {
    const inverterValid = [
      parsed.inverterMVA,
      parsed.inverterCount,
      parsed.inverterMaxCurrentFactor,
    ].every((v) => Number.isFinite(v) && v > 0);

    if (!inverterValid) {
      return {
        valid: false,
        message:
            'Please enter valid positive values for inverter rating, number of inverters, and FRT max current factor.',
        parsed,
      };
    }
  }

  return {valid: true, message: '', parsed};
}