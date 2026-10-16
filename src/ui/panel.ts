import type { GeoEntity, LayerVisibility, ViewState, World } from "../sim/types";
import { DEFAULT_LAYERS } from "../sim/types";
import { breadcrumb, entityById } from "../sim/worldGen";
import { formatPopulation, pct } from "../sim/engine";

export interface PanelCallbacks {
  onLayersChange: (layers: LayerVisibility) => void;
  onSelect: (id: string | null) => void;
  onPauseToggle: () => void;
  onSpeedChange: (speed: number) => void;
  onRegenerate: () => void;
  onSheetOpenChange?: (open: boolean) => void;
}

export class SimPanel {
  readonly root: HTMLElement;
  private statsEl: HTMLElement;
  private breadcrumbEl: HTMLElement;
  private peekSummaryEl: HTMLElement;
  private sheetOpen = false;
  private callbacks: PanelCallbacks;
  private view: ViewState;

  constructor(callbacks: PanelCallbacks) {
    this.callbacks = callbacks;
    this.view = {
      zoom: 1,
      panX: 0,
      panY: 0,
      selectedId: null,
      layers: { ...DEFAULT_LAYERS },
      paused: false,
      speed: 1,
    };

    this.root = document.createElement("aside");
    this.root.className = "panel";
    this.root.innerHTML = `
      <div class="sheet-peek" id="sheet-peek">
        <button type="button" class="sheet-handle" id="sheet-toggle" aria-expanded="false">
          <span class="handle-bar"></span>
          <span class="handle-label">Controls</span>
        </button>
        <div class="peek-summary" id="peek-summary">Day 1 · Pan & pinch the map</div>
        <button type="button" class="btn peek-pause" id="btn-pause-peek">Pause</button>
      </div>
      <div class="sheet-body">
      <header class="panel-header">
        <h1>Ossara Sim</h1>
        <p class="subtitle">Continent · Nation · Region · State · City · People · Art</p>
      </header>
      <section class="panel-section">
        <h2>Simulation</h2>
        <div class="row">
          <button type="button" id="btn-pause" class="btn primary">Pause</button>
          <label class="speed">
            Speed
            <input type="range" id="speed" min="1" max="8" value="1" />
          </label>
        </div>
        <button type="button" id="btn-regen" class="btn ghost">Regenerate world</button>
      </section>
      <section class="panel-section">
        <h2>Layers</h2>
        <div class="layers" id="layers"></div>
      </section>
      <section class="panel-section">
        <h2>Selection</h2>
        <div id="breadcrumb" class="breadcrumb">Click the map to inspect</div>
        <div id="stats" class="stats"></div>
      </section>
      <section class="panel-section legend">
        <h2>Residents</h2>
        <ul>
          <li><span class="dot citizen"></span> Citizens</li>
          <li><span class="dot worker"></span> Workers</li>
          <li><span class="dot merchant"></span> Merchants</li>
          <li><span class="dot artist"></span> Artists</li>
        </ul>
      </section>
      </div>
    `;

    this.statsEl = this.root.querySelector("#stats")!;
    this.breadcrumbEl = this.root.querySelector("#breadcrumb")!;
    this.peekSummaryEl = this.root.querySelector("#peek-summary")!;
    this.bindLayers();
    const togglePause = () => {
      this.view.paused = !this.view.paused;
      this.updatePauseLabel();
      this.callbacks.onPauseToggle();
    };
    this.root.querySelector("#btn-pause")!.addEventListener("click", togglePause);
    this.root.querySelector("#btn-pause-peek")!.addEventListener("click", togglePause);
    this.root.querySelector("#sheet-toggle")!.addEventListener("click", () => {
      this.setSheetOpen(!this.sheetOpen);
    });
    this.root.querySelector("#speed")!.addEventListener("input", (e) => {
      const v = Number((e.target as HTMLInputElement).value);
      this.view.speed = v;
      this.callbacks.onSpeedChange(v);
    });
    this.root.querySelector("#btn-regen")!.addEventListener("click", () => {
      this.callbacks.onRegenerate();
    });
  }

  getViewState(): ViewState {
    return this.view;
  }

  setSheetOpen(open: boolean): void {
    this.sheetOpen = open;
    this.root.classList.toggle("open", open);
    const toggle = this.root.querySelector("#sheet-toggle")!;
    toggle.setAttribute("aria-expanded", String(open));
    this.callbacks.onSheetOpenChange?.(open);
  }

