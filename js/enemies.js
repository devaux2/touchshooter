import { CONFIG } from "./config.js";

const B = window.BABYLON;

// How far an enemy sinks below its standing position while hidden in cover.
const SINK_DEPTH = 2.2;

const State = {
  RISING: "rising",
  AIMING: "aiming",
  RETREATING: "retreating",
  HIDING: "hiding",
  DYING: "dying",
  DONE: "done",
};

// A single placeholder foe built from primitive meshes (capsule body + sphere
// head + a gun box). It loops a small state machine: emerge from cover, take aim
// (telegraphed by turning red), fire a shot, duck back down, wait, then emerge
// again — repeating until the player shoots it. It only leaves the wave when
// killed, so the player must clear every enemy to advance.
class Enemy {
  constructor(scene, manager, spec) {
    this.scene = scene;
    this.manager = manager;
    this.spec = spec;
    this.state = State.RISING;
    this.t = 0;
    this.hasFired = false;

    this.standY = spec.position.y;
    this.hiddenY = spec.position.y - SINK_DEPTH;

    this._build(spec);
    this.root.position.set(spec.position.x, this.hiddenY, spec.position.z);
  }

  _build(spec) {
    const scene = this.scene;
    const root = new B.TransformNode("enemy", scene);
    this.root = root;

    // Body — a capsule.
    const body = B.MeshBuilder.CreateCapsule(
      "enemyBody",
      { height: 1.7, radius: 0.42, tessellation: 8 },
      scene
    );
    body.position.y = 0.95;

    // Head — a sphere.
    const head = B.MeshBuilder.CreateSphere(
      "enemyHead",
      { diameter: 0.62, segments: 8 },
      scene
    );
    head.position.y = 2.0;

    // Gun — a thin box pointed at the player.
    const gun = B.MeshBuilder.CreateBox(
      "enemyGun",
      { width: 0.18, height: 0.18, depth: 0.9 },
      scene
    );
    gun.position.set(0.34, 1.25, 0.45);

    this.bodyMat = new B.StandardMaterial("enemyMat", scene);
    this.bodyMat.diffuseColor = B.Color3.FromHexString(spec.color || "#3a6ea5");
    this.bodyMat.specularColor = new B.Color3(0.1, 0.1, 0.1);
    body.material = this.bodyMat;
    head.material = this.bodyMat;

    const gunMat = new B.StandardMaterial("gunMat", scene);
    gunMat.diffuseColor = new B.Color3(0.12, 0.12, 0.14);
    gun.material = gunMat;

    // Muzzle flash, hidden until the enemy fires.
    const flash = B.MeshBuilder.CreatePlane("muzzle", { size: 0.7 }, scene);
    flash.position.set(0.34, 1.25, 0.95);
    flash.billboardMode = B.Mesh.BILLBOARDMODE_ALL;
    const flashMat = new B.StandardMaterial("flashMat", scene);
    flashMat.emissiveColor = new B.Color3(1, 0.8, 0.2);
    flashMat.opacityTexture = null;
    flashMat.disableLighting = true;
    flash.material = flashMat;
    flash.isVisible = false;
    flash.isPickable = false;
    this.flash = flash;

    // Parent everything and tag pickable parts so a ray hit maps back here.
    this.parts = [body, head, gun];
    for (const part of this.parts) {
      part.parent = root;
      part.metadata = { enemy: this };
      part.isPickable = true;
    }
    flash.parent = root;
  }

  // Smoothly raise/lower the whole figure between hidden and standing heights.
  _setEmerge(fraction) {
    const f = Math.min(1, Math.max(0, fraction));
    this.root.position.y = this.hiddenY + (this.standY - this.hiddenY) * f;
  }

  // Ramp the body toward red as it lines up its shot.
  _setTelegraph(fraction) {
    const base = B.Color3.FromHexString(this.spec.color || "#3a6ea5");
    const danger = new B.Color3(1, 0.15, 0.1);
    this.bodyMat.diffuseColor = B.Color3.Lerp(base, danger, fraction);
    this.bodyMat.emissiveColor = new B.Color3(fraction * 0.5, 0, 0);
  }

