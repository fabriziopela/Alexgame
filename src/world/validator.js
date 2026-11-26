// Validatore di raggiungibilità: BFS su posizioni "in piedi", archi ottenuti
// simulando camminate e salti con la stessa fisica del gioco.
// I blocchi rompibili sopra il livello del terreno contano come attraversabili
// (il minatore può scavarli); il terreno sotto i piedi resta solido.
import { PHYS } from '../config.js';
import { TILE_INFO, T } from './tiles.js';
import { makeBody, moveBody, overlapsHazard } from '../game/physics.js';

const DT = 1 / 30;
const PIT_Y = 1;

function computeColGround(grid) {
  const cg = new Int16Array(grid.w).fill(-1);
  for (let x = 0; x < grid.w; x++) {
    for (let y = 1; y < grid.h; y++) {
      if (!grid.isSolid(x, y) && grid.isSolid(x, y - 1)) { cg[x] = y; break; }
    }
  }
  // colonne piene (muri): usa il terreno della colonna vicina
  for (let x = 0; x < grid.w; x++) {
    if (cg[x] !== -1) continue;
    const l = x > 0 ? cg[x - 1] : -1;
    let r = -1;
    for (let k = x + 1; k < grid.w && r === -1; k++) r = cg[k];
    const n = Math.max(l, r);
    if (n > 0 && grid.isSolid(x, n - 1)) cg[x] = n;
  }
  return cg;
}

function makeView(grid, colGround) {
  return {
    w: grid.w, h: grid.h,
    get: (x, y) => grid.get(x, y),
    isSolid(x, y) {
      const info = TILE_INFO[grid.get(x, y)];
      if (!info.solid) return false;
      if (info.breakable && x >= 0 && x < grid.w && colGround[x] >= 0 && y >= colGround[x]) return false;
      return true;
    },
    hazardAt(x, y) {
      const id = grid.get(x, y);
      return id === T.SPIKES_RETRACT ? null : TILE_INFO[id].hazard;
    },
  };
}

const bodyHazard = (b, view) => overlapsHazard(b, view) !== null;

/** Simula un'azione e ritorna le posizioni d'appoggio raggiunte. */
function simulate(view, sx, sy, dir, jump, cut, delay) {
  const b = makeBody(sx, sy, PHYS.PLAYER_W, PHYS.PLAYER_H);
  b.vx = delay > 0 ? 0 : dir * PHYS.RUN_SPEED;
  if (jump) b.vy = PHYS.JUMP_VELOCITY;
  const out = [];
  let left = false;
  for (let t = 0; t < 1.6; t += DT) {
    if (t >= delay) b.vx = dir * PHYS.RUN_SPEED;
    if (jump && cut > 0 && t >= cut && b.vy > 0) b.vy *= PHYS.JUMP_CUT, cut = 0;
    moveBody(b, view, DT);
    if (b.y < PIT_Y || bodyHazard(b, view)) break;
    if (!b.onGround) left = true;
    if (b.onGround) {
      out.push([Math.floor(b.x), Math.round(b.y)]);
      if (left || !jump) { if (left) break; }
    }
    if (b.x < 0 || b.x > view.w) break;
  }
  return out;
}

function overlapsSolid(view, sx, sy) {
  const x0 = Math.floor(sx - PHYS.PLAYER_W / 2 + 1e-6), x1 = Math.floor(sx + PHYS.PLAYER_W / 2 - 1e-6);
  for (let ty = sy; ty <= Math.floor(sy + PHYS.PLAYER_H - 1e-6); ty++)
    for (let tx = x0; tx <= x1; tx++) if (view.isSolid(tx, ty)) return true;
  return false;
}

const ACTIONS = [
  // [jump, cut, delay]
  [false, 0, 0],
  [true, 0, 0],
  [true, 0.12, 0],
  [true, 0, 0.18],
  [true, 0.2, 0.1],
];

export function validateLevel(level) {
  const grid = level.grid;
  const colGround = level.colGround || computeColGround(grid);
  const view = makeView(grid, colGround);
  const seen = new Set();
  const key = (x, y) => y * grid.w + x;
  const start = [Math.floor(level.spawn.x), Math.round(level.spawn.y)];
  const queue = [start];
  seen.add(key(...start));
  let furthest = start[0];
  while (queue.length) {
    const [tx, ty] = queue.shift();
    if (tx > furthest) furthest = tx;
    if (tx >= level.exitX) return { ok: true, problems: [] };
    for (const dir of [1, -1]) {
      for (const sx of [tx + 0.5, tx + 0.5 + dir * 0.75]) {
        if (overlapsSolid(view, sx, ty)) continue;
        for (const [jump, cut, delay] of ACTIONS) {
          for (const [nx, ny] of simulate(view, sx, ty, dir, jump, cut, delay)) {
            const k = key(nx, ny);
            if (!seen.has(k)) { seen.add(k); queue.push([nx, ny]); }
          }
        }
      }
    }
  }
  return { ok: false, problems: [{ x: furthest, reason: 'unreachable' }] };
}
