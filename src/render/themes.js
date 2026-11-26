// Atmosfere visive per ciascun ambiente.
export const THEMES = {
  forest: {
    sky: [[0, '#5fb6ff'], [0.65, '#bfe6ff'], [1, '#eaf7ff']], fog: '#cfeaff', fogNear: 26, fogFar: 70,
    hemi: ['#ffffff', '#6b8f4e', 1.15], sun: ['#fff4dc', 1.6], tint: '#ffffff', backTint: '#9fb39a',
    layers: [{ color: '#86b8d8', kind: 'mountains', z: -60, f: 0.85 }, { color: '#5f9a5a', top: '#6fae64', kind: 'trees', z: -36, f: 0.7 }],
    deco: 'trees', sunDisc: '#fff6c4', music: 'outdoor',
  },
  sunset: {
    sky: [[0, '#3b3b8f'], [0.45, '#d9637a'], [0.8, '#ffb35c'], [1, '#ffe0a0']], fog: '#f0a070', fogNear: 24, fogFar: 66,
    hemi: ['#ffd2b0', '#6a4a5a', 1.0], sun: ['#ffb070', 1.5], tint: '#ffe2c8', backTint: '#a07f78',
    layers: [{ color: '#7a4c78', kind: 'mountains', z: -60, f: 0.85 }, { color: '#4f3a52', kind: 'trees', z: -36, f: 0.7 }],
    deco: 'trees', sunDisc: '#ffcf6a', music: 'outdoor',
  },
  night: {
    sky: [[0, '#070a1e'], [0.7, '#18224a'], [1, '#2d3a6a']], fog: '#141c3a', fogNear: 18, fogFar: 52,
    hemi: ['#8ea6ff', '#1e2438', 0.68], sun: ['#a8b8ff', 0.6], tint: '#a9b6e6', backTint: '#4e5878',
    layers: [{ color: '#1d2850', kind: 'mountains', z: -60, f: 0.85 }, { color: '#141d38', kind: 'trees', z: -36, f: 0.7 }],
    deco: 'trees', sunDisc: '#e8eeff', stars: true, playerLight: 1.2, music: 'indoor',
  },
  desert: {
    sky: [[0, '#4aa3e8'], [0.6, '#a9dcf5'], [1, '#fbe9c4']], fog: '#f4dfb0', fogNear: 26, fogFar: 72,
    hemi: ['#ffffff', '#c9a060', 1.2], sun: ['#fff0cc', 1.8], tint: '#ffffff', backTint: '#c8b088',
    layers: [{ color: '#d9b77a', kind: 'dunes', z: -60, f: 0.85 }, { color: '#c99d5c', kind: 'dunes', z: -36, f: 0.7 }],
    deco: 'cacti', sunDisc: '#fff8d8', music: 'outdoor',
  },
  dunes: {
    sky: [[0, '#2f7fd0'], [0.55, '#89c6ef'], [1, '#ffd9a8']], fog: '#f2cf9a', fogNear: 24, fogFar: 68,
    hemi: ['#fff4e0', '#b38850', 1.15], sun: ['#ffe2b0', 1.7], tint: '#fff2e0', backTint: '#c09a70',
    layers: [{ color: '#e0b070', kind: 'dunes', z: -60, f: 0.85 }, { color: '#c48a4c', kind: 'dunes', z: -36, f: 0.7 }],
    deco: 'cacti', sunDisc: '#fff0c0', music: 'outdoor',
  },
  mine: {
    sky: [[0, '#0d0b0a'], [1, '#1d1814']], fog: '#16120f', fogNear: 14, fogFar: 40,
    hemi: ['#ffe2bf', '#2a2018', 0.62], sun: ['#ffd8a0', 0.35], tint: '#e8dccb', backTint: '#5e544c',
    wall: 'mine', deco: 'beams', playerLight: 1.6, music: 'indoor',
  },
  deepmine: {
    sky: [[0, '#07080b'], [1, '#121318']], fog: '#0c0d12', fogNear: 12, fogFar: 36,
    hemi: ['#c8d4ff', '#24242e', 0.62], sun: ['#b8c8ff', 0.25], tint: '#c8cad8', backTint: '#4a4b58',
    wall: 'ore', deco: 'beams', playerLight: 1.8, music: 'indoor',
  },
  tomb: {
    sky: [[0, '#140d06'], [1, '#2a1c0e']], fog: '#1c1208', fogNear: 13, fogFar: 38,
    hemi: ['#ffd9a0', '#3a2810', 0.6], sun: ['#ffcf8a', 0.3], tint: '#f2dcc0', backTint: '#76603e',
    wall: 'tomb', deco: 'pillars', playerLight: 1.5, music: 'indoor',
  },
  lavamine: {
    sky: [[0, '#1a0604'], [1, '#3a0e06']], fog: '#2a0a05', fogNear: 13, fogFar: 40,
    hemi: ['#ffb38a', '#3a120a', 0.62], sun: ['#ff8a50', 0.45], tint: '#f0c8b8', backTint: '#5a3a34',
    wall: 'mine', deco: 'beams', playerLight: 1.3, lavaGlow: true, music: 'indoor',
  },
  abyss: {
    sky: [[0, '#05040a'], [1, '#120a1c']], fog: '#0a0612', fogNear: 11, fogFar: 34,
    hemi: ['#c9a8ff', '#1c1226', 0.6], sun: ['#b090ff', 0.25], tint: '#c8bce0', backTint: '#3e3650',
    wall: 'ore', deco: 'beams', playerLight: 1.9, lavaGlow: true, music: 'indoor',
  },
};
