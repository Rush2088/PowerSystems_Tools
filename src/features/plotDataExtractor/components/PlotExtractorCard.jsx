import { useState, useRef, useEffect, useCallback } from 'react';
import {
  pixelToData, recomputeAllSeries, getTransform,
  imgToCanvas, canvasToImg,
  seriesToCSV, SERIES_COLORS, CALIB_LABELS, CALIB_COLORS,
} from '../utils/plotExtractorCalc';

// ─── tiny uid ────────────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => String(++_uid);

// ─── Initial state helpers ────────────────────────────────────────────────────
const mkSeries = (name, color) => ({ id: uid(), name, color, points: [] });
const INIT_CALIB_VALUES = { x1: '', x2: '', y1: '', y2: '' };
const INIT_CALIB_PIXELS = [null, null, null, null];

// ─── Step badge ───────────────────────────────────────────────────────────────
function StepBadge({ num, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
      active ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-200' :
      done   ? 'bg-green-500/10 border border-green-400/20 text-green-300' :
               'bg-white/5 border border-white/10 text-slate-500'
    }`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
        active ? 'bg-cyan-500 text-white' :
        done   ? 'bg-green-500 text-white' :
                 'bg-white/10 text-slate-500'
      }`}>
        {done ? '✓' : num}
      </span>
      <span><span className="opacity-60 mr-0.5">Step {num}:</span> {label}</span>
    </div>
  );
}

// ─── Copy icon ────────────────────────────────────────────────────────────────
function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  );
}

