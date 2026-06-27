import { LOCATIONS, LEVELS_KEY } from "../levels.js";

const B = window.BABYLON;
const clone = (o) => JSON.parse(JSON.stringify(o));
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// Editor state — `levels` is an array of location objects in the exact shape
// the game consumes (see js/levels.js). The editor reads/writes that format so
// "Save & Play" drops straight into the game via localStorage.
// ---------------------------------------------------------------------------
let levels = loadInitial();
let locIndex = 0;
let stageIndex = 0;
let tool = "select";
let selected = null; // { kind, si, ii }
let view = "2d";

const loc = () => levels[locIndex];
const stage = () => loc().stages[stageIndex];

function loadInitial() {
  try {
    const raw = localStorage.getItem(LEVELS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length && data.every((l) => l && l.stages)) return data;
    }
  } catch (e) {
    /* ignore */
  }
  return clone(LOCATIONS);
}

function blankStage(z = 0) {
  return { camera: { pos: [0, 1.7, z], look: [0, 1.5, z + 22] }, cover: [], enemies: [] };
}
function blankLocation(name) {
  return {
    name,
    sky: "#8aa0b0",
    fog: "#9aa6b0",
    fogDensity: 0.009,
    floor: "#7a7f86",
    wall: "#4a525c",
    accent: "#5a4a44",
    enemyColor: "#a23a22",
    stages: [blankStage(0)],
  };
}

// ---------------------------------------------------------------------------
// Babylon scene
// ---------------------------------------------------------------------------
const canvas = $("editorCanvas");
const engine = new B.Engine(canvas, true, { adaptToDeviceRatio: true });
const scene = new B.Scene(engine);
scene.clearColor = B.Color4.FromHexString("#0d1117ff");

const camera = new B.ArcRotateCamera("cam", -Math.PI / 2, 0.02, 70, new B.Vector3(0, 0, 40), scene);
camera.minZ = 0.1;
camera.maxZ = 800;
// We drive the camera manually (custom left=edit / right=orbit / wheel=zoom).
camera.detachControl();

new B.HemisphericLight("h", new B.Vector3(0, 1, 0), scene).intensity = 0.95;
const sun = new B.DirectionalLight("s", new B.Vector3(-0.4, -1, 0.5), scene);
sun.intensity = 0.4;

// Shared marker materials.
const mat = (hex, emissive = 0.25) => {
  const m = new B.StandardMaterial("m" + hex, scene);
  m.diffuseColor = B.Color3.FromHexString(hex);
  m.emissiveColor = B.Color3.FromHexString(hex).scale(emissive);
  m.specularColor = new B.Color3(0.05, 0.05, 0.05);
  return m;
};
const enemyMat = mat("#e6543b", 0.35);
const coverMat = mat("#9a7b4a", 0.15);
const wpMat = mat("#4f9bff", 0.4);
const lookMat = mat("#ffd24a", 0.4);

let gridNode = null;
function buildGrid() {
  if (gridNode) gridNode.dispose(false, true);
  gridNode = new B.TransformNode("grid", scene);
  const lines = [];
  for (let x = -30; x <= 30; x += 5) lines.push([new B.Vector3(x, 0, -20), new B.Vector3(x, 0, 90)]);
  for (let z = -20; z <= 90; z += 5) lines.push([new B.Vector3(-30, 0, z), new B.Vector3(30, 0, z)]);
  const grid = B.MeshBuilder.CreateLineSystem("g", { lines }, scene);
  grid.color = new B.Color3(0.16, 0.2, 0.26);
  grid.isPickable = false;
  grid.parent = gridNode;

  // Guides: firing-lane bounds (blue) and framing-wall lines (orange).
  const guide = (x, c) => {
    const l = B.MeshBuilder.CreateLines("gl", { points: [new B.Vector3(x, 0.02, -20), new B.Vector3(x, 0.02, 90)] }, scene);
    l.color = c;
    l.isPickable = false;
    l.parent = gridNode;
  };
  guide(-9, new B.Color3(0.2, 0.4, 0.7));
  guide(9, new B.Color3(0.2, 0.4, 0.7));
  guide(-17, new B.Color3(0.6, 0.35, 0.2));
  guide(17, new B.Color3(0.6, 0.35, 0.2));
}
buildGrid();

// ---------------------------------------------------------------------------
// Markers (rebuilt from data on any change)
// ---------------------------------------------------------------------------
let markers = [];
const v3 = (a) => new B.Vector3(a[0], a[1], a[2]);

