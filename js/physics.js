// Arcade RC car physics on the 2D ground plane.
import { CAR_LEN, CAR_WID } from './cars.js';

const SURF = {
  A: { grip: 9.0, maxSpeed: 40, accel: 30, roll: 1.2 },   // asphalt
  P: { grip: 9.0, maxSpeed: 40, accel: 30, roll: 1.2 },
  D: { grip: 5.0, maxSpeed: 34, accel: 26, roll: 2.2 },   // dirt — drifty
  S: { grip: 4.0, maxSpeed: 15, accel: 12, roll: 7.0 },   // sand (off track)
};
const WALL_MARGIN = 4.5;    // sand shoulder width before the invisible wall
const CAR_R = 1.5;

export class CarPhysics {
  constructor(track, u0, lateral) {
    this.track = track;
    const p = track.pointAt(u0, lateral);
    this.x = p.x; this.z = p.z;
    this.heading = track.headingAt(u0);
    this.vx = 0; this.vz = 0;
    this.speed = 0;
    this.steer = 0;
    this.throttle = 0;
    this.surface = 'A';
    this.u = u0;
    this.wallHit = 0;
  }

  step(dt, input) {
    // input: {gas:0..1, brake:0..1, steer:-1..1}
    const probe = this.track.probe(this.x, this.z);
    const off = Math.abs(probe.lat) - probe.s.w;
    this.surface = off > 0.6 ? 'S' : probe.s.s;
    this.u = probe.u;
    const surf = SURF[this.surface];

    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    let vF = this.vx * fx + this.vz * fz;              // forward speed
    const rx = fz, rz = -fx;                            // right vector
    let vR = this.vx * rx + this.vz * rz;              // lateral speed

    // steering (speed sensitive)
    const steerMax = 0.85;
    const sf = Math.min(1, Math.abs(vF) / 6);
    this.steer += (input.steer * steerMax - this.steer) * Math.min(1, dt * 10);
    const yawRate = this.steer * sf * (2.9 - Math.min(1.2, Math.abs(vF) * 0.02)) * Math.sign(vF || 1);
    this.heading += yawRate * dt;

    // forces
    const accel = input.gas * surf.accel * (1 - Math.abs(vF) / surf.maxSpeed);
    vF += accel * dt;
    if (input.brake > 0) {
      if (vF > 0.5) vF -= input.brake * 55 * dt;
      else vF -= input.brake * 10 * dt;               // reverse
      vF = Math.max(vF, -10);
    }
    // rolling resistance / drag
    vF -= vF * surf.roll * 0.06 * dt * (1 + Math.abs(vF) * 0.02);
    // lateral grip
    vR -= vR * Math.min(1, surf.grip * dt);

    // recompose velocity in (possibly rotated) frame
    const nfx = Math.sin(this.heading), nfz = Math.cos(this.heading);
    const nrx = nfz, nrz = -nfx;
    this.vx = nfx * vF + nrx * vR;
    this.vz = nfz * vF + nrz * vR;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.speed = vF;

    // wall clamp (track corridor)
    const p2 = this.track.probe(this.x, this.z);
    const limit = p2.s.w + WALL_MARGIN;
    this.wallHit = 0;
    if (Math.abs(p2.lat) > limit) {
      const sgn = Math.sign(p2.lat);
      const nx = p2.s.nrm.x, nz = p2.s.nrm.z;
      this.x = p2.s.pos.x + nx * limit * sgn;
      this.z = p2.s.pos.z + nz * limit * sgn;
      const vn = this.vx * nx + this.vz * nz;
      if (vn * sgn > 0) {
        this.vx -= nx * vn * 1.5;
        this.vz -= nz * vn * 1.5;
        this.wallHit = Math.abs(vn);
      }
    }
  }
}

// simple circle collision between two cars — push apart, exchange a bit of momentum
export function collideCars(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  const minD = CAR_R * 2;
  if (d > 0.001 && d < minD) {
    const nx = dx / d, nz = dz / d;
    const push = (minD - d) / 2;
    a.x -= nx * push; a.z -= nz * push;
    b.x += nx * push; b.z += nz * push;
    const rvx = b.vx - a.vx, rvz = b.vz - a.vz;
    const rel = rvx * nx + rvz * nz;
    if (rel < 0) {
      const imp = -rel * 0.65;
      a.vx -= nx * imp; a.vz -= nz * imp;
      b.vx += nx * imp; b.vz += nz * imp;
    }
    return true;
  }
  return false;
}
