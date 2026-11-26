// Texture pixel-art originali 16×16 generate via canvas (nessun file esterno).
import * as THREE from 'three';
import { createRng } from '../core/rng.js';
import { T } from '../world/tiles.js';

export const TILE_PX = 16;
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 4;

// Indici nell'atlante
export const A = {
  GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, SAND: 3, SANDSTONE_SIDE: 4, SANDSTONE_TOP: 5, STONE: 6, DARKSTONE: 7,
  WOOD_SIDE: 8, WOOD_TOP: 9, LEAVES: 10, CRATE: 11, BONUS: 12, BEDROCK: 13, BRICK: 14, LAVA: 15,
  CRACK1: 16, CRACK2: 17, MINE_WALL: 18, TOMB_WALL: 19, CACTUS: 20, PLANK: 21, ORE_WALL: 22, STONE_TOP: 23,
};

/** [lato, sopra] per ogni tipo di blocco. */
export const TILE_FACES = {
  [T.GRASS]: [A.GRASS_SIDE, A.GRASS_TOP],
  [T.DIRT]: [A.DIRT, A.DIRT],
  [T.SAND]: [A.SAND, A.SAND],
  [T.SANDSTONE]: [A.SANDSTONE_SIDE, A.SANDSTONE_TOP],
  [T.STONE]: [A.STONE, A.STONE_TOP],
  [T.DARKSTONE]: [A.DARKSTONE, A.DARKSTONE],
  [T.WOOD]: [A.PLANK, A.PLANK],
  [T.LEAVES]: [A.LEAVES, A.LEAVES],
  [T.CRATE]: [A.CRATE, A.CRATE],
  [T.BONUS]: [A.BONUS, A.BONUS],
  [T.BEDROCK]: [A.BEDROCK, A.BEDROCK],
  [T.BRICK]: [A.BRICK, A.BRICK],
};