// ─── Draw canvas ─────────────────────────────────────────────────────────────
function drawCanvas(canvas, img, calibPixels, series, selected, hovered, mode, transform) {
  const ctx = canvas.getContext('2d');
  const { scale, offsetX, offsetY } = transform;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // image
  ctx.drawImage(img, offsetX, offsetY, img.naturalWidth * scale, img.naturalHeight * scale);

  // calibration markers
  calibPixels.forEach((pt, i) => {
    if (!pt) return;
    const { cx, cy } = imgToCanvas(pt.px, pt.py, transform);
    const col = CALIB_COLORS[i];
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12); ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(CALIB_LABELS[i], cx + 7, cy - 7);
    ctx.restore();
  });

  if (mode !== 'collect') return;

  // data points
  series.forEach(s => {
    s.points.forEach((pt, idx) => {
      const { cx, cy } = imgToCanvas(pt.px, pt.py, transform);
      const isSel = selected?.seriesId === s.id && selected?.pointId === pt.id;
      const isHov = hovered?.seriesId === s.id && hovered?.pointId === pt.id;
      ctx.save();
      if (isSel) {
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, isSel ? 7 : isHov ? 6 : 5, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = '#000000aa';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${isSel ? 9 : 8}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), cx, cy);
      ctx.restore();
    });
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PlotExtractorCard() {
  const [img, setImg]           = useState(null);
  const [imgSize, setImgSize]   = useState({ w: 1, h: 1 });
  const [mode, setMode]         = useState('upload');

  // calibration — pixels and values are tracked independently
  // so value inputs are always visible and editable regardless of pixel state
  const [calibStep, setCalibStep]     = useState(0);
  const [calibPixels, setCalibPixels] = useState(INIT_CALIB_PIXELS);
  const [calibValues, setCalibValues] = useState(INIT_CALIB_VALUES);
  const [axisConfig, setAxisConfig]   = useState({ xType: 'linear', yType: 'linear' });

  // series & points
  const [series, setSeries]           = useState([mkSeries('Series 1', SERIES_COLORS[0])]);
  const [activeSeriesId, setActiveSId] = useState(null);
  const [selected, setSelected]       = useState(null);
  const [editVal, setEditVal]         = useState({ x: '', y: '' });
  const [hovered, setHovered]         = useState(null);
  const [copyDone, setCopyDone]       = useState(false);

  // canvas refs
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const transformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const dragRef      = useRef(null);

  // ─── Derived ─────────────────────────────────────────────────────────────
  const valKeys = ['x1', 'x2', 'y1', 'y2'];

  // Calibration is complete when all 4 pixels are picked AND all 4 values are non-empty numbers
  const calibComplete = calibPixels.every(Boolean) &&
    valKeys.every(k => calibValues[k] !== '' && isFinite(Number(calibValues[k])));

  const totalPoints = series.reduce((acc, s) => acc + s.points.length, 0);

  const buildCalib = useCallback(() => ({
    x1: { ...calibPixels[0], val: Number(calibValues.x1) },
    x2: { ...calibPixels[1], val: Number(calibValues.x2) },
    y1: { ...calibPixels[2], val: Number(calibValues.y1) },
    y2: { ...calibPixels[3], val: Number(calibValues.y2) },
    xType: axisConfig.xType,
    yType: axisConfig.yType,
  }), [calibPixels, calibValues, axisConfig]);

  // ─── Canvas draw ──────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const container = containerRef.current;
    canvas.width  = container.clientWidth;
    canvas.height = container.clientHeight;
    const t = getTransform(imgSize.w, imgSize.h, canvas.width, canvas.height);
    transformRef.current = t;
    drawCanvas(canvas, img, calibPixels, series, selected, hovered, mode, t);
  }, [img, imgSize, calibPixels, series, selected, hovered, mode]);

  useEffect(() => { redraw(); }, [redraw]);

  useEffect(() => {
    const ro = new ResizeObserver(redraw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  // ─── Image upload ─────────────────────────────────────────────────────────
  function loadImage(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setImgSize({ w: image.naturalWidth, h: image.naturalHeight });
      setMode('calibrate');
      setCalibStep(0);
      setCalibPixels(INIT_CALIB_PIXELS);
      setCalibValues(INIT_CALIB_VALUES);
      setSeries([mkSeries('Series 1', SERIES_COLORS[0])]);
      setSelected(null);
      setActiveSId(null);
    };
    image.src = url;
  }

  // ─── Hit test ─────────────────────────────────────────────────────────────
  function hitTest(cx, cy) {
    const t = transformRef.current;
    for (let si = series.length - 1; si >= 0; si--) {
      const s = series[si];
      for (let pi = s.points.length - 1; pi >= 0; pi--) {
        const pt = s.points[pi];
        const c = imgToCanvas(pt.px, pt.py, t);
        if (Math.hypot(cx - c.cx, cy - c.cy) <= 10) return { seriesId: s.id, pointId: pt.id };
      }
    }
    return null;
  }

  function getCanvasXY(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { cx: e.clientX - rect.left, cy: e.clientY - rect.top };
  }

  // ─── Canvas mouse handlers ────────────────────────────────────────────────
  function handleCanvasMouseDown(e) {
    if (!img) return;
    const { cx, cy } = getCanvasXY(e);
    const t = transformRef.current;

    if (mode === 'calibrate') {
      const { px, py } = canvasToImg(cx, cy, t);
      const next = [...calibPixels];
      next[calibStep] = { px, py };
      setCalibPixels(next);
      // advance to next un-picked point
      let nextStep = calibStep + 1;
      while (nextStep < 4 && next[nextStep]) nextStep++;
      if (nextStep < 4) setCalibStep(nextStep);
      return;
    }

    if (mode === 'collect') {
      const hit = hitTest(cx, cy);
      if (hit) {
        setSelected(hit);
        const s = series.find(s => s.id === hit.seriesId);
        const pt = s?.points.find(p => p.id === hit.pointId);
        if (pt) setEditVal({ x: pt.x.toPrecision(6), y: pt.y.toPrecision(6) });
        dragRef.current = hit;
        return;
      }
      setSelected(null);
      const { px, py } = canvasToImg(cx, cy, t);
      const calib = buildCalib();
      const { x, y } = pixelToData(px, py, calib);
      const newPt = { id: uid(), px, py, x, y };
      const targetId = activeSeriesId ?? series[0]?.id;
      setActiveSId(targetId);
      setSeries(prev => prev.map(s =>
        s.id === targetId ? { ...s, points: [...s.points, newPt] } : s
      ));
    }
  }

  function handleCanvasMouseMove(e) {
    if (!img) return;
    const { cx, cy } = getCanvasXY(e);
    const t = transformRef.current;

    if (dragRef.current && e.buttons === 1) {
      const { seriesId, pointId } = dragRef.current;
      const { px, py } = canvasToImg(cx, cy, t);
      const calib = buildCalib();
      const { x, y } = pixelToData(px, py, calib);
      setSeries(prev => prev.map(s =>
        s.id === seriesId ? {
          ...s,
          points: s.points.map(p => p.id === pointId ? { ...p, px, py, x, y } : p),
        } : s
      ));
      setEditVal({ x: x.toPrecision(6), y: y.toPrecision(6) });
      return;
    }

    if (mode === 'collect') {
      const hit = hitTest(cx, cy);
      setHovered(hit);
      canvasRef.current.style.cursor = hit ? 'grab' : 'crosshair';
    }
  }

  function handleCanvasMouseUp() { dragRef.current = null; }

  // ─── Delete selected ──────────────────────────────────────────────────────
  function deleteSelected() {
    if (!selected) return;
    setSeries(prev => prev.map(s =>
      s.id === selected.seriesId
        ? { ...s, points: s.points.filter(p => p.id !== selected.pointId) }
        : s
    ));
    setSelected(null);
  }

  useEffect(() => {
    function onKey(e) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && mode === 'collect') {
        if (document.activeElement.tagName !== 'INPUT') deleteSelected();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, mode, series]);

  // ─── Edit apply ───────────────────────────────────────────────────────────
  function applyEdit() {
    if (!selected) return;
    const nx = Number(editVal.x), ny = Number(editVal.y);
    if (!isFinite(nx) || !isFinite(ny)) return;
    setSeries(prev => prev.map(s =>
      s.id === selected.seriesId ? {
        ...s,
        points: s.points.map(p => p.id === selected.pointId ? { ...p, x: nx, y: ny } : p),
      } : s
    ));
  }

  // ─── Calibration helpers ──────────────────────────────────────────────────
  function resetCalibPoint(i) {
    const next = [...calibPixels];
    next[i] = null;
    setCalibPixels(next);
    setCalibStep(i); // focus canvas click on this slot
  }

  function resetAllCalib() {
    setCalibPixels(INIT_CALIB_PIXELS);
    setCalibValues(INIT_CALIB_VALUES);
    setCalibStep(0);
  }

  function startRecalibrate(fullReset) {
    setMode('calibrate');
    resetAllCalib();
    setSelected(null);
    if (fullReset) {
      setSeries([mkSeries('Series 1', SERIES_COLORS[0])]);
      setActiveSId(null);
    }
  }

  // Reset: keep image, wipe everything else
  function resetAll() {
    setMode('calibrate');
    resetAllCalib();
    setSeries([mkSeries('Series 1', SERIES_COLORS[0])]);
    setActiveSId(null);
    setSelected(null);
  }

  function finishCalibration() {
    if (!calibComplete) return;
    const calib = buildCalib();
    setSeries(prev => recomputeAllSeries(prev, calib));
    setMode('collect');
    setActiveSId(s => s ?? series[0]?.id);
  }

  // ─── Series management ────────────────────────────────────────────────────
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

  function renameSeriesInline(id, name) {
    setSeries(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }

  // ─── Export ───────────────────────────────────────────────────────────────
  function exportCSV() {
    const csv = seriesToCSV(series);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'plot_data.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard() {
    const csv = seriesToCSV(series);
    navigator.clipboard.writeText(csv).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    }).catch(() => {});
  }

  // ─── Step states ─────────────────────────────────────────────────────────
  const step1Done  = !!img;
  const step2Done  = mode === 'collect';
  const step3Active = mode === 'collect';

  // Which calib slot is awaiting a canvas click (first un-picked slot)
  const nextPickIdx = calibPixels.findIndex(p => !p);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <section className="glass-card p-4 sm:p-5">
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
          Plot Data Extractor
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Extract data points from linear or log scale plots.
        </p>
      </div>

      {/* Step progress badges */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <StepBadge num="1" label="Upload Plot Image"             active={!step1Done}            done={step1Done} />
        <StepBadge num="2" label="Calibrate Axes"                active={step1Done && !step2Done} done={step2Done} />
        <StepBadge num="3" label="Add Series & Mark Data Points" active={step3Active}            done={false} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">

        {/* ── LEFT: Canvas ── */}
        <div className="flex flex-col gap-2 lg:flex-[3]">

          {/* Status bar */}
          {mode !== 'upload' && (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200">
              <span className={`h-2 w-2 rounded-full ${mode === 'calibrate' ? 'bg-yellow-400' : 'bg-green-400'}`} />
              {mode === 'calibrate'
                ? nextPickIdx >= 0
                  ? `Step 2: Calibrate — click the plot to set ${CALIB_LABELS[nextPickIdx]} position`
                  : 'Step 2: Calibrate — all positions picked, enter values on the right'
                : 'Step 3: Click the plot to add a data point to the active series'}
            </div>
          )}

          {/* Canvas / drop zone */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
            style={{ minHeight: 560 }}
            onDrop={e => { e.preventDefault(); loadImage(e.dataTransfer.files?.[0]); }}
            onDragOver={e => e.preventDefault()}
          >
            {mode === 'upload' ? (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 p-12 text-slate-400 hover:text-slate-200 transition-colors" style={{ minHeight: 560 }}>
                <svg className="h-14 w-14 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="text-center">
                  <div className="text-base font-semibold">Step 1: Upload your plot image</div>
                  <div className="mt-1 text-xs opacity-60">Drop here or click to browse · PNG, JPG, BMP</div>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={e => loadImage(e.target.files?.[0])} />
              </label>
            ) : (
              <canvas
                ref={canvasRef}
                className="block w-full"
                style={{ height: 600, cursor: 'crosshair' }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
            )}
          </div>

          {/* Load new image */}
          {mode !== 'upload' && (
            <label className="cursor-pointer self-start rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition">
              ↑ Load new image
              <input type="file" accept="image/*" className="hidden" onChange={e => loadImage(e.target.files?.[0])} />
            </label>
          )}
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="flex flex-col gap-2 lg:w-60 xl:w-64">

          {/* Axis scale selector */}
          {mode !== 'upload' && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-cyan-300">Axis Scale</div>
              <div className="grid grid-cols-2 gap-2">
                {['xType', 'yType'].map(axis => (
                  <div key={axis}>
                    <div className="mb-1 text-[10px] text-slate-400">{axis === 'xType' ? 'X Axis' : 'Y Axis'}</div>
                    <select
                      className="input-inline w-full text-xs"
                      value={axisConfig[axis]}
                      onChange={e => setAxisConfig(prev => ({ ...prev, [axis]: e.target.value }))}
                    >
                      <option value="linear">Linear</option>
                      <option value="log">Logarithmic</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── STEP 2: Calibration panel ─── */}
          {mode === 'calibrate' && (
            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-500/5 p-3">
              <div className="mb-1 text-xs font-bold uppercase tracking-widest text-yellow-300">Step 2: Calibrate Axes</div>
              <p className="mb-3 text-[11px] text-slate-400 leading-relaxed">
                Click each point on the plot to lock its position, then enter its known value below.<br/>
                <span className="text-yellow-200/70">Tip: Use X-min, X-max, Y-min, Y-max for best accuracy.</span>
              </p>

              <div className="flex flex-col gap-2">
                {CALIB_LABELS.map((lbl, i) => {
                  const valKey = lbl.toLowerCase(); // x1, x2, y1, y2
                  const pixelSet = !!calibPixels[i];
                  const isNext  = !pixelSet && nextPickIdx === i; // this slot awaits canvas click

                  return (
                    <div
                      key={lbl}
                      className={`rounded-xl p-2 transition ${
                        isNext ? 'ring-1 ring-yellow-400/40 bg-white/5' : 'bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {/* Colour badge */}
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                          style={{ background: CALIB_COLORS[i] + '33', color: CALIB_COLORS[i], border: `1px solid ${CALIB_COLORS[i]}66` }}
                        >
                          {lbl}
                        </span>

                        {/* Pixel status */}
                        {pixelSet ? (
                          <span className="flex-1 text-[11px] text-green-300 font-semibold">✓ Position locked</span>
                        ) : (
                          <span className={`flex-1 text-[11px] ${isNext ? 'text-yellow-200 font-semibold animate-pulse' : 'text-slate-500'}`}>
                            {isNext ? '← click plot to set position' : 'waiting…'}
                          </span>
                        )}

                        {/* Reset pixel button */}
                        {pixelSet && (
                          <button
                            className="text-[10px] text-slate-500 hover:text-red-400 transition px-1"
                            onClick={() => resetCalibPoint(i)}
                            title="Re-pick position"
                          >re-pick</button>
                        )}
                      </div>

                      {/* Value input — ALWAYS visible so user can type at any time */}
                      <input
                        className={`input-inline w-full text-xs ${!pixelSet ? 'opacity-60' : ''}`}
                        placeholder={`Enter ${lbl} value (e.g. ${lbl.startsWith('X') ? '0.01' : '100'})`}
                        value={calibValues[valKey] ?? ''}
                        onChange={e => setCalibValues(prev => ({ ...prev, [valKey]: e.target.value }))}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="mt-3 flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-1.5 text-[11px] font-semibold text-slate-400 hover:bg-white/10 hover:text-slate-200 transition"
                  onClick={resetAllCalib}
                  title="Clear all calibration points and values"
                >↺ Reset Calibration</button>
                <button
                  className={`flex-1 rounded-xl py-1.5 text-[11px] font-bold transition ${
                    calibComplete
                      ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                      : 'bg-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                  disabled={!calibComplete}
                  onClick={finishCalibration}
                >
                  {calibComplete ? '✓ Done → Step 3' : 'Complete all 4 to continue'}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Collect mode ─── */}
          {mode === 'collect' && (
            <>
              {/* Series manager */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="mb-1 text-xs font-bold uppercase tracking-widest text-cyan-300">Step 3: Series</div>
                <p className="mb-2 text-[11px] text-slate-400">Select a series then click the plot to mark points. Drag any marker to reposition it.</p>
                <div className="flex flex-col gap-1.5">
                  {series.map(s => (
                    <div
                      key={s.id}
                      className={`flex items-center gap-2 rounded-xl px-2 py-1.5 cursor-pointer transition ${
                        activeSeriesId === s.id ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'
                      }`}
                      onClick={() => setActiveSId(s.id)}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
                      <input
                        className="flex-1 bg-transparent text-xs text-white outline-none"
                        value={s.name}
                        onChange={e => renameSeriesInline(s.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                      <span className="text-[10px] text-slate-500">{s.points.length}pt</span>
                      {series.length > 1 && (
                        <button
                          className="text-slate-600 hover:text-red-400 text-xs"
                          onClick={e => { e.stopPropagation(); deleteSeries(s.id); }}
                        >✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  className="mt-2 w-full rounded-xl bg-cyan-500/15 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/30"
                  onClick={addSeries}
                >+ Add Series</button>
              </div>

              {/* Selected point editor */}
              {selected && (() => {
                const s = series.find(s => s.id === selected.seriesId);
                const pt = s?.points.find(p => p.id === selected.pointId);
                if (!pt) return null;
                return (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="mb-2 text-xs font-bold uppercase tracking-widest text-cyan-300">Edit Selected Point</div>
                    <div className="grid grid-cols-2 gap-2">
                      {['x', 'y'].map(ax => (
                        <div key={ax}>
                          <div className="mb-1 text-[10px] text-slate-400">{ax.toUpperCase()} value</div>
                          <input
                            className="input-inline w-full text-xs"
                            value={editVal[ax]}
                            onChange={e => setEditVal(prev => ({ ...prev, [ax]: e.target.value }))}
                            onBlur={applyEdit}
                            onKeyDown={e => e.key === 'Enter' && applyEdit()}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button className="flex-1 rounded-xl bg-cyan-500/20 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/40" onClick={applyEdit}>Apply</button>
                      <button className="flex-1 rounded-xl bg-red-500/20 py-1.5 text-[11px] font-bold text-red-300 hover:bg-red-500/40" onClick={deleteSelected}>Delete</button>
                    </div>
                  </div>
                );
              })()}

              {/* Re-calibrate / Reset buttons */}
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-yellow-400/20 bg-yellow-500/10 py-1.5 text-[11px] font-semibold text-yellow-300 hover:bg-yellow-500/20"
                  onClick={() => startRecalibrate(false)}
                  title="Keeps data points, re-runs calibration"
                >↺ Re-calibrate</button>
                <button
                  className="flex-1 rounded-xl border border-orange-400/20 bg-orange-500/10 py-1.5 text-[11px] font-semibold text-orange-300 hover:bg-orange-500/20"
                  onClick={resetAll}
                  title="Wipes calibration + all data points, keeps image"
                >⊗ Reset</button>
              </div>

              {/* Data table + export */}
              {totalPoints > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-widest text-cyan-300">
                    Extracted Points ({totalPoints})
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-slate-400 border-b border-white/10">
                          <th className="pb-1 text-left font-semibold">#</th>
                          <th className="pb-1 text-left font-semibold">Series</th>
                          <th className="pb-1 text-right font-semibold">X</th>
                          <th className="pb-1 text-right font-semibold">Y</th>
                          <th className="pb-1" />
                        </tr>
                      </thead>
                      <tbody>
                        {series.flatMap(s =>
                          s.points.map((pt, idx) => {
                            const isSel = selected?.seriesId === s.id && selected?.pointId === pt.id;
                            return (
                              <tr
                                key={pt.id}
                                className={`cursor-pointer border-b border-white/5 transition ${isSel ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                onClick={() => {
                                  setSelected({ seriesId: s.id, pointId: pt.id });
                                  setEditVal({ x: pt.x.toPrecision(6), y: pt.y.toPrecision(6) });
                                }}
                              >
                                <td className="py-1 pr-1 text-slate-400">{idx + 1}</td>
                                <td className="py-1 pr-1">
                                  <span className="flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                                    <span className="text-slate-300 max-w-[4rem] truncate">{s.name}</span>
                                  </span>
                                </td>
                                <td className="py-1 pr-1 text-right font-mono text-slate-100">{pt.x.toPrecision(4)}</td>
                                <td className="py-1 pr-2 text-right font-mono text-slate-100">{pt.y.toPrecision(4)}</td>
                                <td className="py-1 text-right">
                                  <button
                                    className="text-slate-600 hover:text-red-400"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setSeries(prev => prev.map(sr =>
                                        sr.id === s.id ? { ...sr, points: sr.points.filter(p => p.id !== pt.id) } : sr
                                      ));
                                      if (isSel) setSelected(null);
                                    }}
                                  >✕</button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 primary-action-button py-2 text-xs gap-1.5" onClick={copyToClipboard}>
                      <CopyIcon />
                      {copyDone ? 'Copied!' : 'Copy Data'}
                    </button>
                    <button className="flex-1 primary-action-button py-2 text-xs" onClick={exportCSV}>
                      ↓ Download CSV
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
