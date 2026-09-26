import type { RouteAccessibility } from "./severity";

type Situation = { density: boolean; route: RouteAccessibility | null };

const situations: Record<string, Situation> = {
  HOUSE_BUILDING: { density: true, route: "INTERIOR_ALLEY_ESKINITA" },
  GRASS: { density: false, route: "DEAD_END_OR_BLOCKED" },
  FOREST: { density: false, route: "DEAD_END_OR_BLOCKED" },
  VEHICLE: { density: true, route: "NARROW_STREET" },
  OTHER: { density: true, route: null },
};

export function situationForFireType(fireType: string | null | undefined): Situation {
  return fireType ? situations[fireType] ?? { density: false, route: null } : { density: false, route: null };
}

export function filterSituationForFireType(
  fireType: string | null | undefined,
  density: string | null,
  route: string | null,
) {
  const options = situationForFireType(fireType);
  return {
    density: options.density && density === "PACKED_MAGKAKADIKIT" ? density : null,
    route: options.route && route === options.route ? route : null,
  };
}
