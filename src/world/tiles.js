// Tipi di blocco e loro proprietà.
export const T = Object.freeze({
  AIR: 0, GRASS: 1, DIRT: 2, SAND: 3, SANDSTONE: 4, STONE: 5, DARKSTONE: 6,
  WOOD: 7, LEAVES: 8, CRATE: 9, BONUS: 10, BEDROCK: 11, LAVA: 12, SPIKES: 13,
  SPIKES_RETRACT: 14, EXIT: 15, BRICK: 16,
});

const def = (name, o = {}) => ({
  name, solid: false, breakable: false, hp: 0, hazard: null, bonus: false, ...o,
});

export const TILE_INFO = [];
TILE_INFO[T.AIR] = def('air');
TILE_INFO[T.GRASS] = def('grass', { solid: true, breakable: true, hp: 1 });
TILE_INFO[T.DIRT] = def('dirt', { solid: true, breakable: true, hp: 1 });
TILE_INFO[T.SAND] = def('sand', { solid: true, breakable: true, hp: 1 });
TILE_INFO[T.SANDSTONE] = def('sandstone', { solid: true, breakable: true, hp: 2 });
TILE_INFO[T.STONE] = def('stone', { solid: true, breakable: true, hp: 2 });
TILE_INFO[T.DARKSTONE] = def('darkstone', { solid: true, breakable: false });
TILE_INFO[T.WOOD] = def('wood', { solid: true, breakable: true, hp: 1 });
TILE_INFO[T.LEAVES] = def('leaves', { solid: true, breakable: true, hp: 1 });
TILE_INFO[T.CRATE] = def('crate', { solid: true, breakable: true, hp: 1 });
TILE_INFO[T.BONUS] = def('bonus', { solid: true, breakable: true, hp: 1, bonus: true });
TILE_INFO[T.BEDROCK] = def('bedrock', { solid: true });
TILE_INFO[T.LAVA] = def('lava', { hazard: 'lava' });
TILE_INFO[T.SPIKES] = def('spikes', { hazard: 'spikes' });
TILE_INFO[T.SPIKES_RETRACT] = def('spikes_retract', { hazard: 'spikes' });
TILE_INFO[T.EXIT] = def('exit');
TILE_INFO[T.BRICK] = def('brick', { solid: true, breakable: true, hp: 2 });
Object.freeze(TILE_INFO);
