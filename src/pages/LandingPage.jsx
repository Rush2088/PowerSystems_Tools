import { useNavigate } from 'react-router-dom';

function ToolCard({ title, description, primary = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? 'rounded-3xl border border-orange-300/20 bg-orange-400 px-6 py-6 text-left text-slate-950 shadow-lg transition hover:bg-orange-300'
          : 'rounded-3xl border border-orange-300/20 bg-orange-500/15 px-6 py-6 text-left text-white transition hover:bg-orange-500/25'
      }
    >
      <div className="text-2xl font-extrabold tracking-tight">{title}</div>
      <div className={primary ? 'mt-2 text-sm font-medium text-slate-900/80' : 'mt-2 text-sm text-slate-300'}>
        {description}
      </div>
    </button>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl glass-card p-6 sm:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
            Power System Tools
          </div>
          <p className="mt-5 text-base text-slate-300 sm:text-lg">
            Collection of IEC based tools for Power Systems and protection calculations
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">
          <ToolCard
            title="Fault Level Calculator"
            description="IEC 60909 short-circuit tool with transformer K-factor and optional inverter contribution."
            primary
            onClick={() => navigate('/fault-calc')}
          />
          <ToolCard
            title="Grid Impedance Calculator"
            description="Calculate positive- and zero-sequence source impedance from LLL and LG fault levels."
            onClick={() => navigate('/grid-impedance')}
          />
        </div>
      </div>
    </main>
  );
}