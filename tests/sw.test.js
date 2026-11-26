import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const walk = (dir) => readdirSync(join(root, dir)).flatMap((f) => {
  const p = `${dir}/${f}`;
  return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
});

test('service worker caches every runtime file', () => {
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  const runtime = ['index.html', 'manifest.webmanifest', ...walk('src'), ...walk('css'), ...walk('vendor').filter((f) => f.endsWith('.js')), ...walk('icons')];
  for (const f of runtime) assert.ok(sw.includes(`'./${f}'`), `missing in sw.js: ${f}`);
});

test('manifest is landscape fullscreen with icons that exist', () => {
  const m = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.name, 'Alex the Miner');
  assert.equal(m.orientation, 'landscape');
  assert.equal(m.display, 'fullscreen');
  for (const i of m.icons) assert.ok(existsSync(join(root, i.src)), i.src);
});

test('service worker cache name follows GAME_VERSION', async () => {
  const { GAME_VERSION } = await import('../src/config.js');
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  const m = sw.match(/const CACHE = '([^']+)'/);
  assert.ok(m, 'CACHE constant not found');
  assert.ok(m[1].endsWith(GAME_VERSION), `CACHE ${m[1]} does not match GAME_VERSION ${GAME_VERSION}`);
});

test('service worker install bypasses the HTTP cache', () => {
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  assert.match(sw, /cache: 'reload'/);
});
