import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameAudio } from '../src/core/audio.js';

test('unlock resumes an interrupted iOS audio context', () => {
  const a = new GameAudio();
  let resumed = 0;
  a.ctx = { state: 'interrupted', resume() { resumed++; return Promise.resolve(); } };
  a.unlock();
  assert.equal(resumed, 1);
});

test('unlock does nothing when already running', () => {
  const a = new GameAudio();
  let resumed = 0;
  a.ctx = { state: 'running', resume() { resumed++; return Promise.resolve(); } };
  a.unlock();
  assert.equal(resumed, 0);
});
