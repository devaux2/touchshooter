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
    aimTime: 1.4, // telegraph time before firing
    damage: 1,
    hitFlashTime: 0.25,
    shotTravel: 0.7, // seconds for an incoming shot to reach you (dodge window)
    hideMin: 0.6, // shortest pause in cover before popping up again, seconds
    hideMax: 1.6, // longest pause in cover before popping up again, seconds
  },

  combat: {
    pointsPerKill: 100,
    accuracyBonus: 25, // extra points for a head/quick kill
  },

  camera: {
    travelTime: 2.2, // seconds to slide between waypoints
    fov: 0.9,
    duckDrop: 2.0, // how far the view drops when ducking, world units
  },

  powerups: {
    weaponDropChance: 0.5, // chance per wave that a kill drops a weapon
    bubbleMinGap: 9, // min seconds between floating bubble spawns
    bubbleMaxGap: 16, // max seconds between floating bubble spawns
    pickupLife: 9, // seconds a floating pickup lingers before fading away
  },

  // Special weapons picked up from drops. `cooldown` overrides the fire rate
  // while held; `auto` enables hold-to-spray. Reverts to the pistol when its
  // ammo runs out.
  weapons: {
    machinegun: { name: "MACHINE GUN", color: "#ffd24a", ammo: 60, cooldown: 65, auto: true },
    rocket: { name: "ROCKET LAUNCHER", color: "#ff7a3c", ammo: 6, cooldown: 360, splash: 4.5 },
    lightning: { name: "LIGHTNING", color: "#7fd8ff", ammo: 10, cooldown: 300, chain: 3, chainRange: 8 },
    plasma: { name: "PLASMA GRENADES", color: "#8aff7a", ammo: 7, cooldown: 420, splash: 6.5 },
    railgun: { name: "RAIL GUN", color: "#d98aff", ammo: 5, cooldown: 480, pierceRadius: 1.6 },
  },

  // Tap-to-activate bubble powerups.
  effects: {
    antigravTime: 5, // enemies float up for this long
    antigravRise: 5.5, // float speed, units/sec
    timeslowTime: 10, // enemy/projectile slow-mo duration
    timeslowScale: 0.32, // enemy time multiplier while slowed
    meteorFall: 0.9, // seconds for the meteor to drop before it detonates
  },
};
