// ─── Coordinate Transform ────────────────────────────────────────────────────
// Calibration object shape:
//   { x1:{px,py,val}, x2:{px,py,val}, y1:{px,py,val}, y2:{px,py,val}, xType, yType }
// px/py are image-pixel coordinates (not canvas-pixel).

export function pixelToData(px, py, calib) {
  const { x1, x2, y1, y2, xType, yType } = calib;

  let x, y;

  if (xType === 'linear') {
    x = x1.val + (px - x1.px) * (x2.val - x1.val) / (x2.px - x1.px);
  } else {
    // log10 interpolation
    const logX1 = Math.log10(x1.val);
    const logX2 = Math.log10(x2.val);
    x = Math.pow(10, logX1 + (px - x1.px) * (logX2 - logX1) / (x2.px - x1.px));
  }

  if (yType === 'linear') {
    y = y1.val + (py - y1.py) * (y2.val - y1.val) / (y2.py - y1.py);
  } else {
    const logY1 = Math.log10(y1.val);
    const logY2 = Math.log10(y2.val);
    y = Math.pow(10, logY1 + (py - y1.py) * (logY2 - logY1) / (y2.py - y1.py));
  }

  return { x, y };
}

// Recompute all points in all series after re-calibration
export function recomputeAllSeries(series, calib) {
  return series.map(s => ({
    ...s,
    points: s.points.map(pt => {
      const { x, y } = pixelToData(pt.px, pt.py, calib);
      return { ...pt, x, y };
    }),
  }));
}

// ─── Canvas Transform Helpers ─────────────────────────────────────────────────
// Returns scale + offset so the image fits (letterboxed) in the canvas.
export function getTransform(imgW, imgH, canvasW, canvasH) {
  const scale = Math.min(canvasW / imgW, canvasH / imgH);
  const offsetX = (canvasW - imgW * scale) / 2;
  const offsetY = (canvasH - imgH * scale) / 2;
  return { scale, offsetX, offsetY };
}

export function imgToCanvas(px, py, t) {
  return { cx: px * t.scale + t.offsetX, cy: py * t.scale + t.offsetY };
}

export function canvasToImg(cx, cy, t) {
  return { px: (cx - t.offsetX) / t.scale, py: (cy - t.offsetY) / t.scale };
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
export function seriesToCSV(series) {
  // Build one row per point, columns: Series, Index, X, Y
  const rows = ['Series,Index,X,Y'];
  series.forEach(s => {
    s.points.forEach((pt, i) => {
      rows.push(`"${s.name}",${i + 1},${pt.x.toPrecision(6)},${pt.y.toPrecision(6)}`);
    });
  });
  return rows.join('\n');
}

// ─── Constants ────────────────────────────────────────────────────────────────
export const SERIES_COLORS = [
  '#f87171', '#60a5fa', '#34d399', '#fbbf24',
  '#a78bfa', '#f472b6', '#38bdf8', '#fb923c',
];

export const CALIB_LABELS = ['Xmin', 'Xmax', 'Ymin', 'Ymax'];
export const CALIB_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];

// Internal keys used in calibValues state — kept as x1/x2/y1/y2 for the calib object shape
export const CALIB_VAL_KEYS = ['x1', 'x2', 'y1', 'y2'];

export const CALIB_PROMPTS = [
  'Click the X-axis minimum point (Xmin)',
  'Click the X-axis maximum point (Xmax)',
  'Click the Y-axis minimum point (Ymin)',
  'Click the Y-axis maximum point (Ymax)',
];
