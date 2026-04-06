import { DEFAULT_ROOMS } from './data.js';

// --- DOM helper ---
export const g = id => document.getElementById(id);

// --- Input state (mutated by rd() in app.js) ---
export const S = {
  viewW:500, ceilH:500, wallH:300, dist:405, aspect:1.77777778,
  ratio:1.35, imgW:300, shiftPct:0, maxUp:50, maxDn:50,
  bodyH:13.6, targetH:70, posType:'bottom', tiltDeg:0, maxKS:30,
  drop:200, personOn:false, personDist:200,
};

// --- App-level flags (wrapped in object so cross-module mutation works) ---
export const store = {
  activePreset: null,
  dropDriver:   false,
  floorMode:    false,
  lkState:      { dist:false, ratio:false, body:false, drop:false, ks:false, imgW:false },
  roomPresets:  [],
};

try {
  const sr = localStorage.getItem('proj_rooms');
  store.roomPresets = sr ? JSON.parse(sr) : [...DEFAULT_ROOMS];
} catch(e) {
  store.roomPresets = [...DEFAULT_ROOMS];
}
