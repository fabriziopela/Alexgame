import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T, TILE_INFO } from '../src/world/tiles.js';

test('bedrock is solid and unbreakable', () => {
  assert.equal(TILE_INFO[T.BEDROCK].solid, true);
  assert.equal(TILE_INFO[T.BEDROCK].breakable, false);
});
test('hit points', () => {
  assert.equal(TILE_INFO[T.STONE].hp, 2);
  assert.equal(TILE_INFO[T.SANDSTONE].hp, 2);
  assert.equal(TILE_INFO[T.DIRT].hp, 1);
});
test('hazards', () => {
  assert.equal(TILE_INFO[T.LAVA].solid, false);
  assert.equal(TILE_INFO[T.LAVA].hazard, 'lava');
  assert.equal(TILE_INFO[T.SPIKES].solid, false);
  assert.equal(TILE_INFO[T.SPIKES].hazard, 'spikes');
});
test('bonus block', () => {
  const b = TILE_INFO[T.BONUS];
  assert.equal(b.breakable, true); assert.equal(b.bonus, true); assert.equal(b.hp, 1);
});
test('air is empty', () => {
  assert.equal(TILE_INFO[T.AIR].solid, false);
  assert.equal(T.AIR, 0);
});
