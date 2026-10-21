// Hand-drawn SVG path helpers: wobbly ink lines, pencil hatching and scribbled circles.

// Seeded random numbers, so the board looks the same every time it loads.
let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
export const jit = a => (rnd() * 2 - 1) * a;
export const f1 = n => n.toFixed(1);
export { rnd };

export function inkLine(x1, y1, x2, y2, amp = 2.2) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  const a = jit(amp), b = jit(amp);
  return `M${f1(x1 + jit(1.5))} ${f1(y1 + jit(1.5))} C${f1(x1 + dx * .33 + nx * a)} ${f1(y1 + dy * .33 + ny * a)} ${f1(x1 + dx * .66 + nx * b)} ${f1(y1 + dy * .66 + ny * b)} ${f1(x2 + jit(1.5))} ${f1(y2 + jit(1.5))}`;
}

// n short diagonal pencil strokes scattered over a w x h box.
export function hatch(x, y, w, h, n) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const cx = x + 7 + rnd() * (w - 14), cy = y + 7 + rnd() * (h - 14), L = 7 + rnd() * 10, ang = -1.05 + jit(.18);
    const dx = Math.cos(ang) * L / 2, dy = Math.sin(ang) * L / 2;
    d += `M${f1(cx - dx)} ${f1(cy - dy)}l${f1(2 * dx)} ${f1(2 * dy)}`;
  }
  return d;
}

// Catmull-Rom curve through the points, as an SVG path.
function smooth(pts) {
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}

// A circle drawn by hand: slightly uneven, and overshooting where the pen started.
export function roughCircle(cx, cy, r, sd) {
  let s = sd * 97 + 13;
  const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const a0 = R() * Math.PI * 2, n = 26, pts = [];
  for (let j = 0; j <= n; j++) {
    const a = a0 + j / n * 1.13 * Math.PI * 2, rr = r * (1 + (R() - .5) * .08) + j / n * 4;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .95]);
  }
  return smooth(pts);
}
