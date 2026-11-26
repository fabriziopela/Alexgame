import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../src/game/session.js';
import { PHYS, RULES, SCORE } from '../src/config.js';
import { T } from '../src/world/tiles.js';
import { flatGrid, inp } from './helpers.js';
import { LEVELS } from '../src/world/levels.js';
import { generateLevel } from '../src/world/generator.js';

const DT = PHYS.DT;
const recipe = { id: 0, time: 120, enemySpeed: 2, zombieHp: 1, mummyHp: 2, indoor: false };
function makeLevel({ holes = [], enemies = [], exitX = 50 } = {}) {
  return { recipe, grid: flatGrid(60, 20, holes), spawn: { x: 3.5, y: 2 }, exitX, enemies, bonusLoot: new Map(), retractSpikes: [] };
}
const run = (s, secs, input = inp()) => { for (let t = 0; t < secs - 1e-9; t += DT) s.update(DT, input); };

test('timer counts down only while playing', () => {
  const s = new Session(makeLevel());
  run(s, 1);
  assert.equal(s.time, 120);
  s.start();
  run(s, 1);
  assert.ok(Math.abs(s.time - 119) < 0.05, `time ${s.time}`);
});

test('session.pause freezes timer', () => {
  const s = new Session(makeLevel()); s.start();
  run(s, 0.5);
  s.pause();
  const t = s.time, x = s.player.body.x;
  run(s, 2, inp({ right: true }));
  assert.equal(s.time, t);
  assert.equal(s.player.body.x, x);
  assert.equal(s.status, 'paused');
  s.resume();
  run(s, 0.5);
  assert.ok(s.time < t);
});

test('time out loses with reason time', () => {
  const s = new Session(makeLevel()); s.start();
  s.time = 0.5;
  run(s, 1);
  assert.equal(s.status, 'lost');
  assert.equal(s.lostReason, 'time');
});

test('three hurts lose with reason hearts', () => {
  const s = new Session(makeLevel()); s.start();
  for (let i = 0; i < 3; i++) { s.player.invuln = 0; s.hurtPlayer(10); }
  run(s, DT);
  assert.equal(s.status, 'lost');
  assert.equal(s.lostReason, 'hearts');
});

test('crossing exit wins and adds time bonus', () => {
  const s = new Session(makeLevel({ exitX: 12 })); s.start();
  run(s, 3, inp({ right: true }));
  assert.equal(s.status, 'won');
  assert.ok(s.score >= Math.ceil(s.time) * SCORE.PER_SECOND_LEFT);
  assert.ok(s.drainEvents().some((e) => e.type === 'win'));
});

test('falling in a pit costs a heart and respawns', () => {
  const holes = []; for (let x = 10; x < 20; x++) holes.push(x);
  const s = new Session(makeLevel({ holes })); s.start();
  run(s, 1.5, inp({ right: true }));
  run(s, 1.5);
  assert.equal(s.player.hearts, 2);
  assert.ok(s.player.body.x < 10, `x=${s.player.body.x}`);
  assert.ok(Math.abs(s.player.body.y - 2) < 0.01);
  assert.ok(s.drainEvents().some((e) => e.type === 'respawn'));
});

test('respawn skips broken safe point', () => {
  const s = new Session(makeLevel()); s.start();
  s.player.lastSafe = { x: 8.5, y: 2 };
  s.grid.set(8, 1, T.AIR); s.grid.set(8, 0, T.AIR); // il punto sicuro è stato scavato
  s.respawn();
  const b = s.player.body;
  assert.equal(s.grid.isSolid(Math.floor(b.x), Math.round(b.y) - 1), true);
  assert.ok(Math.abs(b.x - 8.5) <= 2);
});

test('lava hurts and respawns', () => {
  const s = new Session(makeLevel()); s.start();
  s.grid.set(6, 2, T.LAVA);
  run(s, 0.8, inp({ right: true }));
  assert.equal(s.player.hearts, 2);
  assert.ok(s.player.body.x < 6.5);
});

test('spikes hurt and bounce', () => {
  const s = new Session(makeLevel()); s.start();
  s.grid.set(6, 2, T.SPIKES);
  run(s, 0.6, inp({ right: true }));
  assert.equal(s.player.hearts, 2);
});

test('enemy contact hurts', () => {
  const s = new Session(makeLevel({ enemies: [{ type: 'zombie', x: 5.5, y: 2 }] })); s.start();
  run(s, 1.0);
  assert.equal(s.player.hearts, 2);
});

test('star kills enemy on contact', () => {
  const s = new Session(makeLevel({ enemies: [{ type: 'zombie', x: 5.5, y: 2 }] })); s.start();
  s.player.star = RULES.STAR_TIME;
  run(s, 1.0);
  assert.equal(s.player.hearts, 3);
  assert.equal(s.enemies[0].alive, false);
  assert.equal(s.score, SCORE.ZOMBIE);
});

test('bonus block drops loot and pickup applies', () => {
  const lv = makeLevel();
  lv.grid.set(4, 3, T.BONUS);
  lv.bonusLoot.set('4,3', 'boomerang');
  const s = new Session(lv); s.start();
  run(s, 0.2);
  s.update(DT, inp({ hit: true, hitPressed: true }));
  assert.equal(s.pickups.length, 1);
  run(s, 1.5);
  run(s, 0.6, inp({ right: true }));
  assert.ok(s.player.boomerang > 0);
  assert.equal(s.score, SCORE.BONUS_BLOCK + SCORE.POWERUP);
});

test('heart at full hearts gives points', () => {
  const s = new Session(makeLevel()); s.start();
  s.applyPickup({ kind: 'heart', alive: true });
  assert.equal(s.score, SCORE.HEART_FULL);
});

test('killing an enemy with the pickaxe scores', () => {
  const s = new Session(makeLevel({ enemies: [{ type: 'zombie', x: 4.8, y: 2 }] })); s.start();
  s.update(DT, inp({ hit: true, hitPressed: true }));
  assert.equal(s.enemies[0].alive, false);
  assert.equal(s.score, SCORE.ZOMBIE);
});

test('retracting spikes only hurt when up', () => {
  const lv = makeLevel();
  lv.grid.set(6, 2, T.SPIKES_RETRACT);
  lv.retractSpikes.push({ x: 6, y: 2, phase: 0 });
  const s = new Session(lv); s.start();
  s.elapsed = 2.2; // fase "giù"
  s.updateSpikes();
  assert.equal(lv.retractSpikes[0].up, false);
  s.player.body.x = 6.5;
  s.update(DT, inp());
  assert.equal(s.player.hearts, 3);
});

test('progress goes from 0 to 1', () => {
  const s = new Session(makeLevel({ exitX: 23.5 }));
  assert.equal(s.progress(), 0);
  s.player.body.x = 13.5;
  assert.ok(Math.abs(s.progress() - 0.5) < 0.01);
});

test('works on a generated level', () => {
  const s = new Session(generateLevel(LEVELS[0])); s.start();
  run(s, 2, inp({ right: true }));
  assert.equal(s.status, 'playing');
});
