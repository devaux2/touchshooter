# Rail Strike

A landscape light-gun rail shooter built with [Babylon.js](https://www.babylonjs.com/),
in the spirit of *Time Crisis* and *House of the Dead*. The camera rails through a
series of 3D locations; you tap to shoot and duck for cover to reload.

It is intentionally tiny: **Babylon.js is the only runtime dependency** (loaded
from the CDN), there is no build step, and every model is a placeholder built
from primitive meshes. Open `index.html` and play.

## Controls

| Action | Gesture |
| --- | --- |
| **Shoot** | Tap / click anywhere on the screen |
| **Duck & reload** | Double-tap and **hold** — you are safe from fire and your magazine refills while held; release to stand back up |
| **Aim** | The crosshair follows your finger / pointer |

The first tap of a double-tap still fires (arcade feel — shoot, then duck), and
the quick second press-and-hold is what drops you into cover.

## How it plays

- The camera travels on rails between **cover points** (waypoints) inside each location.
- On arrival, a **wave** of enemies emerges from cover, takes aim (they flash red
  as a telegraph), and fires. Shoot them before they shoot you.
- Clear a wave to advance to the next cover point; clear a location to move on to
  the next one. Three locations ship by default: **Desert Canyon**, **Harbor
  Docks** and **Ruined Plaza**.
- Take five hits and you're down. Duck at the right moment to avoid fire entirely.

## Powerups

**Weapons** are dropped by enemies (a per-wave chance) and **auto-equip** the
instant they drop. Each has its own fixed ammo and reverts to your pistol once
spent (Time Crisis style):

- **Machine gun** — rapid auto-fire (hold to spray)
- **Rocket launcher** — explosive splash damage
- **Plasma grenades** — a larger plasma blast
- **Lightning** — hits a target and chains to nearby enemies
- **Rail gun** — a piercing beam that kills everything in line

**Bubbles** drift across the lane and trigger an effect when you **shoot/tap**
them:

- **Anti-gravity** — all enemies float helplessly upward for a few seconds
- **Time slow** — enemies and their shots slow down; you fire and reload at full speed
- **Meteor strike** — a fireball drops and wipes out every enemy on screen

## Running it

No tooling required — it is a static site. Because it uses ES modules, serve the
folder over HTTP rather than opening the file directly:

```bash
# any static server works, e.g.
python3 -m http.server 8080
# then open http://localhost:8080
```

Play in **landscape**; on a phone you'll be prompted to rotate.

## Project layout

```
index.html        # canvas, HUD overlay, loads Babylon from the CDN
css/style.css     # HUD, crosshair, menus
js/
  main.js         # bootstrap + orientation hint
  game.js         # engine, scene, camera rail, level flow
  levels.js       # location/waypoint data + placeholder scenery builder
  enemies.js      # enemy state machine + spawn manager
  player.js       # health / ammo / duck-reload logic
  input.js        # tap-to-shoot and double-tap-hold-to-duck gestures
  hud.js          # DOM HUD controller
  config.js       # all gameplay tuning values
```

## Extending it

- **New locations** — add an entry to `LOCATIONS` in `js/levels.js` with its
  `stages` (camera vantage points, cover props and enemy spawns).
- **Real art** — swap the primitive `MeshBuilder` calls in `js/enemies.js` and
  `js/levels.js` for imported `.glb` meshes via `BABYLON.SceneLoader`.
- **Feel** — every timing and balance value lives in `js/config.js`.
