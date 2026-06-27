const B = window.BABYLON;

// ---------------------------------------------------------------------------
// Rail-shooter locations.
//
// The camera rides a rail forward through each location, stopping at a few
// vantage points (`stages`). On arrival a wave of enemies pops up AHEAD in the
// open, fully visible. The level is a clean "corridor": framing walls sit out
// at the sides (|x| ~ 17) and a backdrop closes the far end, but the central
// firing lanes are kept clear — nothing stands between you and the enemies, so
// nothing can hide them or be shot through. Only low cover (crates, barrels)
// sits near the enemies for them to pop up behind.
//
// Convention: the rail runs along +z. Stage cameras look forward; their enemies
// spawn a bit further down the lane, spread across x.
// ---------------------------------------------------------------------------

export const LOCATIONS = [
  {
    name: "Canyon Approach",
    sky: "#aebfce",
    fog: "#cdba93",
    fogDensity: 0.009,
    floor: "#c3a368",
    wall: "#9b7846",
    accent: "#7c5d34",
    enemyColor: "#8a3a22",
    stages: [
      {
        camera: { pos: [0, 1.7, 0], look: [0, 1.5, 22] },
        cover: [
          { type: "crate", pos: [-6, 15], s: 1.1 },
          { type: "barrel", pos: [6, 17], s: 1 },
          { type: "crate", pos: [0, 20], s: 1.1 },
        ],
        enemies: [
          { pos: [-6, 15], delay: 0.5 },
          { pos: [6, 17], delay: 1.4 },
          { pos: [0, 20], delay: 2.4 },
        ],
      },
      {
        camera: { pos: [3, 1.7, 18], look: [3, 1.5, 40] },
        cover: [
          { type: "crate", pos: [-3, 33], s: 1.1 },
          { type: "barrel", pos: [8, 35], s: 1 },
          { type: "crate", pos: [3, 38], s: 1.1 },
        ],
        enemies: [
          { pos: [-3, 33], delay: 0.4 },
          { pos: [8, 35], delay: 1.1 },
          { pos: [3, 38], delay: 1.9 },
          { pos: [-7, 40], delay: 2.7 },
        ],
      },
      {
        camera: { pos: [-3, 1.7, 36], look: [-3, 1.5, 58] },
        cover: [
          { type: "crate", pos: [-8, 51], s: 1.1 },
          { type: "barrel", pos: [0, 53], s: 1 },
          { type: "crate", pos: [6, 52], s: 1.1 },
          { type: "barrel", pos: [-3, 56], s: 1 },
        ],
        enemies: [
          { pos: [-8, 51], delay: 0.4 },
          { pos: [6, 52], delay: 1.0 },
          { pos: [0, 53], delay: 1.7 },
          { pos: [-3, 56], delay: 2.4 },
          { pos: [4, 58], delay: 3.1 },
        ],
      },
    ],
  },

  {
    name: "Dock Row",
    sky: "#8197a7",
    fog: "#8ba1af",
    fogDensity: 0.011,
    floor: "#586671",
    wall: "#3f535f",
    accent: "#6b4034",
    enemyColor: "#cf7a2c",
    stages: [
      {
        camera: { pos: [0, 1.7, 0], look: [0, 1.5, 22] },
        cover: [
          { type: "crate", pos: [-5, 14], s: 1.2 },
          { type: "crate", pos: [5, 16], s: 1.2 },
          { type: "barrel", pos: [0, 19], s: 1 },
        ],
        enemies: [
          { pos: [-5, 14], delay: 0.4 },
          { pos: [5, 16], delay: 1.1 },
          { pos: [0, 19], delay: 1.9 },
          { pos: [-8, 21], delay: 2.7 },
        ],
      },
      {
        camera: { pos: [-4, 1.7, 18], look: [-4, 1.5, 40] },
        cover: [
          { type: "crate", pos: [-8, 33], s: 1.2 },
          { type: "barrel", pos: [-1, 35], s: 1 },
          { type: "crate", pos: [4, 37], s: 1.2 },
        ],
        enemies: [
          { pos: [-8, 33], delay: 0.4 },
          { pos: [4, 37], delay: 1.0 },
          { pos: [-1, 35], delay: 1.7 },
          { pos: [-5, 39], delay: 2.4 },
          { pos: [2, 41], delay: 3.1 },
        ],
      },
      {
        camera: { pos: [2, 1.7, 36], look: [2, 1.5, 58] },
        cover: [
          { type: "crate", pos: [-4, 51], s: 1.2 },
          { type: "barrel", pos: [3, 52], s: 1 },
          { type: "crate", pos: [8, 54], s: 1.2 },
          { type: "barrel", pos: [0, 56], s: 1 },
        ],
        enemies: [
          { pos: [-4, 51], delay: 0.3 },
          { pos: [8, 54], delay: 0.9 },
          { pos: [3, 52], delay: 1.5 },
          { pos: [-6, 55], delay: 2.2 },
          { pos: [0, 56], delay: 2.9 },
          { pos: [5, 58], delay: 3.6 },
        ],
      },
    ],
  },

  {
    name: "Old Plaza",
    sky: "#4a4759",
    fog: "#5a5366",
    fogDensity: 0.013,
    floor: "#47424f",
    wall: "#332f3d",
    accent: "#5a3550",
    enemyColor: "#c24fa0",
    stages: [
      {
        camera: { pos: [0, 1.7, 0], look: [0, 1.5, 22] },
        cover: [
          { type: "crate", pos: [-6, 14], s: 1.1 },
          { type: "barrel", pos: [6, 15], s: 1 },
          { type: "crate", pos: [0, 18], s: 1.1 },
        ],
        enemies: [
          { pos: [-6, 14], delay: 0.3 },
          { pos: [6, 15], delay: 0.9 },
          { pos: [0, 18], delay: 1.6 },
          { pos: [-3, 21], delay: 2.3 },
          { pos: [4, 22], delay: 3.0 },
        ],
      },
      {
        camera: { pos: [3, 1.7, 18], look: [3, 1.5, 40] },
        cover: [
          { type: "crate", pos: [-2, 33], s: 1.1 },
          { type: "barrel", pos: [8, 34], s: 1 },
          { type: "crate", pos: [3, 37], s: 1.1 },
          { type: "barrel", pos: [-6, 39], s: 1 },
        ],
        enemies: [
          { pos: [-2, 33], delay: 0.3 },
          { pos: [8, 34], delay: 0.8 },
          { pos: [3, 37], delay: 1.4 },
          { pos: [-6, 39], delay: 2.0 },
          { pos: [0, 41], delay: 2.7 },
          { pos: [6, 42], delay: 3.4 },
        ],
      },
      {
        camera: { pos: [-3, 1.7, 36], look: [-3, 1.5, 58] },
        cover: [
          { type: "crate", pos: [-8, 50], s: 1.1 },
          { type: "barrel", pos: [-1, 52], s: 1 },
          { type: "crate", pos: [5, 51], s: 1.1 },
          { type: "barrel", pos: [-4, 55], s: 1 },
          { type: "crate", pos: [2, 57], s: 1.1 },
        ],
        enemies: [
          { pos: [-8, 50], delay: 0.3 },
          { pos: [5, 51], delay: 0.8 },
          { pos: [-1, 52], delay: 1.3 },
          { pos: [-4, 55], delay: 1.9 },
          { pos: [2, 57], delay: 2.5 },
          { pos: [-6, 58], delay: 3.2 },
          { pos: [6, 59], delay: 3.9 },
        ],
      },
    ],
  },
];

