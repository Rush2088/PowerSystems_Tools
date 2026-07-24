import { METHODS } from '../utils/threeWindingTXCalc';

// ── Shared primitives ─────────────────────────────────────────────────────────

function Row({ label, name, unit, hint, values, onChange }) {
  return (
    <div className="summary-chip">
      <div className="summary-label">
        {label}
        {hint && <span className="ml-1.5 text-[10px] text-slate-500">{hint}</span>}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="summary-input-wrap flex-none">
          <input
            className="input-inline w-[7rem]"
            type="number"
            step="any"
            value={values[name]}
            onChange={e => onChange(name, e.target.value)}
          />
        </div>
        <span className="unit-base shrink-0">{unit}</span>
      </div>
    </div>
  );
}

function Tile({ label, value, unit, primary, sub }) {
  const isNeg = typeof value === 'number' && value < 0;
  return (
    <div className={`result-tile ${primary ? 'result-tile-primary' : 'result-tile-alert'}`}>
      <div className={`mb-1 text-sm ${primary ? 'text-white/85' : 'text-slate-300'}`}>{label}</div>
      <div
        className={`font-extrabold tracking-tight ${
          primary ? 'text-white text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
        } ${isNeg ? 'text-amber-300' : 'text-slate-50'}`}
      >
        {typeof value === 'number' ? value.toFixed(4) : value}{' '}
        <span className={`text-sm font-semibold ${primary ? 'text-white/70' : 'text-slate-400'}`}>{unit}</span>
      </div>
      {sub && <div className="mt-1 text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export default function ThreeWindingTXCard({ values, setValues, result, error }) {
  function update(name, value) {
    setValues(prev => ({ ...prev, [name]: value }));
  }

  const method = METHODS.find(m => m.id === values.method) ?? METHODS[0];

  return (
    <section className="glass-card p-4 sm:p-5">

      {/* Title */}
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-[1.85rem]">
          3-Winding TX — Equiv. Imp.
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          T-equivalent Impedances
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          All impedances represented % on LV Winding MVA base
        </p>
      </div>

      {/* Method dropdown — left-aligned, 50% width */}
      <div className="mb-4">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400">
          Known test impedances
        </p>
        <select
          className="input-inline w-1/2"
          value={values.method}
          onChange={e => update('method', e.target.value)}
        >
          {METHODS.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-2xl border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-200">
          {error}
        </div>
      )}

      {/* Inputs — 2×2 grid
          Top row:    Z(HV–LV1)  |  Z(HV–LV2)
          Bottom row: method-dependent X (full width) */}
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400">
        Test Impedances
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Row label={method.yLabel} name="Y" unit="%" values={values} onChange={update} />
        <Row label={method.zLabel} name="Z" unit="%" values={values} onChange={update} />
        <div className="col-span-2">
          <Row label={method.xLabel} name="X" unit="%" hint={method.xHint} values={values} onChange={update} />
        </div>
      </div>

      <div className="divider" />

      {/* Results */}
      {result ? (
        <div className="space-y-5">

          {/* Negative impedance notice */}
          {result.hasNegative && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <span className="font-semibold">Note — negative winding impedance:</span> one or more star-equivalent
              legs are negative. This is physically valid for 3-winding transformers; it occurs when the leakage
              flux coupling between two windings produces a net negative contribution to that winding's T-leg.
              Negative values are highlighted in amber.
            </div>
          )}

          {/* T-Equivalent Impedances */}
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-cyan-400">
              T-Equivalent Impedances
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Tile label="Z_HV"  value={result.H}  unit="%" sub="on LV MVA base" />
              <Tile label="Z_LV1" value={result.L1} unit="%" sub="on LV MVA base" />
              <Tile label="Z_LV2" value={result.L2} unit="%" sub="on LV MVA base" />
            </div>
          </div>

          {/* Z_eq */}
          {result.Z_eq !== null ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Tile
                label="Z_eq = Z_HV + (Z_LV1 ∥ Z_LV2)"
                value={result.Z_eq}
                unit="%"
                primary
                sub="on LV MVA base"
              />
              <div className="result-tile result-tile-alert flex items-start">
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="text-slate-300 font-semibold text-sm mb-1">Formula</div>
                  <div className="font-mono">Z_eq = Z_HV + (Z_LV1 · Z_LV2) / (Z_LV1 + Z_LV2)</div>
                  <div className="text-[10px] mt-2 text-slate-500">
                    Equivalent impedance seen from HV terminals with both LV windings in parallel.
                    Used for fault level calculations on the HV bus.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
              {result.eqNote}
            </div>
          )}

        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
          Enter valid impedance values above to see results.
        </div>
      )}
    </section>
  );
}
