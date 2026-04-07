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

  // Built-in vertical offset: image centre above (+) or below (−) lens at zero user-shift.
  // In standard (floor/table-top) orientation this is positive (image projects upward).
  // When ceiling-mounted the projector is inverted so the sign flips.
  const vOffsetPct = activePreset ? (activePreset.vOffset || 0) : 0;
  const naturalShiftPct = floorMode ? vOffsetPct : -vOffsetPct;

  // User-applied lens shift (positive = image moves UP in room regardless of mount orientation)
  const userShiftM = (S.shiftPct / 100) * nativeH;

  // Total shift from lens to image centre (built-in offset + user adjustment)
  const shiftM = ((naturalShiftPct + S.shiftPct) / 100) * nativeH;

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
    // Exact inverse of the forward tCH model.
    // Forward: baseAngle = atan2(shiftM, dist); angleDelta = mirror?2*tr:tr; tCH = lH + dist*tan(baseAngle - angleDelta)
    // Inverse: lH = targetCH - dist*tan(baseAngle - angleDelta)  (baseAngle independent of lH)
    const targetCH = S.posType === 'bottom' ? S.targetH + mediaH / 2
                   : S.posType === 'top'    ? S.targetH - mediaH / 2
                   :                          S.targetH;
    const angleDeltaInv = (activePreset && activePreset.ustMirror) ? 2 * tr : tr;
    const baseAngleInv  = Math.atan2(shiftM, S.dist);
    const newAngleInv   = baseAngleInv - angleDeltaInv;
    lH   = targetCH - S.dist * Math.tan(newAngleInv);
    cH   = lH + shiftM;
    drop = floorMode ? lH - S.bodyH : S.ceilH - lH;
  }

  // rod = extension rod above body (ceiling mount only)
  const rod = floorMode ? 0 : drop - S.bodyH;
  const EPS = 0.01;
  const shiftOk = S.shiftPct >= -S.maxDn - EPS && S.shiftPct <= S.maxUp + EPS;
  const lensOk  = lH > -EPS && lH < S.ceilH + EPS;
  // Floor: body base (drop) must be at or above floor. Ceiling: rod must be ≥ 0 (body fits between ceiling and lens).
  const bodyOk  = floorMode ? drop >= -EPS : rod >= -EPS;

  // Base optical angle from the lens to the un-tilted center
  const baseAngle = Math.atan2(cH - lH, S.dist);

  // Apply mirror penalty (doubles the tilt angle effect)
  const angleDelta = (activePreset && activePreset.ustMirror) ? 2 * tr : tr;

  // Calculate final target using exact trigonometry
  // (Subtracting angleDelta preserves your existing convention where +tilt moves image down)
  const newAngle = baseAngle - angleDelta;
  const tCH = lH + S.dist * Math.tan(newAngle);

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
  // Ceiling mode: check projector is above image top (audience sightline)
  // Floor mode:   check projector is below image bottom (it's below the screen, no sightline issue)
  const aboveSight = floorMode ? lH < effNatBot : lH > effNatTop;
  const wallGap    = S.wallH - effTop;

  let shadowH = null, personClears = false;
  if (S.personOn && S.personDist > 0 && S.personDist < S.dist) {
    const t  = S.dist / (S.dist - S.personDist);
    shadowH  = lH + (PERSON_H - lH) * t;
    // The shadow extends from the floor up to shadowH.
    // It only clears the screen if it never reaches the bottom edge.
    personClears = shadowH < effNatBot;
  }

  const ratioOk = activePreset
    ? S.ratio >= activePreset.rMin - 0.001 && S.ratio <= activePreset.rMax + 0.001
    : true;

  const distOk = activePreset && activePreset.dMin != null
    ? S.dist >= activePreset.dMin && S.dist <= activePreset.dMax
    : true;

  return {
    mediaW, mediaH, nativeW, nativeH, shiftM, userShiftM,
    cH, lH, drop, rod,
    shiftOk, lensOk, bodyOk,
    tCH, hasTilt, ksN, ksOk,
    effTop, effBot, effNatTop, effNatBot,
    aboveSight, wallGap,
    shadowH, personClears,
    ratioOk, isLetterboxed, isPillared, nativeAspect, distOk,
  };
}
