import type { RouteAccessibility } from "./severity";

type Situation = { density: boolean; route: RouteAccessibility | null };

const situations: Record<string, Situation> = {
  HOUSE_BUILDING: { density: true, route: "INTERIOR_ALLEY_ESKINITA" },
  GRASS: { density: false, route: "DEAD_END_OR_BLOCKED" },
  FOREST: { density: false, route: "DEAD_END_OR_BLOCKED" },
  VEHICLE: { density: true, route: "NARROW_STREET" },
  OTHER: { density: true, route: null },
};

/** A resident may report up to this many kinds of fire at one place. */
export const MAX_FIRE_TYPES = 3;

export function situationForFireType(fireType: string | null | undefined): Situation {
  return fireType ? situations[fireType] ?? { density: false, route: null } : { density: false, route: null };
}

/**
 * The quick details that fit any of the selected fire types. The road
 * choice follows the first selected type that has one.
 */
export function situationForFireTypes(fireTypes: readonly string[]): Situation {
  const options = fireTypes.map(situationForFireType);
  return {
    density: options.some((option) => option.density),
    route: options.find((option) => option.route)?.route ?? null,
  };
}

function filterSituation(options: Situation, density: string | null, route: string | null) {
  return {
    density: options.density && density === "PACKED_MAGKAKADIKIT" ? density : null,
    route: options.route && route === options.route ? route : null,
  };
}

export function filterSituationForFireType(
  fireType: string | null | undefined,
  density: string | null,
  route: string | null,
) {
  return filterSituation(situationForFireType(fireType), density, route);
}

export function filterSituationForFireTypes(fireTypes: readonly string[], density: string | null, route: string | null) {
  return filterSituation(situationForFireTypes(fireTypes), density, route);
}
