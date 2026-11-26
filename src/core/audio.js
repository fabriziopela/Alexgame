// Audio sintetizzato con Web Audio: nessun file da scaricare.
// Effetti brevi + musica a pattern (diversa per esterni e miniere).

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

const SONGS = {
  outdoor: {
    bpm: 128, wave: 'square', bassWave: 'triangle',
    lead: [72, 0, 76, 79, 0, 76, 74, 0, 72, 0, 69, 72, 0, 74, 76, 0, 77, 0, 76, 74, 0, 72, 74, 0, 76, 0, 72, 69, 0, 67, 69, 0],
    bass: [48, 0, 48, 0, 55, 0, 55, 0, 53, 0, 53, 0, 55, 0, 55, 0, 50, 0, 50, 0, 53, 0, 53, 0, 48, 0, 48, 0, 43, 0, 43, 0],
  },
  indoor: {
    bpm: 104, wave: 'triangle', bassWave: 'sawtooth',
    lead: [69, 0, 0, 72, 0, 71, 0, 69, 0, 0, 64, 0, 67, 0, 69, 0, 72, 0, 0, 74, 0, 72, 0, 71, 0, 0, 67, 0, 64, 0, 0, 0],
    bass: [45, 0, 45, 45, 0, 0, 45, 0, 43, 0, 43, 43, 0, 0, 43, 0, 41, 0, 41, 41, 0, 0, 41, 0, 40, 0, 40, 40, 0, 0, 44, 0],
  },
};

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicName = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  /** Va chiamato dentro un gesto dell'utente (requisito dei browser mobili). */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 0.55 : 0;
        this.master.connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
        this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.22; this.musicBus.connect(this.master);
        const len = this.ctx.sampleRate * 0.5;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { this.ctx = null; }
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05);
  }

  suspend() { try { this.ctx && this.ctx.suspend(); } catch { /* */ } }
  resume() { try { this.ctx && this.ctx.resume(); } catch { /* */ } }

  tone(freq, dur, { type = 'square', vol = 0.3, slide = 0, delay = 0, bus } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  burst(dur, { vol = 0.3, freq = 1200, q = 1, delay = 0 } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus);
    s.start(t); s.stop(t + dur + 0.02);
  }

  play(name) {
    if (!this.ctx || !this.enabled) return;
    switch (name) {
      case 'jump': this.tone(300, 0.16, { slide: 2.2, vol: 0.18 }); break;
      case 'swing': this.burst(0.09, { freq: 2500, q: 0.7, vol: 0.15 }); break;
      case 'chip': this.burst(0.07, { freq: 900, q: 3, vol: 0.3 }); this.tone(180, 0.06, { type: 'triangle', vol: 0.2 }); break;
      case 'break': this.burst(0.2, { freq: 600, q: 0.8, vol: 0.4 }); this.tone(140, 0.12, { type: 'triangle', slide: 0.5, vol: 0.25 }); break;
      case 'bonus': [0, 4, 7, 12].forEach((n, i) => this.tone(NOTE(76 + n), 0.12, { delay: i * 0.05, vol: 0.18 })); break;
      case 'pickup': [0, 7, 12].forEach((n, i) => this.tone(NOTE(79 + n), 0.14, { type: 'triangle', delay: i * 0.06, vol: 0.25 })); break;
      case 'hurt': this.tone(220, 0.35, { type: 'sawtooth', slide: 0.35, vol: 0.28 }); this.burst(0.15, { freq: 300, vol: 0.25 }); break;
      case 'enemyHit': this.tone(160, 0.1, { type: 'square', slide: 0.6, vol: 0.2 }); this.burst(0.06, { freq: 1500, vol: 0.2 }); break;
      case 'enemyDie': this.tone(260, 0.4, { type: 'sawtooth', slide: 0.2, vol: 0.22 }); this.burst(0.3, { freq: 400, q: 0.5, vol: 0.25 }); break;
      case 'windup': this.tone(110, 0.45, { type: 'sawtooth', slide: 1.8, vol: 0.12 }); break;
      case 'throw': this.burst(0.25, { freq: 3000, q: 2, vol: 0.12 }); break;
      case 'clink': this.tone(1600, 0.08, { type: 'square', vol: 0.12 }); break;
      case 'tick': this.tone(1046, 0.06, { type: 'square', vol: 0.12 }); break;
      case 'starOn': [0, 4, 7, 11, 14].forEach((n, i) => this.tone(NOTE(72 + n), 0.1, { delay: i * 0.04, vol: 0.18 })); break;
      case 'respawn': this.tone(440, 0.2, { type: 'triangle', slide: 1.5, vol: 0.18 }); break;
      case 'win': [0, 4, 7, 12, 7, 12, 16].forEach((n, i) => this.tone(NOTE(72 + n), 0.22, { delay: i * 0.11, vol: 0.22 })); break;
      case 'lose': [0, -3, -6, -10].forEach((n, i) => this.tone(NOTE(64 + n), 0.3, { type: 'triangle', delay: i * 0.18, vol: 0.25 })); break;
      case 'click': this.tone(660, 0.05, { type: 'square', vol: 0.1 }); break;
      default: break;
    }
  }

  music(name) {
    if (this.musicName === name) return;
    this.musicName = name;
    clearInterval(this.timer); this.timer = null;
    if (!name || !this.ctx) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 60);
  }

  schedule() {
    const c = this.ctx; const song = SONGS[this.musicName];
    if (!c || !song) return;
    const stepDur = 60 / song.bpm / 2;
    while (this.nextTime < c.currentTime + 0.25) {
      const i = this.step % song.lead.length;
      const t = this.nextTime - c.currentTime;
      if (t >= 0) {
        if (song.lead[i]) this.tone(NOTE(song.lead[i]), stepDur * 0.9, { type: song.wave, vol: 0.12, delay: t, bus: this.musicBus });
        if (song.bass[i]) this.tone(NOTE(song.bass[i]), stepDur * 1.6, { type: song.bassWave, vol: 0.16, delay: t, bus: this.musicBus });
        if (i % 4 === 0) this.tone(70, 0.08, { type: 'sine', vol: 0.25, slide: 0.5, delay: t, bus: this.musicBus });
      }
      this.nextTime += stepDur;
      this.step++;
    }
  }
}
