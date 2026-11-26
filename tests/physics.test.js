import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../src/world/grid.js';
import { T } from '../src/world/tiles.js';
import { PHYS } from '../src/config.js';
import { makeBody, moveBody, overlapsHazard, aabbOverlap } from '../src/game/physics.js';

function floorGrid(w = 60, gapFrom = -1, gapW = 0) {
  const g = new Grid(w, 20);
  for (let x = 0; x < w; x++) {
    if (x >= gapFrom && x < gapFrom + gapW) continue;
    g.set(x, 0, T.STONE); g.set(x, 1, T.DIRT);
  }
  return g;
}
const step = (b, g, secs, fn) => {
  for (let t = 0; t < secs; t += PHYS.DT) { fn && fn(b); moveBody(b, g, PHYS.DT); }
};

test('body lands and stays on ground', () => {
  const g = floorGrid();
  const b = makeBody(5.5, 6, 0.6, 1.7);
  step(b, g, 2);
  assert.equal(b.onGround, true);
  assert.ok(Math.abs(b.y - 2) < 1e-6, `y=${b.y}`);
});

test('jump apex ≈ 3.2', () => {
  const g = floorGrid();
  const b = makeBody(5.5, 2, 0.6, 1.7);
  step(b, g, 0.1);
  b.vy = PHYS.JUMP_VELOCITY;
  let maxY = 0;
  step(b, g, 1.5, (bb) => { maxY = Math.max(maxY, bb.y); });
  assert.ok(maxY - 2 >= 3.0 && maxY - 2 <= 3.4, `apex=${maxY - 2}`);
});

function runJump(gapW) {
  const gapFrom = 20;
  const g = floorGrid(60, gapFrom, gapW);
  const b = makeBody(10.5, 2, 0.6, 1.7);
  let jumped = false;
  step(b, g, 4, (bb) => {
    bb.vx = PHYS.RUN_SPEED;
    // salta all'ultimo istante possibile: bordo sinistro del corpo sul bordo della buca
    if (!jumped && bb.onGround && bb.x - bb.w / 2 > gapFrom - 0.12) { bb.vy = PHYS.JUMP_VELOCITY; jumped = true; }
  });
  return b.y > 1.5;
}
test('running jump clears 4-wide gap', () => assert.equal(runJump(4), true));
test('does not clear 6-wide gap', () => assert.equal(runJump(6), false));

test('wall stops horizontal motion', () => {
  const g = floorGrid();
  for (let y = 2; y < 6; y++) g.set(15, y, T.STONE);
  const b = makeBody(10.5, 2, 0.6, 1.7);
  step(b, g, 2, (bb) => { bb.vx = PHYS.RUN_SPEED; });
  assert.ok(b.x + b.w / 2 <= 15 + 1e-6, `x=${b.x}`);
  assert.equal(b.hitWall, 1);
});

test('large dt is clamped, no tunneling', () => {
  const g = floorGrid();
  g.set(12, 2, T.STONE); g.set(12, 3, T.STONE);
  const b = makeBody(10.5, 2, 0.6, 1.7);
  b.vx = 50;
  moveBody(b, g, 2.0);
  assert.ok(b.x + b.w / 2 <= 12 + 1e-6, `went through wall x=${b.x}`);
  const c = makeBody(30.5, 10, 0.6, 1.7);
  c.vy = -200;
  moveBody(c, g, 2.0);
  assert.ok(c.y >= 2 - 1e-6, `fell through floor y=${c.y}`);
});

test('ceiling stops jump', () => {
  const g = floorGrid();
  g.set(5, 5, T.STONE);
  const b = makeBody(5.5, 2, 0.6, 1.7);
  b.vy = PHYS.JUMP_VELOCITY;
  let maxY = 0;
  step(b, g, 0.5, (bb) => { maxY = Math.max(maxY, bb.y); });
  assert.ok(maxY + 1.7 <= 5 + 1e-6);
});

test('overlapsHazard detects lava', () => {
  const g = floorGrid();
  g.set(8, 2, T.LAVA);
  const b = makeBody(8.5, 2, 0.6, 1.7);
  assert.equal(overlapsHazard(b, g), 'lava');
  const c = makeBody(4.5, 2, 0.6, 1.7);
  assert.equal(overlapsHazard(c, g), null);
});

test('aabbOverlap', () => {
  assert.equal(aabbOverlap(makeBody(0, 0, 1, 1), makeBody(0.5, 0.5, 1, 1)), true);
  assert.equal(aabbOverlap(makeBody(0, 0, 1, 1), makeBody(3, 0, 1, 1)), false);
});
