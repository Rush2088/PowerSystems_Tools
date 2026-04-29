// ─── Sobel Edge Detection + BFS Distance Transform ───────────────────────────
//
// detectEdges(img, threshold)
//   1. Runs Sobel on every image pixel to find edges.
//   2. BFS expands from all edge pixels simultaneously, so every non-edge
//      pixel records the coordinates of its nearest edge pixel.
//   Result: O(1) nearest-edge lookup during mousemove — the cursor always
//   lands on the true nearest curve/boundary pixel with no radius limit.
//
// snapToEdge(imgPx, imgPy, index)
//   Returns [x, y] image-pixel coords of the nearest detected edge, or null.

export function detectEdges(img, threshold = 0.10) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const N = w * h;

  // ── Draw image to offscreen canvas ────────────────────────────────────────
  const offscreen  = document.createElement('canvas');
  offscreen.width  = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);

  // ── Grayscale ─────────────────────────────────────────────────────────────
  const gray = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    gray[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;
  }

  // ── Sobel ─────────────────────────────────────────────────────────────────
  const Gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const Gy = [-1, -2, -1,  0, 0, 0,  1, 2, 1];
  const strength = new Float32Array(N);
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
  const thresh = maxS * threshold;

  // ── BFS distance transform ────────────────────────────────────────────────
  // nearX[i] / nearY[i] = coords of the nearest edge pixel for pixel i.
  // Int16 is sufficient for images up to 32 767 px wide/tall.
  const nearX  = new Int16Array(N).fill(-1);
  const nearY  = new Int16Array(N).fill(-1);
  const queue  = new Int32Array(N);  // ring buffer — each pixel enqueued at most once
  let   head   = 0;
  let   tail   = 0;
  let   count  = 0;

  // Seed queue with all edge pixels
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (strength[i] >= thresh) {
        nearX[i] = x;
        nearY[i] = y;
        queue[tail++] = i;
        count++;
      }
    }
  }

  // 8-connected BFS expansion
  const ddx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const ddy = [-1, -1, -1,  0, 0,  1, 1, 1];

  while (head < tail) {
    const i  = queue[head++];
    const px = i % w;
    const py = (i / w) | 0;
    const ex = nearX[i];
    const ey = nearY[i];
    for (let d = 0; d < 8; d++) {
      const nx = px + ddx[d];
      const ny = py + ddy[d];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (nearX[ni] !== -1) continue;   // already assigned
      nearX[ni] = ex;
      nearY[ni] = ey;
      queue[tail++] = ni;
    }
  }

  return { nearX, nearY, w, h, count };
}

// ─── O(1) nearest-edge lookup ─────────────────────────────────────────────────
export function snapToEdge(imgPx, imgPy, index) {
  if (!index) return null;
  const { nearX, nearY, w, h } = index;
  const x  = Math.max(0, Math.min(w - 1, Math.round(imgPx)));
  const y  = Math.max(0, Math.min(h - 1, Math.round(imgPy)));
  const ex = nearX[y * w + x];
  const ey = nearY[y * w + x];
  return ex === -1 ? null : [ex, ey];
}
