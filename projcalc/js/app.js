import { g, S, store } from './state.js';
import { PRESETS, LSVG, USVG, ASPECT_NAMES } from './data.js';
import { compute } from './compute.js';
import { draw } from './draw.js';
import { pLock, buildRoomSel, updateDropModeLabel, renderRes } from './ui.js';

// ─── Initialise lock button icons ────────────────────────────────────────────
['lkDist','lkRatio','lkBody','lkDrop','lkKS','lkImgW'].forEach(id => g(id).innerHTML = USVG);

// ─── Build projector preset dropdown ─────────────────────────────────────────
const psel = g('psel');
psel.innerHTML = '<option value="">— manual —</option>';
PRESETS.forEach(p => {
  const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; psel.appendChild(o);
});

// ─── Read DOM inputs into S ───────────────────────────────────────────────────
function rd() {
  S.ceilH    = +g('ceilH').value   || 500;
  S.wallH    = +g('wallH').value   || 300;
  S.dist     = +g('dist').value    || 200;
  S.aspect   = +g('aspect').value;
  S.ratio    = +g('ratio').value   || 1.35;
  S.imgW     = +g('imgW').value    || 148;
  S.imgH     = +g('imgH').value    || 0;
  S.shiftPct  = +g('sPct').value    || 0;
  S.maxUp  = store.rawMaxUp = parseFloat(g('maxUp').dataset.raw) || +g('maxUp').value || 0;
  S.maxDn  = store.rawMaxDn = parseFloat(g('maxDn').dataset.raw) || +g('maxDn').value || 0;
  S.hShiftPct = +g('hPct').value   || 0;
  S.maxH   = store.rawMaxH  = parseFloat(g('maxH').dataset.raw)  || +g('maxH').value  || 0;
  S.bodyH    = +g('bodyH').value   || 13.6;
  S.targetH  = +g('targetH').value || 0;
  S.posType  = document.querySelector('input[name="pt"]:checked').value;
  S.maxKS    = +g('maxKS').value   || 30;
  S.tiltDeg  = +g('tiltDeg').value || 0;
  S.drop     = +g('dropV').value   || 200;
  S.personOn   = g('personOn').checked;
  S.personDist = +g('personDist').value || 200;
  S.lumens     = +g('lumens').value     || 0;
  S.gain       = +g('gain').value       || 1.0;
}

// ─── Shift curve helpers ──────────────────────────────────────────────────────
function interpolateShiftCurve(curve, ratio) {
  if (!curve || curve.length === 0) return null;
  if (ratio <= curve[0][0]) return { up: curve[0][1], dn: curve[0][2] };
  const last = curve[curve.length - 1];
  if (ratio >= last[0]) return { up: last[1], dn: last[2] };
  for (let i = 0; i < curve.length - 1; i++) {
    if (ratio >= curve[i][0] && ratio <= curve[i + 1][0]) {
      const t = (ratio - curve[i][0]) / (curve[i + 1][0] - curve[i][0]);
      return {
        up: curve[i][1] + t * (curve[i + 1][1] - curve[i][1]),
        dn: curve[i][2] + t * (curve[i + 1][2] - curve[i][2]),
      };
    }
  }
  return null;
}

// Returns {up, dn} shift limits in % for the current throw ratio, in room coordinates.
// Positive = image moves UP in room. In ceiling mode the projector is physically inverted, so
// the mechanical sUp/sDn swap: what was "shift up" on the body now moves the image downward.
function getShiftLimits() {
  const p = store.activePreset;
  if (!p) return { up: S.maxUp, dn: S.maxDn };
  let up, dn;
  if (p.shiftCurve) {
    const v = interpolateShiftCurve(p.shiftCurve, S.ratio);
    if (v) { up = v.up; dn = v.dn; }
    else   { up = p.sUp; dn = p.sDn; }
  } else {
    up = p.sUp; dn = p.sDn;
  }
  // Ceiling mount: shift direction is inverted in room coordinates
  return store.floorMode ? { up, dn } : { up: dn, dn: up };
}

// Available vertical range given current horizontal shift (elliptical boundary)
function getDynamicVLimits() {
  const { rawMaxUp: up0, rawMaxDn: dn0, rawMaxH: hMax } = store;
  if (!hMax) return { up: up0, dn: dn0 };
  const hNorm = Math.abs(S.hShiftPct) / hMax;
  if (hNorm >= 1) return { up: 0, dn: 0 };
  const f = Math.sqrt(1 - hNorm * hNorm);
  return { up: up0 * f, dn: dn0 * f };
}

// Available horizontal range given current vertical shift (elliptical boundary)
function getDynamicHLimit() {
  const { rawMaxUp, rawMaxDn, rawMaxH: hMax } = store;
  if (!hMax) return 0;
  const vMaxDir = S.shiftPct >= 0 ? rawMaxUp : rawMaxDn;
  if (!vMaxDir) return hMax;
  const vNorm = Math.abs(S.shiftPct) / vMaxDir;
  if (vNorm >= 1) return 0;
  return hMax * Math.sqrt(1 - vNorm * vNorm);
}

