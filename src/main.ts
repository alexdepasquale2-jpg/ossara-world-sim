import "./style.css";
import { tickWorld } from "./sim/engine";
import { generateWorld, entityById } from "./sim/worldGen";
import { DEFAULT_LAYERS } from "./sim/types";
import { WorldScene } from "./render/scene";
import { SimPanel } from "./ui/panel";

const app = document.querySelector<HTMLDivElement>("#app")!;

const viewport = document.createElement("div");
viewport.className = "viewport";
const canvas = document.createElement("canvas");
viewport.appendChild(canvas);
const hud = document.createElement("div");
hud.className = "hud";
hud.textContent = "Drag to pan · Scroll to zoom · Click to select";
viewport.appendChild(hud);

let world = generateWorld(Date.now() % 100000);
let paused = false;
let simSpeed = 1;

const scene = new WorldScene(canvas, DEFAULT_LAYERS);
scene.setWorld(world);

const panel = new SimPanel({
  onLayersChange: (layers) => scene.setLayers(layers),
  onSelect: (id) => {
    const entity = id ? entityById(world, id) : null;
    panel.setSelected(id, world);
    scene.highlightEntity(entity ?? null);
  },
  onPauseToggle: () => {
    paused = !paused;
  },
  onSpeedChange: (speed) => {
    simSpeed = speed;
  },
  onRegenerate: () => {
    world = generateWorld(Math.floor(Math.random() * 1_000_000));
    scene.setWorld(world);
    panel.setSelected(null, world);
  },
});

app.appendChild(panel.root);
app.appendChild(viewport);

panel.setSelected(null, world);

let panX = 0;
let panY = 0;
let zoom = 1;
scene.setPan(panX, panY);
scene.setZoom(zoom);

let dragging = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener("pointerdown", (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.classList.add("dragging");
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  panX -= dx / zoom;
  panY += dy / zoom;
  scene.setPan(panX, panY);
});

canvas.addEventListener("pointerup", (e) => {
  dragging = false;
  canvas.classList.remove("dragging");
  canvas.releasePointerCapture(e.pointerId);
});

canvas.addEventListener("click", (e) => {
  if (Math.abs(e.movementX) > 4 || Math.abs(e.movementY) > 4) return;
  const id = scene.pick(e.clientX, e.clientY);
  panel.setSelected(id, world);
  const entity = id ? entityById(world, id) : null;
  scene.highlightEntity(entity ?? null);
});

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    zoom = Math.max(0.35, Math.min(3.5, zoom * factor));
    scene.setZoom(zoom);
  },
  { passive: false },
);

let lastTime = performance.now();
let accum = 0;

function frame(now: number): void {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  if (!paused) {
    accum += dt * simSpeed;
    if (accum >= 0.05) {
      tickWorld(world, accum * 60);
      accum = 0;
      scene.updateResidents(world.residents);
      panel.tick(world);
    }
  }
  scene.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
