import * as THREE from 'three';
import { Track, BOARD, makeCamera, positionBoardCamera, fitBoardZoom, CAM } from './track.js?v5';
import { buildWorld } from './world.js?v5';
import { buildProps } from './props.js?v5';
import { buildCar } from './cars.js?v5';
import { CarPhysics, collideCars } from './physics.js?v5';
import { RaceCar, TOTAL_LAPS, fmtTime } from './race.js?v5';
import { Controls } from './controls.js?v5';
import { Net, RemoteCar, makeCode } from './net.js?v5';

const qs = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

// ---------- renderer / scene ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const track = new Track();
const camera = makeCamera(innerWidth / innerHeight);

// ---------- lights ----------
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
scene.add(new THREE.AmbientLight(0xffd0a0, 0.55));
const hemi = new THREE.HemisphereLight(0xffe0b0, 0x6b4520, 0.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffdca6, 3.1);
sun.position.set(26, 40, -86);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -75; sun.shadow.camera.right = 75;
sun.shadow.camera.top = 75; sun.shadow.camera.bottom = -75;
sun.shadow.camera.near = 10; sun.shadow.camera.far = 300;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(sun.target);
// soft warm fill from the south-east so viewer-facing sides aren't pitch dark
const fill = new THREE.DirectionalLight(0xffc890, 0.3);
fill.position.set(60, 45, 80);
scene.add(fill);

// ---------- world ----------
buildWorld(scene, track);
buildProps(scene, track);

// ---------- cars ----------
const carNodes = {
  yellow: buildCar('yellow'),
  green: buildCar('green'),
  purple: buildCar('purple'),
};
for (const c of Object.values(carNodes)) scene.add(c);

// picture reference poses (menu scene = the picture)
const REF = {
  yellow: { x: 18.3, z: 41.4, rev: true },
  green: { x: 22.2, z: -15.2, rev: false },
  purple: { x: 30.3, z: -24.6, rev: false },
};
function setMenuPoses() {
  for (const [name, r] of Object.entries(REF)) {
    const pr = track.probe(r.x, r.z);
    const h = Math.atan2(pr.s.tan.x, pr.s.tan.z) + (r.rev ? Math.PI : 0);
    const n = carNodes[name];
    n.visible = true;
    n.position.set(r.x, 0, r.z);
    n.rotation.y = h;
  }
}
setMenuPoses();

// ---------- state ----------
const G = {
  mode: 'menu',            // menu | lobby | countdown | race | done
  camMode: 'board',        // board | follow
  myColor: 'yellow',
  oppColor: null,
  solo: true,
  net: null,
  remote: null,
  my: null,                // CarPhysics
  myRace: null,
  oppRace: null,
  raceT0: 0,
  now: 0,
  lastSend: 0,
  oppFinishTime: null,
  myFinishTime: null,
  resultsShown: false,
};
const controls = new Controls();

// ---------- camera ----------
// board-view pinch state: zoom multiplier over the fit-to-screen zoom + pan target
let boardFit = 1;
let boardZoomExtra = 1;
const boardPan = CAM.target.clone();

