// Small helpers shared by every module.

export const $ = id => document.getElementById(id);
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Restart a CSS animation that is driven by a class.
export function replayClass(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// localStorage can throw (private mode, blocked storage), so every access is guarded.
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
