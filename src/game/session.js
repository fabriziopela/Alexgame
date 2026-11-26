// Sessione di un livello: regole, timer, punteggio, eventi per render/audio/UI.
import { RULES, SCORE } from '../config.js';
import { T, TILE_INFO } from '../world/tiles.js';
import { Player } from './player.js';
import { Enemy } from './enemies.js';
import { Boomerang } from './boomerang.js';
import { Pickup } from './pickups.js';
import { aabbOverlap, SPIKE_H } from './physics.js';

const PIT_Y = 1;
const SPIKE_CYCLE = 3.5;
const SPIKE_UP = 2.0;

export class Session {
  constructor(level) {
    this.level = level;
    this.recipe = level.recipe;
    this.grid = level.grid;
    this.player = new Player(level.spawn.x, level.spawn.y);
    this.enemies = level.enemies.map((e) => new Enemy(e.type, e.x, e.y, level.recipe));
    this.pickups = [];
    this.boomerang = null;
    this.time = level.recipe.time;
    this.elapsed = 0;
    this.score = 0;
    this.status = 'intro';
    this.lostReason = null;
    this.events = [];
    this.cameraX = this.player.body.x;
    this.stats = { blocks: 0, enemies: 0, hurts: 0, powerups: 0 };
    this.lastTick = Math.ceil(this.time);
    for (const rs of level.retractSpikes) rs.up = true;
    this.updateSpikes();
  }

  emit(type, data = {}) { this.events.push({ type, ...data }); }
  drainEvents() { const e = this.events; this.events = []; return e; }

  start() { if (this.status === 'intro') this.status = 'playing'; }
  pause() { if (this.status === 'playing') { this.status = 'paused'; this.emit('pause'); } }
  resume() { if (this.status === 'paused') { this.status = 'playing'; this.emit('resume'); } }

  progress() {
    const a = this.level.spawn.x, b = this.level.exitX;
    return Math.max(0, Math.min(1, (this.player.body.x - a) / (b - a)));
  }

  boomerangActive() { return this.boomerang !== null; }
  spawnBoomerang(player) { this.boomerang = new Boomerang(player); }

  updateSpikes() {
    for (const rs of this.level.retractSpikes) {
      const up = (this.elapsed + rs.phase) % SPIKE_CYCLE < SPIKE_UP;
      if (up !== rs.up) { rs.up = up; this.emit(up ? 'spikesUp' : 'spikesDown', { x: rs.x, y: rs.y }); }
    }
  }

  spikeIsUp(x, y) {
    const rs = this.level.retractSpikes.find((r) => r.x === x && r.y === y);
    return rs ? rs.up : true;
  }

