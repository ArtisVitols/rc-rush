// Track definition traced from the reference picture (image.jpg).
// Plan coordinates: X east (screen lower-right edge direction), Z south (screen lower-left).
// Board is a square of half-size BOARD. Camera parameters fitted to the picture.
import * as THREE from 'three';

export const BOARD = 62;          // half size of the diorama top surface
export const BASE_DEPTH = 26;     // cliff block height below the top surface

// Fitted camera (matches the reference render): see plan notes.
export const CAM = {
  fov: 37.2103,
  dist: 234.5,
  azDeg: 45.6644,
  elDeg: 45.9255,
  target: new THREE.Vector3(10.6076, 0, 12.5665),
  rollDeg: -1.7081,
};

// Waypoints: x, z, w(half-width), s: 'A' asphalt | 'D' dirt | 'P' paved start apron.
// Race direction: counterclockwise as listed (north through START gate, turn 01 at top-right).
const WP = [
  { x:-36.4, z: 20.0, w: 6.5, s:'P', tag:'gate' },
  { x:-35.8, z: 12.5, w: 7.0, s:'P' },
  { x:-33.7, z:  1.6, w: 7.5, s:'P' },
  { x:-34.3, z: -7.2, w: 7.0, s:'P', tag:'grandstand' },
  { x:-38.6, z:-17.2, w: 5.6, s:'D' },
  { x:-41.8, z:-27.6, w: 5.4, s:'D' },
  { x:-43.8, z:-39.8, w: 5.4, s:'D', tag:'mound' },
  { x:-42.4, z:-47.5, w: 5.2, s:'D' },
  { x:-38.0, z:-53.0, w: 5.2, s:'D' },
  { x:-28.4, z:-54.5, w: 5.2, s:'D' },
  { x:-19.1, z:-52.5, w: 5.2, s:'D' },
  { x:-10.7, z:-50.0, w: 5.4, s:'A', tag:'containers' },
  { x: -0.5, z:-47.0, w: 5.4, s:'A' },
  { x:  9.2, z:-44.5, w: 5.4, s:'A' },
  { x: 16.7, z:-44.1, w: 5.6, s:'A', tag:'t01a' },
  { x: 25.3, z:-43.3, w: 5.6, s:'A' },
  { x: 32.8, z:-38.2, w: 5.6, s:'A', tag:'t01apex' },
  { x: 35.0, z:-30.5, w: 5.6, s:'A' },
  { x: 32.3, z:-24.2, w: 5.6, s:'A', tag:'purple' },
  { x: 27.4, z:-19.6, w: 5.6, s:'A' },
  { x: 22.7, z:-14.1, w: 5.6, s:'A', tag:'green' },
  { x: 19.1, z: -8.9, w: 5.4, s:'D' },
  { x: 13.5, z: -7.6, w: 5.2, s:'D' },
  { x:  6.2, z: -9.9, w: 5.0, s:'D' },
  { x: -0.6, z:-13.4, w: 5.0, s:'D' },
  { x: -5.9, z:-20.5, w: 5.0, s:'D' },
  { x: -8.5, z:-28.5, w: 5.0, s:'D' },
  { x:-12.0, z:-37.6, w: 5.0, s:'D' },
  { x:-18.1, z:-45.0, w: 5.0, s:'D', tag:'isleE' },
  { x:-26.3, z:-49.5, w: 5.0, s:'D' },
  { x:-36.7, z:-50.0, w: 5.0, s:'D', tag:'isltop' },
  { x:-42.3, z:-45.1, w: 5.0, s:'D' },
  { x:-42.6, z:-35.2, w: 5.0, s:'D' },
  { x:-38.2, z:-24.9, w: 5.0, s:'D' },
  { x:-30.8, z:-16.0, w: 5.0, s:'D', tag:'isleW' },
  { x:-22.4, z: -7.6, w: 5.0, s:'D' },
  { x:-13.6, z: -0.8, w: 5.0, s:'D' },
  { x: -4.0, z:  5.4, w: 5.0, s:'D', tag:'midS' },
  { x:  4.4, z: 11.8, w: 5.0, s:'D' },
  { x:  9.6, z: 19.2, w: 5.0, s:'D' },
  { x: 17.2, z: 26.3, w: 5.0, s:'D' },
  { x: 25.9, z: 30.6, w: 5.0, s:'D' },
  { x: 34.7, z: 31.2, w: 5.0, s:'D' },
  { x: 39.5, z: 26.2, w: 5.0, s:'D' },
  { x: 39.1, z: 18.1, w: 5.0, s:'D' },
  { x: 35.6, z: 11.0, w: 5.0, s:'D', tag:'loopE' },
  { x: 32.8, z:  6.9, w: 4.8, s:'D' },
  { x: 31.9, z:  2.6, w: 4.8, s:'D', tag:'exitNE' },
  { x: 32.6, z: -2.0, w: 4.8, s:'D' },
  { x: 34.8, z: -6.2, w: 5.2, s:'A' },
  { x: 36.3, z: -9.1, w: 5.2, s:'A' },
  { x: 41.6, z: -8.2, w: 5.2, s:'A' },
  { x: 46.1, z: -4.7, w: 5.2, s:'A' },
  { x: 51.0, z:  1.0, w: 5.2, s:'A' },
  { x: 53.4, z:  8.9, w: 5.4, s:'A' },
  { x: 53.3, z: 17.5, w: 5.4, s:'A', tag:'BRc' },
  { x: 51.3, z: 25.8, w: 5.4, s:'A' },
  { x: 44.1, z: 31.4, w: 5.4, s:'A' },
  { x: 35.3, z: 35.8, w: 5.4, s:'A' },
  { x: 25.4, z: 39.5, w: 5.4, s:'A' },
  { x: 15.7, z: 43.7, w: 5.4, s:'A', tag:'yellow' },
  { x:  7.1, z: 46.7, w: 5.4, s:'A' },
  { x: -2.2, z: 50.2, w: 5.4, s:'A' },
  { x:-13.5, z: 51.6, w: 6.0, s:'A', tag:'BL180' },
  { x:-21.2, z: 48.6, w: 6.0, s:'A' },
  { x:-23.3, z: 42.0, w: 5.8, s:'A' },
  { x:-23.7, z: 38.2, w: 5.8, s:'A' },
  { x:-24.5, z: 34.5, w: 6.0, s:'A', tag:'checker' },
  { x:-30.0, z: 27.8, w: 6.2, s:'A' },
];

