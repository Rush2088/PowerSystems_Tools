import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { logSpace, curveT, xfmrT, xfmrTFrequent, txCategory } from '../utils/curveCalc';

// ── Tick label formatter ───────────────────────────────────────────────────────
const fmtTick = v =>
  v < 0.01  ? v.toExponential(0)
  : v < 0.1 ? v.toPrecision(1)
  : v < 1   ? v.toString()
  : v < 10  ? v.toString()
  : Math.round(v).toString();

// Major ticks = decade values only (1, 10, 100 …)
const X_DECADES = [0.001, 0.01, 0.1, 1, 10, 100];
const Y_DECADES = [0.001, 0.01, 0.1, 1, 10, 100, 1000];

// All minor ticks (2–9 × each decade) within [lo, hi]
function allMinorTicks(lo, hi) {
  const out = [];
  let decade = Math.pow(10, Math.floor(Math.log10(lo)));
  while (decade < hi * 10) {
    for (let m = 2; m <= 9; m++) {
      const v = +(decade * m).toPrecision(8);
      if (v > lo * 0.999 && v < hi * 1.001) out.push(v);
    }
    decade *= 10;
  }
  return out;
}

// ── Custom fault-line label (anchored at bottom of plot, reads upward) ────────
function FaultLabel({ viewBox, value }) {
  if (!viewBox) return null;
  const { x, y, height } = viewBox;
  const lx = x + 10;                      // 10 px right of the dashed line
  const ly = y + (height ?? 300) - 8;     // bottom of the plot area
  // With textAnchor="start" + rotate(-90°), the anchor sits at the BOTTOM of
  // the rotated text and the letters read upward — fully inside the plot.
  return (
    <text
      x={lx} y={ly}
      fontSize={11} fontWeight={700} fill="#334155"
      textAnchor="start"
      transform={`rotate(-90, ${lx}, ${ly})`}
    >
      {value}
    </text>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
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

// ── Legend formatter ───────────────────────────────────────────────────────────
const legendFmt = value => (
  <span style={{ color: '#1e293b', fontSize: 11, fontWeight: 500 }}>{value}</span>
);

// ── Main chart ─────────────────────────────────────────────────────────────────
export default function TCCChart({ curves, faults, xfmr, plot }) {
  const { refV, Ilo, Ihi, tlo, thi, tlim } = plot;

  // Pre-compute 300 log-spaced data points
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

        // Frequent-fault dog-leg curve (IEEE C57.12.00, Categories II–IV only)
        if (xfmr.showFrequent && txCategory(xfmr.sMVA) !== 'I') {
          const tf = xfmrTFrequent(I, xfmr, refV);
          pt.xfmr_freq = (tf && tf > 0 && isFinite(tf) && tf >= tlo) ? tf : undefined;
        }
      }
      return pt;
    });
  }, [curves, xfmr, refV, Ilo, Ihi, tlo, tlim]);

  // Grid tick sets
  const xDecades = X_DECADES.filter(v => v >= Ilo * 0.9 && v <= Ihi * 1.1);
  const yDecades = Y_DECADES.filter(v => v >= tlo * 0.9 && v <= thi * 1.1);
  const xMinor   = allMinorTicks(Ilo, Ihi);
  const yMinor   = allMinorTicks(tlo, thi);

  // Fault reference lines converted to reference voltage
  const faultLines = faults
    .filter(f => f.en)
    .map(f => ({ I: +(f.I * f.V / refV).toPrecision(6), label: f.label }))
    .filter(f => f.I >= Ilo && f.I <= Ihi);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 8, right: 48, left: 8, bottom: 16 }}
      >
        {/* ── Minor grid (all 2–9 × decade) — light grey ── */}
        {xMinor.map(v => (
          <ReferenceLine key={`xn${v}`} x={v}
            stroke="rgba(0,0,0,0.06)" strokeWidth={0.6} />
        ))}
        {yMinor.map(v => (
          <ReferenceLine key={`yn${v}`} y={v}
            stroke="rgba(0,0,0,0.06)" strokeWidth={0.6} />
        ))}

        {/* ── Major grid (decades only) — medium grey ── */}
        {xDecades.map(v => (
          <ReferenceLine key={`xd${v}`} x={v}
            stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
        ))}
        {yDecades.map(v => (
          <ReferenceLine key={`yd${v}`} y={v}
            stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
        ))}

        {/* ── Axes — labels only on decade ticks ── */}
        <XAxis
          dataKey="I"
          scale="log"
          domain={[Ilo, Ihi]}
          type="number"
          ticks={xDecades}
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
          ticks={yDecades}
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

        {/* Legend at top */}
        <Legend
          verticalAlign="top"
          align="center"
          height={32}
          formatter={legendFmt}
          wrapperStyle={{ paddingBottom: 4 }}
        />

        <Tooltip content={<CustomTooltip />} isAnimationActive={false} />

        {/* ── Fault marker lines — custom label offset from line ── */}
        {faultLines.map((f, i) => (
          <ReferenceLine
            key={i}
            x={f.I}
            stroke="#64748b"
            strokeDasharray="7 3"
            strokeWidth={1.5}
            label={<FaultLabel value={f.label} />}
          />
        ))}

        {/* ── Relay curves ── */}
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

        {/* ── Transformer I²t — infrequent fault / thermal limit ── */}
        {xfmr.en && (
          <Line
            type="monotone"
            dataKey="xfmr"
            name={`${xfmr.label} (infreq.)`}
            stroke="rgba(71,85,105,0.75)"
            strokeWidth={2.5}
            strokeDasharray="9 4"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        )}

        {/* ── Transformer frequent-fault dog-leg (IEEE C57.12.00 Cat II–IV) ── */}
        {xfmr.en && xfmr.showFrequent && txCategory(xfmr.sMVA) !== 'I' && (
          <Line
            type="monotone"
            dataKey="xfmr_freq"
            name={`${xfmr.label} (frequent)`}
            stroke="rgba(220,38,38,0.75)"
            strokeWidth={2.5}
            strokeDasharray="5 3"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