function tag(mesh, kind, si, ii) {
  mesh.metadata = { editor: { kind, si, ii } };
  mesh.isPickable = true;
  markers.push(mesh);
}
function addLine(name, pts, color) {
  const l = B.MeshBuilder.CreateLines(name, { points: pts }, scene);
  l.color = color;
  l.isPickable = false;
  markers.push(l);
}
function coverDims(c) {
  const s = c.s || 1;
  if (c.type === "barrel") return { w: 1.0 * s, h: 1.3 * s };
  if (c.type === "pillar") return { w: 1.1, h: 5.5 };
  return { w: 1.3 * s, h: 1.3 * s }; // crate / rock / rubble
}

function clearMarkers() {
  for (const m of markers) m.dispose();
  markers = [];
}

function buildMarkers() {
  clearMarkers();
  const L = loc();

  // Rail path through the waypoints in order.
  const wpPts = L.stages.map((s) => v3(s.camera.pos));
  if (wpPts.length > 1) addLine("path", wpPts, new B.Color3(0.3, 0.9, 0.5));

  L.stages.forEach((s, si) => {
    const active = si === stageIndex;
    const wp = B.MeshBuilder.CreateBox("wp", { size: 0.9 }, scene);
    wp.material = wpMat;
    wp.position.copyFrom(v3(s.camera.pos));
    wp.visibility = active ? 1 : 0.45;
    tag(wp, "waypoint", si, null);

    const lk = B.MeshBuilder.CreateBox("look", { size: 0.55 }, scene);
    lk.material = lookMat;
    lk.position.copyFrom(v3(s.camera.look));
    lk.visibility = active ? 1 : 0.3;
    tag(lk, "look", si, null);

    addLine("cl" + si, [v3(s.camera.pos), v3(s.camera.look)], new B.Color3(0.9, 0.8, 0.2));
  });

  // Active stage's enemies + cover.
  const st = stage();
  st.enemies.forEach((e, ii) => {
    const m = B.MeshBuilder.CreateCylinder("enemy", { height: 1.6, diameter: 0.8 }, scene);
    m.material = enemyMat;
    m.position.set(e.pos[0], 0.8, e.pos[1]);
    tag(m, "enemy", stageIndex, ii);
  });
  st.cover.forEach((c, ii) => {
    const d = coverDims(c);
    const m = B.MeshBuilder.CreateBox("cover", { size: 1 }, scene);
    m.material = coverMat;
    m.scaling.set(d.w, d.h, d.w);
    m.position.set(c.pos[0], d.h / 2, c.pos[1]);
    tag(m, "cover", stageIndex, ii);
  });

  applyOutline();
}

function applyOutline() {
  for (const m of markers) {
    if (!m.metadata || !m.metadata.editor) continue;
    const e = m.metadata.editor;
    const on =
      selected &&
      selected.kind === e.kind &&
      selected.si === e.si &&
      selected.ii === e.ii;
    m.renderOutline = on;
    m.outlineColor = new B.Color3(1, 1, 1);
    m.outlineWidth = 0.06;
  }
}

// ---------------------------------------------------------------------------
// Pointer interaction
// ---------------------------------------------------------------------------
let drag = null; // { mode: 'item'|'pan', startGround }
function localXY(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
// Where the cursor ray crosses the ground plane (y = 0).
function groundPoint(px, py) {
  const ray = scene.createPickingRay(px, py, B.Matrix.Identity(), camera);
  if (Math.abs(ray.direction.y) < 1e-5) return new B.Vector3(0, 0, 0);
  const t = -ray.origin.y / ray.direction.y;
  return ray.origin.add(ray.direction.scale(t));
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const { x, y } = localXY(e);

  if (e.button === 2) {
    drag = { mode: "orbit", lastX: e.clientX, lastY: e.clientY };
    return;
  }
  if (e.button !== 0) return;

  const g = groundPoint(x, y);

  if (tool === "select") {
    const pick = scene.pick(x, y, (m) => m.isPickable && m.metadata && m.metadata.editor);
    if (pick && pick.hit && pick.pickedMesh) {
      selectFrom(pick.pickedMesh.metadata.editor);
      drag = { mode: "item" };
    } else {
      selected = null;
      renderSelection();
      applyOutline();
      drag = { mode: "pan", grab: g };
    }
    return;
  }

  // Placement tools.
  if (tool === "enemy") {
    stage().enemies.push({ pos: [round(g.x), round(g.z)], delay: round(stage().enemies.length * 0.7 + 0.4, 1) });
    selected = { kind: "enemy", si: stageIndex, ii: stage().enemies.length - 1 };
  } else if (tool === "cover") {
    stage().cover.push({ type: "crate", pos: [round(g.x), round(g.z)], s: 1 });
    selected = { kind: "cover", si: stageIndex, ii: stage().cover.length - 1 };
  } else if (tool === "waypoint") {
    const ns = blankStage(round(g.z));
    ns.camera.pos = [round(g.x), 1.7, round(g.z)];
    ns.camera.look = [round(g.x), 1.5, round(g.z) + 22];
    loc().stages.push(ns);
    stageIndex = loc().stages.length - 1;
    selected = { kind: "waypoint", si: stageIndex, ii: null };
    renderStages();
  } else if (tool === "look") {
    stage().camera.look = [round(g.x), stage().camera.look[1], round(g.z)];
    selected = { kind: "look", si: stageIndex, ii: null };
  }
  buildMarkers();
  renderSelection();
  status("Added " + tool);
});

canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const { x, y } = localXY(e);

  if (drag.mode === "orbit") {
    camera.alpha -= (e.clientX - drag.lastX) * 0.006;
    camera.beta = clamp(camera.beta - (e.clientY - drag.lastY) * 0.006, 0.02, 1.5);
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    return;
  }
  if (drag.mode === "pan") {
    const now = groundPoint(x, y);
    camera.target.addInPlace(drag.grab.subtract(now));
    return;
  }
  if (drag.mode === "item" && selected) {
    const g = groundPoint(x, y);
    setItemXZ(selected, round(g.x), round(g.z));
    buildMarkers();
    renderSelection();
  }
});

function endDrag(e) {
  if (e && e.pointerId != null && canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }
  drag = null;
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  camera.radius = clamp(camera.radius * (1 + Math.sign(e.deltaY) * 0.12), 6, 260);
}, { passive: false });

function setItemXZ(sel, x, z) {
  const s = loc().stages[sel.si];
  if (sel.kind === "enemy") s.enemies[sel.ii].pos = [x, z];
  else if (sel.kind === "cover") s.cover[sel.ii].pos = [x, z];
  else if (sel.kind === "waypoint") {
    s.camera.pos = [x, s.camera.pos[1], z];
  } else if (sel.kind === "look") {
    s.camera.look = [x, s.camera.look[1], z];
  }
}

