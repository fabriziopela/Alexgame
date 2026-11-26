// Configurazione centrale di Alex the Miner.
// Nessuna dipendenza da DOM o Three.js: usato anche dai test in Node.

export const GAME_TITLE = 'Alex the Miner';
export const GAME_VERSION = '0.9.0-beta';

const JUMP_HEIGHT = 3.2;   // blocchi
const APEX_TIME = 0.38;    // secondi per raggiungere l'apice

export const PHYS = Object.freeze({
  DT: 1 / 60,
  GRAVITY: (2 * JUMP_HEIGHT) / (APEX_TIME * APEX_TIME),
  JUMP_VELOCITY: (2 * JUMP_HEIGHT) / APEX_TIME,
  JUMP_CUT: 0.45,          // moltiplicatore della velocità verticale al rilascio anticipato
  RUN_SPEED: 6,            // blocchi/s
  ACCEL: 60,               // blocchi/s² a terra
  AIR_ACCEL: 40,           // blocchi/s² in aria
  FRICTION: 50,            // decelerazione senza input
  MAX_FALL: 22,            // velocità massima di caduta
  COYOTE: 0.1,
  JUMP_BUFFER: 0.12,
  PLAYER_W: 0.6,
  PLAYER_H: 1.7,
});

export const RULES = Object.freeze({
  MAX_HEARTS: 3,
  HURT_INVULN: 1.2,
  SWING_TIME: 0.3,
  BOOMERANG_TIME: 20,
  BOOMERANG_RANGE: 7,
  BOOMERANG_SPEED: 14,
  STAR_TIME: 5,
  PICKUP_LIFETIME: 8,
  LEVEL_TIME: 120,
  TIMER_WARNING: 15,
  ENEMY_ACTIVE_RANGE: 18,
});

export const SCORE = Object.freeze({
  BLOCK: 10,
  BONUS_BLOCK: 25,
  ZOMBIE: 100,
  MUMMY: 150,
  POWERUP: 50,
  HEART_FULL: 200,
  PER_SECOND_LEFT: 10,
});
