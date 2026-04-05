import { g, store } from './state.js';
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
  rs.innerHTML = '<option value="">— select room —</option>';
  store.roomPresets.forEach((r, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = r.name; rs.appendChild(o);
  });
  localStorage.setItem('proj_rooms', JSON.stringify(store.roomPresets));
}

// Update the drop mode label and input styling
export function updateDropModeLabel() {
  const el = g('dropModeLabel'), dv = g('dropV');
  if (store.dropDriver) {
    el.textContent  = 'Driver: drop sets projector height';
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

  let h = '';
  h += card('Media Area', `${r.mediaW.toFixed(1)} × ${r.mediaH.toFixed(1)} cm`, '');

  if (r.isLetterboxed || r.isPillared) {
    h += card('Projected Native', `${r.nativeW.toFixed(1)} × ${r.nativeH.toFixed(1)} cm`, 'ti', 'Black light output');
  }

  h += card('Lens height',     `${r.lH.toFixed(1)} cm`,   r.lensOk ? '' : 'warn');
  h += card('Drop (ceil→lens)',`${r.drop.toFixed(1)} cm`,  '');
  h += card('Shift',
    `${r.shiftM >= 0 ? '+' : ''}${(r.shiftM * 10).toFixed(0)} mm / ${r.shiftOk ? '' : '⚠ '}${store.activePreset ? `±${store.activePreset.sUp}%` : `${Math.abs(Math.round(r.shiftM / (r.nativeH || 1) * 100))}%`}`,
    r.shiftOk ? 'ok' : 'warn',
    r.shiftOk ? 'In range' : 'Out of range'
  );
  h += card('Media Bottom', `${r.effBot.toFixed(1)} cm`, r.effBot < 0 ? 'warn' : '');

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

  // Show aspect name using the preset's aspectVal string (avoids toFixed floating-point mismatch)
  if ((r.isLetterboxed || r.isPillared) && store.activePreset) {
    const nName = ASPECT_NAMES[store.activePreset.aspectVal] || store.activePreset.aspectVal;
    g('arInfo').textContent = `Projector Native AR is ${nName}. Unused panel area projects black light.`;
    g('arInfo').style.display = 'block';
  }

  g('res').innerHTML = h;
}
