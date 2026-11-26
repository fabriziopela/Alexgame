import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Grid, CHUNK } from '../src/world/grid.js';
import { T } from '../src/world/tiles.js';

test('out of bounds: bedrock on sides and below, air above', () => {
  const g = new Grid(100, 20);
  assert.equal(g.get(-1, 5), T.BEDROCK);
  assert.equal(g.get(100, 5), T.BEDROCK);
  assert.equal(g.get(3, -1), T.BEDROCK);
  assert.equal(g.get(3, 20), T.AIR);
});
test('set/get and isSolid', () => {
  const g = new Grid(10, 10);
  g.set(2, 3, T.DIRT);
  assert.equal(g.get(2, 3), T.DIRT);
  assert.equal(g.isSolid(2, 3), true);
  assert.equal(g.isSolid(2, 4), false);
});
test('stone needs two hits', () => {
  const g = new Grid(10, 10);
  g.set(1, 1, T.STONE);
  const a = g.hit(1, 1);
  assert.equal(a.broken, false);
  const b = g.hit(1, 1);
  assert.equal(b.broken, true);
  assert.equal(b.id, T.STONE);
  assert.equal(g.get(1, 1), T.AIR);
});
test('bonus hit reports wasBonus', () => {
  const g = new Grid(10, 10);
  g.set(1, 1, T.BONUS);
  const r = g.hit(1, 1);
  assert.equal(r.broken, true);
  assert.equal(r.wasBonus, true);
});
test('unbreakable and air return null', () => {
  const g = new Grid(10, 10);
  g.set(1, 1, T.BEDROCK);
  assert.equal(g.hit(1, 1), null);
  assert.equal(g.hit(5, 5), null);
});
test('hazardAt', () => {
  const g = new Grid(10, 10);
  g.set(4, 0, T.LAVA);
  assert.equal(g.hazardAt(4, 0), 'lava');
  assert.equal(g.hazardAt(5, 0), null);
});
test('hits mark dirty chunk', () => {
  const g = new Grid(100, 10);
  g.set(40, 1, T.DIRT);
  g.dirtyChunks.clear();
  g.hit(40, 1);
  assert.equal(CHUNK, 32);
  assert.ok(g.dirtyChunks.has(1));
});
test('damage(x,y) exposes partial damage', () => {
  const g = new Grid(10, 10);
  g.set(1, 1, T.STONE);
  g.hit(1, 1);
  assert.equal(g.damage.get(g.key(1, 1)), 1);
});
