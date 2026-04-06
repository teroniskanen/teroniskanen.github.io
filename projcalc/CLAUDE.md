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
vOffsetM      = (preset.vOffset / 100) · nativeH · (floorMode ? +1 : −1)
                ← built-in offset: image centre above lens (floor) / below lens (ceiling)
userShiftM    = (shiftPct / 100) · nativeH          ← user-applied, positive = image UP in room
shiftM        = vOffsetM + userShiftM                ← total lens-to-image-centre offset
tCH           = lH + shiftM − dist·tan(tiltRad)      ← combined effective image centre
```

`shiftPct` is always in **room coordinates**: positive = image moves UP regardless of mount orientation.

**Ceiling mode** (`store.floorMode = false`):
- `lH = ceilH - drop`
- `drop = ceilH - lH`
- `vOffsetM` is **negative** (image below lens) — projector is physically inverted
- Shift limits **swap**: effective `maxUp = preset.sDn`, `maxDn = preset.sUp`
  (what was mechanical "up shift" moves image down in room when inverted)

**Floor/pedestal mode** (`store.floorMode = true`):
- `lH = drop + bodyH`  (`drop` = pedestal height, `bodyH` = lens above pedestal)
- `drop = lH - bodyH`
- `vOffsetM` is **positive** (image above lens)

Non-dropDriver (image position drives): `lH = cH - shiftM + dist·tan(tr)` (inversion of tCH formula).

**`aboveSight`**: ceiling → `lH > effTop`; floor → `lH < effBot`.

## Preset `vOffset` field

Definition: `(distance from lens centre to image centre) / image height × 100`, in standard floor/table-top orientation. Sign inverts automatically for ceiling mode.

| Value | Meaning |
|-------|---------|
| `0`   | Image centred on lens axis. Correct for optical-shift projectors where the spec gives ±% from centred. |
| `100` | Image centre = 1× image height above lens (e.g. Optoma ML1050ST+ 100% offset). Bottom of image is at `lH + 0.5×H`. |
| `116` | Image centre = 1.16× image height above lens (e.g. Optoma GT1080e / ZH450ST 116% offset). |

**Manufacturer conversions:**
- **Optoma** "Offset X%" → `vOffset = X` (direct 1:1; their % already equals lens→centre / H × 100)
- **Epson** "Offset X:1" → `vOffset = (X−1) / (2×(X+1)) × 100`  e.g. 10:1 → 9/22×100 ≈ 41
- **NEC** optical diagram → read "lower/upper edge of screen at 0% V = lens centre":
  - lower edge at lens → `vOffset = 50`
  - upper edge at lens → `vOffset = −50`

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
