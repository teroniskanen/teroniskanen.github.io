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
    wallDim:   d ? 'rgba(74,222,128,.7)'   : 'rgba(34,197,94,.7)',
    person:    d ? '#4ade80'               : '#22c55e',
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
  // Mobile: the drawing area is much narrower (sidebar eats most of the viewport width),
  // so triple would overflow/collide — keep the more modest 1.5x bump there instead.
  const isMobile = !isPrint && matchMedia('(max-width: 600px)').matches;
  const sizeMult = isPrint ? 1.5 : (isMobile ? 1.5 : 3);  // triple on desktop; unchanged for print
  const fSz   = (isPrint
    ? Math.round(24 * dpr)                              // 18pt at 96 dpi
    : Math.max(18, Math.round(cssW / 27)) * dpr) * sizeMult;

  const WW = 16*dpr;
  const PL = 54*dpr + WW;
  const PR = (isPrint ? 34 : 50) * dpr;
  const PT = 18*dpr, PB = 24*dpr;
  const dW = W - PL - PR, dH = H - PT - PB;

  const roomW = S.viewW;
  // Use the room/image top for vertical scaling, but keep only a small fixed
  // headroom so the ceiling line stays near the top instead of dropping toward
  // projector-height references.
  const sceneTop = Math.max(
    S.ceilH,
    S.wallH,
    r.effTop,
    r.effNatTop ?? 0,
    S.personOn ? PERSON_H : 0,
  );
  const scH   = sceneTop + 12;
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

    const rawShWY = sy(r.shadowH);
    const floorY  = sy(0);
    xctx.strokeStyle = c.shadowC; xctx.lineWidth = dpr; xctx.setLineDash([3*dpr, 2*dpr]);
    xctx.beginPath(); xctx.moveTo(lX, lY); xctx.lineTo(pX, pTopY); xctx.stroke();
    xctx.setLineDash([]);
    if (rawShWY <= floorY) {
      // Shadow at or above floor — draw toward wall, clip to view top if needed
      let endX = wX, endY = rawShWY;
      if (rawShWY < PT) {
        const t = (PT - pTopY) / (rawShWY - pTopY);
        endX = pX + t * (wX - pX);
        endY = PT;
      }
      xctx.beginPath(); xctx.moveTo(pX, pTopY); xctx.lineTo(endX, endY); xctx.stroke();
    }
    // shadow below floor (rawShWY > floorY): don't draw outside the view
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
  // chassisH = physical chassis box height (draw only). bodyH = base-to-lens (calculations).
  // Universal offset: box bottom always aligns with shelf; lens dot at correct height inside/above/below box.
  // Fallback when chassisH unknown: centre lens in box (-bH/2), which is a reasonable approximation.
  const visH    = S.chassisH ?? S.bodyH;
  const bH      = Math.max(visH*(dH/scH), 10*dpr);
  const bW      = Math.max(bH * 1.6, 14*dpr);
  const tiltRad = S.tiltDeg * Math.PI / 180;
  // Box top = (bodyH − feetH − chassisH) × scale from lens: positions box so bottom = feet top, lens at correct height.
  const bodyYOff = S.chassisH != null ? (S.bodyH - S.feetH - S.chassisH) * (dH/scH) : -bH/2;

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
    rr(0, bodyYOff, bW, bH, 3*dpr, xctx); xctx.fill(); xctx.stroke();
    xctx.shadowColor = 'transparent';
    const legW = 4*dpr;
    xctx.fillStyle = c.projS;
    if (S.feetH > 0) {
      // Draw feet proportional to feetH, hanging below chassis bottom to shelf level
      const feetPx = Math.max(S.feetH * (dH/scH), 3*dpr);
      const feetYTop = bodyYOff + bH;
      xctx.fillRect(bW * 0.12, feetYTop, legW, feetPx);
      xctx.fillRect(bW * 0.88 - legW, feetYTop, legW, feetPx);
    } else {
      // Stub feet for projectors without explicit feet data
      const legY = bodyYOff + bH - 1*dpr;
      xctx.fillRect(2*dpr, legY, legW, 5*dpr);
      xctx.fillRect(bW - legW - 2*dpr, legY, legW, 5*dpr);
    }
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

  // ─── Digital Panel Mini-Map ────────────────────────────────────────────────
  {
    const p = store.activePreset;
    if (p && p.digitalZoom && S.ratio > p.rMin) {
      const zoomShrinkPct = 1 - (p.rMin / S.ratio);
      const mW = 80 * dpr;
      const ar = parseFloat(p.aspectVal);
      const mH = mW / ar;
      const mX = PL + 20 * dpr;
      const mY = PT + 20 * dpr;

      // Native panel (grey container)
      xctx.fillStyle = 'rgba(50,50,50,0.85)';
      xctx.fillRect(mX, mY, mW, mH);
      xctx.strokeStyle = '#60a5fa';
      xctx.lineWidth = dpr;
      xctx.strokeRect(mX, mY, mW, mH);

      // Active image (shrunk inner box)
      const aW = mW * (1 - zoomShrinkPct);
      const aH = mH * (1 - zoomShrinkPct);
      const slackX = mW - aW;
      const slackY = mH - aH;

      const hLim = S.maxH;
      const vLim = S.shiftPct >= 0 ? S.maxUp : S.maxDn;
      const aX = mX + slackX / 2 + (hLim > 0 ? (S.hShiftPct / hLim) * (slackX / 2) : 0);
      const aY = mY + slackY / 2 - (S.shiftPct / (vLim || 1)) * (slackY / 2);

      xctx.fillStyle = 'rgba(100,200,255,0.8)';
      xctx.fillRect(aX, aY, aW, aH);

      // Labels
      xctx.font = `${8 * dpr}px var(--font-sans)`;
      xctx.textAlign = 'left';
      xctx.fillStyle = 'rgba(255,255,255,0.7)';
      xctx.fillText('Native panel', mX + 2 * dpr, mY + 9 * dpr);
      xctx.fillStyle = 'rgba(0,0,0,0.8)';
      xctx.fillText('Active', aX + 2 * dpr, aY + 9 * dpr);
    }
  }

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

    if (!store.floorMode && r.rod > 0) {
      const y0 = sy(S.ceilH), y1 = sy(S.ceilH - r.rod);
      if (y0 < y1 - 4*dpr) {
        xctx.beginPath(); xctx.moveTo(rx, y0); xctx.lineTo(rx, y1); xctx.stroke();
        [y0, y1].forEach(y => {
          xctx.beginPath(); xctx.moveTo(rx - 4*dpr, y); xctx.lineTo(rx + 4*dpr, y); xctx.stroke();
        });
        xctx.fillText(`Mount ${fmt(r.rod)}`, rx + 6*dpr, (y0 + y1) / 2 + 3.5*dpr);
      }
    }

    if (sy(S.ceilH) < lY - 4*dpr) {
      const y0 = sy(S.ceilH), y1 = lY;
      xctx.beginPath(); xctx.moveTo(rx, y0); xctx.lineTo(rx, y1); xctx.stroke();
      [y0, y1].forEach(y => {
        xctx.beginPath(); xctx.moveTo(rx - 4*dpr, y); xctx.lineTo(rx + 4*dpr, y); xctx.stroke();
      });
      xctx.fillText(`Lens ${fmt(S.ceilH - r.lH)}`, rx + 6*dpr, (y0 + y1) / 2 + 3.5*dpr);
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
// Shorter than A4 ratio (297:150) so results fit on the same page.
// Call from beforeprint; afterprint should call draw(r) to restore screen state.
export function drawForPrint(r) {
  const dpr = 2;
  const W = 840 * dpr, H = Math.round(840 * dpr * (150 / 297));
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  _draw(r, ctx, dpr, W, H, true);
}
