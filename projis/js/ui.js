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
  const el = g('dropModeLabel'), dv = g('dropV');
  const dropLbl  = g('dropLbl');
  const bodyHLbl = g('bodyHLbl');
  if (store.floorMode) {
    if (dropLbl)  dropLbl.textContent  = 'Pedestal height';
    if (bodyHLbl) bodyHLbl.textContent = 'Lens above pedestal';
  } else {
    if (dropLbl)  dropLbl.textContent  = 'Drop from ceiling';
    if (bodyHLbl) bodyHLbl.textContent = 'Lens to mount plate';
  }
  if (store.dropDriver) {
    el.textContent = store.floorMode ? 'Driver: pedestal height sets projector' : 'Driver: drop sets projector height';
    el.style.color  = 'var(--color-text-success)';
    dv.classList.add('drv');
  } else {
    el.textContent  = 'Derived from media position';
    el.style.color  = 'var(--color-text-tertiary)';
    dv.classList.remove('drv');
  }
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
  h += card('Throw distance (H)', `${S.dist.toFixed(0)} cm`, '');
  h += card('Lens → screen center', `${r.lensToScreen.toFixed(1)} cm`, '');
  h += card('Media Area', `${r.mediaW.toFixed(1)} × ${r.mediaH.toFixed(1)} cm`, '');

  if (r.isLetterboxed || r.isPillared) {
    h += card('Projected Native', `${r.nativeW.toFixed(1)} × ${r.nativeH.toFixed(1)} cm`, 'ti', 'Black light output');
  }

  h += card('Lens height',     `${r.lH.toFixed(1)} cm`,   r.lensOk ? '' : 'warn');
  h += card(store.floorMode ? 'Pedestal height' : 'Drop (ceil→lens)', `${r.drop.toFixed(1)} cm`, '');
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
      h += card('Calculated floor to extension bottom', `${floorToExtBottom.toFixed(1)} cm`, '');
      h += card('Extension adjust', adjustText, adjustCls, adjustBadge, true);
    }
  }
  // S.maxUp / S.maxDn are already ceiling-flipped room-direction limits (updated in refresh())
  const shiftLimitStr = store.activePreset
    ? `+${S.maxUp.toFixed(0)}%/−${S.maxDn.toFixed(0)}%`
    : `${Math.abs(Math.round(r.userShiftM / (r.nativeH || 1) * 100))}%`;
  h += card('Shift V (user)',
    `${S.shiftPct >= 0 ? '+' : ''}${S.shiftPct.toFixed(1)}% / ${r.shiftOk ? '' : '⚠ '}${shiftLimitStr}`,
    r.shiftOk ? 'ok' : 'warn',
    r.shiftOk ? 'In range' : 'Out of range'
  );
  if (S.maxH > 0 || Math.abs(S.hShiftPct) > 0) {
    const hLimitStr = S.maxH > 0 ? `±${S.maxH.toFixed(0)}%` : '—';
    h += card('Shift H (user)',
      `${S.hShiftPct >= 0 ? '+' : ''}${S.hShiftPct.toFixed(1)}% / ${r.hShiftOk ? '' : '⚠ '}${hLimitStr}`,
      r.hShiftOk ? (r.combinedShiftOk ? 'ok' : 'warn') : 'warn',
      r.hShiftOk ? (r.combinedShiftOk ? 'In range' : 'Combined V+H exceeds spec') : 'Out of range'
    );
  }
  h += card('Media Top',    `${r.effTop.toFixed(1)} cm`, r.effTop > S.wallH ? 'warn' : '');
  h += card('Media Bottom', `${r.effBot.toFixed(1)} cm`, r.effBot < 0 ? 'warn' : '');
  if (store.floorMode) {
    // Floor mode: lens should be below image bottom (projector clears audience sightline from below)
    const belowBot = r.effBot - r.lH;
    h += card('Lens below bottom', `${belowBot >= 0 ? '+' : ''}${belowBot.toFixed(1)} cm`, belowBot < 0 ? 'warn' : '');
  } else {
    const sightClear = r.lH - r.effTop;
    h += card('Lens above top', `${sightClear >= 0 ? '+' : ''}${sightClear.toFixed(1)} cm`, sightClear < 0 ? 'warn' : '');
  }

  const wg = r.wallGap;
  h += card(
    'Wall gap to media top',
    wg >= 0 ? `${wg.toFixed(1)} cm` : `${Math.abs(wg).toFixed(1)} cm CLIPS`,
    wg < 0 ? 'warn' : ''
  );

  if (r.hasTilt) {
    h += card('Keystone needed', `${r.ksN.toFixed(1)}°`,
      r.ksOk ? 'ok' : 'warn',
      r.ksOk ? 'OK' : 'Exceeds max limit',
      true
    );
  }

  if (!r.distOk && store.activePreset) {
    h += card('Focus distance',
      `${store.activePreset.dMin}–${store.activePreset.dMax} cm`,
      'warn',
      'Out of focus range',
      true
    );
  }

  if (store.activePreset && store.activePreset.shiftType === 'digital' && Math.abs(r.shiftM) > 0.01) {
    h += card('Shift type', 'Digital shift — image quality reduced', 'warn', 'Digital', true);
  }

  if (store.activePreset && store.activePreset.digitalZoom) {
    const p = store.activePreset;
    // warn any time digital zoom projector is in use
    h += card('Zoom type', 'Digital zoom — image quality reduced', 'warn', 'Digital', true);
  }

  // Show aspect name using the preset's aspectVal string (avoids toFixed floating-point mismatch)
  if ((r.isLetterboxed || r.isPillared) && store.activePreset) {
    const nName = ASPECT_NAMES[store.activePreset.aspectVal] || store.activePreset.aspectVal;
    g('arInfo').textContent = `Projector Native AR is ${nName}. Unused panel area projects black light.`;
    g('arInfo').style.display = 'block';
  }

  g('res').innerHTML = h;
}