// Draw/update the lens shift curve SVG in the sidebar
function drawShiftCurve() {
  const p    = store.activePreset;
  const wrap = g('shiftCurveWrap');
  if (!p || p.shiftType !== 'optical') { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  const svg = g('shiftCurveSvg');
  const W   = Math.max(svg.parentElement ? svg.parentElement.clientWidth : 0, 180);
  const H   = 58;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.width  = W + 'px';
  svg.style.height = H + 'px';

  const rMin  = p.rMin;
  const rMax  = p.fixed ? p.rMin : p.rMax;
  const rSpan = Math.max(rMax - rMin, 0.001);
  const totalPct = p.sUp + p.sDn || 1;

  const PL = 4, PR = 4, PT = 4, PB = 14;
  const cW = W - PL - PR, cHpx = H - PT - PB;

  // Mechanical limits at a given throw ratio
  const getLim = r => {
    if (p.shiftCurve) { const v = interpolateShiftCurve(p.shiftCurve, r); if (v) return v; }
    return { up: p.sUp, dn: p.sDn };
  };

  // Room-direction limits: in ceiling mode sUp/sDn swap because the projector is inverted
  const getRoomLim = r => {
    const m = getLim(r);
    return store.floorMode ? { up: m.up, dn: m.dn } : { up: m.dn, dn: m.up };
  };
  const roomLimAtCurrent = getRoomLim(S.ratio);
  const roomTotalPct = roomLimAtCurrent.up + roomLimAtCurrent.dn || 1;

  const xS  = r  => PL + Math.min(1, Math.max(0, (r - rMin) / rSpan)) * cW;
  // yS maps room-direction shift% to canvas Y (top = max up, bottom = max down)
  const yS  = pc => PT + (1 - (pc + roomLimAtCurrent.dn) / roomTotalPct) * cHpx;

  const _t = document.documentElement.dataset.theme;
  const dk = _t === 'dark' ? true : _t === 'light' ? false : matchMedia('(prefers-color-scheme: dark)').matches;
  const fillCol = dk ? 'rgba(59,130,246,.18)' : 'rgba(59,130,246,.10)';
  const lineCol = dk ? '#3b82f6'               : '#2563eb';
  const zeroCol = dk ? '#3f3f46'               : '#e4e4e7';
  const bgCol   = dk ? '#27272a'               : '#f4f4f5';
  const lblCol  = dk ? '#71717a'               : '#a1a1aa';

  const steps = p.fixed ? 2 : 32;
  let topPts = [], botPts = [];
  for (let i = 0; i < steps; i++) {
    const r = rMin + (i / (steps - 1)) * rSpan;
    const rl = getRoomLim(r);
    topPts.push([xS(r), yS(rl.up)]);
    botPts.push([xS(r), yS(-rl.dn)]);
  }

  const toPath = pts => pts.map((pt, i) => `${i ? 'L' : 'M'}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join('');
  const area   = toPath(topPts) + toPath([...botPts].reverse()).replace('M', 'L') + 'Z';
  const zy     = yS(0);
  const cx     = xS(S.ratio);
  const inRng  = S.shiftPct >= -roomLimAtCurrent.dn && S.shiftPct <= roomLimAtCurrent.up;
  const cy     = Math.max(PT + 3, Math.min(H - PB - 3, yS(S.shiftPct)));
  const dotCol = inRng ? '#10b981' : '#ef4444';

  svg.innerHTML =
    `<rect x="0" y="0" width="${W}" height="${H}" fill="${bgCol}" rx="3"/>` +
    `<path d="${area}" fill="${fillCol}"/>` +
    `<line x1="${PL}" y1="${zy.toFixed(1)}" x2="${W - PR}" y2="${zy.toFixed(1)}" stroke="${zeroCol}" stroke-width="0.8"/>` +
    `<path d="${toPath(topPts)}" fill="none" stroke="${lineCol}" stroke-width="1.2"/>` +
    `<path d="${toPath(botPts)}" fill="none" stroke="${lineCol}" stroke-width="1.2"/>` +
    `<line x1="${cx.toFixed(1)}" y1="${PT}" x2="${cx.toFixed(1)}" y2="${H - PB}" stroke="${dk ? '#52525b' : '#d4d4d8'}" stroke-width="0.8" stroke-dasharray="3,2"/>` +
    `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5" fill="${dotCol}" opacity=".9"/>` +
    `<text x="${PL}" y="${H - 2}" font-size="8" fill="${lblCol}" font-family="monospace">${rMin.toFixed(2)}</text>` +
    `<text x="${(W - PR).toFixed(1)}" y="${H - 2}" font-size="8" fill="${lblCol}" font-family="monospace" text-anchor="end">${rMax.toFixed(2)}</text>` +
    `<text x="${cx.toFixed(1)}" y="${H - 2}" font-size="8" fill="${dotCol}" font-family="monospace" text-anchor="middle">${S.ratio.toFixed(2)}</text>` +
    `<text x="${(W - PR).toFixed(1)}" y="${PT + 8}" font-size="8" fill="${lblCol}" font-family="monospace" text-anchor="end">+${roomLimAtCurrent.up.toFixed(0)}%</text>` +
    `<text x="${(W - PR).toFixed(1)}" y="${(H - PB - 1).toFixed(1)}" font-size="8" fill="${lblCol}" font-family="monospace" text-anchor="end">-${roomLimAtCurrent.dn.toFixed(0)}%</text>` +
    `<text x="${PL}" y="${PT + 8}" font-size="8" fill="${dotCol}" font-family="monospace">${(S.shiftPct >= 0 ? '+' : '') + S.shiftPct.toFixed(1)}%</text>`;
}

// ─── Main refresh ─────────────────────────────────────────────────────────────
function refresh() {
  rd();

  // Auto-fit drawing width to encompass throw distance (+ person if shown)
  const personEnd = S.personOn && S.personDist > 0 ? S.personDist : 0;
  S.viewW = Math.max(Math.ceil(S.dist + 10), personEnd > 0 ? Math.ceil(personEnd * 1.1) : 0, 280);

  // Apply shift limits for all presets (handles zoom curves + ceiling-mount inversion for fixed-shift presets too)
  if (store.activePreset) {
    const lims = getShiftLimits();
    S.maxUp = store.rawMaxUp = lims.up;
    S.maxDn = store.rawMaxDn = lims.dn;
    g('maxUp').dataset.raw = lims.up;
    g('maxDn').dataset.raw = lims.dn;
  }

  // Clamp shift to current spec limits (e.g. zoom-out shrinks the allowed range)
  if (S.shiftPct > S.maxUp) {
    S.shiftPct = S.maxUp;
    g('sPct').value = S.shiftPct.toFixed(2);
  }
  if (S.shiftPct < -S.maxDn) {
    S.shiftPct = -S.maxDn;
    g('sPct').value = S.shiftPct.toFixed(2);
  }

  // Elliptical cross-clamping: enforce 2D lens shift envelope.
  // Clamp V first (using current H), then clamp H using the updated V.
  const dV = getDynamicVLimits();
  const dynH = getDynamicHLimit();
  if (store.rawMaxH > 0) {
    if (S.shiftPct > dV.up)  { S.shiftPct  =  dV.up; g('sPct').value = S.shiftPct.toFixed(2); }
    if (S.shiftPct < -dV.dn) { S.shiftPct  = -dV.dn; g('sPct').value = S.shiftPct.toFixed(2); }
    if (S.hShiftPct >  dynH) { S.hShiftPct =  dynH;  g('hPct').value = S.hShiftPct.toFixed(2); }
    if (S.hShiftPct < -dynH) { S.hShiftPct = -dynH;  g('hPct').value = S.hShiftPct.toFixed(2); }
  }
  // Update spec limit fields to show current available limits (not raw spec)
  g('maxUp').value = dV.up.toFixed(1);
  g('maxDn').value = dV.dn.toFixed(1);
  if (store.rawMaxH > 0) g('maxH').value = dynH.toFixed(1);

  // Clamp tilt to keystone limit
  const tiltEl = g('tiltDeg');
  tiltEl.max = S.maxKS; tiltEl.min = -S.maxKS;
  if (S.tiltDeg >  S.maxKS) { S.tiltDeg =  S.maxKS; tiltEl.value =  S.maxKS; }
  if (S.tiltDeg < -S.maxKS) { S.tiltDeg = -S.maxKS; tiltEl.value = -S.maxKS; }

  // Disable shift inputs when no shift range defined
  if (S.maxUp === 0 && S.maxDn === 0) {
    S.shiftPct = 0; g('sPct').value = 0; g('sMm').value = 0;
    g('sPct').readOnly = true; g('sMm').readOnly = true;
    g('sPct').classList.add('ro'); g('sMm').classList.add('ro');
  } else {
    g('sPct').readOnly = false; g('sMm').readOnly = false;
    g('sPct').classList.remove('ro'); g('sMm').classList.remove('ro');
  }
  if (S.maxH === 0) {
    S.hShiftPct = 0; g('hPct').value = 0;
    g('hPct').readOnly = true; g('hPct').classList.add('ro');
  } else {
    g('hPct').readOnly = false; g('hPct').classList.remove('ro');
  }

  // If media width is locked, back-calculate ratio (or dist if ratio is fixed) to maintain locked width
  if (store.lkState.imgW && S.imgW > 0) {
    const nativeAspect = store.activePreset ? parseFloat(store.activePreset.aspectVal) : S.aspect;
    const reqNativeW = S.aspect >= nativeAspect ? S.imgW : S.imgW * (nativeAspect / S.aspect);
    if (reqNativeW > 0) {
      const rFixed = g('ratio').readOnly || store.lkState.ratio;
      if (!rFixed) {
        const rawRatio = S.dist / reqNativeW;
        S.ratio = clampRatio(rawRatio);
        g('ratio').value = S.ratio.toFixed(2);
        if (g('zoomRow').style.display !== 'none') g('zoomSlider').value = g('ratio').value;
      } else if (!store.lkState.dist) {
        S.dist = S.ratio * reqNativeW;
        g('dist').value = S.dist.toFixed(1);
      }
    }
  }

  const r = compute();

  // Keep image dimensions in sync with physical calc
  g('imgW').value = r.mediaW.toFixed(1);
  g('imgH').value = r.mediaH.toFixed(1);
  g('sMm').value  = Math.round((S.shiftPct / 100) * r.nativeH * 10);

  // AR info banner — only when a preset is active and causes letterbox/pillar
  const arInfo = g('arInfo');
  if ((r.isLetterboxed || r.isPillared) && store.activePreset) {
    const nName = ASPECT_NAMES[store.activePreset.aspectVal] || store.activePreset.aspectVal;
    arInfo.textContent = `Projector Native AR is ${nName}. Unused panel area projects black light.`;
    arInfo.style.display = 'block';
  } else {
    arInfo.style.display = 'none';
  }

  // Sync drop field / target field depending on which is driving
  if (store.dropDriver) {
    const edgeH = S.posType === 'bottom' ? r.effBot
                : S.posType === 'top'    ? r.effTop
                :                          r.tCH;
    g('targetH').value = edgeH.toFixed(1);
  } else {
    g('dropV').value = r.drop.toFixed(1);
  }

  if (g('zoomRow').style.display !== 'none') g('zoomVal').textContent = S.ratio.toFixed(2) + ':1';
  draw(r);
  renderRes(r);
  drawShiftCurve();
  drawBrightnessBar(r);
}

function drawBrightnessBar(r) {
  const svg = g('brightSvg');
  if (!svg) return;
  const W = svg.getBoundingClientRect().width || 260;
  const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const tc = isDark ? '#a1a1aa' : '#71717a';
  const tp = isDark ? '#f4f4f5' : '#18181b';

  // 1 sq ft = 929.03 cm²
  const areaSqFt = (r.mediaW * r.mediaH) / 929.03;
  if (!S.lumens || areaSqFt <= 0) { svg.innerHTML = ''; g('brightMath') && (g('brightMath').textContent = ''); return; }

  // ── Spec fL (box value, no corrections) ──────────────────────────────────
  const fLspec = (S.lumens * S.gain) / areaSqFt;

  // ── C-coefficients ────────────────────────────────────────────────────────
  // C_mode: color calibration loss
  const C_MODE = { dynamic: 1.0, cinema: 0.68, calibrated: 0.50 };
  const cMode = C_MODE[g('lumensMode')?.value] ?? 0.68;

  // C_zoom: lens aperture loss — physics-based (fWide/fTele)² when F-stop data available,
  // otherwise 1.0 (fixed lenses, UST, or unknown). Formula: C = (F_wide / F_current)²
  // where F_current is linearly interpolated across the zoom range.
  let cZoom = 1.0;
  const p = store.activePreset;
  if (p && !p.fixed && p.fWide != null && p.fTele != null && p.rMax > p.rMin) {
    const t = Math.max(0, Math.min(1, (S.ratio - p.rMin) / (p.rMax - p.rMin)));
    const fCurrent = p.fWide + t * (p.fTele - p.fWide);
    cZoom = (p.fWide / fCurrent) ** 2;
  }

  // C_key: digital keystone lumen loss (piecewise linear on keystone angle)
  const ks = r.ksN;
  const cKey = ks <= 0  ? 1.0
             : ks <= 15 ? 1.0 - (ks / 15) * 0.10
             : ks <= 30 ? 0.90 - ((ks - 15) / 15) * 0.15
             :            Math.max(0.70, 0.75 - (ks - 30) * 0.005);

  // ── Effective fL ──────────────────────────────────────────────────────────
  const fLeff = (S.lumens * cMode * cZoom * cKey * S.gain) / areaSqFt;

  // ── Slider ────────────────────────────────────────────────────────────────
  const MAX = 50;
  const PL = 2, barY = 24, barH = 12, tickY = barY + barH + 3;
  const barW = W - PL - 2;
  const xOf  = v => PL + Math.min(1, Math.max(0, v / MAX)) * barW;
  const x10  = xOf(10), x25 = xOf(25);
  const pxE  = xOf(fLeff);
  const eCol = fLeff < 10 ? '#ef4444' : fLeff <= 25 ? '#10b981' : '#f59e0b';
  const arrowH = 5;
  const lblY = tickY + arrowH + 9; // scale labels below arrow
  const H2 = lblY + 1;
  svg.setAttribute('height', H2);

  // Math line: just the simple spec formula value (no C breakdown)
  const mathEl = g('brightMath');
  if (mathEl) {
    const gainStr = S.gain !== 1.0 ? ` × ${S.gain.toFixed(1)}G` : '';
    mathEl.textContent = `Box spec: ${S.lumens} lm${gainStr} ÷ ${areaSqFt.toFixed(1)} ft² = ${fLspec.toFixed(1)} fL`;
  }

  svg.innerHTML =
    `<!-- Value above bar -->
     <text x="${pxE}" y="${barY - 4}" font-size="10" fill="${eCol}" font-family="monospace" text-anchor="middle" font-weight="700">${fLeff.toFixed(1)} fL</text>
     <!-- Red zone -->
     <rect x="${PL}" y="${barY}" width="${x10-PL}" height="${barH}" rx="3" fill="#ef4444" opacity="0.65"/>
     <!-- Green zone -->
     <rect x="${x10}" y="${barY}" width="${x25-x10}" height="${barH}" fill="#10b981" opacity="0.65"/>
     <!-- Yellow zone -->
     <rect x="${x25}" y="${barY}" width="${PL+barW-x25}" height="${barH}" rx="3" fill="#f59e0b" opacity="0.65"/>
     <!-- Pointer line + arrow -->
     <line x1="${pxE}" y1="${barY}" x2="${pxE}" y2="${tickY}" stroke="${eCol}" stroke-width="2"/>
     <polygon points="${pxE},${tickY} ${pxE-4},${tickY+arrowH} ${pxE+4},${tickY+arrowH}" fill="${eCol}"/>
     <!-- Scale labels below arrow -->
     <text x="${x10}" y="${lblY}" font-size="8" fill="${tc}" font-family="monospace" text-anchor="middle">10</text>
     <text x="${x25}" y="${lblY}" font-size="8" fill="${tc}" font-family="monospace" text-anchor="middle">25</text>
     <text x="${PL+barW}" y="${lblY}" font-size="8" fill="${tc}" font-family="monospace" text-anchor="end">fL</text>`;
}

// No clamping — user is allowed to push ratio outside preset spec range; ratioOk flag is informational only
function clampRatio(r) {
  return r;
}

// ─── Geometry triangle solver ─────────────────────────────────────────────────
function tri(changed) {
  rd();
  const rFixed = g('ratio').readOnly || store.lkState.ratio;
  const dFixed = g('dist').readOnly  || store.lkState.dist;
  const wFixed = store.lkState.imgW;
  const nativeAspect = store.activePreset ? parseFloat(store.activePreset.aspectVal) : S.aspect;

  if (changed === 'ratio') {
    if (wFixed) {
      // ratio changed, width locked → update dist
      if (!dFixed) {
        const reqNativeW = S.aspect >= nativeAspect ? S.imgW : S.imgW * (nativeAspect / S.aspect);
        g('dist').value = (S.ratio * reqNativeW).toFixed(1);
      }
    } else if (!dFixed) {
      const nativeW = S.dist / S.ratio;
      g('imgW').value = (S.aspect >= nativeAspect
        ? nativeW
        : nativeW * (S.aspect / nativeAspect)
      ).toFixed(1);
    }
  } else if (changed === 'width') {
    const reqNativeW = S.aspect >= nativeAspect ? S.imgW : S.imgW * (nativeAspect / S.aspect);
    // width changed → prefer updating dist; only fall back to ratio if dist is locked
    if (!dFixed) {
      g('dist').value = (S.ratio * reqNativeW).toFixed(1);
    } else if (!rFixed) {
      g('ratio').value = clampRatio(S.dist / reqNativeW).toFixed(2);
      if (g('zoomRow').style.display !== 'none') g('zoomSlider').value = g('ratio').value;
    }
  } else if (changed === 'height') {
    // height changed → derive width from aspect, then same as 'width'
    const newW = S.imgH * S.aspect;
    g('imgW').value = newW.toFixed(1);
    S.imgW = newW;
    const reqNativeW = S.aspect >= nativeAspect ? newW : newW * (nativeAspect / S.aspect);
    if (!dFixed) {
      g('dist').value = (S.ratio * reqNativeW).toFixed(1);
    } else if (!rFixed) {
      g('ratio').value = clampRatio(S.dist / reqNativeW).toFixed(2);
      if (g('zoomRow').style.display !== 'none') g('zoomSlider').value = g('ratio').value;
    }
  } else if (changed === 'dist') {
    if (wFixed) {
      // dist changed, width locked → update ratio; if ratio hits zoom boundary, snap dist back
      if (!rFixed) {
        const reqNativeW = S.aspect >= nativeAspect ? S.imgW : S.imgW * (nativeAspect / S.aspect);
        const rawRatio   = S.dist / reqNativeW;
        const newRatio   = clampRatio(rawRatio);
        g('ratio').value = newRatio.toFixed(2);
        if (g('zoomRow').style.display !== 'none') g('zoomSlider').value = g('ratio').value;
      }
    } else if (rFixed) {
      const nativeW = S.dist / S.ratio;
      g('imgW').value = (S.aspect >= nativeAspect
        ? nativeW
        : nativeW * (S.aspect / nativeAspect)
      ).toFixed(1);
    } else if (S.imgW > 0) {
      // dist changed, nothing locked → update ratio (keep width as reference)
      const reqNativeW = S.aspect >= nativeAspect ? S.imgW : S.imgW * (nativeAspect / S.aspect);
      g('ratio').value = clampRatio(S.dist / reqNativeW).toFixed(2);
      if (g('zoomRow').style.display !== 'none') g('zoomSlider').value = g('ratio').value;
    }
  } else if (changed === 'aspect') {
    const nativeW = S.dist / S.ratio;
    g('imgW').value = (S.aspect >= nativeAspect
      ? nativeW
      : nativeW * (S.aspect / nativeAspect)
    ).toFixed(1);
  }
}

// ─── Preset management ────────────────────────────────────────────────────────
function clearPreset() {
  store.activePreset = null;
  psel.value = '';
  g('pbox').classList.remove('on');
  pLock(['ratio','maxUp','maxDn','maxH','bodyH','maxKS'], false);
  const lb = g('lkRatio');
  lb.classList.remove('pl'); lb.innerHTML = store.lkState.ratio ? LSVG : USVG;
  lb.classList.toggle('on', store.lkState.ratio);
  g('lkBody').classList.remove('pl');
  g('zoomRow').style.display = 'none';
  g('shiftCurveWrap').style.display = 'none';
}

function applyPreset(p) {
  store.activePreset = p;
  if (!p) { clearPreset(); refresh(); return; }

  g('aspect').value  = p.aspectVal;
  g('ratio').value   = p.rMin.toFixed(2);
  g('maxUp').value = g('maxUp').dataset.raw = p.sUp;
  g('maxDn').value = g('maxDn').dataset.raw = p.sDn;
  g('maxH').value  = g('maxH').dataset.raw  = p.hMax ?? 0;
  store.rawMaxUp = p.sUp; store.rawMaxDn = p.sDn; store.rawMaxH = p.hMax ?? 0;
  g('bodyH').value   = p.bodyH.toFixed(1);
  g('maxKS').value   = p.ks;
  if (p.lumens) g('lumens').value = p.lumens;
  pLock(['maxUp','maxDn','maxH','bodyH','maxKS'], true);

  const lb = g('lkRatio');
  if (p.fixed) {
    pLock(['ratio'], true);
    lb.innerHTML = LSVG; lb.classList.remove('on'); lb.classList.add('pl');
    g('zoomRow').style.display = 'none';
  } else {
    pLock(['ratio'], false);
    lb.innerHTML = store.lkState.ratio ? LSVG : USVG;
    lb.classList.toggle('on', store.lkState.ratio); lb.classList.remove('pl');
    g('zoomRow').style.display = 'flex';
    const zs = g('zoomSlider'); zs.min = p.rMin; zs.max = p.rMax; zs.step = 0.01; zs.value = p.rMin;
    g('zoomVal').textContent = p.rMin.toFixed(2) + ':1';
  }
  g('lkBody').classList.add('pl');

  const nName = ASPECT_NAMES[p.aspectVal] || p.aspectVal;
  g('pi-t').textContent = `Nat ${nName} · Throw ${p.fixed ? p.rMin+':1 fix' : p.rMin+'-'+p.rMax+':1'} · Shift ±${p.sUp}%`;
  g('pbox').classList.add('on');

  tri('ratio'); refresh();
}

psel.addEventListener('change', function() {
  applyPreset(PRESETS.find(p => p.id === this.value) || null);
});
g('pi-c').addEventListener('click', () => { clearPreset(); refresh(); });

// ─── Lock buttons ─────────────────────────────────────────────────────────────
function toggleLock(key) {
  if (key === 'ratio' && store.activePreset && store.activePreset.fixed) return;
  if (key === 'body'  && store.activePreset) return;
  store.lkState[key] = !store.lkState[key];
  const ids    = { dist:'lkDist', ratio:'lkRatio', body:'lkBody', drop:'lkDrop', ks:'lkKS', imgW:'lkImgW' };
  const inpIds = { dist:'dist',   ratio:'ratio',   body:'bodyH',  ks:'maxKS',    imgW:'imgW' };
  const btn    = g(ids[key]);
  btn.classList.toggle('on', store.lkState[key]);
  btn.innerHTML = store.lkState[key] ? LSVG : USVG;
  if (key !== 'drop' && inpIds[key] && !g(inpIds[key]).classList.contains('inp-p')) {
    g(inpIds[key]).readOnly = store.lkState[key];
  }
  if (key === 'drop') {
    if (store.lkState.drop && !store.dropDriver) store.dropDriver = true;
    updateDropModeLabel();
  }
}

['lkDist','lkRatio','lkBody','lkDrop','lkKS','lkImgW'].forEach(id => {
  const key = { lkDist:'dist', lkRatio:'ratio', lkBody:'body', lkDrop:'drop', lkKS:'ks', lkImgW:'imgW' }[id];
  g(id).addEventListener('click', () => toggleLock(key));
});

// ─── Setup presets ────────────────────────────────────────────────────────────
buildRoomSel();

function loadSetup(r) {
  const proj = r.presetId ? PRESETS.find(p => p.id === r.presetId) : null;
  applyPreset(proj);
  g('ceilH').value   = r.ceilH;
  g('wallH').value   = r.wallH;
  g('dist').value    = r.dist;
  g('aspect').value  = r.aspect  ?? g('aspect').value;
  if (!proj || !proj.fixed) g('ratio').value = r.ratio ?? g('ratio').value;
  g('targetH').value = r.targetH;
  g('sPct').value    = r.shiftPct  ?? 0;
  g('hPct').value    = r.hShiftPct ?? 0;
  g('tiltDeg').value = r.tiltDeg   ?? 0;
  g('lumens').value  = r.lumens    ?? g('lumens').value;
  g('gain').value    = r.gain      ?? g('gain').value;
  g('dropV').value   = r.drop;
  if (!proj) {
    g('bodyH').value = r.bodyH ?? g('bodyH').value;
    g('maxKS').value = r.maxKS ?? g('maxKS').value;
    g('maxUp').value = g('maxUp').dataset.raw = r.maxUp ?? g('maxUp').value;
    g('maxDn').value = g('maxDn').dataset.raw = r.maxDn ?? g('maxDn').value;
    g('maxH').value  = g('maxH').dataset.raw  = r.maxH  ?? g('maxH').value;
  } else {
    g('maxH').value  = r.maxH  ?? (proj.hMax ?? 0);
  }
  document.querySelectorAll('input[name="pt"]').forEach(el => el.checked = (el.value === r.posType));
  g('posLbl').textContent = { bottom:'Media bottom height', center:'Center height', top:'Top edge height' }[r.posType];
  document.querySelectorAll('input[name="mount"]').forEach(el => el.checked = (el.value === (r.floorMode ? 'floor' : 'ceiling')));
  store.floorMode  = r.floorMode  ?? store.floorMode;
  store.dropDriver = r.dropDriver ?? false;
  updateDropModeLabel(); refresh();
}

g('rsel').addEventListener('change', function() {
  const r = store.roomPresets[+this.value]; if (!r) return;
  loadSetup(r);
});

g('rsave').addEventListener('click', () => {
  const name = g('rname').value.trim() || 'Setup ' + (store.roomPresets.length + 1);
  store.roomPresets.push({
    name,
    presetId:   store.activePreset ? store.activePreset.id : null,
    ceilH:      +g('ceilH').value,
    wallH:      +g('wallH').value,
    dist:       +g('dist').value,
    aspect:     +g('aspect').value,
    ratio:      +g('ratio').value,
    posType:    document.querySelector('input[name="pt"]:checked').value,
    targetH:    +g('targetH').value,
    shiftPct:   +g('sPct').value,
    hShiftPct:  +g('hPct').value,
    tiltDeg:    +g('tiltDeg').value,
    floorMode:  store.floorMode,
    drop:       +g('dropV').value,
    dropDriver: store.dropDriver,
    bodyH:      +g('bodyH').value,
    maxKS:      +g('maxKS').value,
    maxUp:      +g('maxUp').value,
    maxDn:      +g('maxDn').value,
    maxH:       +g('maxH').value,
    lumens:     +g('lumens').value,
    gain:       +g('gain').value,
  });
  buildRoomSel();
  g('rsel').value = store.roomPresets.length - 1;
  g('rname').value = '';
});

g('rdel').addEventListener('click', () => {
  const val = g('rsel').value;
  if (!val) return;
  const i = +val;
  if (!isNaN(i) && i >= 0) { store.roomPresets.splice(i, 1); buildRoomSel(); }
});

function currentSetup() {
  return {
    presetId:   store.activePreset ? store.activePreset.id : null,
    ceilH:      +g('ceilH').value,
    wallH:      +g('wallH').value,
    dist:       +g('dist').value,
    aspect:     +g('aspect').value,
    ratio:      +g('ratio').value,
    posType:    document.querySelector('input[name="pt"]:checked').value,
    targetH:    +g('targetH').value,
    shiftPct:   +g('sPct').value,
    hShiftPct:  +g('hPct').value,
    tiltDeg:    +g('tiltDeg').value,
    floorMode:  store.floorMode,
    drop:       +g('dropV').value,
    dropDriver: store.dropDriver,
    bodyH:      +g('bodyH').value,
    maxKS:      +g('maxKS').value,
    maxUp:      parseFloat(g('maxUp').dataset.raw) || 0,
    maxDn:      parseFloat(g('maxDn').dataset.raw) || 0,
    maxH:       parseFloat(g('maxH').dataset.raw)  || 0,
  };
}

g('shareUrl').addEventListener('click', () => {
  const encoded = btoa(JSON.stringify(currentSetup()));
  const url = location.origin + location.pathname + '#s=' + encoded;
  navigator.clipboard.writeText(url).then(() => {
    const btn = g('shareUrl'), orig = btn.textContent;
    btn.textContent = '✓ Copied';
    setTimeout(() => btn.textContent = orig, 1800);
  }).catch(() => prompt('Copy this URL:', url));
});

// ─── Mount mode (ceiling / pedestal) ─────────────────────────────────────────
document.querySelectorAll('input[name="mount"]').forEach(el => el.addEventListener('change', function() {
  const newFloor = (this.value === 'floor');
  if (newFloor !== store.floorMode) {
    // Translate the drop/pedestal value so lens stays at the same physical height
    rd();
    const lH_current = store.floorMode
      ? S.drop + S.bodyH       // floor→ceiling: was pedestal mode
      : S.ceilH - S.drop;      // ceiling→floor: was ceiling mode
    const newDrop = newFloor
      ? lH_current - S.bodyH   // new pedestal height
      : S.ceilH - lH_current;  // new ceiling drop
    g('dropV').value = Math.max(0, newDrop).toFixed(1);
  }
  store.floorMode = newFloor;
  updateDropModeLabel();
  refresh();
}));

// ─── Drop mode ────────────────────────────────────────────────────────────────
g('dropV').addEventListener('input', function() {
  if (!store.dropDriver) { store.dropDriver = true; updateDropModeLabel(); }
  refresh();
});

// ─── Auto-solve: when drop is locked, find shift+tilt to reach target position ─
function autoSolvePosition() {
  rd();
  const nativeAspect = store.activePreset ? parseFloat(store.activePreset.aspectVal) : S.aspect;
  const nativeW = S.dist / S.ratio;
  const nativeH = nativeW / nativeAspect;
  const mediaH  = S.aspect >= nativeAspect ? nativeW / S.aspect : nativeH;

  const cH_goal = S.posType === 'bottom' ? S.targetH + mediaH / 2
                : S.posType === 'top'    ? S.targetH - mediaH / 2
                :                          S.targetH;

  const lH = store.floorMode ? S.drop + S.bodyH : S.ceilH - S.drop;

  // Subtract the projector's built-in vertical offset from the target so we only solve for
  // the user-adjustable portion of shift (see compute.js for the same offset logic).
  const vOffsetPct = store.activePreset ? (store.activePreset.vOffset || 0) : 0;
  const naturalOffsetM = store.floorMode ? (vOffsetPct / 100) * nativeH : -(vOffsetPct / 100) * nativeH;

  // Need: tCH = lH + naturalOffsetM + userShiftM - dist·tan(tilt) = cH_goal
  // → userShiftM - dist·tan(tilt) = delta
  const delta = cH_goal - lH - naturalOffsetM;

  const { up: maxUp, dn: maxDn } = getShiftLimits();  // curve-aware + ceiling-flipped
  const maxKS = S.maxKS;

  // Use as much shift as possible first (prefer no-keystone)
  const shiftPctRaw  = nativeH > 0 ? (delta / nativeH) * 100 : 0;
  const shiftPct     = Math.max(-maxDn, Math.min(maxUp, shiftPctRaw));
  const shiftM_used  = (shiftPct / 100) * nativeH;
  const shiftMm      = Math.round(shiftM_used * 10);

  // Remaining offset after shift → cover with tilt using exact inverse of compute.js forward model.
  // Forward: baseAngle=atan2(shiftM_total,dist); tCH = lH + dist*tan(baseAngle - mirrorFactor*tr)
  // Inverse: mirrorFactor*tr = baseAngle - atan2(cH_goal - lH, dist)
  const actualShiftM  = naturalOffsetM + shiftM_used;
  const baseAngle     = Math.atan2(actualShiftM, S.dist);
  const reqAngle      = Math.atan2(cH_goal - lH, S.dist);
  const angleDelta    = baseAngle - reqAngle;
  const mirrorFactor  = (store.activePreset && store.activePreset.ustMirror) ? 2 : 1;
  let tiltDeg = 0;
  if (Math.abs(angleDelta) > 0.0001) {
    tiltDeg = (angleDelta / mirrorFactor) * (180 / Math.PI);
    tiltDeg = Math.max(-maxKS, Math.min(maxKS, tiltDeg));
  }

  g('sPct').value     = shiftPct.toFixed(2);
  g('sMm').value      = shiftMm;
  g('tiltDeg').value  = tiltDeg.toFixed(1);
  store.dropDriver    = true;
  updateDropModeLabel();
}

function imageEdit() {
  if (store.lkState.drop) {
    // Drop locked: auto-solve shift + tilt to reach target
    autoSolvePosition();
  } else {
    // Drop free: let compute() derive drop from target position
    store.dropDriver = false;
    updateDropModeLabel();
  }
  refresh();
}

g('targetH').addEventListener('input', imageEdit);

document.querySelectorAll('input[name="pt"]').forEach(el => el.addEventListener('change', function() {
  g('posLbl').textContent = { bottom:'Media bottom height', center:'Center height', top:'Top edge height' }[this.value];
  imageEdit();
}));

// ─── Geometry inputs ──────────────────────────────────────────────────────────
g('ratio').addEventListener('input', function() {
  if (!this.readOnly) {
    if (g('zoomRow').style.display !== 'none') g('zoomSlider').value = this.value;
    tri('ratio'); refresh();
  }
});
g('imgW').addEventListener('input', function() { tri('width'); refresh(); });
g('imgH').addEventListener('input', function() { tri('height'); refresh(); });
g('dist').addEventListener('input', function() {
  if (!this.readOnly) { tri('dist'); refresh(); }
});
g('zoomSlider').addEventListener('input', function() {
  if (g('ratio').readOnly) return;
  const v = parseFloat(this.value).toFixed(2);
  g('ratio').value = v;
  g('zoomVal').textContent = v + ':1';
  tri('ratio'); refresh();
});

// ─── Shift ────────────────────────────────────────────────────────────────────
g('sPct').addEventListener('input', function() {
  if (!this.readOnly) { S.shiftPct = +this.value; refresh(); }
});

g('sMm').addEventListener('input', function() {
  if (this.readOnly) return;
  rd();
  const nativeAspect = store.activePreset ? parseFloat(store.activePreset.aspectVal) : S.aspect;
  const nativeW = S.dist / S.ratio;
  const nativeH = nativeW / nativeAspect;
  S.shiftPct = nativeH ? (((+this.value) / 10) / nativeH) * 100 : 0;
  g('sPct').value = S.shiftPct.toFixed(2);
  refresh();
});

g('aspect').addEventListener('change', function() { tri('aspect'); refresh(); });

// ─── Other inputs ─────────────────────────────────────────────────────────────
['maxUp','maxDn','maxH'].forEach(id => {
  const el = g(id); if (el) el.addEventListener('input', function() { this.dataset.raw = this.value; refresh(); });
});
['ceilH','wallH','hPct','bodyH','tiltDeg','maxKS','personDist','lumens','gain'].forEach(id => {
  const el = g(id); if (el) el.addEventListener('input', refresh);
});
g('lumensMode').addEventListener('change', refresh);
g('personOn').addEventListener('change', refresh);

// ─── Theme toggle ─────────────────────────────────────────────────────────────
g('themeBtn').addEventListener('click', () => {
  const html = document.documentElement;
  const isDark = html.dataset.theme === 'dark' ||
    (html.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  html.dataset.theme = isDark ? 'light' : 'dark';
  g('themeBtn').textContent = isDark ? '☽' : '☀';
  refresh();
});

// ─── Print support ───────────────────────────────────────────────────────────
g('printBtn').addEventListener('click', () => window.print());
const printImg = g('printImg');
window.addEventListener('beforeprint', () => {
  printImg.src = g('cv').toDataURL('image/png');
});
window.addEventListener('afterprint', () => {
  printImg.src = '';
});

// ─── Resize observer + dark mode ─────────────────────────────────────────────
let resizeTimer;
const ro = new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => draw(compute()), 10);
});
ro.observe(document.querySelector('.dia'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refresh);

// ─── Boot ─────────────────────────────────────────────────────────────────────
{
  const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
  g('themeBtn').textContent = isDark ? '☽' : '☀';
}
if (location.hash.startsWith('#s=')) {
  try {
    loadSetup(JSON.parse(atob(location.hash.slice(3))));
    history.replaceState(null, '', location.pathname);
  } catch { setTimeout(refresh, 100); }
} else {
  setTimeout(refresh, 100);
}
