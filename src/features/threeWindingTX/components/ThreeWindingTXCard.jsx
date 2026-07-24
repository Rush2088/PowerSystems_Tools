// ── Shared primitives ─────────────────────────────────────────────────────────

function RadioBox({ label, name, methodId, activeMethod, onSelect, unit, values, onChange }) {
  const isActive = activeMethod === methodId;
  return (
    <div
      className={`summary-chip cursor-pointer transition-opacity ${!isActive ? 'opacity-40' : ''}`}
      onClick={onSelect}
    >
      <div className="summary-label select-none">
        <div className="flex items-center gap-2">
          <input
            type="radio"
            name="tx-method"
            checked={isActive}
            onChange={onSelect}
            className="accent-cyan-400 w-3.5 h-3.5 flex-none cursor-pointer"
            onClick={e => e.stopPropagation()}
          />
          <span>{label}</span>
        </div>
        <div className="text-xs text-slate-200 mt-0.5 ml-5">% on LV MVA Base</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="summary-input-wrap flex-none">
          <input
            className="input-inline w-[7rem]"
            type="number"
            step="any"
            disabled={!isActive}
            value={values[name]}
            onChange={e => { e.stopPropagation(); onChange(name, e.target.value); }}
            onClick={e => e.stopPropagation()}
          />
        </div>
        <span className="unit-base shrink-0">{unit}</span>
      </div>
    </div>
  );
}

function Row({ label, name, unit, values, onChange }) {
  return (
    <div className="summary-chip">
      <div className="summary-label">
        <div>{label}</div>
        <div className="text-xs text-slate-200 mt-0.5">% on LV MVA Base</div>
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
      {sub && <div className="mt-1 text-xs text-slate-200">{sub}</div>}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export default function ThreeWindingTXCard({ values, setValues, result, error }) {
  function update(name, value) {
    setValues(prev => ({ ...prev, [name]: value }));
  }

  return (
    <section className="glass-card p-4 sm:p-5">

      {/* Title */}
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-[1.85rem]">
          3-Winding TX — Equiv. Imp.
        </h1>
        <p className="mt-1 text-sm text-slate-300">T-equivalent Impedances</p>
        <p className="mt-0.5 text-xs text-slate-400">
          All impedances represented % on LV Winding MVA base
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-2xl border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-200">
          {error}
        </div>
      )}

      {/* Row 1 — radio-controlled: select which measurement is known */}
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400">
        Test Impedances — select known measurement
      </p>
      <div className="grid grid-cols-2 gap-3">
        <RadioBox
          label="Z (LV1 – LV2)"
          name="X_lv"
          methodId="method2"
          activeMethod={values.method}
          onSelect={() => update('method', 'method2')}
          unit="%"
          values={values}
          onChange={update}
        />
        <RadioBox
          label="Z (HV – LV1+LV2)"
          name="X_hv"
          methodId="method1"
          activeMethod={values.method}
          onSelect={() => update('method', 'method1')}
          unit="%"
          values={values}
          onChange={update}
        />
      </div>

      {/* Row 2 — always active */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <Row label="Z (HV – LV1)" name="Y" unit="%" values={values} onChange={update} />
        <Row label="Z (HV – LV2)" name="Z" unit="%" values={values} onChange={update} />
      </div>

      <div className="divider" />

      {/* Results */}
      {result ? (
        <div className="space-y-4">

          {/* Negative impedance notice */}
          {result.hasNegative && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <span className="font-semibold">Note — negative winding impedance:</span> one or more star-equivalent
              legs are negative. This is physically valid for 3-winding transformers; it occurs when the leakage
              flux coupling between two windings produces a net negative contribution to that winding's T-leg.
              Negative values are highlighted in amber.
            </div>
          )}

          {/* 2 rows × 3 cols results */}
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-cyan-400">
              T-Equivalent Impedances
            </p>
            <div className="grid grid-cols-3 gap-3">
              {/* Row 1 — star legs */}
              <Tile label="Z_HV"  value={result.H}  unit="%" sub="on LV MVA base" />
              <Tile label="Z_LV1" value={result.L1} unit="%" sub="on LV MVA base" />
              <Tile label="Z_LV2" value={result.L2} unit="%" sub="on LV MVA base" />
              {/* Row 2 — derived quantities */}
              <Tile
                label="Z_eq = Z (HV – LV1+LV2)"
                value={result.Z_eq}
                unit="%"
                primary
                sub="on LV MVA base"
              />
              {result.Z_eq_hv !== null ? (
                <Tile
                  label="Z_eq (HV base)"
                  value={result.Z_eq_hv}
                  unit="%"
                  primary
                  sub="on HV MVA base"
                />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                  {result.eqNote}
                </div>
              )}
              <Tile label="Z (LV1 – LV2)" value={result.Z_lv} unit="%" sub="on LV MVA base" />
            </div>
          </div>

          {/* Notes */}
          <div className="text-xs text-slate-200 pt-1 space-y-1">
            <div className="font-semibold text-slate-100 mb-1">Notes:</div>
            <div>1. Z_eq = Z_HV + (Z_LV1 · Z_LV2) / (Z_LV1 + Z_LV2)</div>
            <div>2. TX MVA ratings assumed: LV1 = LV2 = S; HV = 2 × S &nbsp;→&nbsp; Z_eq (HV base) = 2 × Z_eq (LV base)</div>
          </div>

        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
          Enter valid impedance values above to see results.
        </div>
      )}
    </section>
  );
}
