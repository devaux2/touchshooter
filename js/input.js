import { CONFIG } from "./config.js";

// Translates raw input into the two game actions — shoot, and duck/reload —
// across both touch and desktop:
//
//   Touch / pen:
//     * single tap            -> fire at that point
//     * double-tap that holds -> duck (and reload) until the finger lifts
//   Desktop:
//     * left mouse click      -> fire at the cursor
//     * hold Space            -> duck (and reload) until released
//
// Duck can be requested by more than one source (a held finger and the Space
// key); the view only stands back up once every source has released.
export class InputManager {
  constructor(canvas, { onFire, onDuckStart, onDuckEnd, onAim }) {
    this.canvas = canvas;
    this.onFire = onFire;
    this.onDuckStart = onDuckStart;
    this.onDuckEnd = onDuckEnd;
    this.onAim = onAim;

    this.enabled = false;
    this.lastTapTime = -Infinity;
    this.lastFireTime = -Infinity;
    this.activePointerId = null;

    // Duck sources, combined in _refreshDuck().
    this.touchDuck = false;
    this.keyDuck = false;
    this.duckActive = false;

    this._bind();
  }

  _bind() {
    // Pointer events cover touch, pen and mouse in one path.
    this.canvas.addEventListener("pointerdown", (e) => this._down(e));
    this.canvas.addEventListener("pointerup", (e) => this._up(e));
    this.canvas.addEventListener("pointercancel", (e) => this._up(e));
    this.canvas.addEventListener("pointermove", (e) => this._move(e));
    // Stop the browser turning quick taps / right-clicks into menus or zoom.
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("dblclick", (e) => e.preventDefault());

    // Keyboard: Space ducks/reloads on desktop.
    window.addEventListener("keydown", (e) => this._key(e, true));
    window.addEventListener("keyup", (e) => this._key(e, false));
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) {
      this.touchDuck = false;
      this.keyDuck = false;
      this._refreshDuck();
    }
  }

  _now() {
    return performance.now();
  }

  // Fold all duck sources into a single start/stop so releasing one source
  // doesn't stand you up while another is still held.
  _refreshDuck() {
    const want = this.touchDuck || this.keyDuck;
    if (want === this.duckActive) return;
    this.duckActive = want;
    if (want) {
      if (this.onDuckStart) this.onDuckStart();
    } else if (this.onDuckEnd) {
      this.onDuckEnd();
    }
  }

  _down(e) {
    if (!this.enabled) return;
    // Only the left mouse button shoots; ignore right/middle.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();

    if (this.onAim) this.onAim(e.clientX, e.clientY);

    const now = this._now();

    // Touch/pen only: a quick second press becomes the duck/hold gesture. On a
    // mouse, every left click just fires (Space is the duck key instead).
    if (e.pointerType !== "mouse") {
      const sinceLast = now - this.lastTapTime;
      this.lastTapTime = now;
      if (sinceLast < CONFIG.input.doubleTapWindow && !this.touchDuck) {
        this.touchDuck = true;
        this.activePointerId = e.pointerId;
        this._refreshDuck();
        return;
      }
    }

    if (now - this.lastFireTime >= CONFIG.input.fireCooldown) {
      this.lastFireTime = now;
      if (this.onFire) this.onFire(e.clientX, e.clientY);
    }
  }

  _move(e) {
    if (!this.enabled) return;
    if (this.onAim) this.onAim(e.clientX, e.clientY);
  }

  _up(e) {
    if (!this.enabled) return;
    if (this.touchDuck && e.pointerId === this.activePointerId) {
      this.touchDuck = false;
      this.activePointerId = null;
      this._refreshDuck();
    }
  }

  _key(e, down) {
    if (e.code !== "Space") return;
    // Always swallow Space so it can't scroll the page or re-trigger a button.
    e.preventDefault();
    if (!this.enabled) return;
    if (down && e.repeat) return; // ignore auto-repeat while held
    this.keyDuck = down;
    this._refreshDuck();
  }
}
