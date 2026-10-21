// Sizing the tilted 3D board and mapping board coordinates to screen pixels.
//
// The browser draws the tilted board with CSS 3D transforms. Each frame we measure the board's four
// corners on screen and fit a perspective mapping (homography) to them, so creatures, which are drawn
// upright in a flat layer on top, always stand exactly on their squares.
import { $ } from './util.js';

const stage = $('stage'), plane = $('plane'), scene = $('scene');
const anchorEls = [...plane.querySelectorAll('.anchor')];
const CORNERS = [[-70, -70], [570, -70], [570, 570], [-70, 570]]; // board coords of the anchors
let HM = [1, 0, 0, 0, 1, 0, 0, 0];

// W/H: stage size. CX/CY: board center in the stage. SIZE: board sheet in px. K: px per board unit.
// THETA0/TH: tilt. phiCam/PH: rotation, easing toward phiTarget.
export const cam = { W: 0, H: 0, CX: 0, CY: 0, SIZE: 0, K: 1, THETA0: 36, TH: 36, PH: 0, phiCam: 0, phiTarget: 0 };

const angDiff = (a, b) => ((a - b) % 360 + 540) % 360 - 180;

function placePlane() {
  const { SIZE, CX, CY } = cam;
  cam.K = SIZE / 640;
  Object.assign(plane.style, { width: SIZE + 'px', height: SIZE + 'px', left: (CX - SIZE / 2) + 'px', top: (CY - SIZE / 2) + 'px' });
  scene.style.perspective = (SIZE * 2.3) + 'px';
  scene.style.perspectiveOrigin = `${CX}px ${CY}px`;
}

function measure() {
  const sr = stage.getBoundingClientRect();
  return anchorEls.map(el => { const r = el.getBoundingClientRect(); return [r.left - sr.left, r.top - sr.top]; });
}

function solveHomography(dst) {
  const A = [], b = [];
  CORNERS.forEach(([x, y], n) => {
    const [u, v] = dst[n];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  });
  for (let c = 0; c < 8; c++) {
    let piv = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]];
    if (Math.abs(A[c][c]) < 1e-9) return null;
    for (let r = 0; r < 8; r++) if (r !== c) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  return b.map((v, i) => v / A[i][i]);
}

function mapPt(bx, by) {
  const [a, b, c, d, e, f, g, h] = HM, w = g * bx + h * by + 1;
  return [(a * bx + b * by + c) / w, (d * bx + e * by + f) / w];
}

// Size and center the board for the current stage size.
export function layout() {
  const r = stage.getBoundingClientRect();
  cam.W = r.width; cam.H = r.height;
  cam.CX = cam.W / 2; cam.CY = cam.H / 2;
  cam.THETA0 = cam.H > cam.W * 1.15 ? 26 : 36; // tall phone screens have height to spare, so tilt less
  cam.SIZE = Math.max(200, Math.min(cam.W, cam.H, 860));
  // Fit twice: measure the drawn board, then scale and recenter it so it (and the creatures on the top row) fit the stage.
  for (let pass = 0; pass < 2; pass++) {
    placePlane();
    plane.style.transform = `rotateX(${cam.THETA0}deg) rotateZ(${cam.phiCam}deg)`;
    const pts = measure(), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const bw = Math.max(...xs) - Math.min(...xs), headroom = cam.SIZE * .13;
    const bh = Math.max(...ys) - Math.min(...ys) + headroom;
    const f = Math.min(cam.W * .98 / bw, cam.H * .98 / bh);
    cam.SIZE = Math.max(200, Math.min(cam.SIZE * f, 900));
    const top = Math.min(...ys) - headroom, bottom = Math.max(...ys);
    cam.CY += (cam.H / 2 - (top + bottom) / 2) * f;
  }
  placePlane();
}

// Board point (bx, by) lifted h units off the board -> [stage x, stage y, local scale].
export function proj(bx, by, h) {
  const [x, y] = mapPt(bx, by);
  // Local scale from the mapping's area change, undoing the tilt's foreshortening
  const [x1, y1] = mapPt(bx + 1, by), [x2, y2] = mapPt(bx, by + 1);
  const det = Math.abs((x1 - x) * (y2 - y) - (x2 - x) * (y1 - y));
  const ks = Math.sqrt(det / Math.cos(cam.TH * Math.PI / 180));
  return [x, y - h * ks, ks / cam.K];
}

// Stage point to page coordinates (for the full-screen confetti canvas).
export function screenOf(bx, by) {
  const r = stage.getBoundingClientRect(), [x, y] = proj(bx, by, 30);
  return [r.left + x, r.top + y];
}

// The board never turns: every player sees it from the same side, so everyone can follow every move.
export function aimCamera() {
  cam.phiTarget = 0;
}
export function snapCamera() { cam.phiCam = cam.phiTarget; }

// Called every frame: apply the board transform and re-fit the mapping.
export function updateCamera(dt) {
  cam.phiCam += angDiff(cam.phiTarget, cam.phiCam) * Math.min(1, dt * 3);
  cam.TH = cam.THETA0;
  cam.PH = cam.phiCam;
  plane.style.transform = `rotateX(${cam.TH.toFixed(2)}deg) rotateZ(${cam.PH.toFixed(2)}deg)`;
  HM = solveHomography(measure()) || HM;
}
