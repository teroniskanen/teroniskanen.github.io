import { g, S, store } from './state.js';
import { ASPECT_NAMES, LSVG, USVG, PRESETS } from './data.js';

// Lock input fields visually (preset-locked fields get warning style)
export const pLock = (ids, on) => ids.forEach(id => {
  const e = g(id); if (!e) return;
  e.readOnly = on;
  on ? e.classList.add('inp-p') : e.classList.remove('inp-p');
});

// Rebuild room select dropdown and persist to localStorage
export function buildRoomSel() {
  const rs = g('rsel');
  const prevValue = rs.value;
  const prevName = prevValue !== '' && store.roomPresets[+prevValue]
    ? store.roomPresets[+prevValue].name
    : '';
  rs.innerHTML = '<option value="">— select —</option>';
  store.roomPresets.forEach((r, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = r.name; rs.appendChild(o);
  });
  if (prevName) {
    const nextIdx = store.roomPresets.findIndex(r => r && r.name === prevName);
    rs.value = nextIdx >= 0 ? String(nextIdx) : '';
  } else {
    rs.value = '';
  }
  localStorage.setItem('proj_rooms', JSON.stringify(store.roomPresets));
}

// Update the drop mode label and input styling
export function updateDropModeLabel() {
  const dv = g('dropV');
  const dropLbl  = g('dropLbl');
  const bodyHLbl = g('bodyHLbl');
  const dropWord = store.floorMode ? 'Pedestal' : 'Drop';
  if (store.floorMode) {
    if (dropLbl)  dropLbl.textContent  = 'Pedestal height';
    if (bodyHLbl) bodyHLbl.textContent = 'Lens above pedestal';
  } else {
    if (dropLbl)  dropLbl.textContent  = 'Drop from ceiling';
    if (bodyHLbl) bodyHLbl.textContent = 'Lens center to mount plate';
  }
  dv.classList.toggle('drv', store.dropDriver);
  g('targetH').classList.toggle('drv', !store.dropDriver);

  // Center height's padlock mirrors Drop's — locked means that field is the driver.
  const lkTargetH = g('lkTargetH');
  if (lkTargetH) {
    lkTargetH.classList.toggle('on', !store.dropDriver);
    lkTargetH.innerHTML = !store.dropDriver ? LSVG : USVG;
  }

  // Ceiling-extension-rod verification fields have no meaning on a pedestal/table mount.
  const msRows = g('measuredStackRows');
  if (msRows) msRows.style.display = store.floorMode ? 'none' : '';

  const dtPos = g('dtPos'), dtDrop = g('dtDrop');
  if (dtPos)  { dtPos.textContent  = `Position → ${dropWord}`; dtPos.classList.toggle('active', !store.dropDriver); }
  if (dtDrop) { dtDrop.textContent = `${dropWord} → Position`; dtDrop.classList.toggle('active', store.dropDriver); }
}

// When no preset is active, the entered dist + image width imply a required throw ratio
// (dist / native width). Lists which PRESETS could actually deliver that ratio at that
// distance, so the user can shop for a projector instead of just reading the raw number.
// Clicking an entry hands off to app.js's onMatchPick to load the preset at this ratio.
const RATIO_EPS = 0.005;
export function renderMatches(dist, reqRatio, onMatchPick) {
  const box = g('matchBox');
  if (!box) return;
  if (store.activePreset || !(dist > 0) || !(reqRatio > 0) || !isFinite(reqRatio)) {
    box.classList.remove('on');
    box.innerHTML = '';
    return;
  }
  const matches = PRESETS.filter(p =>
    reqRatio >= p.rMin - RATIO_EPS && reqRatio <= p.rMax + RATIO_EPS &&
    dist >= p.dMin && dist <= p.dMax
  );
  if (!matches.length) {
    box.classList.remove('on');
    box.innerHTML = '';
    return;
  }
  box.classList.add('on');
  box.innerHTML = `<div class="matchHdr">Needs ${reqRatio.toFixed(2)}:1 throw ratio — matching projectors:</div>`;
  matches.forEach(p => {
    const row = document.createElement('div');
    row.className = 'matchItem';
    const rangeTxt = p.fixed ? `${p.rMin.toFixed(2)}:1 fix` : `${p.rMin.toFixed(2)}-${p.rMax.toFixed(2)}:1`;
    row.innerHTML = `<span>${p.name}</span><span class="mi-ratio">${rangeTxt}</span>`;
    row.addEventListener('click', () => onMatchPick(p, reqRatio));
    box.appendChild(row);
  });
}