function applyBoardCamera() {
  positionBoardCamera(camera, boardPan);
  camera.zoom = boardFit * boardZoomExtra;
  camera.updateProjectionMatrix();
}
function resetBoardView() {
  boardZoomExtra = 1;
  boardPan.copy(CAM.target);
  if (G.camMode === 'board') applyBoardCamera();
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  if (qs.get('pose') === 'reference') {
    // exact fitted projection (matches image.jpg 1:1 at square aspect)
    camera.zoom = innerWidth > innerHeight ? innerWidth / innerHeight : 1;
    camera.updateProjectionMatrix();
    return;
  }
  if (G.camMode === 'board') {
    positionBoardCamera(camera, CAM.target);
    fitBoardZoom(camera);
    boardFit = camera.zoom;
    applyBoardCamera();
  }
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------- pinch zoom / two-finger pan / wheel zoom (board view) ----------
{
  const pts = new Map();
  let d0 = 0, zoom0 = 1, mid0 = null, pan0 = new THREE.Vector3(), lastTap = 0, lastTapPos = [0, 0];
  const azr = CAM.azDeg * Math.PI / 180, elr = CAM.elDeg * Math.PI / 180;
  const rightG = new THREE.Vector3(Math.cos(azr), 0, -Math.sin(azr));
  const upG = new THREE.Vector3(-Math.sin(azr), 0, -Math.cos(azr));
  const fovr = CAM.fov * Math.PI / 180;
  const clampPan = () => {
    boardPan.x = Math.min(BOARD, Math.max(-BOARD, boardPan.x));
    boardPan.z = Math.min(BOARD, Math.max(-BOARD, boardPan.z));
  };
  const canPinch = () => G.camMode === 'board' && qs.get('pose') !== 'reference';

  canvas.addEventListener('pointerdown', (e) => {
    if (pts.size === 0 && e.pointerType === 'touch') {
      const now = performance.now();
      const near = Math.hypot(e.clientX - lastTapPos[0], e.clientY - lastTapPos[1]) < 70;
      if (now - lastTap < 480 && near) resetBoardView();   // double-tap resets view
      lastTap = now;
      lastTapPos = [e.clientX, e.clientY];
    }
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      d0 = Math.hypot(a[0] - b[0], a[1] - b[1]);
      mid0 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      zoom0 = boardZoomExtra;
      pan0.copy(boardPan);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size !== 2 || !canPinch() || !d0) return;
    const [a, b] = [...pts.values()];
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    boardZoomExtra = Math.min(8, Math.max(1, zoom0 * d / Math.max(20, d0)));
    // pan: content follows the fingers' midpoint
    const wpp = 2 * CAM.dist * Math.tan(fovr / 2) / (camera.zoom * innerHeight);
    const dx = mid[0] - mid0[0], dy = mid[1] - mid0[1];
    boardPan.copy(pan0)
      .addScaledVector(rightG, -dx * wpp)
      .addScaledVector(upG, dy * wpp / Math.sin(elr));
    clampPan();
    if (boardZoomExtra < 1.02) boardPan.lerp(CAM.target, 1 - boardZoomExtra + 0.02);
    applyBoardCamera();
  });
  const drop = (e) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) d0 = 0;
  };
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);
  // desktop: mouse-wheel zoom
  addEventListener('wheel', (e) => {
    if (!canPinch()) return;
    boardZoomExtra = Math.min(8, Math.max(1, boardZoomExtra * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    if (boardZoomExtra <= 1.02) boardPan.copy(CAM.target);
    applyBoardCamera();
  }, { passive: true });
}

const followPos = new THREE.Vector3();
function updateCamera(dt) {
  if (G.camMode === 'board') return;
  const target = G.my ? new THREE.Vector3(G.my.x, 0, G.my.z) : new THREE.Vector3();
  followPos.lerp(target, Math.min(1, dt * 4));
  const az = CAM.azDeg * Math.PI / 180, el = CAM.elDeg * Math.PI / 180;
  const d = 62;
  camera.position.set(
    followPos.x + d * Math.cos(el) * Math.sin(az),
    d * Math.sin(el),
    followPos.z + d * Math.cos(el) * Math.cos(az));
  camera.up.set(0, 1, 0);
  camera.lookAt(followPos);
  camera.zoom = 1;
  camera.updateProjectionMatrix();
}
$('camtoggle').addEventListener('click', () => {
  G.camMode = G.camMode === 'board' ? 'follow' : 'board';
  if (G.camMode === 'board') resetBoardView();
  else if (G.my) followPos.set(G.my.x, 0, G.my.z);
});

// ---------- UI helpers ----------
function show(id, on = true) { $(id).classList.toggle('hidden', !on); }
let toastT = null;
function toast(msg, ms = 2600) {
  $('toast').textContent = msg;
  show('toast');
  clearTimeout(toastT);
  toastT = setTimeout(() => show('toast', false), ms);
}

// color picker
let pickedColor = 'yellow';
document.querySelectorAll('.swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('sel'));
    sw.classList.add('sel');
    pickedColor = sw.dataset.c;
  });
});

// ---------- race setup ----------
function otherColor(c) { return c === 'yellow' ? 'purple' : c === 'purple' ? 'green' : 'yellow'; }

function startRace(myColor, oppColor, isHost, delayMs) {
  G.myColor = myColor;
  G.oppColor = oppColor;
  G.solo = !oppColor;
  for (const n of Object.values(carNodes)) n.visible = false;

  // grid: two slots behind the finish line (host = pole/right)
  const gridU = (slot) => ((track.finishU - 0.012 - slot * 0.011) % 1 + 1) % 1;
  const mySlot = G.solo ? 0 : (isHost ? 0 : 1);
  const myLat = mySlot === 0 ? -2.6 : 2.6;
  G.my = new CarPhysics(track, gridU(mySlot), myLat);
  G.myRace = new RaceCar(track, gridU(mySlot));
  carNodes[myColor].visible = true;

  if (oppColor) {
    G.remote = new RemoteCar();
    const oppSlot = 1 - mySlot;
    const p = track.pointAt(gridU(oppSlot), oppSlot === 0 ? -2.6 : 2.6);
    G.remote.x = p.x; G.remote.z = p.z;
    G.remote.heading = track.headingAt(gridU(oppSlot));
    G.oppRace = new RaceCar(track, gridU(oppSlot));
    carNodes[oppColor].visible = true;
    G.oppFinishTime = null;
  }
  G.myFinishTime = null;
  G.resultsShown = false;

  show('menu', false);
  show('results', false);
  show('hud');
  show('controls');
  G.mode = 'countdown';
  G.raceT0 = performance.now() + (delayMs || 3200);
  if (G.camMode === 'follow') followPos.set(G.my.x, 0, G.my.z);

  // wake lock (best effort)
  if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {});
}

