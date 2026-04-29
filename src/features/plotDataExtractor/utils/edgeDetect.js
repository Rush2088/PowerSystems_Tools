// ─── Sobel Edge Detection + NMS + Centre-line Snapping + BFS ─────────────────
//
// Pipeline:
//   1. Sobel — compute gradient magnitude + direction at every pixel.
//   2. Non-maximum suppression (NMS) — keep only pixels that are local maxima
//      along the gradient direction, thinning every edge to 1-pixel width.
//      This eliminates the "double edge" produced on both sides of a thick line.
//   3. Centre-line pairing — for each NMS pixel, walk in the gradient direction
//      to look for an opposing NMS edge within MAX_PAIR_PX pixels. If found, the
//      two edges are opposite walls of a thick line; the BFS is seeded from their
//      midpoint (= the centreline). Unpaired edges (thin lines, axis borders) are
//      seeded from the original NMS pixel — no change for those.
//   4. BFS distance transform — expands simultaneously from all seed pixels so
//      that every image pixel stores the coords of its nearest seed (O(1) lookup).
//
// Result: the snap cursor rides the TRUE CENTRE of thick curves/lines rather than
// landing on one of their outer edges.

const MAX_PAIR_PX = 30; // maximum line half-width to search for an opposing edge

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

  // ── Sobel — store gx, gy, and magnitude ──────────────────────────────────
  const GX  = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const GY  = [-1, -2, -1,  0, 0, 0,  1, 2, 1];
  const gxA = new Float32Array(N);
  const gyA = new Float32Array(N);
  const str = new Float32Array(N);
  let maxS = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let gx = 0, gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const v  = gray[(y + ky) * w + (x + kx)];
          const ki = (ky + 1) * 3 + (kx + 1);
          gx += GX[ki] * v;
          gy += GY[ki] * v;
        }
      }
      const s = Math.sqrt(gx * gx + gy * gy);
      gxA[y * w + x] = gx;
      gyA[y * w + x] = gy;
      str[y * w + x] = s;
      if (s > maxS) maxS = s;
    }
  }

  if (maxS === 0) return null;
  const thresh = maxS * threshold;

  // ── Non-maximum suppression ───────────────────────────────────────────────
  // Each edge pixel is only kept if it is the local maximum along the gradient
  // direction. This collapses the two parallel edges of a thick line down to a
  // pair of single-pixel-wide edges (one per wall), ready for centre pairing.
  //
  // Direction buckets (gradient angle → which neighbour pair to compare):
  //   |gx| ≥ 2|gy|  → near-horizontal gradient → vertical edge → left / right
  //   |gy| ≥ 2|gx|  → near-vertical gradient   → horizontal edge → above / below
  //   gx·gy > 0      → ~45° (NW-SE) gradient    → diagonal NW / SE
  //   gx·gy ≤ 0      → ~135° (NE-SW) gradient   → diagonal NE / SW
  const nms = new Uint8Array(N);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const s = str[i];
      if (s < thresh) continue;
      const gx = gxA[i], gy = gyA[i];
      const ax = Math.abs(gx), ay = Math.abs(gy);
      let s1, s2;
      if      (ax >= 2 * ay)   { s1 = str[y * w + (x - 1)];       s2 = str[y * w + (x + 1)];       } // left/right
      else if (ay >= 2 * ax)   { s1 = str[(y - 1) * w + x];       s2 = str[(y + 1) * w + x];       } // above/below
      else if (gx * gy > 0)    { s1 = str[(y - 1) * w + (x - 1)]; s2 = str[(y + 1) * w + (x + 1)]; } // NW/SE
      else                     { s1 = str[(y + 1) * w + (x - 1)]; s2 = str[(y - 1) * w + (x + 1)]; } // SW/NE
      if (s >= s1 && s >= s2) nms[i] = 1;
    }
  }

  // ── Centre-line pairing + BFS seed placement ──────────────────────────────
  // For each NMS pixel, walk up to MAX_PAIR_PX steps in the gradient direction.
  // If another NMS pixel is found, the two are opposite walls of a thick line —
  // plant the BFS seed at their midpoint (the line's centreline).
  // If no partner is found the pixel is a thin line or a hard boundary; seed it
  // directly so that snapping still works correctly for those features.
  const nearX = new Int16Array(N).fill(-1);
  const nearY = new Int16Array(N).fill(-1);
  const queue = new Int32Array(N);
  let   head  = 0;
  let   tail  = 0;
  let   count = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (!nms[y * w + x]) continue;
      const gx  = gxA[y * w + x];
      const gy  = gyA[y * w + x];
      const len = Math.sqrt(gx * gx + gy * gy) || 1;
      const ndx = gx / len;
      const ndy = gy / len;

      // Search for an opposing NMS edge along the gradient direction
      let px2 = -1, py2 = -1;
      for (let d = 2; d <= MAX_PAIR_PX; d++) {
        const tx = Math.round(x + ndx * d);
        const ty = Math.round(y + ndy * d);
        if (tx < 0 || ty < 0 || tx >= w || ty >= h) break;
        if (nms[ty * w + tx]) { px2 = tx; py2 = ty; break; }
      }

      // Seed at midpoint (paired thick line) or original pixel (thin/boundary)
      const sx = px2 >= 0 ? Math.round((x + px2) / 2) : x;
      const sy = py2 >= 0 ? Math.round((y + py2) / 2) : y;
      const si = sy * w + sx;
      if (nearX[si] === -1) {
        nearX[si] = sx;
        nearY[si] = sy;
        queue[tail++] = si;
        count++;
      }
    }
  }

  // ── BFS expansion ─────────────────────────────────────────────────────────
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
      if (nearX[ni] !== -1) continue;
      nearX[ni] = ex;
      nearY[ni] = ey;
      queue[tail++] = ni;
    }
  }

  return { nearX, nearY, w, h, count };
}

// ─── O(1) nearest-centre lookup ───────────────────────────────────────────────
export function snapToEdge(imgPx, imgPy, index) {
  if (!index) return null;
  const { nearX, nearY, w, h } = index;
  const x  = Math.max(0, Math.min(w - 1, Math.round(imgPx)));
  const y  = Math.max(0, Math.min(h - 1, Math.round(imgPy)));
  const ex = nearX[y * w + x];
  const ey = nearY[y * w + x];
  return ex === -1 ? null : [ex, ey];
}
