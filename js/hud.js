// Thin wrapper over the DOM overlay. The game pushes state in; no game logic
// lives here. Keeping it DOM-based avoids pulling in Babylon's GUI package, so
// Babylon core stays the only dependency.
export class Hud {
  constructor() {
    this.el = {
      hud: document.getElementById("hud"),
      location: document.getElementById("location"),
      score: document.getElementById("score"),
      health: document.getElementById("health"),
      foes: document.getElementById("foes"),
      bullets: document.getElementById("bullets"),
      crosshair: document.getElementById("crosshair"),
      reloadHint: document.getElementById("reloadHint"),
      cover: document.getElementById("cover"),
      coverBadge: document.getElementById("coverBadge"),
      fade: document.getElementById("fade"),
      overlay: document.getElementById("overlay"),
      overlayTitle: document.getElementById("overlayTitle"),
      overlayText: document.getElementById("overlayText"),
      startButton: document.getElementById("startButton"),
      rotateNotice: document.getElementById("rotateNotice"),
    };
    this._builtHealth = -1;
    this._builtMag = -1;
    this._foeCount = -1;
  }

  showGame(show) {
    this.el.hud.classList.toggle("hidden", !show);
    this.el.crosshair.classList.toggle("hidden", !show);
  }

  setLocation(name) {
    this.el.location.textContent = name;
  }

  setScore(score) {
    this.el.score.textContent = String(score).padStart(5, "0");
  }

  setHealth(health, max) {
    if (this._builtHealth !== max) {
      this.el.health.innerHTML = "";
      this._hearts = [];
      for (let i = 0; i < max; i++) {
        const h = document.createElement("div");
        h.className = "heart";
        this.el.health.appendChild(h);
        this._hearts.push(h);
      }
      this._builtHealth = max;
    }
    this._hearts.forEach((h, i) => h.classList.toggle("empty", i >= health));
  }

  // Bullet icons: one slot per magazine round; spent rounds dim out.
  setAmmo(ammo, max) {
    if (this._builtMag !== max) {
      this.el.bullets.innerHTML = "";
      this._bullets = [];
      for (let i = 0; i < max; i++) {
        const b = document.createElement("div");
        b.className = "bullet";
        this.el.bullets.appendChild(b);
        this._bullets.push(b);
      }
      this._builtMag = max;
    }
    this._bullets.forEach((b, i) => b.classList.toggle("spent", i >= ammo));
  }

  // Enemy icons: one silhouette per enemy still left to shoot in the wave.
  setEnemies(remaining) {
    if (this._foeCount === remaining) return;
    this._foeCount = remaining;
    this.el.foes.innerHTML = "";
    for (let i = 0; i < remaining; i++) {
      const f = document.createElement("div");
      f.className = "foe";
      this.el.foes.appendChild(f);
    }
  }

  setDucking(on) {
    this.el.hud.classList.toggle("ducking", on);
    this.el.cover.classList.toggle("on", on);
    this.el.coverBadge.classList.toggle("on", on);
  }

  aim(x, y) {
    this.el.crosshair.style.left = x + "px";
    this.el.crosshair.style.top = y + "px";
  }

  fireKick() {
    const c = this.el.crosshair;
    c.classList.remove("fire");
    // Force reflow so the animation restarts on rapid fire.
    void c.offsetWidth;
    c.classList.add("fire");
  }

  hideReloadHint() {
    this.el.reloadHint.classList.add("fade");
  }

  // Fade to black, run `mid` at full black, then fade back. Returns a promise.
  fade(mid, holdMs = 250) {
    return new Promise((resolve) => {
      const f = this.el.fade;
      f.classList.add("on");
      setTimeout(async () => {
        if (mid) await mid();
        setTimeout(() => {
          f.classList.remove("on");
          setTimeout(resolve, 500);
        }, holdMs);
      }, 520);
    });
  }

  showOverlay(title, html, buttonLabel = "START") {
    this.el.overlayTitle.textContent = title;
    this.el.overlayText.innerHTML = html;
    this.el.startButton.textContent = buttonLabel;
    this.el.overlay.classList.remove("hidden");
  }

  hideOverlay() {
    this.el.overlay.classList.add("hidden");
  }

  onStart(fn) {
    this.el.startButton.addEventListener("click", fn);
  }
}
