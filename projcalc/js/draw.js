import { S } from './state.js';
import { PERSON_H } from './data.js';

const cv  = document.getElementById('cv');
const ctx = cv.getContext('2d');
const dk  = () => matchMedia('(prefers-color-scheme: dark)').matches;

function C() {
  const d = dk();
  return {
    bg:        d ? '#18181b'               : '#ffffff',
    grid:      d ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)',
    floor:     d ? '#27272a'               : '#e4e4e7',
    floorFade: d ? '#18181b'               : '#ffffff',
    wallF:     d ? '#1e2840'               : '#e0e7ff',
    wallS:     d ? '#314168'               : '#a5b4fc',
    beamMedia: d ? 'rgba(96,165,250,.25)'  : 'rgba(59,130,246,.22)',
    beamNat:   d ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)',
    imgMediaS: d ? '#60a5fa'               : '#3b82f6',
    imgNatS:   d ? '#71717a'               : '#a1a1aa',
    sight:     d ? 'rgba(251,191,36,.6)'   : 'rgba(245,158,11,.6)',
    sightBad:  'rgba(239,68,68,.7)',
    proj:      d ? '#27272a'               : '#f4f4f5',
    projS:     d ? '#52525b'               : '#a1a1aa',
    rod:       d ? '#52525b'               : '#d4d4d8',
    lens:      d ? '#60a5fa'               : '#2563eb',
    axis:      d ? 'rgba(96,165,250,.25)'  : 'rgba(59,130,246,.25)',
    dim:       d ? '#71717a'               : '#71717a',
    dimB:      d ? '#52525b'               : '#52525b',
    lbl:       d ? '#a1a1aa'               : '#71717a',
    wallDim:   d ? 'rgba(52,211,153,.7)'   : 'rgba(16,185,129,.7)',
    person:    d ? '#4ade80'               : '#16a34a',
    shadowC:   d ? 'rgba(248,113,113,.3)'  : 'rgba(239,68,68,.2)',
  };
}

// Rounded rectangle path helper
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// Vertical dimension line with label
function dimV(x, y1, y2, lbl, col, d, side) {
  if (Math.abs(y2 - y1) < 3) return;
  const tk = 3*d;
  ctx.strokeStyle = col; ctx.lineWidth = 0.6*d;
  ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x-tk, y1); ctx.lineTo(x+tk, y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x-tk, y2); ctx.lineTo(x+tk, y2); ctx.stroke();
  ctx.fillStyle = col; ctx.font = `${8*d}px var(--font-mono)`;
  if (side === 'r') { ctx.textAlign = 'left';  ctx.fillText(lbl, x+5*d,  (y1+y2)/2+3*d); }
  else              { ctx.textAlign = 'right'; ctx.fillText(lbl, x-5*d, (y1+y2)/2+3*d); }
}

