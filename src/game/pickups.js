// Power-up che escono dai blocchi bonus.
import { RULES } from '../config.js';
import { makeBody, moveBody } from './physics.js';

export class Pickup {
  constructor(kind, x, y) {
    this.kind = kind;            // 'heart' | 'boomerang' | 'star'
    this.body = makeBody(x, y, 0.6, 0.6);
    this.body.vy = 6;
    this.body.vx = 0;
    this.ttl = RULES.PICKUP_LIFETIME;
    this.alive = true;
    this.age = 0;
  }
  get blinking() { return this.ttl < 2; }
  update(dt, session) {
    if (!this.alive) return;
    this.age += dt;
    this.ttl -= dt;
    if (this.ttl <= 0) { this.alive = false; return; }
    moveBody(this.body, session.grid, dt);
    if (this.body.y < 1) this.alive = false;
  }
}
