// The creatures standing on the board. Each is an upright button in a flat layer over the 3D board,
// positioned every frame from its board coordinates (see camera.js).
import { HOME, NAMES, OUTWARD, cellKey, sideDir } from './constants.js';
import { creatureSVG } from './creatures.js';
import { options } from './rules.js';
import { active } from './state.js';
import { cam, proj } from './camera.js';
import { $, reduced, clamp, replayClass } from './util.js';

let actors = [];
export const allActors = () => actors;
export const actorOf = (q, i) => actors[q * 4 + i];

// handlers: { tap(q, i), hover(q, i) } where hover(null) means the pointer left.
export function buildActors(S, handlers) {
  const layer = $('actors'), shadowLayer = $('shadows');
  layer.innerHTML = ''; shadowLayer.innerHTML = '';
  actors = [];
  for (let q = 0; q < 4; q++) for (let i = 0; i < 4; i++) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'actor';
    el.style.setProperty('--blink', `${-Math.random() * 5}s`);
    el.innerHTML = `<div class="bw" style="animation-delay:${(-Math.random() * 2.6).toFixed(2)}s">${creatureSVG(q)}</div>`;
    const sh = document.createElement('div');
    sh.className = 'shadow';
    layer.appendChild(el); shadowLayer.appendChild(sh);
    const a = { q, i, el, sh, bw: el.firstElementChild, x: 0, y: 0, h: 0, tx: 0, ty: 0, size: 1, tsize: 1, hop: null, look: 0, psx: null, hidden: false };
    el.addEventListener('click', () => handlers.tap(q, i));
    el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') handlers.hover(q, i); });
    el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') handlers.hover(null); });
    actors.push(a);
  }
  computeTargets(S);
  for (const a of actors) { a.x = a.tx; a.y = a.ty; a.size = a.tsize; }
}

// Where each creature should stand. Several on one square share it in a small grid.
export function computeTargets(S) {
  const groups = new Map();
  for (const a of actors) {
    a.hidden = !active(S, a.q);
    if (a.hidden) continue;
    if (S.ranks.includes(a.q)) {
      // Finished: line up off the board beside their own side
      const [ox, oy] = OUTWARD[a.q], [dx, dy] = sideDir(a.q);
      const off = (a.i - 1.5) * 34;
      a.tx = 250 + ox * 288 + dx * off; a.ty = 250 + oy * 288 + dy * off; a.tsize = .44;
      continue;
    }
    const k = cellKey(a.q, S.pieces[a.q][a.i]);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(a);
  }
  for (const [k, list] of groups) {
    const [r, c] = k.split(',').map(Number), n = list.length;
    const cols = n === 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4, rows = Math.ceil(n / cols);
    const size = n === 1 ? 1 : n <= 4 ? .6 : n <= 9 ? .43 : .34, step = n <= 4 ? 44 : n <= 9 ? 31 : 23;
    list.forEach((a, j) => {
      a.tx = c * 100 + 50 + (j % cols - (cols - 1) / 2) * step;
      a.ty = r * 100 + 54 + (Math.floor(j / cols) - (rows - 1) / 2) * step * .9;
      a.tsize = size;
    });
  }
}

// Jump from the current spot to the current target in an arc ht units high; spin is total degrees.
export function hop(a, ht, dur, spin = 0) {
  a.hop = { fx: a.x, fy: a.y, t0: performance.now(), dur: reduced ? 1 : dur, ht, spin };
}

// Happy eyes at Home, bouncing when movable, crown for the winner.
export function updateMoods(S) {
  const live = S.phase === 'move' ? new Set(options(S, S.turn, S.roll).map(i => S.pieces[S.turn][i])) : new Set();
  for (const a of actors) {
    const idx = S.pieces[a.q][a.i], mine = a.q === S.turn;
    a.el.classList.toggle('happy', idx === HOME);
    a.el.classList.toggle('eager', mine && live.has(idx));
    a.el.classList.toggle('crowned', S.ranks[0] === a.q);
    a.el.style.display = a.hidden ? 'none' : '';
    a.sh.style.display = a.hidden ? 'none' : '';
    const where = idx === HOME ? 'Home' : idx === 0 ? 'on its X' : `${idx} squares along`;
    a.el.setAttribute('aria-label', `${NAMES[a.q]}, ${where}${mine && live.has(idx) ? `. Move ${S.roll}` : ''}`);
  }
}

// Called every frame: advance hops, ease toward targets, and place each creature and its shadow.
export function updateActors(t, dt) {
  for (const a of actors) {
    if (a.hidden) continue;
    let spin = 0;
    if (a.hop) {
      const h = a.hop, pr = Math.min(1, (t - h.t0) / h.dur), e = pr < .5 ? 2 * pr * pr : 1 - Math.pow(-2 * pr + 2, 2) / 2;
      a.x = h.fx + (a.tx - h.fx) * e; a.y = h.fy + (a.ty - h.fy) * e;
      a.h = Math.sin(Math.PI * pr) * h.ht;
      spin = h.spin * pr;
      if (pr >= 1) {
        a.hop = null; a.h = 0; spin = 0;
        if (h.ht > 60) replayClass(a.el, 'land');
      }
    } else {
      const f = Math.min(1, dt * 9);
      a.x += (a.tx - a.x) * f; a.y += (a.ty - a.y) * f; a.h = 0;
    }
    a.size += (a.tsize - a.size) * Math.min(1, dt * 8);
    const [sx, sy, s] = proj(a.x, a.y, a.h), [gx, gy] = proj(a.x, a.y, 0);
    const sc = cam.K * .86 * a.size * s;
    a.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${sc.toFixed(3)})`;
    a.el.style.zIndex = String(Math.round(sy) + (a.hop ? 5000 : 1000));
    a.bw.style.rotate = spin ? `${spin.toFixed(0)}deg` : '';
    a.sh.style.transform = `translate(${gx.toFixed(1)}px, ${gy.toFixed(1)}px) scale(${(sc * (1 - Math.min(.6, a.h / 200))).toFixed(3)})`;
    // Eyes glance in the direction of travel
    if (a.psx != null) {
      const look = clamp((sx - a.psx) * .8, -3, 3);
      const nl = a.look + (look - a.look) * .2;
      if (Math.abs(nl - a.look) > .02) { a.look = nl; a.el.style.setProperty('--lx', nl.toFixed(2)); }
    }
    a.psx = sx;
  }
}
