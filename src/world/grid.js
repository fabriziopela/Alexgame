// Griglia 2D del mondo. y = 0 in basso. Nessuna dipendenza dal rendering.
import { T, TILE_INFO } from './tiles.js';

export const CHUNK = 32;

export class Grid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.cells = new Uint8Array(w * h);
    this.damage = new Map();
    this.dirtyChunks = new Set();
  }

  key(x, y) { return y * this.w + x; }

  get(x, y) {
    if (x < 0 || x >= this.w || y < 0) return T.BEDROCK;
    if (y >= this.h) return T.AIR;
    return this.cells[y * this.w + x];
  }

  set(x, y, id) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    this.cells[y * this.w + x] = id;
    this.damage.delete(this.key(x, y));
    this.dirtyChunks.add(Math.floor(x / CHUNK));
  }

  info(x, y) { return TILE_INFO[this.get(x, y)]; }
  isSolid(x, y) { return TILE_INFO[this.get(x, y)].solid; }
  hazardAt(x, y) { return TILE_INFO[this.get(x, y)].hazard; }

  /** Colpisce un blocco. Ritorna null se non rompibile. */
  hit(x, y, dmg = 1) {
    const id = this.get(x, y);
    const info = TILE_INFO[id];
    if (!info.breakable) return null;
    const k = this.key(x, y);
    const total = (this.damage.get(k) || 0) + dmg;
    if (total >= info.hp) {
      this.set(x, y, T.AIR);
      return { broken: true, id, wasBonus: info.bonus };
    }
    this.damage.set(k, total);
    this.dirtyChunks.add(Math.floor(x / CHUNK));
    return { broken: false, id, wasBonus: false };
  }

  /** Riga di terreno solido più alta nella colonna x sotto yMax (o -1). */
  topSolid(x, yMax = this.h - 1) {
    for (let y = Math.min(yMax, this.h - 1); y >= 0; y--) if (this.isSolid(x, y)) return y;
    return -1;
  }
}
