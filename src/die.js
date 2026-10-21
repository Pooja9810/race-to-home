// The 3D die: a CSS cube that tumbles and lands on the rolled face.
import { $, reduced, replayClass } from './util.js';
import { jit } from './drawing.js';
import { later } from './state.js';
import { Sound } from './sound.js';

const PIP_POS = [[28, 28], [50, 28], [72, 28], [28, 50], [50, 50], [72, 50], [28, 72], [50, 72], [72, 72]];
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
// Cube rotation that brings each face to the front.
const FACE_ROT = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };

export function buildDie() {
  $('cube').innerHTML = [1, 2, 3, 4, 5, 6].map(n => `<div class="face f${n}"><svg viewBox="0 0 100 100">${
    PIPS[n].map(i => { const [x, y] = PIP_POS[i]; return n === 1
      ? `<circle cx="50" cy="50" r="14" style="fill:var(--red)" stroke="var(--red-dark)" stroke-width="2.5"/>`
      : `<circle cx="${x + jit(1.2)}" cy="${y + jit(1.2)}" r="${8.5 + jit(.8)}" fill="#2a2a35"/>`; }).join('')
  }</svg></div>`).join('');
}

// Spin forward a few whole turns and settle on face n, tilted slightly so it looks 3D. Resolves when it lands.
let cubeRX = -18, cubeRY = 22;
export function rollDie(n) {
  return new Promise(res => {
    const [rx, ry] = FACE_ROT[n];
    cubeRX = (Math.ceil(cubeRX / 360) + 2 + Math.floor(Math.random() * 2)) * 360 + rx - 18;
    cubeRY = (Math.ceil(cubeRY / 360) + 1 + Math.floor(Math.random() * 2)) * 360 + ry + 22;
    $('cube').style.transform = `rotateX(${cubeRX}deg) rotateY(${cubeRY}deg)`;
    replayClass($('die-wrap'), 'toss');
    Sound.rattle();
    later(() => { Sound.thud(); res(); }, reduced ? 60 : 1000);
  });
}
