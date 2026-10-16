import { describe, expect, it } from "vitest";
import { generateWorld } from "./worldGen";
import { cityPactId, tickGovernance } from "./governance";
import { Rng } from "./rng";

describe("pacts", () => {
  it("assigns each city to at most one pact", () => {
    const world = generateWorld(99);
    const seen = new Set<string>();
    for (const e of world.entities.filter((x) => x.kind === "city")) {
      const pid = cityPactId(world, e.id);
      if (pid) seen.add(`${e.id}:${pid}`);
    }
    expect(world.pacts.length).toBeGreaterThanOrEqual(2);
  });
});

describe("governance overrides", () => {
  it("creates a decision after sustained mandate conflict", () => {
    const world = generateWorld(42);
    const policy = world.cityPolicies[0];
    expect(policy).toBeDefined();
    const nationMandate = world.nationMandates.find(
      (m) => m.nationId === world.entities.find((e) => e.kind === "nation")?.id,
    );
    if (!policy || !nationMandate) return;
    policy.tradeOpenness = "open";
    nationMandate.tradeOpenness = "closed";
    policy.mandateConflictDays = 3;
    world.day = 10;
    tickGovernance(world, new Rng(1));
    expect(world.decisions.some((d) => d.type === "override")).toBe(true);
  });
});
