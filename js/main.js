import { Game } from "./game.js";

// Entry point: wait for Babylon (loaded from the CDN as a global), spin up the
// engine, and wire the portrait/landscape hint.
function boot() {
  if (!window.BABYLON) {
    document.getElementById("overlayText").textContent =
      "Could not load Babylon.js. Check your network connection and reload.";
    return;
  }

  const canvas = document.getElementById("renderCanvas");
  // eslint-disable-next-line no-new
  window.game = new Game(canvas);

  // Landscape is the intended orientation for this rail shooter.
  const notice = document.getElementById("rotateNotice");
  const checkOrientation = () => {
    const portrait = window.innerHeight > window.innerWidth;
    notice.classList.toggle("show", portrait && Math.min(window.innerWidth, window.innerHeight) < 900);
  };
  window.addEventListener("resize", checkOrientation);
  window.addEventListener("orientationchange", checkOrientation);
  checkOrientation();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
