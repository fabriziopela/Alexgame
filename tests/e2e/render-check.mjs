// Verifica visiva: carica livelli e salva screenshot.
// Uso: node tests/e2e/render-check.mjs <cartellaOutput> [livelli...]
// Variabili: BASE (URL della pagina), WAIT (ms di attesa), BOT=1 (giocatore automatico).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const out = process.argv[2] || '.';
const levels = process.argv.slice(3).map(Number);
const base = process.env.BASE || 'http://localhost:8765/index.html';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const errors = [];
page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GL Driver Message')) errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
for (const n of (levels.length ? levels : [1])) {
  await page.goto(`${base}?level=${n}&autostart=1${process.env.BOT ? '&bot=1' : ''}`);
  await page.waitForTimeout(Number(process.env.WAIT || 2500));
  await page.screenshot({ path: `${out}/level-${n}.png` });
}
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
