import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../src/game/player.js';
import { PHYS, RULES } from '../src/config.js';
import { T } from '../src/world/tiles.js';
import { flatGrid, fakeSession, inp } from './helpers.js';

const DT = PHYS.DT;
const run = (p, s, secs, input = inp()) => { for (let t = 0; t < secs - 1e-9; t += DT) p.update(DT, typeof input === 'function' ? input(t) : input, s); };

function settle(p, s) { run(p, s, 0.3); }

test('player stands on ground', () => {
  const g = flatGrid(); const s = fakeSession(g);
  const p = new Player(5.5, 4); settle(p, s);
  assert.equal(p.body.onGround, true);
  assert.ok(Math.abs(p.body.y - 2) < 1e-6);
});

function edgeSetup() {
  const holes = []; for (let x = 10; x < 40; x++) holes.push(x);
  const g = flatGrid(60, 20, holes); const s = fakeSession(g);
  const p = new Player(9.3, 2); settle(p, s);
  // corre verso destra fino a lasciare il bordo
  let t = 0;
  while (p.body.onGround && t < 2) { p.update(DT, inp({ right: true }), s); t += DT; }
  return { p, s };
}

test('coyote jump allowed 0.08s after leaving edge', () => {
  const { p, s } = edgeSetup();
  run(p, s, 0.07, inp({ right: true }));
  p.update(DT, inp({ right: true, jump: true, jumpPressed: true }), s);
  assert.ok(p.body.vy > 5, `vy=${p.body.vy}`);
});

test('no coyote jump after 0.15s', () => {
  const { p, s } = edgeSetup();
  run(p, s, 0.15, inp({ right: true }));
  p.update(DT, inp({ right: true, jump: true, jumpPressed: true }), s);
  assert.ok(p.body.vy < 0, `vy=${p.body.vy}`);
});

test('buffered jump fires on landing', () => {
  const g = flatGrid(); const s = fakeSession(g);
  const p = new Player(5.5, 2.15); // poco sopra il terreno, in caduta
  p.update(DT, inp(), s);
  p.update(DT, inp({ jump: true, jumpPressed: true }), s);
  let jumped = false;
  for (let i = 0; i < 6; i++) { p.update(DT, inp({ jump: true }), s); if (p.body.vy > 5) jumped = true; }
  assert.equal(jumped, true);
});

test('releasing jump early gives a lower jump', () => {
  const g = flatGrid(); const s = fakeSession(g);
  const full = new Player(5.5, 2); settle(full, s);
  const short = new Player(15.5, 2); settle(short, s);
  let maxF = 0, maxS = 0;
  full.update(DT, inp({ jump: true, jumpPressed: true }), s);
  short.update(DT, inp({ jump: true, jumpPressed: true }), s);
  for (let i = 0; i < 60; i++) {
    full.update(DT, inp({ jump: true }), s); maxF = Math.max(maxF, full.body.y);
    short.update(DT, inp({ jump: i < 4 }), s); maxS = Math.max(maxS, short.body.y);
  }
  assert.ok(maxF - 2 > 3.0, `full ${maxF - 2}`);
  assert.ok(maxS < maxF - 1, `short ${maxS - 2}`);
});

test('swing breaks dirt in front at head height', () => {
  const g = flatGrid(); const s = fakeSession(g);
  g.set(7, 3, T.DIRT);
  const p = new Player(6.5, 2); settle(p, s);
  p.update(DT, inp({ hit: true, hitPressed: true }), s);
  assert.equal(g.get(7, 3), T.AIR);
  assert.ok(s.events.some((e) => e.type === 'break'));
});

test('stone needs two swings', () => {
  const g = flatGrid(); const s = fakeSession(g);
  g.set(7, 2, T.STONE);
  const p = new Player(6.5, 2); settle(p, s);
  p.update(DT, inp({ hit: true, hitPressed: true }), s);
  assert.equal(g.get(7, 2), T.STONE);
  run(p, s, RULES.SWING_TIME + 0.05);
  p.update(DT, inp({ hit: true, hitPressed: true }), s);
  assert.equal(g.get(7, 2), T.AIR);
});

test('swing faces left after moving left', () => {
  const g = flatGrid(); const s = fakeSession(g);
  g.set(5, 2, T.DIRT);
  const p = new Player(6.5, 2); settle(p, s);
  run(p, s, 0.05, inp({ left: true }));
  run(p, s, 0.3);
  assert.equal(p.facing, -1);
  p.update(DT, inp({ hit: true, hitPressed: true }), s);
  assert.equal(g.get(5, 2), T.AIR);
});

test('swing with boomerang power throws instead', () => {
  const g = flatGrid(); const s = fakeSession(g);
  const p = new Player(6.5, 2); settle(p, s);
  p.boomerang = 10;
  p.update(DT, inp({ hit: true, hitPressed: true }), s);
  assert.equal(s.thrown, 1);
});

test('swing damages enemy in front', () => {
  const g = flatGrid(); const s = fakeSession(g);
  const p = new Player(6.5, 2); settle(p, s);
  const enemy = { alive: true, body: { x: 7.5, y: 2, w: 0.7, h: 1.8 } };
  s.enemies.push(enemy);
  p.update(DT, inp({ hit: true, hitPressed: true }), s);
  assert.deepEqual(s.damaged, [enemy]);
});

test('hurt removes one heart and grants 1.2s invuln', () => {
  const g = flatGrid(); const s = fakeSession(g);
  const p = new Player(6.5, 2); settle(p, s);
  assert.equal(p.hurt(s, 8), true);
  assert.equal(p.hearts, 2);
  assert.ok(Math.abs(p.invuln - RULES.HURT_INVULN) < 1e-9);
  assert.equal(p.hurt(s, 8), false);
  assert.equal(p.hearts, 2);
  run(p, s, 1.25);
  assert.equal(p.hurt(s, 8), true);
  assert.equal(p.hearts, 1);
});

test('star blocks hurt', () => {
  const g = flatGrid(); const s = fakeSession(g);
  const p = new Player(6.5, 2); p.star = 3;
  assert.equal(p.hurt(s, 8), false);
  assert.equal(p.hearts, 3);
});

test('heal caps at 3', () => {
  const p = new Player(1, 1);
  assert.equal(p.heal(), false);
  p.hearts = 2;
  assert.equal(p.heal(), true);
  assert.equal(p.hearts, 3);
});

test('lastSafe follows solid ground', () => {
  const g = flatGrid(); const s = fakeSession(g);
  const p = new Player(5.5, 2); settle(p, s);
  run(p, s, 0.5, inp({ right: true }));
  assert.ok(p.lastSafe.x > 6, `lastSafe ${p.lastSafe.x}`);
  assert.equal(p.lastSafe.y, 2);
});
