import { useState, useRef, useEffect, useCallback, useId } from 'react';
import {
  pixelToData, recomputeAllSeries, getTransform,
  imgToCanvas, canvasToImg,
  seriesToCSV, SERIES_COLORS, CALIB_LABELS, CALIB_COLORS, CALIB_PROMPTS,
} from '../utils/plotExtractorCalc';

// ─── tiny uid ────────────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => String(++_uid);

// ─── Initial state helpers ────────────────────────────────────────────────────
const mkSeries = (name, color) => ({ id: uid(), name, color, points: [] });

const INIT_CALIB_VALUES = { x1: '', x2: '', y1: '', y2: '' };
const INIT_CALIB_PIXELS = [null, null, null, null]; // 4 slots: X1 X2 Y1 Y2

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
    ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10); ctx.stroke();
    // label bubble
    ctx.fillStyle = col;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(CALIB_LABELS[i], cx + 6, cy - 6);
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
      // outer ring for selected
      if (isSel) {
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // fill circle
      ctx.beginPath();
      ctx.arc(cx, cy, isSel ? 7 : isHov ? 6 : 5, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = '#000000aa';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // number label
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
  // image
  const [img, setImg] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });

  // mode: 'upload' | 'calibrate' | 'collect'
  const [mode, setMode] = useState('upload');

  // calibration
  const [calibStep, setCalibStep]     = useState(0);          // 0-3
  const [calibPixels, setCalibPixels] = useState(INIT_CALIB_PIXELS);
  const [calibValues, setCalibValues] = useState(INIT_CALIB_VALUES);
  const [axisConfig, setAxisConfig]   = useState({ xType: 'linear', yType: 'linear' });

  // series
  const [series, setSeries]           = useState([mkSeries('Series 1', SERIES_COLORS[0])]);
  const [activeSeriesId, setActiveSId] = useState(null); // set on first collect

  // selection & drag
  const [selected, setSelected]       = useState(null); // {seriesId, pointId}
  const [editVal, setEditVal]         = useState({ x: '', y: '' });
  const [hovered, setHovered]         = useState(null);
  const dragRef = useRef(null); // { seriesId, pointId }

  // canvas
  const canvasRef  = useRef(null);
  const containerRef = useRef(null);
  const transformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

  // ─── Calibration completeness ─────────────────────────────────────────────
  const calibComplete = calibPixels.every(Boolean) &&
    calibValues.x1 !== '' && calibValues.x2 !== '' &&
    calibValues.y1 !== '' && calibValues.y2 !== '';

  const buildCalib = useCallback(() => ({
    x1: { ...calibPixels[0], val: Number(calibValues.x1) },
    x2: { ...calibPixels[1], val: Number(calibValues.x2) },
    y1: { ...calibPixels[2], val: Number(calibValues.y1) },
    y2: { ...calibPixels[3], val: Number(calibValues.y2) },
    xType: axisConfig.xType,
    yType: axisConfig.yType,
  }), [calibPixels, calibValues, axisConfig]);

  // ─── Canvas resize & redraw ───────────────────────────────────────────────
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
  function handleFileChange(e) {
    const file = e.target.files?.[0];
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

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange({ target: { files: [file] } });
  }

  // ─── Hit test ─────────────────────────────────────────────────────────────
  function hitTest(cx, cy) {
    const t = transformRef.current;
    const R = 10;
    for (let si = series.length - 1; si >= 0; si--) {
      const s = series[si];
      for (let pi = s.points.length - 1; pi >= 0; pi--) {
        const pt = s.points[pi];
        const c = imgToCanvas(pt.px, pt.py, t);
        if (Math.hypot(cx - c.cx, cy - c.cy) <= R) {
          return { seriesId: s.id, pointId: pt.id };
        }
      }
    }
    return null;
  }

  // ─── Canvas mouse handlers ────────────────────────────────────────────────
  function getCanvasXY(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { cx: e.clientX - rect.left, cy: e.clientY - rect.top };
  }

  function handleCanvasMouseDown(e) {
    if (!img) return;
    const { cx, cy } = getCanvasXY(e);
    const t = transformRef.current;

    if (mode === 'calibrate') {
      const { px, py } = canvasToImg(cx, cy, t);
      const next = [...calibPixels];
      next[calibStep] = { px, py };
      setCalibPixels(next);
      if (calibStep < 3) setCalibStep(calibStep + 1);
      return;
    }

    if (mode === 'collect') {
      const hit = hitTest(cx, cy);
      if (hit) {
        // select existing point
        setSelected(hit);
        const s = series.find(s => s.id === hit.seriesId);
        const pt = s?.points.find(p => p.id === hit.pointId);
        if (pt) setEditVal({ x: pt.x.toPrecision(6), y: pt.y.toPrecision(6) });
        dragRef.current = hit;
        return;
      }
      // deselect if clicking empty area and not dragging
      setSelected(null);
      // add point to active series
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

    // drag
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

    // hover
    if (mode === 'collect') {
      const hit = hitTest(cx, cy);
      setHovered(hit);
      canvasRef.current.style.cursor = hit ? 'grab' : 'crosshair';
    }
  }

  function handleCanvasMouseUp() {
    dragRef.current = null;
  }

  // ─── Delete selected point ────────────────────────────────────────────────
  function deleteSelected() {
    if (!selected) return;
    setSeries(prev => prev.map(s =>
      s.id === selected.seriesId
        ? { ...s, points: s.points.filter(p => p.id !== selected.pointId) }
        : s
    ));
    setSelected(null);
  }

  // keyboard Delete key
  useEffect(() => {
    function onKey(e) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && mode === 'collect') {
        // only if not focused on an input
        if (document.activeElement.tagName !== 'INPUT') deleteSelected();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, mode, series]);

  // ─── Apply manual edit ────────────────────────────────────────────────────
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

  // ─── Re-calibrate ─────────────────────────────────────────────────────────
  function startRecalibrate(fullReset) {
    setMode('calibrate');
    setCalibStep(0);
    setCalibPixels(INIT_CALIB_PIXELS);
    setCalibValues(INIT_CALIB_VALUES);
    setSelected(null);
    if (fullReset) {
      setSeries([mkSeries('Series 1', SERIES_COLORS[0])]);
      setActiveSId(null);
    }
  }

  function finishCalibration() {
    if (!calibComplete) return;
    // recompute existing points with new calibration
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
    navigator.clipboard.writeText(csv).catch(() => {});
  }

  const totalPoints = series.reduce((acc, s) => acc + s.points.length, 0);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <section className="glass-card p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-[2rem]">
          Plot Data Extractor
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Upload a chart image, calibrate axes, then click to extract X–Y data points.
          Supports linear and log scales with multiple data series.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">

        {/* ── LEFT: Canvas ── */}
        <div className="flex flex-col gap-2 lg:flex-1">

          {/* Status bar */}
          {mode !== 'upload' && (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200">
              <span className={`h-2 w-2 rounded-full ${mode === 'calibrate' ? 'bg-yellow-400' : 'bg-green-400'}`} />
              {mode === 'calibrate'
                ? `Calibrate — Step ${calibStep + 1}/4: ${CALIB_PROMPTS[calibStep]}`
                : `Collect Mode — click canvas to add point to active series`}
            </div>
          )}

          {/* Canvas container */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
            style={{ minHeight: 420, height: mode === 'upload' ? 'auto' : undefined }}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            {mode === 'upload' ? (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 p-12 text-slate-400 hover:text-slate-200 transition-colors">
                <svg className="h-14 w-14 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-base font-semibold">Drop image here or click to upload</span>
                <span className="text-xs opacity-60">PNG, JPG, BMP, SVG</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <canvas
                ref={canvasRef}
                className="block w-full"
                style={{ cursor: mode === 'calibrate' ? 'crosshair' : 'crosshair', height: 480 }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
            )}
          </div>

          {/* Re-upload button */}
          {mode !== 'upload' && (
            <label className="cursor-pointer self-start rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition">
              ↑ Load new image
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          )}
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="flex flex-col gap-3 lg:w-72 xl:w-80">

          {/* ─ Axis config ─ */}
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

          {/* ─ Calibration panel ─ */}
          {mode === 'calibrate' && (
            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-500/5 p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow-300">Calibration</div>
              <div className="flex flex-col gap-2">
                {CALIB_LABELS.map((lbl, i) => {
                  const valKey = lbl.toLowerCase().replace('-', '');
                  const done = !!calibPixels[i];
                  return (
                    <div key={lbl} className="flex items-center gap-2">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{ background: CALIB_COLORS[i] + '33', color: CALIB_COLORS[i], border: `1px solid ${CALIB_COLORS[i]}66` }}
                      >
                        {lbl}
                      </span>
                      {done ? (
                        <input
                          className="input-inline flex-1 text-xs"
                          placeholder={`${lbl} value`}
                          value={calibValues[valKey] ?? ''}
                          onChange={e => setCalibValues(prev => ({ ...prev, [valKey]: e.target.value }))}
                        />
                      ) : (
                        <span className={`text-xs ${i === calibStep ? 'text-yellow-200 font-semibold' : 'text-slate-500'}`}>
                          {i === calibStep ? '← click on canvas' : 'pending'}
                        </span>
                      )}
                      {done && (
                        <button
                          className="text-slate-500 hover:text-red-400 text-xs"
                          onClick={() => {
                            const next = [...calibPixels]; next[i] = null;
                            setCalibPixels(next);
                            setCalibStep(i);
                          }}
                          title="Reset this point"
                        >✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                className={`mt-3 w-full rounded-xl py-2 text-xs font-bold transition ${
                  calibComplete
                    ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                    : 'bg-white/5 text-slate-500 cursor-not-allowed'
                }`}
                disabled={!calibComplete}
                onClick={finishCalibration}
              >
                {calibComplete ? '✓ Done — Start Collecting' : 'Complete all 4 points above'}
              </button>
            </div>
          )}

          {/* ─ Collect-mode controls ─ */}
          {mode === 'collect' && (
            <>
              {/* Series manager */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">Series</span>
                  <button
                    className="rounded-lg bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/40"
                    onClick={addSeries}
                  >+ Add</button>
                </div>
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
                          title="Delete series"
                        >✕</button>
                      )}
                    </div>
                  ))}
                </div>
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

              {/* Re-calibrate */}
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-yellow-400/20 bg-yellow-500/10 py-1.5 text-[11px] font-semibold text-yellow-300 hover:bg-yellow-500/20"
                  onClick={() => startRecalibrate(false)}
                >↺ Re-calibrate</button>
                <button
                  className="flex-1 rounded-xl border border-red-400/20 bg-red-500/10 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/20"
                  onClick={() => startRecalibrate(true)}
                >⊗ Full Reset</button>
              </div>

              {/* Data table */}
              {totalPoints > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">Extracted Points ({totalPoints})</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-slate-400 border-b border-white/10">
                          <th className="pb-1 text-left font-semibold">#</th>
                          <th className="pb-1 text-left font-semibold">Series</th>
                          <th className="pb-1 text-right font-semibold">X</th>
                          <th className="pb-1 text-right font-semibold">Y</th>
                          <th className="pb-1 text-right font-semibold"></th>
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
                  {/* Export */}
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 primary-action-button py-2 text-xs" onClick={copyToClipboard}>
                      📋 Copy CSV
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