  setSelected(id: string | null, world: World): void {
    this.view.selectedId = id;
    if (!id) {
      this.breadcrumbEl.textContent = this.inspectHint();
      this.statsEl.innerHTML = this.globalSummary(world);
      this.updatePeek(world);
      return;
    }
    const entity = entityById(world, id);
    if (!entity) return;
    const chain = breadcrumb(world, id);
    this.breadcrumbEl.innerHTML = chain
      .map((e) => `<span class="crumb">${e.name}</span>`)
      .join('<span class="sep">›</span>');
    this.statsEl.innerHTML = entityStatsHtml(entity, world);
    this.updatePeek(world, entity.name);
  }

  tick(world: World): void {
    if (this.view.selectedId) {
      const entity = entityById(world, this.view.selectedId);
      if (entity) {
        this.statsEl.innerHTML = entityStatsHtml(entity, world);
      }
    } else {
      this.statsEl.innerHTML = this.globalSummary(world);
    }
    const dayEl = this.root.querySelector(".day-counter");
    if (dayEl) dayEl.textContent = `Day ${world.day}`;
    const selected = this.view.selectedId
      ? entityById(world, this.view.selectedId)
      : null;
    this.updatePeek(world, selected?.name);
  }

  private inspectHint(): string {
    return window.matchMedia("(max-width: 768px)").matches
      ? "Tap the map to inspect"
      : "Click the map to inspect";
  }

  private updatePeek(world: World, selectionName?: string): void {
    const c = world.continent.stats;
    const sel = selectionName ? ` · ${selectionName}` : "";
    this.peekSummaryEl.textContent = `Day ${world.day} · ${formatPopulation(c.population)} pop · ${pct(c.happiness)} happy${sel}`;
  }

  private globalSummary(world: World): string {
    const c = world.continent.stats;
    const people = world.residents.length;
    const art = world.art.length;
    return `
      <div class="stat-grid">
        <div><span class="label">Day</span><strong class="day-counter">${world.day}</strong></div>
        <div><span class="label">Population</span><strong>${formatPopulation(c.population)}</strong></div>
        <div><span class="label">Happiness</span><strong>${pct(c.happiness)}</strong></div>
        <div><span class="label">Economy</span><strong>${pct(c.economy)}</strong></div>
        <div><span class="label">Art index</span><strong>${pct(c.artIndex)}</strong></div>
        <div><span class="label">Agents</span><strong>${people}</strong></div>
        <div><span class="label">Artworks</span><strong>${art}</strong></div>
      </div>
    `;
  }

  private bindLayers(): void {
    const container = this.root.querySelector("#layers")!;
    const labels: Record<keyof LayerVisibility, string> = {
      continent: "Continent",
      nation: "Nations",
      region: "Regions",
      state: "States",
      city: "Cities",
      resident: "Residents",
      art: "Art",
      migration: "Migration",
      inventions: "Inventions",
    };
    for (const key of Object.keys(DEFAULT_LAYERS) as (keyof LayerVisibility)[]) {
      const id = `layer-${key}`;
      const label = document.createElement("label");
      label.className = "layer-toggle";
      label.innerHTML = `<input type="checkbox" id="${id}" checked /> ${labels[key]}`;
      container.appendChild(label);
      label.querySelector("input")!.addEventListener("change", (e) => {
        this.view.layers[key] = (e.target as HTMLInputElement).checked;
        this.callbacks.onLayersChange({ ...this.view.layers });
      });
    }
  }

  private updatePauseLabel(): void {
    const label = this.view.paused ? "Resume" : "Pause";
    this.root.querySelector("#btn-pause")!.textContent = label;
    this.root.querySelector("#btn-pause-peek")!.textContent = label;
  }
}

function entityStatsHtml(entity: GeoEntity, world: World): string {
  const s = entity.stats;
  let extra = "";
  if (entity.kind === "city") {
    const residents = world.residents.filter((r) => r.cityId === entity.id);
    const artworks = world.art.filter((a) => a.cityId === entity.id);
    extra = `
      <p class="meta">${residents.length} simulated residents · ${artworks.length} art sites</p>
    `;
  }
  return `
    <h3 class="entity-name">${entity.name}</h3>
    <p class="entity-kind">${entity.kind}</p>
    ${extra}
    <div class="stat-grid">
      <div><span class="label">Population</span><strong>${formatPopulation(s.population)}</strong></div>
      <div><span class="label">Happiness</span><strong>${pct(s.happiness)}</strong></div>
      <div><span class="label">Economy</span><strong>${pct(s.economy)}</strong></div>
      <div><span class="label">Art index</span><strong>${pct(s.artIndex)}</strong></div>
    </div>
  `;
}
