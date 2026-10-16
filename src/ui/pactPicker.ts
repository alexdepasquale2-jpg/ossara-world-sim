import type { Pact } from "../sim/types";

function pactColorCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function showPactPicker(
  pacts: Pact[],
  onChoose: (pactId: string) => void,
): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "pact-picker-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Choose your patron pact");

  const card = document.createElement("div");
  card.className = "pact-picker-card";

  const title = document.createElement("h2");
  title.className = "pact-picker-title";
  title.textContent = "Choose your patron pact";

  const subtitle = document.createElement("p");
  subtitle.className = "pact-picker-subtitle";
  subtitle.textContent =
    "Your alliance shapes trade, borders, and research across the continent.";

  const list = document.createElement("div");
  list.className = "pact-picker-list";

  for (const pact of pacts) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pact-picker-option";
    btn.dataset.pactId = pact.id;

    const swatch = document.createElement("span");
    swatch.className = "pact-picker-swatch";
    swatch.style.backgroundColor = pactColorCss(pact.color);

    const meta = document.createElement("span");
    meta.className = "pact-picker-meta";

    const name = document.createElement("span");
    name.className = "pact-picker-name";
    name.textContent = pact.name;

    const detail = document.createElement("span");
    detail.className = "pact-picker-detail";
    detail.textContent = `${pact.memberCityIds.length} member cities`;

    meta.append(name, detail);
    btn.append(swatch, meta);

    btn.addEventListener("click", () => {
      onChoose(pact.id);
      overlay.remove();
    });

    list.appendChild(btn);
  }

  card.append(title, subtitle, list);
  overlay.appendChild(card);
  return overlay;
}
