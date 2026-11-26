// Giocatore automatico semplice: serve a verificare che i livelli siano completabili
// e a stimarne la durata (test di bilanciamento e modalità ?bot=1 nel browser).
import { TILE_INFO, T } from '../world/tiles.js';

export function createBot() {
  let jumpHeld = false;
  let lastHit = 0;
  let stuck = 0, lastX = 0, waitT = 0, pushT = 0;
  return {
    input(s) {
      const p = s.player, b = p.body, g = s.grid;
      const inp = { left: false, right: true, jump: false, jumpPressed: false, hit: false, hitPressed: false };
      const fy = Math.round(b.y);
      const front = b.x + b.w / 2;
      const ax = Math.floor(front + 0.05);
      lastHit += 1 / 60;

      // mantieni il salto finché si sale
      if (jumpHeld) { if (b.vy > 0) inp.jump = true; else jumpHeld = false; }
      const jump = () => { if (b.onGround || p.coyote > 0) { inp.jump = inp.jumpPressed = true; jumpHeld = true; } };
      const hit = () => { if (p.swing <= 0 && lastHit > 0.32) { inp.hit = inp.hitPressed = true; lastHit = 0; } };

      // nemici davanti: fermati a distanza, colpisci quando sono a tiro, arretra se troppo vicini.
      // Se l'attesa dura troppo, avanza comunque (i nemici di pattuglia possono non avvicinarsi).
      let holding = false;
      pushT = Math.max(0, pushT - 1 / 60);
      for (const e of s.enemies) {
        if (!e.alive || !e.active) continue;
        const dx = e.body.x - b.x, dy = Math.abs(e.body.y - b.y);
        if (dy > 2.2 || dx < -0.6) continue;
        const reach = p.boomerang > 0 ? 6 : 1.7;
        if (dx < reach) hit();
        if (p.star > 0 || pushT > 0 || dy > 0.6 || !b.onGround) continue;
        if (dx < 2.1) { inp.right = false; holding = true; }
        if (dx < 0.95 && (e.state === 'chase' || e.state === 'charge')) inp.left = true;
      }
      waitT = holding ? waitT + 1 / 60 : 0;
      if (waitT > 1.2) { pushT = 0.8; waitT = 0; }

      // spuntoni retrattili davanti: aspetta che rientrino
      for (const rs of s.level.retractSpikes) {
        const d = rs.x - front;
        if (d > -1.2 && d < 1.2 && rs.y === fy) {
          const run = s.level.retractSpikes.filter((r) => r.y === rs.y && r.x >= rs.x && r.x < rs.x + 6);
          if (rs.up || (s.elapsed + rs.phase) % 3.5 > 3.5 - 0.15 * run.length - 0.2) { if (d > 0.15 && b.onGround) inp.right = false; }
        }
      }

      // muro davanti
      const solid = (x, y) => g.isSolid(x, y);
      if (solid(ax, fy) || solid(ax, fy + 1)) {
        let h = 0; while (h < 6 && solid(ax, fy + h)) h++;
        const ceiling = solid(Math.floor(b.x), fy + 2) || solid(Math.floor(b.x), fy + 3);
        const breakable = [0, 1, 2].some((k) => TILE_INFO[g.get(ax, fy + k)].breakable && solid(ax, fy + k));
        if (h <= 2 && !solid(ax, fy + h) && !ceiling && !solid(ax, fy + h + 1)) jump();
        else if (breakable) { hit(); if (front > ax - 0.08) inp.right = false; }
        else jump();
      }
      // bonus sopra/davanti: colpiscilo
      if (g.get(ax, fy + 2) === T.BONUS || g.get(ax, fy + 1) === T.BONUS) hit();

      // buche e pericoli davanti: salta dal bordo
      const nx = Math.floor(front + 0.35);
      const hazardAhead = (x) => {
        const id = g.get(x, fy);
        if (TILE_INFO[id].hazard && !(id === T.SPIKES_RETRACT && !s.spikeIsUp(x, fy))) return true;
        // un dislivello fino a 4 blocchi si scende camminando; oltre è una buca
        for (let k = 1; k <= 4; k++) if (solid(x, fy - k)) return false;
        return !solid(x, fy);
      };
      if (b.onGround && hazardAhead(nx) && !solid(nx, fy)) {
        // spuntoni retrattili giù: si può camminare
        const id = g.get(nx, fy);
        if (!(id === T.SPIKES_RETRACT && !s.spikeIsUp(nx, fy) && solid(nx, fy - 1))) jump();
      }
      // in aria sopra il vuoto: continua a destra
      if (!b.onGround) inp.right = true && inp.right;

      // sblocco: se fermo a lungo, prova a saltare
      if (Math.abs(b.x - lastX) < 0.01 && inp.right) stuck += 1 / 60; else stuck = 0;
      lastX = b.x;
      if (stuck > 0.6) { jump(); hit(); stuck = 0; }
      if (p.boomerang > 0 && s.enemies.some((e) => e.alive && e.active && e.body.x > b.x && e.body.x - b.x < 7 && Math.abs(e.body.y - b.y) < 1.5)) hit();
      return inp;
    },
  };
}

/** Esegue il bot su un livello (in Node). */
export function runBot(level, Session, { maxTime = 130, dt = 1 / 60, hearts } = {}) {
  const s = new Session(level);
  s.start();
  if (hearts) s.player.hearts = hearts;
  const bot = createBot();
  let t = 0;
  while (s.status === 'playing' && t < maxTime) { s.update(dt, bot.input(s)); s.drainEvents(); t += dt; }
  return { won: s.status === 'won', time: level.recipe.time - s.time, hurts: s.stats.hurts, reason: s.lostReason, x: s.player.body.x, session: s };
}
