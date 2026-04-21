import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import ResultsCard from '../components/ResultsCard';
import {
  DEFAULT_VALUES,
  calculateFaultLevel,
  validateInputs,
} from '../utils/faultUtils';

export default function Home() {
  const [values, setValues] = useState(DEFAULT_VALUES);

  const { result, error } = useMemo(() => {
    const validation = validateInputs(values);

    if (!validation.valid) {
      return { result: null, error: validation.message };
    }

    const {
      gridKA,
      hvKV,
      lvKV,
      txMVA,
      txZ,
      cFactor,
      considerKFactor,
      addInverterContribution,
      inverterMVA,
      inverterCount,
      inverterMaxCurrentFactor,
    } = validation.parsed;

    return {
      result: calculateFaultLevel(
        gridKA,
        hvKV,
        lvKV,
        txMVA,
        txZ,
        cFactor,
        considerKFactor,
        addInverterContribution,
        inverterMVA,
        inverterCount,
        inverterMaxCurrentFactor,
      ),
      error: '',
    };
  }, [values]);

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto mb-4 flex max-w-[920px] items-center justify-between">
        <Link
          to="/"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          ← Home
        </Link>
      </div>
      <div className="mx-auto max-w-[920px]">
        <ResultsCard
          values={values}
          setValues={setValues}
          result={result}
          error={error}
        />
      </div>
    </main>
  );
}
