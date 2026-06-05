export default function ThreewdgTxLossCard({ values, setValues, result, error }) {
  function update(name, value) {
    setValues(prev => ({ ...prev, [name]: value }));
  }

  function Row({ label, name, unit, hint }) {
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
              onChange={e => update(name, e.target.value)}
            />
          </div>
          <span className="unit-base shrink-0">{unit}</span>
        </div>
      </div>
    );
  }

  function Tile({ label, value, unit, primary }) {
    return (
      <div className={`result-tile ${primary ? 'result-tile-primary' : 'result-tile-alert'}`}>
        <div className={`mb-1 text-sm ${primary ? 'text-white/85' : 'text-slate-300'}`}>{label}</div>
        <div className={`font-extrabold tracking-tight ${primary ? 'text-white text-2xl sm:text-3xl' : 'text-slate-50 text-xl sm:text-2xl'}`}>
          {value} <span className={`text-sm font-semibold ${primary ? 'text-white/70' : 'text-slate-400'}`}>{unit}</span>
        </div>
      </div>
    );
  }

  return (
    <section className="glass-card p-4 sm:p-5">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-[1.85rem]">
          3-Winding Transformer
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Star equivalent impedances &amp; individual winding load loss breakdown
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-6 gap-y-0 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400">
            Winding Pair Impedances
          </p>
          <div className="flex flex-col gap-3">
            <Row label="Z  HV - LV1"  name="zHL1"  unit="%" hint="on LV MVA base" />
            <Row label="Z  HV - LV2"  name="zHL2"  unit="%" hint="on LV MVA base" />
            <Row label="Z  LV1 - LV2" name="zL1L2" unit="%" hint="on LV MVA base" />
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400">
            Load Loss &amp; Rating
          </p>
          <div className="flex flex-col gap-3">
            <Row label="Total Load Loss"     name="pTotal"  unit="kW"  hint="HV at 2x LV MVA base" />
            <Row label="LV Winding MVA Base" name="mvaBase" unit="MVA" hint="reference" />
          </div>
        </div>
      </div>

      <div className="divider" />

      {result ? (
        <div className="space-y-5">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-cyan-400">Star Equivalent Impedances</p>
            <div className="grid grid-cols-3 gap-3">
              <Tile label="Z_H (HV)"   value={result.Z_H.toFixed(3)}  unit="%" />
              <Tile label="Z_L1 (LV1)" value={result.Z_L1.toFixed(3)} unit="%" />
              <Tile label="Z_L2 (LV2)" value={result.Z_L2.toFixed(3)} unit="%" />
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-cyan-400">
              Individual Winding Losses{' '}
              <span className="normal-case font-normal text-slate-500">(at 1 pu = LV MVA base)</span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Tile label="P_HV"  value={result.P_H.toFixed(1)}  unit="kW" />
              <Tile label="P_LV1" value={result.P_L1.toFixed(1)} unit="kW" />
              <Tile label="P_LV2" value={result.P_L2.toFixed(1)} unit="kW" />
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-cyan-400">Winding Pair Load Losses</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Tile label="P  HV - LV1"  value={result.P_HL1.toFixed(1)}  unit="kW" primary />
              <Tile label="P  HV - LV2"  value={result.P_HL2.toFixed(1)}  unit="kW" primary />
              <Tile label="P  LV1 - LV2" value={result.P_L1L2.toFixed(1)} unit="kW" primary />
            </div>
          </div>

          <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold ${result.verified ? 'border-green-400/30 bg-green-500/10 text-green-300' : 'border-orange-400/30 bg-orange-500/10 text-orange-300'}`}>
            <span>Verification: 4·P_H + P_L1 + P_L2 = {result.P_check.toFixed(1)} kW</span>
            <span className="text-base">{result.verified ? '✓ Verified' : '✗ Check inputs'}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
          Enter valid impedance and loss values above to see the breakdown.
        </div>
      )}
    </section>
  );
}
