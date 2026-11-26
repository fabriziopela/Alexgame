// Personaggi e oggetti voxel costruiti a cubi, con animazioni procedurali.
import * as THREE from 'three';

const BOX = new THREE.BoxGeometry(1, 1, 1);
BOX.userData.shared = true;

class Kit {
  constructor() { this.mats = new Map(); this.list = []; }
  mat(color, emissive) {
    const k = color + (emissive || '');
    if (!this.mats.has(k)) {
      const m = new THREE.MeshLambertMaterial({ color, emissive: emissive || '#000000' });
      m.userData.baseEmissive = new THREE.Color(emissive || '#000000');
      this.mats.set(k, m); this.list.push(m);
    }
    return this.mats.get(k);
  }
  box(parent, w, h, d, x, y, z, color, emissive) {
    const m = new THREE.Mesh(BOX, this.mat(color, emissive));
    m.scale.set(w, h, d); m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  /** Lampeggio (bianco/rosso) su tutti i materiali del modello. */
  flash(color, amount) {
    for (const m of this.list) {
      if (amount > 0) m.emissive.copy(m.userData.baseEmissive).lerp(color, amount);
      else m.emissive.copy(m.userData.baseEmissive);
    }
  }
}

function limb(kit, parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g;
}

function pickaxe(kit, parent) {
  const g = new THREE.Group();
  kit.box(g, 0.07, 0.78, 0.07, 0, 0.32, 0, '#8a5a2b');
  kit.box(g, 0.56, 0.1, 0.1, 0, 0.7, 0, '#9aa3ad');
  kit.box(g, 0.12, 0.12, 0.12, 0.3, 0.66, 0, '#cfd6de');
  kit.box(g, 0.12, 0.12, 0.12, -0.3, 0.66, 0, '#cfd6de');
  kit.box(g, 0.12, 0.08, 0.12, 0, 0.7, 0, '#6d747c');
  parent.add(g);
  return g;
}

function humanoid(kit, c) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const legL = limb(kit, body, -0.12, c.hip, 0), legR = limb(kit, body, 0.12, c.hip, 0);
  for (const leg of [legL, legR]) {
    kit.box(leg, 0.22, c.hip - 0.14, 0.26, 0, -(c.hip - 0.14) / 2, 0, c.pants);
    kit.box(leg, 0.24, 0.16, 0.3, 0, -c.hip + 0.08, 0.02, c.boots);
  }
  const torsoH = c.shoulder - c.hip + 0.05;
  kit.box(body, 0.5, torsoH, 0.3, 0, c.hip + torsoH / 2, 0, c.shirt);
  const head = new THREE.Group(); head.position.set(0, c.shoulder + 0.02, 0); body.add(head);
  kit.box(head, 0.44, 0.44, 0.42, 0, 0.22, 0, c.skin);
  const armL = limb(kit, body, -0.34, c.shoulder - 0.04, 0), armR = limb(kit, body, 0.34, c.shoulder - 0.04, 0);
  for (const arm of [armL, armR]) {
    kit.box(arm, 0.17, 0.42, 0.2, 0, -0.2, 0, c.sleeve);
    kit.box(arm, 0.15, 0.14, 0.18, 0, -0.47, 0, c.hand);
  }
  return { root, body, head, legL, legR, armL, armR, torsoH };
}

function setFacing(root, facing, dt, k = 14) {
  const target = facing > 0 ? Math.PI / 2 - 0.42 : -Math.PI / 2 + 0.42;
  root.rotation.y += (target - root.rotation.y) * Math.min(1, dt * k);
}

const RED = new THREE.Color('#ff2a2a'), WHITE = new THREE.Color('#ffffff'), GOLD = new THREE.Color('#ffd84a');

