import "./style.css";
import { tickWorld } from "./sim/engine";
import { generateWorld, entityById } from "./sim/worldGen";
import { DEFAULT_LAYERS } from "./sim/types";
import { WorldScene } from "./render/scene";
import { SimPanel } from "./ui/panel";
import { ViewportControls } from "./input/viewportControls";
import { showPactPicker } from "./ui/pactPicker";

const app = document.querySelector<HTMLDivElement>("#app")!;

const viewport = document.createElement("div");
viewport.className = "viewport";
const canvas = document.createElement("canvas");
viewport.appendChild(canvas);

const hud = document.createElement("div");
hud.className = "hud";
viewport.appendChild(hud);

const zoomFab = document.createElement("div");
zoomFab.className = "zoom-fab";
zoomFab.innerHTML = `
  <button type="button" class="fab" id="zoom-in" aria-label="Zoom in">+</button>
  <button type="button" class="fab" id="zoom-out" aria-label="Zoom out">−</button>
`;
viewport.appendChild(zoomFab);

const backdrop = document.createElement("button");
backdrop.type = "button";
backdrop.className = "sheet-backdrop";
backdrop.setAttribute("aria-label", "Close controls");
backdrop.hidden = true;

let world = generateWorld(Date.now() % 100000);
let paused = false;
let simSpeed = 1;
let awaitingPactChoice = world.playerPactId === null;

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
    world.playerPactId = null;
    awaitingPactChoice = true;
    paused = true;
    scene.setWorld(world);
    panel.setSelected(null, world);
    openPactPicker();
  },
  onSheetOpenChange: (open) => {
    backdrop.hidden = !open;
    backdrop.classList.toggle("visible", open);
  },
});

app.appendChild(viewport);
app.appendChild(backdrop);
app.appendChild(panel.root);

panel.setSelected(null, world);

function openPactPicker(): void {
  const existing = app.querySelector(".pact-picker-overlay");
  existing?.remove();
  const overlay = showPactPicker(world.pacts, (pactId) => {
    world.playerPactId = pactId;
    awaitingPactChoice = false;
    paused = false;
    scene.setWorld(world);
  });
  app.appendChild(overlay);
}

if (awaitingPactChoice) {
  paused = true;
  openPactPicker();
}

function updateHud(): void {
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  hud.textContent = mobile
    ? "One finger pan · Pinch zoom · Tap to select"
    : "Drag to pan · Scroll to zoom · Click to select";
  app.classList.toggle("layout-mobile", mobile);
  zoomFab.hidden = !mobile;
}

updateHud();
window.matchMedia("(max-width: 768px)").addEventListener("change", () => {
  updateHud();
  scene.resize();
});

backdrop.addEventListener("click", () => panel.setSheetOpen(false));

const controls = new ViewportControls({
  canvas,
  onChange: ({ panX, panY, zoom }) => {
    scene.setPan(panX, panY);
    scene.setZoom(zoom);
  },
  onTap: (x, y) => {
    const id = scene.pick(x, y);
    panel.setSelected(id, world);
    const entity = id ? entityById(world, id) : null;
    scene.highlightEntity(entity ?? null);
    if (window.matchMedia("(max-width: 768px)").matches && id) {
      panel.setSheetOpen(true);
    }
  },
});

scene.setPan(controls.panX, controls.panY);
scene.setZoom(controls.zoom);

zoomFab.querySelector("#zoom-in")!.addEventListener("click", () => {
  controls.adjustZoom(1.15);
});
zoomFab.querySelector("#zoom-out")!.addEventListener("click", () => {
  controls.adjustZoom(1 / 1.15);
});

let lastTime = performance.now();
let accum = 0;

function frame(now: number): void {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  if (!paused && !awaitingPactChoice) {
    accum += dt * simSpeed;
    if (accum >= 0.05) {
      tickWorld(world, accum * 60);
      accum = 0;
      scene.updateResidents(world.residents);
      scene.updateTradeRoutes(world);
      panel.tick(world);
    }
  }
  scene.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
