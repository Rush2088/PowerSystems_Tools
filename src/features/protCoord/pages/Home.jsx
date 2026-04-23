import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import TCCChart    from '../components/TCCChart';
import GradingTable from '../components/GradingTable';
import CurveForm   from '../components/CurveForm';
import ExtrasForm  from '../components/ExtrasForm';
import {
  INIT_CURVES, INIT_FAULTS, INIT_XFMR, INIT_PLOT,
  logSpace, curveT,
} from '../utils/curveCalc';

const BORDER_CLR = 'rgba(255,255,255,0.08)';

// Sidebar / top-bar: same #1f2328 base as the app body, with spotlight radial gradients
const SIDEBAR_STYLE = {
  background: '#1f2328',
  backgroundImage: [
    'radial-gradient(circle at 20% 18%, rgba(79,140,255,0.13), transparent 50%)',
    'radial-gradient(circle at 80% 72%, rgba(34,211,238,0.09), transparent 42%)',
    'radial-gradient(circle at 8%  88%, rgba(255,255,255,0.04), transparent 32%)',
    'repeating-linear-gradient(0deg,rgba(255,255,255,0.012) 0px,rgba(255,255,255,0.012) 1px,transparent 1px,transparent 3px)',
  ].join(','),
};

const TOPBAR_STYLE = {
  background: 'rgba(31,35,40,0.97)',
  borderBottom: `1px solid ${BORDER_CLR}`,
  backdropFilter: 'blur(8px)',
};

// Chart area: warm off-white "iced coffee" tone
const CHART_BG = '#f0ebe3';

export default function Home() {
  const [curves,    setCurves]    = useState(INIT_CURVES);
  const [faults,    setFaults]    = useState(INIT_FAULTS);
  const [xfmr,      setXfmr]      = useState(INIT_XFMR);
  const [plot,      setPlot]      = useState(INIT_PLOT);
  const [tab,       setTab]       = useState(0);
  const [tableOpen, setTableOpen] = useState(true);
  const [copyMsg,   setCopyMsg]   = useState('');
  const chartContainerRef = useRef(null);

  const updCrv = (idx, key, val) =>
    setCurves(cs => cs.map((c, i) => i === idx ? { ...c, [key]: val } : c));

  // ── Copy curve data as TSV ───────────────────────────────────────────────
  const copyData = () => {
    const enabled = curves.filter(c => c.enabled);
    if (!enabled.length) return;
    const Ipts   = logSpace(0.01, 50, 150);
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
    const container = chartContainerRef.current;
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const vb = svg.viewBox?.baseVal;
    const W  = vb?.width  || svg.clientWidth  || 740;
    const H  = vb?.height || svg.clientHeight || 480;
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
      ctx.fillStyle = CHART_BG;
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

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100vh' }}>

      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center gap-3 px-4 py-2.5" style={TOPBAR_STYLE}>
        <Link to="/" className="primary-action-button shrink-0 gap-1.5 px-4 py-2 text-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
          Home
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-white">⚡ Protection Coordination</div>
          <div className="text-[10px] text-slate-500">Overcurrent TCC — Interactive Tool</div>
        </div>
        <button
          onClick={copyData}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] text-slate-300 transition hover:bg-white/[0.12]"
        >
          📋 {copyMsg || 'Copy Data'}
        </button>
        <button
          onClick={savePlot}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          🖼 Save Plot
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Sidebar ── */}
        <div
          className="flex w-[272px] shrink-0 flex-col"
          style={{ ...SIDEBAR_STYLE, borderRight: `1px solid ${BORDER_CLR}` }}
        >
          {/* Tab strip */}
          <div className="flex flex-wrap gap-1 px-2 pt-2 pb-1.5" style={{ borderBottom: `1px solid ${BORDER_CLR}` }}>
            {curves.map((c, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] transition
                  ${tab === i
                    ? 'bg-cyan-500/20 font-semibold text-cyan-300 border border-cyan-500/40'
                    : c.enabled ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600'
                  }`}
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: c.color, opacity: c.enabled ? 1 : 0.35 }}
                />
                Curve {i + 1}
              </button>
            ))}
            <button
              onClick={() => setTab(6)}
              className={`rounded px-2.5 py-1 text-[11px] font-semibold transition
                ${tab === 6
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'border border-cyan-500/20 text-cyan-500/70 hover:text-cyan-400'
                }`}
            >
              ⚙
            </button>
          </div>

          {/* Active curve name */}
          {tab < 6 && (
            <div
              className="px-3 py-1.5 text-[11px] font-semibold"
              style={{ color: curves[tab].color, borderBottom: `1px solid ${BORDER_CLR}` }}
            >
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
        <div className="flex flex-1 min-w-0 flex-col">

          {/* Chart label bar */}
          <div
            className="flex shrink-0 items-center px-3 py-1.5"
            style={{ borderBottom: `1px solid ${BORDER_CLR}`, background: 'rgba(31,35,40,0.97)' }}
          >
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-200">TCC Plot</span>
          </div>

          {/* Chart area — warm iced-coffee background */}
          <div
            ref={chartContainerRef}
            className="flex flex-1 min-h-0 overflow-hidden p-3"
            style={{ background: CHART_BG }}
          >
            <TCCChart curves={curves} faults={faults} xfmr={xfmr} plot={plot} />
          </div>

          {/* Grading table — collapsible */}
          <div
            className="flex shrink-0 flex-col"
            style={{
              borderTop: `1px solid ${BORDER_CLR}`,
              background: 'rgba(255,255,255,0.03)',
              maxHeight: tableOpen ? '28vh' : 'auto',
            }}
          >
            <button
              onClick={() => setTableOpen(o => !o)}
              className="flex w-full shrink-0 items-center justify-between px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 transition hover:text-slate-300"
              style={{ borderBottom: tableOpen ? `1px solid ${BORDER_CLR}` : 'none' }}
            >
              <span className="font-bold text-slate-200">Grading Margin Table</span>
              <span
                className="inline-block text-xs text-slate-400 transition-transform duration-200"
                style={{ transform: tableOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
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
