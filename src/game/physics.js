// Corpi AABB contro la griglia. x = centro, y = base (piedi).
import { PHYS } from '../config.js';

const EPS = 1e-6;
const MAX_DT = 1 / 20;
const MAX_SUBSTEP = 0.25;
export const SPIKE_H = 0.55;

export function makeBody(x, y, w, h) {
  return { x, y, w, h, vx: 0, vy: 0, onGround: false, hitWall: 0, hitCeil: false, gravity: 1 };
}

export function aabbOverlap(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function solidIn(grid, x0, x1, y0, y1) {
  for (let ty = Math.floor(y0); ty <= Math.floor(y1); ty++)
    for (let tx = Math.floor(x0); tx <= Math.floor(x1); tx++)
      if (grid.isSolid(tx, ty)) return { tx, ty };
  return null;
}

function moveX(b, grid, dx) {
  if (dx === 0) return;
  b.x += dx;
  const y0 = b.y + EPS, y1 = b.y + b.h - EPS;
  if (dx > 0) {
    const right = b.x + b.w / 2;
    const hit = solidIn(grid, right - EPS, right - EPS, y0, y1);
    if (hit) { b.x = hit.tx - b.w / 2; b.vx = 0; b.hitWall = 1; }
  } else {
    const left = b.x - b.w / 2;
    const hit = solidIn(grid, left + EPS, left + EPS, y0, y1);
    if (hit) { b.x = hit.tx + 1 + b.w / 2; b.vx = 0; b.hitWall = -1; }
  }
}

function moveY(b, grid, dy) {
  if (dy === 0) return;
  b.y += dy;
  const x0 = b.x - b.w / 2 + EPS, x1 = b.x + b.w / 2 - EPS;
  if (dy < 0) {
    const hit = solidIn(grid, x0, x1, b.y + EPS * 0, b.y);
    if (hit) { b.y = hit.ty + 1; b.vy = 0; b.onGround = true; }
  } else {
    const top = b.y + b.h;
    const hit = solidIn(grid, x0, x1, top - EPS, top - EPS);
    if (hit) { b.y = hit.ty - b.h; b.vy = 0; b.hitCeil = true; }
  }
}

/** Integra gravità e muove il corpo risolvendo le collisioni per asse. */
export function moveBody(b, grid, dt) {
  dt = Math.min(dt, MAX_DT);
  b.onGround = false; b.hitWall = 0; b.hitCeil = false;
  b.vy -= PHYS.GRAVITY * b.gravity * dt;
  if (b.vy < -PHYS.MAX_FALL) b.vy = -PHYS.MAX_FALL;
  const dx = b.vx * dt, dy = b.vy * dt;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_SUBSTEP));
  for (let i = 0; i < n; i++) {
    moveX(b, grid, dx / n);
    moveY(b, grid, b.vy === 0 && dy !== 0 ? 0 : dy / n);
  }
}

/** Ritorna 'lava' | 'spikes' | null se il corpo tocca un pericolo. */
export function overlapsHazard(b, grid, shrink = 0.12) {
  const x0 = b.x - b.w / 2 + shrink, x1 = b.x + b.w / 2 - shrink;
  const y0 = b.y + 0.02, y1 = b.y + b.h - shrink;
  let found = null;
  for (let ty = Math.floor(y0); ty <= Math.floor(y1); ty++)
    for (let tx = Math.floor(x0); tx <= Math.floor(x1); tx++) {
      const h = grid.hazardAt(tx, ty);
      if (h === 'lava') return 'lava';
      // gli spuntoni occupano solo la metà inferiore del blocco
      if (h === 'spikes' && b.y < ty + SPIKE_H) found = h;
    }
  return found;
}
