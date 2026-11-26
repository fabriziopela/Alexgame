// Generatore guidato: ricetta + seme → livello deterministico.
import { Grid } from './grid.js';
import { T } from './tiles.js';
import { createRng } from '../core/rng.js';
import { SEGMENTS, MATERIALS, GRID_H, writeColumn } from './segments.js';
import { validateLevel } from './validator.js';

const START_COLS = 12;
const END_COLS = 10;
const START_GROUND = 6;

function buildOnce(recipe, seed) {
  const rng = createRng(seed);
  const grid = new Grid(recipe.length, GRID_H);
  const level = {
    recipe, grid, spawn: { x: 3.5, y: START_GROUND }, exitX: 0,
    enemies: [], bonusLoot: new Map(), retractSpikes: [],
  };
  const ctx = {
    rng, recipe, grid, mat: MATERIALS[recipe.theme], x: 0, groundY: START_GROUND,
    colGround: new Int16Array(recipe.length).fill(-1),
    retractSpikes: level.retractSpikes,
    addEnemy(x, y) {
      const type = rng.weighted(recipe.enemyMix);
      level.enemies.push({ type, x, y });
    },
    addBonus(x, y, loot) {
      grid.set(x, y, T.BONUS);
      level.bonusLoot.set(`${x},${y}`, loot || rng.weighted(recipe.powerTable));
    },
  };

  // Zona iniziale sicura con il bonus tutorial (cuore) a colonna 8.
  for (let i = 0; i < START_COLS; i++) writeColumn(ctx, ctx.x++);
  ctx.addBonus(8, START_GROUND + 2, 'heart');

  const weights = Object.fromEntries(Object.entries(recipe.weights).filter(([k]) => SEGMENTS[k]));
  let last = '';
  while (ctx.x < recipe.length - END_COLS - 16) {
    let name = rng.weighted(weights);
    if (name === last && name !== 'flat') name = 'flat';
    const before = ctx.x;
    SEGMENTS[name](ctx);
    if (name === 'flat' || ctx.x - before > 0) last = name;
    // bonus sparsi sui tratti pianeggianti
    if (name === 'flat' && rng.chance(recipe.bonusRate * 0.5)) ctx.addBonus(ctx.x - 2, ctx.groundY + 2);
  }
  // Completa con terreno piano fino alla zona finale.
  while (ctx.x < recipe.length - END_COLS) writeColumn(ctx, ctx.x++);
  const endStart = ctx.x;
  while (ctx.x < recipe.length) writeColumn(ctx, ctx.x++);
  level.exitX = endStart + 5;
  for (let y = ctx.groundY; y < ctx.groundY + 3; y++) grid.set(level.exitX, y, T.EXIT);
  level.colGround = ctx.colGround;
  grid.dirtyChunks.clear();
  return level;
}

/**
 * Genera il livello e ne verifica la completabilità (`validate`, default validateLevel).
 * In caso di esito negativo si riprova con seme+1 (max 20 tentativi).
 */
export function generateLevel(recipe, { validate = validateLevel } = {}) {
  for (let i = 0; i < 20; i++) {
    const level = buildOnce(recipe, recipe.seed + i);
    level.seedUsed = recipe.seed + i;
    if (!validate || validate(level).ok) return level;
  }
  throw new Error(`Livello ${recipe.id}: impossibile generare un percorso valido`);
}
