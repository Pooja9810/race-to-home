// Pop-up words, the sticky note, and doodle confetti.
import { COLOR } from './constants.js';
import { cam, proj } from './camera.js';
import { $, reduced, pick, replayClass } from './util.js';

// A handwritten word that pops up and floats away. With no board point it appears mid-board.
export function popWord(text, bx, by, color, big) {
  const el = document.createElement('div');
  el.className = 'pop-word' + (big ? ' big' : '');
  el.textContent = text;
  el.style.color = color;
  if (bx == null) { el.style.left = cam.CX + 'px'; el.style.top = (cam.CY - cam.SIZE * .1) + 'px'; }
  else { const [x, y] = proj(bx, by, 70); el.style.left = x + 'px'; el.style.top = y + 'px'; }
  $('pops').appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

// A handful of reaction emojis flying out of a board square.
const REACTIONS = ['💀', '😂', '🫣', '👀', '😭', '🤭', '🪦', '😬', '🫡', '💅'];
export function emojiBurst(bx, by, n = 7) {
  const [x, y] = proj(bx, by, 50);
  for (let j = 0; j < n; j++) {
    const el = document.createElement('span');
    el.className = 'emoji-pop';
    el.textContent = pick(REACTIONS);
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.setProperty('--dx', `${Math.round((Math.random() - .5) * 220)}px`);
    el.style.setProperty('--dy', `${-Math.round(70 + Math.random() * 110)}px`);
    el.style.setProperty('--rot', `${Math.round((Math.random() - .5) * 60)}deg`);
    el.style.animationDelay = `${j * 70}ms`;
    $('pops').appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
}

export function setNote(text) {
  $('note-text').textContent = text;
  replayClass($('note'), 'pop');
}

// ---------- Confetti on a full-screen canvas ----------
const fx = $('fx'), fctx = fx.getContext('2d');
let parts = [], dirty = false;
export let palette = []; // the four player colors, then ink

export function sizeFx() {
  const d = Math.min(2, devicePixelRatio || 1);
  fx.width = innerWidth * d; fx.height = innerHeight * d; fctx.setTransform(d, 0, 0, d, 0, 0);
  const cs = getComputedStyle(document.documentElement);
  palette = COLOR.map(c => cs.getPropertyValue(c).trim()).concat(cs.getPropertyValue('--ink').trim());
}

const KINDS = ['star', 'squiggle', 'ring', 'dash'];
export function burst(x, y, n, colors, power = 9) {
  if (reduced) return;
  for (let j = 0; j < n; j++) parts.push({
    x, y, vx: (Math.random() - .5) * power * 1.4, vy: -Math.random() * power - 2, r: Math.random() * 6.28, vr: (Math.random() - .5) * .3,
    kind: pick(KINDS), color: pick(colors), life: 1, size: 7 + Math.random() * 8,
  });
}
export function rain(n) {
  if (reduced) return;
  for (let j = 0; j < n; j++) parts.push({
    x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .6, vx: (Math.random() - .5) * 2, vy: 1 + Math.random() * 2,
    r: Math.random() * 6.28, vr: (Math.random() - .5) * .2, kind: pick(KINDS), color: pick(palette), life: 1.6, size: 8 + Math.random() * 9,
  });
}

// Called every frame.
export function updateFx(dt) {
  if (!parts.length) {
    if (dirty) { fctx.clearRect(0, 0, innerWidth, innerHeight); dirty = false; }
    return;
  }
  dirty = true;
  fctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
  for (const p of parts) {
    p.vy += 18 * dt; p.vx *= .99; p.x += p.vx * 60 * dt * .5; p.y += p.vy * 60 * dt * .5; p.r += p.vr; p.life -= dt * .45;
    fctx.save(); fctx.translate(p.x, p.y); fctx.rotate(p.r); fctx.globalAlpha = Math.min(1, p.life * 1.5);
    fctx.strokeStyle = fctx.fillStyle = p.color; fctx.lineWidth = 2.4; fctx.lineCap = fctx.lineJoin = 'round';
    const s = p.size;
    fctx.beginPath();
    if (p.kind === 'star') { for (let k = 0; k < 10; k++) { const rr = k % 2 ? s * .45 : s, a = k * Math.PI / 5; fctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } fctx.closePath(); fctx.globalAlpha *= .85; fctx.fill(); }
    else if (p.kind === 'squiggle') { fctx.moveTo(-s, 0); fctx.bezierCurveTo(-s / 2, -s, 0, s, s / 2, 0); fctx.quadraticCurveTo(s * .8, -s / 2, s, 0); fctx.stroke(); }
    else if (p.kind === 'ring') { fctx.arc(0, 0, s * .55, 0, 5.9); fctx.stroke(); }
    else { fctx.moveTo(-s * .6, 0); fctx.lineTo(s * .6, 0); fctx.stroke(); }
    fctx.restore();
  }
}
