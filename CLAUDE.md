# RC RUSH — 2-Player RC Racing Game

Browser-based mobile RC racing game that recreates the diorama in `image.jpg`
(the reference picture — it is the source of truth for all visuals).

**Live:** https://artisvitols.github.io/rc-rush/
**Repo:** https://github.com/ArtisVitols/rc-rush (GitHub Pages from `main`, root)

## What it is
- Isometric desert diorama ("RC RUSH / リモート・ラッシュ") rendered with Three.js,
  reproduced 1:1 from `image.jpg`: same track layout, START gate, RC RUSH billboard,
  grandstand, "01" board, containers, water tower, cacti, rocks, cars (yellow/green/purple).
- 2-player online race (3 laps) over WebRTC (PeerJS public cloud) + solo practice.
- Touch controls (steer left/right + gas/brake), keyboard fallback (WASD/arrows).

## Stack / constraints
- **No build step.** Plain ES modules; open `index.html` via any static server.
  Local dev: `python3 -m http.server` (no Node.js on this machine).
- Three.js r160 vendored in `vendor/three.module.js` (import map maps `three` → it).
  PeerJS 1.5.2 vendored in `vendor/peerjs.min.js` (global `Peer`).
- Everything procedural: no 3D-asset or image files except `image.jpg` (reference only).

## Architecture (js/)
- `track.js` — the heart. Track centerline as closed Catmull-Rom through waypoints
  **traced from image.jpg** (pixels un-projected via a camera fitted to the picture:
  fov 37.21°, az 45.66°, el 45.93°, dist 234.5, roll −1.71°, target (10.6, 0, 12.6) —
  exported as `CAM`; board half-size `BOARD=62`). 1024 arc-length samples (smoothed,
  4× moving-average — raw trace is wiggly) each with pos/tan/normal/width/surface
  (`A` asphalt, `D` dirt, `P` start apron). `probe(x, z, nearU)` returns lateral
  offset/surface; **pass `nearU` (car's last u) wherever the car already has a track
  position** — two track legs pass within ~4 units of each other (top band vs hairpin)
  and plain nearest-sample snaps to the wrong leg.
- `world.js` — ground = one 2048² canvas texture painted in plan coords (sand, track
  ribbons, ruts, slab cracks, checker line, painted curbs via `track.wpU(i)`),
  cliff-sided base box, rocks (instada-clusters), cacti. `window.__groundCanvas` debug hook.
- `props.js` — billboards/gate/grandstand/towers/containers/fences. `fenceAlong(track,
  fromU, toU, offset, kind, group)` lays rails('rail')/wood fences('wood')/red-white
  walls('rw')/white walls('wall') along the spline; u args come from `track.wpU(wpIndex)`.
- `cars.js`, `physics.js` (arcade: lateral-grip model, sand slowdown off-track, wall
  clamp at halfwidth+4.5 with slide), `race.js` (10 checkpoints, 3 laps, wrong-way),
  `controls.js`, `net.js` (host peer id `rcrush24-<CODE>`; guest joins; ~15 Hz state,
  120 ms interpolation), `main.js` (glue, menu/HUD, camera modes).
- Race direction: counterclockwise, **north through the START gate**; turn 01 is the
  top-right hairpin (the "01" billboard marks it, as in the picture).

## Test hooks (query params)
- `?pose=reference` — hide UI, cars posed exactly as in image.jpg, exact fitted camera
  (this is what visual comparisons use).
- `?test=drive` — autopilot drives 3 laps solo (validates physics/lap logic end-to-end).
- `?debug=1` — green state line at bottom (mode/u/lap/cp/surface/speed/pos).
- `?room=CODE` — auto-join a room (the share link format).

## Verification workflow (used to build it, reuse when changing visuals)
Headless screenshots via Playwright venv in the session scratchpad
(`pwenv/bin/python3 snap.py <url> <out.png> <wait_s> [js-expr]` — recreate with:
`python3 -m venv --without-pip pwenv && curl get-pip.py | pwenv python && pip install
playwright && playwright install chromium`; launch args need
`--use-gl=swiftshader --enable-unsafe-swiftshader`). Compare against `image.jpg`
side-by-side and as 50% blends. Snap Firefox headless screenshots hang on this
machine — don't bother, use Playwright Chromium.

## Deploy
`git push` to `main` → GitHub Pages redeploys automatically (~1 min).

## Known trade-offs
- The reference picture's yellow car faces the "wrong" way (AI-generated image
  inconsistency); we kept its pose for the menu/reference scene, race direction
  follows the green/purple cars + the 01 marker.
- PeerJS public cloud + Open Relay TURN: free, occasionally slow to connect (~1-3 s).
- No sound yet.
