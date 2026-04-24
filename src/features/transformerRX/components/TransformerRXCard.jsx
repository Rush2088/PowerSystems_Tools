export default function TransformerRXCard({ values, setValues, result, error }) {
  function update(name, value) {
    setValues(prev => ({ ...prev, [name]: value }));
  }

  // Helper to format per-unit as percentage string
  const pct = (pu) => (pu * 100).toFixed(4);

  return (
    <section className="glass-card p-4 sm:p-5">

      {/* ── Title ───────────────────────────────────────────────────────── */}
      <div className="mb-4 sm:mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-[2rem]">
          Transformer R &amp; X Calculator
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Series impedance from FAT nameplate &amp; short-circuit (load loss) test data
        </p>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 rounded-2xl border border-orange-400/40 bg-orange-500/10
                        px-3 py-2 text-sm font-semibold text-orange-200">
          {error}
        </div>
      )}

      {/* ── Inputs grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">

        {/* Left column */}
        <div className="flex flex-col gap-3 sm:gap-4">

          {/* HV Voltage */}
          <div className="summary-chip">
            <div className="summary-label">HV Voltage</div>
            <div className="flex items-center justify-between gap-3">
              <div className="summary-input-wrap flex-none">
                <input
                  className="input-inline w-[7rem]"
                  type="number" step="any" min="0.1"
                  value={values.vHV}
                  onChange={e => update('vHV', e.target.value)}
                />
              </div>
              <span className="unit-base shrink-0">kV</span>
            </div>
          </div>

          {/* LV Voltage */}
          <div className="summary-chip">
            <div className="summary-label">LV Voltage</div>
            <div className="flex items-center justify-between gap-3">
              <div className="summary-input-wrap flex-none">
                <input
                  className="input-inline w-[7rem]"
                  type="number" step="any" min="0.1"
                  value={values.vLV}
                  onChange={e => update('vLV', e.target.value)}
                />
              </div>
              <span className="unit-base shrink-0">kV</span>
            </div>
          </div>

          {/* Rating */}
          <div className="summary-chip">
            <div className="summary-label">Rating (S)</div>
            <div className="flex items-center justify-between gap-3">
              <div className="summary-input-wrap flex-none">
                <input
                  className="input-inline w-[7rem]"
                  type="number" step="any" min="0"
                  value={values.sMVA}
                  onChange={e => update('sMVA', e.target.value)}
                />
              </div>
              <span className="unit-base shrink-0">MVA</span>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3 sm:gap-4">

          {/* Impedance % */}
          <div className="summary-chip">
            <div className="summary-label">Impedance (Z)</div>
            <div className="flex items-center justify-between gap-3">
              <div className="summary-input-wrap flex-none">
                <input
                  className="input-inline w-[7rem]"
                  type="number" step="any" min="0.1" max="25"
                  value={values.zPct}
                  onChange={e => update('zPct', e.target.value)}
                />
              </div>
              <span className="unit-base shrink-0">%</span>
            </div>
          </div>

          {/* Load losses */}
          <div className="summary-chip">
            <div className="summary-label">Load Losses (FAT)</div>
            <div className="flex items-center justify-between gap-3">
              <div className="summary-input-wrap flex-none">
                <input
                  className="input-inline w-[7rem]"
                  type="number" step="any" min="0"
                  value={values.pLoadKW}
                  onChange={e => update('pLoadKW', e.target.value)}
                />
              </div>
              <span className="unit-base shrink-0">kW</span>
            </div>
          </div>

          {/* Turns ratio — derived, read-only */}
          {result && (
            <div className="summary-chip opacity-70">
              <div className="summary-label">Turns Ratio (a)</div>
              <div className="flex items-center justify-between gap-3">
                <div className="summary-input-wrap flex-none">
                  <input
                    className="input-inline w-[7rem] cursor-default select-none"
                    readOnly
                    value={result.turnsRatio.toFixed(4)}
                  />
                </div>
                <span className="unit-base shrink-0">HV/LV</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="divider" />

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {result ? (
        <div className="space-y-4">

          {/* Per-unit row */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Per-Unit Values
            </p>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="result-tile result-tile-alert">
                <div className="mb-1 text-xs text-slate-400">R</div>
                <div className="text-lg font-extrabold tracking-tight text-slate-50 sm:text-xl">
                  {pct(result.rPu)} %
                </div>
              </div>
              <div className="result-tile result-tile-alert">
                <div className="mb-1 text-xs text-slate-400">X</div>
                <div className="text-lg font-extrabold tracking-tight text-slate-50 sm:text-xl">
                  {pct(result.xPu)} %
                </div>
              </div>
              <div className="result-tile result-tile-primary">
                <div className="mb-1 text-xs text-white/80">Z</div>
                <div className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
                  {pct(result.zPu)} %
                </div>
              </div>
            </div>
          </div>

          {/* HV side Ω */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Referred to HV Side — {values.vHV} kV &nbsp;(Ω)
            </p>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="result-tile result-tile-alert">
                <div className="mb-1 text-xs text-slate-400">R<sub>HV</sub></div>
                <div className="text-lg font-extrabold tracking-tight text-slate-50 sm:text-xl">
                  {result.rHV.toFixed(4)} Ω
                </div>
              </div>
              <div className="result-tile result-tile-alert">
                <div className="mb-1 text-xs text-slate-400">X<sub>HV</sub></div>
                <div className="text-lg font-extrabold tracking-tight text-slate-50 sm:text-xl">
                  {result.xHV.toFixed(4)} Ω
                </div>
              </div>
              <div className="result-tile result-tile-primary">
                <div className="mb-1 text-xs text-white/80">Z<sub>HV</sub></div>
                <div className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
                  {result.zHV.toFixed(4)} Ω
                </div>
              </div>
            </div>
          </div>

          {/* LV side mΩ */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Referred to LV Side — {values.vLV} kV &nbsp;(mΩ)
            </p>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="result-tile result-tile-alert">
                <div className="mb-1 text-xs text-slate-400">R<sub>LV</sub></div>
                <div className="text-lg font-extrabold tracking-tight text-slate-50 sm:text-xl">
                  {result.rLV_mOhm.toFixed(3)} mΩ
                </div>
              </div>
              <div className="result-tile result-tile-alert">
                <div className="mb-1 text-xs text-slate-400">X<sub>LV</sub></div>
                <div className="text-lg font-extrabold tracking-tight text-slate-50 sm:text-xl">
                  {result.xLV_mOhm.toFixed(3)} mΩ
                </div>
              </div>
              <div className="result-tile result-tile-primary">
                <div className="mb-1 text-xs text-white/80">Z<sub>LV</sub></div>
                <div className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
                  {result.zLV_mOhm.toFixed(3)} mΩ
                </div>
              </div>
            </div>
          </div>

          {/* Metrics row */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Key Metrics
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="result-tile result-tile-alert">
                <div className="mb-1 text-xs text-slate-400">X/R Ratio</div>
                <div className="text-xl font-extrabold tracking-tight text-slate-50 sm:text-2xl">
                  {result.xrRatio.toFixed(2)}
                </div>
              </div>
              <div className="result-tile result-tile-alert">
                <div className="mb-1 text-xs text-slate-400">SC Power Factor</div>
                <div className="text-xl font-extrabold tracking-tight text-slate-50 sm:text-2xl">
                  {result.scPF.toFixed(4)}
                </div>
              </div>
              <div className="result-tile result-tile-alert">
                <div className="mb-1 text-xs text-slate-400">I<sub>rated</sub> HV</div>
                <div className="text-xl font-extrabold tracking-tight text-slate-50 sm:text-2xl">
                  {result.iRatedHV.toFixed(1)} A
                </div>
              </div>
              <div className="result-tile result-tile-alert">
                <div className="mb-1 text-xs text-slate-400">I<sub>rated</sub> LV</div>
                <div className="text-xl font-extrabold tracking-tight text-slate-50 sm:text-2xl">
                  {result.iRatedLV.toFixed(1)} A
                </div>
              </div>
            </div>
          </div>

          {/* Impedance phasor diagram */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Impedance Phasor (per-unit)
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <svg viewBox="0 0 320 120" className="w-full max-w-sm">
                {/* Axis */}
                <line x1="20" y1="90" x2="300" y2="90" stroke="#475569" strokeWidth="1" />
                <line x1="20" y1="10" x2="20" y2="100" stroke="#475569" strokeWidth="1" />
                {/* Labels */}
                <text x="305" y="94" fill="#94a3b8" fontSize="10">R</text>
                <text x="22" y="9" fill="#94a3b8" fontSize="10">jX</text>

                {(() => {
                  const scale = 240 / (result.zPu * 1.15);
                  const rx = 20 + result.rPu * scale;
                  const ry = 90 - result.xPu * scale;
                  const zx = 20 + result.zPu * scale * Math.cos(Math.atan2(result.xPu, result.rPu));
                  const zy = 90 - result.zPu * scale * Math.sin(Math.atan2(result.xPu, result.rPu));
                  return (
                    <>
                      {/* R arrow */}
                      <line x1="20" y1="90" x2={rx} y2="90" stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#arrowR)" />
                      {/* X arrow */}
                      <line x1={rx} y1="90" x2={rx} y2={ry} stroke="#a78bfa" strokeWidth="2.5" markerEnd="url(#arrowX)" />
                      {/* Z arrow */}
                      <line x1="20" y1="90" x2={zx} y2={zy} stroke="#34d399" strokeWidth="2.5" strokeDasharray="5 3" markerEnd="url(#arrowZ)" />
                      {/* Labels */}
                      <text x={(20 + rx) / 2} y="106" fill="#38bdf8" fontSize="9" textAnchor="middle">R={pct(result.rPu)}%</text>
                      <text x={rx + 6} y={(90 + ry) / 2 + 4} fill="#a78bfa" fontSize="9">X={pct(result.xPu)}%</text>
                      <text x={(20 + zx) / 2 - 8} y={(90 + zy) / 2 - 4} fill="#34d399" fontSize="9">Z={pct(result.zPu)}%</text>
                    </>
                  );
                })()}

                <defs>
                  <marker id="arrowR" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#38bdf8" />
                  </marker>
                  <marker id="arrowX" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#a78bfa" />
                  </marker>
                  <marker id="arrowZ" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#34d399" />
                  </marker>
                </defs>
              </svg>
              <p className="mt-1 text-[10px] text-slate-500">
                <span className="text-sky-400 font-semibold">━ R</span>
                &ensp;
                <span className="text-violet-400 font-semibold">━ jX</span>
                &ensp;
                <span className="text-emerald-400 font-semibold">╌ Z</span>
              </p>
            </div>
          </div>

        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3
                        text-sm text-slate-300">
          Enter valid values above to see results.
        </div>
      )}
    </section>
  );
}
