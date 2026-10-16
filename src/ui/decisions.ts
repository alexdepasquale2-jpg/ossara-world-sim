import type { World } from "../sim/types";
import { resolveDecision } from "../sim/governance";

export interface DecisionCallbacks {
  onResolved: () => void;
}

export function renderDecisionCard(
  container: HTMLElement,
  world: World,
  callbacks: DecisionCallbacks,
): void {
  container.innerHTML = "";
  const pending = world.decisions[0];
  if (!pending) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.className = "decision-card";
  container.innerHTML = `
    <div class="decision-head">
      <span class="decision-tag">Decision</span>
      <span class="decision-deadline">Due day ${pending.deadlineDay}</span>
    </div>
    <h3>${pending.title}</h3>
    <p>${pending.body}</p>
    <div class="decision-actions">
      <button type="button" class="btn primary" data-action="approve">Approve</button>
      <button type="button" class="btn ghost" data-action="deny">Deny</button>
      <button type="button" class="btn ghost" data-action="defer">Defer</button>
    </div>
  `;

  container.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = (btn as HTMLElement).dataset.action as
        | "approve"
        | "deny"
        | "defer";
      resolveDecision(world, pending.id, action);
      callbacks.onResolved();
    });
  });
}

export function pendingDecisionCount(world: World): number {
  return world.decisions.length;
}
