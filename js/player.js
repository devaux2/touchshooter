import { CONFIG } from "./config.js";

// Pure game-state for the player: health, ammunition and the duck/reload cycle.
// It holds no Babylon objects — the camera dip and the HUD read from it.
export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    const p = CONFIG.player;
    this.maxHealth = p.maxHealth;
    this.health = p.maxHealth;
    this.magazine = p.magazine;
    this.ammo = p.magazine;
    this.ducking = false;
    this.reloadElapsed = 0;
  }

  get alive() {
    return this.health > 0;
  }

  get empty() {
    return this.ammo <= 0;
  }

  // A shot is allowed only when standing, alive and with rounds left.
  canFire() {
    return this.alive && !this.ducking && this.ammo > 0;
  }

  consumeRound() {
    if (this.ammo > 0) this.ammo -= 1;
    return this.ammo;
  }

  startDuck() {
    if (!this.alive) return;
    this.ducking = true;
    this.reloadElapsed = 0;
  }

  endDuck() {
    this.ducking = false;
    this.reloadElapsed = 0;
  }

  // Damage only lands while the player is exposed (standing).
  takeDamage(amount = 1) {
    if (!this.alive || this.ducking) return false;
    this.health = Math.max(0, this.health - amount);
    return true;
  }

  // Advances the reload timer while ducking; refills the magazine once full.
  update(dt) {
    if (this.ducking && this.ammo < this.magazine) {
      this.reloadElapsed += dt;
      if (this.reloadElapsed >= CONFIG.player.reloadTime) {
        this.ammo = this.magazine;
        this.reloadElapsed = 0;
      }
    }
  }
}
