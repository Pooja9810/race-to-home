// The game in progress, plus timers that are cancelled when a new game starts.
import { store } from './util.js';
import { withDefaults } from './houseRules.js';

const SAVE_KEY = 'race-to-home-save-v2';

export const game = {
  S: null,              // the current game (see fresh)
  gen: 0,               // bumped on every new game; stale timers check it and do nothing
  paused: true,         // true while the title screen is open
  lastPointer: 'mouse', // 'mouse' moves on click; touch taps once to preview, again to move
};

export function fresh(seats, rules) {
  seats = seats || ['human', 'cpu', 'cpu', 'cpu'];
  return { seats: seats.slice(), rules: withDefaults(rules), pieces: [0, 1, 2, 3].map(() => [0, 0, 0, 0]),
           turn: seats.findIndex(s => s !== 'off'), roll: null, phase: 'roll', ranks: [], bonus: [], bonusWhy: null,
           sixStreak: 0, bumped: [false, false, false, false], sel: null, preview: null, started: false };
}

export const active = (S, q) => S.seats[q] !== 'off';
export const isCpu = (S, q) => S.seats[q] === 'cpu';
export const inPlay = (S, q) => active(S, q) && !S.ranks.includes(q);

export const later = (fn, ms) => { const g = game.gen; setTimeout(() => { if (g === game.gen) fn(); }, ms); };
export const wait = ms => new Promise(res => later(res, ms));

export function save() {
  const { sel, preview, ...rest } = game.S;
  store.set(SAVE_KEY, rest);
}
export function load() {
  const d = store.get(SAVE_KEY, null);
  if (!d || !Array.isArray(d.pieces) || !Array.isArray(d.seats)) return null;
  const s = Object.assign(fresh(d.seats), d, { rules: withDefaults(d.rules), sel: null, preview: null });
  if (!['roll', 'move', 'over'].includes(s.phase)) { s.phase = 'roll'; s.roll = null; }
  return s;
}
