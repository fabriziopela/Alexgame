// Segmenti del generatore guidato. Ogni segmento è fattibile per costruzione:
// buche ≤ recipe.maxGap (≤ 4), gradini in salita ≤ 2, gallerie alte ≥ 3.
import { T } from './tiles.js';

export const GRID_H = 26;
export const MIN_GROUND = 4;
export const MAX_GROUND = 13;
export const CEIL_H = 7;      // altezza libera standard al chiuso
export const TUNNEL_H = 3;    // gallerie basse

export const MATERIALS = {
  forest:   { top: T.GRASS, fill: T.DIRT, deep: T.STONE, platform: T.WOOD, wall: [T.DIRT, T.WOOD, T.CRATE], hardWall: T.STONE, ceil: T.DARKSTONE },
  sunset:   { top: T.GRASS, fill: T.DIRT, deep: T.STONE, platform: T.WOOD, wall: [T.DIRT, T.CRATE], hardWall: T.STONE, ceil: T.DARKSTONE },
  night:    { top: T.GRASS, fill: T.DIRT, deep: T.STONE, platform: T.WOOD, wall: [T.DIRT, T.CRATE, T.LEAVES], hardWall: T.STONE, ceil: T.DARKSTONE },
  desert:   { top: T.SAND, fill: T.SAND, deep: T.SANDSTONE, platform: T.SANDSTONE, wall: [T.SAND, T.CRATE], hardWall: T.SANDSTONE, ceil: T.DARKSTONE },
  dunes:    { top: T.SAND, fill: T.SAND, deep: T.SANDSTONE, platform: T.SANDSTONE, wall: [T.SAND, T.CRATE], hardWall: T.SANDSTONE, ceil: T.DARKSTONE },
  tomb:     { top: T.SANDSTONE, fill: T.SANDSTONE, deep: T.SANDSTONE, platform: T.BRICK, wall: [T.SAND, T.CRATE], hardWall: T.BRICK, ceil: T.DARKSTONE },
  mine:     { top: T.STONE, fill: T.STONE, deep: T.DARKSTONE, platform: T.WOOD, wall: [T.DIRT, T.CRATE], hardWall: T.STONE, ceil: T.DARKSTONE },
  deepmine: { top: T.STONE, fill: T.STONE, deep: T.DARKSTONE, platform: T.WOOD, wall: [T.DIRT, T.STONE], hardWall: T.STONE, ceil: T.DARKSTONE },
  lavamine: { top: T.STONE, fill: T.DARKSTONE, deep: T.DARKSTONE, platform: T.STONE, wall: [T.STONE, T.CRATE], hardWall: T.STONE, ceil: T.DARKSTONE },
  abyss:    { top: T.STONE, fill: T.DARKSTONE, deep: T.DARKSTONE, platform: T.STONE, wall: [T.STONE, T.DIRT], hardWall: T.STONE, ceil: T.DARKSTONE },
};

/** Scrive una colonna: terreno fino a groundY-1, soffitto se indoor. */
export function writeColumn(ctx, x, opts = {}) {
  const { grid, mat, recipe } = ctx;
  const g = opts.ground ?? ctx.groundY;
  if (x < 0 || x >= grid.w) return;
  for (let y = 0; y < grid.h; y++) grid.set(x, y, T.AIR);
  if (!opts.pit) {
    grid.set(x, 0, T.BEDROCK);
    for (let y = 1; y < g; y++) grid.set(x, y, y === g - 1 ? mat.top : y < g - 3 ? mat.deep : mat.fill);
  } else if (opts.lava) {
    for (let y = 0; y < g - 2; y++) grid.set(x, y, T.LAVA);
  }
  if (recipe.indoor) {
    const ch = opts.ceil ?? CEIL_H;
    const cg = opts.ceilBase ?? g;
    for (let y = Math.min(cg + ch, grid.h - 1); y < grid.h; y++) grid.set(x, y, mat.ceil);
  }
  ctx.colGround[x] = opts.pit ? -1 : g;
}

const flatRun = (ctx, n, opts) => { for (let i = 0; i < n; i++) writeColumn(ctx, ctx.x++, opts); };

function maybeEnemy(ctx, x0, x1) {
  if (x1 - x0 < 4) return;
  if (!ctx.rng.chance(ctx.recipe.enemyRate)) return;
  const x = ctx.rng.int(x0 + 1, x1 - 2);
  ctx.addEnemy(x + 0.5, ctx.groundY);
}

