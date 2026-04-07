import { S, store } from './state.js';
import { PERSON_H } from './data.js';

const cv  = document.getElementById('cv');
const ctx = cv.getContext('2d');
const dk  = () => {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark')  return true;
  if (t === 'light') return false;
  return matchMedia('(prefers-color-scheme: dark)').matches;
};

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

export function draw(r) {
  const dpr = window.devicePixelRatio || 1;
  const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  if (W < 10 || H < 10) return;

  ctx.clearRect(0, 0, W, H);
  const c = C();
  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);

  const WW = 16*dpr;
  const PL = 74*dpr + WW, PR = 28*dpr, PT = 18*dpr, PB = 24*dpr;
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
  ctx.fillStyle = c.lbl; ctx.font = `${10*dpr}px var(--font-mono)`; ctx.textAlign = 'right';
  ctx.fillText('0 cm',               PL-WW-3*dpr, sy(0)+3*dpr);
  ctx.fillText(`${S.ceilH.toFixed(0)} cm`, PL-WW-3*dpr, sy(S.ceilH)+3*dpr);

  // Wall
  const wTop = sy(S.wallH), wBot = sy(0);
  ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 8*dpr; ctx.shadowOffsetX = 3*dpr;
  ctx.fillStyle = c.wallF; ctx.fillRect(PL-WW, wTop, WW, wBot-wTop);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = c.wallS; ctx.lineWidth = dpr; ctx.strokeRect(PL-WW, wTop, WW, wBot-wTop);
  ctx.fillStyle = c.lbl; ctx.textAlign = 'right'; ctx.font = `${10*dpr}px var(--font-mono)`;
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

  // Sight line (ceiling mode: lens must be above image top; floor mode: lens below image bottom)
  if (!store.floorMode) {
    const sCol = r.aboveSight ? c.sight : c.sightBad;
    ctx.strokeStyle = sCol; ctx.lineWidth = 1.2*dpr; ctx.setLineDash([4*dpr, 4*dpr]);
    ctx.beginPath(); ctx.moveTo(wX, aTY); ctx.lineTo(lX, aTY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(wX, aTY); ctx.lineTo(lX, lY); ctx.stroke();
  } else {
    // Floor mode: draw sight line from image bottom to lens
    const sBY = sy(r.effBot);
    const sCol = r.aboveSight ? c.sight : c.sightBad;
    ctx.strokeStyle = sCol; ctx.lineWidth = 1.2*dpr; ctx.setLineDash([4*dpr, 4*dpr]);
    ctx.beginPath(); ctx.moveTo(wX, sBY); ctx.lineTo(lX, sBY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(wX, sBY); ctx.lineTo(lX, lY); ctx.stroke();
  }


  // Person / shadow check
  if (S.personOn && r.shadowH !== null) {
    const pX    = sx(S.personDist);
    const pBotY = sy(0), pTopY = sy(PERSON_H), pW = 6*dpr;
    ctx.fillStyle = c.person;
    ctx.fillRect(pX-pW/2, pTopY+6*dpr, pW, pBotY-pTopY-6*dpr);
    ctx.beginPath(); ctx.arc(pX, pTopY+4*dpr, 4*dpr, 0, Math.PI*2); ctx.fill();

    const shWY = sy(r.shadowH);
    ctx.strokeStyle = c.shadowC; ctx.lineWidth = dpr; ctx.setLineDash([3*dpr, 2*dpr]);
    ctx.beginPath(); ctx.moveTo(lX, lY); ctx.lineTo(pX, pTopY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(pX, pTopY); ctx.lineTo(wX, shWY); ctx.stroke();
    ctx.fillStyle = c.person; ctx.font = `${9*dpr}px var(--font-mono)`;
    ctx.fillText(`${PERSON_H}cm`, pX+5*dpr, pTopY+3*dpr);
  }

  // Lens-level reference line: horizontal at lens height from wall to projector.
  // Where it crosses the image rectangle shows whether the lens is at top / centre / bottom
  // of the image — makes the built-in vOffset (vertical offset) immediately visible.
  ctx.strokeStyle = c.lens; ctx.lineWidth = 0.7*dpr; ctx.globalAlpha = 0.45;
  ctx.setLineDash([2*dpr, 4*dpr]);
  ctx.beginPath(); ctx.moveTo(wX, lY); ctx.lineTo(lX, lY); ctx.stroke();
  ctx.globalAlpha = 1; ctx.setLineDash([]);

  // Optical axis
  ctx.strokeStyle = c.axis; ctx.lineWidth = 0.8*dpr; ctx.setLineDash([4*dpr, 4*dpr]);
  ctx.beginPath();
  ctx.moveTo(lX, lY); ctx.lineTo(wX, sy(r.tCH));
  ctx.stroke(); ctx.setLineDash([]);

  // Projector mount (rod + body)
  // bW scales proportionally with bH so the box doesn't squish when zooming out
  const bH      = Math.max(S.bodyH*(dH/scH), 10*dpr);
  const bW      = Math.max(bH * 1.6, 14*dpr);
  const tiltRad = S.tiltDeg * Math.PI / 180;

  if (store.floorMode) {
    // Pedestal block from floor up to S.drop (stays vertical — it's fixed to the floor)
    const pedTop = sy(S.drop), pedBot = sy(0), pedH = pedBot - pedTop;
    if (pedH > 1) {
      ctx.fillStyle = c.rod;
      ctx.fillRect(lX - bW*0.4, pedTop, bW*0.8, pedH);
    }
    // Body rotates around the lens pivot
    ctx.save();
    ctx.translate(lX, lY);
    ctx.rotate(tiltRad);
    ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 6*dpr; ctx.shadowOffsetY = -3*dpr;
    ctx.fillStyle = c.proj; ctx.strokeStyle = c.projS; ctx.lineWidth = 1.2*dpr;
    rr(-bW/2, 0, bW, bH, 3*dpr); ctx.fill(); ctx.stroke();
    ctx.shadowColor = 'transparent';
    const legW = 4*dpr, legH = 5*dpr;
    ctx.fillStyle = c.projS;
    ctx.fillRect(-bW/2 + 2*dpr, bH - 1*dpr, legW, legH);
    ctx.fillRect( bW/2 - legW - 2*dpr, bH - 1*dpr, legW, legH);
    ctx.restore();
  } else {
    // Ceiling mount — rod stays vertical, body rotates around lens pivot
    const bTop = lY - bH;
    ctx.fillStyle = c.rod;
    ctx.fillRect(lX-1.5*dpr, sy(S.ceilH), 3*dpr, bTop-sy(S.ceilH));
    ctx.save();
    ctx.translate(lX, lY);
    ctx.rotate(tiltRad);
    ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 6*dpr; ctx.shadowOffsetY = 3*dpr;
    ctx.fillStyle = c.proj; ctx.strokeStyle = c.projS; ctx.lineWidth = 1.2*dpr;
    rr(-bW/2, -bH, bW, bH, 3*dpr); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = c.lens;
  ctx.beginPath(); ctx.arc(lX, lY, 4*dpr, 0, Math.PI*2); ctx.fill();

  // ─── Measurement annotations ───────────────────────────────────────────────
  const aF   = 10*dpr;
  const fmt  = v => (v / 100).toFixed(2) + 'm';
  const dimX = wX - WW;  // wall left edge

  ctx.font = `${aF}px var(--font-mono)`;
  ctx.lineWidth = 0.7*dpr;

  // Image bottom height from floor
  {
    const y = sy(r.effBot);
    ctx.strokeStyle = c.dimB;
    ctx.beginPath(); ctx.moveTo(dimX, y); ctx.lineTo(dimX - 7*dpr, y); ctx.stroke();
    ctx.fillStyle = c.dim; ctx.textAlign = 'right';
    ctx.fillText(fmt(r.effBot), dimX - 9*dpr, y + 3.5*dpr);
  }

  // Image top height from floor
  {
    const y = sy(r.effTop);
    ctx.strokeStyle = c.dimB;
    ctx.beginPath(); ctx.moveTo(dimX, y); ctx.lineTo(dimX - 7*dpr, y); ctx.stroke();
    ctx.fillStyle = c.dim; ctx.textAlign = 'right';
    ctx.fillText(fmt(r.effTop), dimX - 9*dpr, y + 3.5*dpr);
  }

  // Wall gap: label between image top and wall top (only if gap is visible)
  if (r.wallGap > 2 && sy(r.effTop) - sy(S.wallH) > 14*dpr) {
    const midY = (sy(r.effTop) + sy(S.wallH)) / 2;
    ctx.fillStyle = c.wallDim; ctx.textAlign = 'right';
    ctx.fillText('↕ ' + fmt(r.wallGap), dimX - 9*dpr, midY + 3.5*dpr);
  }

  // Lens height on the dashed reference line
  ctx.fillStyle = c.lens; ctx.globalAlpha = 0.8; ctx.textAlign = 'left';
  ctx.fillText(fmt(r.lH), wX + 4*dpr, lY - 3*dpr);
  ctx.globalAlpha = 1;

  // Keystone angle near projector when tilted
  if (r.hasTilt) {
    ctx.fillStyle = r.ksOk ? c.dim : 'rgba(239,68,68,0.9)';
    ctx.textAlign = 'left';
    ctx.fillText(r.ksN.toFixed(1) + '°', lX + 8*dpr, lY - 10*dpr);
  }

  // Throw distance arrow along the bottom margin
  {
    const y  = sy(0) + 6*dpr;
    const mx = (wX + lX) / 2;
    ctx.strokeStyle = c.dimB;
    ctx.beginPath(); ctx.moveTo(wX, y); ctx.lineTo(lX, y); ctx.stroke();
    [[wX, 1], [lX, -1]].forEach(([x, d]) => {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d*5*dpr, y - 3*dpr); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d*5*dpr, y + 3*dpr); ctx.stroke();
    });
    ctx.fillStyle = c.dim; ctx.textAlign = 'center';
    ctx.fillText(fmt(S.dist), mx, y + aF + 1*dpr);
  }

}
