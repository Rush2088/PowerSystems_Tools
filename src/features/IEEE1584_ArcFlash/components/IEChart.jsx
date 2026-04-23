import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';

const THRESHOLDS = [
  { y: 1.2,  color: '#94a3b8', label: '1.2' },
  { y: 4.0,  color: '#facc15', label: '4'   },
  { y: 8.0,  color: '#fb923c', label: '8'   },
  { y: 25.0, color: '#f87171', label: '25'  },
  { y: 40.0, color: '#ef4444', label: '40'  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>D = {label} mm</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toFixed(3)} cal/cm²
        </div>
      ))}
    </div>
  );
};

export default function IEChart({ result }) {
  if (!result) return null;
  const { curveData, D_mm, AFB, Iarc, Iarc_min, T_arc_ms, T_arc_min_ms } = result;

  return (
    <div className="mt-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-300 uppercase tracking-wide">
        Incident Energy vs Working Distance
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={curveData} margin={{ top: 8, right: 24, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
          <XAxis
            dataKey="D"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            label={{ value: 'Working Distance (mm)', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#64748b' }}
          />
          <YAxis
            scale="log"
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            label={{ value: 'IE (cal/cm²)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#64748b' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }}
            formatter={(value) => <span style={{ color: '#cbd5e1' }}>{value}</span>}
          />
          {THRESHOLDS.map(t => (
            <ReferenceLine key={t.y} y={t.y} stroke={t.color} strokeDasharray="4 2" strokeOpacity={0.6}
              label={{ value: `${t.label} cal/cm²`, position: 'right', fontSize: 9, fill: t.color, opacity: 0.8 }}
            />
          ))}
          <ReferenceLine x={D_mm}  stroke="#64748b" strokeDasharray="4 2"
            label={{ value: 'WD', position: 'insideTopLeft', fontSize: 9, fill: '#64748b' }} />
          <ReferenceLine x={AFB}   stroke="#22d3ee" strokeDasharray="4 2"
            label={{ value: 'AFB', position: 'insideTopLeft', fontSize: 9, fill: '#22d3ee' }} />
          <Line
            type="monotone" dataKey="e1" dot={false} strokeWidth={2} stroke="#22d3ee"
            name={`Iarc ${Iarc?.toFixed(3)} kA (T=${T_arc_ms}ms)`}
          />
          <Line
            type="monotone" dataKey="e2" dot={false} strokeWidth={2} stroke="#f97316" strokeDasharray="5 3"
            name={`Iarc_min ${Iarc_min?.toFixed(3)} kA (T=${T_arc_min_ms}ms)`}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-slate-500">Log scale · Reference lines: PPE category thresholds</p>
    </div>
  );
}
