// Zombie e mummie.
import { RULES } from '../config.js';
import { makeBody, moveBody, overlapsHazard } from './physics.js';

const ZOMBIE_SIGHT = 6;
const MUMMY_SIGHT = 5;
const WINDUP = 0.5;
const CHARGE_TIME = 0.8;
const CHARGE_MULT = 2.2;
const MUMMY_SLOW = 0.7;

export class Enemy {
  constructor(type, x, y, recipe) {
    this.type = type;
    this.body = makeBody(x, y, 0.7, 1.8);
    this.hp = type === 'mummy' ? recipe.mummyHp : recipe.zombieHp;
    this.maxHp = this.hp;
    this.speed = recipe.enemySpeed * (type === 'mummy' ? MUMMY_SLOW : 1);
    this.dir = -1;
    this.active = false;
    this.alive = true;
    this.state = 'patrol';
    this.timer = 0;
    this.cooldown = 0;
    this.flash = 0;
    this.anim = Math.random() * 10;
  }

  /** true se davanti (nella direzione d) c'è un bordo, un muro o un pericolo. */
  blocked(grid, d) {
    const b = this.body;
    const ax = Math.floor(b.x + d * (b.w / 2 + 0.15));
    const fy = Math.round(b.y);
    return !grid.isSolid(ax, fy - 1) || grid.isSolid(ax, fy) || grid.isSolid(ax, fy + 1)
      || grid.hazardAt(ax, fy) !== null;
  }

  update(dt, session) {
    if (!this.alive) return;
    const b = this.body;
    const p = session.player.body;
    const camX = session.cameraX ?? p.x;
    this.active = Math.abs(b.x - camX) <= RULES.ENEMY_ACTIVE_RANGE;
    if (!this.active) return;
    this.anim += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    const dx = p.x - b.x, dy = Math.abs(p.y - b.y);
    const grid = session.grid;

    if (this.state === 'hit') {
      this.timer -= dt;
      b.vx *= 0.9;
      if (this.timer <= 0) this.state = 'patrol';
    } else if (this.type === 'zombie') {
      if (Math.abs(dx) < ZOMBIE_SIGHT && dy < 2.5) {
        this.state = 'chase';
        this.dir = Math.sign(dx) || this.dir;
        b.vx = this.blocked(grid, this.dir) || Math.abs(dx) < 0.3 ? 0 : this.dir * this.speed;
      } else {
        this.state = 'patrol';
        if (b.onGround && this.blocked(grid, this.dir)) this.dir = -this.dir;
        b.vx = this.dir * this.speed * 0.5;
      }
    } else {
      // mummia
      if (this.state === 'windup') {
        b.vx = 0;
        this.timer -= dt;
        if (this.timer <= 0) { this.state = 'charge'; this.timer = CHARGE_TIME; }
      } else if (this.state === 'charge') {
        this.timer -= dt;
        b.vx = this.blocked(grid, this.dir) ? 0 : this.dir * this.speed * CHARGE_MULT;
        if (this.timer <= 0) { this.state = 'patrol'; this.cooldown = 1.2; }
      } else {
        this.state = 'patrol';
        if (this.cooldown <= 0 && Math.abs(dx) < MUMMY_SIGHT && dy < 2) {
          this.state = 'windup';
          this.timer = WINDUP;
          this.dir = Math.sign(dx) || this.dir;
          session.emit('windup', { x: b.x, y: b.y });
        } else {
          if (b.onGround && this.blocked(grid, this.dir)) this.dir = -this.dir;
          b.vx = this.dir * this.speed * 0.5;
        }
      }
    }

    moveBody(b, grid, dt);
    if (b.y < 1 || overlapsHazard(b, grid) === 'lava') this.kill(session, false);
  }

  damage(session, dir) {
    if (!this.alive) return;
    this.hp--;
    this.flash = 0.2;
    const b = this.body;
    if (this.hp <= 0) { this.kill(session, true); return; }
    this.state = 'hit';
    this.timer = 0.25;
    b.vx = dir * 4;
    b.vy = 4;
    session.emit('enemyHit', { x: b.x, y: b.y, enemy: this.type });
  }

  kill(session, byPlayer) {
    this.alive = false;
    this.state = 'dead';
    session.emit('enemyDie', { x: this.body.x, y: this.body.y, enemy: this.type, byPlayer });
  }
}
