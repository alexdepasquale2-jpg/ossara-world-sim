import type { SimEvent, World } from "../sim/types";

export interface FeedCallbacks {
  onFocusEntity: (entityId: string) => void;
}

export function renderFeed(
  container: HTMLElement,
  world: World,
  callbacks: FeedCallbacks,
): void {
  container.innerHTML = "";
  const events = world.events.slice(-50).reverse();
  if (events.length === 0) {
    container.innerHTML = `<p class="feed-empty">No civic updates yet. Let the sim run a few days.</p>`;
    return;
  }

  for (const evt of events) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `feed-row severity-${evt.severity}`;
    row.innerHTML = `
      <span class="feed-day">Day ${evt.day}</span>
      <span class="feed-cat">${evt.category}</span>
      <strong class="feed-title">${evt.title}</strong>
      <span class="feed-body">${evt.body}</span>
    `;
    row.addEventListener("click", () => {
      const id = evt.entityIds[0];
      if (id) callbacks.onFocusEntity(id);
    });
    container.appendChild(row);
  }
}

export function feedHasDecisionRows(events: SimEvent[]): boolean {
  return events.some((e) => e.severity === "decision");
}
