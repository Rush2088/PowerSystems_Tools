/**
 * IEEE 1584-2018 Arc Flash Calculation Engine
 * Verified against Excel template (Excel VBA source cross-checked).
 */

// ── Coefficient Tables ────────────────────────────────────────────────────────

// Table 1 — Eq(1): Intermediate arcing current [k1..k10]
const TABLE1 = {
  VCB: {
    600:   [-0.04287, 1.035, -0.083,  0,           0,          -4.783e-9,  1.962e-6, -0.000229,  0.003141,  1.092 ],
    2700:  [ 0.0065,  1.001, -0.024, -1.557e-12,   4.556e-10, -4.186e-8,  8.346e-7,  5.482e-5, -0.003191,  0.9729],
    14300: [ 0.005795,1.015, -0.011, -1.557e-12,   4.556e-10, -4.186e-8,  8.346e-7,  5.482e-5, -0.003191,  0.9729],
  },
  VCBB: {
    600:   [-0.017432,0.98,  -0.05,   0,           0,          -5.767e-9,  2.524e-6, -0.00034,   0.01187,   1.013 ],
    2700:  [ 0.002823, 0.995,-0.0125, 0,          -9.204e-11,  2.901e-8,  -3.262e-6,  1.569e-4, -0.004003,  0.9825],
    14300: [ 0.014827, 1.01, -0.01,   0,          -9.204e-11,  2.901e-8,  -3.262e-6,  1.569e-4, -0.004003,  0.9825],
  },
  HCB: {
    600:   [ 0.054922, 0.988,-0.11,   0,           0,          -5.382e-9,  2.316e-6, -0.000302,  0.0091,    0.9725],
    2700:  [ 0.001011, 1.003,-0.0249, 0,           0,           4.859e-10,-1.814e-7, -9.128e-6, -0.0007,    0.9881],
    14300: [ 0.008693, 0.999,-0.02,   0,          -5.043e-11,  2.233e-8,  -3.046e-6,  1.16e-4,  -0.001145,  0.9839],
  },
  VOA: {
    600:   [ 0.043785, 1.04, -0.18,   0,           0,          -4.783e-9,  1.962e-6, -0.000229,  0.003141,  1.092 ],
    2700:  [-0.02395,  1.006,-0.0188,-1.557e-12,   4.556e-10, -4.186e-8,  8.346e-7,  5.482e-5, -0.003191,  0.9729],
    14300: [ 0.005371, 1.0102,-0.029,-1.557e-12,   4.556e-10, -4.186e-8,  8.346e-7,  5.482e-5, -0.003191,  0.9729],
  },
  HOA: {
    600:   [ 0.111147, 1.008,-0.24,   0,           0,          -3.895e-9,  1.641e-6, -0.000197,  0.002615,  1.1   ],
    2700:  [ 0.000435, 1.006,-0.038,  0,           0,           7.859e-10,-1.914e-7, -9.128e-6, -0.0007,    0.9981],
    14300: [ 0.000904, 0.999,-0.02,   0,           0,           7.859e-10,-1.914e-7, -9.128e-6, -0.0007,    0.9981],
  },
};

// Table 2 — Eq(2): VarCf [k1..k7]
const TABLE2 = {
  VCB:  [ 0,          -1.4269e-6,  8.3137e-5, -0.0019382, 0.022366, -0.12645, 0.30226],
  VCBB: [ 1.138e-6,  -6.0287e-5,   0.0012758, -0.013778,  0.080217, -0.24066, 0.33524],
  HCB:  [ 0,         -3.097e-6,    1.6405e-4, -0.0033609, 0.033308, -0.16182, 0.34627],
  VOA:  [ 9.5606e-7, -5.1543e-5,   0.0011161, -0.01242,   0.075125, -0.23584, 0.33696],
  HOA:  [ 0,         -3.1555e-6,   1.682e-4,  -0.0034607, 0.034124, -0.1599,  0.34629],
};

