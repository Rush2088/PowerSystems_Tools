import {
  HV_VOLTAGE_OPTIONS,
  LV_VOLTAGE_OPTIONS,
  C_FACTOR_OPTIONS,
} from "../utils/faultUtils";

function EditableCard({ label, unit, children }) {
  return (
    <div className="summary-chip">
      <div className="summary-label">{label}</div>
      <div className="summary-input-wrap">{children}</div>
      <span className="unit-base">{unit}</span>
    </div>
  );
}

function CheckboxCard({ label, checked, onChange, note }) {
  return (
    <div className="summary-chip-checkbox">
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{label}</span>
      </label>
      {note ? <div className="checkbox-note">{note}</div> : null}
    </div>
  );
}

function ResultTile({ label, value, highlight = false }) {
  return (
    <div
      className={
        highlight
          ? "result-tile result-tile-primary"
          : "result-tile result-tile-alert"
      }
    >
      <div
        className={
          highlight
            ? "mb-1 text-sm text-white/85"
            : "mb-1 text-sm text-slate-300"
        }
      >
        {label}
      </div>
      <div
        className={
          highlight
            ? "text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
            : "text-xl font-extrabold tracking-tight text-slate-50 sm:text-2xl"
        }
      >
        {value}
      </div>
    </div>
  );
}

export default function ResultsCard({ values, setValues, result, error }) {
  function updateField(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  const kTDisplay =
    result && result.K_T ? result.K_T.toFixed(4) : "1.0000";

  const lvVoltageLabel = values.lvKV || "LV";

  return (
    <section className="glass-card p-4 sm:p-5">
      <div className="mb-4 sm:mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-[2rem]">
          Fault Level Calculator
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          IEC60909 Short Circuit Calculator
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          <EditableCard label="Grid Fault Current" unit="kA">
            <input
              className="input-inline"
              type="number"
              step="any"
              value={values.gridKA}
              onChange={(e) => updateField("gridKA", e.target.value)}
            />
          </EditableCard>

          <EditableCard label="C-Factor" unit="">
            <select
              className="input-inline"
              value={values.cFactor}
              onChange={(e) => updateField("cFactor", e.target.value)}
            >
              {C_FACTOR_OPTIONS.map((v) => (
                <option key={v.value} value={v.value} className="bg-slate-900 text-white">
                  {v.label}
                </option>
              ))}
            </select>
          </EditableCard>

          <EditableCard label="HV Bus Voltage" unit="kV">
            <select
              className="input-inline"
              value={values.hvKV}
              onChange={(e) => updateField("hvKV", e.target.value)}
            >
              {HV_VOLTAGE_OPTIONS.map((v) => (
                <option key={v.value} value={v.value} className="bg-slate-900 text-white">
                  {v.label}
                </option>
              ))}
            </select>
          </EditableCard>

          <EditableCard label="LV Bus Voltage" unit="kV">
            <select
              className="input-inline"
              value={values.lvKV}
              onChange={(e) => updateField("lvKV", e.target.value)}
            >
              {LV_VOLTAGE_OPTIONS.map((v) => (
                <option key={v.value} value={v.value} className="bg-slate-900 text-white">
                  {v.label}
                </option>
              ))}
            </select>
          </EditableCard>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          <EditableCard label="Transformer Rating" unit="MVA">
            <input
              className="input-inline"
              type="number"
              step="any"
              value={values.txMVA}
              onChange={(e) => updateField("txMVA", e.target.value)}
            />
          </EditableCard>

          <EditableCard label="Transformer Impedance" unit="%">
            <input
              className="input-inline"
              type="number"
              step="any"
              value={values.txZ}
              onChange={(e) => updateField("txZ", e.target.value)}
            />
          </EditableCard>

          <CheckboxCard
            label="Consider Transformer K-Factor"
            checked={values.considerKFactor}
            onChange={(checked) => updateField("considerKFactor", checked)}
            note={`Kₜ = ${kTDisplay}`}
          />

          <CheckboxCard
            label="Add Inverter Contribution"
            checked={values.addInverterContribution}
            onChange={(checked) => updateField("addInverterContribution", checked)}
            note={`Applied at ${lvVoltageLabel} kV bus`}
          />

          {values.addInverterContribution && (
            <>
              <EditableCard label="Inverter Rating" unit="MVA">
                <input
                  className="input-inline"
                  type="number"
                  step="any"
                  value={values.inverterMVA}
                  onChange={(e) => updateField("inverterMVA", e.target.value)}
                />
              </EditableCard>

              <EditableCard label="No. of Inverters" unit="">
                <input
                  className="input-inline"
                  type="number"
                  step="1"
                  min="1"
                  value={values.inverterCount}
                  onChange={(e) => updateField("inverterCount", e.target.value)}
                />
              </EditableCard>

              <EditableCard label="FRT Max Current Factor" unit="">
                <input
                  className="input-inline"
                  type="number"
                  step="any"
                  value={values.inverterMaxCurrentFactor}
                  onChange={(e) =>
                    updateField("inverterMaxCurrentFactor", e.target.value)
                  }
                />
              </EditableCard>
            </>
          )}
        </div>
      </div>

      <div className="divider" />

      {result ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
          <ResultTile
            label="Grid Z (100 MVA Base)"
            value={`${result.Z_grid_pu.toFixed(4)} pu`}
          />
          <ResultTile
            label="Transformer Z (100 MVA Base)"
            value={`${result.Z_TX_pu.toFixed(4)} pu`}
          />
          <ResultTile
            label="Total Z (100 MVA Base)"
            value={`${result.Ztot_pu.toFixed(4)} pu`}
          />
          <ResultTile
            label={`Grid Contribution @ ${lvVoltageLabel} kV`}
            value={`${result.gridContributionKA.toFixed(2)} kA`}
          />
          <ResultTile
            label={`Inverter Contribution @ ${lvVoltageLabel} kV`}
            value={`${result.inverterContributionKA.toFixed(2)} kA`}
          />
          <ResultTile
            label={`Total Fault Current @ ${lvVoltageLabel} kV`}
            value={`${result.totalFaultCurrentKA.toFixed(2)} kA`}
            highlight
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
          Enter valid positive values. LV bus voltage must stay lower than HV bus voltage.
        </div>
      )}
    </section>
  );
}