// Computes the drop/pedestal height that needs zero user shift and zero tilt to hit the
// current target — i.e. the built-in preset vOffset alone does the work — and renders it
// into the dedicated solver panel next to the Drop field. Shift and tilt each cost lumens
// or resolution at the lens, so this shows how much physical repositioning buys that back.
// Returns the ideal drop value (cm) so app.js's Apply handler can use it, or null when the
// panel has nothing actionable to offer (already optimal, or physically unreachable).
export function updateSolverPanel(r) {
  const panel = g('idealPanel');
  if (!panel) return null;
  const msgEl = g('idealMsg');
  const applyBtn = g('idealApply');

  if (!(Math.abs(S.shiftPct) > 0.1 || r.hasTilt)) {
    panel.style.display = 'none';
    return null;
  }
  panel.style.display = '';
  panel.classList.remove('st-ok', 'st-warn');

  const cH_goal = S.posType === 'bottom' ? S.targetH + r.mediaH / 2
                 : S.posType === 'top'    ? S.targetH - r.mediaH / 2
                 :                          S.targetH;
  const vOffsetPct = store.activePreset ? (store.activePreset.vOffset || 0) : 0;
  const naturalOffsetM = (store.floorMode ? vOffsetPct : -vOffsetPct) / 100 * r.nativeH;
  const lHIdeal = cH_goal - naturalOffsetM;
  const dropIdeal = store.floorMode ? lHIdeal - S.bodyH : S.ceilH - lHIdeal;
  const maxDrop = Math.max(0, store.floorMode ? S.ceilH - S.bodyH : S.ceilH);
  const feasible = dropIdeal > -0.5 && dropIdeal < maxDrop + 0.5;
  const mountWord = store.floorMode ? 'pedestal' : 'mount';

  if (!feasible) {
    // Don't report an unbuildable number — clamp to the physical bound and report the
    // shift the installer is actually stuck with at that boundary.
    const dropClamped = Math.max(0, Math.min(maxDrop, dropIdeal));
    const lHClamped = store.floorMode ? dropClamped + S.bodyH : S.ceilH - dropClamped;
    const shiftMResidual = cH_goal - lHClamped - naturalOffsetM;
    const shiftPctResidual = r.nativeH > 0 ? (shiftMResidual / r.nativeH) * 100 : 0;
    panel.classList.add('st-warn');
    msgEl.textContent = `Not reachable — closest ${mountWord} position still needs ~${Math.abs(shiftPctResidual).toFixed(0)}% shift`;
    applyBtn.style.display = 'none';
    return null;
  }

  const delta = dropIdeal - r.drop;
  if (Math.abs(delta) < 0.5) {
    panel.classList.add('st-ok');
    msgEl.textContent = 'Already at the optimal mount position — reduce shift/tilt toward 0 to use it';
    applyBtn.style.display = 'none';
    return null;
  }

  const dir = store.floorMode
    ? (delta > 0 ? 'Raise' : 'Lower')
    : (delta > 0 ? 'Lower' : 'Raise');
  msgEl.textContent = `${dir} ${mountWord} by ${Math.abs(delta).toFixed(1)} cm → ~0% shift, 0° tilt`;
  applyBtn.style.display = '';
  return dropIdeal;
}

// Tracks the <details> open/closed state across re-renders — renderKeystoneTable rebuilds
// the panel's innerHTML on every refresh() (dozens of times per session), and a plain
// rebuild would silently re-collapse it the moment the user touches any other field.
let ksOpen = false;

