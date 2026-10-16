import { describe, expect, it } from "vitest";
import { pushEvent } from "./events";
import { generateWorld } from "./worldGen";

describe("events", () => {
  it("keeps at most 100 events", () => {
    const world = generateWorld(1);
    for (let i = 0; i < 120; i++) {
      pushEvent(world, {
        day: world.day,
        category: "economy",
        title: `Event ${i}`,
        body: "test",
        entityIds: [],
        pactIds: [],
        severity: "info",
      });
    }
    expect(world.events.length).toBe(100);
    expect(world.events[0]!.title).toBe("Event 20");
  });
});
