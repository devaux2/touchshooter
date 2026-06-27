import { CONFIG } from "./config.js";
import { Player } from "./player.js";
import { EnemyManager } from "./enemies.js";
import { InputManager } from "./input.js";
import { Hud } from "./hud.js";
import { LOCATIONS, buildLocation } from "./levels.js";

const B = window.BABYLON;

const lerp = (a, b, t) => a + (b - a) * t;
// Smootherstep for pleasant camera easing.
const ease = (t) => t * t * (3 - 2 * t);

const State = {
  MENU: "menu",
  TRAVELING: "traveling",
  COMBAT: "combat",
  TRANSITION: "transition",
  GAMEOVER: "gameover",
  WIN: "win",
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = new B.Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: false,
      adaptToDeviceRatio: true,
    });

    this.scene = new B.Scene(this.engine);
    this.scene.fogMode = B.Scene.FOGMODE_EXP2;

    this.player = new Player();
    this.hud = new Hud();
    this.enemies = new EnemyManager(this.scene, {
      onProjectile: (enemy) => this._spawnIncoming(enemy),
      onScore: (pts) => this._addScore(pts),
    });

    // Live in-flight enemy shots heading toward the player.
    this.incoming = [];

    this.input = new InputManager(canvas, {
      onFire: (x, y) => this._fire(x, y),
      onDuckStart: () => this._duck(true),
      onDuckEnd: () => this._duck(false),
      onAim: (x, y) => this.hud.aim(x, y),
    });

    this.state = State.MENU;
    this.score = 0;
    this.locIndex = 0;
    this.stageIndex = 0;
    this.locationRoot = null;

    // Camera travel + duck animation state.
    this.camPos = new B.Vector3(0, 1.7, -2);
    this.camLook = new B.Vector3(0, 1.6, 24);
    this.travel = null;
    this.duckOffset = 0;
    this.duckTarget = 0;
    this.clearTimer = 0;

    this._setupScene();
    this._buildHurtFlash();

    this.hud.onStart(() => this.start());
    window.addEventListener("resize", () => this.engine.resize());
    window.addEventListener("orientationchange", () =>
      setTimeout(() => this.engine.resize(), 150)
    );
    // Mobile browsers shrink/grow the visible area as the URL bar hides; keep
    // the render buffer in sync with the actual visible viewport.
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => this.engine.resize());
    }

    this.engine.runRenderLoop(() => this._frame());
  }

  _setupScene() {
    const scene = this.scene;

    this.camera = new B.UniversalCamera("cam", this.camPos.clone(), scene);
    this.camera.fov = CONFIG.camera.fov;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 400;
    this.camera.setTarget(this.camLook);
    // The camera is fully scripted — never let pointer/keys move it.
    this.camera.inputs.clear();

    const hemi = new B.HemisphericLight("hemi", new B.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.85;
    hemi.groundColor = new B.Color3(0.3, 0.3, 0.35);

    const sun = new B.DirectionalLight("sun", new B.Vector3(-0.4, -1, 0.6), scene);
    sun.intensity = 0.7;
    this.sun = sun;
  }

  // A red vignette element for taking damage, created in code so the HTML stays
  // minimal.
  _buildHurtFlash() {
    const el = document.createElement("div");
    el.id = "hurt";
    el.style.cssText =
      "position:absolute;inset:0;z-index:8;pointer-events:none;opacity:0;" +
      "transition:opacity .3s;box-shadow:inset 0 0 160px 40px rgba(220,30,20,.9);";
    document.body.appendChild(el);
    this.hurtEl = el;
  }

  _hurtFlash() {
    this.hurtEl.style.opacity = "1";
    setTimeout(() => (this.hurtEl.style.opacity = "0"), 120);
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  start() {
    this._goFullscreen();
    this.hud.hideOverlay();
    this.hud.showGame(true);
    this._clearIncoming();
    this.player.reset();
    this.score = 0;
    this.locIndex = 0;
    this.stageIndex = 0;
    this._addScore(0);
    this._refreshHud();
    this.input.setEnabled(true);

    this._loadLocation(0);
    this._snapCameraToStage(0);
    this._goToStage(0);
    setTimeout(() => this.hud.hideReloadHint(), 6000);
  }

  _loadLocation(index) {
    if (this.locationRoot) {
      this.locationRoot.dispose(false, true);
      this.locationRoot = null;
    }
    const loc = LOCATIONS[index];
    this.location = loc;

    const built = buildLocation(this.scene, loc);
    this.locationRoot = built.root;

    this.scene.clearColor = B.Color4.FromHexString(loc.sky + "ff");
    this.scene.fogColor = B.Color3.FromHexString(loc.fog);
    this.scene.fogDensity = loc.fogDensity;

    this.hud.setLocation(loc.name);
  }

  _snapCameraToStage(stageIndex) {
    const cam = this.location.stages[stageIndex].camera;
    this.camPos.set(cam.pos[0], cam.pos[1], cam.pos[2]);
    this.camLook.set(cam.look[0], cam.look[1], cam.look[2]);
    this.travel = null;
  }

  // Slide the camera to a stage's vantage point, then run `onArrive`.
  _travelTo(camDef, onArrive) {
    this.travel = {
      fromPos: this.camPos.clone(),
      toPos: new B.Vector3(camDef.pos[0], camDef.pos[1], camDef.pos[2]),
      fromLook: this.camLook.clone(),
      toLook: new B.Vector3(camDef.look[0], camDef.look[1], camDef.look[2]),
      t: 0,
      onArrive,
    };
    this.state = State.TRAVELING;
  }

  _goToStage(stageIndex) {
    this.stageIndex = stageIndex;
    this.clearTimer = 0;
    const stage = this.location.stages[stageIndex];
    this._travelTo(stage.camera, () => this._startCombat(stageIndex));
  }

  _startCombat(stageIndex) {
    const stage = this.location.stages[stageIndex];
    const specs = stage.enemies.map((e) => ({
      position: new B.Vector3(e.pos[0], 0, e.pos[1]),
      delay: e.delay || 0,
      color: e.color || this.location.enemyColor,
    }));
    this.enemies.startWave(specs);
    this.clearTimer = 0;
    this.state = State.COMBAT;
  }

  _advance() {
    const stages = this.location.stages;
    if (this.stageIndex + 1 < stages.length) {
      this._goToStage(this.stageIndex + 1);
    } else if (this.locIndex + 1 < LOCATIONS.length) {
      this._nextLocation();
    } else {
      this._win();
    }
  }

  _nextLocation() {
    this.state = State.TRANSITION;
    this.enemies.clear();
    this._clearIncoming();
    const next = this.locIndex + 1;
    this.hud.fade(async () => {
      this.locIndex = next;
      this._loadLocation(next);
      this._snapCameraToStage(0);
    }).then(() => {
      if (this.state === State.TRANSITION) this._goToStage(0);
    });
  }

  _win() {
    this.state = State.WIN;
    this.input.setEnabled(false);
    this.enemies.clear();
    this._clearIncoming();
    this.hud.showGame(false);
    this.hud.showOverlay(
      "MISSION CLEAR",
      `You cleared all sectors.<br />Final score <b>${this.score}</b>.`,
      "PLAY AGAIN"
    );
  }

  _gameOver() {
    this.state = State.GAMEOVER;
    this.input.setEnabled(false);
    this.enemies.clear();
    this._clearIncoming();
    this.hud.setDucking(false);
    this.hud.showGame(false);
    this.hud.showOverlay(
      "DOWN",
      `You were overrun in ${this.location.name}.<br />Score <b>${this.score}</b>.`,
      "RETRY"
    );
  }

  // -------------------------------------------------------------------------
  // Combat interactions
  // -------------------------------------------------------------------------
  _fire(clientX, clientY) {
    if (this.state !== State.COMBAT) return;
    if (!this.player.canFire()) {
      // Out of ammo: nudge the player to reload.
      if (this.player.empty) this.hud.fireKick();
      return;
    }
    this.player.consumeRound();
    this.hud.setAmmo(this.player.ammo, this.player.magazine);
    this.hud.fireKick();

    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const pick = this.scene.pick(x, y);

    // Work out where the shot lands so we can draw a visible tracer + spark.
    const cam = this.camera;
    const fwd = cam.getDirection(B.Axis.Z);
    const right = cam.getDirection(B.Axis.X);
    const muzzle = cam.position
      .add(fwd.scale(0.6))
      .add(right.scale(0.22))
      .add(new B.Vector3(0, -0.28, 0));

    let end;
    if (pick && pick.hit && pick.pickedPoint) {
      end = pick.pickedPoint;
    } else {
      const ray = this.scene.createPickingRay(x, y, B.Matrix.Identity(), cam);
      end = ray.origin.add(ray.direction.scale(80));
    }
    this._spawnTracer(muzzle, end);
    if (pick && pick.hit) this._spawnImpact(end);

    if (pick && pick.hit && pick.pickedMesh) {
      const enemy = pick.pickedMesh.metadata && pick.pickedMesh.metadata.enemy;
      if (enemy) enemy.kill(true);
    }
  }

  _duck(on) {
    if (!this.player.alive) return;
    if (on) this.player.startDuck();
    else this.player.endDuck();
    this.duckTarget = on ? -CONFIG.camera.duckDrop : 0;
    this.hud.setDucking(on);
  }

  _onPlayerHit(dmg) {
    if (this.player.takeDamage(dmg)) {
      this._hurtFlash();
      this.hud.setHealth(this.player.health, this.player.maxHealth);
      if (!this.player.alive) this._gameOver();
    }
  }

  _addScore(pts) {
    this.score += pts;
    this.hud.setScore(this.score);
  }

  _refreshHud() {
    this.hud.setHealth(this.player.health, this.player.maxHealth);
    this.hud.setAmmo(this.player.ammo, this.player.magazine);
    this.hud.setScore(this.score);
    this.hud.setEnemies(0);
  }

  // Ask the browser for real fullscreen + landscape. Best-effort: iOS Safari on
  // iPhone supports neither, so failures are swallowed.
  _goFullscreen() {
    const el = document.documentElement;
    const req =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.msRequestFullscreen;
    if (req) {
      try {
        const p = req.call(el);
        if (p && p.catch) p.catch(() => {});
      } catch (e) {
        /* ignore */
      }
    }
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }
  }

  // -------------------------------------------------------------------------
  // Projectiles & shot effects
  // -------------------------------------------------------------------------

  // An enemy fired: launch a bright, visible round toward the player's standing
  // eye line. Ducking drops the camera below that line, so the shot sails over.
  _spawnIncoming(enemy) {
    if (!this.player.alive) return;
    const scene = this.scene;
    const mesh = B.MeshBuilder.CreateSphere("shot", { diameter: 0.28, segments: 8 }, scene);
    const mat = new B.StandardMaterial("shotMat", scene);
    mat.emissiveColor = new B.Color3(1, 0.75, 0.1);
    mat.diffuseColor = new B.Color3(1, 0.6, 0);
    mat.disableLighting = true;
    mesh.material = mat;
    mesh.isPickable = false;

    const start = enemy.muzzleWorld().clone();
    // Aim at the standing eye position (not the ducked camera) with slight spread.
    const target = new B.Vector3(
      this.camPos.x + (Math.sin(performance.now() * 0.013) * 0.5),
      this.camPos.y,
      this.camPos.z
    );
    mesh.position.copyFrom(start);

    this.incoming.push({ mesh, start, target, t: 0 });
  }

  _clearIncoming() {
    for (const p of this.incoming) p.mesh.dispose();
    this.incoming = [];
  }

  _updateIncoming(dt) {
    const speed = 1 / CONFIG.enemy.shotTravel;
    for (const p of this.incoming) {
      p.t += dt * speed;
      const k = Math.min(1, p.t);
      B.Vector3.LerpToRef(p.start, p.target, k, p.mesh.position);
      // Grow as it approaches so it reads as "incoming" without engulfing the view.
      const s = 0.5 + k * 1.1;
      p.mesh.scaling.set(s, s, s);
      if (p.t >= 1) {
        // Impact: the player is hit only if standing (not ducked under the line).
        if (!this.player.ducking) this._onPlayerHit(CONFIG.enemy.damage);
        p.mesh.dispose();
        p.done = true;
      }
    }
    this.incoming = this.incoming.filter((p) => !p.done);
  }

  // A short-lived bright streak from the muzzle to the hit point.
  _spawnTracer(start, end) {
    const dir = end.subtract(start);
    const dist = dir.length();
    if (dist < 0.01) return;
    const cyl = B.MeshBuilder.CreateCylinder(
      "tracer",
      { height: dist, diameter: 0.09, tessellation: 6 },
      this.scene
    );
    const mat = new B.StandardMaterial("tracerMat", this.scene);
    mat.emissiveColor = new B.Color3(1, 1, 0.8);
    mat.disableLighting = true;
    cyl.material = mat;
    cyl.isPickable = false;
    cyl.position.copyFrom(start.add(end).scale(0.5));

    const up = B.Axis.Y;
    const ndir = dir.normalize();
    const axis = B.Vector3.Cross(up, ndir);
    if (axis.lengthSquared() > 1e-6) {
      axis.normalize();
      const angle = Math.acos(Math.min(1, Math.max(-1, B.Vector3.Dot(up, ndir))));
      cyl.rotationQuaternion = B.Quaternion.RotationAxis(axis, angle);
    }
    setTimeout(() => cyl.dispose(), 100);
  }

  // A spark where a shot lands.
  _spawnImpact(point) {
    const s = B.MeshBuilder.CreateSphere("impact", { diameter: 0.6, segments: 6 }, this.scene);
    const mat = new B.StandardMaterial("impactMat", this.scene);
    mat.emissiveColor = new B.Color3(1, 0.9, 0.5);
    mat.disableLighting = true;
    s.material = mat;
    s.isPickable = false;
    s.position.copyFrom(point);
    setTimeout(() => s.dispose(), 160);
  }

  // -------------------------------------------------------------------------
  // Frame update
  // -------------------------------------------------------------------------
  _frame() {
    const dt = Math.min(0.05, this.engine.getDeltaTime() / 1000);

    this.player.update(dt);
    // Reflect reload completion and remaining enemies on the HUD.
    this.hud.setAmmo(this.player.ammo, this.player.magazine);
    this.hud.setEnemies(this.enemies.remaining);

    // Animate the duck dip toward its target every frame.
    const duckSpeed = CONFIG.camera.duckDrop / CONFIG.player.duckRiseTime;
    if (this.duckOffset < this.duckTarget) {
      this.duckOffset = Math.min(this.duckTarget, this.duckOffset + duckSpeed * dt);
    } else if (this.duckOffset > this.duckTarget) {
      this.duckOffset = Math.max(this.duckTarget, this.duckOffset - duckSpeed * dt);
    }

    if (this.state === State.TRAVELING && this.travel) {
      this._updateTravel(dt);
    } else if (this.state === State.COMBAT) {
      this.enemies.update(dt);
      this._updateIncoming(dt);
      // Advance only once enemies are clear AND no shots are still in the air.
      if (this.enemies.resolved && this.incoming.length === 0) {
        this.clearTimer += dt;
        if (this.clearTimer > 0.8) this._advance();
      } else {
        this.clearTimer = 0;
      }
    }

    this._applyCamera();
    this.scene.render();
  }

  _updateTravel(dt) {
    const tv = this.travel;
    tv.t += dt / CONFIG.camera.travelTime;
    const k = ease(Math.min(1, tv.t));
    B.Vector3.LerpToRef(tv.fromPos, tv.toPos, k, this.camPos);
    B.Vector3.LerpToRef(tv.fromLook, tv.toLook, k, this.camLook);
    if (tv.t >= 1) {
      const cb = tv.onArrive;
      this.travel = null;
      if (cb) cb();
    }
  }

  _applyCamera() {
    // A subtle idle sway gives the static vantage points some life.
    const sway = this.state === State.COMBAT ? Math.sin(performance.now() / 900) * 0.04 : 0;
    this.camera.position.set(
      this.camPos.x + sway,
      this.camPos.y + this.duckOffset,
      this.camPos.z
    );
    this._tgt = this._tgt || new B.Vector3();
    this._tgt.set(this.camLook.x, this.camLook.y + this.duckOffset * 0.6, this.camLook.z);
    this.camera.setTarget(this._tgt);
  }
}
