import { positionAlongRoute } from "./economy";
import type { GeoEntity, Resident, World } from "./types";
import { Rng } from "./rng";

const rng = new Rng(9001);

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function cityForResident(world: World, r: Resident): GeoEntity | undefined {
  return world.entities.find((e) => e.id === r.cityId && e.kind === "city");
}

export function tickAgents(world: World): void {
  const routeByMerchant = new Map(
    world.routes
      .filter((route) => route.merchantResidentId)
      .map((route) => [route.merchantResidentId as string, route]),
  );

  for (const r of world.residents) {
    const tradeRoute = routeByMerchant.get(r.id);
    if (tradeRoute) {
      const pos = positionAlongRoute(world, tradeRoute, tradeRoute.progress);
      if (pos) {
        r.x = pos.x;
        r.y = pos.y;
        r.targetX = pos.x;
        r.targetY = pos.y;
      }
      continue;
    }

    const city = cityForResident(world, r);
    if (!city) continue;

    const dx = r.targetX - r.x;
    const dy = r.targetY - r.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2 || rng.next() < 0.02) {
      r.targetX = rng.range(
        city.bounds.x + 4,
        city.bounds.x + city.bounds.w - 4,
      );
      r.targetY = rng.range(
        city.bounds.y + 4,
        city.bounds.y + city.bounds.h - 4,
      );
      if (r.role === "artist" && rng.next() < 0.35) {
        const piece = world.art.find((a) => a.cityId === city.id);
        if (piece) {
          r.targetX = piece.x;
          r.targetY = piece.y;
        }
      }
    } else {
      const speed = r.role === "merchant" ? 1.8 : 1.2;
      r.x += (dx / dist) * speed;
      r.y += (dy / dist) * speed;
    }

    const artNearby = world.art.some(
      (a) =>
        a.cityId === r.cityId && Math.hypot(a.x - r.x, a.y - r.y) < 18,
    );
    r.mood = clamp(
      r.mood + (artNearby ? 0.002 : -0.0005) + (rng.next() - 0.5) * 0.001,
      0.15,
      1,
    );
  }

  for (const city of world.entities.filter((e) => e.kind === "city")) {
    const cityArt = world.art.filter((a) => a.cityId === city.id);
    const cityPeople = world.residents.filter((r) => r.cityId === city.id);
    const artBoost =
      cityArt.reduce((s, a) => s + a.influence, 0) / Math.max(1, cityArt.length);
    const moodAvg =
      cityPeople.reduce((s, p) => s + p.mood, 0) /
      Math.max(1, cityPeople.length);

    city.stats.artIndex = clamp(
      city.stats.artIndex + artBoost * 0.0004 - 0.0001,
      0.05,
      1,
    );
    city.stats.happiness = clamp(moodAvg * 0.7 + city.stats.artIndex * 0.3, 0.1, 1);
    city.stats.economy = clamp(
      city.stats.economy +
        cityPeople.filter((p) => p.role === "merchant").length * 0.0002 -
        0.00015,
      0.1,
      1,
    );
    if (world.tick % 240 === 0 && rng.next() < 0.3) {
      city.stats.population += rng.int(-5, 12);
    }
  }
}
