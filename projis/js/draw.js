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

function C(light) {
  const d = light ? false : dk();
  return {
    bg:        d ? '#18181b' : '#ffffff',
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

// Rounded rectangle path helper (uses passed context)
function rr(x, y, w, h, r, xctx) {
  xctx.beginPath();
  xctx.moveTo(x+r, y); xctx.lineTo(x+w-r, y); xctx.quadraticCurveTo(x+w, y, x+w, y+r);
  xctx.lineTo(x+w, y+h-r); xctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  xctx.lineTo(x+r, y+h); xctx.quadraticCurveTo(x, y+h, x, y+h-r);
  xctx.lineTo(x, y+r); xctx.quadraticCurveTo(x, y, x+r, y);
  xctx.closePath();
}

// ─── Core drawing logic ──────────────────────────────────────────────────────
// xctx: canvas 2D context  dpr: pixel ratio  W,H: canvas buffer size
// isPrint: use light-mode colours + print-appropriate font size
function _draw(r, xctx, dpr, W, H, isPrint) {
  xctx.clearRect(0, 0, W, H);
  const c = C(isPrint);
  xctx.fillStyle = c.bg; xctx.fillRect(0, 0, W, H);

  // Font size: scales with canvas width so labels stay proportional at every size.
  // Print: 18pt at 96 dpi = 24 CSS px; at dpr=2 → 48 canvas px on an 840px-wide canvas.
  // Screen: same formula — ~24pt equivalent across window sizes.
  const cssW  = W / dpr;                                // logical canvas width
  const fSz   = (isPrint
    ? Math.round(24 * dpr)                              // 18pt at 96 dpi
    : Math.max(18, Math.round(cssW / 27)) * dpr) * 1.5; // 50% larger drawing measurements

  const WW = 16*dpr;
  const PL = 54*dpr + WW;
  const PR = (isPrint ? 34 : 50) * dpr;
  const PT = 18*dpr, PB = 24*dpr;
  const dW = W - PL - PR, dH = H - PT - PB;

  const roomW = S.viewW;
  // Scale the drawing from the actual scene top instead of a fixed 60 cm buffer.
  // This keeps the ceiling line visually aligned with the full-height sidebar
  // while still leaving a small amount of space for labels and projector body.
  const sceneTop = Math.max(
    S.ceilH,
    S.wallH,
    r.effTop,
    r.effNatTop ?? 0,
    r.lH + (store.floorMode ? S.bodyH * 0.5 : 0),
    r.tCH ?? 0,
    S.personOn ? PERSON_H : 0,
    r.shadowH ?? 0,
  );
  const scH   = sceneTop + 24;
  const sx = m => PL + m * (dW / roomW);
  const sy = m => H - PB - m * (dH / scH);
  const wX = PL, lX = sx(S.dist), lY = sy(r.lH);

  // Grid
  xctx.strokeStyle = c.grid; xctx.lineWidth = dpr;
  for (let x = 0; x <= Math.max(roomW, S.dist+100); x += 100) {
    xctx.beginPath(); xctx.moveTo(sx(x), PT); xctx.lineTo(sx(x), H-PB); xctx.stroke();
  }
  for (let y = 0; y <= scH; y += 50) {
    xctx.beginPath(); xctx.moveTo(0, sy(y)); xctx.lineTo(W, sy(y)); xctx.stroke();
  }

  // Floor gradient
  const floorGrad = xctx.createLinearGradient(0, sy(0), 0, H);
  floorGrad.addColorStop(0, c.floor); floorGrad.addColorStop(1, c.floorFade);
  xctx.fillStyle = floorGrad;
  xctx.fillRect(0, sy(0), W, H-sy(0));

  // Ceiling line
  xctx.fillStyle = c.floor;
  xctx.fillRect(0, sy(S.ceilH)-2*dpr, W, 2*dpr);

  // Wall
  const wTop = sy(S.wallH), wBot = sy(0);
  xctx.shadowColor = 'rgba(0,0,0,0.15)'; xctx.shadowBlur = 8*dpr; xctx.shadowOffsetX = 3*dpr;
  xctx.fillStyle = c.wallF; xctx.fillRect(PL-WW, wTop, WW, wBot-wTop);
  xctx.shadowColor = 'transparent';
  xctx.strokeStyle = c.wallS; xctx.lineWidth = dpr; xctx.strokeRect(PL-WW, wTop, WW, wBot-wTop);

  // Height labels — left of wall, right-aligned
  const hfmt = v => (v / 100).toFixed(1) + 'm';
  xctx.fillStyle = c.lbl; xctx.font = `${fSz}px var(--font-mono)`; xctx.textAlign = 'right';
  xctx.fillText(hfmt(0),       PL-WW-3*dpr, sy(0)+3*dpr);
  xctx.fillText(hfmt(S.ceilH), PL-WW-3*dpr, sy(S.ceilH)+3*dpr);
  xctx.fillText(hfmt(S.wallH), PL-WW-3*dpr, wTop+fSz);

  const iSW = Math.round(Math.min(isPrint ? 4 : 8, (W/dpr) * 0.015)) * dpr;

  // Black light (native panel — only when letterboxed or pillared)
  if (r.isLetterboxed || r.isPillared) {
    xctx.fillStyle = c.beamNat;
    xctx.beginPath();
    xctx.moveTo(lX, lY); xctx.lineTo(wX, sy(r.effNatTop)); xctx.lineTo(wX, sy(r.effNatBot));
    xctx.closePath(); xctx.fill();
    xctx.strokeStyle = c.imgNatS; xctx.lineWidth = dpr; xctx.setLineDash([3*dpr, 3*dpr]);
    xctx.strokeRect(wX, sy(r.effNatTop), iSW, sy(r.effNatBot)-sy(r.effNatTop));
    xctx.beginPath(); xctx.moveTo(lX, lY); xctx.lineTo(wX, sy(r.effNatTop)); xctx.stroke();
    xctx.beginPath(); xctx.moveTo(lX, lY); xctx.lineTo(wX, sy(r.effNatBot)); xctx.stroke();
    xctx.setLineDash([]);
  }

  // Active media beam
  const aTY = sy(r.effTop), aBY = sy(r.effBot);
  const bad = r.effTop > S.wallH || r.effBot < 0;

  xctx.globalCompositeOperation = (!isPrint && dk()) ? 'screen' : 'multiply';
  const beamGrad = xctx.createLinearGradient(lX, lY, wX, (aTY+aBY)/2);
  beamGrad.addColorStop(0, bad ? 'rgba(239,68,68,0.15)' : c.beamMedia);
  beamGrad.addColorStop(1, bad ? 'rgba(239,68,68,0.05)' : c.beamNat);
  xctx.fillStyle = beamGrad;
  xctx.beginPath(); xctx.moveTo(lX, lY); xctx.lineTo(wX, aTY); xctx.lineTo(wX, aBY);
  xctx.closePath(); xctx.fill();
  xctx.globalCompositeOperation = 'source-over';

  // Wall glow
  const wallGlow = xctx.createLinearGradient(wX, 0, wX+iSW*1.5, 0);
  wallGlow.addColorStop(0, bad ? 'rgba(239,68,68,0.5)' : c.beamMedia);
  wallGlow.addColorStop(1, 'transparent');
  xctx.fillStyle = wallGlow; xctx.fillRect(wX, aTY, iSW*1.5, aBY-aTY);

  xctx.strokeStyle = bad ? '#dc2626' : c.imgMediaS; xctx.lineWidth = 1.2*dpr;
  xctx.strokeRect(wX, aTY, iSW, aBY-aTY);
  xctx.beginPath(); xctx.moveTo(lX, lY); xctx.lineTo(wX, aTY); xctx.stroke();
  xctx.beginPath(); xctx.moveTo(lX, lY); xctx.lineTo(wX, aBY); xctx.stroke();

  // Sight line (ceiling mode: lens must be above image top; floor mode: lens below image bottom)
  if (!store.floorMode) {
    const sCol = r.aboveSight ? c.sight : c.sightBad;
    xctx.strokeStyle = sCol; xctx.lineWidth = 1.2*dpr; xctx.setLineDash([4*dpr, 4*dpr]);
    xctx.beginPath(); xctx.moveTo(wX, aTY); xctx.lineTo(lX, aTY); xctx.stroke();
    xctx.setLineDash([]);
    xctx.beginPath(); xctx.moveTo(wX, aTY); xctx.lineTo(lX, lY); xctx.stroke();
  } else {
    const sBY = sy(r.effBot);
    const sCol = r.aboveSight ? c.sight : c.sightBad;
    xctx.strokeStyle = sCol; xctx.lineWidth = 1.2*dpr; xctx.setLineDash([4*dpr, 4*dpr]);
    xctx.beginPath(); xctx.moveTo(wX, sBY); xctx.lineTo(lX, sBY); xctx.stroke();
    xctx.setLineDash([]);
    xctx.beginPath(); xctx.moveTo(wX, sBY); xctx.lineTo(lX, lY); xctx.stroke();
  }

  // Person / shadow check
  if (S.personOn && r.shadowH !== null) {
    const pX    = sx(S.personDist);
    const pBotY = sy(0), pTopY = sy(PERSON_H), pW = 6*dpr;
    xctx.fillStyle = c.person;
    // Head
    xctx.beginPath(); xctx.arc(pX, pTopY+4*dpr, 4*dpr, 0, Math.PI*2); xctx.fill();
    // Eyes
    xctx.fillStyle = '#ffffff';
    xctx.beginPath(); xctx.arc(pX - 1.5*dpr, pTopY+2*dpr, 0.8*dpr, 0, Math.PI*2); xctx.fill();
    xctx.beginPath(); xctx.arc(pX + 1.5*dpr, pTopY+2*dpr, 0.8*dpr, 0, Math.PI*2); xctx.fill();
    // Pupils
    xctx.fillStyle = '#000000';
    xctx.beginPath(); xctx.arc(pX - 1.5*dpr, pTopY+2*dpr, 0.4*dpr, 0, Math.PI*2); xctx.fill();
    xctx.beginPath(); xctx.arc(pX + 1.5*dpr, pTopY+2*dpr, 0.4*dpr, 0, Math.PI*2); xctx.fill();
    // Smile
    xctx.strokeStyle = '#000000'; xctx.lineWidth = 0.5*dpr;
    xctx.beginPath(); xctx.arc(pX, pTopY+4*dpr, 2*dpr, 0, Math.PI); xctx.stroke();
    // Body
    xctx.fillStyle = c.person;
    xctx.fillRect(pX-pW/2, pTopY+8*dpr, pW, 40*dpr);
    // Arms
    xctx.strokeStyle = c.person; xctx.lineWidth = 1.5*dpr;
    xctx.beginPath(); xctx.moveTo(pX - pW/2, pTopY+12*dpr); xctx.lineTo(pX - pW, pTopY+20*dpr); xctx.stroke();
    xctx.beginPath(); xctx.moveTo(pX + pW/2, pTopY+12*dpr); xctx.lineTo(pX + pW, pTopY+20*dpr); xctx.stroke();
    // Legs
    xctx.beginPath(); xctx.moveTo(pX - pW/4, pTopY+48*dpr); xctx.lineTo(pX - pW/4, pBotY); xctx.stroke();
    xctx.beginPath(); xctx.moveTo(pX + pW/4, pTopY+48*dpr); xctx.lineTo(pX + pW/4, pBotY); xctx.stroke();

    const shWY = sy(r.shadowH);
    xctx.strokeStyle = c.shadowC; xctx.lineWidth = dpr; xctx.setLineDash([3*dpr, 2*dpr]);
    xctx.beginPath(); xctx.moveTo(lX, lY); xctx.lineTo(pX, pTopY); xctx.stroke();
    xctx.setLineDash([]);
    xctx.beginPath(); xctx.moveTo(pX, pTopY); xctx.lineTo(wX, shWY); xctx.stroke();
    xctx.fillStyle = c.person; xctx.font = `${fSz}px var(--font-mono)`;
    xctx.fillText(`${PERSON_H}cm`, pX+5*dpr, pTopY+3*dpr);
  }

  // Lens-level reference line
  xctx.strokeStyle = c.lens; xctx.lineWidth = 0.7*dpr; xctx.globalAlpha = 0.45;
  xctx.setLineDash([2*dpr, 4*dpr]);
  xctx.beginPath(); xctx.moveTo(wX, lY); xctx.lineTo(lX, lY); xctx.stroke();
  xctx.globalAlpha = 1; xctx.setLineDash([]);

  // Optical axis
  xctx.strokeStyle = c.axis; xctx.lineWidth = 0.8*dpr; xctx.setLineDash([4*dpr, 4*dpr]);
  xctx.beginPath();
  xctx.moveTo(lX, lY); xctx.lineTo(wX, sy(r.tCH));
  xctx.stroke(); xctx.setLineDash([]);

  // Projector mount (rod + body)
  const bH      = Math.max(S.bodyH*(dH/scH), 10*dpr);
  const bW      = Math.max(bH * 1.6, 14*dpr);
  const tiltRad = S.tiltDeg * Math.PI / 180;

  if (store.floorMode) {
    const pedBot = sy(0), pedH = pedBot - lY;
    if (pedH > 1) {
      xctx.fillStyle = c.rod;
      xctx.fillRect(lX + bW*0.1, lY, bW*0.8, pedH);
    }
    xctx.save();
    xctx.translate(lX, lY);
    xctx.rotate(-tiltRad);
    xctx.shadowColor = 'rgba(0,0,0,0.2)'; xctx.shadowBlur = 6*dpr; xctx.shadowOffsetY = -3*dpr;
    xctx.fillStyle = c.proj; xctx.strokeStyle = c.projS; xctx.lineWidth = 1.2*dpr;
    rr(0, -bH/2, bW, bH, 3*dpr, xctx); xctx.fill(); xctx.stroke();
    xctx.shadowColor = 'transparent';
    const legW = 4*dpr, legH = 5*dpr;
    xctx.fillStyle = c.projS;
    xctx.fillRect(2*dpr, bH/2 - 1*dpr, legW, legH);
    xctx.fillRect(bW - legW - 2*dpr, bH/2 - 1*dpr, legW, legH);
    xctx.restore();
  } else {
    xctx.fillStyle = c.rod;
    xctx.fillRect(lX + bW/2 - 1.5*dpr, sy(S.ceilH), 3*dpr, lY - sy(S.ceilH));
    xctx.save();
    xctx.translate(lX, lY);
    xctx.rotate(-tiltRad);
    xctx.shadowColor = 'rgba(0,0,0,0.2)'; xctx.shadowBlur = 6*dpr; xctx.shadowOffsetY = 3*dpr;
    xctx.fillStyle = c.proj; xctx.strokeStyle = c.projS; xctx.lineWidth = 1.2*dpr;
    rr(0, -bH/2, bW, bH, 3*dpr, xctx); xctx.fill(); xctx.stroke();
    xctx.restore();
  }
  xctx.shadowColor = 'transparent';
  xctx.fillStyle = c.lens;
  xctx.beginPath(); xctx.arc(lX, lY, 4*dpr, 0, Math.PI*2); xctx.fill();

  // ─── Measurement annotations ───────────────────────────────────────────────
  const aF   = fSz;
  const fmt  = v => (v / 100).toFixed(1) + 'm';
  const dimX = wX - WW;

  xctx.font = `${aF}px var(--font-mono)`;
  xctx.lineWidth = 0.7*dpr;

  // Image bottom height from floor
  {
    const y = sy(r.effBot);
    xctx.strokeStyle = c.dimB;
    xctx.beginPath(); xctx.moveTo(dimX, y); xctx.lineTo(dimX - 7*dpr, y); xctx.stroke();
    xctx.fillStyle = c.dim; xctx.textAlign = 'right';
    xctx.fillText(fmt(r.effBot), dimX - 9*dpr, y + 3.5*dpr);
  }

  // Image top height from floor
  {
    const y = sy(r.effTop);
    xctx.strokeStyle = c.dimB;
    xctx.beginPath(); xctx.moveTo(dimX, y); xctx.lineTo(dimX - 7*dpr, y); xctx.stroke();
    xctx.fillStyle = c.dim; xctx.textAlign = 'right';
    xctx.fillText(fmt(r.effTop), dimX - 9*dpr, y + 3.5*dpr);
  }

  // Wall gap label
  if (r.wallGap > 2 && sy(r.effTop) - sy(S.wallH) > 14*dpr) {
    const midY = (sy(r.effTop) + sy(S.wallH)) / 2;
    xctx.fillStyle = c.wallDim; xctx.textAlign = 'right';
    xctx.fillText('↕ ' + fmt(r.wallGap), dimX - 9*dpr, midY + 3.5*dpr);
  }

  // Lens height on the dashed reference line
  xctx.fillStyle = c.lens; xctx.globalAlpha = 0.8; xctx.textAlign = 'left';
  xctx.fillText(fmt(r.lH), wX + 4*dpr, lY - 3*dpr);
  xctx.globalAlpha = 1;

  // Keystone angle near projector when tilted
  if (r.hasTilt) {
    xctx.fillStyle = r.ksOk ? c.dim : 'rgba(239,68,68,0.9)';
    xctx.textAlign = 'left';
    xctx.fillText(r.ksN.toFixed(1) + '°', lX + 8*dpr, lY - 10*dpr);
  }

  // Throw distance arrow along the bottom margin
  {
    const y  = sy(0) + 6*dpr;
    const mx = (wX + lX) / 2;
    xctx.strokeStyle = c.dimB;
    xctx.beginPath(); xctx.moveTo(wX, y); xctx.lineTo(lX, y); xctx.stroke();
    [[wX, 1], [lX, -1]].forEach(([x, d]) => {
      xctx.beginPath(); xctx.moveTo(x, y); xctx.lineTo(x + d*5*dpr, y - 3*dpr); xctx.stroke();
      xctx.beginPath(); xctx.moveTo(x, y); xctx.lineTo(x + d*5*dpr, y + 3*dpr); xctx.stroke();
    });
    xctx.fillStyle = c.dim; xctx.textAlign = 'center';
    xctx.fillText(fmt(S.dist), mx, y + aF + 1*dpr);
  }

  // Person distance arrow along the bottom margin
  if (S.personOn) {
    const pX = sx(S.personDist);
    const y  = sy(0) + 6*dpr;
    const mx = (wX + pX) / 2;
    xctx.strokeStyle = c.dimB;
    xctx.beginPath(); xctx.moveTo(wX, y); xctx.lineTo(pX, y); xctx.stroke();
    [[wX, 1], [pX, -1]].forEach(([x, d]) => {
      xctx.beginPath(); xctx.moveTo(x, y); xctx.lineTo(x + d*5*dpr, y - 3*dpr); xctx.stroke();
      xctx.beginPath(); xctx.moveTo(x, y); xctx.lineTo(x + d*5*dpr, y + 3*dpr); xctx.stroke();
    });
    xctx.fillStyle = c.dim; xctx.textAlign = 'center';
    xctx.fillText(fmt(S.personDist), mx, y + aF + 1*dpr);
  }

  // Vertical dimension annotations in right margin
  {
    const rx = W - PR + 10*dpr;
    xctx.strokeStyle = c.dimB; xctx.lineWidth = 0.7*dpr;
    xctx.fillStyle = c.dim; xctx.font = `${aF}px var(--font-mono)`; xctx.textAlign = 'left';

    if (lY < sy(0) - 4*dpr) {
      const y0 = sy(0), y1 = lY;
      xctx.beginPath(); xctx.moveTo(rx, y0); xctx.lineTo(rx, y1); xctx.stroke();
      [y0, y1].forEach(y => {
        xctx.beginPath(); xctx.moveTo(rx - 4*dpr, y); xctx.lineTo(rx + 4*dpr, y); xctx.stroke();
      });
      xctx.fillText(fmt(r.lH), rx + 6*dpr, (y0 + y1) / 2 + 3.5*dpr);
    }

    if (sy(S.ceilH) < lY - 4*dpr) {
      const y0 = sy(S.ceilH), y1 = lY;
      xctx.beginPath(); xctx.moveTo(rx, y0); xctx.lineTo(rx, y1); xctx.stroke();
      [y0, y1].forEach(y => {
        xctx.beginPath(); xctx.moveTo(rx - 4*dpr, y); xctx.lineTo(rx + 4*dpr, y); xctx.stroke();
      });
      xctx.fillText(fmt(S.ceilH - r.lH), rx + 6*dpr, (y0 + y1) / 2 + 3.5*dpr);
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function draw(r) {
  const dpr = window.devicePixelRatio || 1;
  const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  if (W < 10 || H < 10) return;
  _draw(r, ctx, dpr, W, H, false);
}

// Redraws the diagram on the existing canvas in print/light mode.
// Target: A4 landscape ratio (297:210).
// Base size: 840 × ~594 CSS pixels at 2x -> 1680 × ~1188 px buffer.
// Call from beforeprint; afterprint should call draw(r) to restore screen state.
export function drawForPrint(r) {
  const dpr = 2;
  const W = 840 * dpr, H = Math.round(840 * dpr * (210 / 297));
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  _draw(r, ctx, dpr, W, H, true);
}
