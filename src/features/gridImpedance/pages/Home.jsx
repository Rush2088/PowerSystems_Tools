import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Home as HomeIcon } from "lucide-react";
import ResultsCard from '../components/ResultsCard';
import {
  DEFAULT_VALUES,
  calculateSequenceImpedance,
  validateInputs,
} from '../utils/faultUtils';

export default function Home() {
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [step, setStep] = useState(1);

  const { result, error } = useMemo(() => {
    const validation = validateInputs(values);

    if (!validation.valid) {
      return { result: null, error: validation.message };
    }

    const { V_LL_kV, I_LLL_kA, I_LG_kA, XR_LLL, XR_LG } = validation.parsed;

    return {
      result: calculateSequenceImpedance(V_LL_kV, I_LLL_kA, I_LG_kA, XR_LLL, XR_LG),
      error: '',
    };
  }, [values]);

  function handleReset() {
    setValues(DEFAULT_VALUES);
    setStep(1);
  }

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto mb-4 flex max-w-[920px] items-center justify-between">
        <Link
  to="/"
  className="primary-action-button px-5 py-3 flex items-center gap-2 text-base"
>
  <HomeIcon size={20} />
  <span>Home</span>
</Link>
      </div>
      <div className="mx-auto max-w-[920px]">
        <ResultsCard
          values={values}
          setValues={setValues}
          result={result}
          error={error}
          step={step}
          setStep={setStep}
          onReset={handleReset}
        />
      </div>
    </main>
  );
}