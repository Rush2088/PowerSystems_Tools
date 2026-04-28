import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceDot, ResponsiveContainer, Label,
} from 'recharts';
import { validateTx, calculateKT, sweepZ, sweepC, fmtOhm } from '../utils/ktFactorCalc';

// ── Shared palette ──────────────────────────────────────────────────────────
const MC  = '#38bdf8';   // sky-400 (main TX)
const SC  = '#4ade80';   // green-400 (SUT)
const RED = '#f87171';   // red-400 (marker dot)

// ── Sub-component: one input row ────────────────────────────────────────────
function InputRow({ label, name, value, onChange, min, max, step, unit }) {
  return (
    <div className="summary-chip">
      <div className="summary-label">{label}</div>
      <div className="flex items-center gap-2">
        <div className="summary-input-wrap">
          <input
            className="input-inline w-[6rem]"
            type="number" step={step} min={min} max={max}
            value={value}
            onChange={e => onChange(name, e.target.value)}
          />
        </div>
        {unit && <span className="unit-base shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

// ── Custom dot for reference point ──────────────────────────────────────────
function RefDot({ cx, cy }) {
  return <circle cx={cx} cy={cy} r={5} fill={RED} stroke="#fff" strokeWidth={1.5} />;
}

// ── KT result strip ─────────────────────────────────────────────────────────
function ResultStrip({ res, p, accent }) {
  return (
    <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/10">
      <div className="text-center">
        <div className="text-xl font-extrabold" style={{ color: accent }}>{res.kt.toFixed(4)}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">K<sub>T</sub></div>
      </div>
      <div className="text-center">
        <div className="text-xl font-extrabold text-slate-200">{p.xr.toFixed(1)}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">X/R</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-bold text-slate-200 leading-tight mt-1">{fmtOhm(res.zLV_ohm)}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">Z<sub>T</sub> (Ω)</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-bold leading-tight mt-1" style={{ color: '#fbbf24' }}>{fmtOhm(res.zCorr_ohm)}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">K<sub>T</sub>·Z<sub>T</sub> (Ω)</div>
      </div>
    </div>
  );
}

// ── Mini chart: KT vs ZT% ────────────────────────────────────────────────────
function ZChart({ p, res, accent }) {
  const data = useMemo(() => sweepZ(p), [p]);
  const yVals = data.map(d => d.y);
  const yMin  = (Math.min(...yVals) * 0.98).toFixed(3) * 1;
  const yMax  = (Math.max(...yVals) * 1.02).toFixed(3) * 1;

  return (
    <div>
      <div className="text-xs font-semibold text-slate-300 mb-0.5">K<sub>T</sub> vs Z<sub>T</sub>%</div>
      <div className="text-[10px] text-slate-500 mb-2">Z<sub>T</sub> swept ±20% · fixed X/R &amp; c</div>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="x" type="number" domain={['auto', 'auto']}
            tick={{ fill: '#94a3b8', fontSize: 9 }} tickCount={5}
            tickFormatter={v => v.toFixed(1)}>
            <Label value="ZT (%)" offset={-12} position="insideBottom" style={{ fill: '#64748b', fontSize: 10 }} />
          </XAxis>
          <YAxis domain={[yMin, yMax]} tick={{ fill: '#94a3b8', fontSize: 9 }}
            tickFormatter={v => v.toFixed(3)} width={46} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 11 }}
            labelFormatter={v => `ZT = ${(+v).toFixed(2)}%`}
            formatter={v => [v.toFixed(4), 'KT']}
          />
          <Line type="monotone" dataKey="y" dot={false} stroke={accent} strokeWidth={2} />
          <ReferenceDot x={p.zt} y={res.kt} shape={<RefDot />}
            label={{ value: `KT=${res.kt.toFixed(4)}`, fill: RED, fontSize: 10, dy: -10 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Mini chart: KT vs c ─────────────────────────────────────────────────────
function CChart({ p, res, accent }) {
  const data  = useMemo(() => sweepC(p), [p]);
  const yVals = data.map(d => d.y);
  const yMin  = (Math.min(...yVals) * 0.98).toFixed(3) * 1;
  const yMax  = (Math.max(...yVals) * 1.02).toFixed(3) * 1;

  return (
    <div>
      <div className="text-xs font-semibold text-slate-300 mb-0.5">K<sub>T</sub> vs Voltage Factor c</div>
      <div className="text-[10px] text-slate-500 mb-2">c swept 0.90–1.15 · fixed Z<sub>T</sub> &amp; MVA</div>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="x" type="number" domain={[0.9, 1.15]}
            tick={{ fill: '#94a3b8', fontSize: 9 }}
            ticks={[0.90, 0.95, 1.00, 1.05, 1.10, 1.15]}
            tickFormatter={v => v.toFixed(2)}>
            <Label value="c factor" offset={-12} position="insideBottom" style={{ fill: '#64748b', fontSize: 10 }} />
          </XAxis>
          <YAxis domain={[yMin, yMax]} tick={{ fill: '#94a3b8', fontSize: 9 }}
            tickFormatter={v => v.toFixed(3)} width={46} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 11 }}
            labelFormatter={v => `c = ${(+v).toFixed(3)}`}
            formatter={v => [v.toFixed(4), 'KT']}
          />
          <Line type="monotone" dataKey="y" dot={false} stroke={accent} strokeWidth={2} />
          <ReferenceDot x={p.c} y={res.kt} shape={<RefDot />}
            label={{ value: `KT=${res.kt.toFixed(4)}`, fill: RED, fontSize: 10, dy: -10 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── TX panel: inputs + results + charts ─────────────────────────────────────
function TxPanel({ tag, name, values, setValues, accent, borderColor }) {
  const validation = useMemo(() => validateTx(values), [values]);
  const res = useMemo(() => {
    if (!validation.valid) return null;
    return calculateKT(validation.parsed);
  }, [validation]);

  function update(field, val) {
    setValues(prev => ({ ...prev, [field]: val }));
  }

  const p = validation.parsed;

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col gap-4"
      style={{ borderTop: `3px solid ${borderColor}` }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded"
          style={{ background: `${accent}22`, color: accent }}>{tag}</span>
        <span className="text-base font-bold text-white">{name}</span>
      </div>

      {/* Error */}
      {!validation.valid && (
        <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 px-3 py-2
                        text-xs font-semibold text-orange-300">
          {validation.message}
        </div>
      )}

      {/* Inputs grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <InputRow label="MVA rating"     name="mva" value={values.mva} onChange={update} min={0.1}  max={2000}  step={0.1}  unit="MVA" />
        <InputRow label="ZT (%)"         name="zt"  value={values.zt}  onChange={update} min={1}    max={30}    step={0.1}  unit="%" />
        <InputRow label="HV (kV)"        name="hv"  value={values.hv}  onChange={update} min={1}    max={800}   step={1}    unit="kV" />
        <InputRow label="LV (kV)"        name="lv"  value={values.lv}  onChange={update} min={0.01} max={400}   step={0.01} unit="kV" />
        <InputRow label="X/R ratio"      name="xr"  value={values.xr}  onChange={update} min={1}    max={100}   step={1}    unit="" />
        <InputRow label="c (max)"        name="c"   value={values.c}   onChange={update} min={0.9}  max={1.15}  step={0.01} unit="" />
      </div>

      {/* Result strip */}
      {res && <ResultStrip res={res} p={p} accent={accent} />}

      {/* Charts */}
      {res && (
        <div className="flex flex-col gap-5 pt-2 border-t border-white/10">
          <ZChart p={p} res={res} accent={accent} />
          <CChart p={p} res={res} accent={accent} />
        </div>
      )}
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function KtFactorCard({ mainValues, setMainValues, sutValues, setSutValues }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div className="glass-card p-4 sm:p-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-[1.75rem]">
          K<sub>T</sub> Factor Calculator
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          IEC 60909-0:2016 cl.6.3.3 Eq.(12) · K<sub>T</sub> = 0.95 · c / (1 + 0.6 · x<sub>T</sub>)
        </p>
        <p className="mt-3 text-xs text-slate-500 leading-relaxed">
          Corrects transformer impedance for short-circuit calculations. x<sub>T</sub> derived from Z<sub>T</sub>% and X/R ratio.
          K<sub>T</sub>·Z<sub>T</sub>(Ω) is the corrected LV-referred impedance used in the fault loop.
        </p>
      </div>

      {/* Two transformer panels side by side on lg+ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TxPanel
          tag="Main TX" name="HV / MV transformer"
          values={mainValues} setValues={setMainValues}
          accent={MC} borderColor={MC}
        />
        <TxPanel
          tag="SUT" name="Step-up / LV transformer"
          values={sutValues} setValues={setSutValues}
          accent={SC} borderColor={SC}
        />
      </div>

      {/* Formula footer */}
      <div className="glass-card p-4 text-xs text-slate-400 leading-relaxed">
        <span className="font-semibold text-slate-300">IEC 60909-0 cl.6.3.3 Eq.(12): </span>
        K<sub>T</sub> = 0.95 · c<sub>max</sub> / (1 + 0.6 · x<sub>T</sub>)
        &nbsp;·&nbsp; x<sub>T</sub> = X<sub>T</sub> (pu) = √(Z<sub>T</sub>² − R<sub>T</sub>²)
        &nbsp;·&nbsp; R<sub>T</sub> = Z<sub>T</sub> / √(1 + (X/R)²)
        &nbsp;·&nbsp; Z<sub>T,corr</sub> = K<sub>T</sub> · Z<sub>T</sub>(pu) · V<sub>LV</sub>² / S<sub>rT</sub>
      </div>
    </div>
  );
}
