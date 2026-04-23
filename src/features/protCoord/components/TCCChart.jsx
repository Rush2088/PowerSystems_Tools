import { useState, useMemo } from 'react';
import { logSpace, curveT, xfmrT, minorTks } from '../utils/curveCalc';

export default function TCCChart({ curves, faults, xfmr, plot, svgRef }) {
  const [hov, setHov] = useState(null);
  const { refV, Ilo, Ihi, tlo, thi, tlim } = plot;

  const VW = 740, VH = 480, ML = 64, MR = 16, MT = 14, MB = 56;
  const W = VW - ML - MR, H = VH - MT - MB;
  const lIlo = Math.log10(Ilo), lIhi = Math.log10(Ihi);
  const lTlo = Math.log10(tlo), lThi = Math.log10(thi);
  const xS = I => (Math.log10(I) - lIlo) / (lIhi - lIlo) * W;
  const yS = t => H - (Math.log10(Math.max(t, tlo * 0.3)) - lTlo) / (lThi - lTlo) * H;

  const xMaj = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100].filter(v => v >= Ilo * 0.99 && v <= Ihi * 1.01);
  const yMaj = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100].filter(v => v >= tlo * 0.99 && v <= thi * 1.01);
  const xMin = minorTks(xMaj).filter(v => v >= Ilo && v <= Ihi);
  const yMin = minorTks(yMaj).filter(v => v >= tlo && v <= thi);

  const Ipts = useMemo(() => logSpace(Ilo, Ihi, 600), [Ilo, Ihi]);

  const makePath = (vals) => {
    let d = '', pen = false;
    for (let i = 0; i < Ipts.length; i++) {
      const t = vals[i];
      if (!t || !isFinite(t) || t <= 0 || t > tlim * 1.001) { pen = false; continue; }
      const x = xS(Ipts[i]), y = yS(t);
      if (y > H + 6 || y < -6 || x < -3 || x > W + 3) { pen = false; continue; }
      d += pen ? ` L${x.toFixed(1)},${y.toFixed(1)}` : `M${x.toFixed(1)},${y.toFixed(1)}`;
      pen = true;
    }
    return d;
  };

  const curvePaths = useMemo(() => curves.map(c => {
    if (!c.enabled) return '';
    return makePath(Ipts.map(I => curveT(I, c, refV)));
  }), [curves, Ipts, refV, tlim]);

  const xfmrPath = useMemo(() => {
    if (!xfmr.en) return '';
    return makePath(Ipts.map(I => xfmrT(I, xfmr, refV)));
  }, [xfmr, Ipts, refV]);

  const fmtV = v => v < 0.1 ? v.toPrecision(1) : v < 1 ? v.toString() : v >= 10 ? Math.round(v).toString() : v.toString();

  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const sx = VW / r.width, sy = VH / r.height;
    const px = (e.clientX - r.left) * sx - ML;
    const py = (e.clientY - r.top) * sy - MT;
    if (px >= 0 && px <= W && py >= 0 && py <= H) {
      setHov({ x: px, I: 10 ** (lIlo + (px / W) * (lIhi - lIlo)) });
    } else setHov(null);
  };

  const enabledCrvs = curves.filter(c => c.enabled);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
      onMouseMove={onMove}
      onMouseLeave={() => setHov(null)}
    >
      <defs>
        <clipPath id="cc">
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
      </defs>

      <rect x={ML} y={MT} width={W} height={H} fill="#f9fafb" />

      <g transform={`translate(${ML},${MT})`}>
        {/* Minor grid */}
        {xMin.map(v => <line key={v} x1={xS(v)} y1={0} x2={xS(v)} y2={H} stroke="#f0f0f0" strokeWidth={0.5} />)}
        {yMin.map(v => <line key={v} x1={0} y1={yS(v)} x2={W} y2={yS(v)} stroke="#f0f0f0" strokeWidth={0.5} />)}
        {/* Major grid */}
        {xMaj.map(v => <line key={v} x1={xS(v)} y1={0} x2={xS(v)} y2={H} stroke="#e2e8f0" strokeWidth={0.8} />)}
        {yMaj.map(v => <line key={v} x1={0} y1={yS(v)} x2={W} y2={yS(v)} stroke="#e2e8f0" strokeWidth={0.8} />)}

        <g clipPath="url(#cc)">
          {/* Fault markers */}
          {faults.filter(f => f.en).map((f, i) => {
            const Ir = f.I * f.V / refV;
            if (Ir < Ilo || Ir > Ihi) return null;
            return (
              <g key={i}>
                <line x1={xS(Ir)} y1={0} x2={xS(Ir)} y2={H} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6,3" />
                <text x={xS(Ir) - 4} y={H - 4} fontSize={8} fill="#64748b" textAnchor="end"
                  transform={`rotate(-90,${xS(Ir) - 4},${H - 4})`}>{f.label}</text>
              </g>
            );
          })}
          {/* Transformer I²t */}
          {xfmrPath && <path d={xfmrPath} fill="none" stroke="#334155" strokeWidth={2} strokeDasharray="8,4" />}
          {/* Relay curves */}
          {curves.map((c, i) => c.enabled && curvePaths[i]
            ? <path key={i} d={curvePaths[i]} fill="none" stroke={c.color} strokeWidth={2.5} />
            : null
          )}
          {/* HS1 pickup tick */}
          {curves.map((c, i) => {
            if (!c.enabled || !c.hs1on) return null;
            const Ir = c.hs1A / 1000 * c.voltage / refV;
            if (Ir < Ilo || Ir > Ihi) return null;
            return <line key={i} x1={xS(Ir)} y1={0} x2={xS(Ir)} y2={H}
              stroke={c.color} strokeWidth={1} strokeDasharray="3,2" opacity={0.55} />;
          })}
          {/* Hover crosshair */}
          {hov && <>
            <line x1={hov.x} y1={0} x2={hov.x} y2={H} stroke="#475569" strokeWidth={1} strokeDasharray="4,2" opacity={0.7} />
            {curves.map((c, i) => {
              if (!c.enabled) return null;
              const t = curveT(hov.I, c, refV);
              if (!t || t <= 0 || t > tlim || t < tlo) return null;
              return <circle key={i} cx={hov.x} cy={yS(t)} r={4} fill={c.color} />;
            })}
          </>}
        </g>

        <rect x={0} y={0} width={W} height={H} fill="none" stroke="#94a3b8" strokeWidth={1} />

        {/* X axis ticks + labels */}
        {xMaj.map(v => (
          <g key={v}>
            <line x1={xS(v)} y1={H} x2={xS(v)} y2={H + 5} stroke="#64748b" />
            <text x={xS(v)} y={H + 15} textAnchor="middle" fontSize={9} fill="#374151">{fmtV(v)}</text>
          </g>
        ))}
        {/* Y axis ticks + labels */}
        {yMaj.map(v => (
          <g key={v}>
            <line x1={0} y1={yS(v)} x2={-5} y2={yS(v)} stroke="#64748b" />
            <text x={-7} y={yS(v) + 3.5} textAnchor="end" fontSize={9} fill="#374151">{fmtV(v)}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={W / 2} y={H + 36} textAnchor="middle" fontSize={11} fill="#1e293b" fontWeight="600">
          Current (kA) — ref. {refV} kV
        </text>
        <text transform="rotate(-90)" x={-H / 2} y={-45} textAnchor="middle" fontSize={11} fill="#1e293b" fontWeight="600">
          Time (seconds)
        </text>

        {/* Legend */}
        {enabledCrvs.map((c, ri) => (
          <g key={ri} transform={`translate(${W - 140},${ri * 18 + 4})`}>
            <line x1={0} y1={7} x2={18} y2={7} stroke={c.color} strokeWidth={2.5} />
            <text x={22} y={11} fontSize={9} fill="#1e293b">{c.label.slice(0, 16)}</text>
          </g>
        ))}
        {xfmr.en && (
          <g transform={`translate(${W - 140},${enabledCrvs.length * 18 + 4})`}>
            <line x1={0} y1={7} x2={18} y2={7} stroke="#334155" strokeWidth={2} strokeDasharray="8,4" />
            <text x={22} y={11} fontSize={9} fill="#1e293b">{xfmr.label}</text>
          </g>
        )}

        {/* Hover tooltip */}
        {hov && (() => {
          const tl = hov.x > W - 160 ? hov.x - 165 : hov.x + 8;
          const rows = [
            { label: `I = ${hov.I < 1 ? hov.I.toFixed(3) : hov.I.toFixed(2)} kA`, color: '#1e293b', bold: true },
            ...enabledCrvs.map(c => {
              const t = curveT(hov.I, c, refV);
              const s = (!t || t <= 0 || t > tlim || t < tlo) ? '—' : t < 1 ? `${t.toFixed(3)}s` : `${t.toFixed(2)}s`;
              return { label: `${c.label.slice(0, 14)}: ${s}`, color: c.color };
            }),
            xfmr.en && (() => {
              const t = xfmrT(hov.I, xfmr, refV);
              const s = (!t || t <= 0) ? '—' : t < 1 ? `${t.toFixed(3)}s` : `${t.toFixed(2)}s`;
              return { label: `Xfmr I²t: ${s}`, color: '#334155' };
            })(),
          ].filter(Boolean);
          return (
            <g transform={`translate(${tl},4)`}>
              <rect width={158} height={rows.length * 14 + 6} rx={3} fill="white" stroke="#d1d5db" strokeWidth={1} opacity={0.97} />
              {rows.map((r, i) => (
                <text key={i} x={5} y={13 + i * 14} fontSize={9} fill={r.color} fontWeight={r.bold ? '600' : '400'}>{r.label}</text>
              ))}
            </g>
          );
        })()}
      </g>
    </svg>
  );
}
