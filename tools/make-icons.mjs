// Genera le icone dell'app (pixel-art originale) con il browser headless.
// Uso: node tools/make-icons.mjs
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const draw = (size) => {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const u = size / 32;
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x * u), Math.round(y * u), Math.ceil(w * u), Math.ceil(h * u)); };
  // sfondo: cielo di miniera e terreno a blocchi
  const grd = g.createLinearGradient(0, 0, 0, size);
  grd.addColorStop(0, '#3a2a1c'); grd.addColorStop(1, '#120c08');
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  for (let x = 0; x < 32; x += 4) { px(x, 26, 4, 6, x % 8 ? '#8a5a35' : '#7a4f2e'); px(x, 26, 4, 1, '#5fb043'); }
  // bagliore lampada
  g.fillStyle = 'rgba(255,230,150,0.18)'; g.beginPath(); g.arc(16 * u, 9 * u, 9 * u, 0, Math.PI * 2); g.fill();
  // elmetto
  px(8, 5, 16, 5, '#f4c430'); px(6, 9, 20, 2, '#e0a91c'); px(14, 5, 4, 3, '#fff3b0');
  // volto
  px(9, 11, 14, 10, '#f0bf96');
  px(11, 14, 3, 3, '#1d1a22'); px(18, 14, 3, 3, '#1d1a22'); px(12, 14, 1, 1, '#ffffff'); px(19, 14, 1, 1, '#ffffff');
  px(13, 18, 6, 1, '#a8604a');
  px(8, 21, 16, 2, '#f2e04a');
  // spalle
  px(7, 23, 18, 3, '#d9482b');
  // piccone
  px(23, 8, 2, 16, '#8a5a2b'); px(19, 6, 10, 2, '#9aa3ad'); px(18, 7, 2, 2, '#cfd6de'); px(28, 7, 2, 2, '#cfd6de');
  return c.toDataURL('image/png');
};

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
  const url = await page.evaluate(draw, size);
  writeFileSync(new URL(`../icons/${name}`, import.meta.url), Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();
console.log('icone generate');
