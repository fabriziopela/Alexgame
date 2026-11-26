// Service worker: funzionamento offline (cache-first).
// A ogni rilascio aggiornare GAME_VERSION in src/config.js e qui sotto (un test verifica che coincidano):
// il cambio di questo file fa scaricare la nuova versione ai tester.
const CACHE = 'alex-the-miner-0.9.0-beta';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './vendor/three.module.min.js',
  './src/config.js',
  './src/core/audio.js',
  './src/core/input.js',
  './src/core/rng.js',
  './src/core/save.js',
  './src/game/boomerang.js',
  './src/game/bot.js',
  './src/game/enemies.js',
  './src/game/physics.js',
  './src/game/pickups.js',
  './src/game/player.js',
  './src/game/session.js',
  './src/main.js',
  './src/render/blocks.js',
  './src/render/models.js',
  './src/render/particles.js',
  './src/render/scene.js',
  './src/render/textures.js',
  './src/render/themes.js',
  './src/ui/hud.js',
  './src/ui/screens.js',
  './src/ui/touch-controls.js',
  './src/world/generator.js',
  './src/world/grid.js',
  './src/world/levels.js',
  './src/world/segments.js',
  './src/world/tiles.js',
  './src/world/validator.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' evita che la cache HTTP del server (es. GitHub Pages) fornisca file vecchi
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match('./index.html'))),
  );
});
