import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/world/levels.js';
import { generateLevel } from '../src/world/generator.js';
import { T } from '../src/world/tiles.js';

const levels = LEVELS.map((r) => generateLevel(r));

test('LEVELS has 10 recipes with ids 1..10', () => {
  assert.equal(LEVELS.length, 10);
  LEVELS.forEach((r, i) => {
    assert.equal(r.id, i + 1);
    assert.equal(r.time, 120);
    assert.ok(r.name && r.theme);
  });
});

test('deterministic', () => {
  for (const r of LEVELS) {
    const a = generateLevel(r), b = generateLevel(r);
    assert.deepEqual(a.grid.cells, b.grid.cells);
    assert.deepEqual(a.enemies, b.enemies);
  }
});

test('difficulty is non-decreasing', () => {
  for (let i = 1; i < LEVELS.length; i++) {
    const p = LEVELS[i - 1], c = LEVELS[i];
    assert.ok(c.enemyRate >= p.enemyRate, `enemyRate ${c.id}`);
    assert.ok(c.maxGap >= p.maxGap, `maxGap ${c.id}`);
    assert.ok(c.enemySpeed >= p.enemySpeed, `enemySpeed ${c.id}`);
  }
});

test('mummies only from level 4', () => {
  levels.forEach((lv) => {
    const hasMummy = lv.enemies.some((e) => e.type === 'mummy');
    if (lv.recipe.id < 4) assert.equal(hasMummy, false, `level ${lv.recipe.id}`);
  });
  assert.ok(levels.slice(3).some((lv) => lv.enemies.some((e) => e.type === 'mummy')));
});

test('retractSpikes only from level 7', () => {
  levels.forEach((lv) => {
    const has = lv.grid.cells.includes(T.SPIKES_RETRACT);
    assert.equal(has, lv.recipe.id >= 7, `level ${lv.recipe.id}`);
    assert.equal(lv.retractSpikes.length > 0, lv.recipe.id >= 7);
  });
});

test('indoor levels have a ceiling', () => {
  levels.filter((lv) => lv.recipe.indoor).forEach((lv) => {
    let covered = 0;
    for (let x = 0; x < lv.grid.w; x++) {
      const top = lv.grid.h - 1;
      if (lv.grid.isSolid(x, top)) covered++;
    }
    assert.ok(covered / lv.grid.w > 0.95, `level ${lv.recipe.id} covered ${covered}`);
  });
});

test('every bonus tile has loot', () => {
  levels.forEach((lv) => {
    let n = 0;
    for (let y = 0; y < lv.grid.h; y++) for (let x = 0; x < lv.grid.w; x++) {
      if (lv.grid.get(x, y) === T.BONUS) {
        n++;
        assert.ok(['heart', 'boomerang', 'star'].includes(lv.bonusLoot.get(`${x},${y}`)), `${x},${y}`);
      }
    }
    assert.ok(n >= 4, `level ${lv.recipe.id} has ${n} bonus blocks`);
  });
});

test('spawn is on solid ground and exit inside level', () => {
  levels.forEach((lv) => {
    assert.equal(lv.grid.isSolid(Math.floor(lv.spawn.x), lv.spawn.y - 1), true);
    assert.equal(lv.grid.isSolid(Math.floor(lv.spawn.x), lv.spawn.y), false);
    assert.ok(lv.exitX > lv.grid.w - 15 && lv.exitX < lv.grid.w);
  });
});

test('tutorial bonus at column 8 holds a heart', () => {
  levels.forEach((lv) => {
    const key = [...lv.bonusLoot.keys()].find((k) => k.startsWith('8,'));
    assert.ok(key, `level ${lv.recipe.id}`);
    assert.equal(lv.bonusLoot.get(key), 'heart');
  });
});