export function makeMiner() {
  const kit = new Kit();
  const c = { hip: 0.62, shoulder: 1.16, pants: '#2f4f8f', boots: '#3a2718', shirt: '#d9482b', sleeve: '#d9482b', hand: '#f0bf96', skin: '#f0bf96' };
  const r = humanoid(kit, c);
  // salopette e dettagli
  kit.box(r.body, 0.36, 0.3, 0.04, 0, 0.82, 0.16, '#2f4f8f');
  kit.box(r.body, 0.06, 0.32, 0.04, -0.15, 1.02, 0.16, '#2f4f8f');
  kit.box(r.body, 0.06, 0.32, 0.04, 0.15, 1.02, 0.16, '#2f4f8f');
  kit.box(r.body, 0.52, 0.08, 0.32, 0, 0.66, 0, '#5a3a1e'); // cintura
  // volto
  kit.box(r.head, 0.08, 0.08, 0.02, -0.1, 0.24, 0.215, '#1d1a22');
  kit.box(r.head, 0.08, 0.08, 0.02, 0.1, 0.24, 0.215, '#1d1a22');
  kit.box(r.head, 0.18, 0.05, 0.02, 0, 0.1, 0.215, '#a8604a');
  kit.box(r.head, 0.46, 0.14, 0.12, 0, 0.36, -0.18, '#6b3f22'); // capelli dietro
  // elmetto con lampada
  kit.box(r.head, 0.52, 0.16, 0.5, 0, 0.5, 0, '#f4c430');
  kit.box(r.head, 0.58, 0.04, 0.6, 0, 0.42, 0.02, '#e0a91c');
  kit.box(r.head, 0.14, 0.12, 0.06, 0, 0.5, 0.27, '#fff3b0', '#fff0a0');
  // fazzoletto
  kit.box(r.body, 0.4, 0.08, 0.32, 0, 1.16, 0.01, '#f2e04a');
  const pick = pickaxe(kit, r.armL);
  pick.position.set(0, -0.5, 0.05);
  pick.rotation.x = Math.PI / 2;
  let t = 0;
  return {
    group: r.root, kit, pick,
    animate(p, dt) {
      t += dt;
      setFacing(r.root, p.facing, dt);
      const b = p.body;
      const speed = Math.abs(b.vx);
      let legA = 0, armA = 0, bob = 0;
      if (p.state === 'run') { legA = Math.sin(t * 15) * 0.75; armA = -legA * 0.8; bob = Math.abs(Math.sin(t * 15)) * 0.05; }
      else if (p.state === 'idle') { bob = Math.sin(t * 2.5) * 0.015; }
      r.legL.rotation.x = legA; r.legR.rotation.x = -legA;
      if (p.state === 'jump' || p.state === 'fall') { r.legL.rotation.x = -0.5; r.legR.rotation.x = 0.35; }
      r.armR.rotation.x = armA;
      // braccio col piccone
      if (p.swing > 0) {
        const k = 1 - p.swing / 0.3;
        const e = k < 0.35 ? k / 0.35 : 1;
        r.armL.rotation.x = -2.8 + e * 2.6 + (k > 0.6 ? (k - 0.6) * 0.5 : 0);
      } else if (p.throwAnim > 0) {
        r.armL.rotation.x = -1.6;
      } else {
        r.armL.rotation.x = -armA * 0.6 - 0.25;
      }
      pick.visible = !(p.boomerang > 0 && p.throwAnim <= 0 && p._boomerangOut);
      r.body.position.y = bob;
      r.body.rotation.z = p.state === 'hurt' ? 0.25 : 0;
      r.body.rotation.x = Math.min(0.15, speed * 0.02);
      // lampeggi
      const blink = p.invuln > 0 && Math.floor(t * 18) % 2 === 0;
      r.root.visible = !blink || p.state === 'hurt';
      if (p.star > 0) kit.flash(GOLD, 0.45 + Math.sin(t * 20) * 0.25);
      else if (p.state === 'hurt') kit.flash(RED, 0.7);
      else kit.flash(null, 0);
    },
  };
}

