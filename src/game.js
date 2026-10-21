// Turn flow: rolling, moving, bumping, extra rolls, finishing and starting new games.
// Optional rules come from S.rules (see houseRules.js).
import { HOME, PATHS, NAMES, ORD, cellKey, center, cvd } from './constants.js';
import { game, fresh, isCpu, inPlay, later, wait, save } from './state.js';
import { options, optionFor, victimsAt, pairsAt, cpuPick, destOf } from './rules.js';
import { Sound } from './sound.js';
import { rollDie } from './die.js';
import { aimCamera, snapCamera, screenOf } from './camera.js';
import { renderMarks, resetMarks, dropTrail, renderRanks, renderLanes } from './board.js';
import { buildActors, computeTargets, updateMoods, hop, actorOf, allActors } from './actors.js';
import { popWord, setNote, burst, rain, emojiBurst, palette } from './effects.js';
import { renderTray, showWin, hideScreens } from './ui.js';
import { reduced, pick, replayClass } from './util.js';

// Reactions when someone gets sent back to start
const BUMP_CAPTIONS = ['bye bestie 👋', 'skill issue 💀', 'we saw that coming 👀', "it's giving… start square", 'caught in 4K 📸',
                       'not the comeback arc 😭', 'sent to the shadow realm 🪦', 'no bc why 😭', 'and they said nothing 🤭'];

export function renderUI() {
  const S = game.S;
  aimCamera(S);
  computeTargets(S);
  updateMoods(S);
  renderMarks(S);
  renderRanks(S);
  renderLanes(S);
  renderTray(S);
}

export async function takeRoll() {
  const S = game.S, R = S.rules;
  if (S.phase !== 'roll' || game.paused) return;
  S.phase = 'rolling'; S.sel = S.preview = null; S.started = true;
  renderUI();
  const n = 1 + Math.floor(Math.random() * 6), p = S.turn;
  await rollDie(n);
  S.roll = n;
  if (n === 6) {
    S.sixStreak++;
    if (R.threeSixes && S.sixStreak >= 3) {
      S.phase = 'stuck'; S.bonus = [];
      setNote(`Three 6s in a row! ${NAMES[p]}'s turn is over. Greedy 😤`);
      popWord('3 sixes?! 😤', null, null, cvd(p), true);
      renderUI();
      await wait(1500);
      nextTurn();
      return;
    }
    Sound.six();
    popWord('6!', null, null, cvd(p), true);
  }
  const opts = options(S, p, n), sixAgain = n === 6 && R.sixBonus;
  if (!opts.length) {
    S.phase = 'stuck';
    if (sixAgain) S.bonus.push('six');
    setNote(sixAgain ? `A 6, but nobody can move. ${NAMES[p]} rolls again.` : `Rolled ${n}. Nobody can move that far.`);
    renderUI();
    await wait(1300);
    nextTurn();
    return;
  }
  S.phase = 'move';
  if (isCpu(S, p)) {
    setNote(n === 6 ? `${NAMES[p]} rolled a 6!` : `${NAMES[p]} rolled a ${n}.`);
    renderUI();
    await cpuMove();
  } else {
    // Always wait for a tap (even with one possible move) so the player can choose to skip instead
    if (opts.length === 1) S.preview = opts[0];
    setNote(`Rolled a ${n}${n === 6 ? '!' : '.'} Tap a circled ${NAMES[p]}${R.allowSkip ? ', or skip' : ''}.`);
    renderUI();
  }
}

// The player passes instead of moving. Like a roll with no possible move, a skipped 6 still earns its extra roll.
export function skipTurn() {
  const S = game.S, p = S.turn;
  if (S.phase !== 'move' || isCpu(S, p) || game.paused || !S.rules.allowSkip) return;
  S.phase = 'stuck'; S.sel = S.preview = null;
  const again = S.roll === 6 && S.rules.sixBonus;
  if (again) S.bonus.push('six');
  setNote(again ? `${NAMES[p]} skipped, but rolls again for the 6.` : `${NAMES[p]} stayed put. Playing it safe 🫣`);
  Sound.scribble();
  renderUI();
  later(nextTurn, 600);
}

