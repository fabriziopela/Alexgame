// Ricette dei 10 livelli. Il bilanciamento si regola modificando questi numeri.
// weights: frequenza relativa dei segmenti (vedi segments.js).

const base = {
  time: 120,
  zombieHp: 1,
  mummyHp: 2,
  powerTable: { heart: 3, boomerang: 2, star: 1 },
};

export const LEVELS = [
  {
    ...base, id: 1, hint: 'Usa ◀ ▶ per camminare, SALTA e COLPISCI. Rompi i blocchi con la gemma per trovare i bonus!', name: 'La Foresta', theme: 'forest', indoor: false, seed: 1101,
    length: 380, maxGap: 2, enemyRate: 0.22, enemyMix: { zombie: 1, mummy: 0 }, enemySpeed: 1.6,
    bonusRate: 0.32,
    weights: { flat: 4, stepUp: 2, stepDown: 2, gap: 2, digWall: 1, enemyGroup: 1, bonusNiche: 2 },
  },
  {
    ...base, id: 2, hint: 'Piattaforme sospese sul vuoto: prendi la rincorsa prima di saltare.', name: 'Tramonto nel Bosco', theme: 'sunset', indoor: false, seed: 2202,
    length: 395, maxGap: 3, enemyRate: 0.28, enemyMix: { zombie: 1, mummy: 0 }, enemySpeed: 1.75,
    bonusRate: 0.3,
    weights: { flat: 3, stepUp: 2, stepDown: 2, gap: 3, floating: 2, digWall: 1, enemyGroup: 2, bonusNiche: 2 },
  },
  {
    ...base, id: 3, hint: 'Benvenuto in miniera: evita la lava e scava i muri col piccone per passare.', name: 'Ingresso della Miniera', theme: 'mine', indoor: true, seed: 3303,
    length: 405, maxGap: 3, enemyRate: 0.32, enemyMix: { zombie: 1, mummy: 0 }, enemySpeed: 1.85,
    bonusRate: 0.3,
    weights: { flat: 3, stepUp: 2, stepDown: 2, gap: 2, lavaGap: 1, digWall: 3, lowTunnel: 2, enemyGroup: 2, bonusNiche: 2 },
  },
  {
    ...base, id: 4, hint: 'Arrivano le mummie! Quando gli occhi si illuminano stanno per caricare.', name: 'Il Deserto', theme: 'desert', indoor: false, seed: 4404,
    length: 420, maxGap: 3, enemyRate: 0.36, enemyMix: { zombie: 0.3, mummy: 0.7 }, enemySpeed: 1.95,
    bonusRate: 0.3,
    weights: { flat: 3, stepUp: 2, stepDown: 2, gap: 3, floating: 1, digWall: 2, enemyGroup: 2, bonusNiche: 2 },
  },
  {
    ...base, id: 5, hint: 'Spuntoni tra le dune: saltali senza toccarli.', name: 'Le Dune', theme: 'dunes', indoor: false, seed: 5505,
    length: 435, maxGap: 3, enemyRate: 0.4, enemyMix: { zombie: 0.5, mummy: 0.5 }, enemySpeed: 2.05,
    bonusRate: 0.3,
    weights: { flat: 2, stepUp: 3, stepDown: 3, gap: 3, floating: 2, spikeRow: 3, digWall: 2, enemyGroup: 2, bonusNiche: 2 },
  },
  {
    ...base, id: 6, hint: 'Gli zombie della miniera profonda resistono a due colpi.', name: 'Miniera Profonda', theme: 'deepmine', indoor: true, seed: 6606,
    length: 450, maxGap: 3, enemyRate: 0.44, enemyMix: { zombie: 0.7, mummy: 0.3 }, enemySpeed: 2.15,
    zombieHp: 2, bonusRate: 0.3, powerTable: { heart: 4, boomerang: 2, star: 1 },
    weights: { flat: 2, stepUp: 2, stepDown: 2, gap: 2, lavaGap: 3, spikeRow: 2, digWall: 3, lowTunnel: 2, enemyGroup: 2, bonusNiche: 2 },
  },
  {
    ...base, id: 7, hint: 'Spuntoni a scomparsa: aspetta che rientrino e passa al momento giusto.', name: 'La Foresta di Notte', theme: 'night', indoor: false, seed: 7707,
    length: 465, maxGap: 4, enemyRate: 0.48, enemyMix: { zombie: 0.75, mummy: 0.25 }, enemySpeed: 2.25,
    zombieHp: 2, bonusRate: 0.3, powerTable: { heart: 4, boomerang: 2, star: 2 },
    weights: { flat: 2, stepUp: 2, stepDown: 2, gap: 3, floating: 2, spikeRow: 2, retractSpikes: 3, digWall: 2, enemyGroup: 3, bonusNiche: 2 },
  },
  {
    ...base, id: 8, hint: 'Le mummie della tomba resistono a tre colpi. Usa il piccone-boomerang!', name: 'La Tomba Perduta', theme: 'tomb', indoor: true, seed: 8808,
    length: 480, maxGap: 4, enemyRate: 0.52, enemyMix: { zombie: 0.2, mummy: 0.8 }, enemySpeed: 2.35,
    zombieHp: 2, mummyHp: 3, bonusRate: 0.32, powerTable: { heart: 4, boomerang: 3, star: 2 },
    weights: { flat: 2, stepUp: 2, stepDown: 2, gap: 2, lavaGap: 1, spikeRow: 3, retractSpikes: 3, digWall: 3, lowTunnel: 3, enemyGroup: 3, bonusNiche: 2 },
  },
  {
    ...base, id: 9, hint: 'La miniera è piena di lava: ogni salto conta.', name: 'Miniera di Lava', theme: 'lavamine', indoor: true, seed: 9909,
    length: 495, maxGap: 4, enemyRate: 0.56, enemyMix: { zombie: 0.6, mummy: 0.4 }, enemySpeed: 2.45,
    zombieHp: 2, mummyHp: 3, bonusRate: 0.32, powerTable: { heart: 5, boomerang: 3, star: 2 },
    weights: { flat: 2, stepUp: 2, stepDown: 2, gap: 1, lavaGap: 5, floating: 3, spikeRow: 2, retractSpikes: 2, digWall: 2, lowTunnel: 2, enemyGroup: 3, bonusNiche: 2 },
  },
  {
    ...base, id: 10, hint: "L'ultima sfida. Buona fortuna, Alex!", name: "L'Abisso", theme: 'abyss', indoor: true, seed: 10010,
    length: 510, maxGap: 4, enemyRate: 0.6, enemyMix: { zombie: 0.5, mummy: 0.5 }, enemySpeed: 2.55,
    zombieHp: 2, mummyHp: 3, bonusRate: 0.32, powerTable: { heart: 5, boomerang: 3, star: 2 },
    weights: { flat: 1, stepUp: 2, stepDown: 2, gap: 2, lavaGap: 4, floating: 3, spikeRow: 3, retractSpikes: 3, digWall: 3, lowTunnel: 2, enemyGroup: 4, bonusNiche: 2 },
  },
];
