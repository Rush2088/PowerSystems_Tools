import { useEffect } from 'react';
import PlotCanvas from './PlotCanvas';

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  );
}

export default function Step3Collect({
  img, imgSize, calibPixels,
  series, activeSeriesId, selected, hovered, editVal, totalPoints, copyDone,
  spatialIndex, snapEnabled, isDetecting,
  onAddPoint, onSelectPoint, onDragPoint, onHoverChange,
  onEditValChange, onApplyEdit, onDeleteSelected,
  onSetActiveSeries, onAddSeries, onDeleteSeries, onRenameSeries,
  onDeletePoint,
  onAutoDetect, onToggleSnap,
  onRecalibrate, onReset,
  onExportCSV, onCopy, onNewImage,
}) {
  // Keyboard delete for selected point
  useEffect(() => {
    function onKey(e) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        if (document.activeElement.tagName !== 'INPUT') onDeleteSelected();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, onDeleteSelected]);

  const selSeries = selected ? series.find(s => s.id === selected.seriesId) : null;
  const selPoint  = selSeries?.points.find(p => p.id === selected?.pointId);

  return (
    <div className="glass-card p-3 sm:p-4">
      {/* Status bar */}
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-green-400/20 bg-green-500/5 px-3 py-2 text-xs font-semibold text-green-200">
        <span className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
        {snapEnabled
          ? '🎯 Snap ON — cursor locks to detected curve. Click to place point.'
          : 'Click the plot to add a point to the active series · Click an existing marker to select/drag it'}
      </div>

      <div className="flex gap-3">

        {/* Canvas */}
        <div className="flex-1" style={{ minHeight: 620 }}>
          <PlotCanvas
            img={img}
            imgSize={imgSize}
            calibPixels={calibPixels}
            series={series}
            selected={selected}
            hovered={hovered}
            showCalibMarkers={false}
            mode="collect"
            spatialIndex={spatialIndex}
            snapEnabled={snapEnabled}
            onCanvasClick={onAddPoint}
            onPointMouseDown={onSelectPoint}
            onDrag={onDragPoint}
            onHoverChange={onHoverChange}
          />
        </div>

        {/* Sidebar */}
        <div className="flex w-60 shrink-0 flex-col gap-2">

          {/* Auto Detect panel */}
          <div className="rounded-2xl border border-purple-400/20 bg-purple-500/5 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-purple-300">Auto Detect</div>
              <span className="rounded-full border border-purple-400/40 px-1.5 py-0.5 text-[8px] font-bold text-purple-400">BETA</span>
            </div>
            <p className="mb-2.5 text-[10px] leading-relaxed text-slate-400">
              Detects curve edges and polygon boundaries. With Snap ON, the cursor locks to and rides along the nearest detected edge — click to place the point exactly on the curve.
            </p>
            <button
              className={`w-full rounded-xl py-2 text-[10px] font-bold transition ${
                isDetecting
                  ? 'bg-purple-500/20 text-purple-400 cursor-wait'
                  : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/35'
              }`}
              onClick={onAutoDetect}
              disabled={isDetecting}
            >
              {isDetecting ? '⏳ Detecting…' : '🔍 Auto Detect'}
            </button>

            {/* Snap toggle — only visible after detection */}
            {spatialIndex && (
              <div className="mt-2 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <span className="text-[10px] text-slate-300">
                  Snap
                  <span className="ml-1 text-[9px] text-slate-500">({spatialIndex.count.toLocaleString()} pts)</span>
                </span>
                <button
                  onClick={onToggleSnap}
                  className={`relative h-5 w-9 rounded-full transition-colors ${snapEnabled ? 'bg-cyan-500' : 'bg-slate-600'}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${snapEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Series manager */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300">Series</div>
            <p className="mb-2 text-[10px] text-slate-400">Select series then click plot. Drag marker to reposition.</p>
            <div className="flex flex-col gap-1">
              {series.map(s => (
                <div
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 transition ${
                    activeSeriesId === s.id ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'
                  }`}
                  onClick={() => onSetActiveSeries(s.id)}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <input
                    className="flex-1 bg-transparent text-xs text-white outline-none min-w-0"
                    value={s.name}
                    onChange={e => onRenameSeries(s.id, e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                  <span className="text-[9px] text-slate-500 shrink-0">{s.points.length}pt</span>
                  {series.length > 1 && (
                    <button
                      className="text-slate-600 hover:text-red-400 text-xs shrink-0"
                      onClick={e => { e.stopPropagation(); onDeleteSeries(s.id); }}
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
            <button
              className="mt-2 w-full rounded-xl bg-cyan-500/15 py-1.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/30"
              onClick={onAddSeries}
            >+ Add Series</button>
          </div>

          {/* Selected point editor */}
          {selPoint && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-cyan-300">Edit Point</div>
              <div className="grid grid-cols-2 gap-2">
                {['x', 'y'].map(ax => (
                  <div key={ax}>
                    <div className="mb-1 text-[9px] text-slate-400">{ax.toUpperCase()}</div>
                    <input
                      className="input-inline w-full text-xs"
                      value={editVal[ax]}
                      onChange={e => onEditValChange(prev => ({ ...prev, [ax]: e.target.value }))}
                      onBlur={onApplyEdit}
                      onKeyDown={e => e.key === 'Enter' && onApplyEdit()}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-1.5">
                <button className="flex-1 rounded-xl bg-cyan-500/20 py-1.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/40" onClick={onApplyEdit}>Apply</button>
                <button className="flex-1 rounded-xl bg-red-500/20 py-1.5 text-[10px] font-bold text-red-300 hover:bg-red-500/40" onClick={onDeleteSelected}>Delete</button>
              </div>
            </div>
          )}

          {/* Data table */}
          {totalPoints > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                Extracted ({totalPoints} pts)
              </div>
              <div className="max-h-52 overflow-y-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
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
                              onSelectPoint({ seriesId: s.id, pointId: pt.id });
                              onEditValChange({ x: pt.x.toPrecision(6), y: pt.y.toPrecision(6) });
                            }}
                          >
                            <td className="py-0.5 pr-1 text-slate-400">{idx + 1}</td>
                            <td className="py-0.5 pr-1">
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                                <span className="text-slate-300 max-w-[3.5rem] truncate">{s.name}</span>
                              </span>
                            </td>
                            <td className="py-0.5 pr-1 text-right font-mono text-slate-100">{pt.x.toPrecision(4)}</td>
                            <td className="py-0.5 pr-1 text-right font-mono text-slate-100">{pt.y.toPrecision(4)}</td>
                            <td className="py-0.5 text-right">
                              <button
                                className="text-slate-600 hover:text-red-400"
                                onClick={e => { e.stopPropagation(); onDeletePoint(s.id, pt.id); }}
                              >✕</button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button className="flex-1 primary-action-button py-2 text-[10px] gap-1" onClick={onCopy}>
                  <CopyIcon />{copyDone ? 'Copied!' : 'Copy Data'}
                </button>
                <button className="flex-1 primary-action-button py-2 text-[10px]" onClick={onExportCSV}>
                  ↓ CSV
                </button>
              </div>
            </div>
          )}

          {/* Re-calibrate / Reset */}
          <div className="flex gap-1.5">
            <button
              className="flex-1 rounded-xl border border-yellow-400/20 bg-yellow-500/10 py-2 text-[10px] font-semibold text-yellow-300 hover:bg-yellow-500/20"
              onClick={onRecalibrate}
              title="Keep data points, redo calibration"
            >↺ Re-calibrate</button>
            <button
              className="flex-1 rounded-xl border border-orange-400/20 bg-orange-500/10 py-2 text-[10px] font-semibold text-orange-300 hover:bg-orange-500/20"
              onClick={onReset}
              title="Wipe all data + calibration, keep image"
            >⊗ Reset</button>
          </div>
          <label className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-[10px] font-semibold text-slate-400 hover:bg-white/10 transition">
            ↑ New Image
            <input type="file" accept="image/*" className="hidden" onChange={e => onNewImage?.(e.target.files?.[0])} />
          </label>

        </div>
      </div>
    </div>
  );
}
