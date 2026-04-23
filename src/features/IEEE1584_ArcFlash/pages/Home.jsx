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
        <Link to="/" className="primary-action-button gap-1.5 px-5 py-3 text-base">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
          Home
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
