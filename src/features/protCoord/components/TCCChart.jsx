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

const X_MAJ = [0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50,100];
const Y_MAJ = [0.001,0.002,0.005,0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50,100,200,500,1000];

// Generate minor ticks (2×–9× of each decade between adjacent major ticks)
function minorTicks(majors, lo, hi) {
  const out = [];
  for (let i = 0; i < majors.length - 1; i++) {
    if (Math.abs(majors[i + 1] / majors[i] - 10) < 0.5) {
      for (let m = 2; m <= 9; m++) {
        const v = +(majors[i] * m).toPrecision(6);
        if (v > lo && v < hi) out.push(v);
      }
    }
  }
  return out;
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter(p => p.value != null);
  if (!visible.length) return null;
  return (
    <div style={{
      background: 'rgba(15,23,42,0.96)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 11,
      minWidth: 160,
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 5, fontWeight: 700 }}>
        I = {Number(label) < 1 ? Number(label).toFixed(3) : Number(label).toFixed(2)} kA
      </div>
      {visible.map(p => {
        const t = Number(p.value);
        const s = t < 1 ? t.toFixed(3) + ' s' : t.toFixed(2) + ' s';
        return (
          <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}: <strong>{s}</strong>
          </div>
        );
      })}
    </div>
  );
}

// ── Legend formatter ──────────────────────────────────────────────────────────
const legendFmt = value => (
  <span style={{ color: '#1e293b', fontSize: 11, fontWeight: 500 }}>{value}</span>
);

// ── Main chart ────────────────────────────────────────────────────────────────
export default function TCCChart({ curves, faults, xfmr, plot }) {
  const { refV, Ilo, Ihi, tlo, thi, tlim } = plot;

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

  const xMaj   = X_MAJ.filter(v => v >= Ilo * 0.99 && v <= Ihi * 1.01);
  const yMaj   = Y_MAJ.filter(v => v >= tlo * 0.99 && v <= thi * 1.01);
  const xMinor = minorTicks(X_MAJ, Ilo, Ihi);
  const yMinor = minorTicks(Y_MAJ, tlo, thi);

  // Fault lines converted to reference voltage
  const faultLines = faults
    .filter(f => f.en)
    .map(f => ({ I: f.I * f.V / refV, label: f.label }))
    .filter(f => f.I >= Ilo && f.I <= Ihi);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 8, right: 48, left: 8, bottom: 16 }}
      >
        {/* ── Major grid ── */}
        <CartesianGrid
          stroke="rgba(0,0,0,0.13)"
          strokeWidth={0.8}
          strokeDasharray=""
        />

        {/* ── Minor grid lines ── */}
        {xMinor.map(v => (
          <ReferenceLine key={`xm${v}`} x={v}
            stroke="rgba(0,0,0,0.05)" strokeWidth={0.6} />
        ))}
        {yMinor.map(v => (
          <ReferenceLine key={`ym${v}`} y={v}
            stroke="rgba(0,0,0,0.05)" strokeWidth={0.6} />
        ))}

        <XAxis
          dataKey="I"
          scale="log"
          domain={[Ilo, Ihi]}
          type="number"
          ticks={xMaj}
          tickFormatter={fmtTick}
          tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
          label={{
            value: `Current (kA)  —  ref. ${refV} kV`,
            position: 'insideBottom',
            offset: -8,
            fontSize: 12,
            fill: '#1e293b',
            fontWeight: 600,
          }}
        />

        <YAxis
          scale="log"
          domain={[tlo, thi]}
          type="number"
          ticks={yMaj}
          tickFormatter={fmtTick}
          tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
          width={58}
          label={{
            value: 'Time (seconds)',
            angle: -90,
            position: 'insideLeft',
            offset: 12,
            fontSize: 12,
            fill: '#1e293b',
            fontWeight: 600,
          }}
        />

        {/* Legend at top — no overlap with x-axis label */}
        <Legend
          verticalAlign="top"
          align="center"
          height={32}
          formatter={legendFmt}
          wrapperStyle={{ paddingBottom: 4 }}
        />

        <Tooltip content={<CustomTooltip />} isAnimationActive={false} />

        {/* ── Fault marker reference lines ── */}
        {faultLines.map((f, i) => (
          <ReferenceLine
            key={i}
            x={f.I}
            stroke="#64748b"
            strokeDasharray="7 3"
            strokeWidth={1.5}
            label={{
              value: f.label,
              position: 'insideTopRight',
              fontSize: 11,
              fontWeight: 600,
              fill: '#334155',
              angle: -90,
            }}
          />
        ))}

        {/* ── Relay curves — thicker, modern palette, 80% opacity ── */}
        {curves.map((c, i) => !c.enabled ? null : (
          <Line
            key={i}
            type="monotone"
            dataKey={`c${i}`}
            name={c.label}
            stroke={c.color}
            strokeWidth={3.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}

        {/* ── Transformer I²t — dashed ── */}
        {xfmr.en && (
          <Line
            type="monotone"
            dataKey="xfmr"
            name={xfmr.label}
            stroke="rgba(71,85,105,0.75)"
            strokeWidth={2.5}
            strokeDasharray="9 4"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
