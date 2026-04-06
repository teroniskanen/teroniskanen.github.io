import { S, store } from './state.js';
import { PERSON_H } from './data.js';

export function compute() {
  const { activePreset, dropDriver, floorMode } = store;
  // In manual mode nativeAspect === S.aspect, so isPillared/isLetterboxed are always false
  const nativeAspect = activePreset ? parseFloat(activePreset.aspectVal) : S.aspect;

  // Throw distance + ratio define the absolute native panel bounds
  const nativeW = S.dist / S.ratio;
  const nativeH = nativeW / nativeAspect;

  let mediaW, mediaH;
  if (S.aspect >= nativeAspect) {   // letterbox or exact fit
    mediaW = nativeW; mediaH = nativeW / S.aspect;
  } else {                           // pillarbox
    mediaH = nativeH; mediaW = nativeH * S.aspect;
  }

  const isPillared   = Math.abs(mediaW - nativeW) > 0.1;
  const isLetterboxed = Math.abs(mediaH - nativeH) > 0.1;

  // Lens shift is a percentage of the native panel height
  const shiftM = (S.shiftPct / 100) * nativeH;

  const tr      = S.tiltDeg * Math.PI / 180;
  const hasTilt = Math.abs(S.tiltDeg) > 0.01;

  let lH, cH, drop;
  if (dropDriver) {
    drop = S.drop;
    // floor mode: drop = pedestal height; lH = pedestal + bodyH_from_base
    // ceil mode:  drop = distance ceiling→lens; lH = ceilH − drop
    lH = floorMode ? drop + S.bodyH : S.ceilH - drop;
    cH = lH + shiftM;
  } else {
    // cH = target image centre; invert combined model so image lands exactly there:
    // tCH = lH + shiftM - dist·tan(tr) = cH  →  lH = cH - shiftM + dist·tan(tr)
    cH = S.posType === 'bottom' ? S.targetH + mediaH / 2
       : S.posType === 'top'    ? S.targetH - mediaH / 2
       :                          S.targetH;
    lH   = cH - shiftM + S.dist * Math.tan(tr);
    drop = floorMode ? lH - S.bodyH : S.ceilH - lH;
  }

  // rod = extension rod above body (ceiling mount only)
  const rod = floorMode ? 0 : drop - S.bodyH;
  const shiftOk = S.shiftPct >= -S.maxDn && S.shiftPct <= S.maxUp;
  const lensOk  = lH > 0 && lH < S.ceilH;

  // Combined model: shift and tilt both contribute to effective image centre
  const tCH = lH + shiftM - S.dist * Math.tan(tr);

  const imgTop    = cH + mediaH  / 2;
  const imgBot    = cH - mediaH  / 2;
  const nativeTop = cH + nativeH / 2;
  const nativeBot = cH - nativeH / 2;

  // Effective bounds always from combined tCH
  const effTop    = tCH + mediaH  / 2;
  const effBot    = tCH - mediaH  / 2;
  const effNatTop = tCH + nativeH / 2;
  const effNatBot = tCH - nativeH / 2;

  const ksN        = Math.abs(S.tiltDeg);
  const ksOk       = ksN <= S.maxKS;
  const aboveSight = lH > effTop;
  const wallGap    = S.wallH - effTop;

  let shadowH = null, personClears = false;
  if (S.personOn && S.personDist > 0 && S.personDist < S.dist) {
    const t  = S.dist / (S.dist - S.personDist);
    shadowH  = lH + (PERSON_H - lH) * t;
    personClears = shadowH < effBot || shadowH > effTop;
  }

  const ratioOk = activePreset
    ? S.ratio >= activePreset.rMin - 0.001 && S.ratio <= activePreset.rMax + 0.001
    : true;

  const distOk = activePreset && activePreset.dMin != null
    ? S.dist >= activePreset.dMin && S.dist <= activePreset.dMax
    : true;

  return {
    mediaW, mediaH, nativeW, nativeH, shiftM,
    cH, lH, drop, rod,
    shiftOk, lensOk,
    tCH, hasTilt, ksN, ksOk,
    effTop, effBot, effNatTop, effNatBot,
    aboveSight, wallGap,
    shadowH, personClears,
    ratioOk, isLetterboxed, isPillared, nativeAspect, distOk,
  };
}