export const N_SAMPLES = 1024;

export class Track {
  constructor() {
    const pts = WP.map(w => new THREE.Vector3(w.x, 0, w.z));
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5);
    this.wp = WP;
    this.length = this.curve.getLength();
    this.samples = [];
    const div = this.curve.getSpacedPoints(N_SAMPLES);
    // arc-length u of each waypoint (samples are arc-length spaced, waypoints are not)
    const NL = 2048;
    const lengths = this.curve.getLengths(NL);
    const total = lengths[NL];
    this.wpArcU = WP.map((_, i) => {
      const t = i / WP.length * NL;
      const i0 = Math.floor(t), ft = t - i0;
      const len = lengths[Math.min(i0, NL)] * (1 - ft) + lengths[Math.min(i0 + 1, NL)] * ft;
      return len / total;
    });
    // smooth the traced centerline (moving average, wrap-around) to kill trace noise
    const sm = div.slice(0, N_SAMPLES).map(p => p.clone());
    for (let pass = 0; pass < 4; pass++) {
      const prev = sm.map(p => p.clone());
      const K = 10;
      for (let i = 0; i < N_SAMPLES; i++) {
        let sx = 0, sz = 0;
        for (let k = -K; k <= K; k++) {
          const q = prev[(i + k + N_SAMPLES) % N_SAMPLES];
          sx += q.x; sz += q.z;
        }
        sm[i].set(sx / (2 * K + 1), 0, sz / (2 * K + 1));
      }
    }
    let wpPtr = 0;
    for (let i = 0; i < N_SAMPLES; i++) {
      const u = i / N_SAMPLES;
      const pos = sm[i];
      const nxt = sm[(i + 2) % N_SAMPLES], prv = sm[(i - 2 + N_SAMPLES) % N_SAMPLES];
      const tan = new THREE.Vector3(nxt.x - prv.x, 0, nxt.z - prv.z).normalize();
      const nrm = new THREE.Vector3(-tan.z, 0, tan.x); // left normal
      // advance waypoint bracket for this arc position
      while (wpPtr < WP.length - 1 && this.wpArcU[wpPtr + 1] <= u) wpPtr++;
      const u0 = this.wpArcU[wpPtr];
      const u1 = wpPtr < WP.length - 1 ? this.wpArcU[wpPtr + 1] : 1;
      const ft = u1 > u0 ? (u - u0) / (u1 - u0) : 0;
      const j1 = (wpPtr + 1) % WP.length;
      const w = WP[wpPtr].w * (1 - ft) + WP[j1].w * ft;
      const s = ft < 0.5 ? WP[wpPtr].s : WP[j1].s;
      this.samples.push({ pos, tan, nrm, w, s, u });
    }
    // spatial hash for nearest-sample queries
    this.cell = 6;
    this.grid = new Map();
    this.samples.forEach((sm, i) => {
      const k = this._key(sm.pos.x, sm.pos.z);
      if (!this.grid.has(k)) this.grid.set(k, []);
      this.grid.get(k).push(i);
    });
    // start/finish index (checker tag)
    this.finishU = this.wpArcU[WP.findIndex(w => w.tag === 'checker')];
    this.gateU = this.wpArcU[WP.findIndex(w => w.tag === 'gate')];
  }
  // arc-length u for a (fractional) waypoint index
  wpU(i) {
    const n = this.wp.length;
    const i0 = Math.floor(i) % n, ft = i - Math.floor(i);
    const u0 = this.wpArcU[i0];
    const u1 = i0 + 1 < n ? this.wpArcU[i0 + 1] : 1;
    return u0 + (u1 - u0) * ft;
  }
  _key(x, z) { return (Math.floor(x / this.cell) + 200) * 1000 + Math.floor(z / this.cell) + 200; }

  // nearest sample to a world position (checks 3x3 cells, falls back to coarse scan).
  // nearU: if given, prefer samples within a track-distance window of it — required where
  // two track legs pass close to each other (top band vs hairpin, loop exit vs entry).
  nearest(x, z, nearU = null) {
    let best = -1, bd = 1e9;
    let bestNear = -1, bdNear = 1e9;
    const WIN = 0.045;
    const consider = (i) => {
      const s = this.samples[i];
      const d = (s.pos.x - x) ** 2 + (s.pos.z - z) ** 2;
      if (d < bd) { bd = d; best = i; }
      if (nearU != null) {
        let du = Math.abs(s.u - nearU);
        if (du > 0.5) du = 1 - du;
        if (du < WIN && d < bdNear) { bdNear = d; bestNear = i; }
      }
    };
    const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const arr = this.grid.get((cx + dx + 200) * 1000 + (cz + dz + 200));
      if (!arr) continue;
      for (const i of arr) consider(i);
    }
    if (best < 0) {
      for (let i = 0; i < N_SAMPLES; i += 8) consider(i);
    }
    return bestNear >= 0 ? bestNear : best;
  }
  // info at world pos: {sample, lateral (+left), dist, surface, onTrack}
  probe(x, z, nearU = null) {
    const i = this.nearest(x, z, nearU);
    const s = this.samples[i];
    const dx = x - s.pos.x, dz = z - s.pos.z;
    const lat = dx * s.nrm.x + dz * s.nrm.z;
    const lon = dx * s.tan.x + dz * s.tan.z;
    return { i, s, lat, lon, onTrack: Math.abs(lat) <= s.w, u: s.u };
  }
  pointAt(u, lateral = 0) {
    const i = ((Math.round(u * N_SAMPLES) % N_SAMPLES) + N_SAMPLES) % N_SAMPLES;
    const s = this.samples[i];
    return new THREE.Vector3(s.pos.x + s.nrm.x * lateral, 0, s.pos.z + s.nrm.z * lateral);
  }
  headingAt(u) {
    const i = ((Math.round(u * N_SAMPLES) % N_SAMPLES) + N_SAMPLES) % N_SAMPLES;
    const s = this.samples[i];
    return Math.atan2(s.tan.x, s.tan.z);
  }
}

