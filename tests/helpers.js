import { Grid } from '../src/world/grid.js';
import { T } from '../src/world/tiles.js';

export const NO_INPUT = { left: false, right: false, jump: false, jumpPressed: false, hit: false, hitPressed: false };
export const inp = (o = {}) => ({ ...NO_INPUT, ...o });

/** Terreno piano: pavimento con superficie a y=2 (si cammina a y=2). */
export function flatGrid(w = 60, h = 20, holes = []) {
  const g = new Grid(w, h);
  for (let x = 0; x < w; x++) {
    if (holes.includes(x)) continue;
    g.set(x, 0, T.BEDROCK); g.set(x, 1, T.DIRT);
  }
  return g;
}

export function fakeSession(grid) {
  const s = {
    grid, enemies: [], events: [], thrown: 0, damaged: [],
    emit(type, data) { s.events.push({ type, ...data }); },
    damageEnemy(e) { s.damaged.push(e); },
    spawnBoomerang() { s.thrown++; },
    boomerangActive() { return false; },
  };
  return s;
}
