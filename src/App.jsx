import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import FaultCalcHome from './features/faultCalc/pages/Home';
import GridImpedanceHome from './features/gridImpedance/pages/Home';
import ArcFlashHome from './features/IEEE1584_ArcFlash/pages/Home';
import ProtCoordHome from './features/protCoord/pages/Home';
import TransformerRXHome from './features/transformerRX/pages/Home';
import KtFactorHome from './features/ktFactor/pages/Home';
import PlotDataExtractorHome from './features/plotDataExtractor/pages/Home';

export default function App() {
  return (
    <Routes>
      <Route path="/"                    element={<LandingPage />} />
      <Route path="/fault-calc"          element={<FaultCalcHome />} />
      <Route path="/grid-impedance"      element={<GridImpedanceHome />} />
      <Route path="/arc-flash"           element={<ArcFlashHome />} />
      <Route path="/prot-coord"          element={<ProtCoordHome />} />
      <Route path="/transformer-rx"      element={<TransformerRXHome />} />
      <Route path="/kt-factor"           element={<KtFactorHome />} />
      <Route path="/plot-data-extractor" element={<PlotDataExtractorHome />} />
      <Route path="*"                    element={<Navigate to="/" replace />} />
    </Routes>
  );
}
