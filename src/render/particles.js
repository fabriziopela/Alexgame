// Particelle a cubetti con pool fisso.
import * as THREE from 'three';

const MAX = 320;
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpC = new THREE.Color();

export class Particles {
  constructor(scene) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), MAX);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.setColorAt(0, tmpC.set('#fff'));
    scene.add(this.mesh);
    this.p = [];
  }
  burst(x, y, color, n = 10, { speed = 4, up = 3, size = 0.14, life = 0.7, gravity = 18, z = 0.3 } = {}) {
    for (let i = 0; i < n && this.p.length < MAX; i++) {
      const a = Math.random() * Math.PI * 2;
      this.p.push({
        x: x + (Math.random() - 0.5) * 0.5, y: y + (Math.random() - 0.5) * 0.5, z: z + (Math.random() - 0.5) * 0.6,
        vx: Math.cos(a) * speed * Math.random(), vy: up + Math.sin(a) * speed * Math.random(), vz: (Math.random() - 0.5) * 2,
        life, max: life, size: size * (0.6 + Math.random() * 0.8), color: Array.isArray(color) ? color[i % color.length] : color,
        rx: Math.random() * 6, rs: (Math.random() - 0.5) * 12, g: gravity,
      });
    }
  }
  clear() { this.p.length = 0; this.mesh.count = 0; }
  update(dt) {
    let n = 0;
    for (const p of this.p) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rx += p.rs * dt;
      const s = p.size * Math.min(1, (p.life / p.max) * 2);
      tmpE.set(p.rx, p.rx * 0.7, 0); tmpQ.setFromEuler(tmpE); tmpS.set(s, s, s); tmpP.set(p.x, p.y, p.z);
      tmpM.compose(tmpP, tmpQ, tmpS);
      this.mesh.setMatrixAt(n, tmpM);
      this.mesh.setColorAt(n, tmpC.set(p.color));
      this.p[n++] = p;
    }
    this.p.length = n;
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
