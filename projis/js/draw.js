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
  // so keep a smaller bump there.
  const isMobile = !isPrint && matchMedia('(max-width: 600px)').matches;
  const sizeMult = isPrint ? 0.13 : (isMobile ? 0.115 : 0.13);
  const fSz   = (isPrint
    ? Math.round(24 * dpr)                              // 18pt at 96 dpi
    : Math.max(18, Math.round(cssW / 27)) * dpr) * sizeMult;

  const WW = 16*dpr;
  const PL = 54*dpr + WW;
  const PR = (isPrint ? 34 : 50) * dpr;
  const PT = 18*dpr, PB = 24*dpr;
  const dW = W - PL - PR, dH = H - PT - PB;

  const roomW = S.viewW;

  // Vertical content bounds from the actual geometry — not an assumed-correct layout, so
  // failure states (image running below the floor, lens ending up above the ceiling, a
  // person's shadow reaching high) must expand the range rather than get clipped off-canvas.
  const contentTop = Math.max(
    S.wallH,
    r.lH,
    r.effTop,
    r.effNatTop ?? r.effTop,
    r.tCH,
    S.personOn ? PERSON_H : -Infinity,
  );
  const contentBottom = Math.min(
    0,
    r.effBot,
    r.effNatBot ?? r.effBot,
    r.shadowH != null ? r.shadowH : Infinity,
  );

  // Pedestal/floor mount: the ceiling has no structural role in the drawing, so only fold it
  // into the fitted range when it's actually close to the content — otherwise show it as a
  // labeled break above the fitted view instead of stretching the whole scene to reach it.
  // Ceiling mount: the extension rod is real structure connecting lens to ceiling, so ceilH
  // always stays in the fit there, same as before.
  const CEIL_NEAR = 60; // cm
  const showCeilBreak = store.floorMode && (S.ceilH - contentTop) > CEIL_NEAR;
  const fitTop = showCeilBreak ? contentTop : Math.max(contentTop, S.ceilH);

  const sceneTop = fitTop + 12, sceneBottom = contentBottom - 12;
  const scH = sceneTop - sceneBottom;
  // One uniform px/cm scale on both axes — never distort the beam angle. Fit whichever axis
  // is tighter; the other sits inside its full box without stretching to fill it.
  const scale = Math.min(dW / roomW, dH / scH);
  const sx = m => PL + m * scale;
  const sy = m => (H - PB) - (m - sceneBottom) * scale;
  const wX = PL, lX = sx(S.dist), lY = sy(r.lH);

  // Grid
  xctx.strokeStyle = c.grid; xctx.lineWidth = dpr;
  for (let x = 0; x <= Math.max(roomW, S.dist+100); x += 100) {
    xctx.beginPath(); xctx.moveTo(sx(x), PT); xctx.lineTo(sx(x), H-PB); xctx.stroke();
  }
  for (let y = Math.ceil(sceneBottom/50)*50; y <= sceneTop; y += 50) {
    xctx.beginPath(); xctx.moveTo(0, sy(y)); xctx.lineTo(W, sy(y)); xctx.stroke();
  }

  // Floor gradient
  const floorGrad = xctx.createLinearGradient(0, sy(0), 0, H);
  floorGrad.addColorStop(0, c.floor); floorGrad.addColorStop(1, c.floorFade);
  xctx.fillStyle = floorGrad;
  xctx.fillRect(0, sy(0), W, H-sy(0));

  // Ceiling line — only when the ceiling is actually within the fitted view; otherwise a
  // break glyph near the top marks "more room above, not drawn to scale" with its true height.
  if (!showCeilBreak) {
    xctx.fillStyle = c.floor;
    xctx.fillRect(0, sy(S.ceilH)-2*dpr, W, 2*dpr);
  }

  // Wall
  const wTop = sy(S.wallH), wBot = sy(0);
  xctx.shadowColor = 'rgba(0,0,0,0.15)'; xctx.shadowBlur = 8*dpr; xctx.shadowOffsetX = 3*dpr;
  xctx.fillStyle = c.wallF; xctx.fillRect(PL-WW, wTop, WW, wBot-wTop);
  xctx.shadowColor = 'transparent';
  xctx.strokeStyle = c.wallS; xctx.lineWidth = dpr; xctx.strokeRect(PL-WW, wTop, WW, wBot-wTop);

  // Height labels — left of wall, right-aligned
  const hfmt = v => (v / 100).toFixed(1) + 'm';
  xctx.fillStyle = c.lbl; xctx.font = `${fSz}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`; xctx.textAlign = 'right';
  xctx.fillText(hfmt(0), PL-WW-3*dpr, sy(0)+3*dpr);
  if (!showCeilBreak) xctx.fillText(hfmt(S.ceilH), PL-WW-3*dpr, sy(S.ceilH)+3*dpr);
  xctx.fillText(hfmt(S.wallH), PL-WW-3*dpr, wTop+fSz);

  if (showCeilBreak) {
    const by = PT + 8*dpr;
    xctx.strokeStyle = c.lbl; xctx.lineWidth = 1.2*dpr;
    xctx.beginPath();
    for (let x = wX, i = 0; x <= wX + 70*dpr; x += 12*dpr, i++) {
      const yy = by + (i % 2 === 0 ? -3*dpr : 3*dpr);
      i === 0 ? xctx.moveTo(x, yy) : xctx.lineTo(x, yy);
    }
    xctx.stroke();
    xctx.fillStyle = c.lbl; xctx.font = `${fSz}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`; xctx.textAlign = 'left';
    xctx.fillText(`↑ ceiling ${hfmt(S.ceilH)}`, wX + 76*dpr, by + 3.5*dpr);
  }

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
    // The glyph below (head/body/arms/legs) is drawn at a fixed pixel size regardless of
    // scale. When the scale is small (tall room, or a fitted range much taller than
    // PERSON_H), that fixed size can be taller than the true head-to-floor gap in pixels,
    // so the unclamped shapes would draw past the floor line. Clip to the floor so nothing
    // ever renders below it — the stub-leg logic below still shortens the legs themselves
    // for a recognizable figure, this clip is just the hard backstop for everything else.
    xctx.save();
    xctx.beginPath(); xctx.rect(0, 0, W, pBotY); xctx.clip();
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
    // Legs — kept a short stub, not stretched to the true floor. The room's px/cm scale can
    // put the floor hundreds of pixels below this fixed-size glyph (a tight room fit or a
    // person standing far from a low ceiling), which would otherwise draw the legs as a long
    // line running through/past the floor instead of a recognizable figure.
    const legEndY = Math.min(pBotY, pTopY + 56*dpr);
    xctx.beginPath(); xctx.moveTo(pX - pW/4, pTopY+48*dpr); xctx.lineTo(pX - pW/4, legEndY); xctx.stroke();
    xctx.beginPath(); xctx.moveTo(pX + pW/4, pTopY+48*dpr); xctx.lineTo(pX + pW/4, legEndY); xctx.stroke();
    // Thin dashed line grounds the icon to the true floor when the stub legs don't reach it.
    if (legEndY < pBotY - 2*dpr) {
      xctx.strokeStyle = c.person; xctx.lineWidth = dpr; xctx.globalAlpha = 0.4;
      xctx.setLineDash([2*dpr, 3*dpr]);
      xctx.beginPath(); xctx.moveTo(pX, legEndY); xctx.lineTo(pX, pBotY); xctx.stroke();
      xctx.setLineDash([]); xctx.globalAlpha = 1;
    }
    xctx.restore();

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
    xctx.fillStyle = c.person; xctx.font = `${fSz}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
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
  const bH      = Math.max(visH*(scale), 10*dpr);
  const bW      = Math.max(bH * 1.6, 14*dpr);
  const tiltRad = -S.tiltDeg * Math.PI / 180;
  // Box top = (bodyH − feetH − chassisH) × scale from lens: positions box so bottom = feet top, lens at correct height.
  const bodyYOff = S.chassisH != null ? (S.bodyH - S.feetH - S.chassisH) * (scale) : -bH/2;

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
      const feetPx = Math.max(S.feetH * (scale), 3*dpr);
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
      xctx.font = `${8 * dpr}px system-ui, -apple-system, sans-serif`;
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

  xctx.font = `${aF}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  xctx.lineWidth = 0.7*dpr;

  // Image top/bottom labels share their column with the floor/ceiling/wall-height labels
  // (line 148-150) — when an image edge lands on one of those lines (image bottom on the
  // floor, image top at wall height, etc., which is a common setup) the two would stack on
  // the same pixels and become unreadable. Keep the surface label where it is (it's the
  // room's fixed reference) and nudge the image-edge label off to the side instead of
  // hiding it — the tick mark still stays at the true position either way.
  const HGAP = 10*dpr;
  const surfaceYs = [sy(0), sy(S.wallH)];
  if (!showCeilBreak) surfaceYs.push(sy(S.ceilH));
  const nudgeFromSurface = (y, dir) => {
    const collide = surfaceYs.some(sy0 => Math.abs(sy0 - y) < HGAP);
    return collide ? y + dir * (HGAP + 4*dpr) : y;
  };

  // Image bottom height from floor — colored to match the image beam outline so it reads as
  // "this is the projected image's edge," distinct from the gray room/surface labels.
  {
    const y = sy(r.effBot);
    const ly = nudgeFromSurface(y, 1); // push down, away from the floor/wall label above
    xctx.strokeStyle = c.imgMediaS;
    xctx.beginPath(); xctx.moveTo(dimX, y); xctx.lineTo(dimX - 7*dpr, y); xctx.stroke();
    xctx.fillStyle = c.imgMediaS; xctx.textAlign = 'right';
    xctx.fillText(fmt(r.effBot), dimX - 9*dpr, ly + 3.5*dpr);
  }

  // Image top height from floor
  {
    const y = sy(r.effTop);
    const ly = nudgeFromSurface(y, -1); // push up, away from the wall/ceiling label below
    xctx.strokeStyle = c.imgMediaS;
    xctx.beginPath(); xctx.moveTo(dimX, y); xctx.lineTo(dimX - 7*dpr, y); xctx.stroke();
    xctx.fillStyle = c.imgMediaS; xctx.textAlign = 'right';
    xctx.fillText(fmt(r.effTop), dimX - 9*dpr, ly + 3.5*dpr);
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
    xctx.fillStyle = c.dim; xctx.font = `${aF}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`; xctx.textAlign = 'left';

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
