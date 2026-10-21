// The four creatures, drawn as SVG with a colored-pencil fill.
import { cv, cvd } from './constants.js';
import { $ } from './util.js';

const CREATURES = [
  { // Tomo: a tomato with a leafy cap
    body: 'M50 36 C 75 36 88 53 86 73 C 84 93 68 103 50 103 C 32 103 16 93 14 73 C 12 53 25 36 50 36 Z',
    extra: `<path d="M50 41 L39 29 L48 33 L50 21 L53 33 L62 28 Z" style="fill:var(--green);stroke:var(--green-dark)" stroke-width="2" stroke-linejoin="round"/>`,
    eyes: [[40, 66], [60, 66]], mouth: 'M45 79 Q50 84 55 79', blushY: 75, crownY: 22,
  },
  { // Drip: a raindrop
    body: 'M50 12 C 60 32 85 50 85 73 C 85 92 69 103 50 103 C 31 103 15 92 15 73 C 15 50 40 32 50 12 Z',
    extra: `<path d="M27 72 Q 26 58 35 49" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity=".75"/>`,
    eyes: [[40, 70], [60, 70]], mouth: 'M45 83 Q50 88 55 83', blushY: 79, crownY: 14,
  },
  { // Ribbit: a frog blob with eye bumps
    body: 'M14 90 C 10 62 26 50 50 50 C 74 50 90 62 86 90 C 84 101 16 101 14 90 Z M19 51 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0 Z M55 51 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0 Z',
    extra: `<circle cx="32" cy="51" r="8.5" fill="#fff" stroke="#2a2a35" stroke-width="1.6"/><circle cx="68" cy="51" r="8.5" fill="#fff" stroke="#2a2a35" stroke-width="1.6"/>`,
    eyes: [[32, 52], [68, 52]], mouth: 'M38 72 Q50 81 62 72', blushY: 76, crownY: 38,
  },
  { // Sunny: a mango with a leaf
    body: 'M47 32 C 72 28 89 47 86 72 C 83 95 63 104 47 101 C 27 97 14 81 16 63 C 18 45 31 33 47 32 Z',
    extra: `<path d="M48 32 C 54 17 69 13 77 17 C 71 27 60 33 48 32 Z" style="fill:var(--green);stroke:var(--green-dark)" stroke-width="2" stroke-linejoin="round"/><path d="M47 33 L44 24" stroke="#6b4a1e" stroke-width="2.6" stroke-linecap="round"/>`,
    eyes: [[40, 64], [60, 64]], mouth: 'M45 77 Q50 82 55 77', blushY: 73, crownY: 20,
  },
];

// Clip paths that keep each creature's pencil fill inside its outline. Call once at startup.
export function installCreatureClips() {
  $('shared-defs').insertAdjacentHTML('beforeend',
    CREATURES.map((c, q) => `<clipPath id="clip-${q}"><path d="${c.body}"/></clipPath>`).join(''));
}

// Markup for creature q. Its eyes switch with the .happy / .dizzy classes and the crown with .crowned (see styles.css).
export function creatureSVG(q) {
  const c = CREATURES[q], [[lx, ly], [rx, ry]] = c.eyes, frog = q === 2;
  const pupil = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="${frog ? 3.8 : 4.4}" ry="${frog ? 4.6 : 5.3}" fill="#2a2a35"/><circle cx="${x + 1.5}" cy="${y - 2.1}" r="1.5" fill="#fff"/>`;
  const happy = (x, y) => `M${x - 5} ${y + 1} Q ${x} ${y - 6} ${x + 5} ${y + 1}`;
  const xeye = (x, y) => `M${x - 4} ${y - 4} L${x + 4} ${y + 4} M${x + 4} ${y - 4} L${x - 4} ${y + 4}`;
  return `<svg class="creature" viewBox="0 0 100 110" aria-hidden="true">
    <ellipse cx="37" cy="103" rx="8.5" ry="4.5" style="fill:${cvd(q)}"/>
    <ellipse cx="63" cy="103" rx="8.5" ry="4.5" style="fill:${cvd(q)}"/>
    <g clip-path="url(#clip-${q})">
      <rect width="100" height="110" style="fill:${cv(q)}"/>
      <rect width="100" height="110" fill="url(#hatch-w)"/>
      <ellipse cx="66" cy="98" rx="42" ry="24" fill="url(#hatch-d)"/>
    </g>
    <path d="${c.body}" fill="none" style="stroke:${cvd(q)}" stroke-width="2.8" stroke-linejoin="round" filter="url(#rough)"/>
    ${c.extra}
    <g class="eyes-open"><g class="pupils">${pupil(lx, ly)}${pupil(rx, ry)}</g></g>
    <g class="eyes-happy" fill="none" stroke="#2a2a35" stroke-width="2.8" stroke-linecap="round"><path d="${happy(lx, ly)}"/><path d="${happy(rx, ry)}"/></g>
    <g class="eyes-dizzy" fill="none" stroke="#2a2a35" stroke-width="2.6" stroke-linecap="round"><path d="${xeye(lx, ly)}"/><path d="${xeye(rx, ry)}"/></g>
    <ellipse cx="${lx - 9}" cy="${c.blushY}" rx="5.5" ry="3.2" style="fill:var(--blush)" opacity=".8"/>
    <ellipse cx="${rx + 9}" cy="${c.blushY}" rx="5.5" ry="3.2" style="fill:var(--blush)" opacity=".8"/>
    <path d="${c.mouth}" fill="none" stroke="#2a2a35" stroke-width="2.4" stroke-linecap="round"/>
    <path class="crown" transform="translate(50 ${c.crownY})" d="M-13 0 L-9 -13 L-2 -5 L0 -16 L2 -5 L9 -13 L13 0 Z" style="fill:#ffd23d" stroke="#a87100" stroke-width="2" stroke-linejoin="round"/>
  </svg>`;
}
