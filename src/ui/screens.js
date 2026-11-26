// Gestione delle schermate (titolo, livelli, intro, pausa, risultato).
import { LEVELS } from '../world/levels.js';
import { formatTime } from './hud.js';

const SCREENS = ['loading', 'title', 'levels', 'intro', 'pause', 'result'];

export class Screens {
  constructor() {
    this.el = Object.fromEntries(SCREENS.map((n) => [n, document.getElementById(`screen-${n}`)]));
    this.current = 'loading';
  }
  show(name) {
    for (const [n, el] of Object.entries(this.el)) el.classList.toggle('show', n === name);
    this.current = name;
  }
  hideAll() { this.show(null); }

  renderLevels(save, onPick) {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    for (const r of LEVELS) {
      const b = document.createElement('button');
      const locked = r.id > save.unlocked;
      const best = save.best[r.id];
      b.className = `lvl t-${r.theme}${locked ? ' locked' : ''}${best ? ' done' : ''}`;
      b.innerHTML = `<b>${r.id}</b><span>${r.name}</span><small>${best ? `⏱ ${formatTime(best.time)} · ${best.score}` : locked ? 'Bloccato' : 'Nuovo'}</small>`;
      b.disabled = false;
      b.setAttribute('aria-label', `Livello ${r.id}: ${r.name}${locked ? ' (bloccato)' : ''}`);
      b.addEventListener('click', () => { if (!locked) onPick(r.id); });
      grid.appendChild(b);
    }
  }

  intro(recipe) {
    document.getElementById('intro-num').textContent = `LIVELLO ${recipe.id} / ${LEVELS.length}`;
    document.getElementById('intro-name').textContent = recipe.name;
    document.getElementById('intro-hint').textContent = recipe.hint || '';
  }

  result({ won, reason, session, record, last }) {
    const title = document.getElementById('result-title');
    const stats = document.getElementById('result-stats');
    const s = session;
    if (won) title.textContent = last ? 'Hai completato tutti i livelli!' : 'Livello completato!';
    else title.textContent = reason === 'time' ? 'Tempo scaduto!' : 'Cuori finiti!';
    document.getElementById('result-badge').classList.toggle('hidden', !(won && record));
    const used = s.recipe.time - s.time;
    const rows = won
      ? [['Tempo', formatTime(used)], ['Bonus tempo', `+${s.timeBonus}`], ['Nemici sconfitti', s.stats.enemies], ['Blocchi rotti', s.stats.blocks], ['Punteggio', s.score]]
      : [['Avanzamento', `${Math.round(s.progress() * 100)}%`], ['Nemici sconfitti', s.stats.enemies], ['Punteggio', s.score], ['', 'Il livello ricomincia da capo']];
    stats.innerHTML = `<dl class="stats">${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>`;
    document.getElementById('btn-next').classList.toggle('hidden', !won || last);
    document.getElementById('btn-retry').textContent = won ? 'RIGIOCA' : 'RIPROVA';
    document.getElementById('btn-retry').classList.toggle('primary', !won || last);
  }
}
