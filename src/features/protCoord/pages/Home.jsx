import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import TCCChart   from '../components/TCCChart';
import GradingTable from '../components/GradingTable';
import CurveForm  from '../components/CurveForm';
import ExtrasForm from '../components/ExtrasForm';
import {
  INIT_CURVES, INIT_FAULTS, INIT_XFMR, INIT_PLOT,
  logSpace, curveT,
} from '../utils/curveCalc';

export default function Home() {
  const [curves,     setCurves]     = useState(INIT_CURVES);
  const [faults,     setFaults]     = useState(INIT_FAULTS);
  const [xfmr,       setXfmr]       = useState(INIT_XFMR);
  const [plot,       setPlot]       = useState(INIT_PLOT);
  const [tab,        setTab]        = useState(0);   // 0-5 = curves, 6 = extras
  const [tableOpen,  setTableOpen]  = useState(true);
  const [copyMsg,    setCopyMsg]    = useState('');
  const svgRef = useRef(null);

  const updCrv = (idx, key, val) =>
    setCurves(cs => cs.map((c, i) => i === idx ? { ...c, [key]: val } : c));

  // ── Copy curve data as TSV (paste into Excel) ────────────────────────────
  const copyData = () => {
    const enabled = curves.filter(c => c.enabled);
    if (!enabled.length) return;
    const Ipts  = logSpace(0.01, 50, 150);
    const header = ['Current (kA)', ...enabled.map(c => `${c.label} (s)`)].join('\t');
    const rows   = Ipts.map(I => {
      const ts = enabled.map(c => {
        const t = curveT(I, c, plot.refV);
        return (!t || t <= 0 || !isFinite(t)) ? '' : t.toFixed(4);
      });
      return [I.toFixed(5), ...ts].join('\t');
    });
    navigator.clipboard.writeText([header, ...rows].join('\n')).then(() => {
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    });
  };

  // ── Save chart as PNG ────────────────────────────────────────────────────
  const savePlot = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const vb    = svg.viewBox.baseVal;
    const W = vb.width, H = vb.height;
    const scale = 2;
    const clone = svg.cloneNode(true);
    clone.setAttribute('width',  String(W));
    clone.setAttribute('height', String(H));
    clone.setAttribute('xmlns',  'http://www.w3.org/2000/svg');
    clone.style.cssText = '';
    const xml  = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = 'TCC_Plot.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  // ── Tab definitions ──────────────────────────────────────────────────────
  const TABS = [
    ...curves.map((c, i) => ({ id: i, label: `C${i + 1}`, color: c.color, dim: !c.enabled })),
    { id: 6, label: '⚙', color: null, dim: false, settings: true },
  ];

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100vh' }}>

      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-slate-950 px-4 py-2.5">
        <Link to="/" className="primary-action-button px-4 py-2 text-sm shrink-0">
          ← Home
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">⚡ Protection Coordination</div>
          <div className="text-[10px] text-slate-500">Overcurrent TCC — Interactive Tool</div>
        </div>
        <button
          onClick={copyData}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700 transition"
        >
          📋 {copyMsg || 'Copy Data'}
        </button>
        <button
          onClick={savePlot}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-cyan-400 transition"
        >
          🖼 Save Plot
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Sidebar ── */}
        <div className="flex w-[272px] shrink-0 flex-col border-r border-white/10 bg-slate-950">

          {/* Tab strip */}
          <div className="flex flex-wrap gap-1 border-b border-white/10 px-2 pt-2 pb-1.5">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] transition
                  ${t.settings
                    ? tab === t.id ? 'bg-slate-700 text-cyan-400 font-semibold' : 'bg-slate-800/60 text-cyan-500 border border-cyan-500/30 font-semibold'
                    : tab === t.id ? 'bg-blue-700 text-white'                   : t.dim ? 'text-slate-600' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {t.color && (
                  <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: t.color }} />
                )}
                {t.label}
              </button>
            ))}
          </div>

          {/* Active curve name */}
          {tab < 6 && (
            <div className="border-b border-white/10 px-3 py-1.5 text-[11px] font-semibold" style={{ color: curves[tab].color }}>
              {curves[tab].label}
            </div>
          )}

          {/* Form */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {tab < 6
              ? <CurveForm crv={curves[tab]} onChange={(k, v) => updCrv(tab, k, v)} />
              : <ExtrasForm plot={plot} setPlot={setPlot} faults={faults} setFaults={setFaults} xfmr={xfmr} setXfmr={setXfmr} />
            }
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex flex-1 min-w-0 flex-col bg-slate-50">

          {/* Chart label bar */}
          <div className="flex shrink-0 items-center border-b border-slate-200 bg-slate-100 px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">TCC Plot</span>
          </div>

          {/* Chart area */}
          <div className="flex flex-1 min-h-0 items-center justify-center overflow-hidden p-2">
            <TCCChart
              curves={curves}
              faults={faults}
              xfmr={xfmr}
              plot={plot}
              svgRef={svgRef}
            />
          </div>

          {/* Grading table — collapsible */}
          <div className="flex shrink-0 flex-col border-t border-slate-200 bg-white"
            style={{ maxHeight: tableOpen ? '28vh' : 'auto' }}>
            <button
              onClick={() => setTableOpen(o => !o)}
              className="flex shrink-0 w-full items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition text-left"
            >
              <span>Grading Margin Table</span>
              <span className="text-xs text-slate-400 transition-transform duration-200"
                style={{ display: 'inline-block', transform: tableOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▾
              </span>
            </button>
            {tableOpen && (
              <div className="flex-1 overflow-auto">
                <GradingTable curves={curves} faults={faults} plot={plot} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