  /** Pericolo toccato dal giocatore, tenendo conto degli spuntoni retrattili. */
  playerHazard() {
    const b = this.player.body;
    const x0 = Math.floor(b.x - b.w / 2 + 0.12), x1 = Math.floor(b.x + b.w / 2 - 0.12);
    let found = null;
    for (let ty = Math.floor(b.y + 0.02); ty <= Math.floor(b.y + b.h - 0.12); ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const id = this.grid.get(tx, ty);
        const h = TILE_INFO[id].hazard;
        if (h === 'lava') return 'lava';
        if (h === 'spikes' && b.y < ty + SPIKE_H && (id !== T.SPIKES_RETRACT || this.spikeIsUp(tx, ty))) found = 'spikes';
      }
    }
    return found;
  }

  update(dt, input) {
    if (this.status !== 'playing') return;
    this.elapsed += dt;
    this.time = Math.max(0, this.time - dt);
    const sec = Math.ceil(this.time);
    if (sec !== this.lastTick) {
      this.lastTick = sec;
      if (sec <= RULES.TIMER_WARNING && sec > 0) this.emit('tick', { sec });
    }
    if (this.time <= 0) { this.lose('time'); return; }
    this.updateSpikes();

    const p = this.player;
    const hadStar = p.star > 0;
    p.update(dt, input, this);
    if (hadStar && p.star <= 0) this.emit('starOff');
    this.cameraX = p.body.x;

    for (const e of this.enemies) e.update(dt, this);
    if (this.boomerang) { this.boomerang.update(dt, this); if (!this.boomerang.alive) this.boomerang = null; }
    for (const pk of this.pickups) {
      pk.update(dt, this);
      if (pk.alive && pk.age > 0.25 && aabbOverlap(p.body, pk.body)) this.applyPickup(pk);
    }
    this.pickups = this.pickups.filter((pk) => pk.alive);

    // Contatto con i nemici.
    const hitBox = { x: p.body.x, y: p.body.y + 0.1, w: p.body.w * 0.8, h: p.body.h * 0.85 };
    for (const e of this.enemies) {
      if (!e.alive || !e.active || !aabbOverlap(hitBox, e.body)) continue;
      if (p.star > 0) { e.kill(this, true); this.scoreEnemy(e); }
      else this.hurtPlayer(e.body.x);
    }

    // Pericoli e buche.
    const hz = this.playerHazard();
    if (p.body.y < PIT_Y || hz === 'lava') {
      if (p.star <= 0) this.hurtPlayer(p.body.x, false, true);
      if (this.status === 'playing') this.respawn();
    } else if (hz === 'spikes') {
      if (this.hurtPlayer(p.body.x - p.facing, true)) { p.body.vy = 10; }
    }

    if (this.status === 'playing' && p.body.x >= this.level.exitX) this.win();
  }

  hurtPlayer(fromX, knock = true, force = false) {
    const ok = this.player.hurt(this, fromX, knock, force);
    if (ok) {
      this.stats.hurts++;
      if (this.player.hearts <= 0) this.lose('hearts');
    }
    return ok;
  }

  standable(x, y) {
    const g = this.grid;
    return g.isSolid(x, y - 1) && !g.isSolid(x, y) && !g.isSolid(x, y + 1)
      && !TILE_INFO[g.get(x, y)].hazard && !TILE_INFO[g.get(x, y - 1)].hazard;
  }

  /** Riporta il giocatore sull'ultimo punto sicuro (o il più vicino valido). */
  respawn() {
    const p = this.player;
    const sx = Math.floor(p.lastSafe.x), sy = p.lastSafe.y;
    let spot = null;
    for (let d = 0; d < 40 && !spot; d++) {
      for (const x of d === 0 ? [sx] : [sx - d, sx + d]) {
        if (x < 0 || x >= this.grid.w) continue;
        if (this.standable(x, sy)) { spot = { x, y: sy }; break; }
        for (let y = 2; y < this.grid.h - 1; y++) if (this.standable(x, y)) { spot = { x, y }; break; }
        if (spot) break;
      }
    }
    if (!spot) spot = { x: Math.floor(this.level.spawn.x), y: this.level.spawn.y };
    const b = p.body;
    b.x = spot.x + 0.5; b.y = spot.y; b.vx = 0; b.vy = 0;
    p.lastSafe = { x: b.x, y: b.y };
    p.invuln = Math.max(p.invuln, 1.0);
    p.hurtTime = 0;
    p.inputLock = 0.5;
    this.emit('respawn', { x: b.x, y: b.y });
  }

  onTileBroken(x, y, r) {
    this.stats.blocks++;
    this.score += r.wasBonus ? SCORE.BONUS_BLOCK : SCORE.BLOCK;
    if (r.wasBonus) {
      const kind = this.level.bonusLoot.get(`${x},${y}`) || 'heart';
      this.level.bonusLoot.delete(`${x},${y}`);
      this.pickups.push(new Pickup(kind, x + 0.5, y));
      this.emit('bonus', { x, y, kind });
    }
  }

  damageEnemy(e, dir) {
    e.damage(this, dir);
    if (!e.alive) this.scoreEnemy(e);
  }

  scoreEnemy(e) {
    this.stats.enemies++;
    this.score += e.type === 'mummy' ? SCORE.MUMMY : SCORE.ZOMBIE;
  }

  applyPickup(pk) {
    pk.alive = false;
    const p = this.player;
    this.stats.powerups++;
    if (pk.kind === 'heart') {
      if (p.heal()) this.score += SCORE.POWERUP;
      else this.score += SCORE.HEART_FULL;
    } else if (pk.kind === 'boomerang') {
      p.boomerang = RULES.BOOMERANG_TIME;
      this.score += SCORE.POWERUP;
    } else if (pk.kind === 'star') {
      p.star = RULES.STAR_TIME;
      this.score += SCORE.POWERUP;
      this.emit('starOn');
    }
    this.emit('pickup', { kind: pk.kind, x: p.body.x, y: p.body.y });
  }

  win() {
    this.status = 'won';
    this.timeBonus = Math.ceil(this.time) * SCORE.PER_SECOND_LEFT;
    this.score += this.timeBonus;
    this.emit('win', { score: this.score, time: this.recipe.time - this.time });
  }

  lose(reason) {
    if (this.status === 'lost') return;
    this.status = 'lost';
    this.lostReason = reason;
    this.emit('lose', { reason });
  }
}
