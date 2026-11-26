// Pulsanti a schermo: rettangoli per l'hit-test e feedback visivo.
export class TouchControls {
  constructor() {
    this.layer = document.getElementById('touch-layer');
    this.root = document.getElementById('controls');
    this.buttons = {
      left: document.getElementById('tb-left'),
      right: document.getElementById('tb-right'),
      hit: document.getElementById('tb-hit'),
      jump: document.getElementById('tb-jump'),
    };
    this.cache = null;
    window.addEventListener('resize', () => { this.cache = null; });
    window.addEventListener('orientationchange', () => { this.cache = null; });
  }
  rects() {
    if (!this.cache) {
      this.cache = {};
      for (const [k, el] of Object.entries(this.buttons)) {
        const r = el.getBoundingClientRect();
        this.cache[k] = r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
      }
      // ◀ ▶ si toccano: allarga verso l'alto per i pollici
      for (const k of ['left', 'right']) if (this.cache[k]) { this.cache[k].y -= 30; this.cache[k].h += 30; }
    }
    return this.cache;
  }
  show(on) {
    this.layer.classList.toggle('hidden', !on);
    this.root.classList.toggle('hidden', !on);
    this.cache = null;
  }
  feedback(input) {
    for (const [k, el] of Object.entries(this.buttons)) {
      const d = input.held(k);
      if (el._down !== d) { el.classList.toggle('down', d); el._down = d; }
    }
  }
}