export const SEGMENTS = {
  flat(ctx) {
    const x0 = ctx.x;
    flatRun(ctx, ctx.rng.int(4, 9));
    maybeEnemy(ctx, x0, ctx.x);
  },
  stepUp(ctx) {
    const up = ctx.rng.int(1, 2);
    ctx.groundY = Math.min(MAX_GROUND, ctx.groundY + up);
    const x0 = ctx.x;
    flatRun(ctx, ctx.rng.int(3, 6));
    maybeEnemy(ctx, x0, ctx.x);
  },
  stepDown(ctx) {
    ctx.groundY = Math.max(MIN_GROUND, ctx.groundY - ctx.rng.int(1, 3));
    const x0 = ctx.x;
    flatRun(ctx, ctx.rng.int(3, 6));
    maybeEnemy(ctx, x0, ctx.x);
  },
  gap(ctx) {
    const w = ctx.rng.int(2, ctx.recipe.maxGap);
    flatRun(ctx, 1);
    flatRun(ctx, w, { pit: true });
    flatRun(ctx, 3);
  },
  lavaGap(ctx) {
    const w = ctx.rng.int(2, ctx.recipe.maxGap);
    flatRun(ctx, 1);
    flatRun(ctx, w, { pit: true, lava: true });
    flatRun(ctx, 3);
  },
  floating(ctx) {
    const { rng, recipe } = ctx;
    const lava = recipe.weights.lavaGap > 0 && rng.chance(0.5);
    const base = ctx.groundY;
    flatRun(ctx, 1);
    const pieces = rng.int(1, 2);
    for (let p = 0; p < pieces; p++) {
      flatRun(ctx, rng.int(2, 3), { pit: true, lava, ground: base });
      const ph = base + rng.int(0, 2);
      const pw = rng.int(2, 3);
      for (let i = 0; i < pw; i++) {
        const x = ctx.x++;
        writeColumn(ctx, x, { pit: true, lava, ground: base, ceilBase: Math.max(base, ph) });
        ctx.grid.set(x, ph - 1, ctx.mat.platform);
        ctx.colGround[x] = ph;
      }
    }
    flatRun(ctx, rng.int(2, 3), { pit: true, lava, ground: base });
    flatRun(ctx, 3);
  },
  spikeRow(ctx) {
    const n = ctx.rng.int(1, Math.min(3, ctx.recipe.maxGap - 1));
    flatRun(ctx, 2);
    for (let i = 0; i < n; i++) {
      const x = ctx.x;
      flatRun(ctx, 1);
      ctx.grid.set(x, ctx.groundY, T.SPIKES);
    }
    flatRun(ctx, 3);
  },
  retractSpikes(ctx) {
    const n = ctx.rng.int(3, 5);
    flatRun(ctx, 2);
    const phase = ctx.rng.next() * 3.5;
    for (let i = 0; i < n; i++) {
      const x = ctx.x;
      flatRun(ctx, 1);
      ctx.grid.set(x, ctx.groundY, T.SPIKES_RETRACT);
      ctx.retractSpikes.push({ x, y: ctx.groundY, phase });
    }
    flatRun(ctx, 3);
  },
  digWall(ctx) {
    const { rng, recipe, mat } = ctx;
    const hard = recipe.id >= 5 && rng.chance(0.45);
    const thick = rng.int(1, recipe.id >= 6 ? 3 : 2);
    const height = recipe.indoor ? CEIL_H : rng.int(4, 6);
    const tile = hard ? mat.hardWall : rng.pick(mat.wall);
    flatRun(ctx, 2);
    for (let i = 0; i < thick; i++) {
      const x = ctx.x;
      flatRun(ctx, 1);
      for (let y = ctx.groundY; y < ctx.groundY + height; y++) {
        if (ctx.grid.get(x, y) === T.AIR) ctx.grid.set(x, y, tile);
      }
      // a volte un blocco bonus incastonato nel muro, ad altezza testa
      if (i === 0 && rng.chance(recipe.bonusRate * 0.5)) ctx.addBonus(x, ctx.groundY + 1);
    }
    flatRun(ctx, 3);
  },
  lowTunnel(ctx) {
    if (!ctx.recipe.indoor) return SEGMENTS.flat(ctx);
    const n = ctx.rng.int(6, 12);
    flatRun(ctx, 1);
    const x0 = ctx.x;
    flatRun(ctx, n, { ceil: TUNNEL_H });
    maybeEnemy(ctx, x0, ctx.x);
    flatRun(ctx, 1);
  },
  enemyGroup(ctx) {
    const n = ctx.rng.int(6, 10);
    const x0 = ctx.x;
    flatRun(ctx, n);
    const count = ctx.recipe.id >= 7 ? ctx.rng.int(2, 3) : ctx.rng.int(1, 2);
    for (let i = 0; i < count; i++) ctx.addEnemy(x0 + 2 + i * 2.5, ctx.groundY);
  },
  bonusNiche(ctx) {
    const x0 = ctx.x;
    flatRun(ctx, 5);
    if (ctx.rng.chance(0.5)) ctx.addBonus(x0 + 2, ctx.groundY + 2);
    else {
      // piedistallo di casse con il bonus sopra
      ctx.grid.set(x0 + 2, ctx.groundY, ctx.rng.pick(ctx.mat.wall));
      ctx.addBonus(x0 + 2, ctx.groundY + 1);
    }
  },
};
