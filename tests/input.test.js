import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TouchMap } from '../src/core/input.js';

const rects = () => ({
  left: { x: 20, y: 300, w: 80, h: 80 },
  right: { x: 110, y: 300, w: 80, h: 80 },
  hit: { x: 600, y: 300, w: 80, h: 80 },
  jump: { x: 700, y: 280, w: 100, h: 100 },
});

test('touch: two pointers keep right+jump', () => {
  const m = new TouchMap(rects);
  m.update(1, 150, 340);
  m.update(2, 750, 330);
  assert.equal(m.pressed('right'), true);
  assert.equal(m.pressed('jump'), true);
  assert.equal(m.pressed('left'), false);
});

test('touch: slide from left to right switches button', () => {
  const m = new TouchMap(rects);
  m.update(1, 60, 340);
  assert.equal(m.pressed('left'), true);
  m.update(1, 150, 340);
  assert.equal(m.pressed('left'), false);
  assert.equal(m.pressed('right'), true);
});

test('release clears', () => {
  const m = new TouchMap(rects);
  m.update(1, 60, 340);
  m.release(1);
  assert.equal(m.pressed('left'), false);
});

test('touch outside buttons presses nothing', () => {
  const m = new TouchMap(rects);
  m.update(1, 400, 100);
  for (const n of ['left', 'right', 'jump', 'hit']) assert.equal(m.pressed(n), false);
});

test('press edge is reported once per new press', () => {
  const m = new TouchMap(rects);
  const seen = [];
  m.onPress = (n) => seen.push(n);
  m.update(1, 750, 330);
  m.update(1, 752, 331);
  m.release(1);
  m.update(2, 750, 330);
  assert.deepEqual(seen, ['jump', 'jump']);
});
