// The hand-drawn board and everything drawn on it: move circles, path previews, trails and rank labels.
import { HOME, PATHS, SAFE, OUTWARD, ORD, key, cellKey, center, cv, cvd, sideDir } from './constants.js';
import { inkLine, hatch, roughCircle, rnd, f1 } from './drawing.js';
import { options, victimsAt, destOf } from './rules.js';
import { active, inPlay } from './state.js';
import { cam } from './camera.js';
import { $, reduced } from './util.js';

const homeTri = q => [['200,300', '300,300'], ['300,300', '300,200'], ['300,200', '200,200'], ['200,200', '200,300']][q].concat('250,250').join(' ');

// Player q's whole route as a line through the squares, shifted sideways into its own lane so all
// four routes can be drawn at once without covering each other.
function lanePoints(q) {
  const pts = PATHS[q].map(center), off = (q - 1.5) * 11;
  const normal = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [-dy / l, dx / l]; };
  const out = pts.map((p, j) => {
    const n1 = j > 0 ? normal(pts[j - 1], p) : null, n2 = j < pts.length - 1 ? normal(p, pts[j + 1]) : null;
    let n = n1 || n2;
    if (n1 && n2) { const d = 1 + n1[0] * n2[0] + n1[1] * n2[1]; n = [(n1[0] + n2[0]) / d, (n1[1] + n2[1]) / d]; } // miter at corners
    return [p[0] + n[0] * off, p[1] + n[1] * off];
  });
  const [a, b] = [out[HOME - 1], out[HOME]];
  out[HOME] = [a[0] + (b[0] - a[0]) * .6, a[1] + (b[1] - a[1]) * .6]; // stop just inside Home
  return out;
}

export function buildBoard() {
  let s = '<defs>' + [0, 1, 2, 3].map(q => `<clipPath id="tri-${q}"><polygon points="${homeTri(q)}"/></clipPath>` +
    `<marker id="lane-end-${q}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.4" markerHeight="3.4" orient="auto"><path d="M0,0 L10,5 L0,10 z" style="fill:${cv(q)}"/></marker>`).join('') + '</defs>';
  const starts = PATHS.map(p => key(...p[0]));
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const k = key(r, c), q = starts.indexOf(k), x = c * 100, y = r * 100;
    if (q >= 0) s += `<path class="hatch hatch-strong" d="${hatch(x, y, 100, 100, 75)}" style="stroke:${cv(q)}"/>`;
    else if (k === '2,2') for (let p = 0; p < 4; p++) s += `<g clip-path="url(#tri-${p})"><path class="hatch hatch-strong" d="${hatch(x - 6, y - 6, 112, 112, 80)}" style="stroke:${cv(p)}"/></g>`;
  }
  // Direction arrows in the margin, like the original paper sketch
  s += '<g class="pencil-arrow">';
  for (let q = 0; q < 4; q++) {
    const [ox, oy] = OUTWARD[q], [dx, dy] = sideDir(q);
    const mx = 250 + ox * 285, my = 250 + oy * 285;
    const x1 = mx + dx * 105, y1 = my + dy * 105, x2 = mx + dx * 205, y2 = my + dy * 205;
    s += `<path d="${inkLine(x1, y1, x2, y2, 3)}"/><path d="M${x2 - dx * 14 - dy * 9} ${y2 - dy * 14 + dx * 9} L${x2} ${y2} L${x2 - dx * 14 + dy * 9} ${y2 - dy * 14 - dx * 9}"/>`;
  }
  s += '</g><g filter="url(#boil)">';
  for (let pass = 0; pass < 2; pass++) {
    const cls = pass ? 'ink-line thin' : 'ink-line';
    for (let i = 0; i <= 5; i++) {
      s += `<path class="${cls}" d="${inkLine(i * 100, -5 - rnd() * 4, i * 100, 505 + rnd() * 4)}"/>`;
      s += `<path class="${cls}" d="${inkLine(-5 - rnd() * 4, i * 100, 505 + rnd() * 4, i * 100)}"/>`;
    }
    for (const k of starts) {
      const [r, c] = k.split(',').map(Number), x = c * 100, y = r * 100;
      s += `<path class="${cls}" d="${inkLine(x + 6, y + 6, x + 96, y + 95, 3)}"/><path class="${cls}" d="${inkLine(x + 95, y + 5, x + 5, y + 96, 3)}"/>`;
    }
  }
  s += '</g><g id="lanes">' + [0, 1, 2, 3].map(q =>
    `<polyline class="lane" id="lane-${q}" points="${lanePoints(q).map(p => p.map(f1).join(',')).join(' ')}" style="stroke:${cv(q)}" marker-end="url(#lane-end-${q})"/>`).join('') + '</g>';
  s += '<text id="home-text" class="home-text" x="250" y="252">HOME</text>';
  s += '<g id="trail"></g><g id="marks"></g><g id="rank-labels"></g>';
  $('board').innerHTML = s;
}

// All four lanes stay visible; the current player's is brighter and flows toward Home.
export function renderLanes(S) {
  for (let q = 0; q < 4; q++) {
    const lane = $('lane-' + q);
    lane.classList.toggle('active', q === S.turn && S.phase !== 'over');
    lane.classList.toggle('gone', !active(S, q) || S.ranks.includes(q));
  }
}

