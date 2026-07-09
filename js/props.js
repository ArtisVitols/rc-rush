// All diorama props: billboards, START gate, grandstand, towers, shack, containers,
// water tower, tire stacks, signs, and the fences/barriers that line the track.
import * as THREE from 'three';
import { mulberry, rockGeo } from './world.js';

// ---------- shared materials ----------
const M = {
  rust: new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9, metalness: 0.25 }),
  rustDark: new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.95, metalness: 0.2 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8f8878, roughness: 0.6, metalness: 0.55 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x55503f, roughness: 0.7, metalness: 0.5 }),
  wood: new THREE.MeshStandardMaterial({ color: 0xa87c4c, roughness: 1 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x6b4a28, roughness: 1 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x1b1917, roughness: 0.95 }),
  white: new THREE.MeshStandardMaterial({ color: 0xd8cfbc, roughness: 0.8 }),
  red: new THREE.MeshStandardMaterial({ color: 0x963017, roughness: 0.8 }),
  green: new THREE.MeshStandardMaterial({ color: 0x5c6b46, roughness: 0.9 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x9a8f7a, roughness: 1 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xb08820, roughness: 0.4 }),
};

function box(w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  return m;
}

// canvas texture helper for sign faces
function signTexture(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function grunge(g, w, h, rnd) {
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(${40 + rnd() * 60 | 0},${25 + rnd() * 30 | 0},10,${0.05 + rnd() * 0.16})`;
    const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * (w / 10);
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // rust streaks from top
  for (let i = 0; i < 30; i++) {
    const x = rnd() * w;
    g.fillStyle = `rgba(120,60,20,${0.08 + rnd() * 0.15})`;
    g.fillRect(x, 0, 2 + rnd() * 5, rnd() * h);
  }
}

// ---------- RC RUSH billboard ----------
function rcRushBillboard() {
  const g = new THREE.Group();
  const rnd = mulberry(99);
  const W = 29, H = 12;
  const tex = signTexture(1024, 420, (ctx, w, h) => {
    ctx.fillStyle = '#4a3620'; ctx.fillRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(120,80,40,0.5)'); grad.addColorStop(1, 'rgba(25,15,8,0.55)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    // frame
    ctx.strokeStyle = '#241a10'; ctx.lineWidth = 18; ctx.strokeRect(9, 9, w - 18, h - 18);
    // gear icon
    ctx.fillStyle = '#c9922e';
    ctx.save(); ctx.translate(120, h / 2 + 20);
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-9, -46, 18, 20); }
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2c1c'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill();
    ctx.restore();
    // text
    ctx.fillStyle = '#e8bd62';
    ctx.font = '900 150px "Arial Narrow", Arial'; ctx.textAlign = 'center';
    ctx.fillText('RC RUSH', w / 2 + 60, 195);
    ctx.font = 'bold 64px Arial';
    ctx.fillStyle = '#c39447';
    ctx.fillText('リモート・ラッシュ', w / 2 + 60, 300);
    grunge(ctx, w, h, mulberry(31));
  });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.6),
    [M.rustDark, M.rustDark, M.rustDark, M.rustDark,
     new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), M.rustDark]);
  panel.position.y = H / 2 + 8.5;
  panel.castShadow = true;
  g.add(panel);
  for (const sx of [-W / 2 + 2, -W / 6, W / 6, W / 2 - 2]) {
    g.add(box(0.8, 9, 0.8, M.rustDark, sx, 4.5, 0));
  }
  // top rim lights
  for (const sx of [-W / 3, 0, W / 3]) {
    g.add(box(1.2, 0.5, 0.8, M.steelDark, sx, H + 8.2, 0.2));
  }
  return g;
}

// ---------- grandstand ----------
function grandstand() {
  const g = new THREE.Group();
  const W = 22, D = 9;
  // base
  g.add(box(W, 2.4, D, M.rustDark, 0, 1.2, 0));
  // seat rows (stepped)
  for (let i = 0; i < 4; i++) {
    const row = box(W - 1, 0.9, 1.7, i % 2 ? M.rust : M.steelDark, 0, 2.9 + i * 0.95, -D / 2 + 1.6 + i * 1.75);
    g.add(row);
    // little seat blocks
    for (let k = -4; k <= 4; k++) {
      g.add(box(1.4, 0.55, 0.9, M.steel, k * 2.2, 3.5 + i * 0.95, -D / 2 + 1.3 + i * 1.75, false));
    }
  }
  // walls (back + sides), open front
  g.add(box(W, 5.2, 0.6, M.rustDark, 0, 4.4, D / 2 - 0.3));
  g.add(box(0.6, 5.2, D, M.rustDark, -W / 2 + 0.3, 4.4, 0));
  g.add(box(0.6, 5.2, D, M.rustDark, W / 2 - 0.3, 4.4, 0));
  // roof
  const roof = box(W + 1.5, 0.5, D + 1.5, M.green, 0, 7.4, -0.4);
  g.add(roof);
  // roof supports
  for (const sx of [-W / 2 + 0.8, -W / 4, 0, W / 4, W / 2 - 0.8]) {
    g.add(box(0.45, 4.8, 0.45, M.steelDark, sx, 4.8, -D / 2 + 0.4));
    g.add(box(0.45, 4.8, 0.45, M.steelDark, sx, 4.8, D / 2 - 0.4));
  }
  // vent on roof
  g.add(box(2.2, 0.9, 1.4, M.steelDark, -W / 4, 8.1, 0));
  return g;
}

// ---------- START gate ----------
function startGate(width) {
  const g = new THREE.Group();
  const H = 13, PW = 2.6;
  const tex = signTexture(768, 160, (ctx, w, h) => {
    ctx.fillStyle = '#6b4520'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(30,18,8,0.45)'; ctx.fillRect(0, h * 0.6, w, h * 0.4);
    ctx.fillStyle = '#e8b64c';
    ctx.font = '900 118px "Arial Narrow", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('START', w / 2, h / 2 + 6);
    ctx.fillStyle = '#c9922e'; ctx.font = 'bold 44px Arial';
    ctx.fillText('✦', 70, h / 2); ctx.fillText('✦', w - 70, h / 2);
    grunge(ctx, w, h, mulberry(55));
  });
  // towers with cross-bracing look
  for (const sx of [-width / 2, width / 2]) {
    const t = new THREE.Group();
    t.add(box(PW, H, PW, M.rustDark, 0, H / 2, 0));
    t.add(box(PW + 0.5, 0.6, PW + 0.5, M.rust, 0, H - 0.3, 0));
    t.add(box(PW + 0.4, 0.5, PW + 0.4, M.rust, 0, 2.5, 0));
    t.add(box(PW + 0.4, 0.5, PW + 0.4, M.rust, 0, 5.5, 0));
    t.position.x = sx;
    g.add(t);
  }
  // banner
  const banner = new THREE.Mesh(new THREE.BoxGeometry(width - PW, 3.4, 0.4),
    [M.rustDark, M.rustDark, M.rustDark, M.rustDark,
     new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
     new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })]);
  banner.position.y = H - 1.4;
  banner.castShadow = true;
  g.add(banner);
  // truss above banner
  g.add(box(width - PW, 0.4, 0.4, M.steelDark, 0, H + 0.1, 0));
  return g;
}

// ---------- 01 billboard ----------
function billboard01() {
  const g = new THREE.Group();
  const W = 13, H = 9;
  const tex = signTexture(640, 440, (ctx, w, h) => {
    ctx.fillStyle = '#b98a2e'; ctx.fillRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,220,120,0.35)'); grad.addColorStop(1, 'rgba(60,30,5,0.45)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2f2210'; ctx.lineWidth = 22; ctx.strokeRect(11, 11, w - 22, h - 22);
    ctx.fillStyle = '#33230f';
    ctx.font = '900 300px "Arial Narrow", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('01', w / 2 - 40, h / 2 + 10);
    // little cactus glyph
    ctx.strokeStyle = '#33230f'; ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(w - 130, h / 2 + 120); ctx.lineTo(w - 130, h / 2 - 60); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 175, h / 2 + 40); ctx.lineTo(w - 175, h / 2 - 10); ctx.lineTo(w - 132, h / 2 - 8); ctx.stroke();
    grunge(ctx, w, h, mulberry(77));
  });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.6),
    [M.rustDark, M.rustDark, M.rustDark, M.rustDark,
     new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), M.rustDark]);
  panel.position.y = H / 2 + 8;
  panel.castShadow = true;
  g.add(panel);
  // scaffold legs
  for (const sx of [-W / 2 + 1, W / 2 - 1]) {
    g.add(box(0.6, 8.5, 0.6, M.steelDark, sx, 4.25, -0.5));
    g.add(box(0.6, 8.5, 0.6, M.steelDark, sx, 4.25, 0.5));
    g.add(box(0.15, 6, 0.15, M.steel, sx + 0.3, 4, 0));
  }
  g.add(box(W - 2, 0.5, 1.4, M.steelDark, 0, 8.2, 0));
  return g;
}

// ---------- lattice tower ----------
function latticeTower(h = 14) {
  const g = new THREE.Group();
  const s = 2.2;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = box(0.32, h, 0.32, M.steelDark, sx * s / 2, h / 2, sz * s / 2);
    g.add(leg);
  }
  for (let y = 2; y < h; y += 3) {
    g.add(box(s + 0.3, 0.22, 0.22, M.steelDark, 0, y, -s / 2, false));
    g.add(box(s + 0.3, 0.22, 0.22, M.steelDark, 0, y, s / 2, false));
    g.add(box(0.22, 0.22, s + 0.3, M.steelDark, -s / 2, y, 0, false));
    g.add(box(0.22, 0.22, s + 0.3, M.steelDark, s / 2, y, 0, false));
  }
  g.add(box(s + 1, 0.5, s + 1, M.rust, 0, h + 0.2, 0));
  return g;
}

// ---------- radio tower with dish ----------
function radioTower() {
  const g = latticeTower(15);
  g.scale.set(0.8, 1, 0.8);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(2.1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), M.steel);
  dish.rotation.x = Math.PI / 1.6;
  dish.rotation.z = 0.5;
  dish.position.set(0.8, 13.4, 0.8);
  dish.castShadow = true;
  g.add(dish);
  const tip = box(0.18, 4, 0.18, M.steelDark, 0, 17.5, 0);
  g.add(tip);
  return g;
}

// ---------- floodlight ----------
function floodlight(h = 16, heads = 6) {
  const g = new THREE.Group();
  g.add(box(0.8, h, 0.8, M.steelDark, 0, h / 2, 0));
  g.add(box(0.5, h * 0.65, 0.5, M.steel, 0.7, h * 0.3, 0));
  const cols = heads > 2 ? 3 : 2, rows = Math.ceil(heads / 3);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lampBox = box(1.5, 1.5, 0.8, M.steelDark, (c - (cols - 1) / 2) * 1.8, h + 0.9 + r * 1.9, 0);
      g.add(lampBox);
      const lens = box(1.2, 1.2, 0.15, M.lamp, (c - (cols - 1) / 2) * 1.8, h + 0.9 + r * 1.9, 0.45, false);
      g.add(lens);
    }
  }
  return g;
}

// small double-head yellow spotlight (near shack)
function smallLight() {
  const g = new THREE.Group();
  g.add(box(0.55, 11, 0.55, M.steelDark, 0, 5.5, 0));
  for (const sy of [9.2, 10.6]) {
    g.add(box(2.6, 1.1, 0.9, new THREE.MeshStandardMaterial({ color: 0xc9a13a, roughness: 0.7 }), 0, sy, 0));
    g.add(box(1.0, 0.8, 0.15, M.lamp, -0.65, sy, 0.5, false));
    g.add(box(1.0, 0.8, 0.15, M.lamp, 0.65, sy, 0.5, false));
  }
  return g;
}

// ---------- shack ----------
function shack() {
  const g = new THREE.Group();
  g.add(box(7.5, 4.2, 5.5, M.wood, 0, 2.1, 0));
  const roof = box(8.6, 0.4, 6.6, M.steelDark, 0, 4.6, 0);
  roof.rotation.z = 0.06;
  g.add(roof);
  g.add(box(1.7, 2.6, 0.2, M.woodDark, -1.6, 1.3, 2.85));   // door
  g.add(box(1.6, 1.2, 0.2, M.steelDark, 1.8, 2.4, 2.85));   // window
  g.add(box(0.5, 5.8, 0.5, M.woodDark, 3.2, 2.9, -1.5));    // pole
  return g;
}

// ---------- container ----------
function container(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.2 });
  const c = box(9, 4, 4, mat, 0, 2, 0);
  g.add(c);
  // corrugation lines
  for (let i = -3; i <= 3; i++) {
    g.add(box(0.18, 3.6, 4.06, new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.8), roughness: 0.9 }), i * 1.2, 2, 0, false));
  }
  return g;
}

// ---------- fuel tank ----------
function fuelTank() {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 8.5, 12), M.steel);
  t.rotation.z = Math.PI / 2;
  t.position.y = 2.6;
  t.castShadow = true;
  g.add(t);
  g.add(box(0.6, 1.6, 3.2, M.steelDark, -2.8, 0.8, 0));
  g.add(box(0.6, 1.6, 3.2, M.steelDark, 2.8, 0.8, 0));
  return g;
}

function barrel() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.5, 9),
    new THREE.MeshStandardMaterial({ color: [0x8a3020, 0x555a44, 0x8a7028][Math.floor(Math.random() * 3)], roughness: 0.8 }));
  m.position.y = 0.75;
  m.castShadow = true;
  return m;
}

// ---------- water tower ----------
function waterTower() {
  const g = new THREE.Group();
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.05, 5, 10), M.rust);
  tank.position.y = 9.6;
  tank.castShadow = true;
  g.add(tank);
  const roofc = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.3, 10), M.rustDark);
  roofc.position.y = 12.7;
  roofc.castShadow = true;
  g.add(roofc);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const leg = box(0.4, 7.2, 0.4, M.wood, Math.cos(a) * 1.9, 3.6, Math.sin(a) * 1.9);
    leg.rotation.z = Math.cos(a) * 0.1;
    leg.rotation.x = -Math.sin(a) * 0.1;
    g.add(leg);
  }
  g.add(box(3.2, 0.3, 3.2, M.wood, 0, 6.9, 0));
  return g;
}

// ---------- stone building (small, right side) ----------
function stoneBuilding() {
  const g = new THREE.Group();
  g.add(box(6, 4.6, 5, M.concrete, 0, 2.3, 0));
  g.add(box(6.6, 0.5, 5.6, M.rustDark, 0, 4.85, 0));
  g.add(box(1.4, 2.2, 0.2, M.woodDark, 0, 1.1, 2.55));
  g.add(box(1.3, 1.1, 0.2, M.steelDark, -1.9, 2.6, 2.55));
  return g;
}

// ---------- speed sign ----------
function speedSign() {
  const g = new THREE.Group();
  const tex = signTexture(512, 160, (ctx, w, h) => {
    ctx.fillStyle = '#241a10'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#0f0a05'; ctx.lineWidth = 12; ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#d9b05c';
    ctx.font = 'bold 92px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('スピード', w / 2, h / 2 + 4);
    grunge(ctx, w, h, mulberry(88));
  });
  const p = new THREE.Mesh(new THREE.BoxGeometry(9, 2.8, 0.3),
    [M.woodDark, M.woodDark, M.woodDark, M.woodDark,
     new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
     new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })]);
  p.position.y = 3.4;
  p.castShadow = true;
  g.add(p);
  g.add(box(0.4, 2.4, 0.4, M.woodDark, -3.6, 1.2, 0));
  g.add(box(0.4, 2.4, 0.4, M.woodDark, 3.6, 1.2, 0));
  return g;
}

// ---------- tire stack ----------
function tireStack(rnd, n = 3) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.24, 7, 14), M.tire);
    t.rotation.x = Math.PI / 2;
    t.position.set((rnd() - 0.5) * 0.2, 0.24 + i * 0.46, (rnd() - 0.5) * 0.2);
    t.castShadow = true;
    g.add(t);
  }
  return g;
}

// =====================================================================
// Fences / barriers along the track
// =====================================================================
// kinds: 'rail' silver guard-rail; 'wood' post+rail fence; 'rw' red/white wall; 'wall' white wall
function fenceAlong(track, fromU, toU, offset, kind, group) {
  const S = track.samples, N = S.length;
  const n0 = Math.floor(fromU * N), n1 = Math.floor(toU * N);
  const step = kind === 'rw' || kind === 'wall' ? 3 : 6;
  let flip = 0;
  const post = kind === 'wood' ? M.woodDark : M.steelDark;
  for (let i = n0; i <= n1; i += step) {
    const s = S[((i % N) + N) % N];
    const s2 = S[(((i + step) % N) + N) % N];
    const off = typeof offset === 'function' ? offset(s) : offset;
    const ax = s.pos.x + s.nrm.x * (s.w + off), az = s.pos.z + s.nrm.z * (s.w + off);
    const off2 = typeof offset === 'function' ? offset(s2) : offset;
    const bx = s2.pos.x + s2.nrm.x * (s2.w + off2), bz = s2.pos.z + s2.nrm.z * (s2.w + off2);
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const len = Math.hypot(bx - ax, bz - az);
    const ang = Math.atan2(bx - ax, bz - az);
    if (i > n1 - step && kind !== 'rw') break;
    if (kind === 'rw' || kind === 'wall') {
      const mat = kind === 'wall' ? M.white : (flip++ % 2 ? M.white : M.red);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.05, len * 1.02), mat);
      wall.position.set(mx, 0.5, mz);
      wall.rotation.y = ang;
      wall.castShadow = wall.receiveShadow = true;
      group.add(wall);
    } else {
      // post
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, kind === 'wood' ? 1.7 : 1.3, 0.4), post);
      p.position.set(ax, 0.7, az);
      p.castShadow = true;
      group.add(p);
      // rails
      const railMat = kind === 'wood' ? M.wood : M.steel;
      for (const ry of kind === 'wood' ? [0.9, 1.35] : [0.75, 1.15]) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(kind === 'wood' ? 0.26 : 0.12, kind === 'wood' ? 0.26 : 0.3, len * 1.05), railMat);
        r.position.set(mx, ry, mz);
        r.rotation.y = ang;
        r.castShadow = true;
        group.add(r);
      }
    }
  }
}

export function buildProps(scene, track) {
  const g = new THREE.Group();
  const rnd = mulberry(31415);

  // ---- fences (u values are arc-length positions of waypoint indices) ----
  const u = (i) => track.wpU(i);
  // start straight + grandstand front: rail both sides
  fenceAlong(track, u(68.4), u(70), 1.1, 'rail', g);
  fenceAlong(track, u(0), u(3.6), 1.1, 'rail', g);
  fenceAlong(track, u(68.5), u(70), -1.1, 'rail', g);
  // climb to top: wood outer
  fenceAlong(track, u(4), u(11), 1.3, 'wood', g);
  fenceAlong(track, u(4.2), u(10.8), -1.4, 'wood', g);
  // top band → containers: wood + rail near containers
  fenceAlong(track, u(11), u(14), -1.2, 'rail', g);
  // turn01: red/white wall outer + rail inner
  fenceAlong(track, u(14), u(21), 0.8, 'rw', g);
  fenceAlong(track, u(15.5), u(20), -1.2, 'rail', g);
  // cars section → into dirt: rail outer(left is now north side)
  fenceAlong(track, u(21), u(24.5), 1.0, 'rail', g);
  // top dirt hairpin: wood outer all around
  fenceAlong(track, u(25), u(34.5), 1.4, 'wood', g);
  // S midsection: wood on both sides partially
  fenceAlong(track, u(35), u(38.5), 1.3, 'wood', g);
  fenceAlong(track, u(35.5), u(38), -1.3, 'wood', g);
  // bottom loop: white wall outer + wood
  fenceAlong(track, u(39.5), u(46), 1.0, 'wall', g);
  fenceAlong(track, u(46.5), u(49), 1.2, 'rail', g);
  // right lower + BR corner: rw wall outer, rail inner
  fenceAlong(track, u(50), u(57), 0.8, 'rw', g);
  fenceAlong(track, u(51), u(56), -1.3, 'rail', g);
  // bottom straight: rail outer + rw inner short
  fenceAlong(track, u(57), u(63.5), 1.0, 'rail', g);
  fenceAlong(track, u(58), u(62), -1.2, 'rail', g);
  // BL 180: rw outer
  fenceAlong(track, u(63.5), u(68.4), 0.8, 'rw', g);

  // ---- structures ----
  const put = (obj, x, z, rotY = 0, s = 1) => {
    obj.position.set(x, 0, z);
    obj.rotation.y = rotY;
    if (s !== 1) obj.scale.set(s, s, s);
    g.add(obj);
    return obj;
  };

  // Left side ensemble (billboard behind grandstand, gate over track)
  put(grandstand(), -50, 0, Math.PI / 4 * 5);                       // seats face SE toward track
  put(rcRushBillboard(), -52.5, 2.5, Math.PI / 4 + 0.12);
  {
    // START gate spans the track at the gate waypoint
    const gu = track.gateU;
    const p = track.pointAt(gu);
    const h = track.headingAt(gu);
    const gate = startGate(20);
    gate.position.set(p.x, 0, p.z);
    gate.rotation.y = h;
    g.add(gate);
  }
  put(radioTower(), -55, 20, 0.3, 0.9);
  put(smallLight(), -59, 33, Math.PI / 4);
  put(shack(), -54.5, 40, Math.PI / 4, 0.95);
  put(container(0x8a3020), -19, 16, Math.PI / 4 - 0.15, 0.8);     // red container near gate

  // Top-right ensemble
  put(latticeTower(13), -40, -57, 0.2, 0.9);
  put(billboard01(), -5, -59, Math.PI / 4 + 0.2, 1.25);
  put(container(0x5a6a74), -22, -58, -0.1, 0.85);   // blue-gray
  put(container(0x8a3020), -13, -55, 0.12, 0.85);// red
  put(fuelTank(), 6, -54, 0.1, 0.9);
  for (let i = 0; i < 4; i++) put(barrel(), 11 + (i % 2) * 1.6, -53 + Math.floor(i / 2) * 1.8, rnd() * 3);
  put(floodlight(15, 6), 26, -53, Math.PI / 4 + Math.PI, 0.95);
  put(floodlight(14, 6), 48, -40, Math.PI / 4 + Math.PI, 0.9);

  // Right side
  put(waterTower(), 47, 4, 0.4, 0.95);
  put(stoneBuilding(), 40, -2, Math.PI / 4, 0.85);
  put(speedSign(), 44, 46, Math.PI / 4, 0.95);

  // tire stacks
  const tirePlaces = [
    [-17, -2, 4], [-13, 0, 3], [-10, 2, 4], [-9, 22, 3], [-14, 24, 2],
    [-4, -35, 3], [44, 22, 3], [30, -10, 2],
    [50, 40, 4], [52, 43, 3], [53, 45, 2], [13, -26, 2], [-30, -22, 2],
  ];
  for (const [x, z, n] of tirePlaces) put(tireStack(rnd, n), x, z, rnd() * 3);

  scene.add(g);
  return g;
}
