import PlotCanvas from './PlotCanvas';
import { CALIB_LABELS, CALIB_COLORS, CALIB_VAL_KEYS } from '../utils/plotExtractorCalc';

export default function Step2Calibrate({
  img, imgSize,
  calibStep, calibPixels, calibValues, axisConfig, calibComplete,
  onCanvasClick, onValuesChange, onAxisChange,
  onResetPoint, onResetAll, onFinish,
}) {
  const nextPickIdx = calibPixels.findIndex(p => !p);

  function setVal(key, value) {
    onValuesChange(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="glass-card p-3 sm:p-4">
      {/* Status bar */}
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-500/5 px-3 py-2 text-xs font-semibold text-yellow-200">
        <span className="h-2 w-2 rounded-full bg-yellow-400 shrink-0" />
        {nextPickIdx >= 0
          ? `Click the plot to set the ${CALIB_LABELS[nextPickIdx]} position (${nextPickIdx + 1} of 4)`
          : 'All positions locked — enter the known values on the right, then click Done'}
      </div>

      <div className="flex gap-3">
        {/* Canvas — takes most of the width */}
        <div className="flex-1" style={{ minHeight: 620 }}>
          <PlotCanvas
            img={img}
            imgSize={imgSize}
            calibPixels={calibPixels}
            series={[]}
            selected={null}
            hovered={null}
            showCalibMarkers={true}
            mode="calibrate"
            onCanvasClick={onCanvasClick}
          />
        </div>

        {/* Sidebar */}
        <div className="flex w-60 shrink-0 flex-col gap-3">

          {/* Axis scale */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-cyan-300">Axis Scale</div>
            <div className="grid grid-cols-2 gap-2">
              {['xType', 'yType'].map(axis => (
                <div key={axis}>
                  <div className="mb-1 text-[10px] text-slate-400">{axis === 'xType' ? 'X Axis' : 'Y Axis'}</div>
                  <select
                    className="input-inline w-full text-xs"
                    value={axisConfig[axis]}
                    onChange={e => onAxisChange(prev => ({ ...prev, [axis]: e.target.value }))}
                  >
                    <option value="linear">Linear</option>
                    <option value="log">Logarithmic</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Calibration rows */}
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-500/5 p-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-yellow-300">Calibration Points</div>
            <p className="mb-3 text-[10px] text-slate-400 leading-relaxed">
              Click each reference point on the plot, then enter its known value.
              <span className="mt-1 block text-yellow-200/70">
                Tip: Choose the outermost points with known coordinates on each axis —
                the wider the spread, the more accurate the extraction.
              </span>
            </p>

            <div className="flex flex-col gap-2">
              {CALIB_LABELS.map((lbl, i) => {
                const valKey   = CALIB_VAL_KEYS[i]; // x1, x2, y1, y2
                const pixelSet = !!calibPixels[i];
                const isNext   = !pixelSet && nextPickIdx === i;
                const axisType = i < 2 ? axisConfig.xType : axisConfig.yType;
                const numVal   = Number(calibValues[valKey]);
                const hasValue = calibValues[valKey] !== '';
                const logError = axisType === 'log' && hasValue && numVal <= 0;

                return (
                  <div
                    key={lbl}
                    className={`rounded-xl p-2 transition ${isNext ? 'ring-1 ring-yellow-400/40 bg-white/5' : 'bg-white/[0.03]'}`}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                        style={{ background: CALIB_COLORS[i] + '33', color: CALIB_COLORS[i], border: `1px solid ${CALIB_COLORS[i]}55` }}
                      >{lbl}</span>
                      {pixelSet ? (
                        <span className="flex-1 text-[10px] text-green-300 font-semibold">✓ Position locked</span>
                      ) : (
                        <span className={`flex-1 text-[10px] ${isNext ? 'text-yellow-200 font-semibold' : 'text-slate-500'}`}>
                          {isNext ? '← click the plot' : 'waiting…'}
                        </span>
                      )}
                      {pixelSet && (
                        <button
                          className="text-[9px] text-slate-500 hover:text-red-400 transition"
                          onClick={() => onResetPoint(i)}
                        >re-pick</button>
                      )}
                    </div>
                    {/* Value input — always visible */}
                    <input
                      className={`input-inline w-full text-xs ${!pixelSet ? 'opacity-50' : ''} ${logError ? 'ring-1 ring-red-500/70 border-red-500/50' : ''}`}
                      placeholder={axisType === 'log' ? `Enter ${lbl} value (> 0)` : `Enter ${lbl} value`}
                      value={calibValues[valKey] ?? ''}
                      onChange={e => setVal(valKey, e.target.value)}
                    />
                    {logError && (
                      <p className="mt-1 text-[9px] text-red-400">
                        Log scale requires a value &gt; 0
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Buttons */}
            <div className="mt-3 flex gap-2">
              <button
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-[10px] font-semibold text-slate-400 hover:bg-white/10 transition"
                onClick={onResetAll}
              >↺ Reset All</button>
              <button
                className={`flex-1 rounded-xl py-2 text-[10px] font-bold transition ${
                  calibComplete
                    ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                    : 'bg-white/5 text-slate-500 cursor-not-allowed'
                }`}
                disabled={!calibComplete}
                onClick={onFinish}
              >{calibComplete ? '✓ Done → Step 3' : 'Complete 4 points'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