// Circles under movable pieces, a dotted ring around pairs, plus a dotted path and target circle for the previewed piece.
let marksSig = '';
export function resetMarks() { marksSig = ''; }
export function renderMarks(S) {
  const p = S.turn, live = S.phase === 'move' ? options(S, p, S.roll) : [];
  const sig = [S.phase, p, S.roll, live.join('.'), S.preview, S.pieces.flat().join(''), Math.round(cam.phiTarget)].join('|');
  if (sig === marksSig) return;
  marksSig = sig;
  let s = '';
  for (let q = 0; q < 4; q++) {
    if (!inPlay(S, q) || !S.rules.pairsSafe) continue;
    const counts = {};
    S.pieces[q].forEach(idx => { counts[idx] = (counts[idx] || 0) + 1; });
    for (const idx in counts) {
      const k = cellKey(q, +idx);
      if (counts[idx] < 2 || SAFE.has(k)) continue;
      const [cx, cy] = center(PATHS[q][+idx]);
      s += `<path class="pair-ring" d="${roughCircle(cx, cy, 47, q * 7 + +idx)}" style="stroke:${cvd(q)}"/>`;
    }
  }
  for (const i of live) {
    const [cx, cy] = center(PATHS[p][S.pieces[p][i]]);
    s += `<path class="mark-can" d="${roughCircle(cx, cy, 43, i + S.roll)}" style="stroke:${cv(p)}"/>`;
    s += `<rect class="mark-hit" data-i="${i}" x="${cx - 50}" y="${cy - 50}" width="100" height="100"/>`;
  }
  if (S.preview != null && live.includes(S.preview)) {
    const from = S.pieces[p][S.preview], to = destOf(S, p, S.preview), pts = [];
    for (let j = from; j < to; j++) {
      const a = center(PATHS[p][j]), b = center(PATHS[p][j + 1]);
      pts.push([(a[0] * 2 + b[0]) / 3, (a[1] * 2 + b[1]) / 3], [(a[0] + b[0] * 2) / 3, (a[1] + b[1] * 2) / 3]);
      if (j + 1 < to) pts.push(b);
    }
    pts.slice(1).forEach(([x, y], n) => { s += `<circle class="dot" cx="${f1(x)}" cy="${f1(y)}" r="5" style="fill:${cv(p)};animation-delay:${n * 35}ms"/>`; });
    const [dx, dy] = center(PATHS[p][to]);
    s += `<path class="mark-dest" d="${roughCircle(dx, dy, 30, 7)}" style="stroke:${cvd(p)}"/>`;
    s += `<path class="mark-dest" d="${roughCircle(dx, dy, 37, 3)}" style="stroke:${cv(p)};animation-delay:.25s"/>`;
    s += `<rect class="mark-dest-hit" data-i="${S.preview}" x="${dx - 50}" y="${dy - 50}" width="100" height="100"/>`;
    const word = to === HOME ? ['home!', cvd(p)] : victimsAt(S, p, cellKey(p, to)).length ? ['bump!', 'var(--red-dark)'] : null;
    if (word) s += `<text class="mark-word" x="${dx}" y="${dy - 46}" transform="rotate(${-cam.phiTarget} ${dx} ${dy})" style="fill:${word[1]}">${word[0]}</text>`;
  }
  $('marks').innerHTML = s;
}

// Fading dots along the path a piece just walked.
export function dropTrail(p, from, to) {
  let s = '';
  for (let j = from; j < to; j++) {
    const a = center(PATHS[p][j]), b = center(PATHS[p][j + 1]);
    for (const t of [.33, .66]) s += `<circle class="trail-dot" cx="${f1(a[0] + (b[0] - a[0]) * t)}" cy="${f1(a[1] + (b[1] - a[1]) * t)}" r="4.5" style="fill:${cv(p)};animation-delay:${(j - from) * 60}ms"/>`;
  }
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.innerHTML = s;
  $('trail').appendChild(g);
  setTimeout(() => g.remove(), 2400);
}

// "1st", "2nd"... written in the margin beside each finished player.
export function renderRanks(S) {
  $('rank-labels').innerHTML = S.ranks.map((q, place) => {
    const [ox, oy] = OUTWARD[q], [dx, dy] = sideDir(q);
    const x = 250 + ox * 288 - dx * 108, y = 250 + oy * 288 - dy * 108;
    return `<text class="rank-text" data-x="${x}" data-y="${y}" x="${x}" y="${y}" style="fill:${cvd(q)}">${ORD[place]}</text>`;
  }).join('');
}

// Called every frame: keep text upright as the board turns, and make the ink lines "boil".
let boilT = 0, boilSeed = 1;
export function updateBoard(t) {
  const rot = (-cam.PH).toFixed(1), ht = $('home-text');
  if (ht) ht.setAttribute('transform', `rotate(${rot} 250 250)`);
  document.querySelectorAll('.rank-text').forEach(el => el.setAttribute('transform', `rotate(${rot} ${el.dataset.x} ${el.dataset.y})`));
  if (!reduced && t - boilT > 140) { boilT = t; boilSeed = boilSeed % 3 + 1; $('boil-noise').setAttribute('seed', boilSeed); }
}
