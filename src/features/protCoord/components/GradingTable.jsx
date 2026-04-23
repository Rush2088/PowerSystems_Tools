import { useMemo } from 'react';
import { curveT } from '../utils/curveCalc';

export default function GradingTable({ curves, faults, plot }) {
  const { refV, tlim, tlo, Ilo, Ihi } = plot;
  const enabled = curves.filter(c => c.enabled);
  if (enabled.length < 1) return null;

  const checkI = useMemo(() => {
    const base = [0.5, 1, 2, 5, 10, 20].filter(v => v >= Ilo && v <= Ihi);
    const faultI = faults.filter(f => f.en).map(f => +(f.I * f.V / refV).toFixed(3));
    return [...new Set([...base, ...faultI])].sort((a, b) => a - b);
  }, [plot, faults, refV]);

  const getT = (crv, I) => {
    const t = curveT(I, crv, refV);
    return (!t || t <= 0 || t > tlim || t < tlo) ? null : t;
  };

  const fmt = t => t === null ? '—' : t < 1 ? t.toFixed(3) + 's' : t.toFixed(2) + 's';

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px]" style={{ minWidth: 400 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
            <th className="px-2 py-1.5 text-left font-semibold text-slate-400" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              I (kA)
            </th>
            {enabled.map((c, i) => (
              <th key={i} className="px-2 py-1.5 text-center font-semibold" style={{ color: c.color, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {c.label}
              </th>
            ))}
            {enabled.length >= 2 && enabled.slice(0, -1).map((_, i) => (
              <th key={`m${i}`} className="px-2 py-1.5 text-center text-[10px] font-semibold text-slate-500" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                Margin {i + 2}→{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {checkI.map((I, ri) => {
            const ts = enabled.map(c => getT(c, I));
            const margins = enabled.slice(0, -1).map((_, i) => {
              const a = ts[i], b = ts[i + 1];
              return (a !== null && b !== null) ? +(b - a).toFixed(3) : null;
            });
            return (
              <tr key={ri} style={{ background: ri % 2 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                <td className="px-2 py-1 font-semibold text-slate-300">{I.toFixed(3)}</td>
                {ts.map((t, i) => (
                  <td key={i} className="px-2 py-1 text-center"
                    style={{ color: t === null ? '#475569' : enabled[i].color }}>
                    {fmt(t)}
                  </td>
                ))}
                {margins.map((m, i) => {
                  const ok   = m !== null && m >= 0.3;
                  const warn = m !== null && m >= 0 && m < 0.3;
                  const bad  = m !== null && m < 0;
                  return (
                    <td key={`m${i}`} className="px-2 py-1 text-center font-semibold"
                      style={{ color: ok ? '#4ade80' : warn ? '#fb923c' : bad ? '#f87171' : '#475569' }}>
                      {m === null ? '—' : `${m >= 0 ? '+' : ''}${m.toFixed(3)}s`}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-4 px-2 py-1.5 text-[9px] text-slate-500">
        <span style={{ color: '#4ade80' }}>✓ ≥ 0.3 s — adequate</span>
        <span style={{ color: '#fb923c' }}>⚠ 0 – 0.3 s — marginal</span>
        <span style={{ color: '#f87171' }}>✗ negative — miscoordination</span>
      </div>
    </div>
  );
}
