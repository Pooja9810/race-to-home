// The tray (player chips and roll button) and the title, rules and win screens.
import { HOME, NAMES, ORD, cv, cvd } from './constants.js';
import { creatureSVG } from './creatures.js';
import { game, active, isCpu } from './state.js';
import { rain } from './effects.js';
import { Sound } from './sound.js';
import { RULE_INFO, withDefaults } from './houseRules.js';
import { $, store } from './util.js';

// ---------- Tray ----------
export function buildChips() {
  $('players').innerHTML = [0, 1, 2, 3].map(q => `
    <div class="chip" id="chip-${q}" style="--pc:${cv(q)};--pc-dark:${cvd(q)}">
      ${creatureSVG(q)}
      <div class="chip-text">
        <span class="chip-name">${NAMES[q]}</span>
        <span class="chip-meta"><span class="chip-dots"><i></i><i></i><i></i><i></i></span><span class="chip-role"></span><span class="chip-place"></span></span>
      </div>
    </div>`).join('');
}

export function renderTray(S) {
  const p = S.turn, human = !isCpu(S, p);
  document.documentElement.style.setProperty('--turn-dark', cvd(p));
  for (let q = 0; q < 4; q++) {
    const chip = $('chip-' + q), place = S.ranks.indexOf(q);
    chip.classList.toggle('active', q === p && S.phase !== 'over');
    chip.classList.toggle('off', !active(S, q));
    chip.querySelectorAll('.chip-dots i').forEach((d, j) => d.classList.toggle('home', j < S.pieces[q].filter(x => x === HOME).length));
    chip.querySelector('.chip-role').textContent = !active(S, q) ? 'off' : S.seats[q] === 'human' ? 'you' : 'cpu';
    chip.querySelector('.chip-place').textContent = place < 0 ? '' : place === 0 ? '★1st' : ORD[place];
  }
  $('roll-btn').disabled = !(S.phase === 'roll' && human && !game.paused);
  $('skip-btn').hidden = !(S.phase === 'move' && human && !game.paused && S.rules.allowSkip);
  $('roll-label').textContent = {
    roll: human ? 'tap to roll' : 'thinking…', rolling: 'rolling…', move: human ? 'pick one!' : 'hmm…',
    anim: 'hop hop…', stuck: 'no moves', over: 'done!',
  }[S.phase] || '';
}

// ---------- Title screen: choose who plays each creature ----------
const ROLE_NAME = { human: 'You', cpu: 'Computer', off: 'Off' };
let draftSeats = store.get('rth-seats', ['human', 'cpu', 'cpu', 'cpu']);
export const getDraftSeats = () => draftSeats;
export function setDraftSeats(seats) { draftSeats = seats.slice(); }

export function cycleSeat(q) {
  const order = ['human', 'cpu', 'off'];
  draftSeats[q] = order[(order.indexOf(draftSeats[q]) + 1) % 3];
  store.set('rth-seats', draftSeats);
  Sound.squeak();
  renderSeats();
}

function renderSeats() {
  $('seats').innerHTML = [0, 1, 2, 3].map(q => `
    <button class="seat ${draftSeats[q] === 'off' ? 'off' : ''}" type="button" data-q="${q}" style="--pc:${cv(q)};--pc-dark:${cvd(q)}"
      aria-label="${NAMES[q]}: ${ROLE_NAME[draftSeats[q]]}. Tap to change.">
      <div class="bw" style="animation-delay:${-q * .4}s">${creatureSVG(q)}</div>
      <span class="seat-name">${NAMES[q]}</span>
      <span class="seat-role ${draftSeats[q]}">${ROLE_NAME[draftSeats[q]]}</span>
    </button>`).join('');
  const n = draftSeats.filter(s => s !== 'off').length;
  $('start-btn').disabled = n < 2;
  const hint = $('seat-hint');
  hint.textContent = n < 2 ? 'Turn on at least 2 players to start.' : 'Tap a creature to switch between You, Computer and Off.';
  hint.classList.toggle('warn', n < 2);
}

export function showTitle() {
  const S = game.S;
  game.paused = true;
  renderSeats();
  $('resume-btn').hidden = !(S.started && S.phase !== 'over');
  $('title-screen').hidden = false;
  renderTray(S);
}

export function hideScreens() {
  ['title-screen', 'win-screen'].forEach(id => { $(id).hidden = true; });
}

export const openRules = () => { $('rules-screen').hidden = false; };
export const closeRules = () => { $('rules-screen').hidden = true; $('house-screen').hidden = true; };
export const rulesOpen = () => !$('rules-screen').hidden || !$('house-screen').hidden;

// ---------- House rules: optional rules chosen before a game ----------
let draftRules = withDefaults(store.get('rth-rules', null));
export const getDraftRules = () => draftRules;

function renderHouseRules() {
  $('toggles').innerHTML = RULE_INFO.map(([id, label, info]) => `
    <label class="toggle">
      <input type="checkbox" data-rule="${id}" ${draftRules[id] ? 'checked' : ''}>
      <span class="box" aria-hidden="true"></span>
      <span class="toggle-text"><b>${label}</b><small>${info}</small></span>
    </label>`).join('');
  const S = game.S, midGame = S && S.started && S.phase !== 'over';
  $('house-hint').textContent = midGame ? 'Changes apply to your next game.' : '';
}
export function openHouseRules() { renderHouseRules(); $('house-screen').hidden = false; }
export function setHouseRule(id, on) {
  draftRules[id] = on;
  store.set('rth-rules', draftRules);
  Sound.scribble();
}
export function resetHouseRules() {
  draftRules = withDefaults(null);
  store.set('rth-rules', draftRules);
  renderHouseRules();
}

// ---------- Win screen ----------
export function showWin(S) {
  const w = S.ranks[0];
  $('win-title').textContent = `${NAMES[w]} wins!`;
  $('win-title').style.color = cvd(w);
  const parade = $('win-parade');
  parade.innerHTML = [0, 1, 2, 3].map(() => `<div class="bw" style="animation-delay:${-Math.random() * 2}s">${creatureSVG(w)}</div>`).join('');
  parade.classList.add('happy', 'crowned');
  $('standings').innerHTML = S.ranks.map((q, i) => `<li><span class="place">${ORD[i]}</span>${creatureSVG(q)}<span class="who" style="color:${cvd(q)}">${NAMES[q]}</span></li>`).join('');
  $('win-screen').hidden = false;
  rain(90);
}
