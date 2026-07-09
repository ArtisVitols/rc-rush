// Diorama world: ground texture (sand + painted track), base cliff block, rocks, cacti.
import * as THREE from 'three';
import { BOARD, BASE_DEPTH } from './track.js';

const TEX = 2048;
function w2c(v) { return (v + BOARD) / (2 * BOARD) * TEX; }   // world coord -> canvas px
const SCL = TEX / (2 * BOARD);                                 // world units -> px

// deterministic pseudo-random
export function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function paintGround(track) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = TEX;
  const g = cv.getContext('2d');
  const rnd = mulberry(1234567);

  // ---- sand base ----
  g.fillStyle = '#c69350';
  g.fillRect(0, 0, TEX, TEX);
  // large mottling
  for (let i = 0; i < 260; i++) {
    const x = rnd() * TEX, y = rnd() * TEX, r = 40 + rnd() * 150;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const c = rnd() < 0.5 ? '224,175,110' : '186,130,70';
    gr.addColorStop(0, `rgba(${c},${0.10 + rnd() * 0.16})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // fine speckle
  for (let i = 0; i < 26000; i++) {
    const x = rnd() * TEX, y = rnd() * TEX;
    const v = rnd();
    g.fillStyle = v < 0.5 ? 'rgba(120,75,35,0.16)' : 'rgba(235,190,130,0.15)';
    g.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 2);
  }

  const S = track.samples, N = S.length;
  const px = (p) => [w2c(p.x), w2c(p.z)];

  function strokePath(fromU, toU, width, style, alpha = 1, offset = 0, wobble = 0) {
    g.globalAlpha = alpha;
    g.strokeStyle = style;
    g.lineWidth = width * SCL;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    const n0 = Math.floor(fromU * N), n1 = Math.floor(toU * N);
    for (let i = n0; i <= n1; i++) {
      const s = S[((i % N) + N) % N];
      const wob = wobble ? Math.sin(i * 0.7) * wobble : 0;
      const [x, y] = px({ x: s.pos.x + s.nrm.x * (offset + wob), z: s.pos.z + s.nrm.z * (offset + wob) });
      i === n0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
    g.globalAlpha = 1;
  }

  // find u-ranges per surface
  const ranges = [];
  let cur = { s: S[0].s, from: 0 };
  for (let i = 1; i < N; i++) {
    if (S[i].s !== cur.s) { ranges.push({ ...cur, to: i / N }); cur = { s: S[i].s, from: i / N }; }
  }
  ranges.push({ ...cur, to: 1 });

  // ---- dirt shoulders around everything (soft) ----
  for (const r of ranges) strokePath(r.from, r.to, 15.5, 'rgba(148,98,50,0.5)');

  // ---- dirt sections ----
  for (const r of ranges.filter(r => r.s === 'D')) {
    strokePath(r.from, r.to, 11.6, '#c69150');
    strokePath(r.from, r.to, 10.6, '#cfa05e');
    strokePath(r.from, r.to, 7.2, '#d9ad6a', 0.95);
    // groove ruts
    for (const off of [-3.2, -2.1, -1.0, 0.1, 1.2, 2.3, 3.3]) {
      strokePath(r.from, r.to, 0.32, 'rgba(140,92,44,0.55)', 1, off, 0.12);
    }
    strokePath(r.from, r.to, 0.45, 'rgba(140,95,45,0.35)', 1, -4.3, 0.1);
    strokePath(r.from, r.to, 0.45, 'rgba(140,95,45,0.35)', 1, 4.2, 0.1);
  }

  // ---- asphalt sections (dark cracked slabs) ----
  for (const r of ranges.filter(r => r.s === 'A' || r.s === 'P')) {
    const wide = r.s === 'P' ? 13.5 : 11;
    strokePath(r.from, r.to, wide + 1.4, '#7a6244', 0.8);         // dusty edge
    strokePath(r.from, r.to, wide, '#514a42');
    strokePath(r.from, r.to, wide - 1.5, '#48413a');
    strokePath(r.from, r.to, wide * 0.55, '#544c43', 0.5);
    // wear lines (twin subtle darker strips)
    strokePath(r.from, r.to, 1.6, 'rgba(35,30,26,0.13)', 1, -1.6, 0);
    strokePath(r.from, r.to, 1.6, 'rgba(35,30,26,0.12)', 1, 1.6, 0);
  }

  // start apron: wide paved area by the grandstand
  g.fillStyle = '#544c44';
  g.save();
  g.beginPath();
  const apron = [[-46.5, 21], [-47.5, -12], [-29, -14], [-28.5, 22]];
  apron.forEach((p, i) => { const [x, y] = [w2c(p[0]), w2c(p[1])]; i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.closePath(); g.fill();
  g.restore();

  // slab cracks on all paved areas
  g.strokeStyle = 'rgba(30,26,22,0.5)'; g.lineWidth = 1.6;
  for (const r of ranges.filter(r => r.s === 'A' || r.s === 'P')) {
    const n0 = Math.floor(r.from * N), n1 = Math.floor(r.to * N);
    for (let i = n0; i < n1; i += 7) {
      const s = S[((i % N) + N) % N];
      const a = rnd() * Math.PI;
      const lat = (rnd() * 2 - 1) * s.w * 0.8;
      const cx = w2c(s.pos.x + s.nrm.x * lat), cy = w2c(s.pos.z + s.nrm.z * lat);
      const L = (2 + rnd() * 6) * SCL * 0.4;
      g.beginPath();
      g.moveTo(cx - Math.cos(a) * L, cy - Math.sin(a) * L);
      const mx = cx + (rnd() - 0.5) * 8, my = cy + (rnd() - 0.5) * 8;
      g.quadraticCurveTo(mx, my, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
      g.stroke();
    }
  }
  // slab seams across paved track
  g.strokeStyle = 'rgba(30,26,22,0.35)'; g.lineWidth = 2;
  for (const r of ranges.filter(r => r.s === 'A' || r.s === 'P')) {
    const n0 = Math.floor(r.from * N), n1 = Math.floor(r.to * N);
    for (let i = n0; i < n1; i += 20) {
      const s = S[((i % N) + N) % N];
      const a = px({ x: s.pos.x + s.nrm.x * s.w, z: s.pos.z + s.nrm.z * s.w });
      const b = px({ x: s.pos.x - s.nrm.x * s.w, z: s.pos.z - s.nrm.z * s.w });
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
  }

  // ---- checkered finish line ----
  {
    const i = Math.floor(track.finishU * N);
    const s = S[i];
    const sq = 1.15, rows = 3, cols = Math.floor((s.w * 2) / sq);
    for (let r2 = 0; r2 < rows; r2++) {
      for (let c = 0; c < cols; c++) {
        g.fillStyle = (r2 + c) % 2 ? '#e8e2d4' : '#181512';
        const lat = -s.w + c * sq, lon = (r2 - rows / 2) * sq;
        const cx = s.pos.x + s.nrm.x * (lat + sq / 2) + s.tan.x * lon;
        const cz = s.pos.z + s.nrm.z * (lat + sq / 2) + s.tan.z * lon;
        g.save();
        g.translate(w2c(cx), w2c(cz));
        g.rotate(Math.atan2(s.tan.z, s.tan.x));
        g.fillRect(-sq / 2 * SCL, -sq / 2 * SCL, sq * SCL, sq * SCL);
        g.restore();
      }
    }
  }

  // ---- red/white curbs at key corners (painted) ----
  const curbs = [
    { from: track.wpU(14), to: track.wpU(18.5), off: +1 },   // turn 01 outer
    { from: track.wpU(63), to: track.wpU(66.5), off: +1 },   // BL 180 outer
    { from: track.wpU(54.5), to: track.wpU(58), off: +1 },   // BR corner outer
  ];
  for (const c of curbs) {
    const n0 = Math.floor(c.from * N), n1 = Math.floor(c.to * N);
    let flip = 0;
    for (let i = n0; i < n1; i += 4) {
      const s = S[((i % N) + N) % N];
      const off = (s.w - 0.7) * c.off;
      g.fillStyle = (flip++ % 2) ? '#c8bfae' : '#a5361f';
      const cx = s.pos.x + s.nrm.x * off, cz = s.pos.z + s.nrm.z * off;
      g.save();
      g.translate(w2c(cx), w2c(cz));
      g.rotate(Math.atan2(s.tan.z, s.tan.x));
      g.fillRect(-2.1 * SCL * 0.5, -0.65 * SCL, 2.1 * SCL, 1.3 * SCL);
      g.restore();
    }
  }

  // scattered pebbles on sand (after track so they sit on infield only visually ok)
  for (let i = 0; i < 900; i++) {
    const x = rnd() * TEX, y = rnd() * TEX;
    const r = 1 + rnd() * 3;
    g.fillStyle = `rgba(${90 + rnd() * 60 | 0},${60 + rnd() * 40 | 0},${30 + rnd() * 25 | 0},0.5)`;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = 'rgba(240,200,140,0.35)';
    g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, 7); g.fill();
  }
  // dry grass tufts
  for (let i = 0; i < 500; i++) {
    const x = rnd() * TEX, y = rnd() * TEX;
    g.strokeStyle = `rgba(${140 + rnd() * 40 | 0},${120 + rnd() * 30 | 0},60,0.55)`;
    g.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      const a = -Math.PI / 2 + (rnd() - 0.5) * 1.2;
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * (3 + rnd() * 4), y + Math.sin(a) * (3 + rnd() * 4));
      g.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  window.__groundCanvas = cv;   // debug hook
  return tex;
}

// ---- strata texture for the cliff sides ----
function paintCliff() {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 256;
  const g = cv.getContext('2d');
  const rnd = mulberry(777);
  const bands = [
    [0.00, 0.10, '#c99b58'], [0.10, 0.22, '#b0824a'], [0.22, 0.36, '#8f6132'],
    [0.36, 0.50, '#6e4423'], [0.50, 0.64, '#4a2a12'], [0.64, 0.80, '#291708'], [0.80, 1.00, '#100904'],
  ];
  for (const [a, b, c] of bands) {
    g.fillStyle = c;
    g.fillRect(0, a * 256, 1024, (b - a) * 256 + 2);
  }
  // block cracks
  for (let y = 0; y < 7; y++) {
    g.strokeStyle = 'rgba(20,10,4,0.55)'; g.lineWidth = 2;
    let x = 0;
    const bandY = y * 36 + 8;
    g.beginPath(); g.moveTo(0, bandY);
    while (x < 1024) { x += 20 + rnd() * 40; g.lineTo(x, bandY + (rnd() - 0.5) * 8); }
    g.stroke();
    for (let i = 0; i < 26; i++) {
      const vx = rnd() * 1024;
      g.beginPath(); g.moveTo(vx, bandY); g.lineTo(vx + (rnd() - 0.5) * 6, bandY + 30);
      g.stroke();
    }
  }
  // speckle
  for (let i = 0; i < 6000; i++) {
    const x = rnd() * 1024, y = rnd() * 256;
    g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,220,160,0.08)';
    g.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// low-poly rock geometry
export function rockGeo(rnd, radius, squash = 0.85) {
  const geo = new THREE.DodecahedronGeometry(radius, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i,
      p.getX(i) * (0.75 + rnd() * 0.5),
      p.getY(i) * squash * (0.9 + rnd() * 0.5),
      p.getZ(i) * (0.75 + rnd() * 0.5));
  }
  geo.computeVertexNormals();
  return geo;
}

export function buildWorld(scene, track) {
  const group = new THREE.Group();

  // ground
  const groundTex = paintGround(track);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * BOARD, 2 * BOARD),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // cliff base block
  const cliffTex = paintCliff();
  const sideMat = new THREE.MeshStandardMaterial({ map: cliffTex, roughness: 1 });
  const botMat = new THREE.MeshStandardMaterial({ color: 0x120a04, roughness: 1 });
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2 * BOARD, BASE_DEPTH, 2 * BOARD),
    [sideMat, sideMat, botMat, botMat, sideMat, sideMat]);
  base.position.y = -BASE_DEPTH / 2 - 0.01;
  group.add(base);

  // ---- rocks ----
  const rnd = mulberry(4242);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xbd8a4a, roughness: 0.95, flatShading: true });
  const rockDark = new THREE.MeshStandardMaterial({ color: 0x976a33, roughness: 1, flatShading: true });
  const rocks = new THREE.Group();

  function rockCluster(cx, cz, count, rMin, rMax, spread, mat = rockMat, tallest = 1) {
    for (let i = 0; i < count; i++) {
      const r = rMin + rnd() * (rMax - rMin);
      const m = new THREE.Mesh(rockGeo(rnd, r, 0.6 + rnd() * 0.5), rnd() < 0.75 ? mat : rockDark);
      const a = rnd() * Math.PI * 2, d = rnd() * spread;
      m.position.set(cx + Math.cos(a) * d, r * (0.25 + rnd() * 0.3) * tallest, cz + Math.sin(a) * d);
      m.rotation.set(rnd() * 0.4, rnd() * Math.PI * 2, rnd() * 0.4);
      m.castShadow = m.receiveShadow = true;
      rocks.add(m);
    }
  }

  // big mound at the top-left corner (behind billboard area, near top corner)
  rockCluster(-50, -51, 4, 5, 8, 3.5, rockMat, 1.7);
  rockCluster(-49, -49, 5, 3, 5.5, 6, rockMat, 1.3);
  rockCluster(-50, -50, 8, 2, 4.5, 10);
  // top island (inside the upper dirt hairpin)
  rockCluster(-25, -36, 6, 3.0, 5.4, 5.5);
  rockCluster(-22, -30, 4, 1.2, 2.4, 4);
  // bottom island (inside the lower dirt loop)
  rockCluster(29, 22, 5, 2.4, 4.2, 4.5);
  rockCluster(31, 25, 4, 1, 2, 3.5);
  // corner clusters
  rockCluster(-57, 55, 5, 2.5, 5, 5);
  rockCluster(57, 55, 5, 2.5, 5, 5);
  rockCluster(57, -52, 6, 2.5, 5.5, 6);
  rockCluster(46, -30, 5, 2, 4, 5);
  rockCluster(52, -12, 4, 1.6, 3.2, 4);
  // scattered infield rocks
  rockCluster(2, -30, 3, 1, 2.2, 6);
  rockCluster(-10, 20, 3, 0.8, 1.8, 6);
  rockCluster(44, 12, 3, 0.9, 1.8, 4);
  rockCluster(-34, 34, 3, 0.8, 1.6, 5);
  rockCluster(14, 34, 3, 0.8, 1.6, 5);
  rockCluster(-47, -30, 4, 1.5, 3, 4);
  rockCluster(-2, -38, 4, 1.2, 2.6, 5);
  rockCluster(8, -2, 3, 1.0, 2.2, 4);
  rockCluster(-16, 12, 3, 0.9, 1.8, 4);
  rockCluster(46, 44, 4, 1.2, 2.6, 5);
  rockCluster(-40, 14, 3, 0.8, 1.8, 4);
  rockCluster(20, -34, 3, 0.9, 1.8, 4);
  // scattered small stones everywhere
  for (let i = 0; i < 60; i++) {
    const x = (rnd() * 2 - 1) * 56, z = (rnd() * 2 - 1) * 56;
    const pr = track.probe ? null : null;
    const r = 0.35 + rnd() * 0.8;
    const mm = new THREE.Mesh(rockGeo(rnd, r), rnd() < 0.7 ? rockMat : rockDark);
    mm.position.set(x, r * 0.3, z);
    mm.rotation.y = rnd() * Math.PI * 2;
    mm.castShadow = mm.receiveShadow = true;
    rocks.add(mm);
  }

  // cliff rim rocks along the edges (irregular border)
  const rim = 60.0;
  for (let i = 0; i < 90; i++) {
    const side = i % 4, t = rnd() * 2 - 1;
    let x, z;
    if (side === 0) { x = t * rim; z = -rim + rnd() * 2; }
    else if (side === 1) { x = t * rim; z = rim - rnd() * 2; }
    else if (side === 2) { x = -rim + rnd() * 2; z = t * rim; }
    else { x = rim - rnd() * 2; z = t * rim; }
    const r = 0.9 + rnd() * 2.6;
    const m = new THREE.Mesh(rockGeo(rnd, r), rnd() < 0.7 ? rockMat : rockDark);
    m.position.set(x, r * 0.3, z);
    m.rotation.y = rnd() * Math.PI * 2;
    m.castShadow = m.receiveShadow = true;
    rocks.add(m);
  }
  group.add(rocks);

  // ---- cacti (saguaro) ----
  const cactusMat = new THREE.MeshStandardMaterial({ color: 0x5d7033, roughness: 0.9, flatShading: true });
  const cactusDark = new THREE.MeshStandardMaterial({ color: 0x49582a, roughness: 0.9, flatShading: true });
  const cactusSpots = [
    [-46, -34], [-49, -28], [-38, -46], [-57, -40], [-30, -55], [-12, -57], [4, -54],
    [14, -50], [26, -48], [40, -44], [46, -38], [52, -26], [54, -6], [55, 12],
    [50, 30], [42, 40], [30, 44], [12, 50], [-4, 55], [-18, 55], [-30, 52],
    [-44, 44], [-52, 30], [-55, 12], [-49, 2], [-28, -2], [-18, -14], [-2, -26],
    [8, -18], [2, 18], [12, 12], [22, 18], [36, 2], [40, -16], [-8, 34], [-16, 28],
    [58, 44], [-57, 50], [20, -28], [-36, -12],
  ];
  for (const [x, z] of cactusSpots) {
    const c = buildCactus(rnd, rnd() < 0.6 ? cactusMat : cactusDark);
    c.position.set(x + (rnd() - 0.5) * 3, 0, z + (rnd() - 0.5) * 3);
    c.rotation.y = rnd() * Math.PI * 2;
    const s = 0.75 + rnd() * 0.65;
    c.scale.set(s, s, s);
    group.add(c);
  }

  scene.add(group);
  return group;
}

function buildCactus(rnd, mat) {
  const g = new THREE.Group();
  const h = 2.0 + rnd() * 2.0;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, h, 8), mat);
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  g.add(trunk);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), mat);
  cap.position.y = h;
  cap.castShadow = true;
  g.add(cap);
  g.rotation.z = (rnd() - 0.5) * 0.12;
  const arms = rnd() < 0.7 ? 2 : 1;
  for (let i = 0; i < arms; i++) {
    const side = i === 0 ? 1 : -1;
    const ay = h * (0.35 + rnd() * 0.3);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 1.1, 6), mat);
    seg.rotation.z = side * Math.PI / 2;
    seg.position.set(side * 0.7, ay, 0);
    g.add(seg);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.32, 1.5 + rnd(), 6), mat);
    up.position.set(side * 1.05, ay + 0.6, 0);
    up.castShadow = true;
    g.add(up);
  }
  return g;
}
