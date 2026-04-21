import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import FaultCalcHome from './features/faultCalc/pages/Home';
import GridImpedanceHome from './features/gridImpedance/pages/Home';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/fault-calc" element={<FaultCalcHome />} />
      <Route path="/grid-impedance" element={<GridImpedanceHome />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
