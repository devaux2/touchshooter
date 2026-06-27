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
      onPlayerHit: (dmg, enemy) => this._onPlayerHit(dmg, enemy),
      onScore: (pts) => this._addScore(pts),
    });

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
    this.hud.hideOverlay();
    this.hud.showGame(true);
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
    const pick = this.scene.pick(clientX - rect.left, clientY - rect.top);
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
  }

  // -------------------------------------------------------------------------
  // Frame update
  // -------------------------------------------------------------------------
  _frame() {
    const dt = Math.min(0.05, this.engine.getDeltaTime() / 1000);

    this.player.update(dt);
    // Reflect reload completion on the HUD.
    this.hud.setAmmo(this.player.ammo, this.player.magazine);

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
      if (this.enemies.resolved) {
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