// Renders the collapsible "distances for exact keystone" table (see app.js's
// computeKeystoneDistances for the derivation). Collapsed by default via <details>.
export function renderKeystoneTable(data, onPick) {
  const box = g('ksBox');
  if (!box) return;

  if (!data) { box.style.display = 'none'; box.innerHTML = ''; return; }

  if (data.fixedLens || data.needsDropDriver) {
    box.style.display = '';
    const note = data.fixedLens
      ? 'Fixed-throw-ratio lens — image size and distance are locked together, so there\'s nothing to solve for.'
      : 'Lock the drop/pedestal height to see which distances give an exact keystone value.';
    box.innerHTML = `<details class="ks-details"${ksOpen ? ' open' : ''}>
      <summary>Distances for exact keystone values</summary>
      <div class="ks-note">${note}</div>
    </details>`;
    box.querySelector('details').addEventListener('toggle', e => { ksOpen = e.target.open; });
    return;
  }

  // Zero tilt already reaches the target at the current mount position — no keystone
  // needed at all, so there's nothing this table can usefully add.
  if (data.zeroFeasible || !data.rows || !data.rows.length) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  box.style.display = '';
  const rowsHtml = data.rows
    .sort((a, b) => a.tilt - b.tilt)
    .map(row => {
      const cells = [row.near, row.far].filter(Boolean).map(c => {
        const cls = c.inLens ? '' : ' ks-oor';
        const title = c.inLens ? '' : ' title="Outside this lens\'s throw-ratio/focus range"';
        return `<span class="ks-d${cls}"${title} data-d="${c.d}" data-r="${c.ratio}" data-t="${row.tilt}">${c.d.toFixed(0)} cm</span>`;
      }).join('');
      return `<div class="ks-row"><span class="ks-tilt">${row.tilt > 0 ? '+' : ''}${row.tilt}°</span>${cells}</div>`;
    }).join('');
  box.innerHTML = `<details class="ks-details"${ksOpen ? ' open' : ''}>
    <summary>Distances for exact keystone values</summary>
    <div class="ks-note">At the current image size, only these distances land the required tilt on a whole degree — everything between them leaves a fractional-degree trapezoid your correction menu can't remove.</div>
    <div class="ks-table">${rowsHtml}</div>
  </details>`;
  box.querySelector('details').addEventListener('toggle', e => { ksOpen = e.target.open; });
  box.querySelectorAll('.ks-d:not(.ks-oor)').forEach(el => {
    el.addEventListener('click', () => onPick(+el.dataset.d, +el.dataset.r, +el.dataset.t));
  });
}

