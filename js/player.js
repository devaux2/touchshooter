import { CONFIG } from "./config.js";

// Pure game-state for the player: health, the pistol's magazine/reload cycle,
// and any temporary special weapon picked up from a drop. Holds no Babylon
// objects — the camera dip, HUD and shooting logic read from it.
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

    // Weapon: "pistol" (the default, magazine + reload) or a special weapon key
    // with its own finite ammo and no reload.
    this.weapon = "pistol";
    this.weaponDef = null;
    this.specialAmmo = 0;
  }

  get alive() {
    return this.health > 0;
  }

  get isSpecial() {
    return this.weapon !== "pistol";
  }

  // What the HUD shows: special ammo while a special weapon is held, else the
  // pistol magazine.
  get displayAmmo() {
    return this.isSpecial ? this.specialAmmo : this.ammo;
  }

  get displayMax() {
    return this.isSpecial ? this.weaponDef.ammo : this.magazine;
  }

  get weaponColor() {
    return this.isSpecial ? this.weaponDef.color : null;
  }

  get weaponName() {
    return this.isSpecial ? this.weaponDef.name : null;
  }

  get empty() {
    return this.isSpecial ? this.specialAmmo <= 0 : this.ammo <= 0;
  }

  // A shot is allowed only when standing, alive and with rounds left.
  canFire() {
    return this.alive && !this.ducking && !this.empty;
  }

  consumeRound() {
    if (this.isSpecial) {
      if (this.specialAmmo > 0) this.specialAmmo -= 1;
      if (this.specialAmmo <= 0) this._revert(); // out of special ammo
    } else if (this.ammo > 0) {
      this.ammo -= 1;
    }
  }

  giveWeapon(key, def) {
    this.weapon = key;
    this.weaponDef = def;
    this.specialAmmo = def.ammo;
  }

  _revert() {
    this.weapon = "pistol";
    this.weaponDef = null;
    this.specialAmmo = 0;
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

  // Advances the reload timer while ducking; refills the pistol magazine once
  // full. Special weapons don't reload — they revert when spent.
  update(dt) {
    if (this.isSpecial) return;
    if (this.ducking && this.ammo < this.magazine) {
      this.reloadElapsed += dt;
      if (this.reloadElapsed >= CONFIG.player.reloadTime) {
        this.ammo = this.magazine;
        this.reloadElapsed = 0;
      }
    }
  }
}
