import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import ArcFlashCard from '../components/ArcFlashCard';
import { DEFAULT_VALUES, validateInputs, calculateArcFlash } from '../utils/arcFlashCalc';

export default function Home() {
  const [values, setValues] = useState(DEFAULT_VALUES);

  const { result, error } = useMemo(() => {
    const validation = validateInputs(values);
    if (!validation.valid) {
      return { result: null, error: validation.message };
    }
    return {
      result: calculateArcFlash(validation.parsed),
      error: '',
    };
  }, [values]);

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto mb-4 flex max-w-[920px] items-center justify-between">
        <Link to="/" className="primary-action-button px-6 py-3 text-base">
          ← Home
        </Link>
      </div>
      <div className="mx-auto max-w-[920px]">
        <ArcFlashCard
          values={values}
          setValues={setValues}
          result={result}
          error={error}
        />
      </div>
    </main>
  );
}
