import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Enemy } from '../src/game/enemies.js';
import { Boomerang } from '../src/game/boomerang.js';
import { Pickup } from '../src/game/pickups.js';
import { Player } from '../src/game/player.js';
import { PHYS } from '../src/config.js';
import { T } from '../src/world/tiles.js';
import { flatGrid, fakeSession } from './helpers.js';

const DT = PHYS.DT;
const recipe = { enemySpeed: 2, zombieHp: 1, mummyHp: 2 };
function world(holes = []) {
  const g = flatGrid(80, 20, holes);
  const s = fakeSession(g);
  s.player = new Player(70.5, 2);
  s.damageEnemy = (e, dir) => e.damage(s, dir);
  return s;
}
const tick = (obj, s, secs) => { for (let t = 0; t < secs; t += DT) obj.update(DT, s); };

test('zombie turns at ledge', () => {
  const holes = []; for (let x = 20; x < 30; x++) holes.push(x);
  const s = world(holes);
  s.player.body.x = 5.5; // vicino per restare attivo, ma oltre il raggio di inseguimento
  const z = new Enemy('zombie', 17.5, 2, recipe);
  z.dir = 1;
  tick(z, s, 4);
  assert.ok(z.body.y > 1.5, 'zombie fell into pit');
  assert.ok(z.body.x < 20, `x=${z.body.x}`);
  assert.equal(z.alive, true);
});

test('zombie chases player within 6', () => {
  const s = world();
  s.player.body.x = 10.5;
  const z = new Enemy('zombie', 15.5, 2, recipe);
  z.dir = 1;
  tick(z, s, 0.5);
  assert.equal(z.state, 'chase');
  assert.ok(z.body.x < 15.5);
});

test('zombie ignores player farther than 6', () => {
  const s = world();
  s.player.body.x = 5.5;
  const z = new Enemy('zombie', 15.5, 2, recipe);
  tick(z, s, 0.3);
  assert.equal(z.state, 'patrol');
});

test('mummy windup precedes charge', () => {
  const s = world();
  s.player.body.x = 11.5;
  const m = new Enemy('mummy', 15.5, 2, recipe);
  const states = [];
  for (let t = 0; t < 1.5; t += DT) { m.update(DT, s); if (states.at(-1) !== m.state) states.push(m.state); }
  const w = states.indexOf('windup'), c = states.indexOf('charge');
  assert.ok(w >= 0 && c > w, states.join(','));
  assert.ok(s.events.some((e) => e.type === 'windup'));
});

test('enemy inactive when far', () => {
  const s = world();
  s.player.body.x = 70.5;
  const z = new Enemy('zombie', 15.5, 2, recipe);
  tick(z, s, 1);
  assert.equal(z.active, false);
  assert.equal(z.body.x, 15.5);
});

test('enemy hp and death', () => {
  const s = world();
  const m = new Enemy('mummy', 15.5, 2, recipe);
  m.damage(s, 1);
  assert.equal(m.alive, true);
  m.damage(s, 1);
  assert.equal(m.alive, false);
  assert.ok(s.events.some((e) => e.type === 'enemyDie'));
});

test('boomerang returns and breaks dirt', () => {
  const s = world();
  s.player.body.x = 10.5; s.player.facing = 1;
  s.grid.set(14, 3, T.DIRT);
  const b = new Boomerang(s.player);
  let farthest = 0;
  for (let t = 0; t < 3 && b.alive; t += DT) { b.update(DT, s); farthest = Math.max(farthest, b.x); }
  assert.equal(s.grid.get(14, 3), T.AIR);
  assert.ok(farthest >= 16.5 && farthest <= 18.5, `farthest ${farthest}`);
  assert.equal(b.alive, false, 'boomerang should return to player');
});

test('boomerang does not break stone and turns back', () => {
  const s = world();
  s.player.body.x = 10.5; s.player.facing = 1;
  s.grid.set(13, 3, T.STONE);
  const b = new Boomerang(s.player);
  let farthest = 0;
  for (let t = 0; t < 3 && b.alive; t += DT) { b.update(DT, s); farthest = Math.max(farthest, b.x); }
  assert.equal(s.grid.get(13, 3), T.STONE);
  assert.ok(farthest < 13.5, `farthest ${farthest}`);
});

test('boomerang damages enemy once per leg', () => {
  const s = world();
  s.player.body.x = 10.5; s.player.facing = 1;
  const z = new Enemy('zombie', 14.5, 2, { ...recipe, zombieHp: 5 });
  s.enemies.push(z);
  const b = new Boomerang(s.player);
  for (let t = 0; t < 3 && b.alive; t += DT) b.update(DT, s);
  assert.equal(z.hp, 3);
});

test('pickup pops, lands and expires after 8s', () => {
  const s = world();
  const p = new Pickup('heart', 10.5, 4);
  tick(p, s, 1);
  assert.ok(Math.abs(p.body.y - 2) < 1e-6);
  assert.equal(p.alive, true);
  tick(p, s, 6.0);
  assert.equal(p.blinking, true);
  tick(p, s, 1.1);
  assert.equal(p.alive, false);
});
