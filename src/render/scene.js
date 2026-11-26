// Renderer principale: scena, luci, sfondo, decorazioni, camera e sincronizzazione con la sessione.
import * as THREE from 'three';
import { THEMES } from './themes.js';
import { buildAtlas, tileTexture, gradientTexture, silhouetteTexture, A } from './textures.js';
import { BlockLayer, makeAtlasMaterial, cubesMesh } from './blocks.js';
import { makeMiner, makeZombie, makeMummy, makeThrownPickaxe, makePickup } from './models.js';
import { Particles } from './particles.js';
import { createRng } from '../core/rng.js';
import { T } from '../world/tiles.js';

/** Libera geometrie, materiali e texture di un sottoalbero, saltando le risorse condivise. */
export function disposeTree(root) {
  root.traverse((n) => {
    if (n.isInstancedMesh) n.dispose();
    if (n.geometry && !n.isSprite && !n.geometry.userData.shared) n.geometry.dispose();
    if (n.material) {
      for (const m of [].concat(n.material)) {
        if (m.userData.shared) continue;
        if (m.map && !m.map.userData.shared) m.map.dispose();
        m.dispose();
      }
    }
  });
}

const TILE_COLORS = {
  [T.GRASS]: ['#5fb043', '#8a5a35'], [T.DIRT]: ['#8a5a35', '#6e4528'], [T.SAND]: ['#e8cf8c', '#cfb26e'],
  [T.SANDSTONE]: ['#d6b06a', '#b38a4c'], [T.STONE]: ['#868c96', '#5d626b'], [T.WOOD]: ['#b07a3e', '#7d5229'],
  [T.LEAVES]: ['#3f8f3a', '#24521f'], [T.CRATE]: ['#c48a45', '#6e4520'], [T.BONUS]: ['#ffd34d', '#ff9f1c', '#fff6c9'],
  [T.BRICK]: ['#c99a5b', '#8a6234'],
};

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.shared = true; return t;
}

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.userData.shared = true;
  return t;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.maxDpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = this.maxDpr;
    this.gl.setPixelRatio(this.dpr);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.5, 140);
    this.atlas = buildAtlas();
    this.atlas.userData.shared = true;
    this.atlasMat = makeAtlasMaterial(this.atlas);
    this.atlasMat.userData.shared = true;
    this.blocks = new BlockLayer(this.scene, this.atlas);
    this.particles = new Particles(this.scene);
    this.glowTex = glowTexture();
    this.shadowTex = shadowTexture();
    this.hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1);
    this.sun = new THREE.DirectionalLight('#ffffff', 1.4);
    this.sun.position.set(-6, 14, 10);
    this.lamp = new THREE.PointLight('#ffe7b0', 0, 11, 1.6);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.lamp);
    this.levelGroup = new THREE.Group();
    this.scene.add(this.levelGroup);
    this.time = 0;
    this.shake = 0;
    this.flashRed = 0;
    this.frameTimes = [];
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.gl.setSize(w, h, false);
    this.camera.aspect = w / h;
    // in verticale allarga il campo per non tagliare l'azione
    this.camera.fov = w / h < 1.3 ? 50 : 35;
    this.camera.updateProjectionMatrix();
  }

  clearLevel() {
    for (const o of [...this.levelGroup.children]) {
      this.levelGroup.remove(o);
      disposeTree(o);
    }
    if (this.scene.background && this.scene.background.isTexture) { this.scene.background.dispose(); this.scene.background = null; }
    this.particles.clear();
  }

  start(session) {
    this.clearLevel();
    this.session = session;
    const level = session.level;
    const theme = THEMES[level.recipe.theme];
    this.theme = theme;
    // cielo, nebbia, luci
    this.scene.background = gradientTexture(theme.sky.map(([o, c]) => [1 - o, c]).reverse());
    this.scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
    this.hemi.color.set(theme.hemi[0]); this.hemi.groundColor.set(theme.hemi[1]); this.hemi.intensity = theme.hemi[2];
    this.sun.color.set(theme.sun[0]); this.sun.intensity = theme.sun[1];
    this.lamp.intensity = theme.playerLight || 0;
    this.blocks.load(level, theme);
    this.buildBackground(level, theme);
    this.buildDecorations(level, theme);
    this.buildExit(level);
    // personaggi
    this.miner = makeMiner();
    this.levelGroup.add(this.miner.group);
    this.minerShadow = this.makeShadow(0.9);
    this.enemyViews = session.enemies.map((e) => {
      const v = e.type === 'mummy' ? makeMummy() : makeZombie();
      v.group.visible = false;
      this.levelGroup.add(v.group);
      v.shadow = this.makeShadow(0.9);
      return v;
    });
    this.pickupViews = new Map();
    this.thrown = makeThrownPickaxe();
    this.thrown.group.visible = false;
    this.levelGroup.add(this.thrown.group);
    this.bonusGlows = [];
    this.refreshBonusGlows();
    this.camX = session.player.body.x + 3;
    this.camY = session.player.body.y + 2.4;
    this.lookAhead = 2.5;
  }

  makeShadow(size) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.5), new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    this.levelGroup.add(m);
    return m;
  }

  placeShadow(shadow, body) {
    const g = this.session.grid;
    let y = Math.floor(body.y + 0.01);
    const x = Math.floor(body.x);
    let found = false;
    for (let k = 0; k < 8; k++, y--) if (g.isSolid(x, y - 1)) { found = true; break; }
    shadow.visible = found;
    if (!found) return;
    shadow.position.set(body.x, y + 0.02, 0);
    const d = body.y - y;
    const s = Math.max(0.3, 1 - d * 0.18);
    shadow.scale.set(s, s, s);
  }

  buildBackground(level, theme) {
    this.bgLayers = [];
    const w = level.grid.w;
    if (theme.layers) {
      for (const [i, L] of theme.layers.entries()) {
        const tex = silhouetteTexture({ color: L.color, top: L.top, kind: L.kind, seed: level.recipe.seed + i * 13 });
        const width = 220, height = 55;
        tex.repeat.set(3, 1);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: true, depthWrite: false }));
        m.position.set(0, height / 2 - 6 - i * 2, L.z);
        m.userData.f = L.f;
        m.renderOrder = -10 + i;
        this.levelGroup.add(m);
        this.bgLayers.push(m);
      }
    }
    if (theme.sunDisc) {
      const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: theme.sunDisc, fog: false, depthWrite: false }));
      sun.scale.set(16, 16, 1);
      sun.position.set(0, 26, -80);
      sun.userData.f = 0.96;
      this.levelGroup.add(sun);
      this.bgLayers.push(sun);
    }
    if (theme.stars) {
      const pts = [];
      const rng = createRng(77);
      for (let i = 0; i < 260; i++) pts.push((rng.next() - 0.5) * 240, 6 + rng.next() * 50, -85);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.35, fog: false }));
      stars.userData.f = 0.97;
      this.levelGroup.add(stars);
      this.bgLayers.push(stars);
    }
    if (theme.wall) {
      const idx = theme.wall === 'tomb' ? A.TOMB_WALL : theme.wall === 'ore' ? A.ORE_WALL : A.MINE_WALL;
      const tex = tileTexture(idx, w, level.grid.h, level.recipe.seed);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, level.grid.h), new THREE.MeshLambertMaterial({ map: tex, color: theme.backTint }));
      m.position.set(w / 2, level.grid.h / 2, -2.2);
      this.levelGroup.add(m);
      if (theme.wall === 'ore' || theme.wall === 'mine') {
        // secondo strato con minerali sparsi
        const tex2 = tileTexture(A.ORE_WALL, 1, 1, 5);
        const rng = createRng(level.recipe.seed + 5);
        const cubes = [];
        for (let x = 2; x < w; x += rng.int(4, 9)) cubes.push({ x: x + 0.5, y: rng.int(3, 14) + 0.5, z: -2.1, sz: 0.2, side: A.ORE_WALL, color: '#ffffff' });
        const ore = cubesMesh(cubes, this.atlasMat);
        this.levelGroup.add(ore);
        tex2.dispose();
      }
    }
  }

  buildDecorations(level, theme) {
    const rng = createRng(level.recipe.seed * 7 + 3);
    const cubes = [];
    const g = level.colGround;
    const w = level.grid.w;
    const groundAt = (x) => (g && g[x] > 0 ? g[x] : -1);
    this.lanterns = [];
    if (theme.deco === 'trees') {
      for (let x = 3; x < w - 3; x += rng.int(4, 9)) {
        const base = Math.max(groundAt(x - 1), groundAt(x), groundAt(x + 1));
        if (base < 0) continue;
        const z = rng.chance(0.5) ? -2 : -3.2;
        const hgt = rng.int(3, 5);
        for (let y = 0; y < hgt; y++) cubes.push({ x: x + 0.5, y: base + y + 0.5, z, side: A.WOOD_SIDE, top: A.WOOD_TOP, color: theme.tint });
        const top = base + hgt;
        for (let dx = -2; dx <= 2; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
          if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 3 || (Math.abs(dx) === 2 && dy === 1)) continue;
          cubes.push({ x: x + dx + 0.5, y: top + dy + 0.5, z: z + dz * 0.8, sz: 0.8, side: A.LEAVES, color: theme.tint });
        }
        cubes.push({ x: x + 0.5, y: top + 2 - 0.5 + 0.5, z, side: A.LEAVES, color: theme.tint });
      }
    } else if (theme.deco === 'cacti') {
      for (let x = 4; x < w - 3; x += rng.int(5, 11)) {
        const base = groundAt(x);
        if (base < 0) continue;
        const z = rng.chance(0.5) ? -2 : -3;
        const hgt = rng.int(2, 4);
        for (let y = 0; y < hgt; y++) cubes.push({ x: x + 0.5, y: base + y + 0.5, z, sx: 0.7, sz: 0.7, side: A.CACTUS, color: theme.tint });
        if (hgt >= 3) {
          cubes.push({ x: x + 1.2, y: base + 1.5, z, sx: 0.6, sy: 0.45, sz: 0.55, side: A.CACTUS, color: theme.tint });
          cubes.push({ x: x + 1.35, y: base + 2.1, z, sx: 0.4, sy: 0.9, sz: 0.5, side: A.CACTUS, color: theme.tint });
        }
        if (rng.chance(0.4)) cubes.push({ x: x + 3.5, y: base + 0.25, z: z + 0.4, sx: 0.8, sy: 0.5, sz: 0.8, side: A.SANDSTONE_SIDE, top: A.SANDSTONE_TOP, color: theme.tint });
      }
    } else if (theme.deco === 'beams' || theme.deco === 'pillars') {
      const pillars = theme.deco === 'pillars';
      for (let x = 6; x < w - 3; x += rng.int(7, 11)) {
        const base = groundAt(x);
        if (base < 0) continue;
        let ceil = base;
        while (ceil < level.grid.h && !level.grid.isSolid(x, ceil)) ceil++;
        const hgt = ceil - base;
        if (hgt < 3 || hgt > 12) continue;
        const z = -1.35;
        const side = pillars ? A.SANDSTONE_SIDE : A.WOOD_SIDE;
        const top = pillars ? A.SANDSTONE_TOP : A.WOOD_TOP;
        const sx = pillars ? 0.9 : 0.32;
        for (let y = 0; y < hgt; y++) {
          cubes.push({ x: x - 0.8, y: base + y + 0.5, z, sx, sz: sx, side, top, color: theme.tint });
          cubes.push({ x: x + 1.8, y: base + y + 0.5, z, sx, sz: sx, side, top, color: theme.tint });
        }
        if (!pillars) cubes.push({ x: x + 0.5, y: ceil - 0.25, z, sx: 3.2, sy: 0.4, sz: 0.4, side: A.PLANK, color: theme.tint });
        if (rng.chance(0.65)) this.lanterns.push({ x: x + 0.5, y: ceil - (pillars ? 1.2 : 0.9), z: z + 0.25 });
      }
    }
    if (cubes.length) this.levelGroup.add(cubesMesh(cubes, this.atlasMat));
    // lanterne e torce
    const lampMat = new THREE.MeshBasicMaterial({ color: '#ffd27a' });
    const lampGeo = new THREE.BoxGeometry(0.22, 0.3, 0.22);
    for (const L of this.lanterns) {
      const m = new THREE.Mesh(lampGeo, lampMat);
      m.position.set(L.x, L.y, L.z);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: '#ffb84a', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(2.6, 2.6, 1);
      glow.position.set(L.x, L.y, L.z + 0.2);
      L.glow = glow;
      this.levelGroup.add(m, glow);
    }
    // bagliore della lava
    this.lavaGlows = [];
    if (theme.lavaGlow || level.grid.cells.includes(T.LAVA)) {
      for (let x = 0; x < w; x++) {
        if (level.grid.get(x, 0) === T.LAVA) {
          if (this.lavaGlows.length && x - this.lavaGlows.at(-1).x < 3) continue;
          let y = 0; while (level.grid.get(x, y + 1) === T.LAVA) y++;
          const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: '#ff6a1a', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
          glow.scale.set(5, 3.4, 1);
          glow.position.set(x + 1, y + 1.2, 0.8);
          glow.x = x;
          this.levelGroup.add(glow);
          this.lavaGlows.push(Object.assign(glow, { x }));
        }
      }
    }
  }

  buildExit(level) {
    const g = new THREE.Group();
    let y = 0; while (level.grid.get(level.exitX, y) !== T.EXIT && y < level.grid.h) y++;
    const indoor = level.recipe.indoor;
    const frame = new THREE.MeshLambertMaterial({ color: indoor ? '#6b4a2a' : '#8a6a3e' });
    const box = (w, h, d, x, yy, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, yy, z); g.add(b); };
    box(0.3, 3.4, 0.5, -0.9, 1.7, 0, frame);
    box(0.3, 3.4, 0.5, 0.9, 1.7, 0, frame);
    box(2.2, 0.35, 0.6, 0, 3.4, 0, frame);
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.1), new THREE.MeshBasicMaterial({ color: '#7ff0ff', transparent: true, opacity: 0.75 }));
    portal.position.set(0, 1.6, -0.1);
    g.add(portal);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: '#6ff6ff', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(5, 6, 1); glow.position.set(0, 1.7, 0.3);
    g.add(glow);
    // bandierina
    box(0.08, 1.4, 0.08, 1.6, 4.0, 0, frame);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.05), new THREE.MeshLambertMaterial({ color: '#f4c430', emissive: '#4a3a00' }));
    flag.position.set(1.98, 4.45, 0); g.add(flag);
    g.position.set(level.exitX + 0.5, y, 0);
    this.exit = { group: g, portal, glow, flag };
    this.levelGroup.add(g);
  }

  refreshBonusGlows() {
    for (const s of this.bonusGlows) { this.levelGroup.remove(s); disposeTree(s); }
    this.bonusGlows = [];
    for (const key of this.session.level.bonusLoot.keys()) {
      const [x, y] = key.split(',').map(Number);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: '#ffc63a', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.scale.set(2.2, 2.2, 1);
      s.position.set(x + 0.5, y + 0.5, 0.65);
      s.userData.key = key;
      this.levelGroup.add(s);
      this.bonusGlows.push(s);
    }
  }

  /** Reazioni visive agli eventi della sessione. */
  handleEvents(events) {
    const P = this.particles;
    for (const e of events) {
      switch (e.type) {
        case 'break': P.burst(e.x + 0.5, e.y + 0.5, TILE_COLORS[e.id] || ['#888', '#555'], e.bonus ? 22 : 14, { speed: 5, up: 4 }); break;
        case 'chip': P.burst(e.x + 0.5, e.y + 0.5, TILE_COLORS[e.id] || ['#888'], 5, { speed: 3, up: 2, size: 0.1 }); break;
        case 'bonus': P.burst(e.x + 0.5, e.y + 0.8, ['#ffd34d', '#fff6c9', '#ff9f1c'], 18, { speed: 5, up: 6, size: 0.1, gravity: 10 }); break;
        case 'enemyHit': P.burst(e.x, e.y + 1.1, ['#ffffff', '#ffe08a'], 8, { speed: 6, up: 2, size: 0.08, life: 0.35 }); this.shake = Math.max(this.shake, 0.12); break;
        case 'enemyDie': P.burst(e.x, e.y + 0.9, e.enemy === 'mummy' ? ['#ddd2b0', '#b8ab88', '#ffcc33'] : ['#6fae6a', '#3e7f8a', '#4a3f6b'], 26, { speed: 5, up: 5 }); break;
        case 'hurt': this.shake = 0.35; this.flashRed = 0.35; break;
        case 'pickup': P.burst(e.x, e.y + 1, e.kind === 'heart' ? ['#ff3b4f', '#ffffff'] : e.kind === 'star' ? ['#ffd84a', '#ffffff'] : ['#7ff0ff', '#ffffff'], 20, { speed: 4, up: 4, size: 0.09, gravity: 6 }); break;
        case 'respawn': P.burst(e.x, e.y + 0.8, ['#ffffff', '#bfefff'], 16, { speed: 3, up: 3, size: 0.1, gravity: 4 }); break;
        case 'jump': P.burst(e.x, e.y + 0.05, ['#d9d2c0', '#b8b0a0'], 4, { speed: 1.5, up: 0.5, size: 0.08, life: 0.3, gravity: 2 }); break;
        case 'win': P.burst(this.session.player.body.x, this.session.player.body.y + 2, ['#ffd84a', '#7ff0ff', '#ff6fb1', '#ffffff'], 60, { speed: 7, up: 8, size: 0.12, gravity: 9, life: 1.4 }); break;
        default: break;
      }
    }
  }

  render(dt) {
    const s = this.session;
    if (!s) return;
    this.time += dt;
    const p = s.player;
    this.blocks.sync(dt, this.time);
    for (const glow of this.bonusGlows) {
      glow.visible = s.level.bonusLoot.has(glow.userData.key);
      glow.material.opacity = 0.32 + Math.sin(this.time * 4 + glow.position.x) * 0.18;
    }
    // camera: segue il minatore con anticipo nella direzione di marcia
    this.lookAhead += (p.facing * 2.6 - this.lookAhead) * Math.min(1, dt * 2.2);
    const tx = p.body.x + this.lookAhead;
    const groundRef = p.lastSafe.y;
    const ty = Math.max(groundRef, p.body.y - 1.2) + 2.3;
    this.camX += (tx - this.camX) * Math.min(1, dt * 5);
    this.camY += (ty - this.camY) * Math.min(1, dt * (p.body.y < groundRef - 1 ? 6 : 2.6));
    this.camX = Math.max(this.camX, 7);
    this.camX = Math.min(this.camX, s.grid.w - 7);
    let sx = 0, sy = 0;
    if (this.shake > 0) { this.shake -= dt; sx = (Math.random() - 0.5) * this.shake * 0.8; sy = (Math.random() - 0.5) * this.shake * 0.8; }
    this.camera.position.set(this.camX + sx, this.camY + 1.6 + sy, 19.5);
    this.camera.lookAt(this.camX + sx, this.camY - 0.6 + sy, 0);
    s.cameraX = this.camX;
    this.blocks.setVisibleRange(this.camX - 22, this.camX + 22);
    for (const L of this.bgLayers) L.position.x = this.camX * L.userData.f;
    // luci
    this.sun.position.set(this.camX - 6, 16, 10);
    this.sun.target.position.set(this.camX, 0, 0);
    this.lamp.position.set(p.body.x + p.facing * 0.6, p.body.y + 1.7, 1.2);
    for (const L of this.lanterns) L.glow.material.opacity = 0.45 + Math.sin(this.time * 7 + L.x) * 0.06 + Math.random() * 0.04;
    for (const g of this.lavaGlows) g.material.opacity = 0.5 + Math.sin(this.time * 2 + g.x) * 0.12;
    // minatore
    this.miner.group.position.set(p.body.x, p.body.y, 0);
    p._boomerangOut = !!s.boomerang;
    this.miner.animate(p, dt);
    this.placeShadow(this.minerShadow, p.body);
    // nemici
    s.enemies.forEach((e, i) => {
      const v = this.enemyViews[i];
      const near = Math.abs(e.body.x - this.camX) < 20;
      v.group.visible = e.alive && near;
      v.shadow.visible = v.group.visible;
      if (!v.group.visible) return;
      v.group.position.set(e.body.x, e.body.y, 0);
      v.animate(e, dt);
      this.placeShadow(v.shadow, e.body);
    });
    // power-up
    const seen = new Set();
    for (const pk of s.pickups) {
      seen.add(pk);
      let v = this.pickupViews.get(pk);
      if (!v) {
        v = makePickup(pk.kind);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: pk.kind === 'heart' ? '#ff5a6a' : pk.kind === 'star' ? '#ffe066' : '#7ff0ff', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.scale.set(1.6, 1.6, 1); glow.position.y = 0.35;
        v.group.add(glow);
        this.levelGroup.add(v.group);
        this.pickupViews.set(pk, v);
      }
      v.group.position.set(pk.body.x, pk.body.y, 0.2);
      v.animate(pk, dt);
    }
    for (const [pk, v] of this.pickupViews) if (!seen.has(pk)) { this.levelGroup.remove(v.group); disposeTree(v.group); this.pickupViews.delete(pk); }
    // piccone lanciato
    if (s.boomerang) {
      this.thrown.group.visible = true;
      this.thrown.group.position.set(s.boomerang.x, s.boomerang.y, 0.3);
      this.thrown.group.rotation.z = -s.boomerang.spin * s.boomerang.dir;
    } else this.thrown.group.visible = false;
    // uscita
    this.exit.portal.material.opacity = 0.55 + Math.sin(this.time * 3) * 0.2;
    this.exit.flag.rotation.y = Math.sin(this.time * 4) * 0.3;
    this.particles.update(dt);
    if (this.flashRed > 0) this.flashRed -= dt;
    this.gl.render(this.scene, this.camera);
    this.adaptQuality(dt);
  }

  /** Abbassa la risoluzione se il telefono fatica (media dei frame > 22 ms). */
  adaptQuality(dt) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > 0.022 && this.dpr > 1) { this.dpr = Math.max(1, this.dpr - 0.25); this.gl.setPixelRatio(this.dpr); this.resize(); }
    else if (avg < 0.0145 && this.dpr < this.maxDpr) { this.dpr = Math.min(this.maxDpr, this.dpr + 0.25); this.gl.setPixelRatio(this.dpr); this.resize(); }
  }
}
