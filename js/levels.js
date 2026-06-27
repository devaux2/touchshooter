const B = window.BABYLON;

// A tiny deterministic RNG so scenery is scattered but identical every run.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Location definitions.
//
// Each location is a single 3D space the camera rails through. `stages` are the
// cover points the camera stops at; on arrival the matching enemy wave spawns.
// All positions are placeholder-friendly: boxes, cylinders and capsules only.
// ---------------------------------------------------------------------------
export const LOCATIONS = [
  {
    name: "Desert Canyon",
    ground: "#c2a268",
    fog: "#d8c49a",
    sky: "#9fb6c9",
    fogDensity: 0.012,
    seed: 11,
    palette: ["#b08652", "#8c6a3f", "#caa46d"], // scenery tints
    enemyColor: "#7a4a2a",
    decor: "rock",
    stages: [
      {
        camera: { pos: [0, 1.7, -2], look: [0, 1.6, 24] },
        cover: [
          { type: "rock", pos: [-3.5, 16], s: 2.4 },
          { type: "rock", pos: [3.5, 18], s: 2.8 },
          { type: "crate", pos: [0.2, 20], s: 1.6 },
        ],
        enemies: [
          { pos: [-3.2, 16], delay: 0.6 },
          { pos: [3.4, 18], delay: 1.8 },
          { pos: [0.3, 21], delay: 3.0 },
        ],
      },
      {
        camera: { pos: [5, 1.7, 18], look: [8, 1.6, 42] },
        cover: [
          { type: "rock", pos: [10, 36], s: 3.2 },
          { type: "rock", pos: [5.5, 34], s: 2.2 },
          { type: "barrel", pos: [8, 38], s: 1.3 },
        ],
        enemies: [
          { pos: [10, 36], delay: 0.5 },
          { pos: [5.5, 34], delay: 1.6 },
          { pos: [8, 39], delay: 2.4 },
          { pos: [12, 40], delay: 3.4 },
        ],
      },
      {
        camera: { pos: [-2, 1.7, 36], look: [-2, 1.6, 60] },
        cover: [
          { type: "rock", pos: [-5, 54], s: 2.6 },
          { type: "rock", pos: [1, 56], s: 3.0 },
          { type: "crate", pos: [-2, 52], s: 1.7 },
        ],
        enemies: [
          { pos: [-5, 54], delay: 0.5 },
          { pos: [1, 55], delay: 1.4 },
          { pos: [-2, 53], delay: 2.2 },
          { pos: [-7, 57], delay: 3.0 },
          { pos: [3, 58], delay: 3.8 },
        ],
      },
    ],
  },

  {
    name: "Harbor Docks",
    ground: "#5b6670",
    fog: "#8fa3b0",
    sky: "#6f8595",
    fogDensity: 0.016,
    seed: 27,
    palette: ["#3f5e6e", "#7a4a3a", "#4a5a64"],
    enemyColor: "#2f5a66",
    decor: "container",
    stages: [
      {
        camera: { pos: [0, 1.7, -2], look: [0, 1.6, 24] },
        cover: [
          { type: "container", pos: [-4, 18], s: 1 },
          { type: "container", pos: [4, 20], s: 1 },
          { type: "crate", pos: [0, 16], s: 1.5 },
        ],
        enemies: [
          { pos: [-4, 17], delay: 0.5 },
          { pos: [4, 19], delay: 1.4 },
          { pos: [0, 15], delay: 2.2 },
          { pos: [-1.5, 21], delay: 3.2 },
        ],
      },
      {
        camera: { pos: [-5, 1.7, 18], look: [-7, 1.6, 44] },
        cover: [
          { type: "container", pos: [-9, 36], s: 1 },
          { type: "crate", pos: [-5, 34], s: 1.5 },
          { type: "barrel", pos: [-7, 38], s: 1.3 },
        ],
        enemies: [
          { pos: [-9, 36], delay: 0.4 },
          { pos: [-5, 34], delay: 1.2 },
          { pos: [-7, 39], delay: 2.0 },
          { pos: [-11, 40], delay: 2.8 },
          { pos: [-4, 41], delay: 3.6 },
        ],
      },
      {
        camera: { pos: [2, 1.7, 38], look: [2, 1.6, 64] },
        cover: [
          { type: "container", pos: [-2, 56], s: 1 },
          { type: "container", pos: [6, 58], s: 1 },
          { type: "crate", pos: [2, 54], s: 1.6 },
        ],
        enemies: [
          { pos: [-2, 56], delay: 0.4 },
          { pos: [6, 57], delay: 1.1 },
          { pos: [2, 54], delay: 1.8 },
          { pos: [-4, 59], delay: 2.6 },
          { pos: [8, 60], delay: 3.4 },
          { pos: [2, 61], delay: 4.2 },
        ],
      },
    ],
  },

  {
    name: "Ruined Plaza",
    ground: "#454048",
    fog: "#5a4f5a",
    sky: "#3b3340",
    fogDensity: 0.02,
    seed: 43,
    palette: ["#6b5f6b", "#52484f", "#7d7079"],
    enemyColor: "#5a3550",
    decor: "pillar",
    stages: [
      {
        camera: { pos: [0, 1.7, -2], look: [0, 1.6, 24] },
        cover: [
          { type: "pillar", pos: [-4, 18], s: 1 },
          { type: "pillar", pos: [4, 18], s: 1 },
          { type: "rubble", pos: [0, 20], s: 1.8 },
        ],
        enemies: [
          { pos: [-4, 17], delay: 0.4 },
          { pos: [4, 17], delay: 1.0 },
          { pos: [0, 20], delay: 1.7 },
          { pos: [-6, 21], delay: 2.5 },
          { pos: [6, 21], delay: 3.3 },
        ],
      },
      {
        camera: { pos: [3, 1.7, 18], look: [3, 1.6, 44] },
        cover: [
          { type: "pillar", pos: [0, 36], s: 1 },
          { type: "pillar", pos: [6, 36], s: 1 },
          { type: "rubble", pos: [3, 38], s: 2 },
        ],
        enemies: [
          { pos: [0, 36], delay: 0.4 },
          { pos: [6, 36], delay: 0.9 },
          { pos: [3, 38], delay: 1.6 },
          { pos: [-2, 40], delay: 2.3 },
          { pos: [8, 40], delay: 3.0 },
          { pos: [3, 42], delay: 3.8 },
        ],
      },
      {
        camera: { pos: [-3, 1.7, 38], look: [-3, 1.6, 66] },
        cover: [
          { type: "pillar", pos: [-7, 56], s: 1 },
          { type: "pillar", pos: [1, 56], s: 1 },
          { type: "pillar", pos: [-3, 60], s: 1 },
          { type: "rubble", pos: [-3, 54], s: 2 },
        ],
        enemies: [
          { pos: [-7, 56], delay: 0.3 },
          { pos: [1, 56], delay: 0.8 },
          { pos: [-3, 54], delay: 1.4 },
          { pos: [-9, 58], delay: 2.1 },
          { pos: [3, 58], delay: 2.8 },
          { pos: [-3, 61], delay: 3.5 },
          { pos: [-5, 63], delay: 4.3 },
        ],
      },
    ],
  },
];