export function makeCamera(aspect) {
  const cam = new THREE.PerspectiveCamera(CAM.fov, aspect, 1, 900);
  positionBoardCamera(cam);
  return cam;
}

export function positionBoardCamera(cam) {
  const az = CAM.azDeg * Math.PI / 180, el = CAM.elDeg * Math.PI / 180;
  const t = CAM.target;
  cam.position.set(
    t.x + CAM.dist * Math.cos(el) * Math.sin(az),
    CAM.dist * Math.sin(el),
    t.z + CAM.dist * Math.cos(el) * Math.cos(az));
  // roll: rotate the up vector around the view axis
  const fwd = t.clone().sub(cam.position).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const upv = new THREE.Vector3().crossVectors(right, fwd);
  const r = CAM.rollDeg * Math.PI / 180;
  cam.up.copy(right.clone().multiplyScalar(-Math.sin(r)).add(upv.multiplyScalar(Math.cos(r))));
  cam.lookAt(t);
}

// zoom so the whole board fits regardless of viewport aspect
export function fitBoardZoom(cam) {
  cam.zoom = 1; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const corners = [
    new THREE.Vector3(-BOARD, 0, -BOARD), new THREE.Vector3(BOARD, 0, -BOARD),
    new THREE.Vector3(BOARD, 0, BOARD), new THREE.Vector3(-BOARD, 0, BOARD),
    new THREE.Vector3(-BOARD, -BASE_DEPTH, BOARD), new THREE.Vector3(BOARD, -BASE_DEPTH, BOARD),
    new THREE.Vector3(BOARD, -BASE_DEPTH, -BOARD),
  ];
  let m = 0;
  for (const c of corners) {
    const p = c.clone().project(cam);
    m = Math.max(m, Math.abs(p.x), Math.abs(p.y));
  }
  cam.zoom = 0.97 / m;
  cam.updateProjectionMatrix();
}
