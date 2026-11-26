// Test del flusso completo su telefoni emulati in orizzontale.
// Uso: node tests/e2e/flow.mjs <cartellaScreenshot>   (server su BASE, default http://localhost:8765/)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const out = process.argv[2] || '.';
const base = process.env.BASE || 'http://localhost:8765/index.html';
const browser = await chromium.launch();

function landscape(dev) {
  const { width, height } = dev.viewport;
  return { ...dev, viewport: { width: Math.max(width, height), height: Math.min(width, height) } };
}

async function run(name, device) {
  const ctx = await browser.newContext(landscape(device));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GL Driver')) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = (n) => page.screenshot({ path: `${out}/${name}-${n}.png` });
  const visible = (id) => page.$eval(`#${id}`, (el) => el.classList.contains('show'));

  await page.goto(base);
  await page.waitForFunction(() => window.__game && document.querySelector('#screen-title.show'));
  await page.waitForTimeout(400);
  await shot('1-title');

  await page.tap('#btn-levels');
  assert.equal(await visible('screen-levels'), true, 'levels screen');
  const locked = await page.$$eval('.lvl.locked', (els) => els.length);
  assert.equal(locked, 9, 'only level 1 unlocked on a fresh device');
  await shot('2-levels');

  await page.tap('.lvl:not(.locked)');
  assert.equal(await visible('screen-intro'), true, 'intro screen');
  await shot('3-intro');
  const vp = page.viewportSize();
  await page.touchscreen.tap(vp.width / 2, vp.height / 2);
  await page.waitForFunction(() => window.__game.state === 'playing');
  const t0 = await page.evaluate(() => window.__game.session.time);

  // tieni premuto ▶ e tocca SALTA con un secondo dito
  const rects = await page.evaluate(() => window.__game.controls.rects());
  const c = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const cdp = await ctx.newCDPSession(page);
  const R = c(rects.right), J = c(rects.jump);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: R.x, y: R.y, id: 1 }] });
  await page.waitForTimeout(300);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: R.x, y: R.y, id: 1 }, { x: J.x, y: J.y, id: 2 }] });
  await page.waitForTimeout(60);
  const both = await page.evaluate(() => { const s = window.__game.input.state(); return { right: s.right, jump: s.jump, vy: window.__game.session.player.body.vy }; });
  await page.waitForTimeout(250);
  await shot('4-playing');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(both.right, true, 'right held while jumping');
  assert.equal(both.jump, true, 'jump held with second finger');
  const x = await page.evaluate(() => window.__game.session.player.body.x);
  assert.ok(x > 4.5, `player moved right (x=${x})`);

  // pausa: il timer si ferma
  await page.tap('#btn-pause');
  assert.equal(await visible('screen-pause'), true, 'pause screen');
  const tp = await page.evaluate(() => window.__game.session.time);
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => window.__game.session.time), tp, 'timer frozen in pause');
  await shot('5-pause');
  await page.tap('#btn-resume');
  await page.waitForTimeout(500);
  const t1 = await page.evaluate(() => window.__game.session.time);
  assert.ok(t1 < tp && t1 < t0, 'timer resumes');

  // rotazione in verticale → schermata "ruota" e pausa
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await page.waitForTimeout(200);
  await page.setViewportSize({ width: landscape(device).viewport.height, height: landscape(device).viewport.width });
  await page.waitForTimeout(400);
  const rot = await page.$eval('#rotate', (el) => getComputedStyle(el).display);
  assert.equal(rot, 'flex', 'rotate overlay visible in portrait');
  assert.equal(await page.evaluate(() => window.__game.state), 'paused', 'paused on portrait');
  await shot('6-portrait');
  await page.setViewportSize(landscape(device).viewport);

  // sconfitta per tempo: schermata risultato
  await page.tap('#btn-resume');
  await page.evaluate(() => { window.__game.session.time = 0.05; });
  await page.waitForFunction(() => window.__game.state === 'result', null, { timeout: 5000 });
  const title = await page.textContent('#result-title');
  assert.equal(title, 'Tempo scaduto!');
  await shot('7-result');

  assert.deepEqual(errors, [], 'no console errors');
  await ctx.close();
  console.log(`${name}: OK`);
}

try {
  await run('iphone', devices['iPhone 13']);
  await run('pixel', devices['Pixel 7']);
} finally {
  await browser.close();
}
