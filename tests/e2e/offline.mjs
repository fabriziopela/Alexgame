// Verifica: dopo il primo caricamento il gioco parte anche senza rete.
// Uso: node tests/e2e/offline.mjs   (server su http://localhost:8765)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.env.BASE || 'http://localhost:8765/index.html';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(base);
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await page.waitForFunction(() => !!navigator.serviceWorker.controller);
await ctx.setOffline(true);
await page.reload();
await page.waitForFunction(() => window.__game && document.querySelector('#screen-title.show'), null, { timeout: 15000 });
await page.click('#btn-play');
await page.waitForFunction(() => window.__game.state === 'intro' || window.__game.state === 'playing');
assert.deepEqual(errors, []);
console.log('offline: OK');
await browser.close();
