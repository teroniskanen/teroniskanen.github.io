import { g, S, store } from './state.js';
import { PRESETS, LSVG, USVG, ASPECT_NAMES } from './data.js';
import { compute } from './compute.js';
import { draw } from './draw.js';
import { pLock, buildRoomSel, updateDropModeLabel, renderRes } from './ui.js';

// ─── Initialise lock button icons ────────────────────────────────────────────
['lkDist','lkRatio','lkBody','lkDrop','lkKS'].forEach(id => g(id).innerHTML = USVG);

// ─── Build projector preset dropdown ─────────────────────────────────────────
const psel = g('psel');
psel.innerHTML = '<option value="">— manual —</option>';
PRESETS.forEach(p => {
  const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; psel.appendChild(o);
});

// ─── Read DOM inputs into S ───────────────────────────────────────────────────
function rd() {
  S.viewW    = +g('viewW').value   || 500;
  S.ceilH    = +g('ceilH').value   || 500;
  S.wallH    = +g('wallH').value   || 300;
  S.dist     = +g('dist').value    || 405;
  S.aspect   = +g('aspect').value;
  S.ratio    = +g('ratio').value   || 1.35;
  S.imgW     = +g('imgW').value    || 300;
  S.shiftPct = +g('sPct').value    || 0;
  S.maxUp    = +g('maxUp').value;
  S.maxDn    = +g('maxDn').value;
  S.bodyH    = +g('bodyH').value   || 13.6;
  S.targetH  = +g('targetH').value || 0;
  S.posType  = document.querySelector('input[name="pt"]:checked').value;
  S.maxKS    = +g('maxKS').value   || 30;
  S.tiltDeg  = +g('tiltDeg').value || 0;
  S.drop     = +g('dropV').value   || 200;
  S.personOn   = g('personOn').checked;
  S.personDist = +g('personDist').value || 200;
}

// ─── Main refresh ─────────────────────────────────────────────────────────────
function refresh() {
  rd();

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
                :                          r.cH;
    g('targetH').value = edgeH.toFixed(1);
  } else {
    g('dropV').value = r.drop.toFixed(1);
  }

  draw(r);
  renderRes(r);
}

