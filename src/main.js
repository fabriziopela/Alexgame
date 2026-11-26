// Alex the Miner — avvio dell'app, flusso tra le schermate e ciclo di gioco.
import { GAME_TITLE, GAME_VERSION, PHYS } from './config.js';
import { LEVELS } from './world/levels.js';
import { generateLevel } from './world/generator.js';
import { Session } from './game/session.js';
import { Renderer } from './render/scene.js';
import { THEMES } from './render/themes.js';
import { Input } from './core/input.js';
import { GameAudio } from './core/audio.js';
import { loadSave, saveProgress, recordResult } from './core/save.js';
import { Hud } from './ui/hud.js';
import { Screens } from './ui/screens.js';
import { TouchControls } from './ui/touch-controls.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const MAX_STEPS = 5;

const SOUND_EVENTS = new Set(['jump', 'swing', 'chip', 'break', 'bonus', 'pickup', 'hurt', 'enemyHit', 'enemyDie', 'windup', 'throw', 'clink', 'tick', 'starOn', 'respawn', 'win', 'lose']);

class App {
  constructor() {
    this.save = loadSave();
    this.renderer = new Renderer($('game'));
    this.audio = new GameAudio();
    this.audio.enabled = this.save.audio;
    this.hud = new Hud();
    this.screens = new Screens();
    this.controls = new TouchControls();
    this.input = new Input(this.controls.layer, () => this.controls.rects());
    this.input.onPause = () => (this.state === 'playing' ? this.pause() : this.state === 'paused' ? this.resume() : null);
    this.input.onButton = () => { try { navigator.vibrate?.(8); } catch { /* */ } };
    this.state = 'title';
    this.session = null;
    this.levelId = 1;
    this.acc = 0;
    this.last = performance.now();
    this.bot = null;
    this.bindUi();
    this.bindSystem();
    $('version').textContent = `${GAME_TITLE} · versione ${GAME_VERSION}`;
    document.title = GAME_TITLE;
    this.updateAudioLabels();
  }

  bindUi() {
    const click = (id, fn) => $(id).addEventListener('click', (e) => { e.stopPropagation(); this.audio.unlock(); this.audio.play('click'); fn(); });
    click('btn-play', () => { this.enterFullscreen(); this.startLevel(Math.min(this.save.unlocked, LEVELS.length)); });
    click('btn-levels', () => this.showLevels());
    click('btn-levels-back', () => this.showTitle());
    click('btn-audio-title', () => this.toggleAudio());
    click('btn-audio-pause', () => this.toggleAudio());
    click('btn-pause', () => this.pause());
    click('btn-resume', () => this.resume());
    click('btn-restart', () => this.startLevel(this.levelId));
    click('btn-pause-levels', () => this.showLevels());
    click('btn-next', () => this.startLevel(this.levelId + 1));
    click('btn-retry', () => this.startLevel(this.levelId));
    click('btn-result-levels', () => this.showLevels());
    $('screen-intro').addEventListener('pointerdown', () => { this.audio.unlock(); this.begin(); });
  }

