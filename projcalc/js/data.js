// --- Projector & Room Data ---

// dMin/dMax  = focus distance range in cm (verify against model spec sheet)
// shiftType  = 'optical' | 'digital' | 'none'
// digitalZoom= true if zoom is electronic/digital (image-crop), not optical
// shiftCurve = null (flat — use sUp/sDn at all ratios) or array of [ratio, upPct, dnPct] points
//              for models where the available shift percentage changes with zoom position
// vOffset    = built-in vertical offset as % of image height in standard (floor/table-top) orientation.
//              Definition: (distance from lens centre to image centre) / image height × 100.
//              Positive: image centre is above lens centre (typical for floor-mount / no-shift models).
//              0: image centred on lens axis (standard for optical-shift projectors where ±% is
//                 measured from the centred position).
//              In ceiling mount the sign is automatically inverted by the app.
//              Manufacturer conversions:
//                Optoma "Offset X%"    →  vOffset = X / 2      (Optoma's X% is of half-height; ÷2 → % of full height)
//                Epson  "Offset X:1"   →  vOffset = (X−1)/(2×(X+1)) × 100
//                                         e.g. 10:1 → 9/22×100 ≈ 41
//                NEC    optical diagram  →  read "lower/upper edge of screen at 0%V = lens centre"
//                                         lower edge at lens → vOffset = 50; upper edge → vOffset = −50
//              Verify each value against the model's spec sheet "Offset" or "V. offset" field.
export const PRESETS = [
  // Ultra-short throw — same optical engine, floor-use only, image projects above lens.
  // Epson spec gives absolute offset gap (inches at screen), not a fixed %. Derived from spec chart:
  // two known points — 70" diag → 3.5" gap, 130" diag → 7.1" gap (slope = 0.06 in/diag-in).
  // Converting gap to vOffset%: (gap / image_height + 0.5) × 100 yields 60.2% at 70" → 61.1% at 130".
  // Variation <1 pp across full zoom range → fixed vOffset:61 is adequate (sub-cm error).
  // hMax    = horizontal shift spec limit ±% of image width. 0 = no H shift.
  // lumens  = rated ANSI lumen output (white brightness, spec sheet value)
  // fWide   = lens aperture (F-number) at wide end of zoom
  // fTele   = lens aperture (F-number) at tele end of zoom
  //           null = fixed lens or unknown → C_zoom = 1.0 (no loss)
  //           C_zoom at current ratio = (fWide / F_interpolated)²
  //           F_interpolated = fWide + t*(fTele-fWide), t = zoom position 0..1
  {id:'eb800f',   name:'Epson EB-800F',              aspectVal:'1.77777778', rMin:.27, rMax:.37, sUp:0,  sDn:0,  vOffset:61,  fixed:false, ks:3,  bodyH:10,   dMin:60,  dMax:350,  shiftType:'none',    digitalZoom:false, shiftCurve:null, ustMirror:true, hMax:0,  lumens:5000, fWide:null, fTele:null},
  {id:'ehls100',  name:'Epson EH-LS100',             aspectVal:'1.77777778', rMin:.27, rMax:.37, sUp:0,  sDn:0,  vOffset:61,  fixed:false, ks:3,  bodyH:10,   dMin:45,  dMax:350,  shiftType:'none',    digitalZoom:false, shiftCurve:null, ustMirror:true, hMax:0,  lumens:4000, fWide:null, fTele:null},
  {id:'gt1080e',  name:'Optoma GT1080e',             aspectVal:'1.77777778', rMin:.49, rMax:.49, sUp:0,  sDn:0,  vOffset:58,  fixed:true,  ks:40, bodyH:9,    dMin:74,  dMax:762,  shiftType:'none',    digitalZoom:false, shiftCurve:null, hMax:0,  lumens:3000, fWide:null, fTele:null},
  {id:'zh450st',  name:'Optoma ZH450ST',             aspectVal:'1.77777778', rMin:.50, rMax:.50, sUp:0,  sDn:0,  vOffset:58,  fixed:true,  ks:40, bodyH:9,    dMin:65,  dMax:762,  shiftType:'none',    digitalZoom:false, shiftCurve:null, hMax:0,  lumens:4200, fWide:null, fTele:null},
  // Standard throw — optical shift; spec gives ±% from centred (image centre at lens), so vOffset:0
  // ELPLU03S: no F-stop data available; falls back to no zoom correction
  {id:'l1050_lu', name:'Epson EB-L1050U + ELPLU03S', aspectVal:'1.6',        rMin:.65, rMax:.78, sUp:67, sDn:67, vOffset:0,   fixed:false, ks:30, bodyH:14,   dMin:93,  dMax:1320, shiftType:'optical', digitalZoom:false, shiftCurve:null, hMax:24, lumens:5500, fWide:null, fTele:null},
  {id:'ml1050st', name:'Optoma ML1050ST+',           aspectVal:'1.6',        rMin:.80, rMax:.80, sUp:0,  sDn:0,  vOffset:50,  fixed:true,  ks:40, bodyH:9,    dMin:50,  dMax:400,  shiftType:'none',    digitalZoom:false, shiftCurve:null, hMax:0,  lumens:1000, fWide:null, fTele:null},
  // ELPLW05 ≈ ELPLW06 aperture range (F1.8–2.3); ELPLM08 ≈ ELPLM15 (F1.8–2.35)
  {id:'l1050_lw', name:'Epson EB-L1050U + ELPLW05',  aspectVal:'1.6',        rMin:1.04,rMax:1.46,sUp:67, sDn:67, vOffset:0,   fixed:false, ks:30, bodyH:14,   dMin:93,  dMax:1830, shiftType:'optical', digitalZoom:false, shiftCurve:null, hMax:24, lumens:5500, fWide:1.8,  fTele:2.3},
  // NEC NP-P525UL: asymmetric shift — +62/-0 (floor) flips to +0/-62 (ceiling) automatically
  // NEC NP-P525UL: manual pg.142 — "Lower edge of screen with 0%V = Lens center" → vOffset:50.
  // Shift adds 0–62% above that (floor) / 0–62% below (ceiling, auto-flipped).
  {id:'np525ul',  name:'NEC NP-P525UL',              aspectVal:'1.6',        rMin:1.23,rMax:2.00,sUp:62, sDn:0,  vOffset:50,  fixed:false, ks:30, bodyH:13,   dMin:84,  dMax:1830, shiftType:'optical', digitalZoom:false, shiftCurve:null, hMax:24, lumens:5200, fWide:1.5,  fTele:2.1},
  {id:'g6450wu',  name:'Epson EB-G6450WU',           aspectVal:'1.6',        rMin:1.26,rMax:2.30,sUp:67, sDn:67, vOffset:0,   fixed:false, ks:30, bodyH:12,   dMin:93,  dMax:1830, shiftType:'optical', digitalZoom:false, shiftCurve:null, hMax:23, lumens:4500, fWide:1.65, fTele:2.55},
  {id:'tw9000',   name:'Epson EH-TW9000',            aspectVal:'1.77777778', rMin:1.34,rMax:2.87,sUp:96, sDn:96, vOffset:0,   fixed:false, ks:30, bodyH:12,   dMin:200, dMax:1000, shiftType:'optical', digitalZoom:false, shiftCurve:null, hMax:47, lumens:2400, fWide:2.0,  fTele:3.17},
  {id:'l530u',    name:'Epson EB-L530U',             aspectVal:'1.6',        rMin:1.35,rMax:2.20,sUp:50, sDn:50, vOffset:0,   fixed:false, ks:30, bodyH:13.6, dMin:86,  dMax:1780, shiftType:'optical', digitalZoom:false, shiftCurve:null, hMax:24, lumens:5200, fWide:1.5,  fTele:1.7},
  {id:'l690u',    name:'Epson EB-L690U',             aspectVal:'1.6',        rMin:1.35,rMax:2.20,sUp:50, sDn:50, vOffset:0,   fixed:false, ks:30, bodyH:13.6, dMin:86,  dMax:1780, shiftType:'optical', digitalZoom:false, shiftCurve:null, hMax:24, lumens:6500, fWide:1.5,  fTele:1.7},
  // Epson EB-1980WU: spec "Offset 10:1" (10 parts above lens, 1 below) → vOffset = (10−1)/(2×11)×100 = 9/22×100 ≈ 41
  {id:'eb1980wu', name:'Epson EB-1980WU',            aspectVal:'1.6',        rMin:1.38,rMax:2.28,sUp:0,  sDn:0,  vOffset:41,  fixed:false, ks:30, bodyH:12,   dMin:93,  dMax:1830, shiftType:'none',    digitalZoom:false, shiftCurve:null, hMax:0,  lumens:4400, fWide:1.5,  fTele:2.0},
  {id:'l1050_lm', name:'Epson EB-L1050U + ELPLM08',  aspectVal:'1.6',        rMin:1.44,rMax:2.32,sUp:67, sDn:67, vOffset:0,   fixed:false, ks:30, bodyH:14,   dMin:93,  dMax:1830, shiftType:'optical', digitalZoom:false, shiftCurve:null, hMax:24, lumens:5500, fWide:1.8,  fTele:2.35},
];


export const LSVG = `<svg width="12" height="12" viewBox="0 0 10 11" fill="none"><rect x="1" y="5" width="8" height="6" rx="1.2" stroke="currentColor" stroke-width="1.3"/><path d="M3 5V3.5a2 2 0 0 1 4 0V5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
export const USVG = `<svg width="12" height="12" viewBox="0 0 10 11" fill="none"><rect x="1" y="5" width="8" height="6" rx="1.2" stroke="currentColor" stroke-width="1.3"/><path d="M3 5V3.5a2 2 0 0 1 4 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;

export const PERSON_H = 175;

// Aspect ratio display names — keyed by aspectVal string (used in presets)
export const ASPECT_NAMES = {
  '1.77777778': '16:9',
  '1.6':        '16:10',
  '1.33333333': '4:3',
  '2.37037037': '21:9',
};