// ─── Geometry triangle solver ─────────────────────────────────────────────────
function tri(changed) {
  rd();
  const rFixed = g('ratio').readOnly || store.lkState.ratio;
  const dFixed = g('dist').readOnly  || store.lkState.dist;
  const nativeAspect = store.activePreset ? parseFloat(store.activePreset.aspectVal) : S.aspect;

  if (changed === 'ratio') {
    if (!dFixed) {
      const nativeW = S.dist / S.ratio;
      g('imgW').value = (S.aspect >= nativeAspect
        ? nativeW
        : nativeW * (S.aspect / nativeAspect)
      ).toFixed(1);
    }
  } else if (changed === 'width') {
    const reqNativeW = S.aspect >= nativeAspect ? S.imgW : S.imgW * (nativeAspect / S.aspect);
    if (rFixed && !dFixed) {
      g('dist').value = (S.ratio * reqNativeW).toFixed(1);
    } else if (!rFixed) {
      g('ratio').value = (S.dist / reqNativeW).toFixed(2);
      if (g('zoomRow').style.display !== 'none') g('zoomSlider').value = g('ratio').value;
    }
  } else if (changed === 'dist') {
    if (rFixed) {
      const nativeW = S.dist / S.ratio;
      g('imgW').value = (S.aspect >= nativeAspect
        ? nativeW
        : nativeW * (S.aspect / nativeAspect)
      ).toFixed(1);
    } else if (S.imgW > 0) {
      const reqNativeW = S.aspect >= nativeAspect ? S.imgW : S.imgW * (nativeAspect / S.aspect);
      g('ratio').value = (S.dist / reqNativeW).toFixed(2);
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
  pLock(['ratio','maxUp','maxDn','bodyH','maxKS'], false);
  const lb = g('lkRatio');
  lb.classList.remove('pl'); lb.innerHTML = store.lkState.ratio ? LSVG : USVG;
  lb.classList.toggle('on', store.lkState.ratio);
  g('lkBody').classList.remove('pl');
  g('zoomRow').style.display = 'none';
}

function applyPreset(p) {
  store.activePreset = p;
  if (!p) { clearPreset(); refresh(); return; }

  g('aspect').value  = p.aspectVal;
  g('ratio').value   = p.rMin.toFixed(2);
  g('maxUp').value   = p.sUp;
  g('maxDn').value   = p.sDn;
  g('bodyH').value   = p.bodyH.toFixed(1);
  g('maxKS').value   = p.ks;
  pLock(['maxUp','maxDn','bodyH','maxKS'], true);

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
  const ids   = { dist:'lkDist', ratio:'lkRatio', body:'lkBody', drop:'lkDrop', ks:'lkKS' };
  const inpIds = { dist:'dist',   ratio:'ratio',   body:'bodyH',  ks:'maxKS' };
  const btn   = g(ids[key]);
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

['lkDist','lkRatio','lkBody','lkDrop','lkKS'].forEach(id => {
  const key = { lkDist:'dist', lkRatio:'ratio', lkBody:'body', lkDrop:'drop', lkKS:'ks' }[id];
  g(id).addEventListener('click', () => toggleLock(key));
});

// ─── Room presets ─────────────────────────────────────────────────────────────
buildRoomSel();

g('rsel').addEventListener('change', function() {
  const r = store.roomPresets[+this.value]; if (!r) return;
  g('viewW').value  = r.viewW || 500;
  g('ceilH').value  = r.ceilH;
  g('wallH').value  = r.wallH;
  g('dist').value   = r.dist;
  g('targetH').value = r.targetH;
  document.querySelectorAll('input[name="pt"]').forEach(el => el.checked = (el.value === r.posType));
  g('posLbl').textContent = { bottom:'Media bottom height', center:'Center height', top:'Top edge height' }[r.posType];
  store.dropDriver = false; updateDropModeLabel(); refresh();
});

g('rsave').addEventListener('click', () => {
  const name = g('rname').value.trim() || 'Room ' + (store.roomPresets.length + 1);
  store.roomPresets.push({
    name,
    viewW:   +g('viewW').value,
    ceilH:   +g('ceilH').value,
    wallH:   +g('wallH').value,
    dist:    +g('dist').value,
    posType: document.querySelector('input[name="pt"]:checked').value,
    targetH: +g('targetH').value,
  });
  buildRoomSel();
  g('rsel').value = store.roomPresets.length - 1;
  g('rname').value = '';
});

g('rdel').addEventListener('click', () => {
  const val = g('rsel').value;
  if (!val) return;   // BUG FIX: empty string → 0, would silently delete first preset
  const i = +val;
  if (!isNaN(i) && i >= 0) { store.roomPresets.splice(i, 1); buildRoomSel(); }
});

// ─── Drop mode ────────────────────────────────────────────────────────────────
g('dropV').addEventListener('input', function() {
  if (!store.dropDriver) { store.dropDriver = true; updateDropModeLabel(); }
  refresh();
});

function imageEdit() {
  if (!store.lkState.drop) { store.dropDriver = false; updateDropModeLabel(); }
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
g('dist').addEventListener('input', function() {
  if (!this.readOnly) { tri('dist'); refresh(); }
});
g('viewW').addEventListener('input', refresh);

g('zoomSlider').addEventListener('input', function() {
  if (g('ratio').readOnly) return;
  g('ratio').value = parseFloat(this.value).toFixed(2);
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
['ceilH','wallH','maxUp','maxDn','bodyH','tiltDeg','maxKS','personDist'].forEach(id => {
  const el = g(id); if (el) el.addEventListener('input', refresh);
});
g('personOn').addEventListener('change', refresh);

// ─── Resize observer + dark mode ─────────────────────────────────────────────
let resizeTimer;
const ro = new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => draw(compute()), 10);
});
ro.observe(document.querySelector('.dia'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refresh);

// ─── Boot ─────────────────────────────────────────────────────────────────────
setTimeout(refresh, 100);
