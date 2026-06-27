// Central tuning values for the whole game. Keeping them in one place makes the
// feel of the game easy to adjust without hunting through the logic modules.

export const CONFIG = {
  player: {
    maxHealth: 5,
    magazine: 9, // rounds per magazine
    reloadTime: 0.9, // seconds of ducking required for a full reload
    duckRiseTime: 0.18, // camera dip time when ducking, seconds
  },

  input: {
    doubleTapWindow: 320, // ms; a second press within this becomes a duck/hold
    fireCooldown: 90, // ms between shots to avoid double-registers
  },

  enemy: {
    riseTime: 0.5, // seconds to emerge from cover
    aimTime: 1.3, // telegraph time before firing
    damage: 1,
    hitFlashTime: 0.25,
  },

  combat: {
    pointsPerKill: 100,
    accuracyBonus: 25, // extra points for a head/quick kill
  },

  camera: {
    travelTime: 2.2, // seconds to slide between waypoints
    fov: 0.9,
    duckDrop: 1.4, // how far the view drops when ducking, world units
  },
};