// The computer shows which piece it picked for a moment, then moves it.
async function cpuMove() {
  const S = game.S;
  if (game.paused || S.phase !== 'move') return;
  const p = S.turn;
  await wait(450);
  S.preview = cpuPick(S, p, options(S, p, S.roll));
  renderMarks(S);
  await wait(650);
  if (!game.paused && S.phase === 'move') move(p, S.preview);
}

async function move(p, i) {
  const S = game.S;
  if (S.phase !== 'move') return;
  S.phase = 'anim'; S.sel = S.preview = null;
  const from = S.pieces[p][i], to = destOf(S, p, i), a = actorOf(p, i);
  renderUI();
  for (let s = 0; from + s < to; s++) {
    S.pieces[p][i]++;
    computeTargets(S);
    hop(a, 30, 230);
    Sound.hop(s);
    await wait(reduced ? 40 : 250);
    replayClass(a.el, 'land');
  }
  dropTrail(p, from, to);
  await land(p, i);
}

async function land(p, i) {
  const S = game.S, R = S.rules;
  const idx = S.pieces[p][i], k = cellKey(p, idx), [bx, by] = center(PATHS[p][idx]);
  const victims = victimsAt(S, p, k), pairs = pairsAt(S, p, k);
  let note = null;
  if (pairs.length) note = `${pairs.map(q => NAMES[q]).join(' and ')} ${pairs.length > 1 ? 'are pairs' : 'is a pair'} here. Besties can't be bumped 🫶`;
  if (victims.length) {
    S.bumped[p] = true;
    victims.forEach(([q, j]) => {
      S.pieces[q][j] = 0;
      const v = actorOf(q, j);
      computeTargets(S);
      hop(v, 170, 800, 720);
      v.el.classList.add('dizzy');
      setTimeout(() => v.el.classList.remove('dizzy'), 2600);
    });
    Sound.bump();
    try { navigator.vibrate && navigator.vibrate(40); } catch (e) {}
    const [sx, sy] = screenOf(bx, by);
    burst(sx, sy, 22, ['#2a2a35', '#8a8f9c', palette[victims[0][0]]], 8);
    emojiBurst(bx, by);
    popWord(pick(BUMP_CAPTIONS), bx, by, 'var(--red-dark)');
    const names = [...new Set(victims.map(([q]) => NAMES[q]))].join(' and ');
    note = pick([`${names} got sent back to start. Oop 💀`, `${NAMES[p]} bumped ${names}. No mercy 😈`, `${names}: "it's not that deep"… it was 😭`]);
  }
  if (idx === HOME) {
    Sound.home();
    const [sx, sy] = screenOf(bx, by);
    burst(sx, sy, 16, [palette[p], palette[4]], 7);
    popWord('home! ✨', bx, by, cvd(p));
    note = pick([`${NAMES[p]} made it Home. Main character energy ✨`, `${NAMES[p]} is Home and thriving 💅`]);
  }
  // Extra rolls (each can be switched off in House rules)
  if (S.roll === 6 && R.sixBonus) S.bonus.push('six');
  if (victims.length && R.bumpBonus) S.bonus.push('bump');
  if (idx === HOME && R.homeBonus) S.bonus.push('home');
  if (S.bonus.length && note) note += ' Roll again!';
  if (note) setNote(note);
  else if (S.roll === 6 && R.sixBonus) setNote(`Six! ${NAMES[p]} runs it back 🔁`);

  if (S.pieces[p].every(x => x === HOME)) {
    S.bonus = [];
    S.ranks.push(p);
    const first = S.ranks.length === 1;
    computeTargets(S);
    allActors().filter(a => a.q === p).forEach((a, n) => setTimeout(() => hop(a, 90, 700), 250 + n * 140));
    Sound.win();
    rain(first ? 70 : 30);
    popWord(first ? `${NAMES[p]} wins! 👑` : `${NAMES[p]}: ${ORD[S.ranks.length - 1]}!`, null, null, cvd(p), true);
    const playOn = R.playForPlaces;
    setNote(first ? `${NAMES[p]} wins! Ate and left no crumbs 💅${playOn ? ' Everyone else plays on for 2nd.' : ''}` : `${NAMES[p]} finishes ${ORD[S.ranks.length - 1]}.`);
    const left = [0, 1, 2, 3].filter(q => inPlay(S, q));
    if (left.length <= 1 || !playOn) {
      if (left.length === 1) S.ranks.push(left[0]);
      S.phase = 'over';
      save();
      renderUI();
      await wait(1800);
      showWin(S);
      return;
    }
    renderUI();
    await wait(1600);
    nextTurn();
    return;
  }
  renderUI();
  await wait(victims.length ? 1100 : 380);
  nextTurn();
}