const hex = (c) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const shade = (c, f) => {
  const [r, g, b] = hex(c);
  const k = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${k(r)},${k(g)},${k(b)})`;
};

function painter(ctx, ox, oy, seed) {
  const rng = createRng(seed);
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, 1, 1); };
  const fill = (c) => { ctx.fillStyle = c; ctx.fillRect(ox, oy, TILE_PX, TILE_PX); };
  const speckle = (base, n, lo = 0.82, hi = 1.15) => {
    for (let i = 0; i < n; i++) px(rng.int(0, 15), rng.int(0, 15), shade(base, lo + rng.next() * (hi - lo)));
  };
  const border = (c, f = 0.7) => {
    for (let i = 0; i < 16; i++) { px(i, 15, shade(c, f)); px(15, i, shade(c, f * 1.05)); }
    for (let i = 0; i < 16; i++) { px(i, 0, shade(c, 1.12)); px(0, i, shade(c, 1.08)); }
  };
  return { rng, px, fill, speckle, border };
}

const DRAW = {
  [A.GRASS_TOP]: (p) => { p.fill('#5fb043'); p.speckle('#5fb043', 70, 0.75, 1.2); p.border('#5fb043', 0.8); },
  [A.GRASS_SIDE]: (p) => {
    p.fill('#8a5a35'); p.speckle('#8a5a35', 60);
    for (let x = 0; x < 16; x++) {
      const h = 3 + p.rng.int(0, 2) + (x % 5 === 0 ? 1 : 0);
      for (let y = 0; y < h; y++) p.px(x, y, y === h - 1 ? '#3f8a2e' : shade('#5fb043', 0.9 + p.rng.next() * 0.25));
    }
    p.border('#8a5a35', 0.75);
  },
  [A.DIRT]: (p) => { p.fill('#8a5a35'); p.speckle('#8a5a35', 80, 0.7, 1.2); p.border('#8a5a35', 0.75); },
  [A.SAND]: (p) => { p.fill('#e8cf8c'); p.speckle('#e8cf8c', 60, 0.88, 1.08); p.border('#e8cf8c', 0.85); },
  [A.SANDSTONE_SIDE]: (p) => {
    p.fill('#d6b06a');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (y % 5 === 4) p.px(x, y, '#b38a4c');
    p.speckle('#d6b06a', 30, 0.9, 1.08); p.border('#d6b06a', 0.78);
  },
  [A.SANDSTONE_TOP]: (p) => { p.fill('#dcb872'); p.speckle('#dcb872', 40, 0.9, 1.08); p.border('#dcb872', 0.78); },
  [A.STONE]: (p) => {
    p.fill('#868c96'); p.speckle('#868c96', 90, 0.78, 1.12);
    for (let i = 0; i < 3; i++) { let x = p.rng.int(1, 14), y = p.rng.int(1, 14); for (let k = 0; k < 4; k++) { p.px(x, y, '#5d626b'); x += p.rng.int(-1, 1); y += 1; } }
    p.border('#868c96', 0.7);
  },
  [A.STONE_TOP]: (p) => { p.fill('#939aa3'); p.speckle('#939aa3', 70, 0.8, 1.1); p.border('#939aa3', 0.72); },
  [A.DARKSTONE]: (p) => { p.fill('#3d3f4a'); p.speckle('#3d3f4a', 70, 0.7, 1.35); p.border('#3d3f4a', 0.65); },
  [A.PLANK]: (p) => {
    p.fill('#b07a3e');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (y % 4 === 3) p.px(x, y, '#7d5229');
      else if (p.rng.chance(0.12)) p.px(x, y, '#c58a49');
    }
    for (let y = 0; y < 4; y++) { p.px((y * 7 + 3) % 16, y * 4 + 1, '#7d5229'); }
    p.border('#b07a3e', 0.7);
  },
  [A.WOOD_SIDE]: (p) => { p.fill('#7a5230'); for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) if (p.rng.chance(0.7)) p.px(x, y, '#5e3d22'); p.border('#7a5230', 0.7); },
  [A.WOOD_TOP]: (p) => { p.fill('#b98b52'); for (let r = 2; r < 8; r += 2) for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; p.px(Math.round(7.5 + Math.cos(t) * r), Math.round(7.5 + Math.sin(t) * r), '#8f6537'); } p.border('#7a5230', 0.8); },
  [A.LEAVES]: (p) => { p.fill('#3f8f3a'); p.speckle('#3f8f3a', 90, 0.6, 1.25); for (let i = 0; i < 10; i++) p.px(p.rng.int(0, 15), p.rng.int(0, 15), '#24521f'); },
  [A.CRATE]: (p) => {
    p.fill('#c48a45');
    for (let i = 0; i < 16; i++) { p.px(i, 0, '#6e4520'); p.px(i, 15, '#6e4520'); p.px(0, i, '#6e4520'); p.px(15, i, '#6e4520'); p.px(i, 1, '#8c5a2b'); p.px(1, i, '#8c5a2b'); p.px(i, 14, '#8c5a2b'); p.px(14, i, '#8c5a2b'); p.px(i, i, '#8c5a2b'); p.px(15 - i, i, '#8c5a2b'); }
    p.speckle('#c48a45', 20, 0.9, 1.1);
  },
  [A.BONUS]: (p) => {
    p.fill('#4a3b5e'); p.speckle('#4a3b5e', 50, 0.75, 1.3);
    const gem = [[7, 3], [8, 3], [6, 4], [9, 4], [5, 5], [10, 5], [4, 6], [11, 6], [4, 7], [11, 7], [5, 8], [10, 8], [6, 9], [9, 9], [7, 10], [8, 10]];
    for (let y = 4; y <= 9; y++) for (let x = 5; x <= 10; x++) if (Math.abs(x - 7.5) + Math.abs(y - 6.5) < 4) p.px(x, y, '#ffd34d');
    for (const [x, y] of gem) p.px(x, y, '#ff9f1c');
    p.px(6, 5, '#fff6c9'); p.px(7, 5, '#fff6c9'); p.px(6, 6, '#fff6c9');
    for (let i = 0; i < 16; i++) { p.px(i, 0, '#ffb43b'); p.px(i, 15, '#a8641a'); p.px(0, i, '#ffb43b'); p.px(15, i, '#a8641a'); }
  },
  [A.BEDROCK]: (p) => { p.fill('#24242b'); p.speckle('#24242b', 100, 0.6, 2.2); },
  [A.BRICK]: (p) => {
    p.fill('#c99a5b');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const row = Math.floor(y / 4), off = row % 2 ? 4 : 0;
      if (y % 4 === 3 || (x + off) % 8 === 7) p.px(x, y, '#8a6234');
    }
    p.speckle('#c99a5b', 20, 0.9, 1.1);
  },
  [A.LAVA]: (p) => { p.fill('#d8401a'); for (let i = 0; i < 60; i++) p.px(p.rng.int(0, 15), p.rng.int(0, 15), p.rng.chance(0.5) ? '#ff8c1a' : '#ffd04a'); },
  [A.CRACK1]: (p) => { for (let i = 0; i < 2; i++) { let x = 7 + i * 2, y = 2; for (let k = 0; k < 11; k++) { p.px(x, y, 'rgba(20,12,8,0.85)'); x += p.rng.int(-1, 1); y++; } } },
  [A.CRACK2]: (p) => { for (let i = 0; i < 5; i++) { let x = p.rng.int(2, 13), y = p.rng.int(1, 4); for (let k = 0; k < 12; k++) { p.px(x, y, 'rgba(20,12,8,0.9)'); x += p.rng.int(-1, 1); y++; } } },
  [A.MINE_WALL]: (p) => { p.fill('#4c4039'); p.speckle('#4c4039', 110, 0.65, 1.3); },
  [A.TOMB_WALL]: (p) => {
    p.fill('#a98552'); p.speckle('#a98552', 40, 0.85, 1.1);
    const glyph = p.rng.int(0, 3);
    const c = '#6b4f2a';
    if (glyph === 0) { for (let y = 4; y < 12; y++) p.px(8, y, c); for (let x = 5; x < 12; x++) p.px(x, 6, c); }
    if (glyph === 1) { for (let a = 0; a < 24; a++) { const t = a / 24 * 6.28; p.px(Math.round(8 + Math.cos(t) * 3), Math.round(8 + Math.sin(t) * 3), c); } p.px(8, 8, c); }
    if (glyph === 2) { for (let x = 4; x < 12; x++) { p.px(x, 10, c); p.px(x, 5 + Math.abs(x - 8), c); } }
  },
  [A.CACTUS]: (p) => { p.fill('#3f9a4a'); for (let x = 1; x < 16; x += 4) for (let y = 0; y < 16; y++) p.px(x, y, '#2c7537'); for (let i = 0; i < 12; i++) p.px(p.rng.int(0, 15), p.rng.int(0, 15), '#e8f0c0'); },
  [A.ORE_WALL]: (p) => {
    p.fill('#4c4039'); p.speckle('#4c4039', 90, 0.65, 1.3);
    const c = p.rng.pick(['#5fd4ff', '#ff6fb1', '#ffd34d']);
    for (let i = 0; i < 4; i++) { const x = p.rng.int(2, 12), y = p.rng.int(2, 12); p.px(x, y, c); p.px(x + 1, y, c); p.px(x, y + 1, '#ffffff'); }
  },
};

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined' && !(typeof document !== 'undefined')) return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

function nearest(tex) {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Atlante principale con tutte le facce dei blocchi. */
export function buildAtlas() {
  const c = makeCanvas(ATLAS_COLS * TILE_PX, ATLAS_ROWS * TILE_PX);
  const ctx = c.getContext('2d');
  for (const [idx, fn] of Object.entries(DRAW)) {
    const i = Number(idx);
    const ox = (i % ATLAS_COLS) * TILE_PX, oy = Math.floor(i / ATLAS_COLS) * TILE_PX;
    fn(painter(ctx, ox, oy, 1000 + i * 77));
  }
  const tex = nearest(new THREE.CanvasTexture(c));
  tex.generateMipmaps = false;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

/** Offset UV (in unità di tile) per l'indice dell'atlante. */
export function atlasCell(i) {
  return [i % ATLAS_COLS, ATLAS_ROWS - 1 - Math.floor(i / ATLAS_COLS)];
}

/** Texture singola ripetibile (pareti di fondo, lava). */
export function tileTexture(index, repeatX = 1, repeatY = 1, seed = 0) {
  const c = makeCanvas(TILE_PX, TILE_PX);
  DRAW[index](painter(c.getContext('2d'), 0, 0, 1000 + index * 77 + seed));
  const tex = nearest(new THREE.CanvasTexture(c));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

/** Gradiente verticale per il cielo. */
export function gradientTexture(stops) {
  const c = makeCanvas(4, 256);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Sagome lontane (colline, dune, montagne) disegnate a blocchi. */
export function silhouetteTexture({ color, top, kind, seed }) {
  const W = 512, H = 128;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const rng = createRng(seed);
  ctx.fillStyle = color;
  const step = 8;
  let h = H * 0.5;
  for (let x = 0; x < W; x += step) {
    const t = x / W;
    let target;
    if (kind === 'mountains') target = H * (0.35 + 0.35 * Math.abs(Math.sin(t * Math.PI * 3 + seed)) + rng.next() * 0.08);
    else if (kind === 'dunes') target = H * (0.45 + 0.18 * Math.sin(t * Math.PI * 4 + seed) + rng.next() * 0.03);
    else if (kind === 'trees') target = H * (0.4 + (rng.chance(0.35) ? 0.25 : 0.08) + rng.next() * 0.1);
    else target = H * (0.45 + 0.2 * Math.sin(t * Math.PI * 2 + seed) + rng.next() * 0.06);
    h += (target - h) * (kind === 'trees' ? 0.9 : 0.5);
    const hh = Math.round(h / step) * step;
    ctx.fillRect(x, H - hh, step, hh);
    if (top) { ctx.fillStyle = top; ctx.fillRect(x, H - hh, step, step / 2); ctx.fillStyle = color; }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}