function backToMenu() {
  G.mode = 'menu';
  G.my = null; G.remote = null;
  if (G.net) { G.net.destroy(); G.net = null; }
  for (const n of Object.values(carNodes)) n.visible = false;
  setMenuPoses();
  G.camMode = 'board';
  resetBoardView();
  show('results', false); show('hud', false); show('controls', false); show('menu');
  show('hostpanel', false); show('joinpanel', false); show('mainbuttons');
}

// ---------- results ----------
function maybeShowResults() {
  const meDone = G.myRace && G.myRace.finished;
  const oppDone = G.solo || (G.remote && G.remote.finished) || (G.net && !G.net.connected);
  if (!G.resultsShown && meDone && (G.solo || oppDone || true)) {
    // show as soon as I finish; update if opponent finishes later
    G.resultsShown = true;
    show('results');
    show('controls', false);
  }
  if (G.resultsShown) renderResults();
}
function renderResults() {
  const my = G.myFinishTime, opp = G.oppFinishTime;
  let html = '';
  const meName = G.myColor.toUpperCase() + ' (you)';
  const opName = G.oppColor ? G.oppColor.toUpperCase() : null;
  if (G.solo) {
    $('resTitle').textContent = 'FINISH!';
    html = `<div class="win">${meName} — ${fmtTime(my)}</div>`;
    html += G.myRace.lapTimes.map((t, i) => `LAP ${i + 1} · ${fmtTime(t)}`).join('<br>');
  } else {
    const iWon = my != null && (opp == null || my <= opp);
    $('resTitle').textContent = iWon ? 'YOU WIN! 🏆' : 'YOU LOSE';
    const rows = [[meName, my, true], [opName, opp, false]].sort((a, b) => (a[1] ?? 9e9) - (b[1] ?? 9e9));
    html = rows.map(([n, t], i) =>
      `<div class="${i === 0 ? 'win' : ''}">P${i + 1} ${n} — ${t != null ? fmtTime(t) : 'racing…'}</div>`).join('');
  }
  $('resBody').innerHTML = html;
}

// ---------- networking ----------
function wireNet(net, isHost) {
  net.onMessage = (m) => {
    if (m.t === 'hello' && isHost) {
      // resolve colors: guest pref, host keeps his; clash -> guest gets another
      let guestC = m.color;
      if (guestC === pickedColor) guestC = otherColor(pickedColor);
      net.send({ t: 'setup', hostColor: pickedColor, guestColor: guestC });
      $('hoststatus').textContent = 'opponent connected! starting…';
      setTimeout(() => {
        net.send({ t: 'start', in: 3400 });
        startRace(pickedColor, guestC, true, 3400);
      }, 900);
    }
    if (m.t === 'setup' && !isHost) {
      G.pendingColors = m;
      $('joinstatus').textContent = 'connected! waiting for start…';
    }
    if (m.t === 'start' && !isHost) {
      const c = G.pendingColors || { hostColor: 'yellow', guestColor: pickedColor };
      startRace(c.guestColor, c.hostColor, false, (m.in || 3400) - net.rtt / 2);
    }
    if (m.t === 'st' && G.remote) {
      G.remote.push(m, performance.now());
      if (m.fin && G.oppFinishTime == null) { G.oppFinishTime = m.total; maybeShowResults(); }
    }
    if (m.t === 'rematch' && !isHost) {
      const c = G.pendingColors || { hostColor: 'yellow', guestColor: pickedColor };
      startRace(G.myColor || c.guestColor, G.oppColor || c.hostColor, false, (m.in || 3400) - net.rtt / 2);
    }
  };
  net.onClose = () => {
    if (G.mode === 'race' || G.mode === 'countdown') toast('opponent disconnected');
    if (G.remote) G.remote.finished = true;
  };
  net.onError = (e) => {
    if (e === 'peer-unavailable') $('joinstatus').textContent = 'room not found — check the code';
    else toast('connection issue: ' + e);
  };
}

