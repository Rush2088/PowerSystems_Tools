const STEPS = [
  { num: 1, label: 'Upload Plot Image' },
  { num: 2, label: 'Calibrate Axes' },
  { num: 3, label: 'Add Series & Mark Data Points' },
];

export default function StepNav({ step, step1Done, step2Done }) {
  const isDone  = [false, step1Done, step2Done];
  const isActive = [step === 1, step === 2, step === 3];

  return (
    <div className="grid grid-cols-3 gap-2">
      {STEPS.map((s, i) => {
        const done   = isDone[i];
        const active = isActive[i];
        return (
          <div
            key={s.num}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              active ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-200' :
              done   ? 'bg-green-500/10 border border-green-400/20 text-green-300' :
                       'bg-white/5 border border-white/10 text-slate-500'
            }`}
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
              active ? 'bg-cyan-500 text-white' :
              done   ? 'bg-green-500 text-white' :
                       'bg-white/10 text-slate-500'
            }`}>
              {done ? '✓' : s.num}
            </span>
            <span>
              <span className="opacity-50 mr-0.5">Step {s.num}:</span>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
