// Ciclo di vita: intro in verticale o in background, memoria GPU ai riavvii.
// Uso: node tests/e2e/lifecycle.mjs   (server su http://localhost:8765)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.env.BASE || 'http://localhost:8765/index.html';
const browser = await chromium.launch();
const failures = [];
const check = async (name, fn) => {
  try { await fn(); console.log(`ok - ${name}`); } catch (e) { failures.push(name); console.log(`not ok - ${name}: ${e.message}`); }
};
const phone = { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true };

await check('intro does not start the timer in portrait', async () => {
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();
  await page.goto(`${base}?level=1`);
  await page.waitForFunction(() => window.__game?.state === 'intro');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(3800);
  const st = await page.evaluate(() => ({ state: window.__game.state, time: window.__game.session.time }));
  assert.equal(st.state, 'paused');
  assert.equal(st.time, 120);
  await ctx.close();
});

await check('intro does not start the timer while the app is in background', async () => {
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();
  await page.goto(`${base}?level=1`);
  await page.waitForFunction(() => window.__game?.state === 'intro');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(3800);
  const st = await page.evaluate(() => ({ state: window.__game.state, time: window.__game.session.time }));
  assert.equal(st.state, 'paused');
  assert.equal(st.time, 120);
  await ctx.close();
});

await check('restarting a level does not leak GPU textures or geometries', async () => {
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();
  await page.goto(`${base}?level=3&autostart=1`);
  await page.waitForFunction(() => window.__game?.state === 'playing');
  await page.waitForTimeout(500);
  const mem = () => page.evaluate(() => ({ ...window.__game.renderer.gl.info.memory }));
  const first = await mem();
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.__game.startLevel(3));
    await page.waitForTimeout(350);
  }
  const after = await mem();
  assert.ok(after.textures <= first.textures + 1, `textures ${first.textures} → ${after.textures}`);
  assert.ok(after.geometries <= first.geometries + 5, `geometries ${first.geometries} → ${after.geometries}`);
  await ctx.close();
});

await browser.close();
if (failures.length) { console.log(`${failures.length} failing`); process.exit(1); }
console.log('lifecycle: OK');
