// Touch buttons + keyboard input.
export class Controls {
  constructor() {
    this.state = { gas: 0, brake: 0, steer: 0 };
    this._touch = { L: false, R: false, G: false, B: false };
    this._keys = new Set();

    const bind = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on = (e) => { e.preventDefault(); this._touch[key] = true; el.classList.add('on'); };
      const offf = (e) => { e.preventDefault(); this._touch[key] = false; el.classList.remove('on'); };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', offf);
      el.addEventListener('pointercancel', offf);
      el.addEventListener('pointerleave', offf);
      el.addEventListener('contextmenu', e => e.preventDefault());
    };
    bind('btnL', 'L'); bind('btnR', 'R'); bind('btnG', 'G'); bind('btnB', 'B');

    window.addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      this._keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', e => this._keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this._keys.clear(); this._touch = { L: 0, R: 0, G: 0, B: 0 }; });
  }
  read() {
    const k = this._keys, t = this._touch;
    const left = t.L || k.has('arrowleft') || k.has('a');
    const right = t.R || k.has('arrowright') || k.has('d');
    const gas = t.G || k.has('arrowup') || k.has('w');
    const brake = t.B || k.has('arrowdown') || k.has('s') || k.has(' ');
    // heading convention: positive steer turns LEFT (heading increases), so left - right
    const target = (left ? 1 : 0) - (right ? 1 : 0);
    this.state.steer = target;
    this.state.gas = gas ? 1 : 0;
    this.state.brake = brake ? 1 : 0;
    return this.state;
  }
}
