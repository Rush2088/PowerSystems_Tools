import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  pixelToData, recomputeAllSeries, seriesToCSV, SERIES_COLORS,
} from '../utils/plotExtractorCalc';
import StepNav     from '../components/StepNav';
import Step1Upload from '../components/Step1Upload';
import Step2Calibrate from '../components/Step2Calibrate';
import Step3Collect   from '../components/Step3Collect';

// ─── uid ─────────────────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => String(++_uid);
const mkSeries = (name, color) => ({ id: uid(), name, color, points: [] });

const INIT_CALIB_VALUES = { x1: '', x2: '', y1: '', y2: '' };
const INIT_CALIB_PIXELS = [null, null, null, null];

// ─── Orchestrator ─────────────────────────────────────────────────────────────
export default function Home() {
  // ── Image ──
  const [img, setImg]         = useState(null);
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });
  const [step, setStep]       = useState(1);

  // ── Calibration (persisted across step changes — never cleared unless user asks) ──
  const [calibStep, setCalibStep]     = useState(0);
  const [calibPixels, setCalibPixels] = useState(INIT_CALIB_PIXELS);
  const [calibValues, setCalibValues] = useState(INIT_CALIB_VALUES);
  const [axisConfig, setAxisConfig]   = useState({ xType: 'linear', yType: 'linear' });

  // ── Series & points ──
  const [series, setSeries]           = useState([mkSeries('Series 1', SERIES_COLORS[0])]);
  const [activeSeriesId, setActiveSId] = useState(null);
  const [selected, setSelected]       = useState(null);
  const [editVal, setEditVal]         = useState({ x: '', y: '' });
  const [hovered, setHovered]         = useState(null);
  const [copyDone, setCopyDone]       = useState(false);

  // ── Derived ──
  const valKeys = ['x1', 'x2', 'y1', 'y2'];
  const calibComplete = calibPixels.every(Boolean) &&
    valKeys.every(k => calibValues[k] !== '' && isFinite(Number(calibValues[k])));

  const buildCalib = useCallback(() => ({
    x1: { ...calibPixels[0], val: Number(calibValues.x1) },
    x2: { ...calibPixels[1], val: Number(calibValues.x2) },
    y1: { ...calibPixels[2], val: Number(calibValues.y1) },
    y2: { ...calibPixels[3], val: Number(calibValues.y2) },
    xType: axisConfig.xType,
    yType: axisConfig.yType,
  }), [calibPixels, calibValues, axisConfig]);

  const totalPoints = series.reduce((acc, s) => acc + s.points.length, 0);

  // ── Step 1: Image load ────────────────────────────────────────────────────
  function handleImageLoad(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setImgSize({ w: image.naturalWidth, h: image.naturalHeight });
      setStep(2);
      setCalibStep(0);
      setCalibPixels(INIT_CALIB_PIXELS);
      setCalibValues(INIT_CALIB_VALUES);
      setSeries([mkSeries('Series 1', SERIES_COLORS[0])]);
      setSelected(null);
      setActiveSId(null);
    };
    image.src = url;
  }

  // ── Step 2: Calibration ───────────────────────────────────────────────────
  function handleCalibCanvasClick(px, py) {
    const next = [...calibPixels];
    next[calibStep] = { px, py };
    setCalibPixels(next);
    // advance to next un-picked slot
    let ns = calibStep + 1;
    while (ns < 4 && next[ns]) ns++;
    if (ns < 4) setCalibStep(ns);
  }

  function resetCalibPoint(i) {
    const next = [...calibPixels]; next[i] = null;
    setCalibPixels(next);
    setCalibStep(i);
  }

  function resetAllCalib() {
    setCalibPixels(INIT_CALIB_PIXELS);
    setCalibValues(INIT_CALIB_VALUES);
    setCalibStep(0);
  }

  function finishCalibration() {
    if (!calibComplete) return;
    const calib = buildCalib();
    // Recompute any existing points with the new calibration
    setSeries(prev => recomputeAllSeries(prev, calib));
    setStep(3);
    setActiveSId(id => id ?? series[0]?.id);
  }

  // ── Step 3: Point collection ──────────────────────────────────────────────
  function handleAddPoint(px, py) {
    const calib = buildCalib();
    const { x, y } = pixelToData(px, py, calib);
    const newPt = { id: uid(), px, py, x, y };
    const targetId = activeSeriesId ?? series[0]?.id;
    setActiveSId(targetId);
    setSeries(prev => prev.map(s =>
      s.id === targetId ? { ...s, points: [...s.points, newPt] } : s
    ));
    setSelected(null);
  }

  function handleSelectPoint(hit) {
    setSelected(hit);
    const s = series.find(s => s.id === hit.seriesId);
    const pt = s?.points.find(p => p.id === hit.pointId);
    if (pt) setEditVal({ x: pt.x.toPrecision(6), y: pt.y.toPrecision(6) });
  }

  function handleDragPoint(hit, px, py) {
    const calib = buildCalib();
    const { x, y } = pixelToData(px, py, calib);
    setSeries(prev => prev.map(s =>
      s.id === hit.seriesId ? {
        ...s,
        points: s.points.map(p => p.id === hit.pointId ? { ...p, px, py, x, y } : p),
      } : s
    ));
    if (selected?.seriesId === hit.seriesId && selected?.pointId === hit.pointId) {
      setEditVal({ x: x.toPrecision(6), y: y.toPrecision(6) });
    }
  }

  function deleteSelected() {
    if (!selected) return;
    setSeries(prev => prev.map(s =>
      s.id === selected.seriesId
        ? { ...s, points: s.points.filter(p => p.id !== selected.pointId) }
        : s
    ));
    setSelected(null);
  }

  function applyEdit() {
    if (!selected) return;
    const nx = Number(editVal.x), ny = Number(editVal.y);
    if (!isFinite(nx) || !isFinite(ny)) return;
    setSeries(prev => prev.map(s =>
      s.id === selected.seriesId ? {
        ...s,
        points: s.points.map(p =>
          p.id === selected.pointId ? { ...p, x: nx, y: ny } : p
        ),
      } : s
    ));
  }

  function deletePoint(seriesId, pointId) {
    setSeries(prev => prev.map(s =>
      s.id === seriesId ? { ...s, points: s.points.filter(p => p.id !== pointId) } : s
    ));
    if (selected?.seriesId === seriesId && selected?.pointId === pointId) setSelected(null);
  }

  // ── Series management ─────────────────────────────────────────────────────
  function addSeries() {
    const idx = series.length % SERIES_COLORS.length;
    const s = mkSeries(`Series ${series.length + 1}`, SERIES_COLORS[idx]);
    setSeries(prev => [...prev, s]);
    setActiveSId(s.id);
  }

  function deleteSeries(id) {
    const next = series.filter(s => s.id !== id);
    setSeries(next);
    if (activeSeriesId === id) setActiveSId(next[0]?.id ?? null);
    if (selected?.seriesId === id) setSelected(null);
  }

  function renameSeries(id, name) {
    setSeries(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }

  // ── Navigation helpers ────────────────────────────────────────────────────
  function startRecalibrate() {
    setStep(2);
    resetAllCalib();
    setSelected(null);
  }

  function resetAll() {
    setStep(2);
    resetAllCalib();
    setSeries([mkSeries('Series 1', SERIES_COLORS[0])]);
    setActiveSId(null);
    setSelected(null);
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function exportCSV() {
    const csv = seriesToCSV(series);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'plot_data.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(seriesToCSV(series)).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen px-4 py-4 sm:px-5 sm:py-5">
      {/* Top bar: Home button + title */}
      <div className="mx-auto mb-3 flex max-w-[1500px] items-center gap-4">
        <Link to="/" className="primary-action-button shrink-0 gap-1.5 px-4 py-2.5 text-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
          </svg>
          Home
        </Link>
        <div>
          <h1 className="text-base font-extrabold leading-tight text-white">Plot Data Extractor</h1>
          <p className="text-[11px] text-slate-400">Extract data points from linear or log scale plots.</p>
        </div>
        {/* Load new image shortcut (visible after step 1) */}
        {step > 1 && (
          <label className="ml-auto cursor-pointer rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition shrink-0">
            ↑ New Image
            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageLoad(e.target.files?.[0])} />
          </label>
        )}
      </div>

      {/* Step progress */}
      <div className="mx-auto mb-3 max-w-[1500px]">
        <StepNav step={step} step1Done={!!img} step2Done={step === 3} />
      </div>

      {/* Step content */}
      <div className="mx-auto max-w-[1500px]">
        {step === 1 && (
          <Step1Upload onLoad={handleImageLoad} />
        )}

        {step === 2 && (
          <Step2Calibrate
            img={img}
            imgSize={imgSize}
            calibStep={calibStep}
            calibPixels={calibPixels}
            calibValues={calibValues}
            axisConfig={axisConfig}
            calibComplete={calibComplete}
            onCanvasClick={handleCalibCanvasClick}
            onValuesChange={setCalibValues}
            onAxisChange={setAxisConfig}
            onResetPoint={resetCalibPoint}
            onResetAll={resetAllCalib}
            onFinish={finishCalibration}
          />
        )}

        {step === 3 && (
          <Step3Collect
            img={img}
            imgSize={imgSize}
            calibPixels={calibPixels}
            series={series}
            activeSeriesId={activeSeriesId}
            selected={selected}
            hovered={hovered}
            editVal={editVal}
            totalPoints={totalPoints}
            copyDone={copyDone}
            onAddPoint={handleAddPoint}
            onSelectPoint={handleSelectPoint}
            onDragPoint={handleDragPoint}
            onHoverChange={setHovered}
            onEditValChange={setEditVal}
            onApplyEdit={applyEdit}
            onDeleteSelected={deleteSelected}
            onSetActiveSeries={setActiveSId}
            onAddSeries={addSeries}
            onDeleteSeries={deleteSeries}
            onRenameSeries={renameSeries}
            onDeletePoint={deletePoint}
            onRecalibrate={startRecalibrate}
            onReset={resetAll}
            onExportCSV={exportCSV}
            onCopy={copyToClipboard}
          />
        )}
      </div>
    </main>
  );
}
