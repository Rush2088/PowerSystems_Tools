import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { logSpace, curveT, xfmrT } from '../utils/curveCalc';

// ── Tick helpers ──────────────────────────────────────────────────────────────
const fmtTick = v =>
  v < 0.01  ? v.toExponential(0)
  : v < 0.1 ? v.toPrecision(1)
  : v < 1   ? v.toString()
  : v < 10  ? v.toString()
  : Math.round(v).toString();

const X_TICKS = [0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50,100];
const Y_TICKS = [0.001,0.002,0.005,0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50,100,200,500,1000];

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, curves, xfmr }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15,23,42,0.96)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 11,
      minWidth: 160,
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 5, fontWeight: 600 }}>
        I = {Number(label) < 1 ? Number(label).toFixed(3) : Number(label).toFixed(2)} kA
      </div>
      {payload.map(p => {
        if (p.value == null) return null;
        const t = Number(p.value);
        const s = t < 1 ? t.toFixed(3) + ' s' : t.toFixed(2) + ' s';
        return (
          <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}: {s}
          </div>
        );
      })}
    </div>
  );
}

// ── Main chart ────────────────────────────────────────────────────────────────
export default function TCCChart({ curves, faults, xfmr, plot }) {
  const { refV, Ilo, Ihi, tlo, thi, tlim } = plot;

  const enabledCurves = curves.filter(c => c.enabled);

  // Pre-compute 300 log-spaced points
  const data = useMemo(() => {
    const Ipts = logSpace(Ilo, Ihi, 300);
    return Ipts.map(I => {
      const pt = { I };
      curves.forEach((c, i) => {
        if (!c.enabled) return;
        const t = curveT(I, c, refV);
        pt[`c${i}`] = (t && t > 0 && isFinite(t) && t <= tlim && t >= tlo) ? t : undefined;
      });
      if (xfmr.en) {
        const t = xfmrT(I, xfmr, refV);
        pt.xfmr = (t && t > 0 && isFinite(t) && t >= tlo) ? t : undefined;
      }
      return pt;
    });
  }, [curves, xfmr, refV, Ilo, Ihi, tlo, tlim]);

  const xTicks = X_TICKS.filter(v => v >= Ilo * 0.99 && v <= Ihi * 1.01);
  const yTicks = Y_TICKS.filter(v => v >= tlo * 0.99 && v <= thi * 1.01);

  // Fault lines (convert to ref voltage)
  const faultLines = faults
    .filter(f => f.en)
    .map(f => ({ I: f.I * f.V / refV, label: f.label }))
    .filter(f => f.I >= Ilo && f.I <= Ihi);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 12, right: 32, left: 16, bottom: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />

        <XAxis
          dataKey="I"
          scale="log"
          domain={[Ilo, Ihi]}
          type="number"
          ticks={xTicks}
          tickFormatter={fmtTick}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          label={{ value: `Current (kA) — ref. ${refV} kV`, position: 'insideBottom', offset: -20, fontSize: 11, fill: '#64748b' }}
        />

        <YAxis
          scale="log"
          domain={[tlo, thi]}
          type="number"
          ticks={yTicks}
          tickFormatter={fmtTick}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          label={{ value: 'Time (seconds)', angle: -90, position: 'insideLeft', offset: 0, dx: -8, fontSize: 11, fill: '#64748b' }}
          width={52}
        />

        <Tooltip
          content={<CustomTooltip curves={curves} xfmr={xfmr} />}
          isAnimationActive={false}
        />

        <Legend
          wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
          formatter={value => <span style={{ color: '#cbd5e1' }}>{value}</span>}
        />

        {/* Fault marker reference lines */}
        {faultLines.map((f, i) => (
          <ReferenceLine
            key={i}
            x={f.I}
            stroke="#94a3b8"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: f.label, position: 'insideTopRight', fontSize: 8, fill: '#64748b', angle: -90 }}
          />
        ))}

        {/* Relay curves */}
        {curves.map((c, i) => !c.enabled ? null : (
          <Line
            key={i}
            type="monotone"
            dataKey={`c${i}`}
            name={c.label}
            stroke={c.color}
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}

        {/* Transformer I²t */}
        {xfmr.en && (
          <Line
            type="monotone"
            dataKey="xfmr"
            name={xfmr.label}
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
