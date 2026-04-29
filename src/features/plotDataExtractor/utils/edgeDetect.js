// ─── Sobel Edge Detection + Spatial Index ────────────────────────────────────
//
// detectEdges(img, threshold)
//   Runs Sobel edge detection on the image in natural pixel coordinates.
//   Returns a spatial grid index for fast nearest-neighbour snap queries.
//   Works for single curves, hatched polygons, TCC boundaries — anything
//   with a contrast gradient against the background.
//
// snapToEdge(imgPx, imgPy, spatialIndex, maxRadiusPx)
//   Finds the nearest detected edge pixel within maxRadiusPx (image pixels).
//   Returns [x, y] image-pixel coords or null if nothing is close enough.

const CELL = 4; // spatial grid cell size in image pixels

export function detectEdges(img, threshold = 0.10) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // ── Draw image to offscreen canvas at natural resolution ──────────────────
  const offscreen = document.createElement('canvas');
  offscreen.width  = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const { data } = ctx.getImageData(0, 0, w, h);

  // ── Grayscale conversion ──────────────────────────────────────────────────
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;
  }

  // ── Sobel convolution ─────────────────────────────────────────────────────
  const Gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const Gy = [-1, -2, -1,  0, 0, 0,  1, 2, 1];
  const strength = new Float32Array(w * h);
  let maxS = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let gx = 0, gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const v  = gray[(y + ky) * w + (x + kx)];
          const ki = (ky + 1) * 3 + (kx + 1);
          gx += Gx[ki] * v;
          gy += Gy[ki] * v;
        }
      }
      const s = Math.sqrt(gx * gx + gy * gy);
      strength[y * w + x] = s;
      if (s > maxS) maxS = s;
    }
  }

  if (maxS === 0) return null;

  // ── Threshold + build spatial grid index ──────────────────────────────────
  const thresh = maxS * threshold;
  const grid   = new Map();
  let   count  = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (strength[y * w + x] < thresh) continue;
      const key = `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push([x, y]);
      count++;
    }
  }

  return { grid, cellSize: CELL, count, imgW: w, imgH: h };
}

// ─── Nearest-edge query ───────────────────────────────────────────────────────
export function snapToEdge(imgPx, imgPy, spatialIndex, maxRadius) {
  if (!spatialIndex) return null;
  const { grid, cellSize } = spatialIndex;

  const cellR = Math.ceil(maxRadius / cellSize) + 1;
  const cx0   = Math.floor(imgPx / cellSize);
  const cy0   = Math.floor(imgPy / cellSize);

  let bestDist = Infinity;
  let bestPt   = null;

  for (let dy = -cellR; dy <= cellR; dy++) {
    for (let dx = -cellR; dx <= cellR; dx++) {
      const pts = grid.get(`${cx0 + dx},${cy0 + dy}`);
      if (!pts) continue;
      for (const [ex, ey] of pts) {
        const d = Math.hypot(ex - imgPx, ey - imgPy);
        if (d < bestDist) { bestDist = d; bestPt = [ex, ey]; }
      }
    }
  }

  return bestDist <= maxRadius ? bestPt : null;
}
