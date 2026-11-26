// Il minatore: movimento da platform, salto con aiuti, piccone, danni.
import { PHYS, RULES } from '../config.js';
import { makeBody, moveBody, aabbOverlap } from './physics.js';

const NO_INPUT = Object.freeze({ left: false, right: false, jump: false, jumpPressed: false, hit: false, hitPressed: false });
const approach = (v, target, delta) => (v < target ? Math.min(v + delta, target) : Math.max(v - delta, target));

export class Player {
  constructor(x, y) {
    this.body = makeBody(x, y, PHYS.PLAYER_W, PHYS.PLAYER_H);
    this.facing = 1;
    this.hearts = RULES.MAX_HEARTS;
    this.invuln = 0;
    this.star = 0;
    this.boomerang = 0;
    this.swing = 0;
    this.throwAnim = 0;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.jumpHeld = false;
    this.lastSafe = { x, y };
    this.state = 'idle';
    this.hurtTime = 0;
    this.inputLock = 0;
    this.alive = true;
  }

  update(dt, input, session) {
    const b = this.body;
    // Dopo una ricomparsa i comandi restano bloccati per un attimo.
    if (this.inputLock > 0) { this.inputLock = Math.max(0, this.inputLock - dt); input = NO_INPUT; }
    this.invuln = Math.max(0, this.invuln - dt);
    this.star = Math.max(0, this.star - dt);
    this.boomerang = Math.max(0, this.boomerang - dt);
    this.swing = Math.max(0, this.swing - dt);
    this.throwAnim = Math.max(0, this.throwAnim - dt);
    this.hurtTime = Math.max(0, this.hurtTime - dt);

    // Movimento orizzontale (durante lo stordimento il controllo è ridotto).
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) this.facing = dir;
    const control = this.hurtTime > 0 ? 0.25 : 1;
    const accel = (dir !== 0 ? (b.onGround ? PHYS.ACCEL : PHYS.AIR_ACCEL) : PHYS.FRICTION) * control;
    b.vx = approach(b.vx, dir * PHYS.RUN_SPEED, accel * dt);

    // Salto: coyote time + jump buffer + salto variabile.
    if (input.jumpPressed) this.jumpBuf = PHYS.JUMP_BUFFER;
    else this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    if (b.onGround) this.coyote = PHYS.COYOTE;
    else this.coyote = Math.max(0, this.coyote - dt);
    if (this.jumpBuf > 0 && this.coyote > 0) {
      b.vy = PHYS.JUMP_VELOCITY;
      this.jumpBuf = 0; this.coyote = 0; this.jumpHeld = true;
      session.emit('jump', { x: b.x, y: b.y });
    }
    if (this.jumpHeld && !input.jump) {
      if (b.vy > 0) b.vy *= PHYS.JUMP_CUT;
      this.jumpHeld = false;
    }
    if (b.vy <= 0) this.jumpHeld = false;

    // Piccone.
    if (input.hitPressed && this.swing <= 0 && this.throwAnim <= 0) {
      if (this.boomerang > 0) {
        if (!session.boomerangActive()) {
          session.spawnBoomerang(this);
          this.throwAnim = 0.25;
          session.emit('throw', { x: b.x, y: b.y });
        }
      } else {
        this.swing = RULES.SWING_TIME;
        this.doSwing(session);
      }
    }

    moveBody(b, session.grid, dt);

    // Ultimo punto sicuro: appoggiato su un blocco solido sotto il centro.
    if (b.onGround && session.grid.isSolid(Math.floor(b.x), Math.round(b.y) - 1)
        && !session.grid.hazardAt(Math.floor(b.x), Math.round(b.y))) {
      this.lastSafe = { x: Math.floor(b.x) + 0.5, y: Math.round(b.y) };
    }

    this.state = this.hurtTime > 0 ? 'hurt'
      : this.swing > 0 || this.throwAnim > 0 ? 'swing'
      : !b.onGround ? (b.vy > 0 ? 'jump' : 'fall')
      : Math.abs(b.vx) > 0.5 ? 'run' : 'idle';
  }

  /** Box d'attacco del piccone (davanti al minatore). */
  attackBox() {
    const b = this.body;
    return { x: b.x + this.facing * 0.85, y: b.y - 0.1, w: 1.3, h: 2.2 };
  }

  doSwing(session) {
    const b = this.body;
    const grid = session.grid;
    session.emit('swing', { x: b.x, y: b.y, facing: this.facing });
    const fx = Math.floor(b.x + this.facing * 0.9);
    const fy = Math.floor(b.y + 1e-6);
    const cells = [[fx, fy], [fx, fy + 1], [fx, fy + 2]];
    if (!b.onGround) cells.push([Math.floor(b.x), Math.floor(b.y + b.h + 0.1)]);
    for (const [x, y] of cells) {
      const r = grid.hit(x, y);
      if (!r) continue;
      session.emit(r.broken ? 'break' : 'chip', { x, y, id: r.id, bonus: r.wasBonus });
      if (session.onTileBroken && r.broken) session.onTileBroken(x, y, r);
    }
    const box = this.attackBox();
    for (const e of session.enemies || []) {
      if (e.alive && aabbOverlap(box, e.body)) session.damageEnemy(e, this.facing);
    }
  }

  /** Subisce danno; ritorna true se ha perso un cuore. */
  hurt(session, fromX, knock = true, force = false) {
    if (this.star > 0) return false;
    if (this.invuln > 0 && !force) return false;
    this.hearts = Math.max(0, this.hearts - 1);
    this.invuln = RULES.HURT_INVULN;
    if (knock) {
      const dir = this.body.x >= fromX ? 1 : -1;
      this.body.vx = dir * 5;
      this.body.vy = 7;
      this.hurtTime = 0.3;
    }
    session.emit('hurt', { x: this.body.x, y: this.body.y, hearts: this.hearts });
    return true;
  }

  heal() {
    if (this.hearts >= RULES.MAX_HEARTS) return false;
    this.hearts++;
    return true;
  }
}