function selectFrom(ed) {
  if (ed.si !== stageIndex && (ed.kind === "enemy" || ed.kind === "cover")) stageIndex = ed.si;
  if (ed.kind === "waypoint" || ed.kind === "look") stageIndex = ed.si;
  selected = { kind: ed.kind, si: ed.si, ii: ed.ii };
  renderStages();
  buildMarkers();
  renderSelection();
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
function deleteSelected() {
  if (!selected) return;
  const s = loc().stages[selected.si];
  if (selected.kind === "enemy") s.enemies.splice(selected.ii, 1);
  else if (selected.kind === "cover") s.cover.splice(selected.ii, 1);
  else if (selected.kind === "waypoint") deleteStage(selected.si);
  selected = null;
  buildMarkers();
  renderSelection();
  status("Deleted");
}
function deleteStage(si) {
  if (loc().stages.length <= 1) {
    status("A location needs at least one stage");
    return;
  }
  loc().stages.splice(si, 1);
  stageIndex = Math.min(stageIndex, loc().stages.length - 1);
  renderStages();
}

// ---------------------------------------------------------------------------
// UI: panel rendering
// ---------------------------------------------------------------------------
function num(value, step, oninput) {
  const i = document.createElement("input");
  i.type = "number";
  i.value = value;
  i.step = step;
  i.addEventListener("input", () => oninput(parseFloat(i.value)));
  return i;
}
function field(label, control) {
  const d = document.createElement("div");
  d.className = "field";
  const l = document.createElement("label");
  l.textContent = label;
  d.appendChild(l);
  d.appendChild(control);
  return d;
}

function renderSelection() {
  const body = $("selBody");
  body.innerHTML = "";
  if (!selected) {
    body.className = "muted";
    body.textContent = "Nothing selected.";
    return;
  }
  body.className = "";
  const s = loc().stages[selected.si];

  if (selected.kind === "enemy") {
    const e = s.enemies[selected.ii];
    body.appendChild(title("Enemy spawn"));
    body.appendChild(field("X", num(e.pos[0], 0.5, (v) => up(() => (e.pos[0] = v)))));
    body.appendChild(field("Z (depth)", num(e.pos[1], 0.5, (v) => up(() => (e.pos[1] = v)))));
    body.appendChild(field("Delay (s)", num(e.delay || 0, 0.1, (v) => (e.delay = v))));
  } else if (selected.kind === "cover") {
    const c = s.cover[selected.ii];
    body.appendChild(title("Cover prop"));
    const sel = document.createElement("select");
    ["crate", "barrel", "rock", "rubble", "pillar"].forEach((t) => {
      const o = document.createElement("option");
      o.value = o.textContent = t;
      if (t === c.type) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => up(() => (c.type = sel.value)));
    body.appendChild(field("Type", sel));
    body.appendChild(field("X", num(c.pos[0], 0.5, (v) => up(() => (c.pos[0] = v)))));
    body.appendChild(field("Z (depth)", num(c.pos[1], 0.5, (v) => up(() => (c.pos[1] = v)))));
    body.appendChild(field("Scale", num(c.s || 1, 0.1, (v) => up(() => (c.s = v)))));
  } else if (selected.kind === "waypoint" || selected.kind === "look") {
    const cam = s.camera;
    body.appendChild(title("Stage " + (selected.si + 1) + " camera"));
    body.appendChild(field("Cam X", num(cam.pos[0], 0.5, (v) => up(() => (cam.pos[0] = v)))));
    body.appendChild(field("Cam Y (eye)", num(cam.pos[1], 0.1, (v) => up(() => (cam.pos[1] = v)))));
    body.appendChild(field("Cam Z", num(cam.pos[2], 0.5, (v) => up(() => (cam.pos[2] = v)))));
    body.appendChild(field("Look X", num(cam.look[0], 0.5, (v) => up(() => (cam.look[0] = v)))));
    body.appendChild(field("Look Y", num(cam.look[1], 0.1, (v) => up(() => (cam.look[1] = v)))));
    body.appendChild(field("Look Z", num(cam.look[2], 0.5, (v) => up(() => (cam.look[2] = v)))));
  }
}
function title(t) {
  const h = document.createElement("div");
  h.style.cssText = "font-weight:bold;margin-bottom:8px;color:#cdd6e0";
  h.textContent = t;
  return h;
}
// Apply a data change then refresh the viewport.
function up(fn) {
  fn();
  buildMarkers();
}

function renderTheme() {
  const t = $("themeBody");
  t.innerHTML = "";
  const L = loc();
  const colors = [
    ["Sky", "sky"],
    ["Fog", "fog"],
    ["Floor", "floor"],
    ["Wall", "wall"],
    ["Accent", "accent"],
    ["Enemy tint", "enemyColor"],
  ];
  for (const [label, key] of colors) {
    const i = document.createElement("input");
    i.type = "color";
    i.value = L[key] || "#888888";
    i.addEventListener("input", () => (L[key] = i.value));
    t.appendChild(field(label, i));
  }
  const fog = num(L.fogDensity || 0.009, 0.001, (v) => (L.fogDensity = v));
  t.appendChild(field("Fog density", fog));
}

function renderLocations() {
  const sel = $("locSelect");
  sel.innerHTML = "";
  levels.forEach((l, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = l.name || "Location " + (i + 1);
    if (i === locIndex) o.selected = true;
    sel.appendChild(o);
  });
  $("locName").value = loc().name || "";
}

function renderStages() {
  const sel = $("stageSelect");
  sel.innerHTML = "";
  loc().stages.forEach((s, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = `Stage ${i + 1}  (${s.enemies.length}e ${s.cover.length}c)`;
    if (i === stageIndex) o.selected = true;
    sel.appendChild(o);
  });
}

function renderAll() {
  renderLocations();
  renderStages();
  renderTheme();
  renderSelection();
  buildMarkers();
}

// ---------------------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------------------
document.querySelectorAll(".tool").forEach((btn) => {
  btn.addEventListener("click", () => {
    tool = btn.dataset.tool;
    document.querySelectorAll(".tool").forEach((b) => b.classList.toggle("active", b === btn));
    status("Tool: " + tool);
  });
});
$("deleteBtn").addEventListener("click", deleteSelected);
window.addEventListener("keydown", (e) => {
  if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement === document.body) {
    e.preventDefault();
    deleteSelected();
  }
});

$("view2d").addEventListener("click", () => setView("2d"));
$("view3d").addEventListener("click", () => setView("3d"));
function setView(v) {
  view = v;
  $("view2d").classList.toggle("active", v === "2d");
  $("view3d").classList.toggle("active", v === "3d");
  if (v === "2d") {
    camera.alpha = -Math.PI / 2;
    camera.beta = 0.02;
    camera.radius = 80;
  } else {
    camera.alpha = -Math.PI / 2;
    camera.beta = 0.95;
    camera.radius = 55;
  }
}

$("locSelect").addEventListener("change", (e) => {
  locIndex = parseInt(e.target.value, 10);
  stageIndex = 0;
  selected = null;
  renderAll();
});
$("locName").addEventListener("input", (e) => {
  loc().name = e.target.value;
  renderLocations();
});
$("addLoc").addEventListener("click", () => {
  levels.push(blankLocation("New Location " + (levels.length + 1)));
  locIndex = levels.length - 1;
  stageIndex = 0;
  selected = null;
  renderAll();
});
$("delLoc").addEventListener("click", () => {
  if (levels.length <= 1) return status("Need at least one location");
  levels.splice(locIndex, 1);
  locIndex = Math.min(locIndex, levels.length - 1);
  stageIndex = 0;
  selected = null;
  renderAll();
});

$("stageSelect").addEventListener("change", (e) => {
  stageIndex = parseInt(e.target.value, 10);
  selected = null;
  buildMarkers();
  renderSelection();
});
$("delStage").addEventListener("click", () => {
  deleteStage(stageIndex);
  selected = null;
  buildMarkers();
  renderSelection();
});
$("stageUp").addEventListener("click", () => moveStage(-1));
$("stageDown").addEventListener("click", () => moveStage(1));
function moveStage(d) {
  const j = stageIndex + d;
  if (j < 0 || j >= loc().stages.length) return;
  const arr = loc().stages;
  [arr[stageIndex], arr[j]] = [arr[j], arr[stageIndex]];
  stageIndex = j;
  selected = null;
  renderStages();
  buildMarkers();
}

$("savePlay").addEventListener("click", () => {
  localStorage.setItem(LEVELS_KEY, JSON.stringify(levels));
  status("Saved to this browser — opening game…");
  window.open("index.html", "_blank");
});
$("clearSaved").addEventListener("click", () => {
  localStorage.removeItem(LEVELS_KEY);
  status("Cleared saved override — the game will use built-in levels");
});
$("loadBuiltin").addEventListener("click", () => {
  levels = clone(LOCATIONS);
  locIndex = stageIndex = 0;
  selected = null;
  renderAll();
  status("Loaded built-in levels");
});
$("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(levels, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "levels.json";
  a.click();
  URL.revokeObjectURL(a.href);
  status("Exported levels.json — put this file at assets/levels.json and commit to ship it to everyone.");
});
$("import").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data) || !data.length || !data.every((l) => l && l.stages)) {
        return status("Invalid levels file");
      }
      levels = data;
      locIndex = stageIndex = 0;
      selected = null;
      renderAll();
      status("Imported " + file.name);
    } catch (err) {
      status("Could not parse file: " + err.message);
    }
  };
  reader.readAsText(file);
});

// ---------------------------------------------------------------------------
// Helpers + boot
// ---------------------------------------------------------------------------
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function round(v, p = 1) {
  const f = Math.pow(10, p);
  return Math.round(v * f) / f;
}
let statusTimer = null;
function status(msg) {
  $("status").textContent = msg;
}

window.addEventListener("resize", () => engine.resize());
engine.runRenderLoop(() => scene.render());

setView("2d");
renderAll();
status("Ready — Left-drag to pan, wheel to zoom. Pick a tool to place enemies, cover, and rail waypoints.");

// With no local override, start from the live shipped levels (assets/levels.json)
// so you're editing what everyone actually plays.
(async () => {
  if (localStorage.getItem(LEVELS_KEY)) return;
  try {
    const res = await fetch("assets/levels.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data) && data.length && data.every((l) => l && l.stages)) {
      levels = data;
      locIndex = 0;
      stageIndex = 0;
      selected = null;
      renderAll();
      status("Loaded live levels (assets/levels.json). Edit, then Export to ship.");
    }
  } catch (e) {
    /* keep the built-in template */
  }
})();

// Expose for quick debugging / headless tests.
window.editor = { get levels() { return levels; }, buildMarkers, setView };
