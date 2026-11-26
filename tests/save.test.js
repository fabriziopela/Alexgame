import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSave, saveProgress, recordResult, SAVE_KEY } from '../src/core/save.js';

const mem = (init = {}) => {
  const d = { ...init };
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, data: d };
};
const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };

test('defaults when empty', () => {
  assert.deepEqual(loadSave(mem()), { unlocked: 1, best: {}, audio: true });
});
test('save: corrupt json falls back', () => {
  assert.deepEqual(loadSave(mem({ [SAVE_KEY]: '{not json' })), { unlocked: 1, best: {}, audio: true });
  assert.deepEqual(loadSave(mem({ [SAVE_KEY]: '{"unlocked":"x","best":5}' })), { unlocked: 1, best: {}, audio: true });
});
test('storage throwing falls back', () => {
  assert.deepEqual(loadSave(throwing), { unlocked: 1, best: {}, audio: true });
  assert.doesNotThrow(() => saveProgress({ unlocked: 2, best: {}, audio: true }, throwing));
});
test('missing storage falls back', () => {
  assert.deepEqual(loadSave(undefined), { unlocked: 1, best: {}, audio: true });
});
test('round trip', () => {
  const st = mem();
  saveProgress({ unlocked: 4, best: { 1: { time: 90.5, score: 1200 } }, audio: false }, st);
  assert.deepEqual(loadSave(st), { unlocked: 4, best: { 1: { time: 90.5, score: 1200 } }, audio: false });
});
test('recordResult unlocks next and keeps best time', () => {
  const s = { unlocked: 1, best: {}, audio: true };
  let r = recordResult(s, 1, 100, 1000);
  assert.equal(s.unlocked, 2);
  assert.equal(r.newRecord, true);
  r = recordResult(s, 1, 110, 1500);
  assert.equal(s.best[1].time, 100);
  assert.equal(s.best[1].score, 1500);
  assert.equal(r.newRecord, false);
  recordResult(s, 10, 100, 1);
  assert.equal(s.unlocked, 10);
});
