import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const TOOLS = [
  {
    title: 'Fault Level Calculator',
    description: 'IEC 60909 short-circuit tool with transformer K-factor and optional inverter contribution.',
    route: '/fault-calc',
  },
  {
    title: 'Grid Impedance Calculator',
    description: 'Calculate Pos. and Zero-sequence source impedance from LLL and LG fault levels.',
    route: '/grid-impedance',
  },
  {
    title: 'Arc Flash Calculator',
    description: 'IEEE 1584-2018 incident energy, arc-flash boundary and PPE category — VCB, VCBB, HCB, VOA, HOA · 208 V – 15 kV.',
    route: '/arc-flash',
  },
  {
    title: 'Protection Coordination',
    description: 'Interactive overcurrent TCC plotter — IEC / ANSI / IEEE curves, highset stages, transformer I²t, grading margin table.',
    route: '/prot-coord',
  },
  {
    title: 'Transformer R & X Calculator',
    description: 'Derive series resistance and reactance from FAT nameplate and short-circuit (load loss) test data — per-unit, HV and LV ohmic values, X/R ratio and impedance phasor.',
    route: '/transformer-rx',
  },
  {
    title: 'Plot Data Extractor',
    description: 'Upload a chart image and extract X–Y data points with precision. Calibrate linear or log axes, manage multiple data series, drag-to-edit points, and export to CSV.',
    route: '/plot-data-extractor',
  },
];

const COLS = 2; // grid columns on sm+

function ToolCard({ title, description, focused, onClick, cardRef }) {
  return (
    <button
      ref={cardRef}
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={[
        'rounded-3xl border px-6 py-6 text-left text-white transition',
        focused
          ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_0_3px_rgba(34,211,238,0.35)] scale-[1.02]'
          : 'border-cyan-300/20 bg-cyan-500/15 hover:bg-cyan-500/25',
      ].join(' ')}
    >
      <div className="text-2xl font-extrabold tracking-tight">{title}</div>
      <div className="mt-2 text-xs italic text-slate-300">{description}</div>
      {focused && (
        <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
          Press Enter to open ↵
        </div>
      )}
    </button>
  );
}

export default function LandingPage() {
  const navigate   = useNavigate();
  const [focused, setFocused] = useState(null);
  const cardRefs   = useRef(TOOLS.map(() => null));

  // Scroll focused card into view
  useEffect(() => {
    if (focused !== null) {
      cardRefs.current[focused]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focused]);

  const handleKeyDown = useCallback((e) => {
    const n = TOOLS.length;

    // If no card is focused yet, any arrow key activates the first card
    if (focused === null) {
      if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();
        setFocused(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        setFocused(f => (f + 1) % n);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setFocused(f => (f - 1 + n) % n);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocused(f => Math.min(f + COLS, n - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocused(f => Math.max(f - COLS, 0));
        break;
      case 'Enter':
        e.preventDefault();
        navigate(TOOLS[focused].route);
        break;
      case 'Escape':
        setFocused(null);
        break;
      default:
        break;
    }
  }, [focused, navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl glass-card p-6 sm:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Power System Tools
          </div>
          <p className="mt-5 text-base text-slate-300 sm:text-lg">
            Collection of IEC / IEEE based tools for Power Systems and protection calculations
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">
          {TOOLS.map((tool, i) => (
            <ToolCard
              key={tool.route}
              title={tool.title}
              description={tool.description}
              focused={focused === i}
              onClick={() => navigate(tool.route)}
              cardRef={el => { cardRefs.current[i] = el; }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
