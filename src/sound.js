// Sound effects synthesized with Web Audio, so there are no sound files to ship.
import { store } from './util.js';

export const Sound = {
  ctx: null, on: store.get('rth-sound', true),
  // Browsers only allow audio after a user gesture, so this is called from input handlers.
  init() {
    if (!this.on) return;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  },
  toggle() {
    this.on = !this.on;
    store.set('rth-sound', this.on);
    if (this.on) { this.init(); this.squeak(); }
  },
  tone(f1, f2, dur, type = 'sine', vol = .15, delay = 0) {
    const c = this.ctx; if (!c || !this.on) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .03);
  },
  noise(dur, freq, q, vol, delay = 0) {
    const c = this.ctx; if (!c || !this.on) return;
    const t = c.currentTime + delay, len = Math.max(1, Math.floor(c.sampleRate * dur));
    const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  },
  // A sine tone whose pitch wobbles (rate in Hz, depth in Hz): the "boing" in bump().
  wobble(f1, f2, dur, rate, depth, vol, delay = 0) {
    const c = this.ctx; if (!c || !this.on) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    lfo.frequency.value = rate; lg.gain.value = depth; lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); lfo.start(t); o.stop(t + dur + .03); lfo.stop(t + dur + .03);
  },
  hop(n) { this.tone(430 + n * 45, 720 + n * 55, .08, 'sine', .11); },
  // Soft wooden taps that bunch up like a die bouncing to a stop
  rattle() { [0, .2, .36, .48, .57, .64, .7].forEach((d, i) => this.tone(390 - i * 12, 300 - i * 10, .05, 'triangle', .13 * (1 - i * .1), d)); },
  thud() { this.tone(260, 210, .09, 'sine', .14); },
  // A springy "boing" and a little "uh-oh"
  bump() { this.wobble(260, 520, .32, 16, 35, .16); this.tone(784, 770, .1, 'triangle', .1, .34); this.tone(587, 523, .18, 'triangle', .1, .45); },
  home() { this.tone(660, 670, .14, 'triangle', .18); this.tone(990, 1000, .24, 'triangle', .18, .11); },
  six() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f * 1.01, .12, 'triangle', .13, i * .07)); },
  win() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, f, .2, 'triangle', .15, i * .11)); },
  squeak() { this.tone(950, 1550, .09, 'sine', .1); this.tone(1500, 1150, .08, 'sine', .08, .08); },
  scribble() { this.noise(.16, 3800, .8, .3); },
};
