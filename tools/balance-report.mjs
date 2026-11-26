// Tabella di bilanciamento: per ogni livello, esito e tempo del giocatore automatico.
// Il bot ha cuori illimitati: misura durata e completabilità; i danni indicano la difficoltà.
// Uso: node tools/balance-report.mjs
import { LEVELS } from '../src/world/levels.js';
import { generateLevel } from '../src/world/generator.js';
import { Session } from '../src/game/session.js';
import { runBot } from '../src/game/bot.js';

console.log('Liv | Nome                     | Esito  | Tempo bot | Stima umano | Danni | Lungh.');
for (const r of LEVELS) {
  const lv = generateLevel(r);
  const res = runBot(lv, Session, { hearts: 99 });
  const human = res.time * 1.22;
  console.log(`${String(r.id).padStart(3)} | ${r.name.padEnd(24)} | ${res.won ? 'OK    ' : (res.reason || 'stop').padEnd(6)} | ${res.time.toFixed(1).padStart(7)} s | ${human.toFixed(0).padStart(9)} s | ${String(res.hurts).padStart(5)} | ${r.length}${res.won ? '' : `  (fermo a x=${res.x.toFixed(1)})`}`);
}