// localStorage key the map editor writes to. When present, the game plays the
// editor's levels instead of the shipped ones — but only in that browser, so
// the editor stays a private iteration tool (it isn't linked from the menu).
export const LEVELS_KEY = "touchshooter.levels";

// The committed level file the game ships. Editing the live game for everyone =
// replace this file (Export from the editor) and commit it.
export const LEVELS_URL = "assets/levels.json";

const validLevels = (d) => Array.isArray(d) && d.length && d.every((l) => l && l.stages);

// Filled in by prefetchLevels(): the shipped assets/levels.json, once loaded.
let shipped = null;

// Load the committed level file once at startup. Safe to call repeatedly; failures
// (e.g. file missing / offline) just leave the built-in LOCATIONS as the fallback.
export async function prefetchLevels(url = LEVELS_URL) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (validLevels(data)) shipped = data;
    }
  } catch (e) {
    /* keep built-in fallback */
  }
  return shipped;
}

// The levels the game should play, in priority order:
//   1. an editor override saved in THIS browser (local iteration),
//   2. the shipped assets/levels.json (what everyone plays),
//   3. the built-in LOCATIONS (last-resort fallback).
export function getLocations() {
  try {
    const raw = localStorage.getItem(LEVELS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (validLevels(data)) return data;
    }
  } catch (e) {
    /* ignore malformed override */
  }
  return shipped || LOCATIONS;
}

