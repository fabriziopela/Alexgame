import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/world/levels.js';
import { generateLevel } from '../src/world/generator.js';
import { Session } from '../src/game/session.js';
import { runBot } from '../src/game/bot.js';

// Il bot ha cuori illimitati: misura durata e completabilità dei livelli.
const results = LEVELS.map((r) => ({ r, res: runBot(generateLevel(r), Session, { hearts: 99 }) }));

for (const { r, res } of results) {
  const [lo, hi] = r.id >= 8 ? [85, 100] : [75, 95];
  test(`level ${r.id} is completed by the bot in ${lo}-${hi}s`, () => {
    assert.equal(res.won, true, `level ${r.id} not completed (stopped at x=${res.x.toFixed(1)})`);
    assert.ok(res.time >= lo && res.time <= hi, `level ${r.id} time ${res.time.toFixed(1)}s`);
  });
}

test('later levels hurt more than early ones', () => {
  const avg = (ids) => ids.reduce((n, id) => n + results[id - 1].res.hurts, 0) / ids.length;
  assert.ok(avg([8, 9, 10]) > avg([1, 2, 3]), `early ${avg([1, 2, 3])} late ${avg([8, 9, 10])}`);
});

test('bot with 3 hearts clears the first level', () => {
  const res = runBot(generateLevel(LEVELS[0]), Session);
  assert.equal(res.won, true);
});
