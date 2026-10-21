// Pure game rules: legal moves, captures and the computer player's choice.
// Every function reads the game's house rules from S.rules (see houseRules.js).
import { HOME, SAFE, cellKey } from './constants.js';
import { inPlay } from './state.js';

const LAST_OUTER = 15; // index of the last outer-ring square on every route

// Furthest square player p may reach right now.
function maxIdx(S, p) {
  return S.rules.bumpToEnter && !S.bumped[p] ? LAST_OUTER : HOME;
}

// Where piece i of player p ends up with the current roll.
export function destOf(S, p, i, roll = S.roll) {
  const to = S.pieces[p][i] + roll;
  return S.rules.exactHome ? to : Math.min(to, HOME);
}

// Pieces of player p that can move `roll` squares. Pieces sharing a square count once.
export function options(S, p, roll) {
  const seen = new Set(), out = [];
  S.pieces[p].forEach((idx, i) => {
    if (idx >= HOME || seen.has(idx)) return;
    const to = destOf(S, p, i, roll);
    if (to <= HOME && to <= maxIdx(S, p)) { seen.add(idx); out.push(i); }
  });
  return out;
}

// The movable piece standing on the same square as piece i, if any.
export function optionFor(S, p, i) {
  if (S.phase !== 'move') return null;
  const idx = S.pieces[p][i];
  const o = options(S, p, S.roll).find(j => S.pieces[p][j] === idx);
  return o === undefined ? null : o;
}

// Each opponent's pieces on square k, as [[q, i], ...] per opponent.
function opponentsAt(S, p, k) {
  const out = [];
  for (let q = 0; q < 4; q++) {
    if (q === p || !inPlay(S, q)) continue;
    const here = [];
    S.pieces[q].forEach((idx, i) => { if (cellKey(q, idx) === k) here.push([q, i]); });
    if (here.length) out.push(here);
  }
  return out;
}

// Opponent pieces that would be sent back to start if p landed on square k.
// With the pairs rule on, two or more pieces of one color on a square can't be sent back.
export function victimsAt(S, p, k) {
  if (SAFE.has(k)) return [];
  return opponentsAt(S, p, k).filter(here => here.length === 1 || !S.rules.pairsSafe).flat();
}

// Opponents with a protected pair on square k (so landing there bumps nobody of that color).
export function pairsAt(S, p, k) {
  if (SAFE.has(k) || !S.rules.pairsSafe) return [];
  return opponentsAt(S, p, k).filter(here => here.length > 1).map(here => here[0][0]);
}

// Could any opponent land on square k with their next roll?
export function threatened(S, p, k) {
  if (SAFE.has(k)) return false;
  for (let q = 0; q < 4; q++) {
    if (q === p || !inPlay(S, q)) continue;
    for (const j of S.pieces[q]) for (let d = 1; d <= 6 && j + d <= HOME; d++) if (cellKey(q, j + d) === k) return true;
  }
  return false;
}

export function cpuPick(S, p, opts) {
  let best = opts[0], bestScore = -Infinity;
  // How many of p's other pieces (not piece i) stand at path position idx
  const mates = (idx, i) => S.pieces[p].filter((x, j) => j !== i && x === idx).length;
  const pairs = S.rules.pairsSafe;
  for (const i of opts) {
    const from = S.pieces[p][i], to = destOf(S, p, i);
    const fk = cellKey(p, from), tk = cellKey(p, to);
    let s = to;
    if (to === HOME) s += 80;
    else if (SAFE.has(tk)) s += 25;
    else {
      if (victimsAt(S, p, tk).length) s += 100;
      if (pairs && mates(to, i)) s += 20; // joining a teammate makes a pair, which is safe
      else if (threatened(S, p, tk)) s -= 35;
    }
    const left = pairs ? mates(from, i) : 0;
    if (left === 0 && threatened(S, p, fk)) s += 30; // escaping danger
    if (left === 1 && !SAFE.has(fk) && threatened(S, p, fk)) s -= 20; // breaking a pair leaves the other exposed
    s += Math.random() * 3;
    if (s > bestScore) { bestScore = s; best = i; }
  }
  return best;
}
