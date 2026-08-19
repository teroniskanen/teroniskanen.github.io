import { g, S, store } from './state.js';
import { ASPECT_NAMES } from './data.js';

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

  // Ceiling-extension-rod verification fields have no meaning on a pedestal/table mount.
  const msRows = g('measuredStackRows');
  if (msRows) msRows.style.display = store.floorMode ? 'none' : '';

  const dtPos = g('dtPos'), dtDrop = g('dtDrop');
  if (dtPos)  { dtPos.textContent  = `Position → ${dropWord}`; dtPos.classList.toggle('active', !store.dropDriver); }
  if (dtDrop) { dtDrop.textContent = `${dropWord} → Position`; dtDrop.classList.toggle('active', store.dropDriver); }
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

  // Media position on wall: throw ratio, zoom, Bottom/Center/Top, Center height, drive toggle
  h += card('Media Top height',    `${r.effTop.toFixed(1)} cm`, r.effTop > S.wallH ? 'warn' : '');
  h += card('Media Bottom height', `${r.effBot.toFixed(1)} cm`, r.effBot < 0 ? 'warn' : '');
  const wg = r.wallGap;
  h += card(
    'Wall gap to media top',
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
    ? 'Depth: Wall → Projector Rear'
    : 'Depth: Screen → Projector Front';
  const zInfo = r.isUST
    ? 'Hold laser against the wall; measure to projector rear'
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
