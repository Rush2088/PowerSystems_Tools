import { Link } from 'react-router-dom';
import { useState } from 'react';
import KtFactorCard from '../components/KtFactorCard';
import { DEFAULT_MAIN, DEFAULT_SUT } from '../utils/ktFactorCalc';

export default function Home() {
  const [mainValues, setMainValues] = useState(DEFAULT_MAIN);
  const [sutValues,  setSutValues]  = useState(DEFAULT_SUT);

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto mb-4 flex max-w-[1100px] items-center justify-between">
        <Link to="/" className="primary-action-button gap-1.5 px-5 py-3 text-base">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
          </svg>
          Home
        </Link>
      </div>

      <div className="mx-auto max-w-[1100px]">
        <KtFactorCard
          mainValues={mainValues} setMainValues={setMainValues}
          sutValues={sutValues}   setSutValues={setSutValues}
        />
      </div>
    </main>
  );
}
