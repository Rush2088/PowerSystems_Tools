import { Fragment, useEffect, useMemo, useState } from 'react';
import { HV_VOLTAGE_OPTIONS, validateInputs } from '../utils/faultUtils';

function FieldCard({ label, unit, children }) {
  return (
    <div className="summary-chip">
      <div className="summary-label">{label}</div>
      <div className="flex items-center justify-between gap-3">
        <div className="summary-input-wrap flex-none">{children}</div>
        <span className="unit-base shrink-0">{unit}</span>
      </div>
    </div>
  );
}

function formatComplex(R, X) {
  return `${R.toFixed(6)} + ${X.toFixed(6)}j`;
}

function buildSummaryRows(result) {
  return [
    {
      section: 'Input Data',
      rows: [
        ['LLL Fault Current', result.fault_currents.I_LLL_kA.toFixed(1), 'kA'],
        ['LG Fault Current', result.fault_currents.I_LG_kA.toFixed(1), 'kA'],
        ['X1/R1', result.xr_ratios.XR_LLL.toFixed(1), ''],
        ['X0/R0', result.xr_ratios.XR_LG.toFixed(1), ''],
      ],
    },
    {
      section: 'Pos. Seq.',
      rows: [
        ['Z1', formatComplex(result.Z1.pu.R, result.Z1.pu.X), 'pu'],
        ['|Z1|', result.Z1.magnitude.pu.toFixed(6), 'pu'],
        ['Z1', formatComplex(result.Z1.ohm.R, result.Z1.ohm.X), 'ohm'],
        ['|Z1|', result.Z1.magnitude.ohm.toFixed(6), 'ohm'],
      ],
    },
    {
      section: 'Zero Seq.',
      rows: [
        ['Z0', formatComplex(result.Z0.pu.R, result.Z0.pu.X), 'pu'],
        ['|Z0|', result.Z0.magnitude.pu.toFixed(6), 'pu'],
        ['Z0', formatComplex(result.Z0.ohm.R, result.Z0.ohm.X), 'ohm'],
        ['|Z0|', result.Z0.magnitude.ohm.toFixed(6), 'ohm'],
      ],
    },
  ];
}

function buildSummaryText(result) {
  return [
    ['Parameter', 'Value', 'Unit'],
    ['LLL Fault Current', result.fault_currents.I_LLL_kA.toFixed(1), 'kA'],
    ['LG Fault Current', result.fault_currents.I_LG_kA.toFixed(1), 'kA'],
    ['X1/R1', result.xr_ratios.XR_LLL.toFixed(1), ''],
    ['X0/R0', result.xr_ratios.XR_LG.toFixed(1), ''],
    ['', '', ''],
    ['Pos. Seq. Impedance', '', ''],
    ['Z1', formatComplex(result.Z1.pu.R, result.Z1.pu.X), 'pu'],
    ['|Z1|', result.Z1.magnitude.pu.toFixed(6), 'pu'],
    ['Z1', formatComplex(result.Z1.ohm.R, result.Z1.ohm.X), 'ohm'],
    ['|Z1|', result.Z1.magnitude.ohm.toFixed(6), 'ohm'],
    ['', '', ''],
    ['Zero Seq. Impedance', '', ''],
    ['Z0', formatComplex(result.Z0.pu.R, result.Z0.pu.X), 'pu'],
    ['|Z0|', result.Z0.magnitude.pu.toFixed(6), 'pu'],
    ['Z0', formatComplex(result.Z0.ohm.R, result.Z0.ohm.X), 'ohm'],
    ['|Z0|', result.Z0.magnitude.ohm.toFixed(6), 'ohm'],
  ]
    .map((row) => row.join('\t'))
    .join('\n');
}

