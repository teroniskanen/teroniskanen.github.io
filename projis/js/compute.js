import { S, store } from './state.js';
import { PERSON_H } from './data.js';


// Viewer sightline: does the projector body hide part of the image from a viewer's eye?
// Side view, wall at x=0, projector at x=dist. A viewer at (eyeX, eyeH) sees wall point y along
// the ray whose height at x is  y + (eyeH - y)·x/eyeX.  The body (rectangle x0..x1, yBot..yTop)
// blocks that ray if the ray's height over [x0,x1] overlaps [yBot,yTop]. For one x the blocked
// wall-y range is [(yBot - eyeH·t)/(1-t), (yTop - eyeH·t)/(1-t)], t = x/eyeX, monotonic in t,
// so the union over x0..x1 is bounded by its two end values. Viewers in front of the projector
// (eyeX <= x1) look away from it and can never be blocked.
export function sightCheck(dist, lH, effTop, effBot) {
  if (!S.viewerOn) return null;
  const depth = S.chassisDepth > 0 ? S.chassisDepth : 30;
  const feet  = S.feetH || 0;
  const chH   = S.chassisH != null ? S.chassisH : 2 * S.bodyH;
  // bodyH = lens → mounting face (floor mode: base/shelf, ceiling mode: ceiling plate).
  // Floor: body spans (lH - (bodyH - feet)) upward by chassisH. Ceiling: mirrored downward from lH + (bodyH - feet).
  const refOff = S.chassisH != null ? S.bodyH - feet : S.bodyH;
  const yBot = store.floorMode ? lH - refOff : lH + refOff - chH;
  const yTop = yBot + chH;
  const x0 = dist, x1 = dist + depth;
  const eyeH = S.eyeH;
  const eyeX = S.eyeDist != null && S.eyeDist > 0 ? S.eyeDist : x1 + 50;
  const out = { eyeX, eyeH, x0, x1, yBot, yTop, auto: !(S.eyeDist > 0), blockLo: null, blockHi: null, hidden: 0, clear: null, applicable: eyeX > x1 + 0.01 };
  if (!out.applicable) { out.clear = Infinity; return out; }
  const lo = t => (yBot - eyeH * t) / (1 - t), hi = t => (yTop - eyeH * t) / (1 - t);
  const t0 = x0 / eyeX, t1 = x1 / eyeX;
  out.blockLo = Math.min(lo(t0), lo(t1));
  out.blockHi = Math.max(hi(t0), hi(t1));
  out.hidden = Math.max(0, Math.min(out.blockHi, effTop) - Math.max(out.blockLo, effBot));
  // Signed margin at the screen: negative = cm of image hidden, positive = gap between the
  // hidden band and the image (cm on the wall, nearest edge).
  if (out.hidden > 0) out.clear = -out.hidden;
  else if (out.blockLo >= effTop) out.clear = out.blockLo - effTop;
  else out.clear = effBot - out.blockHi;
  return out;
}

export function compute() {
  const { activePreset, dropDriver, floorMode } = store;
  // In manual mode nativeAspect === S.aspect, so isPillared/isLetterboxed are always false
  const nativeAspect = activePreset ? parseFloat(activePreset.aspectVal) : S.aspect;

  // Throw distance + ratio define the absolute native panel bounds.
  // S.dist is the horizontal (floor-plane) distance from lens to screen — this is what
  // manufacturers use for throw-ratio specs, and it's correct for lens-shift setups
  // where the optical axis stays horizontal regardless of lens height.
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

  const tr      = -S.tiltDeg * Math.PI / 180;
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
  const hShiftOk = S.maxH > 0 ? Math.abs(S.hShiftPct) <= S.maxH + EPS : true;
  // Combined V+H shift: elliptical envelope (v/vMax)² + (h/hMax)² ≤ 1
  const vMax = S.shiftPct >= 0 ? S.maxUp : S.maxDn;
  const combinedShiftOk = (S.maxH > 0 && vMax > 0)
    ? (S.shiftPct / vMax) ** 2 + (S.hShiftPct / S.maxH) ** 2 <= 1 + EPS
    : shiftOk && hShiftOk;
  const lensOk  = lH > -EPS && lH < S.ceilH + EPS;
  // Floor: body base (drop) must be at or above floor. Ceiling: rod must be ≥ 0 (body fits between ceiling and lens).
  const bodyOk  = floorMode ? drop >= -EPS : rod >= -EPS;

  // Base optical angle from the lens to the un-tilted center
  const baseAngle = Math.atan2(cH - lH, S.dist);

  // Apply mirror penalty (doubles the tilt angle effect)
  const angleDelta = (activePreset && activePreset.ustMirror) ? 2 * tr : tr;

  // Calculate final target using exact trigonometry
  // (Subtracting angleDelta preserves the convention where +tilt moves image up, −tilt moves it down)
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
  // Uses the visible media bounds (not native) to match the sightline drawn in draw.js and
  // the "Lens clearance" card in ui.js — a blocked pixel only matters where content is shown.
  const aboveSight = floorMode ? lH < effBot : lH > effTop;
  const wallGap    = S.wallH - effTop;
  const sight      = sightCheck(S.dist, lH, effTop, effBot);

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

  // Straight-line distance from lens to effective image centre (Pythagorean)
  const lensToScreen = Math.sqrt(S.dist * S.dist + (lH - tCH) * (lH - tCH));

  // --- Laser Installation Targets ---
  const isUST = activePreset && activePreset.ustMirror;
  // UST: front face is too close to the wall to measure, so both the depth and the
  // squareness check reference the same plane — the chassis rear — instead of the front.
  const targetZ = isUST
    ? S.dist + S.chassisDepth - S.lensZOffset
    : S.dist - S.lensZOffset;
  const squarenessAB = targetZ;

  const targetYHeight = floorMode
    ? effBot - drop
    : S.ceilH - effTop;
  const targetYLens = floorMode
    ? lH
    : S.ceilH - lH;
  // Body-reference: floor→projector-base (floor) or ceiling→projector-body-top (ceiling).
  // Easier to measure than lens center; lens is bodyH away from this surface.
  const targetYBody = floorMode ? drop : rod;

  // X-axis: all values relative to the screen's vertical center line (+ve = right of center)
  // Image is pinned at screen center (no independent physical-X input), so by the same
  // relation as the vertical model (image = lens + shift), lens X = -shift, measured
  // against the native panel width (matches how hMax/vertical shift specs are defined).
  const lensFromScreenCenter = -(S.hShiftPct / 100) * nativeW;
  // lensXOffset: signed offset from chassis physical center to lens (+ve = lens right of chassis center)
  const chassisLeftFromScreenCenter  = lensFromScreenCenter - (S.chassisWidth / 2 + S.lensXOffset);
  const chassisRightFromScreenCenter = lensFromScreenCenter + (S.chassisWidth / 2 - S.lensXOffset);

  return {
    mediaW, mediaH, nativeW, nativeH, shiftM, userShiftM,
    cH, lH, drop, rod,
    shiftOk, hShiftOk, combinedShiftOk, lensOk, bodyOk,
    tCH, hasTilt, ksN, ksOk,
    effTop, effBot, effNatTop, effNatBot,
    aboveSight, wallGap, sight,
    shadowH, personClears,
    ratioOk, isLetterboxed, isPillared, nativeAspect, distOk,
    lensToScreen,
    // Laser targets
    isUST, targetZ, squarenessAB, targetYHeight, targetYLens, targetYBody,
    lensFromScreenCenter, chassisLeftFromScreenCenter, chassisRightFromScreenCenter,
  };
}
