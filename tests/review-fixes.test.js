import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/world/levels.js';
import { generateLevel } from '../src/world/generator.js';
import { validateLevel } from '../src/world/validator.js';
import { Session } from '../src/game/session.js';
import { Boomerang } from '../src/game/boomerang.js';
import { TILE_INFO } from '../src/world/tiles.js';

test('throwing the boomerang before every floating section keeps the level finishable', () => {
  for (const r of LEVELS) {
    const lv = generateLevel(r);
    const s = new Session(lv);
    const g = lv.grid;
    for (let x = 1; x < g.w - 1; x++) {
      // inizio di un tratto senza terreno (buca o piattaforme)
      if (!(g.isSolid(x, 0) && !g.isSolid(x + 1, 0))) continue;
      const y = lv.colGround[x];
      s.player.body.x = x + 0.5; s.player.body.y = y; s.player.facing = 1;
      for (const dy of [0, 1, 2]) {
        s.player.body.y = y + dy;
        const b = new Boomerang(s.player);
        for (let t = 0; t < 5 && b.alive; t += 1 / 60) b.update(1 / 60, s);
      }
    }
    assert.equal(validateLevel(lv).ok, true, `level ${r.id} became unfinishable`);
  }
});

test('no enemy spawns inside terrain', () => {
  for (const r of LEVELS) {
    const lv = generateLevel(r);
    for (const e of lv.enemies) {
      const x = Math.floor(e.x);
      assert.equal(lv.grid.isSolid(x, e.y), false, `level ${r.id} enemy at ${e.x},${e.y} inside terrain`);
      assert.equal(lv.grid.isSolid(x, e.y + 1), false, `level ${r.id} enemy at ${e.x},${e.y} head in terrain`);
      assert.equal(lv.grid.isSolid(x, e.y - 1), true, `level ${r.id} enemy at ${e.x},${e.y} floating`);
    }
  }
});

test('floating platform tiles cannot be broken', () => {
  for (const r of LEVELS) {
    const lv = generateLevel(r);
    const g = lv.grid;
    for (let x = 0; x < g.w; x++) {
      if (g.isSolid(x, 0)) continue;
      for (let y = 1; y < g.h; y++) {
        const info = TILE_INFO[g.get(x, y)];
        if (info.solid && lv.colGround[x] === y + 1) assert.equal(info.breakable, false, `level ${r.id} platform ${x},${y} breakable`);
      }
    }
  }
});
