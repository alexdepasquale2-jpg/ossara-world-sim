import { describe, expect, it } from "vitest";
import { generateWorld } from "./worldGen";
import { tickWorld } from "./engine";

describe("sim smoke", () => {
  it("runs 100 ticks without throwing", () => {
    const world = generateWorld(12345);
    expect(() => {
      for (let i = 0; i < 100; i++) tickWorld(world, 1);
    }).not.toThrow();
    expect(world.tick).toBeGreaterThan(0);
  });
});
