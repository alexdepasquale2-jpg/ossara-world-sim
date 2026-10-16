import { computeWorldSignals, formatPct } from "../sim/indicators";
import { formatPopulation } from "../sim/engine";
import type { World } from "../sim/types";

export interface CommandHudCallbacks {
  onPause: () => void;
  onSpeed: (n: number) => void;
  onToggleDock: () => void;
}

export class CommandHud {
  readonly root: HTMLElement;
  private ringHappy: HTMLElement;
  private ringEcon: HTMLElement;
  private ringArt: HTMLElement;
  private ringTension: HTMLElement;
  private tickerEl: HTMLElement;
  private chipsEl: HTMLElement;
  private dayEl: HTMLElement;
  private pactEl: HTMLElement;
  private pauseBtn: HTMLElement;
  private speedInput: HTMLInputElement;
  private paused = false;

  constructor(callbacks: CommandHudCallbacks) {
    this.root = document.createElement("div");
    this.root.className = "command-hud";
    this.root.innerHTML = `
      <header class="command-bar">
        <div class="command-brand">
          <span class="brand-mark"></span>
          <div>
            <strong>OSSARA</strong>
            <span class="brand-sub">Civicverse Command</span>
          </div>
        </div>
        <div class="vital-rings" aria-label="Continent vitals">
          <div class="vital" data-vital="happy">
            <svg viewBox="0 0 40 40"><circle class="ring-bg" cx="20" cy="20" r="16"/><circle class="ring-fill" cx="20" cy="20" r="16"/></svg>
            <span>Joy</span>
          </div>
          <div class="vital" data-vital="econ">
            <svg viewBox="0 0 40 40"><circle class="ring-bg" cx="20" cy="20" r="16"/><circle class="ring-fill" cx="20" cy="20" r="16"/></svg>
            <span>Econ</span>
          </div>
          <div class="vital" data-vital="art">
            <svg viewBox="0 0 40 40"><circle class="ring-bg" cx="20" cy="20" r="16"/><circle class="ring-fill" cx="20" cy="20" r="16"/></svg>
            <span>Art</span>
          </div>
          <div class="vital" data-vital="tension">
            <svg viewBox="0 0 40 40"><circle class="ring-bg" cx="20" cy="20" r="16"/><circle class="ring-fill" cx="20" cy="20" r="16"/></svg>
            <span>Tension</span>
          </div>
        </div>
        <div class="market-ticker" id="market-ticker"></div>
        <div class="command-meta">
          <div class="day-pill" id="day-pill">Day 1</div>
          <div class="pact-pill" id="pact-pill">—</div>
        </div>
        <div class="command-actions">
          <button type="button" class="cmd-btn" id="cmd-pause">Pause</button>
          <label class="cmd-speed">
            <span>Speed</span>
            <input type="range" id="cmd-speed" min="1" max="8" value="1" />
          </label>
          <button type="button" class="cmd-btn accent" id="cmd-dock">Command Deck</button>
        </div>
      </header>
      <div class="indicator-rail" id="indicator-rail"></div>
    `;

    this.ringHappy = this.root.querySelector('[data-vital="happy"] .ring-fill')!;
    this.ringEcon = this.root.querySelector('[data-vital="econ"] .ring-fill')!;
    this.ringArt = this.root.querySelector('[data-vital="art"] .ring-fill')!;
    this.ringTension = this.root.querySelector('[data-vital="tension"] .ring-fill')!;
    this.tickerEl = this.root.querySelector("#market-ticker")!;
    this.chipsEl = this.root.querySelector("#indicator-rail")!;
    this.dayEl = this.root.querySelector("#day-pill")!;
    this.pactEl = this.root.querySelector("#pact-pill")!;
    this.pauseBtn = this.root.querySelector("#cmd-pause")!;
    this.speedInput = this.root.querySelector("#cmd-speed")!;

    this.pauseBtn.addEventListener("click", () => {
      this.paused = !this.paused;
      this.pauseBtn.textContent = this.paused ? "Resume" : "Pause";
      callbacks.onPause();
    });
    this.speedInput.addEventListener("input", () => {
      callbacks.onSpeed(Number(this.speedInput.value));
    });
    this.root.querySelector("#cmd-dock")!.addEventListener("click", () => {
      callbacks.onToggleDock();
    });
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.pauseBtn.textContent = paused ? "Resume" : "Pause";
  }

  update(world: World): void {
    const s = computeWorldSignals(world);
    this.setRing(this.ringHappy, s.happiness, "#5eead4");
    this.setRing(this.ringEcon, s.economy, "#60a5fa");
    this.setRing(this.ringArt, s.artIndex, "#c084fc");
    this.setRing(this.ringTension, s.tension / 100, s.tension > 70 ? "#fb7185" : "#fbbf24");

    this.dayEl.textContent = `Day ${s.day}`;
    this.pactEl.textContent = s.playerPactName;
    this.pactEl.style.setProperty("--pact-color", s.playerPactColor);

    const arrow = (t: "up" | "down" | "flat") =>
      t === "up" ? "▲" : t === "down" ? "▼" : "•";
    this.tickerEl.innerHTML = `
      <span class="tick food">Food ${s.prices.food.toFixed(2)} ${arrow(s.priceTrend.food)}</span>
      <span class="tick goods">Goods ${s.prices.goods.toFixed(2)} ${arrow(s.priceTrend.goods)}</span>
      <span class="tick culture">Culture ${s.prices.culture.toFixed(2)} ${arrow(s.priceTrend.culture)}</span>
    `;

    this.chipsEl.innerHTML = `
      <div class="chip"><span class="chip-label">Population</span><strong>${formatPopulation(s.population)}</strong></div>
      <div class="chip"><span class="chip-label">Trade routes</span><strong>${s.routeCount}</strong></div>
      <div class="chip"><span class="chip-label">Breakthroughs</span><strong>${s.inventionCount}</strong></div>
      <div class="chip ${s.decisionCount ? "chip-alert" : ""}"><span class="chip-label">Decisions</span><strong>${s.decisionCount}</strong></div>
      <div class="chip ${s.foodStress > 0.35 ? "chip-warn" : ""}"><span class="chip-label">Food stress</span><strong>${formatPct(s.foodStress)}</strong></div>
    `;
  }

  private setRing(el: HTMLElement, ratio: number, color: string): void {
    const r = 16;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(1, ratio));
    el.setAttribute("stroke", color);
    el.setAttribute("stroke-dasharray", `${c * clamped} ${c}`);
    el.setAttribute("stroke-dashoffset", `${c * 0.25}`);
  }
}
