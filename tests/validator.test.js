import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLevel } from '../src/world/validator.js';
import { LEVELS } from '../src/world/levels.js';
import { generateLevel } from '../src/world/generator.js';
import { Grid } from '../src/world/grid.js';
import { T } from '../src/world/tiles.js';

function handMade({ gapFrom = -1, gapW = 0, wallX = -1, wallTile = T.BEDROCK } = {}) {
  const w = 60, g = new Grid(w, 20);
  for (let x = 0; x < w; x++) {
    if (x >= gapFrom && x < gapFrom + gapW) continue;
    g.set(x, 0, T.BEDROCK);
    for (let y = 1; y < 5; y++) g.set(x, y, T.DIRT);
  }
  if (wallX >= 0) for (let y = 5; y < 20; y++) g.set(wallX, y, wallTile);
  return { grid: g, spawn: { x: 3.5, y: 5 }, exitX: 55 };
}

test('all 10 levels validate', () => {
  for (const r of LEVELS) {
    const res = validateLevel(generateLevel(r));
    assert.equal(res.ok, true, `level ${r.id}: ${JSON.stringify(res.problems)}`);
  }
});

test('flat level validates', () => {
  assert.equal(validateLevel(handMade()).ok, true);
});

test('a hand-made level with a 7-wide gap fails', () => {
  const res = validateLevel(handMade({ gapFrom: 20, gapW: 7 }));
  assert.equal(res.ok, false);
  assert.equal(res.problems[0].reason, 'unreachable');
  assert.ok(res.problems[0].x >= 18 && res.problems[0].x <= 20);
});

test('a 4-wide gap is fine', () => {
  assert.equal(validateLevel(handMade({ gapFrom: 20, gapW: 4 })).ok, true);
});

test('a bedrock wall blocks', () => {
  assert.equal(validateLevel(handMade({ wallX: 30 })).ok, false);
});

test('a dirt wall does not block', () => {
  assert.equal(validateLevel(handMade({ wallX: 30, wallTile: T.DIRT })).ok, true);
});

test('generator uses validator and stays deterministic', () => {
  const a = generateLevel(LEVELS[0]), b = generateLevel(LEVELS[0]);
  assert.equal(a.seedUsed, b.seedUsed);
});
