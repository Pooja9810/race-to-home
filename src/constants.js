// The board, the four players and their routes. Board units: each square is 100 x 100.

// Bottom player's route: counter-clockwise around the outer ring, clockwise around the inner ring, then Home.
const BASE = [[4,2],[4,3],[4,4],[3,4],[2,4],[1,4],[0,4],[0,3],[0,2],[0,1],[0,0],[1,0],[2,0],[3,0],[4,0],[4,1],
              [3,1],[2,1],[1,1],[1,2],[1,3],[2,3],[3,3],[3,2],[2,2]];
export const HOME = BASE.length - 1;
const rot = ([r, c]) => [4 - c, r]; // quarter turn: bottom -> right -> top -> left
export const PATHS = [0, 1, 2, 3].map(n => BASE.map(cell => { let x = cell; for (let i = 0; i < n; i++) x = rot(x); return x; }));
export const SAFE = new Set(['4,2', '2,4', '0,2', '2,0', '2,2']);

export const NAMES = ['Tomo', 'Drip', 'Ribbit', 'Sunny'];
export const COLOR = ['--red', '--blue', '--green', '--yellow'];
export const ORD = ['1st', '2nd', '3rd', '4th'];
export const OUTWARD = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // direction from the board toward each player's side

export const key = (r, c) => r + ',' + c;
export const cellKey = (p, idx) => key(...PATHS[p][idx]);
export const center = ([r, c]) => [c * 100 + 50, r * 100 + 50];
export const cv = q => `var(${COLOR[q]})`;
export const cvd = q => `var(${COLOR[q]}-dark)`;

// Unit step along a player's own side of the board (the direction they first move).
export function sideDir(q) {
  const [a, b] = [center(PATHS[q][0]), center(PATHS[q][1])];
  return [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
}