// Tables 3/4/5 — Eqs (3)–(10): IE and AFB coefficients [k1..k13]
const TABLE3 = {
  VCB:  [ 0.753364,  0.566,  1.752636,  0,          0,         -4.783e-9,  1.962e-6, -0.000229,  0.003141,  1.092,  0,      -1.598, 0.957 ],
  VCBB: [ 3.068459,  0.26,  -0.098107,  0,          0,         -5.767e-9,  2.524e-6, -0.00034,   0.01187,   1.013, -0.06,   -1.809, 1.19  ],
  HCB:  [ 4.073745,  0.344, -0.370259,  0,          0,         -5.382e-9,  2.316e-6, -0.000302,  0.0091,    0.9725, 0,      -2.03,  1.036 ],
  VOA:  [ 0.679294,  0.746,  1.222636,  0,          0,         -4.783e-9,  1.962e-6, -0.000229,  0.003141,  1.092,  0,      -1.598, 0.997 ],
  HOA:  [ 3.470417,  0.465, -0.261863,  0,          0,         -3.895e-9,  1.641e-6, -0.000197,  0.002615,  1.1,    0,      -1.99,  1.04  ],
};
const TABLE4 = {
  VCB:  [ 2.40021,   0.165,  0.354202, -1.557e-12,  4.556e-10, -4.186e-8,  8.346e-7,  5.482e-5, -0.003191,  0.9729, 0,      -1.569, 0.9778],
  VCBB: [ 3.870592,  0.185, -0.736618,  0,         -9.204e-11,  2.901e-8, -3.262e-6,  1.569e-4, -0.004003,  0.9825, 0,      -1.742, 1.09  ],
  HCB:  [ 3.486391,  0.177, -0.193101,  0,          0,          4.859e-10,-1.814e-7, -9.128e-6, -0.0007,    0.9881, 0.027,  -1.723, 1.055 ],
  VOA:  [ 3.880724,  0.105, -1.906033, -1.557e-12,  4.556e-10, -4.186e-8,  8.346e-7,  5.482e-5, -0.003191,  0.9729, 0,      -1.515, 1.115 ],
  HOA:  [ 3.616266,  0.149, -0.761561,  0,          0,          7.859e-10,-1.914e-7, -9.128e-6, -0.0007,    0.9981, 0,      -1.639, 1.078 ],
};
const TABLE5 = {
  VCB:  [ 3.825917,  0.11,  -0.999749, -1.557e-12,  4.556e-10, -4.186e-8,  8.346e-7,  5.482e-5, -0.003191,  0.9729, 0,      -1.568, 0.99  ],
  VCBB: [ 3.644309,  0.215, -0.585522,  0,         -9.204e-11,  2.901e-8, -3.262e-6,  1.569e-4, -0.004003,  0.9825, 0,      -1.677, 1.06  ],
  HCB:  [ 3.044516,  0.125,  0.245106,  0,         -5.043e-11,  2.233e-8, -3.046e-6,  1.16e-4,  -0.001145,  0.9839, 0,      -1.655, 1.084 ],
  VOA:  [ 3.405454,  0.12,  -0.93245,  -1.557e-12,  4.556e-10, -4.186e-8,  8.346e-7,  5.482e-5, -0.003191,  0.9729, 0,      -1.534, 0.979 ],
  HOA:  [ 2.04049,   0.177,  1.005092,  0,          0,          7.859e-10,-1.914e-7, -9.128e-6, -0.0007,    0.9981,-0.05,   -1.633, 1.151 ],
};

// Table 7 — CF coefficients [b1, b2, b3]
const TABLE7 = {
  Typical: {
    VCB:  [-0.000302,  0.03441, 0.4325],
    VCBB: [-0.0002976, 0.032,   0.479 ],
    HCB:  [-0.0001923, 0.01935, 0.6899],
  },
  Shallow: {
    VCB:  [ 0.002222, -0.02556, 0.6222],
    VCBB: [-0.002778,  0.1194, -0.2778],
    HCB:  [-0.0005556, 0.03722, 0.4778],
  },
};

// ── Exported constants ────────────────────────────────────────────────────────

export const EC_OPTIONS = [
  { value: 'VCB',  label: 'VCB — Vertical conductors in a metal box' },
  { value: 'VCBB', label: 'VCBB — Vertical conductors w/ insulating barrier' },
  { value: 'HCB',  label: 'HCB — Horizontal conductors in a metal box' },
  { value: 'VOA',  label: 'VOA — Vertical conductors in open air' },
  { value: 'HOA',  label: 'HOA — Horizontal conductors in open air' },
];