// menu buttons
$('btnSolo').addEventListener('click', () => startRace(pickedColor, null, true));
$('btnHost').addEventListener('click', () => {
  show('mainbuttons', false); show('hostpanel');
  const code = makeCode();
  $('roomcode').textContent = code;
  $('hoststatus').textContent = 'connecting to server…';
  G.net = new Net();
  wireNet(G.net, true);
  G.net.host(code, (err) => {
    if (err === 'taken') { $('roomcode').textContent = makeCode(); return; }
    $('hoststatus').textContent = 'waiting for opponent…\nshare the room code or link';
  });
  G.net.onOpen = () => { $('hoststatus').textContent = 'opponent connected!'; };
});
$('btnShare').addEventListener('click', async () => {
  const code = $('roomcode').textContent;
  const url = `${location.origin}${location.pathname}?room=${code}`;
  if (navigator.share) {
    navigator.share({ title: 'RC RUSH — race me!', text: `Join my RC race! Room ${code}`, url }).catch(() => {});
  } else {
    try { await navigator.clipboard.writeText(url); toast('link copied!'); }
    catch (e) { toast(url, 6000); }
  }
});
$('btnJoin').addEventListener('click', () => { show('mainbuttons', false); show('joinpanel'); $('codeinput').focus(); });
$('btnJoinGo').addEventListener('click', joinGo);
$('codeinput').addEventListener('keydown', e => { if (e.key === 'Enter') joinGo(); });
function joinGo() {
  const code = $('codeinput').value.trim().toUpperCase();
  if (code.length !== 4) { $('joinstatus').textContent = 'enter the 4-letter code'; return; }
  $('joinstatus').textContent = 'connecting…';
  G.net = new Net();
  wireNet(G.net, false);
  G.net.onOpen = () => {
    $('joinstatus').textContent = 'connected! waiting for host…';
    G.net.send({ t: 'hello', color: pickedColor });
  };
  G.net.join(code);
}
$('btnHostBack').addEventListener('click', backToMenu);
$('btnJoinBack').addEventListener('click', backToMenu);
$('btnMenu').addEventListener('click', backToMenu);
$('btnRematch').addEventListener('click', () => {
  if (G.solo) { startRace(G.myColor, null, true); return; }
  if (G.net && G.net.isHost) {
    G.net.send({ t: 'rematch', in: 3400 });
    startRace(G.myColor, G.oppColor, true, 3400);
  } else toast('waiting for host to restart…');
});

// ?room=CODE deep link
if (qs.get('room')) {
  show('mainbuttons', false); show('joinpanel');
  $('codeinput').value = qs.get('room').toUpperCase().slice(0, 4);
  setTimeout(joinGo, 600);
}

// ---------- test hooks ----------
const TEST = qs.get('test');            // 'drive' autopilot
const POSE = qs.get('pose');            // 'reference' = hide UI, cars as picture
if (POSE === 'reference') {
  show('menu', false);
  $('vignette').style.display = qs.get('novig') ? 'none' : 'block';
}
if (TEST === 'drive') {
  show('menu', false);
  startRace('yellow', null, true, 500);
}
if (qs.get('debug')) {
  const d = document.createElement('div');
  d.id = 'dbg';
  d.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99;color:#0f0;font:12px monospace;background:rgba(0,0,0,.6);padding:4px;white-space:pre';
  document.body.appendChild(d);
}

const apState = { stuck: 0, revUntil: 0, revSteer: 0 };
function autopilot(dt) {
  const my = G.my;
  const now = performance.now();
  // unstick: if wedged (no speed while trying to go), back up briefly
  if (Math.abs(my.speed) < 1.2 && G.mode === 'race') apState.stuck += dt;
  else apState.stuck = 0;
  if (apState.stuck > 1.4 && now > apState.revUntil) {
    apState.revUntil = now + 900;
    const pr0 = track.probe(my.x, my.z, my.u);
    apState.revSteer = pr0.lat > 0 ? 1 : -1;
    apState.stuck = 0;
  }
  if (now < apState.revUntil) return { steer: apState.revSteer, gas: 0, brake: 1 };

  const pr = track.probe(my.x, my.z, my.u);
  const look = (du) => {
    const tp = track.pointAt((pr.u + du) % 1);
    const want = Math.atan2(tp.x - my.x, tp.z - my.z);
    let dh = want - my.heading;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    return dh;
  };
  const dh = look(0.008);
  const dhFar = look(0.022);
  const sharp = Math.max(Math.abs(dh), Math.abs(dhFar) * 0.7);
  const fast = my.speed > 22;
  return {
    steer: THREE.MathUtils.clamp(dh * 2.4, -1, 1),
    gas: sharp < 0.55 ? 1 : sharp < 1.0 ? (fast ? 0 : 0.7) : 0.3,
    brake: (sharp > 0.85 && fast) || sharp > 1.4 ? 0.7 : 0,
  };
}