function nextTurn() {
  const S = game.S, prev = S.turn;
  if (S.bonus.length) {
    S.bonusWhy = S.bonus.shift();
  } else {
    do S.turn = (S.turn + 1) % 4; while (!inPlay(S, S.turn));
    S.bonusWhy = null;
    S.sixStreak = 0;
  }
  S.phase = 'roll'; S.roll = null;
  const p = S.turn, cpu = isCpu(S, p);
  if (S.bonusWhy) {
    if (!cpu) setNote({ six: `Bonus roll for the 6, ${NAMES[p]}!`, bump: `Bonus roll for the bump!`, home: `Bonus roll for getting Home!` }[S.bonusWhy]);
  } else {
    setNote(cpu ? `${NAMES[p]}'s turn…` : `${NAMES[p]}'s turn. Tap the die!`);
    if (!cpu && p !== prev && S.seats.filter(s => s === 'human').length > 1) popWord(`${NAMES[p]}'s turn`, null, null, cvd(p), true);
  }
  save();
  renderUI();
  if (cpu && !game.paused) later(takeRoll, 750);
}

// Let a computer player act if it is their turn (after starting, resuming or loading).
function kick() {
  const S = game.S;
  if (game.paused) return;
  if (S.phase === 'roll' && isCpu(S, S.turn)) later(takeRoll, 800);
  if (S.phase === 'move' && isCpu(S, S.turn)) cpuMove();
}

// via: 'piece' (tapped a creature), 'cell' (its circled square) or 'dest' (the previewed destination).
export function onPieceTap(q, i, via) {
  const S = game.S;
  Sound.init();
  const p = S.turn;
  if (S.phase === 'move' && q === p && !isCpu(S, p) && !game.paused) {
    const opt = optionFor(S, p, i);
    if (opt != null) {
      // Mouse moves on the first click; touch previews on the first tap and moves on the second
      if (game.lastPointer === 'mouse' || via === 'dest' || S.sel === opt) { move(p, opt); return; }
      S.sel = S.preview = opt;
      Sound.scribble();
      renderMarks(S);
      return;
    }
  }
  if (via !== 'piece') return;
  // Not movable: it just wiggles and squeaks
  const a = actorOf(q, i);
  replayClass(a.el, 'poke');
  setTimeout(() => a.el.classList.remove('poke'), 520);
  Sound.squeak();
}

export function hoverPiece(q, i) {
  const S = game.S;
  if (S.phase !== 'move' || isCpu(S, S.turn) || S.sel != null) return;
  const opt = q === S.turn ? optionFor(S, q, i) : null;
  if (opt === S.preview) return;
  S.preview = opt;
  renderMarks(S);
}

const actorHandlers = { tap: (q, i) => onPieceTap(q, i, 'piece'), hover: hoverPiece };

// Show a game (new or loaded) on the board without starting play.
export function setupBoard(S) {
  game.S = S;
  buildActors(S, actorHandlers);
  resetMarks();
  aimCamera(S);
  snapCamera();
  renderUI();
}

export function startGame(seats, rules) {
  game.gen++;
  const S = fresh(seats, rules);
  S.started = true;
  game.paused = false;
  hideScreens();
  setupBoard(S);
  const p = S.turn;
  setNote(isCpu(S, p) ? `${NAMES[p]} goes first…` : `${NAMES[p]} goes first. Tap the die!`);
  save();
  kick();
}

export function resumeGame() {
  hideScreens();
  game.paused = false;
  renderUI();
  kick();
}
