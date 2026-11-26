// Resa dei blocchi: InstancedMesh per chunk da 32 colonne, aggiornati solo quando cambiano.
import * as THREE from 'three';
import { CHUNK } from '../world/grid.js';
import { T, TILE_INFO } from '../world/tiles.js';
import { TILE_FACES, atlasCell, ATLAS_COLS, ATLAS_ROWS, A, tileTexture } from './textures.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const tmpM = new THREE.Matrix4();
const tmpC = new THREE.Color();

/** Materiale Lambert che legge dall'atlante la faccia giusta (sopra/lato) per istanza. */
export function makeAtlasMaterial(atlas, opts = {}) {
  const mat = new THREE.MeshLambertMaterial({ map: atlas, ...opts });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAtlasScale = { value: new THREE.Vector2(1 / ATLAS_COLS, 1 / ATLAS_ROWS) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aFaces;\nuniform vec2 uAtlasScale;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
#ifdef USE_MAP
  vec2 cell = (normal.y > 0.5) ? aFaces.zw : aFaces.xy;
  vMapUv = (uv * 0.996 + 0.002 + cell) * uAtlasScale;
#endif`);
  };
  mat.customProgramCacheKey = () => 'atlas-v1';
  return mat;
}

/** Crea una InstancedMesh da una lista di cubi {x,y,z,sx,sy,sz,side,top,color}. */
export function cubesMesh(cubes, material) {
  const mesh = new THREE.InstancedMesh(BOX, material, Math.max(1, cubes.length));
  mesh.count = cubes.length;
  const faces = new Float32Array(Math.max(1, cubes.length) * 4);
  cubes.forEach((c, i) => {
    tmpM.makeScale(c.sx ?? 1, c.sy ?? 1, c.sz ?? 1);
    tmpM.setPosition(c.x, c.y, c.z ?? 0);
    mesh.setMatrixAt(i, tmpM);
    const [sx, sy] = atlasCell(c.side), [tx, ty] = atlasCell(c.top ?? c.side);
    faces.set([sx, sy, tx, ty], i * 4);
    mesh.setColorAt(i, tmpC.set(c.color ?? '#ffffff'));
  });
  mesh.geometry = BOX.clone();
  mesh.geometry.setAttribute('aFaces', new THREE.InstancedBufferAttribute(faces, 4));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

function spikeGeometry() {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.ConeGeometry(0.14, 0.5, 4, 1);
    g.rotateY(Math.PI / 4);
    g.translate(-0.32 + i * 0.32, -0.25, 0);
    parts.push(g.toNonIndexed());
  }
  const base = new THREE.BoxGeometry(0.96, 0.08, 0.8).toNonIndexed();
  base.translate(0, -0.46, 0);
  parts.push(base);
  return mergeNonIndexed(parts);
}

