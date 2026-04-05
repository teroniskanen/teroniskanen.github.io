import { S, store } from './state.js';
import { PERSON_H } from './data.js';

export function compute() {
  const { activePreset, dropDriver } = store;
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

  let lH, cH, drop;
  if (dropDriver) {
    drop = S.drop; lH = S.ceilH - drop; cH = lH + shiftM;
  } else {
    cH = S.posType === 'bottom' ? S.targetH + mediaH / 2
       : S.posType === 'top'    ? S.targetH - mediaH / 2
       :                          S.targetH;
    lH = cH - shiftM; drop = S.ceilH - lH;
  }

  const rod     = drop - S.bodyH;
  const shiftOk = S.shiftPct >= -S.maxDn && S.shiftPct <= S.maxUp;
  const lensOk  = lH > 0 && lH < S.ceilH;

  const imgTop    = cH + mediaH / 2,  imgBot    = cH - mediaH / 2;
  const nativeTop = cH + nativeH / 2, nativeBot = cH - nativeH / 2;

  const tr     = S.tiltDeg * Math.PI / 180;
  const tCH    = lH - S.dist * Math.tan(tr);
  const hasTilt = Math.abs(S.tiltDeg) > 0.01;

  const effTop    = hasTilt ? tCH + mediaH  / 2 : imgTop;
  const effBot    = hasTilt ? tCH - mediaH  / 2 : imgBot;
  const effNatTop = hasTilt ? tCH + nativeH / 2 : nativeTop;
  const effNatBot = hasTilt ? tCH - nativeH / 2 : nativeBot;

  const ksN       = Math.abs(S.tiltDeg);
  const ksOk      = ksN <= S.maxKS;
  const aboveSight = lH > effTop;
  const wallGap   = S.wallH - effTop;

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
