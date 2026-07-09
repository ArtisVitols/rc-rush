// Race logic: checkpoints, laps, positions, wrong-way detection.
export const TOTAL_LAPS = 3;
const N_CP = 10;

export class RaceCar {
  constructor(track, startU) {
    this.track = track;
    this.lap = 1;
    this.cp = 0;                   // checkpoints passed this lap
    this.lastU = startU;
    this.progress = 0;             // continuous progress for positions
    this.finished = false;
    this.finishTime = 0;
    this.wrongWay = 0;
    this.lapTimes = [];
    this.lapStart = 0;
  }
  // u: current track param 0..1 (relative to finish line at track.finishU)
  update(u, now) {
    const rel = (v) => ((v - this.track.finishU) % 1 + 1) % 1;   // 0 at finish line
    const cur = rel(u), prev = rel(this.lastU);
    let d = cur - prev;
    if (d > 0.5) d -= 1;
    if (d < -0.5) d += 1;
    // wrong way detection (moving backward persistently)
    if (d < -0.0005) this.wrongWay = Math.min(this.wrongWay + 1, 90);
    else if (d > 0.0005) this.wrongWay = Math.max(this.wrongWay - 3, 0);

    // checkpoint index reached
    const cpIdx = Math.floor(cur * N_CP);
    if (cpIdx === this.cp && cpIdx < N_CP) this.cp = cpIdx + 1;
    // lap: crossed the line forward with most checkpoints collected
    if (prev > 0.85 && cur < 0.15 && d > -0.5 && this.cp >= N_CP - 1) {
      this.lapTimes.push(now - this.lapStart);
      this.lapStart = now;
      this.cp = 0;
      if (this.lap >= TOTAL_LAPS) { this.finished = true; this.finishTime = now; }
      else this.lap++;
    }
    this.progress = (this.lap - 1) + cur + this.cp * 0.0001;
    this.lastU = u;
  }
}

export function fmtTime(ms) {
  if (ms == null || !isFinite(ms)) return '-:--.-';
  const t = Math.max(0, ms);
  const m = Math.floor(t / 60000), s = Math.floor(t % 60000 / 1000), d = Math.floor(t % 1000 / 100);
  return `${m}:${String(s).padStart(2, '0')}.${d}`;
}
