// HUD: cuori, timer, punteggio, power-up attivo, avanzamento.
import { RULES } from '../config.js';

const HEART_SVG = `<svg class="heart" viewBox="0 0 7 6" shape-rendering="crispEdges"><path fill="#3a0a10" d="M1 0h2v1h1V0h2v1h1v3H6v1H5v1H2V5H1V4H0V1h1z"/><path fill="#ff3b4f" d="M1 1h2v1h1V1h2v2H5v1H4v1H3V4H2V3H1z"/><path fill="#ffd0d6" d="M1 1h1v1H1z"/></svg>`;

export const formatTime = (s) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export class Hud {
  constructor() {
    this.el = document.getElementById('hud');
    this.hearts = document.getElementById('hearts');
    this.timer = document.getElementById('timer');
    this.score = document.getElementById('score');
    this.power = document.getElementById('power');
    this.powerIcon = document.getElementById('power-icon');
    this.powerFill = document.getElementById('power-fill');
    this.progFill = document.getElementById('progress-fill');
    this.progHead = document.getElementById('progress-head');
    this.hearts.innerHTML = HEART_SVG.repeat(RULES.MAX_HEARTS);
    this.last = {};
    this.shownScore = 0;
  }
  show(on) { this.el.classList.toggle('hidden', !on); }
  reset() { this.last = {}; this.shownScore = 0; }

  update(s, dt) {
    const p = s.player;
    if (this.last.hearts !== p.hearts) {
      [...this.hearts.children].forEach((h, i) => {
        const lost = i >= p.hearts;
        h.classList.toggle('lost', lost);
        if (this.last.hearts !== undefined && (lost !== (i >= this.last.hearts))) {
          h.classList.remove('pop'); void h.getBoundingClientRect(); h.classList.add('pop');
        }
      });
      this.last.hearts = p.hearts;
    }
    const t = formatTime(s.time);
    if (this.last.time !== t) {
      this.timer.textContent = t;
      this.timer.classList.toggle('warn', s.time <= RULES.TIMER_WARNING);
      this.last.time = t;
    }
    // il punteggio "conta" verso il valore reale
    this.shownScore += (s.score - this.shownScore) * Math.min(1, dt * 10);
    if (Math.abs(s.score - this.shownScore) < 1) this.shownScore = s.score;
    const sc = String(Math.round(this.shownScore));
    if (this.last.score !== sc) { this.score.textContent = sc; this.last.score = sc; }
    let kind = null, frac = 0;
    if (p.star > 0) { kind = 'star'; frac = p.star / RULES.STAR_TIME; }
    else if (p.boomerang > 0) { kind = 'boomerang'; frac = p.boomerang / RULES.BOOMERANG_TIME; }
    if (this.last.power !== kind) {
      this.power.classList.toggle('hidden', !kind);
      this.power.classList.toggle('star', kind === 'star');
      this.powerIcon.textContent = kind === 'star' ? '★' : '⛏';
      this.last.power = kind;
    }
    if (kind) this.powerFill.style.width = `${(frac * 100).toFixed(1)}%`;
    const pr = `${(s.progress() * 100).toFixed(1)}%`;
    if (this.last.pr !== pr) { this.progFill.style.width = pr; this.progHead.style.left = pr; this.last.pr = pr; }
  }
}
