// PRNG deterministico (mulberry32): stesso seme → stesso livello per tutti.
export function createRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    weighted(obj) {
      const entries = Object.entries(obj).filter(([, w]) => w > 0);
      const total = entries.reduce((n, [, w]) => n + w, 0);
      let r = next() * total;
      for (const [k, w] of entries) { if ((r -= w) < 0) return k; }
      return entries[entries.length - 1][0];
    },
  };
}