function undead(kind) {
  const kit = new Kit();
  const isMummy = kind === 'mummy';
  const c = isMummy
    ? { hip: 0.66, shoulder: 1.24, pants: '#cfc3a0', boots: '#a99d7c', shirt: '#ddd2b0', sleeve: '#ddd2b0', hand: '#c9bc98', skin: '#d8cca8' }
    : { hip: 0.66, shoulder: 1.24, pants: '#4a3f6b', boots: '#2c2633', shirt: '#3e7f8a', sleeve: '#3e7f8a', hand: '#6fae6a', skin: '#6fae6a' };
  const r = humanoid(kit, c);
  const eyeCol = isMummy ? '#ffcc33' : '#b01818';
  const eyeL = kit.box(r.head, 0.09, 0.07, 0.02, -0.1, 0.25, 0.215, eyeCol, isMummy ? '#aa7700' : '#400000');
  kit.box(r.head, 0.09, 0.07, 0.02, 0.1, 0.25, 0.215, eyeCol, isMummy ? '#aa7700' : '#400000');
  if (isMummy) {
    for (let i = 0; i < 4; i++) kit.box(r.body, 0.52, 0.04, 0.32, 0, 0.75 + i * 0.13, 0, '#b8ab88');
    for (let i = 0; i < 3; i++) kit.box(r.head, 0.46, 0.035, 0.44, 0, 0.08 + i * 0.13, 0, '#b8ab88');
    kit.box(r.armR, 0.06, 0.3, 0.06, 0.05, -0.7, 0.05, '#cfc3a0'); // benda penzolante
  } else {
    kit.box(r.head, 0.2, 0.06, 0.02, 0, 0.1, 0.215, '#2b4a2a');
    kit.box(r.body, 0.2, 0.16, 0.04, 0.12, 0.85, 0.16, '#6fae6a'); // strappo
    kit.box(r.head, 0.46, 0.1, 0.44, 0, 0.42, -0.02, '#2f3b25');
  }
  const eyeMat = eyeL.material;
  let t = Math.random() * 10;
  return {
    group: r.root, kit,
    animate(e, dt) {
      t += dt;
      setFacing(r.root, e.dir, dt, 8);
      const moving = Math.abs(e.body.vx) > 0.2;
      const rate = e.state === 'charge' ? 18 : isMummy ? 6 : 8;
      const legA = moving ? Math.sin(t * rate) * 0.55 : 0;
      r.legL.rotation.x = legA; r.legR.rotation.x = -legA;
      const reach = -1.45 + Math.sin(t * 3) * 0.08;
      r.armL.rotation.x = reach + (moving ? Math.sin(t * rate) * 0.1 : 0);
      r.armR.rotation.x = reach - (moving ? Math.sin(t * rate) * 0.1 : 0);
      r.body.rotation.z = Math.sin(t * 2) * 0.05;
      r.body.rotation.x = e.state === 'windup' ? -0.25 : e.state === 'charge' ? 0.3 : 0.08;
      if (isMummy) {
        const glow = e.state === 'windup' ? 1 : e.state === 'charge' ? 0.8 : 0.25;
        eyeMat.emissive.setRGB(glow, glow * 0.6, 0);
        eyeMat.userData.baseEmissive.copy(eyeMat.emissive);
      }
      if (e.flash > 0) kit.flash(WHITE, 0.8);
      else kit.flash(null, 0);
    },
  };
}

export const makeZombie = () => undead('zombie');
export const makeMummy = () => undead('mummy');

/** Piccone lanciato (rotante). */
export function makeThrownPickaxe() {
  const kit = new Kit();
  const g = new THREE.Group();
  const p = pickaxe(kit, g);
  p.position.y = -0.45;
  return { group: g, kit };
}

const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
const STAR = ['...X...', '..XXX..', 'XXXXXXX', '.XXXXX.', '.XX.XX.', 'X.....X'];

function pixelShape(kit, rows, color, edge, size = 0.09) {
  const g = new THREE.Group();
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === 'X') kit.box(g, size, size, size * 1.6, (x - (row.length - 1) / 2) * size, ((rows.length - 1) / 2 - y) * size, 0, color, edge);
  }));
  return g;
}

export function makePickup(kind) {
  const kit = new Kit();
  const g = new THREE.Group();
  let inner;
  if (kind === 'heart') inner = pixelShape(kit, HEART, '#ff3b4f', '#5a0010');
  else if (kind === 'star') inner = pixelShape(kit, STAR, '#ffd84a', '#7a5a00');
  else { inner = new THREE.Group(); const p = pickaxe(kit, inner); p.position.y = -0.4; p.scale.setScalar(0.75); for (const m of kit.list) m.emissive.set('#164a66'); inner.rotation.z = 0.6; }
  g.add(inner);
  let t = Math.random() * 6;
  return {
    group: g, kit,
    animate(pk, dt) {
      t += dt;
      inner.position.y = 0.35 + Math.sin(t * 4) * 0.08;
      inner.rotation.y = t * 2.4;
      g.visible = !pk.blinking || Math.floor(t * 10) % 2 === 0;
    },
  };
}
