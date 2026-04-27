import { txCategory } from '../utils/curveCalc';

// ── Shared form primitives (same as CurveForm) ───────────────────────────────

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

function SectionHead({ children }) {
  return (
    <div className="mt-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
      {children}
    </div>
  );
}

// ── ExtrasForm ────────────────────────────────────────────────────────────────

export default function ExtrasForm({ plot, setPlot, faults, setFaults, xfmr, setXfmr }) {
  return (
    <div className="text-xs">
      <SectionHead>Plot Settings</SectionHead>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Reference kV" value={plot.refV}
          onChange={v => setPlot(p => ({ ...p, refV: v }))} min={0.1} step={0.1} />
        <NumField label="Time limit (s)" value={plot.tlim}
          onChange={v => setPlot(p => ({ ...p, tlim: v }))} min={1} step={1} />
      </div>
      <div className="rounded-lg border border-white/10 bg-slate-800/40 px-2.5 py-1.5 text-[9px] text-slate-500 mb-2">
        Axes fixed: 0.01 kA – 50 kA · 0.001 s – 1000 s
      </div>

      <SectionHead>Fault Points</SectionHead>
      {faults.map((f, i) => (
        <div key={i} className="rounded-lg border border-white/10 bg-slate-800/60 p-2.5 mb-2">
          <Toggle label="Show" value={f.en}
            onChange={v => setFaults(fs => fs.map((x, j) => j === i ? { ...x, en: v } : x))} />
          <TextField label="Label" value={f.label}
            onChange={v => setFaults(fs => fs.map((x, j) => j === i ? { ...x, label: v } : x))} />
          <div className="grid grid-cols-2 gap-2">
            <NumField label="I (kA)" value={f.I} min={0} step={0.1}
              onChange={v => setFaults(fs => fs.map((x, j) => j === i ? { ...x, I: v } : x))} />
            <NumField label="At (kV)" value={f.V} min={0.1} step={0.1}
              onChange={v => setFaults(fs => fs.map((x, j) => j === i ? { ...x, V: v } : x))} />
          </div>
        </div>
      ))}
      <button
        onClick={() => setFaults(fs => [...fs, { en: true, label: `Fault ${fs.length + 1}`, I: 5, V: plot.refV }])}
        className="mb-4 rounded-lg border border-white/10 bg-slate-800/40 px-3 py-1 text-[10px] text-slate-400 hover:bg-slate-700/60 transition"
      >
        + Add fault point
      </button>

      <SectionHead>Transformer I²t</SectionHead>
      <div className="rounded-lg border border-white/10 bg-slate-800/60 p-2.5">
        <Toggle label="Show transformer I²t curve" value={xfmr.en}
          onChange={v => setXfmr(x => ({ ...x, en: v }))} />
        {xfmr.en && <>
          <TextField label="Label" value={xfmr.label}
            onChange={v => setXfmr(x => ({ ...x, label: v }))} />
          <div className="grid grid-cols-2 gap-2">
            <NumField label="Xfmr kV" value={xfmr.voltage} min={0.1} step={0.1}
              onChange={v => setXfmr(x => ({ ...x, voltage: v }))} />
            <NumField label="Rating (MVA)" value={xfmr.sMVA} min={0.001} step={0.1}
              onChange={v => setXfmr(x => ({ ...x, sMVA: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumField label="Isc max (A)" value={xfmr.Isc} min={1} step={1}
              onChange={v => setXfmr(x => ({ ...x, Isc: v }))} />
            <NumField label="Duration (s)" value={xfmr.dur} min={0.1} step={0.1}
              onChange={v => setXfmr(x => ({ ...x, dur: v }))} />
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
                  ? ' — dog-leg curve available'
                  : ' — single curve only (no dog-leg)'}
              </div>
            );
          })()}

          <div className="text-[9px] text-slate-500 mb-2">
            K = {(xfmr.Isc ** 2 * xfmr.dur).toFixed(0)} A²s
            &nbsp;·&nbsp; elbow @ {(0.5 * xfmr.Isc).toFixed(0)} A
            &nbsp;·&nbsp; t@Isc<sub>max</sub> (frequent) = {(0.25 * xfmr.dur).toFixed(2)} s
          </div>

          {/* Frequent-fault dog-leg toggle */}
          {txCategory(xfmr.sMVA) !== 'I' && (
            <Toggle
              label="Show frequent-fault curve (IEEE C57.12.00 mechanical damage)"
              value={xfmr.showFrequent}
              onChange={v => setXfmr(x => ({ ...x, showFrequent: v }))}
            />
          )}
        </>}
      </div>
    </div>
  );
}