export function draw(r) {
  const dpr = window.devicePixelRatio || 1;
  const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  if (W < 10 || H < 10) return;

  ctx.clearRect(0, 0, W, H);
  const c = C();
  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);

  const WW = 16*dpr;
  const PL = 90*dpr + WW, PR = 110*dpr, PT = 24*dpr, PB = 34*dpr;
  const dW = W - PL - PR, dH = H - PT - PB;

  const roomW = S.viewW;
  const scH   = Math.max(S.ceilH, S.wallH) + 60;
  const sx = m => PL + m * (dW / roomW);
  const sy = m => H - PB - m * (dH / scH);
  const wX = PL, lX = sx(S.dist), lY = sy(r.lH);

  // Grid
  ctx.strokeStyle = c.grid; ctx.lineWidth = dpr;
  for (let x = 0; x <= Math.max(roomW, S.dist+100); x += 100) {
    ctx.beginPath(); ctx.moveTo(sx(x), PT); ctx.lineTo(sx(x), H-PB); ctx.stroke();
  }
  for (let y = 0; y <= scH; y += 50) {
    ctx.beginPath(); ctx.moveTo(PL-WW, sy(y)); ctx.lineTo(W, sy(y)); ctx.stroke();
  }

  // Floor gradient
  const floorGrad = ctx.createLinearGradient(0, sy(0), 0, H);
  floorGrad.addColorStop(0, c.floor); floorGrad.addColorStop(1, c.floorFade);
  ctx.fillStyle = floorGrad;
  ctx.fillRect(PL-WW, sy(0), W-(PL-WW), H-sy(0));

  // Ceiling line
  ctx.fillStyle = c.floor;
  ctx.fillRect(PL-WW, sy(S.ceilH)-2*dpr, W-(PL-WW), 2*dpr);

  // Height labels
  ctx.fillStyle = c.lbl; ctx.font = `${8*dpr}px var(--font-mono)`; ctx.textAlign = 'right';
  ctx.fillText('0 cm',               PL-WW-3*dpr, sy(0)+3*dpr);
  ctx.fillText(`${S.ceilH.toFixed(0)} cm`, PL-WW-3*dpr, sy(S.ceilH)+3*dpr);

  // Wall
  const wTop = sy(S.wallH), wBot = sy(0);
  ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 8*dpr; ctx.shadowOffsetX = 3*dpr;
  ctx.fillStyle = c.wallF; ctx.fillRect(PL-WW, wTop, WW, wBot-wTop);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = c.wallS; ctx.lineWidth = dpr; ctx.strokeRect(PL-WW, wTop, WW, wBot-wTop);
  ctx.fillStyle = c.lbl; ctx.textAlign = 'right'; ctx.font = `${8*dpr}px var(--font-mono)`;
  ctx.fillText(`${S.wallH.toFixed(0)} cm`, PL-WW-3*dpr, wTop+5*dpr);

  const iSW = 8*dpr;

  // Black light (native panel — only when letterboxed or pillared)
  if (r.isLetterboxed || r.isPillared) {
    ctx.fillStyle = c.beamNat;
    ctx.beginPath();
    ctx.moveTo(lX, lY); ctx.lineTo(wX, sy(r.effNatTop)); ctx.lineTo(wX, sy(r.effNatBot));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.imgNatS; ctx.lineWidth = dpr; ctx.setLineDash([3*dpr, 3*dpr]);
    ctx.strokeRect(wX, sy(r.effNatTop), iSW, sy(r.effNatBot)-sy(r.effNatTop));
    ctx.beginPath(); ctx.moveTo(lX, lY); ctx.lineTo(wX, sy(r.effNatTop)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lX, lY); ctx.lineTo(wX, sy(r.effNatBot)); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Active media beam
  const aTY = sy(r.effTop), aBY = sy(r.effBot);
  const bad = r.effTop > S.wallH || r.effBot < 0;

  ctx.globalCompositeOperation = dk() ? 'screen' : 'multiply';
  const beamGrad = ctx.createLinearGradient(lX, lY, wX, (aTY+aBY)/2);
  beamGrad.addColorStop(0, bad ? 'rgba(239,68,68,0.15)' : c.beamMedia);
  beamGrad.addColorStop(1, bad ? 'rgba(239,68,68,0.05)' : c.beamNat);
  ctx.fillStyle = beamGrad;
  ctx.beginPath(); ctx.moveTo(lX, lY); ctx.lineTo(wX, aTY); ctx.lineTo(wX, aBY);
  ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Wall glow
  const wallGlow = ctx.createLinearGradient(wX, 0, wX+iSW*1.5, 0);
  wallGlow.addColorStop(0, bad ? 'rgba(239,68,68,0.5)' : c.beamMedia);
  wallGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = wallGlow; ctx.fillRect(wX, aTY, iSW*1.5, aBY-aTY);

  ctx.strokeStyle = bad ? '#dc2626' : c.imgMediaS; ctx.lineWidth = 1.2*dpr;
  ctx.strokeRect(wX, aTY, iSW, aBY-aTY);
  ctx.beginPath(); ctx.moveTo(lX, lY); ctx.lineTo(wX, aTY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lX, lY); ctx.lineTo(wX, aBY); ctx.stroke();

  // Sight line
  const sCol = r.aboveSight ? c.sight : c.sightBad;
  ctx.strokeStyle = sCol; ctx.lineWidth = 1.2*dpr; ctx.setLineDash([4*dpr, 4*dpr]);
  ctx.beginPath(); ctx.moveTo(wX, aTY); ctx.lineTo(lX, aTY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(wX, aTY); ctx.lineTo(lX, lY); ctx.stroke();
  const annotX = lX - 16*dpr, annotY = (lY+aTY)/2;
  ctx.fillStyle = sCol; ctx.font = `${8*dpr}px var(--font-mono)`; ctx.textAlign = 'right';
  ctx.fillText(
    `${(r.lH-r.effTop) >= 0 ? '+' : ''}${(r.lH-r.effTop).toFixed(0)}cm`,
    annotX, annotY+3*dpr
  );

  // Left dimension lines
  if (Math.abs(wTop - aTY) > 4*dpr) {
    const gapCol = r.wallGap > 0 ? c.wallDim : '#dc2626';
    dimV(
      PL-WW-46*dpr,
      Math.min(wTop, aTY), Math.max(wTop, aTY),
      `${r.wallGap > 0 ? '+' : ''}${Math.abs(r.wallGap).toFixed(1)}cm`,
      gapCol, dpr, 'l'
    );
  }
  dimV(PL-WW-68*dpr, aTY, aBY, `${r.mediaH.toFixed(1)}cm`, c.dim, dpr, 'l');

  // Person / shadow check
  if (S.personOn && S.personDist > 0 && S.personDist < S.dist) {
    const pX    = sx(S.personDist);
    const pBotY = sy(0), pTopY = sy(PERSON_H), pW = 6*dpr;
    ctx.fillStyle = c.person;
    ctx.fillRect(pX-pW/2, pTopY+6*dpr, pW, pBotY-pTopY-6*dpr);
    ctx.beginPath(); ctx.arc(pX, pTopY+4*dpr, 4*dpr, 0, Math.PI*2); ctx.fill();

    const t    = S.dist / (S.dist - S.personDist);
    const shWY = lY + (sy(PERSON_H) - lY) * t;
    ctx.strokeStyle = c.shadowC; ctx.lineWidth = dpr; ctx.setLineDash([3*dpr, 2*dpr]);
    ctx.beginPath(); ctx.moveTo(lX, lY); ctx.lineTo(pX, pTopY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(pX, pTopY); ctx.lineTo(wX, shWY); ctx.stroke();
    ctx.fillStyle = c.person; ctx.font = `${7.5*dpr}px var(--font-mono)`;
    ctx.fillText(`${PERSON_H}cm`, pX+5*dpr, pTopY+3*dpr);
  }

  // Optical axis
  ctx.strokeStyle = c.axis; ctx.lineWidth = 0.8*dpr; ctx.setLineDash([4*dpr, 4*dpr]);
  ctx.beginPath();
  ctx.moveTo(lX, lY); ctx.lineTo(wX, sy(r.tCH));
  ctx.stroke(); ctx.setLineDash([]);

  // Projector mount (rod + body)
  const bH   = Math.max(S.bodyH*(dH/scH), 10*dpr), bW = 24*dpr, bTop = lY - bH;
  ctx.fillStyle = c.rod;
  ctx.fillRect(lX-1.5*dpr, sy(S.ceilH), 3*dpr, bTop-sy(S.ceilH));
  ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 6*dpr; ctx.shadowOffsetY = 3*dpr;
  ctx.fillStyle = c.proj; ctx.strokeStyle = c.projS; ctx.lineWidth = 1.2*dpr;
  rr(lX-bW/2, bTop, bW, bH, 3*dpr); ctx.fill(); ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = c.lens;
  ctx.beginPath(); ctx.arc(lX, lY, 4*dpr, 0, Math.PI*2); ctx.fill();

  // Right dimension lines (lens height + drop)
  const dX1 = lX + 16*dpr, dX2 = lX + 50*dpr;
  dimV(dX1, sy(0),       lY,         `${r.lH.toFixed(1)} cm`,   c.dim,  dpr, 'r');
  dimV(dX2, sy(S.ceilH), lY,         `${r.drop.toFixed(1)} cm`, c.dimB, dpr, 'r');
  ctx.strokeStyle = c.dim; ctx.lineWidth = 0.5*dpr; ctx.setLineDash([2*dpr, 3*dpr]);
  ctx.beginPath(); ctx.moveTo(lX+6*dpr, lY);         ctx.lineTo(dX1-3*dpr, lY);         ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lX+6*dpr, sy(S.ceilH)); ctx.lineTo(dX2-3*dpr, sy(S.ceilH)); ctx.stroke();
  ctx.setLineDash([]);

  // Throw distance label
  ctx.fillStyle = c.lbl; ctx.font = `${8.5*dpr}px var(--font-mono)`; ctx.textAlign = 'center';
  ctx.fillText(`◄ ${S.dist.toFixed(0)} cm throw ►`, sx(S.dist/2), H-PB+18*dpr);
}
