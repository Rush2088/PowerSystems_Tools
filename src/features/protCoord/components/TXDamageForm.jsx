import { txCategory } from '../utils/curveCalc';

// ── Shared form primitives ────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="mb-2">
      <div className="mb-1 text-[10px] font-medium text-slate-400">{label}</div>
      {children}
    </div>
  );
}

function NumField({ label, value, onChange, min, step }) {
  return (
    <Field label={label}>
      <input
        type="number"
        className="input-inline w-full"
        value={value}
        min={min}
        step={step}
        onChange={e => onChange(+e.target.value)}
      />
    </Field>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <input
        type="text"
        className="input-inline w-full"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </Field>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer mb-2">
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
        className="accent-cyan-400"
      />
      {label}
    </label>
  );
}

// ── TXDamageForm ──────────────────────────────────────────────────────────────

export default function TXDamageForm({ xfmr, setXfmr }) {
  return (
    <div className="text-xs">
      <div className="rounded-lg border border-white/10 bg-slate-800/60 p-2.5">
        <Toggle
          label="Show through-fault withstand curve (IEEE C57.12.00)"
          value={xfmr.en}
          onChange={v => setXfmr(x => ({ ...x, en: v }))}
        />
        {xfmr.en && <>
          <TextField
            label="Label"
            value={xfmr.label}
            onChange={v => setXfmr(x => ({ ...x, label: v }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumField
              label="Xfmr kV"
              value={xfmr.voltage}
              min={0.1} step={0.1}
              onChange={v => setXfmr(x => ({ ...x, voltage: v }))}
            />
            <NumField
              label="Rating (MVA)"
              value={xfmr.sMVA}
              min={0.001} step={1}
              onChange={v => setXfmr(x => ({ ...x, sMVA: v }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumField
              label="Isc max (kA)"
              value={xfmr.Isc}
              min={0.001} step={0.1}
              onChange={v => setXfmr(x => ({ ...x, Isc: v }))}
            />
            <NumField
              label="Duration (s)"
              value={xfmr.dur}
              min={0.1} step={0.1}
              onChange={v => setXfmr(x => ({ ...x, dur: v }))}
            />
          </div>

          {/* IEEE C57.12.00 category badge */}
          {(() => {
            const cat = txCategory(xfmr.sMVA);
            const hasDogLeg = cat !== 'I';
            return (
              <div className={`mt-1.5 mb-2 rounded px-2 py-1 text-[9px] font-semibold
                ${hasDogLeg
                  ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-700/40 text-slate-400 border border-white/10'}`}>
                IEEE C57.12.00 Category {cat}
                {hasDogLeg
                  ? ' — dual-segment withstand curve'
                  : ' — single withstand curve (thermal only)'}
              </div>
            );
          })()}

          <div className="text-[9px] text-slate-500 mb-2">
            K = {((xfmr.Isc * 1000) ** 2 * xfmr.dur).toFixed(0)} A²s
            &nbsp;·&nbsp; elbow @ {(0.5 * xfmr.Isc).toFixed(2)} kA
            &nbsp;·&nbsp; t@Isc<sub>max</sub> (frequent) = {(0.25 * xfmr.dur).toFixed(2)} s
          </div>

          {/* Frequent-fault thermal damage boundary toggle */}
          {txCategory(xfmr.sMVA) !== 'I' && (
            <Toggle
              label="Show mechanical damage boundary (frequent faults)"
              value={xfmr.showFrequent}
              onChange={v => setXfmr(x => ({ ...x, showFrequent: v }))}
            />
          )}
        </>}
      </div>
    </div>
  );
}
