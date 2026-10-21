// Entry point: draws the static pieces, wires up input, restores a saved game and runs the frame loop.
import { $ } from './util.js';
import { game, fresh, isCpu, load } from './state.js';
import { Sound } from './sound.js';
import { installCreatureClips } from './creatures.js';
import { buildBoard, updateBoard } from './board.js';
import { buildDie } from './die.js';
import { layout, updateCamera } from './camera.js';
import { updateActors } from './actors.js';
import { setNote, sizeFx, updateFx } from './effects.js';
import { buildChips, showTitle, cycleSeat, getDraftSeats, setDraftSeats, openRules, closeRules, rulesOpen,
         getDraftRules, openHouseRules, setHouseRule, resetHouseRules } from './ui.js';
import { takeRoll, skipTurn, onPieceTap, startGame, resumeGame, setupBoard } from './game.js';

// ---------- Input ----------
addEventListener('pointerdown', e => { game.lastPointer = e.pointerType || 'mouse'; Sound.init(); }, true);

$('board').addEventListener('click', e => {
  const t = e.target.closest('[data-i]');
  if (!t) return;
  onPieceTap(game.S.turn, Number(t.dataset.i), t.classList.contains('mark-dest-hit') ? 'dest' : 'cell');
});
$('roll-btn').addEventListener('click', () => { Sound.init(); if (!isCpu(game.S, game.S.turn)) takeRoll(); });
$('skip-btn').addEventListener('click', skipTurn);

const soundBtn = $('sound-btn');
soundBtn.setAttribute('aria-pressed', String(Sound.on));
soundBtn.addEventListener('click', () => { Sound.toggle(); soundBtn.setAttribute('aria-pressed', String(Sound.on)); });

addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (rulesOpen()) closeRules(); return; }
  if (game.paused || e.metaKey || e.ctrlKey || e.altKey) return;
  const rollKey = e.key === 'r' || e.key === 'R' || (e.key === ' ' && e.target === document.body);
  if (rollKey && !isCpu(game.S, game.S.turn)) { e.preventDefault(); Sound.init(); takeRoll(); }
});

$('seats').addEventListener('click', e => {
  const b = e.target.closest('.seat');
  if (b) cycleSeat(Number(b.dataset.q));
});
$('start-btn').addEventListener('click', () => startGame(getDraftSeats(), getDraftRules()));
$('house-btn').addEventListener('click', openHouseRules);
$('house-done').addEventListener('click', closeRules);
$('house-reset').addEventListener('click', resetHouseRules);
$('toggles').addEventListener('change', e => { const t = e.target; if (t.dataset.rule) setHouseRule(t.dataset.rule, t.checked); });
$('resume-btn').addEventListener('click', resumeGame);
$('menu-btn').addEventListener('click', showTitle);
$('rules-btn').addEventListener('click', openRules);
$('rules-close').addEventListener('click', closeRules);
$('again-btn').addEventListener('click', () => startGame(game.S.seats, game.S.rules));
$('players-btn').addEventListener('click', () => { $('win-screen').hidden = true; setDraftSeats(game.S.seats); showTitle(); });

// ---------- Frame loop ----------
let last = performance.now();
function frame(t) {
  const dt = Math.min(.05, (t - last) / 1000);
  last = t;
  updateCamera(dt);
  updateBoard(t);
  updateActors(t, dt);
  updateFx(dt);
  requestAnimationFrame(frame);
}

// ---------- Boot ----------
installCreatureClips();
buildBoard();
buildDie();
buildChips();
sizeFx();
// After a resize, re-place the creatures right away instead of waiting for the next frame
function relayout() {
  layout();
  updateCamera(0);
  updateActors(performance.now(), 1);
}
layout();
new ResizeObserver(relayout).observe($('stage'));
addEventListener('resize', sizeFx);

const saved = load();
setupBoard(saved || fresh(getDraftSeats(), getDraftRules()));
setNote(saved && saved.started && saved.phase !== 'over' ? 'Welcome back! Tap Resume to keep going.' : 'Pick your players to begin.');

if (location.hash === '#demo') {
  // Self-playing demo with four computer players (handy for screenshots)
  startGame(['cpu', 'cpu', 'cpu', 'cpu']);
} else {
  showTitle();
}
requestAnimationFrame(frame);
