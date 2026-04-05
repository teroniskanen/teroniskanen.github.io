// --- Projector & Room Data ---

export const PRESETS = [
  {id:'eb800f',   name:'Epson EB-800F',              aspectVal:'1.77777778', rMin:.27, rMax:.37, sUp:0,  sDn:0,  fixed:false, ks:30, bodyH:10},
  {id:'ehls100',  name:'Epson EH-LS100',             aspectVal:'1.6',        rMin:.27, rMax:.27, sUp:0,  sDn:0,  fixed:true,  ks:30, bodyH:10},
  {id:'gt1080e',  name:'Optoma GT1080e',             aspectVal:'1.77777778', rMin:.49, rMax:.49, sUp:0,  sDn:0,  fixed:true,  ks:40, bodyH:9},
  {id:'zh450st',  name:'Optoma ZH450ST',             aspectVal:'1.77777778', rMin:.50, rMax:.50, sUp:0,  sDn:0,  fixed:true,  ks:40, bodyH:9},
  {id:'l1050_lu', name:'Epson EB-L1050U + ELPLU03S', aspectVal:'1.6',        rMin:.65, rMax:.78, sUp:67, sDn:67, fixed:false, ks:30, bodyH:14},
  {id:'ml1050st', name:'Optoma ML1050ST+',           aspectVal:'1.6',        rMin:.80, rMax:.80, sUp:0,  sDn:0,  fixed:true,  ks:40, bodyH:9},
  {id:'l1050_lw', name:'Epson EB-L1050U + ELPLW05',  aspectVal:'1.6',        rMin:1.04,rMax:1.46,sUp:67, sDn:67, fixed:false, ks:30, bodyH:14},
  {id:'np525ul',  name:'NEC NP-P525UL',              aspectVal:'1.6',        rMin:1.23,rMax:2.00,sUp:62, sDn:0,  fixed:false, ks:30, bodyH:13},
  {id:'g6450wu',  name:'Epson EB-G6450WU',           aspectVal:'1.6',        rMin:1.26,rMax:2.30,sUp:67, sDn:67, fixed:false, ks:30, bodyH:12},
  {id:'tw9000',   name:'Epson EH-TW9000',            aspectVal:'1.77777778', rMin:1.34,rMax:2.87,sUp:96, sDn:96, fixed:false, ks:30, bodyH:12},
  {id:'l530u',    name:'Epson EB-L530U',             aspectVal:'1.6',        rMin:1.35,rMax:2.20,sUp:50, sDn:50, fixed:false, ks:30, bodyH:13.6},
  {id:'l690u',    name:'Epson EB-L690U',             aspectVal:'1.6',        rMin:1.35,rMax:2.20,sUp:50, sDn:50, fixed:false, ks:30, bodyH:13.6},
  {id:'eb1980wu', name:'Epson EB-1980WU',            aspectVal:'1.6',        rMin:1.38,rMax:2.28,sUp:0,  sDn:0,  fixed:false, ks:30, bodyH:12},
  {id:'l1050_lm', name:'Epson EB-L1050U + ELPLM08',  aspectVal:'1.6',        rMin:1.44,rMax:2.32,sUp:67, sDn:67, fixed:false, ks:30, bodyH:14},
];

export const DEFAULT_ROOMS = [
  {name:'Stage 5m',  viewW:600, ceilH:500, wallH:300, dist:600, posType:'bottom', targetH:80},
  {name:'Classroom', viewW:500, ceilH:300, wallH:300, dist:500, posType:'bottom', targetH:90},
  {name:'Conference',viewW:400, ceilH:280, wallH:280, dist:350, posType:'bottom', targetH:70},
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