// Render the results bar at the bottom
export function renderRes(r) {
  const card = (label, value, cls, badge, wide) =>
    `<div class="rc${wide ? ' tw' : ''}">` +
    `<div class="rl">${label}</div>` +
    `<div class="rv${cls ? ' ' + cls : ''}">${value}</div>` +
    (badge ? `<div class="ba ${cls}">${badge}</div>` : '') +
    `</div>`;

  const measuredDrop = S.mCeilToExt + S.mExtToTop + S.bodyH;
  const floorToExtBottom = S.ceilH - S.mCeilToExt;
  const hasMeasuredStack = S.mCeilToExt > 0 && S.mExtToTop > 0;

  let h = '';

  // Room: Ceiling height, Wall height, Throw distance, Lens → screen (slant) — both already
  // shown live in the sidebar fields, so no plain-echo cards here.
  if (!r.distOk && store.activePreset) {
    h += card('Focus distance',
      `${store.activePreset.dMin}–${store.activePreset.dMax} cm`,
      'warn',
      'Out of focus range',
      true
    );
  }

  // Media: aspect ratio, width, height — width/height already shown live in the sidebar fields.
  if (r.isLetterboxed || r.isPillared) {
    h += card('Projected Native', `${r.nativeW.toFixed(1)} × ${r.nativeH.toFixed(1)} cm`, 'ti', 'Black light output');
  }

  // Media position on surface: throw ratio, zoom, Bottom/Center/Top, Center height, drive toggle
  h += card('Media Top height',    `${r.effTop.toFixed(1)} cm`, r.effTop > S.wallH ? 'warn' : '');
  h += card('Media Bottom height', `${r.effBot.toFixed(1)} cm`, r.effBot < 0 ? 'warn' : '');
  const wg = r.wallGap;
  h += card(
    'Surface gap to media top',
    wg >= 0 ? `${wg.toFixed(1)} cm` : `${Math.abs(wg).toFixed(1)} cm CLIPS`,
    wg < 0 ? 'warn' : ''
  );
  if (store.activePreset && store.activePreset.digitalZoom && S.ratio > store.activePreset.rMin + 0.001) {
    h += card('Zoom type', 'Digital zoom — image quality reduced', 'warn', 'Digital', true);
  }

  // Lens shift (V): shift %, spec limit
  // S.maxUp / S.maxDn are already ceiling-flipped room-direction limits (updated in refresh())
  const shiftLimitStr = store.activePreset
    ? `+${S.maxUp.toFixed(0)}%/−${S.maxDn.toFixed(0)}%`
    : `${Math.abs(Math.round(r.userShiftM / (r.nativeH || 1) * 100))}%`;
  h += card('Shift V (user)',
    `${S.shiftPct >= 0 ? '+' : ''}${S.shiftPct.toFixed(1)}% / ${r.shiftOk ? '' : '⚠ '}${shiftLimitStr}`,
    r.shiftOk ? 'ok' : 'warn',
    r.shiftOk ? 'In range' : 'Out of range'
  );

  // Lens shift (H): H shift %, spec limit
  if (S.maxH > 0 || Math.abs(S.hShiftPct) > 0) {
    const hLimitStr = S.maxH > 0 ? `±${S.maxH.toFixed(0)}%` : '—';
    h += card('Shift H (user)',
      `${S.hShiftPct >= 0 ? '+' : ''}${S.hShiftPct.toFixed(1)}% / ${r.hShiftOk ? '' : '⚠ '}${hLimitStr}`,
      r.hShiftOk ? (r.combinedShiftOk ? 'ok' : 'warn') : 'warn',
      r.hShiftOk ? (r.combinedShiftOk ? 'In range' : 'Combined V+H exceeds spec') : 'Out of range'
    );
  }
  if (store.activePreset && store.activePreset.shiftType === 'digital' && (Math.abs(r.userShiftM) > 0.01 || Math.abs(S.hShiftPct) > 0.01)) {
    h += card('Shift type', 'Digital shift — image quality reduced', 'warn', 'Digital', true);
  }

  // Projector mounting: Ceiling/Pedestal, Drop/Pedestal height, mount-plate offsets — the
  // drop/pedestal value itself already shown live in its sidebar field.
  h += card('Lens height', `${r.lH.toFixed(1)} cm`, r.lensOk ? '' : 'warn');
  if (!store.floorMode) {
    h += card('Extension rod', r.rod > 0 ? `${r.rod.toFixed(1)} cm` : '— (none)', r.rod < 0 ? 'warn' : '');
    if (hasMeasuredStack) {
      const dropDelta = r.drop - measuredDrop;
      let adjustText = 'Measure both values';
      let adjustCls = 'ti';
      let adjustBadge = 'Guide';
      if (measuredDrop > 0) {
        if (Math.abs(dropDelta) < 0.5) {
          adjustText = 'On target';
          adjustCls = 'ok';
          adjustBadge = 'No rod change';
        } else if (dropDelta > 0) {
          adjustText = `Lengthen extension by ${dropDelta.toFixed(1)} cm`;
          adjustCls = 'warn';
          adjustBadge = 'Lens too high now';
        } else {
          adjustText = `Shorten extension by ${Math.abs(dropDelta).toFixed(1)} cm`;
          adjustCls = 'warn';
          adjustBadge = 'Lens too low now';
        }
      }
      h += card('Measured lens drop', `${measuredDrop.toFixed(1)} cm`, '');
      h += card('Floor to extension bottom', `${floorToExtBottom.toFixed(1)} cm`, '');
      h += card('Extension adjust', adjustText, adjustCls, adjustBadge, true);
    }
  }
  if (store.floorMode) {
    const belowBot = r.effBot - r.lH;
    h += card('Lens clearance below image', `${belowBot >= 0 ? '+' : ''}${belowBot.toFixed(1)} cm`, belowBot < 0 ? 'warn' : '');
  } else {
    const sightClear = r.lH - r.effTop;
    h += card('Lens clearance above image', `${sightClear >= 0 ? '+' : ''}${sightClear.toFixed(1)} cm`, sightClear < 0 ? 'warn' : '');
  }

  // Tilt: angle, max keystone
  if (r.hasTilt) {
    h += card('Keystone required', `${r.ksN.toFixed(1)}°`,
      r.ksOk ? 'ok' : 'warn',
      r.ksOk ? 'OK' : 'Exceeds max limit',
      true
    );
  }

  // Show aspect name using the preset's aspectVal string (avoids toFixed floating-point mismatch)
  if ((r.isLetterboxed || r.isPillared) && store.activePreset) {
    const nName = ASPECT_NAMES[store.activePreset.aspectVal] || store.activePreset.aspectVal;
    g('arInfo').textContent = `Projector Native AR is ${nName}. Unused panel area projects black light.`;
    g('arInfo').style.display = 'block';
  }

  g('res').innerHTML = h;
  renderLaserTargets(r);
}

