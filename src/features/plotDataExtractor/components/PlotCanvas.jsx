import { useRef, useEffect, useCallback } from 'react';
import { getTransform, imgToCanvas, canvasToImg, CALIB_LABELS, CALIB_COLORS } from '../utils/plotExtractorCalc';

const MAG_SIZE   = 192;   // magnifier canvas size in px (~2 in at 96 dpi)
const MAG_ZOOM   = 4;     // zoom multiplier
const MAG_OFFSET = 24;    // gap between cursor and magnifier edge

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

// ─── Magnifier draw ───────────────────────────────────────────────────────────
function drawMagnifier(magCanvas, mainCanvas, cx, cy) {
  const ctx = magCanvas.getContext('2d');
  const half = MAG_SIZE / 2;
  const srcHalf = half / MAG_ZOOM;   // source half-width in main-canvas pixels

  ctx.clearRect(0, 0, MAG_SIZE, MAG_SIZE);

  // Clip to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(half, half, half, 0, Math.PI * 2);
  ctx.clip();

  // Fill background (visible when source is near edge)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, MAG_SIZE, MAG_SIZE);

  // Draw the zoomed patch from the main canvas
  ctx.drawImage(
    mainCanvas,
    cx - srcHalf, cy - srcHalf, srcHalf * 2, srcHalf * 2,
    0, 0, MAG_SIZE, MAG_SIZE,
  );

  ctx.restore();

  // Outer ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(half, half, half - 1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Precision crosshair at centre
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 80, 80, 0.95)';
  ctx.lineWidth = 1;
  // horizontal arm
  ctx.beginPath(); ctx.moveTo(half - 18, half); ctx.lineTo(half + 18, half); ctx.stroke();
  // vertical arm
  ctx.beginPath(); ctx.moveTo(half, half - 18); ctx.lineTo(half, half + 18); ctx.stroke();
  // centre dot
  ctx.beginPath();
  ctx.arc(half, half, 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 80, 80, 0.95)';
  ctx.fill();
  ctx.restore();
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
export default function PlotCanvas({
  img, imgSize,
  calibPixels, series, selected, hovered,
  showCalibMarkers, mode,
  onCanvasClick, onPointMouseDown, onDrag, onHoverChange,
}) {
  const canvasRef      = useRef(null);
  const containerRef   = useRef(null);
  const magnifierRef   = useRef(null);
  const magWrapRef     = useRef(null);
  const transformRef   = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const dragRef        = useRef(null);
  const mouseRef       = useRef({ cx: 0, cy: 0, inside: false });

  // ─── Redraw main canvas ────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const container = containerRef.current;
    canvas.width  = container.clientWidth;
    canvas.height = container.clientHeight;
    const t = getTransform(imgSize.w, imgSize.h, canvas.width, canvas.height);
    transformRef.current = t;
    draw(canvas, img, calibPixels, series, selected, hovered, showCalibMarkers, t);

    // Refresh magnifier after main canvas redraws
    if (mouseRef.current.inside) {
      refreshMagnifier(mouseRef.current.cx, mouseRef.current.cy);
    }
  }, [img, imgSize, calibPixels, series, selected, hovered, showCalibMarkers]); // eslint-disable-line

  useEffect(() => { redraw(); }, [redraw]);

  useEffect(() => {
    const ro = new ResizeObserver(redraw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  // ─── Magnifier helpers ─────────────────────────────────────────────────────
  function refreshMagnifier(cx, cy) {
    const magCanvas = magnifierRef.current;
    const mainCanvas = canvasRef.current;
    const wrap = magWrapRef.current;
    if (!magCanvas || !mainCanvas || !wrap) return;

    drawMagnifier(magCanvas, mainCanvas, cx, cy);

    // Position: prefer top-right of cursor; flip when near edges
    const cw = containerRef.current?.clientWidth  ?? 800;
    const ch = containerRef.current?.clientHeight ?? 600;
    let lx = cx + MAG_OFFSET;
    let ly = cy - MAG_SIZE - MAG_OFFSET;
    if (lx + MAG_SIZE > cw) lx = cx - MAG_SIZE - MAG_OFFSET;
    if (ly < 0)             ly = cy + MAG_OFFSET;
    if (ly + MAG_SIZE > ch) ly = ch - MAG_SIZE - 4;

    wrap.style.left    = `${lx}px`;
    wrap.style.top     = `${ly}px`;
    wrap.style.display = 'block';
  }

  function hideMagnifier() {
    if (magWrapRef.current) magWrapRef.current.style.display = 'none';
  }

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
    const { cx, cy } = getXY(e);
    mouseRef.current = { cx, cy, inside: true };
    refreshMagnifier(cx, cy);

    if (mode !== 'collect') return;
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

  function handleMouseLeave() {
    mouseRef.current.inside = false;
    dragRef.current = null;
    hideMagnifier();
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ cursor: 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => { dragRef.current = null; }}
        onMouseLeave={handleMouseLeave}
      />

      {/* Magnifier overlay */}
      <div
        ref={magWrapRef}
        style={{
          display:        'none',
          position:       'absolute',
          width:          `${MAG_SIZE}px`,
          height:         `${MAG_SIZE}px`,
          pointerEvents:  'none',
          filter:         'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
          zIndex:         50,
        }}
      >
        <canvas
          ref={magnifierRef}
          width={MAG_SIZE}
          height={MAG_SIZE}
          style={{ borderRadius: '50%' }}
        />
      </div>
    </div>
  );
}
