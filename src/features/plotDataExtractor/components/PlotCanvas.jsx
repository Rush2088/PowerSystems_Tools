import { useRef, useEffect, useCallback } from 'react';
import { getTransform, imgToCanvas, canvasToImg, CALIB_LABELS, CALIB_COLORS } from '../utils/plotExtractorCalc';

// ─── Pure draw function ───────────────────────────────────────────────────────
function draw(canvas, img, calibPixels, series, selected, hovered, showCalibMarkers, transform) {
  const ctx = canvas.getContext('2d');
  const { scale, offsetX, offsetY } = transform;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Image
  ctx.drawImage(img, offsetX, offsetY, img.naturalWidth * scale, img.naturalHeight * scale);

  // Calibration crosshairs — only shown in Step 2
  if (showCalibMarkers) {
    calibPixels.forEach((pt, i) => {
      if (!pt) return;
      const { cx, cy } = imgToCanvas(pt.px, pt.py, transform);
      const col = CALIB_COLORS[i];
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - 13, cy); ctx.lineTo(cx + 13, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 13); ctx.lineTo(cx, cy + 13); ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(CALIB_LABELS[i], cx + 7, cy - 7);
      ctx.restore();
    });
  }

  // Data point markers — always shown when series have points
  series.forEach(s => {
    s.points.forEach((pt, idx) => {
      const { cx, cy } = imgToCanvas(pt.px, pt.py, transform);
      const isSel = selected?.seriesId === s.id && selected?.pointId === pt.id;
      const isHov = hovered?.seriesId === s.id && hovered?.pointId === pt.id;
      ctx.save();
      if (isSel) {
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, isSel ? 7 : isHov ? 6.5 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = '#000000bb';
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

// ─── Hit test (image-pixel space via transform) ───────────────────────────────
function hitTest(cx, cy, series, transform) {
  const R = 10;
  for (let si = series.length - 1; si >= 0; si--) {
    const s = series[si];
    for (let pi = s.points.length - 1; pi >= 0; pi--) {
      const pt = s.points[pi];
      const c = imgToCanvas(pt.px, pt.py, transform);
      if (Math.hypot(cx - c.cx, cy - c.cy) <= R) return { seriesId: s.id, pointId: pt.id };
    }
  }
  return null;
}

// ─── PlotCanvas ───────────────────────────────────────────────────────────────
// Props:
//   img, imgSize            — image to display
//   calibPixels             — calibration positions (for drawing crosshairs)
//   series, selected, hov   — data point state
//   showCalibMarkers        — true = Step 2, false = Step 3
//   mode                    — 'calibrate' | 'collect'
//   onCanvasClick(px,py)    — called when user clicks empty canvas area (image pixel coords)
//   onPointMouseDown(hit)   — collect mode: mousedown on existing point
//   onDrag(hit,px,py)       — collect mode: dragging a point
//   onHoverChange(hit|null) — collect mode: hover state

export default function PlotCanvas({
  img, imgSize,
  calibPixels, series, selected, hovered,
  showCalibMarkers, mode,
  onCanvasClick, onPointMouseDown, onDrag, onHoverChange,
}) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const transformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const dragRef      = useRef(null); // { hit }

  // ─── Redraw ────────────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const container = containerRef.current;
    canvas.width  = container.clientWidth;
    canvas.height = container.clientHeight;
    const t = getTransform(imgSize.w, imgSize.h, canvas.width, canvas.height);
    transformRef.current = t;
    draw(canvas, img, calibPixels, series, selected, hovered, showCalibMarkers, t);
  }, [img, imgSize, calibPixels, series, selected, hovered, showCalibMarkers]);

  useEffect(() => { redraw(); }, [redraw]);

  useEffect(() => {
    const ro = new ResizeObserver(redraw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  // ─── Mouse helpers ─────────────────────────────────────────────────────────
  function getXY(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { cx: e.clientX - rect.left, cy: e.clientY - rect.top };
  }

  function handleMouseDown(e) {
    const { cx, cy } = getXY(e);
    const { px, py } = canvasToImg(cx, cy, transformRef.current);

    if (mode === 'calibrate') {
      onCanvasClick?.(px, py);
      return;
    }

    // collect mode
    const hit = hitTest(cx, cy, series, transformRef.current);
    if (hit) {
      dragRef.current = hit;
      onPointMouseDown?.(hit);
    } else {
      onCanvasClick?.(px, py);
    }
  }

  function handleMouseMove(e) {
    if (mode !== 'collect') return;
    const { cx, cy } = getXY(e);
    const t = transformRef.current;

    if (dragRef.current && e.buttons === 1) {
      const { px, py } = canvasToImg(cx, cy, t);
      onDrag?.(dragRef.current, px, py);
      return;
    }

    const hit = hitTest(cx, cy, series, t);
    onHoverChange?.(hit);
    canvasRef.current.style.cursor = hit ? 'grab' : 'crosshair';
  }

  function handleMouseUp() { dragRef.current = null; }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ cursor: 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