export default function ResultsCard({
  values,
  setValues,
  result,
  error,
  step,
  setStep,
  onReset,
}) {
  const [copyStatus, setCopyStatus] = useState('');

  function updateField(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  const validation = validateInputs(values);
  const canProceed = validation.valid;
  const summaryText = useMemo(() => (result ? buildSummaryText(result) : ''), [result]);
  const summaryRows = useMemo(() => (result ? buildSummaryRows(result) : []), [result]);

  async function handleCopy() {
    if (!summaryText) return;

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus(''), 1800);
    } catch {
      setCopyStatus('');
    }
  }

  function handleNext() {
    if (step < 2 && canProceed) {
      setStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'textarea') return;

      if ((e.key === 'Enter' || e.key === 'ArrowRight') && step < 2 && canProceed) {
        e.preventDefault();
        setStep(step + 1);
      }

      if (e.key === 'ArrowLeft' && step > 1) {
        e.preventDefault();
        setStep(step - 1);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, canProceed, setStep]);

  return (
    <section className="glass-card mx-auto w-full max-w-[600px] p-4 sm:p-5">
      <div className="mb-4 sm:mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-[2rem]">
          Grid Source Impedance Calculator
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Calculate Positive and Zero Sequence Impedance
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className={step >= 1 ? 'h-2 flex-1 rounded-full bg-cyan-400' : 'h-2 flex-1 rounded-full bg-white/10'} />
        <div className={step >= 2 ? 'h-2 flex-1 rounded-full bg-cyan-400' : 'h-2 flex-1 rounded-full bg-white/10'} />
      </div>

      <div className="mb-5 text-sm font-medium text-slate-300">
        {step === 1 && 'Step 1 of 2 : Grid Parameters'}
        {step === 2 && 'Step 2 of 2 : Results'}
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-200">
          {error}
        </div>
      ) : null}

      {step === 1 && (
        <div className="flex flex-col gap-3 sm:gap-2.5">
          <FieldCard label="Grid Voltage" unit="kV">
            <select
              className="input-inline w-[6.5rem] sm:w-[7rem]"
              value={values.V_LL_kV}
              onChange={(e) => updateField('V_LL_kV', e.target.value)}
            >
              {HV_VOLTAGE_OPTIONS.map((v) => (
                <option key={v.value} value={v.value} className="bg-slate-900 text-white">
                  {v.label}
                </option>
              ))}
            </select>
          </FieldCard>

          <FieldCard label="LLL Fault Current" unit="kA">
            <input
              className="input-inline w-[6.5rem] sm:w-[7rem]"
              type="number"
              step="any"
              value={values.I_LLL_kA}
              onChange={(e) => updateField('I_LLL_kA', e.target.value)}
            />
          </FieldCard>

          <FieldCard label="LG Fault Current" unit="kA">
            <input
              className="input-inline w-[6.5rem] sm:w-[7rem]"
              type="number"
              step="any"
              value={values.I_LG_kA}
              onChange={(e) => updateField('I_LG_kA', e.target.value)}
            />
          </FieldCard>

          <FieldCard label={<>X<sub>1</sub>/R<sub>1</sub></>} unit="">
            <input
              className="input-inline w-[6.5rem] sm:w-[7rem]"
              type="number"
              step="any"
              value={values.XR_LLL}
              onChange={(e) => updateField('XR_LLL', e.target.value)}
            />
          </FieldCard>

          <FieldCard label={<>X<sub>0</sub>/R<sub>0</sub></>} unit="">
            <input
              className="input-inline w-[6.5rem] sm:w-[7rem]"
              type="number"
              step="any"
              value={values.XR_LG}
              onChange={(e) => updateField('XR_LG', e.target.value)}
            />
          </FieldCard>
        </div>
      )}

      {step === 2 && (
        <div className="mx-auto flex max-w-[620px] flex-col gap-4">
          {result ? (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex min-w-[110px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition ${
                    copyStatus === 'copied'
                      ? 'text-cyan-400'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {copyStatus === 'copied' ? (
                    <>
                      <span aria-hidden="true">✓</span>
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true" className="text-base leading-none">⧉</span>
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                <div className="max-h-[28rem] overflow-auto">
                  <table className="w-full border-collapse text-xs sm:text-sm text-slate-100">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
                      <tr className="border-b border-white/10">
                        <th className="w-[25%] px-2 py-1.5 text-left font-semibold">Parameter</th>
                        <th className="w-[30%] px-2 py-1.5 text-left font-semibold">Value</th>
                        <th className="w-[12%] px-2 py-1.5 text-left font-semibold">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map((section) => (
                        <Fragment key={section.section}>
                          <tr className="border-t border-white/10 bg-white/[0.04]">
                            <td colSpan={3} className="px-2 py-1.5 font-semibold text-cyan-300">
                              {section.section}
                            </td>
                          </tr>
                          {section.rows.map(([parameter, value, unit], idx) => (
                            <tr key={`${section.section}-${idx}`} className="border-t border-white/5">
                              <td className="px-2 py-1.5 align-top text-slate-200">{parameter}</td>
                              <td className="px-2 py-1.5 font-mono text-xs sm:text-sm">{value}</td>
                              <td className="px-2 py-1.5 text-slate-300">{unit}</td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
              Enter valid positive values for all parameters.
            </div>
          )}
        </div>
      )}

      <div className="divider" />

      <div className="mt-2 flex items-center justify-center gap-4">
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Back
          </button>
        )}

        {step < 2 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={onReset}
            className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Reset
          </button>
        )}
      </div>
    </section>
  );
}