import { CURVE_TYPES } from '../utils/curveCalc';

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

function SelectField({ label, value, options, onChange }) {
  return (
    <Field label={label}>
      <select
        className="input-inline w-full"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => <option key={o} className="bg-slate-900 text-white">{o}</option>)}
      </select>
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

// ── CurveForm ─────────────────────────────────────────────────────────────────

export default function CurveForm({ crv, onChange }) {
  const f = (k, v) => onChange(k, v);

  return (
    <div className="text-xs space-y-1">
      <Toggle label="Enable this curve" value={crv.enabled} onChange={v => f('enabled', v)} />
      <TextField label="Label" value={crv.label} onChange={v => f('label', v)} />

      <div className="grid grid-cols-2 gap-2">
        <NumField label="Voltage (kV)" value={crv.voltage} onChange={v => f('voltage', v)} min={0.001} step={0.1} />
        <NumField label="Pickup (A)" value={crv.pickup} onChange={v => f('pickup', v)} min={1} step={1} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumField label="TMS" value={crv.tms} onChange={v => f('tms', v)} min={0.01} step={0.01} />
        <div>
          <Field label="Colour">
            <input
              type="color"
              value={crv.color}
              onChange={e => f('color', e.target.value)}
              className="h-8 w-full cursor-pointer rounded border-0 bg-transparent p-0.5"
            />
          </Field>
        </div>
      </div>

      <SelectField label="Curve type" value={crv.curveType} options={CURVE_TYPES} onChange={v => f('curveType', v)} />

      {/* Highset Stage 1 */}
      <div className="rounded-lg border border-white/10 bg-slate-800/60 p-2.5 mt-2">
        <Toggle label="Highset Stage 1" value={crv.hs1on} onChange={v => f('hs1on', v)} />
        {crv.hs1on && (
          <div className="grid grid-cols-2 gap-2 mt-1">
            <NumField label="HS1 Pickup (A)" value={crv.hs1A} onChange={v => f('hs1A', v)} min={1} step={1} />
            <NumField label="HS1 Delay (s)" value={crv.hs1t} onChange={v => f('hs1t', v)} min={0} step={0.01} />
          </div>
        )}
      </div>

      {/* Highset Stage 2 */}
      <div className="rounded-lg border border-white/10 bg-slate-800/60 p-2.5 mt-2">
        <Toggle label="Highset Stage 2" value={crv.hs2on} onChange={v => f('hs2on', v)} />
        {crv.hs2on && (
          <div className="grid grid-cols-2 gap-2 mt-1">
            <NumField label="HS2 Pickup (A)" value={crv.hs2A} onChange={v => f('hs2A', v)} min={1} step={1} />
            <NumField label="HS2 Delay (s)" value={crv.hs2t} onChange={v => f('hs2t', v)} min={0} step={0.01} />
          </div>
        )}
      </div>
    </div>
  );
}