export const TYPICAL_GAPS = { VCB: 32, VCBB: 32, HCB: 25, VOA: 32, HOA: 25 };

export const DEFAULT_VALUES = {
  ec:          'VCB',
  Voc_V:       '400',
  Ibf_kA:      '10',
  G_mm:        '32',
  D_mm:        '457',
  T_arc_ms:    '200',
  T_arc_min_ms:'200',
  height_mm:   '508',
  width_mm:    '508',
  depth_mm:    '508',
};

// ── Input validation ──────────────────────────────────────────────────────────

export function validateInputs(values) {
  const Voc_V       = parseFloat(values.Voc_V);
  const Ibf_kA      = parseFloat(values.Ibf_kA);
  const G_mm        = parseFloat(values.G_mm);
  const D_mm        = parseFloat(values.D_mm);
  const T_arc_ms    = parseFloat(values.T_arc_ms);
  const T_arc_min_ms= parseFloat(values.T_arc_min_ms);
  const height_mm   = parseFloat(values.height_mm);
  const width_mm    = parseFloat(values.width_mm);
  const depth_mm    = parseFloat(values.depth_mm);

  if (!values.ec) return { valid: false, message: 'Select an electrode configuration.' };
  if (isNaN(Voc_V) || Voc_V < 208 || Voc_V > 15000)
    return { valid: false, message: 'Supply voltage must be between 208 V and 15 000 V.' };
  if (isNaN(Ibf_kA) || Ibf_kA <= 0)
    return { valid: false, message: 'Bolted fault current must be greater than 0 kA.' };
  if (isNaN(G_mm) || G_mm <= 0)
    return { valid: false, message: 'Electrode gap must be greater than 0 mm.' };
  if (isNaN(D_mm) || D_mm <= 0)
    return { valid: false, message: 'Working distance must be greater than 0 mm.' };
  if (isNaN(T_arc_ms) || T_arc_ms <= 0 || isNaN(T_arc_min_ms) || T_arc_min_ms <= 0)
    return { valid: false, message: 'Arc durations must be greater than 0 ms.' };
  if (isNaN(height_mm) || height_mm <= 0 || isNaN(width_mm) || width_mm <= 0 || isNaN(depth_mm) || depth_mm <= 0)
    return { valid: false, message: 'Enclosure dimensions must be greater than 0 mm.' };

  return {
    valid: true,
    parsed: {
      ec: values.ec, Voc_kV: Voc_V / 1000,
      Ibf_kA, G_mm, D_mm, T_arc_ms, T_arc_min_ms,
      height_mm, width_mm, depth_mm,
    },
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const lg = (x) => Math.log10(x);

function eq1(ec, Voc_level, Ibf, G) {
  const [k1,k2,k3,k4,k5,k6,k7,k8,k9,k10] = TABLE1[ec][Voc_level];
  const poly = k4*Ibf**6+k5*Ibf**5+k6*Ibf**4+k7*Ibf**3+k8*Ibf**2+k9*Ibf+k10;
  return 10**(k1+k2*lg(Ibf)+k3*lg(G)) * poly;
}

function eq2VarCf(ec, Voc_kV) {
  const [k1,k2,k3,k4,k5,k6,k7] = TABLE2[ec];
  const V = Voc_kV;
  return k1*V**6+k2*V**5+k3*V**4+k4*V**3+k5*V**2+k6*V+k7;
}

function encType(Voc_kV, H, W, Z) {
  return (Voc_kV < 0.6 && H < 508 && W < 508 && Z <= 203.2) ? 'Shallow' : 'Typical';
}

function width1(W, Z, Voc_kV, ec) {
  const A = {VCB:4, VCBB:10, HCB:10}[ec] ?? 4;
  const B = {VCB:20, VCBB:24, HCB:22}[ec] ?? 20;
  if (W > 1244.6) return (660.4+(1244.6-660.4)*((Voc_kV+A)/B))/25.4;
  if (W > 660.4)  return (660.4+(W-660.4)*((Voc_kV+A)/B))/25.4;
  if (W >= 508)   return 0.03937*W;
  if (W < 508 && Voc_kV < 0.6 && Z <= 203.2) return 0.03937*W;
  return 20.0;
}

function height1(H, Z, Voc_kV, ec) {
  if (ec === 'VCB') {
    if (H > 1244.6) return 49.0;
    if (H >= 508)   return 0.03937*H;
    if (H < 508 && Voc_kV < 0.6 && Z <= 203.2) return 0.03937*H;
    return 20.0;
  }
  const A = {VCBB:10, HCB:10}[ec] ?? 4;
  const B = {VCBB:24, HCB:22}[ec] ?? 20;
  if (H > 1244.6) return (660.4+(1244.6-660.4)*((Voc_kV+A)/B))/25.4;
  if (H > 660.4)  return (660.4+(H-660.4)*((Voc_kV+A)/B))/25.4;
  if (H >= 508)   return 0.03937*H;
  if (H < 508 && Voc_kV < 0.6 && Z <= 203.2) return 0.03937*H;
  return 20.0;
}

function calcCF(ec, Voc_kV, H, W, Z) {
  if (ec === 'VOA' || ec === 'HOA') return { CF:1, et:'N/A', EES:null, H1:null, W1:null };
  const et = encType(Voc_kV, H, W, Z);
  const W1 = width1(W, Z, Voc_kV, ec);
  const H1 = height1(H, Z, Voc_kV, ec);
  const EES = Math.max((H1+W1)/2, 20);
  const [b1,b2,b3] = TABLE7[et][ec];
  const CF = et === 'Typical' ? b1*EES**2+b2*EES+b3 : 1/(b1*EES**2+b2*EES+b3);
  return { CF, et, EES, H1, W1 };
}

function ieExp(k, Ibf, G, Ia_ref, Ia, D, CF) {
  const [k1,k2,k3,k4,k5,k6,k7,k8,k9,k10,k11,k12,k13] = k;
  const poly = k4*Ibf**7+k5*Ibf**6+k6*Ibf**5+k7*Ibf**4+k8*Ibf**3+k9*Ibf**2+k10*Ibf;
  return k1+k2*lg(G)+(k3*Ia_ref/poly)+k11*lg(Ibf)+k12*lg(D)+k13*lg(Ia)+(CF>0?lg(1/CF):0);
}

const pf = (T) => (12.552/50)*T;

function ie600 (ec,Ibf,G,Ia,T,D,CF) { return pf(T)*10**ieExp(TABLE3[ec],Ibf,G,Ia,Ia,D,CF); }
function ie2700(ec,Ibf,G,Ia,T,D,CF) { return pf(T)*10**ieExp(TABLE4[ec],Ibf,G,Ia,Ia,D,CF); }
function ie14300(ec,Ibf,G,Ia,T,D,CF){ return pf(T)*10**ieExp(TABLE5[ec],Ibf,G,Ia,Ia,D,CF); }
function ieLV(ec,Ibf,G,Ia600,Ia,T,D,CF) { return pf(T)*10**ieExp(TABLE3[ec],Ibf,G,Ia600,Ia,D,CF); }

function afbNum(k, Ibf, G, Ia_ref, Ia, T, CF) {
  const [k1,k2,k3,k4,k5,k6,k7,k8,k9,k10,k11,k12,k13] = k;
  const poly = k4*Ibf**7+k5*Ibf**6+k6*Ibf**5+k7*Ibf**4+k8*Ibf**3+k9*Ibf**2+k10*Ibf;
  const num = k1+k2*lg(G)+(k3*Ia_ref/poly)+k11*lg(Ibf)+k13*lg(Ia)+(CF>0?lg(1/CF):0)+lg(T/20);
  return { num, k12 };
}

function afb600(ec,Ibf,G,Ia,T,CF)  { const {num,k12}=afbNum(TABLE3[ec],Ibf,G,Ia,Ia,T,CF);  return 10**(num/(-k12)); }
function afb2700(ec,Ibf,G,Ia,T,CF) { const {num,k12}=afbNum(TABLE4[ec],Ibf,G,Ia,Ia,T,CF);  return 10**(num/(-k12)); }
function afb14300(ec,Ibf,G,Ia,T,CF){ const {num,k12}=afbNum(TABLE5[ec],Ibf,G,Ia,Ia,T,CF);  return 10**(num/(-k12)); }
function afbLV(ec,Ibf,G,Ia600,Ia,T,CF){ const {num,k12}=afbNum(TABLE3[ec],Ibf,G,Ia600,Ia,T,CF); return 10**(num/(-k12)); }

function interp(Voc, v600, v2700, v14300) {
  const v1 = (v2700-v600)/2.1*(Voc-2.7)+v2700;
  const v2 = (v14300-v2700)/11.6*(Voc-14.3)+v14300;
  const v3 = v1*(2.7-Voc)/2.1+v2*(Voc-0.6)/2.1;
  return Voc <= 2.7 ? v3 : v2;
}

function eq25LV(Voc, Ibf, Ia600) {
  const inner = (0.6/Voc)**2*(1/Ia600**2-(0.6**2-Voc**2)/(0.6**2*Ibf**2));
  return 1/Math.sqrt(inner);
}

// ── PPE category ──────────────────────────────────────────────────────────────

export function ppeCategory(IE_calcm2) {
  if (IE_calcm2 < 1.2)   return { cat:'Category 0', rating:'< 1.2', level:0 };
  if (IE_calcm2 <= 4.0)  return { cat:'Category 1', rating:'4',     level:1 };
  if (IE_calcm2 <= 8.0)  return { cat:'Category 2', rating:'8',     level:2 };
  if (IE_calcm2 <= 25.0) return { cat:'Category 3', rating:'25',    level:3 };
  if (IE_calcm2 <= 40.0) return { cat:'Category 4', rating:'40',    level:4 };
  return { cat:'Danger — Exceeds Cat 4', rating:'> 40', level:5 };
}

// ── Min working distance for a PPE threshold ──────────────────────────────────

function minDist(ec, Voc, Ibf, G, Ia600, Ia2700, Ia14300, T, CF, thresh_calcm2) {
  const thresh_J = thresh_calcm2 * 4.184;
  const lgE = lg(thresh_J * 50 / (12.552 * T));
  function dist(k, Ia_ref, Ia) {
    const [k1,k2,k3,k4,k5,k6,k7,k8,k9,k10,k11,k12,k13] = k;
    const poly = k4*Ibf**7+k5*Ibf**6+k6*Ibf**5+k7*Ibf**4+k8*Ibf**3+k9*Ibf**2+k10*Ibf;
    const rest = k1+k2*lg(G)+(k3*Ia_ref/poly)+k11*lg(Ibf)+k13*lg(Ia)+(CF>0?lg(1/CF):0);
    return 10**((lgE-rest)/k12);
  }
  if (Voc <= 0.6) {
    const Ia = eq25LV(Voc, Ibf, Ia600);
    return dist(TABLE3[ec], Ia600, Ia);
  }
  return interp(Voc, dist(TABLE3[ec],Ia600,Ia600), dist(TABLE4[ec],Ia2700,Ia2700), dist(TABLE5[ec],Ia14300,Ia14300));
}

// ── IE vs Distance curve ──────────────────────────────────────────────────────

export function ieCurve(ec, Voc, Ibf, G, Ia600, Ia2700, Ia14300, Iarc, Iarc_min, T, T_min, CF) {
  return Array.from({ length: 60 }, (_, i) => 100 + i * 40).map(D => {
    let e1, e2;
    if (Voc <= 0.6) {
      e1 = ieLV(ec,Ibf,G,Ia600,Iarc,    T,    D,CF) / 4.184;
      e2 = ieLV(ec,Ibf,G,Ia600,Iarc_min,T_min,D,CF) / 4.184;
    } else {
      e1 = interp(Voc,ie600(ec,Ibf,G,Ia600,T,D,CF),ie2700(ec,Ibf,G,Ia2700,T,D,CF),ie14300(ec,Ibf,G,Ia14300,T,D,CF))/4.184;
      e2 = interp(Voc,ie600(ec,Ibf,G,Ia600,T_min,D,CF),ie2700(ec,Ibf,G,Ia2700,T_min,D,CF),ie14300(ec,Ibf,G,Ia14300,T_min,D,CF))/4.184;
    }
    return { D, e1: +e1.toFixed(4), e2: +e2.toFixed(4) };
  });
}

// ── Master calculation ────────────────────────────────────────────────────────

export function calculateArcFlash({ ec, Voc_kV, Ibf_kA, G_mm, D_mm, T_arc_ms, T_arc_min_ms, height_mm, width_mm, depth_mm }) {
  const { CF, et, EES, H1, W1 } = calcCF(ec, Voc_kV, height_mm, width_mm, depth_mm);

  const Ia600   = eq1(ec, 600,   Ibf_kA, G_mm);
  const Ia2700  = eq1(ec, 2700,  Ibf_kA, G_mm);
  const Ia14300 = eq1(ec, 14300, Ibf_kA, G_mm);

  const Iarc     = Voc_kV <= 0.6 ? eq25LV(Voc_kV, Ibf_kA, Ia600) : interp(Voc_kV, Ia600, Ia2700, Ia14300);
  const VarCf    = eq2VarCf(ec, Voc_kV);
  const Iarc_min = Iarc * (1 - 0.5 * VarCf);

  // IE
  const E1 = Voc_kV <= 0.6
    ? ieLV(ec,Ibf_kA,G_mm,Ia600,Iarc,    T_arc_ms,    D_mm,CF)
    : interp(Voc_kV,ie600(ec,Ibf_kA,G_mm,Ia600,T_arc_ms,D_mm,CF),ie2700(ec,Ibf_kA,G_mm,Ia2700,T_arc_ms,D_mm,CF),ie14300(ec,Ibf_kA,G_mm,Ia14300,T_arc_ms,D_mm,CF));
  const E2 = Voc_kV <= 0.6
    ? ieLV(ec,Ibf_kA,G_mm,Ia600,Iarc_min,T_arc_min_ms,D_mm,CF)
    : interp(Voc_kV,ie600(ec,Ibf_kA,G_mm,Ia600,T_arc_min_ms,D_mm,CF),ie2700(ec,Ibf_kA,G_mm,Ia2700,T_arc_min_ms,D_mm,CF),ie14300(ec,Ibf_kA,G_mm,Ia14300,T_arc_min_ms,D_mm,CF));
  const E_J  = Math.max(E1, E2);

  // AFB
  const A1 = Voc_kV <= 0.6 ? afbLV(ec,Ibf_kA,G_mm,Ia600,Iarc,    T_arc_ms,    CF) : interp(Voc_kV,afb600(ec,Ibf_kA,G_mm,Ia600,T_arc_ms,CF),afb2700(ec,Ibf_kA,G_mm,Ia2700,T_arc_ms,CF),afb14300(ec,Ibf_kA,G_mm,Ia14300,T_arc_ms,CF));
  const A2 = Voc_kV <= 0.6 ? afbLV(ec,Ibf_kA,G_mm,Ia600,Iarc_min,T_arc_min_ms,CF) : interp(Voc_kV,afb600(ec,Ibf_kA,G_mm,Ia600,T_arc_min_ms,CF),afb2700(ec,Ibf_kA,G_mm,Ia2700,T_arc_min_ms,CF),afb14300(ec,Ibf_kA,G_mm,Ia14300,T_arc_min_ms,CF));
  const AFB = Math.max(A1, A2);

  const E_cal = E_J / 4.184;
  const ppe   = ppeCategory(E_cal);

  const md = (t) => minDist(ec, Voc_kV, Ibf_kA, G_mm, Ia600, Ia2700, Ia14300, T_arc_ms, CF, t);

  const curveData = ieCurve(ec, Voc_kV, Ibf_kA, G_mm, Ia600, Ia2700, Ia14300, Iarc, Iarc_min, T_arc_ms, T_arc_min_ms, CF);

  return {
    CF, encType: et, EES, H1, W1,
    Ia600, Ia2700, Ia14300,
    Iarc, Iarc_min, VarCf,
    E1_J: E1, E2_J: E2, E_J,
    E1_cal: E1/4.184, E2_cal: E2/4.184, E_cal,
    AFB1: A1, AFB2: A2, AFB,
    ppe,
    minDist1: md(4),  minDist2: md(8),
    minDist3: md(25), minDist4: md(40),
    curveData,
  };
}
