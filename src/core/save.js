// Salvataggi sul dispositivo. Ogni accesso è protetto: senza storage il gioco funziona.
export const SAVE_KEY = 'alex-the-miner/save/v1';
const LEVEL_COUNT = 10;
const defaults = () => ({ unlocked: 1, best: {}, audio: true });

function defaultStorage() {
  try { return globalThis.localStorage; } catch { return undefined; }
}

export function loadSave(storage = defaultStorage()) {
  try {
    if (!storage) return defaults();
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return defaults();
    const d = JSON.parse(raw);
    const out = defaults();
    if (Number.isInteger(d.unlocked)) out.unlocked = Math.max(1, Math.min(LEVEL_COUNT, d.unlocked));
    if (typeof d.audio === 'boolean') out.audio = d.audio;
    if (d.best && typeof d.best === 'object' && !Array.isArray(d.best)) {
      for (const [k, v] of Object.entries(d.best)) {
        if (v && Number.isFinite(v.time) && Number.isFinite(v.score)) out.best[k] = { time: v.time, score: v.score };
      }
    }
    return out;
  } catch {
    return defaults();
  }
}

export function saveProgress(save, storage = defaultStorage()) {
  try { if (storage) storage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* storage non disponibile */ }
}

/** Registra un livello completato. Ritorna { newRecord } (miglior tempo). */
export function recordResult(save, id, time, score) {
  const prev = save.best[id];
  const newRecord = !prev || time < prev.time;
  save.best[id] = {
    time: prev ? Math.min(prev.time, time) : time,
    score: prev ? Math.max(prev.score, score) : score,
  };
  save.unlocked = Math.min(LEVEL_COUNT, Math.max(save.unlocked, id + 1));
  return { newRecord };
}
