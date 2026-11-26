// Piccone lanciato: va avanti per BOOMERANG_RANGE blocchi e torna dal minatore.
import { RULES } from '../config.js';
import { TILE_INFO } from '../world/tiles.js';
import { aabbOverlap } from './physics.js';

export class Boomerang {
  constructor(player) {
    const p = player.body;
    this.dir = player.facing;
    this.x = p.x + this.dir * 0.4;
    this.y = p.y + 1.0;
    this.startX = this.x;
    this.returning = false;
    this.alive = true;
    this.age = 0;
    this.spin = 0;
    this.hitSet = new Set();
  }

  turnBack() { this.returning = true; this.hitSet.clear(); }

  update(dt, session) {
    if (!this.alive) return;
    this.age += dt;
    this.spin += dt * 22;
    const grid = session.grid;
    const p = session.player.body;
    const speed = RULES.BOOMERANG_SPEED;
    if (!this.returning) {
      this.x += this.dir * speed * dt;
      if (Math.abs(this.x - this.startX) >= RULES.BOOMERANG_RANGE) this.turnBack();
    } else {
      const tx = p.x, ty = p.y + 1.0;
      const dx = tx - this.x, dy = ty - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.6 || this.age > 4) { this.alive = false; session.emit('catch', { x: this.x, y: this.y }); return; }
      const s = Math.min(d, speed * 1.15 * dt);
      this.x += (dx / d) * s;
      this.y += (dy / d) * s;
    }
    // Blocchi: rompe quelli fragili; all'andata rimbalza su quelli duri.
    const cx = Math.floor(this.x), cy = Math.floor(this.y);
    const info = TILE_INFO[grid.get(cx, cy)];
    if (info.solid) {
      if (info.breakable && info.hp === 1) {
        const r = grid.hit(cx, cy);
        session.emit('break', { x: cx, y: cy, id: r.id, bonus: r.wasBonus });
        if (session.onTileBroken) session.onTileBroken(cx, cy, r);
      } else if (!this.returning) {
        session.emit('clink', { x: this.x, y: this.y });
        this.turnBack();
      }
    }
    // Nemici: un colpo per nemico per tratta.
    const box = { x: this.x, y: this.y - 0.35, w: 0.7, h: 0.7 };
    for (const e of session.enemies || []) {
      if (!e.alive || this.hitSet.has(e)) continue;
      if (aabbOverlap(box, e.body)) {
        this.hitSet.add(e);
        session.damageEnemy(e, this.returning ? -this.dir : this.dir);
      }
    }
  }
}
