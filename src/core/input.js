// Comandi: touch multi-dito (con scivolamento tra i pulsanti) e tastiera per i test da PC.

const PAD = 14; // tolleranza in px attorno ai pulsanti

/** Mappa puri puntatore → pulsante. `rects()` ritorna {nome: {x,y,w,h}}. */
export class TouchMap {
  constructor(rects) {
    this.rects = rects;
    this.pointers = new Map();
    this.onPress = null;
  }
  hitTest(x, y) {
    const r = this.rects();
    let best = null, bestD = Infinity;
    for (const [name, b] of Object.entries(r)) {
      if (!b) continue;
      if (x >= b.x - PAD && x <= b.x + b.w + PAD && y >= b.y - PAD && y <= b.y + b.h + PAD) {
        const d = Math.hypot(x - (b.x + b.w / 2), y - (b.y + b.h / 2));
        if (d < bestD) { bestD = d; best = name; }
      }
    }
    return best;
  }
  update(id, x, y) {
    const name = this.hitTest(x, y);
    const prev = this.pointers.get(id);
    this.pointers.set(id, name);
    if (name && name !== prev && !this.pressedExcept(name, id) && this.onPress) this.onPress(name);
  }
  pressedExcept(name, id) {
    for (const [pid, n] of this.pointers) if (pid !== id && n === name) return true;
    return false;
  }
  release(id) { this.pointers.delete(id); }
  clear() { this.pointers.clear(); }
  pressed(name) {
    for (const n of this.pointers.values()) if (n === name) return true;
    return false;
  }
}

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'jump', KeyW: 'jump', ArrowUp: 'jump',
  KeyJ: 'hit', KeyK: 'hit', KeyX: 'hit',
};

export class Input {
  /**
   * @param {HTMLElement} layer elemento che riceve i tocchi (copre lo schermo)
   * @param {() => object} rects rettangoli dei pulsanti in coordinate client
   */
  constructor(layer, rects) {
    this.touch = new TouchMap(rects);
    this.keys = new Set();
    this.queued = { jump: false, hit: false };
    this.onPause = null;
    this.onButton = null;
    this.enabled = true;
    this.touch.onPress = (n) => this.press(n);

    const move = (e) => {
      if (e.pointerType === 'mouse' && e.buttons === 0) return;
      this.touch.update(e.pointerId, e.clientX, e.clientY);
    };
    layer.addEventListener('pointerdown', (e) => { e.preventDefault(); move(e); }, { passive: false });
    layer.addEventListener('pointermove', (e) => { if (this.touch.pointers.has(e.pointerId)) move(e); });
    const up = (e) => this.touch.release(e.pointerId);
    layer.addEventListener('pointerup', up);
    layer.addEventListener('pointercancel', up);
    layer.addEventListener('lostpointercapture', up);
    layer.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') { if (this.onPause) this.onPause(); return; }
      const n = KEYMAP[e.code];
      if (!n) return;
      e.preventDefault();
      if (!this.keys.has(n) && !e.repeat) this.press(n);
      this.keys.add(n);
    });
    window.addEventListener('keyup', (e) => { const n = KEYMAP[e.code]; if (n) this.keys.delete(n); });
    window.addEventListener('blur', () => this.reset());
  }

  press(name) {
    if (name === 'jump' || name === 'hit') this.queued[name] = true;
    if (this.onButton) this.onButton(name);
  }

  held(name) { return this.keys.has(name) || this.touch.pressed(name); }

  state() {
    return {
      left: this.held('left'),
      right: this.held('right'),
      jump: this.held('jump'),
      hit: this.held('hit'),
      jumpPressed: this.queued.jump,
      hitPressed: this.queued.hit,
    };
  }

  /** Consuma i "pressioni" dopo il primo passo di simulazione del frame. */
  endFrame() { this.queued.jump = false; this.queued.hit = false; }

  reset() { this.keys.clear(); this.touch.clear(); this.endFrame(); }
}