export function mergeNonIndexed(geos) {
  const total = geos.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

export class BlockLayer {
  constructor(scene, atlas) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.material = makeAtlasMaterial(atlas);
    this.lavaTex = tileTexture(A.LAVA, 1, 1);
    this.lavaMat = new THREE.MeshBasicMaterial({ map: this.lavaTex, color: '#ffffff' });
    this.spikeMat = new THREE.MeshLambertMaterial({ color: '#c9ced8', emissive: '#2a2d34' });
    this.spikeGeo = spikeGeometry();
    this.crackMat = new THREE.MeshBasicMaterial({ map: tileTexture(A.CRACK2), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.crackMesh = new THREE.InstancedMesh(BOX, this.crackMat, 48);
    this.crackMesh.count = 0;
    this.crackMesh.frustumCulled = false;
    this.group.add(this.crackMesh);
    this.chunks = [];
    this.retract = null;
  }

  clear() {
    for (const c of this.chunks) for (const m of Object.values(c)) if (m && m.isObject3D) { this.group.remove(m); m.geometry.dispose(); }
    if (this.retract) { this.group.remove(this.retract); this.retract = null; }
    if (this.backMesh) { this.group.remove(this.backMesh); this.backMesh.geometry.dispose(); this.backMesh = null; }
    this.chunks = [];
  }

  load(level, theme) {
    this.clear();
    this.level = level;
    this.theme = theme;
    this.tint = new THREE.Color(theme.tint);
    const n = Math.ceil(level.grid.w / CHUNK);
    for (let i = 0; i < n; i++) { this.chunks.push({}); this.buildChunk(i); }
    this.buildBack();
    this.buildRetract();
    level.grid.dirtyChunks.clear();
  }

  /** Fila di blocchi dietro al piano di gioco (profondità), solo estetica. */
  buildBack() {
    const { grid, recipe } = this.level;
    const cubes = [];
    const col = this.theme.backTint;
    for (let x = 0; x < grid.w; x++) {
      const g = this.level.colGround ? this.level.colGround[x] : -1;
      for (let y = 1; y < grid.h; y++) {
        const id = grid.get(x, y);
        const info = TILE_INFO[id];
        if (!info.solid || id === T.BONUS || id === T.CRATE) continue;
        const exposedAbove = !grid.isSolid(x, y + 1);
        const nearSurface = g < 0 ? true : y >= g - 4;
        if (!nearSurface && !recipe.indoor) continue;
        if (recipe.indoor && g >= 0 && y < g - 4) continue;
        const [side, top] = TILE_FACES[id] || [A.STONE, A.STONE];
        cubes.push({ x: x + 0.5, y: y + 0.5, z: -1, side, top: exposedAbove ? top : side, color: col });
      }
    }
    // pareti scure in fondo alle buche (abisso), per non mostrare il cielo
    const deep = new THREE.Color(col).multiplyScalar(0.35);
    const deepCol = '#' + deep.getHexString();
    const cg = this.level.colGround;
    const nearestGround = (x, d) => { for (let k = x + d; k >= 0 && k < grid.w; k += d) if (cg[k] >= 0 && grid.isSolid(k, 0)) return cg[k]; return 0; };
    for (let x = 0; x < grid.w; x++) {
      for (let y = -3; y < 0; y++) cubes.push({ x: x + 0.5, y: y + 0.5, z: 0, side: A.DARKSTONE, color: deepCol });
      if (!cg || grid.isSolid(x, 0)) continue;
      const ref = Math.min(nearestGround(x, -1), nearestGround(x, 1));
      for (let y = 0; y < ref - 1; y++) {
        if (grid.get(x, y) === T.LAVA) continue;
        cubes.push({ x: x + 0.5, y: y + 0.5, z: -1, side: A.DARKSTONE, color: deepCol });
      }
    }
    // riempimento oltre i bordi del livello, per non mostrare il vuoto
    const tint = '#' + this.tint.getHexString();
    for (const [from, to, src] of [[-16, 0, 0], [grid.w, grid.w + 16, grid.w - 1]]) {
      for (let x = from; x < to; x++) for (let y = 0; y < grid.h; y++) {
        const id = grid.get(src, y);
        if (!TILE_INFO[id].solid || id === T.BONUS) continue;
        const [side, top] = TILE_FACES[id] || [A.STONE, A.STONE];
        const exposed = !grid.isSolid(src, y + 1);
        cubes.push({ x: x + 0.5, y: y + 0.5, z: 0, side, top: exposed ? top : side, color: tint });
        cubes.push({ x: x + 0.5, y: y + 0.5, z: -1, side, top: exposed ? top : side, color: col });
      }
    }
    this.backMesh = cubesMesh(cubes, this.material);
    this.group.add(this.backMesh);
  }

  buildChunk(i) {
    const grid = this.level.grid;
    const c = this.chunks[i];
    for (const k of ['solid', 'lava', 'spikes']) if (c[k]) { this.group.remove(c[k]); c[k].geometry.dispose(); c[k] = null; }
    const x0 = i * CHUNK, x1 = Math.min(grid.w, x0 + CHUNK);
    const solids = [], lava = [], spikes = [];
    const tint = '#' + this.tint.getHexString();
    for (let x = x0; x < x1; x++) for (let y = 0; y < grid.h; y++) {
      const id = grid.get(x, y);
      if (id === T.AIR || id === T.EXIT || id === T.SPIKES_RETRACT) continue;
      if (id === T.LAVA) { lava.push([x, y, grid.get(x, y + 1) !== T.LAVA]); continue; }
      if (id === T.SPIKES) { spikes.push([x, y]); continue; }
      // salta i blocchi completamente nascosti (sotto terra, circondati)
      const surrounded = grid.isSolid(x, y + 1) && grid.isSolid(x, y - 1) && grid.isSolid(x - 1, y) && grid.isSolid(x + 1, y);
      if (surrounded && y < (this.level.colGround?.[x] ?? 0) - 6) continue;
      const [side, topFace] = TILE_FACES[id] || [A.STONE, A.STONE];
      const top = grid.isSolid(x, y + 1) ? side : topFace;
      solids.push({ x: x + 0.5, y: y + 0.5, side, top, color: tint });
    }
    c.solid = cubesMesh(solids, this.material);
    this.group.add(c.solid);
    if (lava.length) {
      c.lava = new THREE.InstancedMesh(BOX, this.lavaMat, lava.length);
      lava.forEach(([x, y, surface], k) => {
        const h = surface ? 0.82 : 1;
        tmpM.makeScale(1, h, 1); tmpM.setPosition(x + 0.5, y + h / 2, 0);
        c.lava.setMatrixAt(k, tmpM);
      });
      c.lava.frustumCulled = false;
      this.group.add(c.lava);
    }
    if (spikes.length) {
      c.spikes = new THREE.InstancedMesh(this.spikeGeo, this.spikeMat, spikes.length);
      spikes.forEach(([x, y], k) => { tmpM.makeTranslation(x + 0.5, y + 0.5, 0); c.spikes.setMatrixAt(k, tmpM); });
      c.spikes.frustumCulled = false;
      this.group.add(c.spikes);
    }
  }

  buildRetract() {
    const rs = this.level.retractSpikes;
    if (!rs.length) return;
    this.retract = new THREE.InstancedMesh(this.spikeGeo, new THREE.MeshLambertMaterial({ color: '#d8a0a0', emissive: '#3a1414' }), rs.length);
    this.retract.frustumCulled = false;
    this.retractH = rs.map(() => 1);
    this.group.add(this.retract);
  }

  /** Ricostruisce i chunk modificati e aggiorna crepe, lava e spuntoni retrattili. */
  sync(dt, time) {
    const grid = this.level.grid;
    for (const i of grid.dirtyChunks) if (this.chunks[i]) this.buildChunk(i);
    grid.dirtyChunks.clear();
    // crepe sui blocchi danneggiati
    let n = 0;
    for (const k of grid.damage.keys()) {
      if (n >= 48) break;
      const x = k % grid.w, y = Math.floor(k / grid.w);
      tmpM.makeScale(1.02, 1.02, 1.02); tmpM.setPosition(x + 0.5, y + 0.5, 0);
      this.crackMesh.setMatrixAt(n++, tmpM);
    }
    this.crackMesh.count = n;
    this.crackMesh.instanceMatrix.needsUpdate = true;
    // lava animata
    this.lavaTex.offset.set(Math.sin(time * 0.6) * 0.1, time * 0.12);
    // spuntoni retrattili
    if (this.retract) {
      this.level.retractSpikes.forEach((r, k) => {
        const target = r.up ? 1 : 0.08;
        this.retractH[k] += (target - this.retractH[k]) * Math.min(1, dt * 14);
        const h = this.retractH[k];
        tmpM.makeScale(1, h, 1); tmpM.setPosition(r.x + 0.5, r.y + h * 0.5, 0);
        this.retract.setMatrixAt(k, tmpM);
      });
      this.retract.instanceMatrix.needsUpdate = true;
    }
  }

  setVisibleRange(x0, x1) {
    this.chunks.forEach((c, i) => {
      const vis = (i + 1) * CHUNK >= x0 && i * CHUNK <= x1;
      for (const k of ['solid', 'lava', 'spikes']) if (c[k]) c[k].visible = vis;
    });
  }
}