export function renderLaserTargets(r) {
  const container = g('laserRes');
  if (!container) return;

  const { activePreset } = store;
  if (!activePreset) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  container.style.display = 'flex';

  // info is shown only when it adds something the label/value don't already say —
  // a measuring instruction or a number that isn't printed elsewhere.
  const card = (label, value, info) =>
    `<div class="rc">` +
    `<div class="rl">${label}</div>` +
    `<div class="rv">${value}</div>` +
    (info ? `<div class="ba info">${info}</div>` : '') +
    `</div>`;

  let h = '<div class="tlbl">Laser Installation Targets</div>';
  // Z-Axis (Depth / Throw)
  const zLabel = r.isUST
    ? 'Depth: Surface → Projector Rear'
    : 'Depth: Screen → Projector Front';
  const zInfo = r.isUST
    ? 'Hold laser against the surface; measure to projector rear'
    : 'Hold laser against the screen; measure to projector face';
  h += card(zLabel, `${r.targetZ.toFixed(1)} cm`, zInfo);

  // Yaw (Squareness)
  h += card('Square: Screen → Both Corners', `L/R: ${r.squarenessAB.toFixed(1)} cm`, 'Measure both front corners to screen; must match exactly');

  // Y-Axis (Vertical)
  const yLensLabel = store.floorMode
    ? 'Height: Floor → Lens Center'
    : 'Height: Ceiling → Lens Center';
  h += card(yLensLabel, `${r.targetYLens.toFixed(1)} cm`, '');

  const yBodyLabel = store.floorMode ? 'Height: Floor → Projector Base' : 'Height: Ceiling → Projector Body';
  const yBodyInfo = store.floorMode
    ? `Flat bottom of projector (feet included); lens center is ${S.bodyH.toFixed(1)} cm above`
    : `Top of projector body; lens center is ${S.bodyH.toFixed(1)} cm below`;
  h += card(yBodyLabel, `${r.targetYBody.toFixed(1)} cm`, yBodyInfo);

  const yImgAbsLabel = store.floorMode
    ? 'Height: Floor → Image Bottom'
    : 'Height: Ceiling → Image Top';
  const yImgAbsVal = store.floorMode ? r.effBot : (S.ceilH - r.effTop);
  const yImgAbsInfo = store.floorMode
    ? "Height of the image's bottom edge above the floor"
    : "Depth of the image's top edge below the ceiling";
  h += card(yImgAbsLabel, `${yImgAbsVal.toFixed(1)} cm`, yImgAbsInfo);

  // Ceiling mode: the projector's mount plate sits right at the ceiling, so this would be
  // identical to the absolute row above — only show it in floor mode, where the projector's
  // surface (table/pedestal) is a different datum than the floor.
  if (store.floorMode) {
    h += card('Offset: Table → Image Bottom', `${r.targetYHeight.toFixed(1)} cm`, 'Laser target when measuring from the projector surface');
  }

  // X-Axis (Horizontal Side-to-Side)
  const xFmt = v => `${v >= 0 ? '+' : ''}${v.toFixed(1)} cm`;
  h += card('Side: Center Line → Lens', xFmt(r.lensFromScreenCenter), '');
  h += card('Side: Center Line → Projector Left', xFmt(r.chassisLeftFromScreenCenter), '');
  h += card('Side: Center Line → Projector Right', xFmt(r.chassisRightFromScreenCenter), '');

  container.innerHTML = h;
}
