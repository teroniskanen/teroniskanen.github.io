# Projector Installation Calculator

Static PWA — no build step, ES modules, deployed to `teroniskanen.github.io/projcalc/`.

## File responsibilities

| File | Role |
|------|------|
| `js/state.js` | Shared mutable state: `S` (inputs), `store` (app flags) |
| `js/compute.js` | Pure geometry → returns result object `r` |
| `js/draw.js` | Canvas rendering, reads `S` + `store` + `r` |
| `js/ui.js` | Result cards HTML + sidebar label helpers |
| `js/app.js` | Event wiring, tri() solver, preset logic, refresh() loop |
| `js/data.js` | Projector presets + room defaults + SVG constants |

## Physics model

All units cm. Side-view diagram: wall on left (x=0), projector on right (x=dist).

```
tCH = lH + shiftM - dist·tan(tiltRad)   ← combined effective image centre
shiftM = (shiftPct/100) · nativeH
```

**Ceiling mode** (`store.floorMode = false`):
- `lH = ceilH - drop`
- `drop = ceilH - lH`

**Floor/pedestal mode** (`store.floorMode = true`):
- `lH = drop + bodyH`  (`drop` = pedestal height, `bodyH` = lens above pedestal)
- `drop = lH - bodyH`

Non-dropDriver (image position drives): `lH = cH - shiftM + dist·tan(tr)` (inversion of tCH formula).

**`aboveSight`**: ceiling → `lH > effTop`; floor → `lH < effBot`.

## Key store flags

```js
store.activePreset  // null or preset object
store.dropDriver    // true = drop field is the driver; false = derived from target
store.floorMode     // true = pedestal/floor mount
store.lkState       // {dist, ratio, body, drop, ks, imgW} — manual locks
```

## Lens shift curve

Per-preset `shiftCurve` array `[[ratio, up%, dn%], ...]` — piecewise linear interpolation via `interpolateShiftCurve()` in app.js. Applied in `refresh()` to override `maxUp`/`maxDn`.

## tri(changed) solver

Keeps dist/ratio/imgW consistent when one changes. Width change → prefers updating dist; only falls back to ratio if dist is locked.

## Deploy

```sh
../deploy.sh "commit message"
```

or manually: `git add projcalc/ && git commit -m "..." && git push origin main`

## Local dev

```sh
cd /Users/tni22049/projis && npx serve .
# open http://localhost:3000/projcalc/
```
