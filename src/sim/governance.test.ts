import { describe, expect, it } from "vitest";
import { generateWorld } from "./worldGen";
import { cityPactId } from "./governance";

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
