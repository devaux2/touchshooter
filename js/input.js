import { CONFIG } from "./config.js";

// Translates raw pointer/touch events into the two game gestures:
//
//   * a single tap            -> fire a shot at that screen point
//   * a double-tap that holds -> duck (and reload) until the finger lifts
//
// The first tap of a double always fires — that mirrors arcade light-gun feel,
// where you shoot and then duck — and the quick second press is what triggers
// the duck/hold. Works for both touch and mouse so it is testable on desktop.
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
    this.isDuckGesture = false;

    this._bind();
  }

  _bind() {
    // Use pointer events so a single code path covers touch, pen and mouse.
    this.canvas.addEventListener("pointerdown", (e) => this._down(e));
    this.canvas.addEventListener("pointerup", (e) => this._up(e));
    this.canvas.addEventListener("pointercancel", (e) => this._up(e));
    this.canvas.addEventListener("pointermove", (e) => this._move(e));
    // Stop the browser from turning quick taps into synthetic mouse / zoom.
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("dblclick", (e) => e.preventDefault());
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this._cancelDuck();
  }

  _now() {
    return performance.now();
  }

  _down(e) {
    if (!this.enabled) return;
    e.preventDefault();

    const now = this._now();
    const sinceLast = now - this.lastTapTime;
    this.lastTapTime = now;

    if (this.onAim) this.onAim(e.clientX, e.clientY);

    // Second press of a double-tap, and we are not already ducking: start duck.
    if (sinceLast < CONFIG.input.doubleTapWindow && !this.isDuckGesture) {
      this.isDuckGesture = true;
      this.activePointerId = e.pointerId;
      if (this.onDuckStart) this.onDuckStart();
      return;
    }

    // Otherwise this is a shot.
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
    if (this.isDuckGesture && e.pointerId === this.activePointerId) {
      this._cancelDuck();
    }
  }

  _cancelDuck() {
    if (!this.isDuckGesture) return;
    this.isDuckGesture = false;
    this.activePointerId = null;
    if (this.onDuckEnd) this.onDuckEnd();
  }
}
