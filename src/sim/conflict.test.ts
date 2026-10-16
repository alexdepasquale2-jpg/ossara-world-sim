import { describe, expect, it } from "vitest";
import { adjustPactTension } from "./governance";
import { tickConflict } from "./conflict";
import { generateWorld } from "./worldGen";
import { Rng } from "./rng";

describe("conflict", () => {
  it("queues pre-clash decision when tension is high", () => {
    const world = generateWorld(3);
    world.playerPactId = world.pacts[0]?.id ?? null;
    const other = world.pacts[1];
    if (!world.playerPactId || !other) return;
    adjustPactTension(world, world.playerPactId, other.id, 75);
    tickConflict(world, new Rng(2));
    expect(world.decisions.some((d) => d.type === "preClash")).toBe(true);
  });
});