  update(dt) {
    const e = CONFIG.enemy;
    this.t += dt;

    switch (this.state) {
      case State.RISING:
        this._setEmerge(this.t / e.riseTime);
        if (this.t >= e.riseTime) {
          this.state = State.AIMING;
          this.t = 0;
        }
        break;

      case State.AIMING:
        this._setTelegraph(this.t / e.aimTime);
        if (this.t >= e.aimTime) {
          this._fire();
          this.state = State.RETREATING;
          this.t = 0;
        }
        break;

      case State.RETREATING:
        if (this.flash.isVisible && this.t > 0.08) this.flash.isVisible = false;
        this._setEmerge(1 - this.t / e.riseTime);
        if (this.t >= e.riseTime) {
          // Duck back into cover and wait before popping up to fire again.
          this.state = State.HIDING;
          this.t = 0;
          this.hideTime = e.hideMin + Math.random() * (e.hideMax - e.hideMin);
          this._resetColor();
        }
        break;

      case State.HIDING:
        if (this.t >= this.hideTime) {
          this.state = State.RISING;
          this.t = 0;
        }
        break;

      case State.DYING:
        // Fall over and sink while shrinking.
        this.root.rotation.x = Math.min(Math.PI / 2, this.t * 6);
        this._setEmerge(1 - this.t / 0.4);
        if (this.t >= 0.4) this._finish();
        break;
    }
  }

  _fire() {
    this.hasFired = true;
    this.flash.isVisible = true;
    this.manager.onEnemyFire(this);
  }

  // Restore the base colour after a fire cycle so the next aim re-telegraphs.
  _resetColor() {
    this.bodyMat.diffuseColor = B.Color3.FromHexString(this.spec.color || "#3a6ea5");
    this.bodyMat.emissiveColor = new B.Color3(0, 0, 0);
  }

  // World-space position of the gun muzzle, used as a projectile's origin.
  muzzleWorld() {
    return this.flash.getAbsolutePosition();
  }

  // Called by the shooting code when this enemy is hit by the player.
  kill(quick) {
    if (this.state === State.DYING || this.state === State.DONE) return false;
    const wasAiming = this.state === State.AIMING || this.state === State.RISING;
    this.state = State.DYING;
    this.t = 0;
    this.bodyMat.emissiveColor = new B.Color3(0.6, 0.05, 0.05);
    this.manager.onKill(this, quick && wasAiming);
    return true;
  }

  _finish() {
    this.state = State.DONE;
    this.dispose();
  }

  get done() {
    return this.state === State.DONE;
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.root.dispose(false, true);
  }
}

// Owns the live set of enemies and drives a per-waypoint spawn schedule.
export class EnemyManager {
  constructor(scene, { onProjectile, onScore }) {
    this.scene = scene;
    this.onProjectile = onProjectile;
    this.onScore = onScore;
    this.enemies = [];
    this.pending = []; // queued spawns: { delay, spec }
    this.waveElapsed = 0;
    this.spawnedAll = false;
  }

  // Begin a wave from a list of spawn descriptors with individual delays.
  startWave(specs) {
    this.clear();
    this.pending = specs
      .map((s) => ({ ...s }))
      .sort((a, b) => (a.delay || 0) - (b.delay || 0));
    this.waveElapsed = 0;
    this.spawnedAll = this.pending.length === 0;
  }

  clear() {
    for (const e of this.enemies) e.dispose();
    this.enemies = [];
    this.pending = [];
    this.spawnedAll = true;
  }

  update(dt) {
    this.waveElapsed += dt;

    // Release any spawns whose delay has elapsed.
    while (this.pending.length && this.pending[0].delay <= this.waveElapsed) {
      const spec = this.pending.shift();
      this.enemies.push(new Enemy(this.scene, this, spec));
    }
    if (!this.pending.length) this.spawnedAll = true;

    for (const e of this.enemies) e.update(dt);
    this.enemies = this.enemies.filter((e) => !e.done);
  }

  onEnemyFire(enemy) {
    // The shot is now a visible projectile; the Game applies damage on impact.
    if (this.onProjectile) this.onProjectile(enemy);
  }

  onKill(enemy, quick) {
    let points = CONFIG.combat.pointsPerKill;
    if (quick) points += CONFIG.combat.accuracyBonus;
    if (this.onScore) this.onScore(points, enemy);
  }

  // The wave is over once every queued enemy has spawned and resolved.
  get resolved() {
    return this.spawnedAll && this.enemies.length === 0;
  }
}
