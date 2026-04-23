import { EC_OPTIONS, TYPICAL_GAPS } from '../utils/arcFlashCalc';
import IEChart from './IEChart';

// ── Reusable input primitives (same pattern as faultCalc) ─────────────────────

function EditableCard({ label, unit, children }) {
  return (
    <div className="summary-chip">
      <div className="summary-label">{label}</div>
      <div className="flex items-center justify-between gap-3">
        <div className="summary-input-wrap flex-none">{children}</div>
        {unit && <span className="unit-base shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

function NumInput({ value, onChange, min, max, step = 'any', width = 'w-[6.5rem] sm:w-[7rem]' }) {
  return (
    <input
      className={`input-inline ${width}`}
      type="number" min={min} max={max} step={step}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function SelectInput({ value, onChange, options, width = 'w-full' }) {
  return (
    <select
      className={`input-inline ${width}`}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(o => (
        <option key={o.value} value={o.value} className="bg-slate-900 text-white">
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── PPE level colours ─────────────────────────────────────────────────────────

const PPE_BORDER = {
  0: 'border-emerald-400',
  1: 'border-yellow-400',
  2: 'border-orange-400',
  3: 'border-red-400',
  4: 'border-red-600',
  5: 'border-red-700',
};
const PPE_GLOW = {
  0: '0 0 14px rgba(52,211,153,0.35)',
  1: '0 0 14px rgba(250,204,21,0.35)',
  2: '0 0 14px rgba(251,146,60,0.35)',
  3: '0 0 14px rgba(248,113,113,0.35)',
  4: '0 0 14px rgba(220,38,38,0.4)',
  5: '0 0 14px rgba(185,28,28,0.5)',
};

function ResultTile({ label, value, sub, highlight = false }) {
  return (
    <div className={highlight ? 'result-tile result-tile-primary' : 'result-tile result-tile-alert'}>
      <div className={`mb-1 text-sm ${highlight ? 'text-white/85' : 'text-slate-300'}`}>{label}</div>
      <div className={`font-extrabold tracking-tight ${highlight ? 'text-2xl text-white sm:text-3xl' : 'text-xl text-slate-50 sm:text-2xl'}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function IntermediateTile({ label, value }) {
  return (
    <div className="result-tile result-tile-alert">
      <div className="mb-1 text-xs text-slate-400">{label}</div>
      <div className="text-base font-semibold text-slate-200">{value}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="col-span-full mt-1 mb-0.5 text-xs font-semibold uppercase tracking-widest text-slate-500">
      {children}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export default function ArcFlashCard({ values, setValues, result, error }) {
  function set(name, val) {
    setValues(prev => ({ ...prev, [name]: val }));
  }

  function applyTypical() {
    set('G_mm', String(TYPICAL_GAPS[values.ec] ?? 32));
  }

  const fmt = (v, dp = 3) => (typeof v === 'number' && isFinite(v) ? v.toFixed(dp) : '—');

  return (
    <section className="glass-card p-4 sm:p-5">

      {/* ── Header ── */}
      <div className="mb-4 sm:mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-[2rem]">
          Arc Flash Calculator
        </h1>
        <p className="mt-1 text-sm text-slate-300">IEEE Std 1584™-2018 · 208 V – 15 kV · Three-phase AC</p>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-4 rounded-2xl border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-200">
          {error}
        </div>
      )}

      {/* ── Inputs grid ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">

        {/* Left column — arc flash & fault current */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="summary-chip">
            <div className="summary-label">Electrode Config.</div>
            <div className="flex-1">
              <SelectInput
                value={values.ec}
                onChange={v => set('ec', v)}
                options={EC_OPTIONS}
                width="w-full"
              />
            </div>
          </div>

          <EditableCard label="Supply Voltage" unit="V">
            <NumInput value={values.Voc_V} onChange={v => set('Voc_V', v)} min={208} max={15000} />
          </EditableCard>

          <EditableCard label="Bolted Fault Current" unit="kA">
            <NumInput value={values.Ibf_kA} onChange={v => set('Ibf_kA', v)} min={0.1} max={106} step={0.1} />
          </EditableCard>

          <EditableCard label="Arc Duration" unit="ms">
            <NumInput value={values.T_arc_ms} onChange={v => set('T_arc_ms', v)} min={1} max={5000} />
          </EditableCard>

          <EditableCard label="Arc Duration — Reduced" unit="ms">
            <NumInput value={values.T_arc_min_ms} onChange={v => set('T_arc_min_ms', v)} min={1} max={5000} />
          </EditableCard>
        </div>

        {/* Right column — geometry & enclosure */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <EditableCard label="Electrode Gap" unit="mm">
            <NumInput value={values.G_mm} onChange={v => set('G_mm', v)} min={6} max={250} />
          </EditableCard>

          <EditableCard label="Working Distance" unit="mm">
            <NumInput value={values.D_mm} onChange={v => set('D_mm', v)} min={100} max={3000} />
          </EditableCard>

          <EditableCard label="Enclosure Height" unit="mm">
            <NumInput value={values.height_mm} onChange={v => set('height_mm', v)} min={100} max={3000} />
          </EditableCard>

          <EditableCard label="Enclosure Width" unit="mm">
            <NumInput value={values.width_mm} onChange={v => set('width_mm', v)} min={100} max={3000} />
          </EditableCard>

          <EditableCard label="Enclosure Depth" unit="mm">
            <NumInput value={values.depth_mm} onChange={v => set('depth_mm', v)} min={50} max={3000} />
          </EditableCard>

          <button
            type="button"
            onClick={applyTypical}
            className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
          >
            Apply Typical Gap for {values.ec}
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      {result ? (
        <>
          <div className="divider" />

          {/* PPE Category tile */}
          <div
            className={`result-tile mb-3 border-2 ${PPE_BORDER[result.ppe.level]}`}
            style={{ boxShadow: PPE_GLOW[result.ppe.level] }}
          >
            <div className="mb-0.5 text-sm text-slate-300">PPE Minimum Requirement</div>
            <div className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {result.ppe.cat}
            </div>
            {result.ppe.rating !== '> 40' && result.ppe.level > 0 && (
              <div className="mt-0.5 text-xs text-slate-400">
                Arc rating ≥ {result.ppe.rating} cal/cm²
              </div>
            )}
          </div>

          {/* Main results: 3 columns */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <SectionLabel>Normal arcing current — Iarc = {fmt(result.Iarc)} kA</SectionLabel>
            <ResultTile label="Incident Energy" value={`${fmt(result.E1_J)} J/cm²`} sub={`${fmt(result.E1_cal)} cal/cm²`} />
            <ResultTile label="Arc Flash Boundary" value={`${fmt(result.AFB1, 0)} mm`} sub={`${(result.AFB1/1000).toFixed(3)} m`} />
            <ResultTile label="Arcing Current" value={`${fmt(result.Iarc)} kA`} />

            <SectionLabel>Reduced arcing current — Iarc_min = {fmt(result.Iarc_min)} kA</SectionLabel>
            <ResultTile label="Incident Energy" value={`${fmt(result.E2_J)} J/cm²`} sub={`${fmt(result.E2_cal)} cal/cm²`} />
            <ResultTile label="Arc Flash Boundary" value={`${fmt(result.AFB2, 0)} mm`} sub={`${(result.AFB2/1000).toFixed(3)} m`} />
            <ResultTile label="Reduced Arcing Current" value={`${fmt(result.Iarc_min)} kA`} />

            <SectionLabel>Governing results</SectionLabel>
            <ResultTile label="Incident Energy (governing)" value={`${fmt(result.E_J)} J/cm²`} sub={`${fmt(result.E_cal)} cal/cm²`} highlight />
            <ResultTile label="Arc Flash Boundary (governing)" value={`${fmt(result.AFB, 0)} mm`} sub={`${(result.AFB/1000).toFixed(3)} m`} highlight />
          </div>

          <div className="divider" />

          {/* Min working distances */}
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Minimum Working Distances
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <IntermediateTile label="Cat 1 (4 cal/cm²)"  value={`${fmt(result.minDist1, 0)} mm`} />
            <IntermediateTile label="Cat 2 (8 cal/cm²)"  value={`${fmt(result.minDist2, 0)} mm`} />
            <IntermediateTile label="Cat 3 (25 cal/cm²)" value={`${fmt(result.minDist3, 0)} mm`} />
            <IntermediateTile label="Cat 4 (40 cal/cm²)" value={`${fmt(result.minDist4, 0)} mm`} />
          </div>

          <div className="divider" />

          {/* Intermediate values */}
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Intermediate Values
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <IntermediateTile label="Enclosure Type"    value={result.encType} />
            {result.EES  && <IntermediateTile label="EES"            value={`${fmt(result.EES, 2)} in`} />}
            <IntermediateTile label="CF"               value={fmt(result.CF, 4)} />
            <IntermediateTile label="VarCf"            value={fmt(result.VarCf, 5)} />
            <IntermediateTile label="Iarc @ 600 V"    value={`${fmt(result.Ia600)} kA`} />
            {result.Iarc > 0 && result.encType !== 'N/A' && (
              <>
                <IntermediateTile label="Iarc @ 2700 V"  value={`${fmt(result.Ia2700)} kA`} />
                <IntermediateTile label="Iarc @ 14300 V" value={`${fmt(result.Ia14300)} kA`} />
              </>
            )}
          </div>

          {/* IE vs Distance chart */}
          <IEChart result={{ ...result, D_mm: parseFloat(''), T_arc_ms: result.T_arc_ms, T_arc_min_ms: result.T_arc_min_ms }} />
        </>
      ) : !error ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
          Enter valid inputs above — results update automatically.
        </div>
      ) : null}
    </section>
  );
}