  bindSystem() {
    window.addEventListener('resize', () => this.renderer.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (this.state === 'playing') this.pause(); this.audio.suspend(); }
      else this.audio.resume();
    });
    const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
    this.portrait = portrait;
    const onOrient = () => { if (portrait.matches && this.state === 'playing') this.pause(); setTimeout(() => this.renderer.resize(), 120); };
    portrait.addEventListener?.('change', onOrient);
    window.addEventListener('orientationchange', onOrient);
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches;
    $('ios-hint').classList.toggle('hidden', !(iOS && !standalone));
  }

  enterFullscreen() {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: 'hide' })
          .then(() => screen.orientation?.lock?.('landscape').catch(() => {}))
          .catch(() => {});
      }
    } catch { /* non supportato (iPhone) */ }
  }

  toggleAudio() {
    this.save.audio = !this.save.audio;
    this.audio.setEnabled(this.save.audio);
    saveProgress(this.save);
    this.updateAudioLabels();
  }
  updateAudioLabels() {
    for (const id of ['btn-audio-title', 'btn-audio-pause']) $(id).textContent = `AUDIO: ${this.save.audio ? 'ON' : 'OFF'}`;
  }

  /** Livello mostrato dietro al menu, fermo. */
  preview(id) {
    const session = new Session(generateLevel(LEVELS[id - 1]));
    this.session = session;
    this.renderer.start(session);
  }

  showTitle() {
    this.state = 'title';
    this.audio.music(null);
    this.hud.show(false); this.controls.show(false);
    if (!this.session || this.session.status !== 'intro') this.preview(Math.min(this.save.unlocked, LEVELS.length));
    this.screens.show('title');
  }

  showLevels() {
    this.state = 'levels';
    this.audio.music(null);
    this.hud.show(false); this.controls.show(false);
    if (this.session && this.session.status !== 'intro') this.preview(this.levelId);
    this.screens.renderLevels(this.save, (id) => { this.audio.unlock(); this.enterFullscreen(); this.startLevel(id); });
    this.screens.show('levels');
  }

  startLevel(id) {
    this.levelId = Math.max(1, Math.min(LEVELS.length, id));
    const recipe = LEVELS[this.levelId - 1];
    this.session = new Session(generateLevel(recipe));
    this.renderer.start(this.session);
    this.hud.reset();
    this.hud.update(this.session, 0);
    this.hud.show(true);
    this.controls.show(false);
    this.input.reset();
    this.screens.intro(recipe);
    this.screens.show('intro');
    this.state = 'intro';
    clearTimeout(this.introTimer);
    this.introTimer = setTimeout(() => this.begin(), params.has('autostart') ? 50 : 3200);
  }

  begin() {
    if (this.state !== 'intro') return;
    clearTimeout(this.introTimer);
    this.state = 'playing';
    this.session.start();
    this.screens.hideAll();
    this.controls.show(true);
    this.input.reset();
    this.acc = 0;
    this.audio.music(THEMES[this.session.recipe.theme].music);
    // se nel frattempo il telefono è in verticale o l'app è in background, parte già in pausa
    if (document.hidden || this.portrait?.matches) this.pause();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.session.pause();
    this.state = 'paused';
    this.controls.show(false);
    this.audio.music(null);
    this.screens.show('pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.session.resume();
    this.state = 'playing';
    this.screens.hideAll();
    this.controls.show(true);
    this.input.reset();
    this.acc = 0;
    this.audio.music(THEMES[this.session.recipe.theme].music);
  }

  finish() {
    const s = this.session;
    const won = s.status === 'won';
    this.state = 'ending';
    this.controls.show(false);
    this.audio.music(null);
    let record = false;
    if (won) {
      record = recordResult(this.save, s.recipe.id, s.recipe.time - s.time, s.score).newRecord;
      saveProgress(this.save);
    }
    setTimeout(() => {
      if (this.session !== s) return;
      this.state = 'result';
      this.screens.result({ won, reason: s.lostReason, session: s, record, last: won && s.recipe.id === LEVELS.length });
      this.screens.show('result');
    }, won ? 1300 : 900);
  }

  frame(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const s = this.session;
    if (s && this.state === 'playing' && s.status === 'playing') {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= PHYS.DT && steps < MAX_STEPS) {
        const inp = this.bot ? this.bot.input(s) : this.input.state();
        s.update(PHYS.DT, inp);
        this.input.endFrame();
        this.acc -= PHYS.DT;
        steps++;
      }
      if (steps === MAX_STEPS) this.acc = 0;
    }
    if (s) {
      const events = s.drainEvents();
      if (events.length) {
        this.renderer.handleEvents(events);
        for (const e of events) if (SOUND_EVENTS.has(e.type)) this.audio.play(e.type);
      }
      if (this.state === 'playing' && (s.status === 'won' || s.status === 'lost')) this.finish();
      if (this.state !== 'title' && this.state !== 'levels') this.hud.update(s, dt);
      this.controls.feedback(this.input);
      this.renderer.render(dt);
    }
    requestAnimationFrame((t) => this.frame(t));
  }
}

async function boot() {
  try {
    const app = new App();
    window.__game = app;
    if (params.has('bot')) {
      try { const { createBot } = await import('./game/bot.js'); app.bot = createBot(); } catch (e) { console.warn('bot non disponibile', e); }
    }
    const lv = Number(params.get('level'));
    if (lv >= 1 && lv <= LEVELS.length) app.startLevel(lv);
    else app.showTitle();
    requestAnimationFrame((t) => { app.last = t; app.frame(t); });
  } catch (err) {
    console.error(err);
    const el = document.querySelector('#screen-loading p');
    if (el) el.textContent = 'Impossibile avviare il gioco su questo dispositivo (WebGL non disponibile).';
  }
}

// Funzionamento offline. In contesti che non lo permettono (iframe protetti) si prosegue senza.
try {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => { try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch { /* non disponibile */ } });
  }
} catch { /* non disponibile */ }

boot();