// Build a location's static geometry under one node (disposed when leaving).
export function buildLocation(scene, loc) {
  const root = new B.TransformNode("location:" + loc.name, scene);

  const mkMat = (name, hex, spec = 0.02) => {
    const m = new B.StandardMaterial(name, scene);
    m.diffuseColor = B.Color3.FromHexString(hex);
    m.specularColor = new B.Color3(spec, spec, spec);
    return m;
  };
  const floorMat = mkMat("floor", loc.floor);
  const wallMat = mkMat("wall", loc.wall);
  const accentMat = mkMat("accent", loc.accent);

  const add = (mesh, mat, pickable = false) => {
    mesh.material = mat;
    mesh.isPickable = pickable;
    mesh.parent = root;
    return mesh;
  };

  // Long floor running the length of the corridor.
  const floor = B.MeshBuilder.CreateGround("floor", { width: 90, height: 150 }, scene);
  floor.position.z = 55;
  add(floor, floorMat, true);

  // Side framing walls, set well outside the firing lanes so they never hide a
  // target. Pickable so stray shots leave a mark instead of vanishing.
  for (const sx of [-17, 17]) {
    const wall = B.MeshBuilder.CreateBox("wall", { width: 4, height: 10, depth: 150 }, scene);
    wall.position.set(sx, 5, 55);
    add(wall, wallMat, true);

    // A run of accent blocks along the top of each wall for some character.
    for (let i = 0; i < 9; i++) {
      const z = -8 + i * 16;
      const cap = B.MeshBuilder.CreateBox(
        "wallCap",
        { width: 4.5, height: 3 + ((i % 3) * 1.5), depth: 8 },
        scene
      );
      cap.position.set(sx, 10, z);
      add(cap, accentMat);
    }
  }

  // Backdrop closing the far end.
  const back = B.MeshBuilder.CreateBox("back", { width: 90, height: 28, depth: 3 }, scene);
  back.position.set(0, 10, 80);
  add(back, wallMat, true);

  // Low cover the enemies pop up behind — placed at the enemy lanes, kept low so
  // the figures are clearly visible above it.
  for (const stage of loc.stages) {
    for (const c of stage.cover) {
      let mesh;
      // Sit the cover ~1 unit toward the camera so the figure rises behind it.
      const cz = c.pos[1] - 1.0;
      if (c.type === "barrel") {
        mesh = B.MeshBuilder.CreateCylinder(
          "barrel",
          { height: 1.3 * c.s, diameter: 1.0 * c.s, tessellation: 10 },
          scene
        );
        mesh.position.set(c.pos[0], 0.65 * c.s, cz);
      } else {
        mesh = B.MeshBuilder.CreateBox("crate", { size: 1.3 * c.s }, scene);
        mesh.position.set(c.pos[0], 0.65 * c.s, cz);
      }
      // Non-pickable: player shots pass through low cover to reach the enemy, so
      // aiming anywhere on a partly-exposed figure still registers a hit.
      add(mesh, accentMat, false);
    }
  }

  return { root };
}