// Builds all of a location's static geometry under a single node that can be
// disposed when moving on. Returns { root } so the caller can tear it down.
export function buildLocation(scene, loc) {
  const root = new B.TransformNode("location:" + loc.name, scene);
  const rng = makeRng(loc.seed);

  // Ground.
  const ground = B.MeshBuilder.CreateGround(
    "ground",
    { width: 160, height: 200, subdivisions: 1 },
    scene
  );
  ground.position.z = 70;
  const gmat = new B.StandardMaterial("groundMat", scene);
  gmat.diffuseColor = B.Color3.FromHexString(loc.ground);
  gmat.specularColor = new B.Color3(0, 0, 0);
  ground.material = gmat;
  ground.parent = root;
  ground.isPickable = false;

  // Reusable material per palette tint.
  const mats = loc.palette.map((hex, i) => {
    const m = new B.StandardMaterial("scenMat" + i, scene);
    m.diffuseColor = B.Color3.FromHexString(hex);
    m.specularColor = new B.Color3(0.05, 0.05, 0.05);
    return m;
  });
  const pick = () => mats[Math.floor(rng() * mats.length)];

  const place = (mesh, x, z, rotY = 0) => {
    mesh.position.x = x;
    mesh.position.z = z;
    mesh.rotation.y = rotY;
    mesh.material = pick();
    mesh.parent = root;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
  };

  const makeProp = (type, x, z, s) => {
    let mesh;
    switch (type) {
      case "crate":
        mesh = B.MeshBuilder.CreateBox("crate", { size: 1.3 * s }, scene);
        mesh.position.y = 0.65 * s;
        break;
      case "barrel":
        mesh = B.MeshBuilder.CreateCylinder(
          "barrel",
          { height: 1.4 * s, diameter: 1.0 * s, tessellation: 10 },
          scene
        );
        mesh.position.y = 0.7 * s;
        break;
      case "container":
        mesh = B.MeshBuilder.CreateBox(
          "container",
          { width: 3.4, height: 2.6, depth: 7 },
          scene
        );
        mesh.position.y = 1.3;
        break;
      case "pillar":
        mesh = B.MeshBuilder.CreateCylinder(
          "pillar",
          { height: 5.5, diameter: 1.1, tessellation: 8 },
          scene
        );
        mesh.position.y = 2.75;
        break;
      case "rubble":
        mesh = B.MeshBuilder.CreateBox(
          "rubble",
          { width: 2.2 * s, height: 1.0 * s, depth: 1.6 * s },
          scene
        );
        mesh.position.y = 0.5 * s;
        break;
      case "rock":
      default:
        mesh = B.MeshBuilder.CreateBox("rock", { size: 1.0 * s }, scene);
        mesh.position.y = 0.4 * s;
        mesh.scaling.set(1.4, 0.9, 1.2);
        break;
    }
    place(mesh, x, z, rng() * Math.PI);
    return mesh;
  };

  // Explicit cover from each stage.
  for (const stage of loc.stages) {
    for (const c of stage.cover) {
      makeProp(c.type, c.pos[0], c.pos[1], c.s || 1);
    }
  }

  // Ambient scatter to fill the landscape and read as a real place.
  const decor = loc.decor;
  for (let i = 0; i < 40; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    const x = side * (14 + rng() * 50);
    const z = -10 + rng() * 150;
    const s = 1 + rng() * 2.5;
    makeProp(decor, x, z, s);
  }

  // A few tall distant silhouettes on the horizon for depth.
  for (let i = 0; i < 10; i++) {
    const x = (rng() - 0.5) * 150;
    const h = 12 + rng() * 26;
    const tower = B.MeshBuilder.CreateBox(
      "tower",
      { width: 6 + rng() * 6, height: h, depth: 6 + rng() * 6 },
      scene
    );
    tower.position.set(x, h / 2, 140 + rng() * 40);
    place(tower, x, 140 + rng() * 40, rng() * Math.PI);
  }

  return { root };
}
