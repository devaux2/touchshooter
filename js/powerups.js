import { CONFIG } from "./config.js";

const B = window.BABYLON;

// The three tap-to-activate bubble effects. (Weapon drops auto-equip on the
// kill that drops them and are handled by the Game, not here.)
const BUBBLES = {
  antigrav: { color: "#9a6bff", label: "ANTI-GRAV" },
  timeslow: { color: "#4ad0ff", label: "TIME SLOW" },
  meteor: { color: "#ff5a2a", label: "METEOR" },
};
const BUBBLE_KEYS = Object.keys(BUBBLES);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Owns the floating effect bubbles: their meshes, the bob/spin/drift animation,
// lifetimes, and the random spawn timer. Tapping a bubble triggers its effect
// via the callback supplied by the Game.
export class PowerupManager {
  constructor(scene, { onActivateEffect }) {
    this.scene = scene;
    this.onActivateEffect = onActivateEffect;
    this.items = [];
    this.bubbleTimer = this._nextBubbleGap();
  }

  _nextBubbleGap() {
    const p = CONFIG.powerups;
    return p.bubbleMinGap + Math.random() * (p.bubbleMaxGap - p.bubbleMinGap);
  }

  clear() {
    for (const it of this.items) it.mesh.dispose();
    this.items = [];
    this.bubbleTimer = this._nextBubbleGap();
  }

  // A bubble drifts slowly across the lane; tap it to trigger its effect.
  spawnBubble() {
    const key = pick(BUBBLE_KEYS);
    const info = BUBBLES[key];
    const scene = this.scene;

    const mesh = B.MeshBuilder.CreateSphere("bubble", { diameter: 1.5, segments: 12 }, scene);
    const mat = new B.StandardMaterial("bubbleMat", scene);
    mat.emissiveColor = B.Color3.FromHexString(info.color);
    mat.alpha = 0.55;
    mat.disableLighting = true;
    mesh.material = mat;
    mesh.isPickable = true;
    mesh.metadata = { pickup: { kind: "bubble", key } };

    // A bright core so it reads as a collectible orb.
    const core = B.MeshBuilder.CreateSphere("core", { diameter: 0.6, segments: 8 }, scene);
    const cmat = new B.StandardMaterial("coreMat", scene);
    cmat.emissiveColor = B.Color3.FromHexString(info.color);
    cmat.disableLighting = true;
    core.material = cmat;
    core.isPickable = false;
    core.parent = mesh;

    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -13 : 13;
    const z = 13 + Math.random() * 12;
    const base = 2.4;
    mesh.position.set(x, base, z);

    this.items.push({
      mesh,
      base,
      t: 0,
      life: CONFIG.powerups.pickupLife + 3,
      spin: 0.6,
      drift: (fromLeft ? 1 : -1) * 1.6, // glide across the lane
    });
  }

  // Tap a bubble to trigger its effect (its metadata.pickup holds the key).
  collect(mesh) {
    const data = mesh.metadata && mesh.metadata.pickup;
    if (!data) return false;
    const idx = this.items.findIndex((it) => it.mesh === mesh);
    if (idx >= 0) {
      this.items[idx].mesh.dispose();
      this.items.splice(idx, 1);
    }
    if (this.onActivateEffect) this.onActivateEffect(data.key);
    return true;
  }

  // Animate pickups and, while `canSpawn`, run the bubble spawn timer.
  update(dt, canSpawn) {
    for (const it of this.items) {
      it.t += dt;
      it.mesh.rotation.y += it.spin * dt;
      it.mesh.position.x += it.drift * dt;
      it.mesh.position.y = it.base + Math.sin(it.t * 2.5) * 0.18;
      // Fade out over the final second of life.
      const remain = it.life - it.t;
      if (remain < 1 && it.mesh.material) {
        it.mesh.visibility = Math.max(0, remain);
      }
      it.dead = it.t >= it.life || Math.abs(it.mesh.position.x) > 16;
    }
    for (const it of this.items) if (it.dead) it.mesh.dispose();
    this.items = this.items.filter((it) => !it.dead);

    if (canSpawn) {
      this.bubbleTimer -= dt;
      if (this.bubbleTimer <= 0) {
        this.spawnBubble();
        this.bubbleTimer = this._nextBubbleGap();
      }
    }
  }
}
