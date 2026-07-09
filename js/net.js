// PeerJS networking: 2-player rooms over the public PeerServer cloud.
// Host peer id: "rcrush-<CODE>". Guest connects directly.
const PREFIX = 'rcrush24-';
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: ['turn:staticauth.openrelay.metered.ca:80', 'turn:staticauth.openrelay.metered.ca:443'],
      username: 'openrelayproject', credential: 'openrelayprojectsecret',
    },
  ],
};

export function makeCode() {
  let c = '';
  for (let i = 0; i < 4; i++) c += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return c;
}

export class Net {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.code = null;
    this.onMessage = () => {};
    this.onOpen = () => {};
    this.onClose = () => {};
    this.onError = () => {};
    this._pingT = null;
    this.rtt = 0;
  }

  host(code, cb) {
    this.isHost = true;
    this.code = code;
    this.peer = new Peer(PREFIX + code, { config: ICE });
    this.peer.on('open', () => cb && cb(null));
    this.peer.on('error', (e) => {
      if (e.type === 'unavailable-id') cb && cb('taken');
      else this.onError(e.type || 'error');
    });
    this.peer.on('connection', (conn) => {
      if (this.conn && this.conn.open) { conn.close(); return; }   // room full
      this._wire(conn);
    });
  }

  join(code) {
    this.isHost = false;
    this.code = code;
    this.peer = new Peer({ config: ICE });
    this.peer.on('open', () => {
      const conn = this.peer.connect(PREFIX + code, { reliable: false, serialization: 'json' });
      this._wire(conn);
    });
    this.peer.on('error', (e) => this.onError(e.type || 'error'));
  }

  _wire(conn) {
    this.conn = conn;
    conn.on('open', () => {
      this.onOpen();
      this._pingT = setInterval(() => {
        this._pingSent = performance.now();
        this.send({ t: 'ping' });
      }, 2000);
    });
    conn.on('data', (m) => {
      if (!m || typeof m !== 'object') return;
      if (m.t === 'ping') { this.send({ t: 'pong' }); return; }
      if (m.t === 'pong') { this.rtt = performance.now() - this._pingSent; return; }
      this.onMessage(m);
    });
    conn.on('close', () => { clearInterval(this._pingT); this.onClose(); });
    conn.on('error', () => { clearInterval(this._pingT); this.onClose(); });
  }

  send(obj) {
    if (this.conn && this.conn.open) {
      try { this.conn.send(obj); } catch (e) { /* transient */ }
    }
  }
  get connected() { return !!(this.conn && this.conn.open); }
  destroy() {
    clearInterval(this._pingT);
    try { if (this.conn) this.conn.close(); } catch (e) {}
    try { if (this.peer) this.peer.destroy(); } catch (e) {}
    this.conn = null; this.peer = null;
  }
}

// Remote car interpolation buffer
export class RemoteCar {
  constructor() {
    this.buf = [];
    this.x = 0; this.z = 0; this.heading = 0; this.speed = 0;
    this.lap = 1; this.u = 0; this.finished = false;
  }
  push(st, now) {
    this.buf.push({ ...st, at: now });
    if (this.buf.length > 20) this.buf.shift();
    this.lap = st.lap; this.u = st.u; this.finished = !!st.fin;
  }
  sample(now) {
    const delay = 120;
    const t = now - delay;
    const b = this.buf;
    if (!b.length) return;
    if (b.length === 1 || t <= b[0].at) {
      Object.assign(this, { x: b[0].x, z: b[0].z, heading: b[0].h, speed: b[0].v });
      return;
    }
    for (let i = b.length - 1; i > 0; i--) {
      if (b[i - 1].at <= t) {
        const a = b[i - 1], c = b[i];
        const f = Math.min(1.5, (t - a.at) / Math.max(1, c.at - a.at));
        this.x = a.x + (c.x - a.x) * f;
        this.z = a.z + (c.z - a.z) * f;
        let dh = c.h - a.h;
        while (dh > Math.PI) dh -= 2 * Math.PI;
        while (dh < -Math.PI) dh += 2 * Math.PI;
        this.heading = a.h + dh * f;
        this.speed = c.v;
        return;
      }
    }
    const last = b[b.length - 1];
    Object.assign(this, { x: last.x, z: last.z, heading: last.h, speed: last.v });
  }
}
