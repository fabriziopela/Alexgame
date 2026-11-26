import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';

test('same seed gives same sequence', () => {
  const a = createRng(42), b = createRng(42);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
});
test('different seeds give different sequences', () => {
  const a = createRng(1), b = createRng(2);
  const sa = Array.from({ length: 10 }, () => a.next());
  const sb = Array.from({ length: 10 }, () => b.next());
  assert.notDeepEqual(sa, sb);
});
test('next is in [0,1) and int is inclusive range', () => {
  const r = createRng(7);
  for (let i = 0; i < 500; i++) {
    const v = r.next(); assert.ok(v >= 0 && v < 1);
    const n = r.int(2, 5); assert.ok(n >= 2 && n <= 5 && Number.isInteger(n));
  }
});
test('weighted never picks zero-weight keys', () => {
  const r = createRng(3);
  for (let i = 0; i < 100; i++) assert.equal(r.weighted({ a: 0, b: 1 }), 'b');
});
test('pick and chance', () => {
  const r = createRng(9);
  assert.ok(['x', 'y'].includes(r.pick(['x', 'y'])));
  assert.equal(r.chance(0), false);
  assert.equal(r.chance(1), true);
});