// ---------- HUD ----------
function updateHUD() {
  if (!G.myRace) return;
  const total = G.solo ? 1 : 2;
  let pos = 1;
  if (!G.solo && G.oppRace) {
    const oppProg = (G.remote.lap - 1) + ((G.remote.u - track.finishU) % 1 + 1) % 1;
    if (oppProg > G.myRace.progress && !G.myRace.finished) pos = 2;
    if (G.remote.finished && !G.myRace.finished) pos = 2;
  }
  $('lap').textContent = G.myRace.finished ? 'FINISH' : `LAP ${G.myRace.lap}/${TOTAL_LAPS}`;
  $('pos').textContent = `P${pos}/${total}`;
  const t = G.mode === 'race' ? G.now - G.raceT0 : 0;
  $('rtime').textContent = fmtTime(G.myFinishTime != null ? G.myFinishTime : t);
  show('wrongway', G.myRace.wrongWay > 40);
}

// ---------- countdown ----------
function updateCountdown() {
  const left = G.raceT0 - G.now;
  const el = $('countdown');
  if (left <= 0 && G.mode === 'countdown') G.mode = 'race';
  if (left <= -800) { show('countdown', false); return; }
  show('countdown');
  if (left > 0) {
    el.classList.remove('go');
    el.textContent = Math.ceil(left / 1000);
  } else {
    el.classList.add('go');
    el.textContent = 'GO!';
  }
}

// ---------- main loop ----------
let last = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  G.now = now;
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (G.mode === 'countdown' || G.mode === 'race') {
    updateCountdown();
    const input = G.mode === 'race' && !G.myRace.finished
      ? (TEST === 'drive' ? autopilot(dt) : controls.read())
      : { gas: 0, brake: 0, steer: 0 };
    G.my.step(dt, input);

    // collide with remote car (positionally)
    if (G.remote) {
      const fake = { x: G.remote.x, z: G.remote.z, vx: 0, vz: 0 };
      collideCars(G.my, fake);
    }
    if (G.mode === 'race' && !G.myRace.finished) {
      G.myRace.update(G.my.u, now - G.raceT0 + 0);
      if (G.myRace.finished) {
        G.myFinishTime = now - G.raceT0;
        maybeShowResults();
      }
    }
    // my car node
    const n = carNodes[G.myColor];
    n.position.set(G.my.x, 0, G.my.z);
    n.rotation.y = G.my.heading;
    // wheel spin/steer
    if (n.userData.wheels) for (const w of n.userData.wheels) {
      if (w.front) w.node.rotation.y = G.my.steer * 0.5;
    }
    // remote car
    if (G.remote) {
      G.remote.sample(now);
      const rn = carNodes[G.oppColor];
      rn.position.set(G.remote.x, 0, G.remote.z);
      rn.rotation.y = G.remote.heading;
    }
    // send state ~15Hz
    if (G.net && G.net.connected && now - G.lastSend > 66) {
      G.lastSend = now;
      G.net.send({
        t: 'st', x: +G.my.x.toFixed(2), z: +G.my.z.toFixed(2),
        h: +G.my.heading.toFixed(3), v: +G.my.speed.toFixed(1),
        lap: G.myRace.lap, u: +G.my.u.toFixed(4),
        fin: G.myRace.finished, total: G.myFinishTime,
      });
    }
    updateHUD();
    updateCamera(dt);
  }

  if (qs.get('debug') && G.my) {
    $('dbg') && ($('dbg').textContent =
      `mode:${G.mode} u:${G.my.u.toFixed(3)} lap:${G.myRace ? G.myRace.lap : '-'} cp:${G.myRace ? G.myRace.cp : '-'} surf:${G.my.surface} v:${G.my.speed.toFixed(1)} pos:(${G.my.x.toFixed(1)},${G.my.z.toFixed(1)}) fin:${G.myRace ? G.myRace.finished : '-'} t:${fmtTime(G.now - G.raceT0)}`);
  }

  renderer.render(scene, camera);
}
window.__game = G;
window.__track = track;
window.__cam = camera;
loop();
