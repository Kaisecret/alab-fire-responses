import { distanceMeters } from "../intermunicipality/proximity";
import type { StationCandidate } from "../intermunicipality/types";

/*
 * Who answers at each alarm level.
 *
 * The levels are a standing order about reach, not a severity score. The first
 * is the municipality's own response and is raised by the report itself, so it
 * is never declared by hand. Each level above it widens the call for mutual
 * aid, and the province is the only one who may declare them.
 *
 * Reach is measured from the fire, not from the municipal hall. A fire in
 * Hamtic near the San Jose line is closer to San Jose's station than to some of
 * Hamtic's own, and the second alarm has to summon whoever can actually get
 * there first.
 */

/** The province's own alarms end at the fourth; the fifth is Region VI's. */
export const MAX_ALARM_LEVEL = 4;

/** The first alarm is the origin municipality answering its own report. */
export const AUTOMATIC_ALARM_LEVEL = 1;

/** The lowest level a person may declare. */
export const FIRST_DECLARABLE_ALARM_LEVEL = 2;

/**
 * How far "nearby" reaches for a third alarm. Chosen as a mutual-aid driving
 * distance rather than a boundary: Antique's municipalities are long and thin,
 * so a neighbour's nearest station can be further than a non-neighbour's.
 */
export const NEARBY_RADIUS_METERS = 25_000;

export type AlarmLevel = 1 | 2 | 3 | 4;

export type AlarmReach =
  | "ORIGIN_ONLY"
  | "NEAREST_MUNICIPALITY"
  | "MUNICIPALITIES_WITHIN_RADIUS"
  | "WHOLE_PROVINCE";

export type AlarmLevelDefinition = {
  level: AlarmLevel;
  reach: AlarmReach;
  /** Shown on the button the province presses. */
  label: string;
  /** One line saying who this actually calls. */
  summary: string;
  declarable: boolean;
};

export const ALARM_DOCTRINE: Record<AlarmLevel, AlarmLevelDefinition> = {
  1: {
    level: 1,
    reach: "ORIGIN_ONLY",
    label: "1st alarm",
    summary: "The municipality's own stations. Raised by the report itself.",
    declarable: false,
  },
  2: {
    level: 2,
    reach: "NEAREST_MUNICIPALITY",
    label: "2nd alarm",
    summary: "The municipality nearest the fire.",
    declarable: true,
  },
  3: {
    level: 3,
    reach: "MUNICIPALITIES_WITHIN_RADIUS",
    label: "3rd alarm",
    summary: `Every municipality within ${NEARBY_RADIUS_METERS / 1000} km of the fire.`,
    declarable: true,
  },
  4: {
    level: 4,
    reach: "WHOLE_PROVINCE",
    label: "4th alarm",
    summary: "Every municipality in the province.",
    declarable: true,
  },
};

/** The levels a person may declare, in order. */
export const DECLARABLE_ALARM_LEVELS: AlarmLevelDefinition[] = [2, 3, 4].map(
  (level) => ALARM_DOCTRINE[level as AlarmLevel],
);

export type AlarmCandidate = StationCandidate & {
  distanceMeters: number;
};

export type ResolveAlarmSummonsInput = {
  level: AlarmLevel;
  latitude: number;
  longitude: number;
  originMunicipalityId: string;
  /** Active stations of every municipality other than the origin. */
  stations: StationCandidate[];
  /** Municipalities a lower alarm already called, which are not called twice. */
  alreadySummonedMunicipalityIds?: string[];
};

function validCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

/**
 * The nearest station of each municipality, with its distance from the fire.
 * A municipality is represented by whichever of its stations is closest, since
 * that is the one that would actually roll.
 */
function nearestStationPerMunicipality(
  stations: StationCandidate[],
  latitude: number,
  longitude: number,
  originMunicipalityId: string,
): AlarmCandidate[] {
  const nearest = new Map<string, AlarmCandidate>();

  for (const station of stations) {
    if (station.municipalityId === originMunicipalityId) continue;
    if (!validCoordinate(station.latitude, station.longitude)) continue;

    const candidate: AlarmCandidate = {
      ...station,
      distanceMeters: distanceMeters(latitude, longitude, station.latitude, station.longitude),
    };

    const held = nearest.get(station.municipalityId);
    if (
      !held
      || candidate.distanceMeters < held.distanceMeters
      // Ties settle on station id so the same fire always calls the same station.
      || (candidate.distanceMeters === held.distanceMeters
        && candidate.stationId.localeCompare(held.stationId) < 0)
    ) {
      nearest.set(station.municipalityId, candidate);
    }
  }

  return [...nearest.values()].sort((left, right) => (
    left.distanceMeters === right.distanceMeters
      ? left.municipalityId.localeCompare(right.municipalityId)
      : left.distanceMeters - right.distanceMeters
  ));
}

/**
 * Which municipalities a given alarm level calls for this fire.
 *
 * Returns only municipalities not already called by a lower level, so raising
 * an alarm summons the newly reached ones and leaves the rest alone rather than
 * asking twice.
 */
export function resolveAlarmSummons(input: ResolveAlarmSummonsInput): AlarmCandidate[] {
  if (!validCoordinate(input.latitude, input.longitude)) {
    throw new Error("INVALID_INCIDENT_COORDINATES");
  }

  const definition = ALARM_DOCTRINE[input.level];
  if (!definition) throw new Error("INVALID_ALARM_LEVEL");

  // The first alarm is the origin's own crews; it calls no one else.
  if (definition.reach === "ORIGIN_ONLY") return [];

  const already = new Set(input.alreadySummonedMunicipalityIds ?? []);
  const ranked = nearestStationPerMunicipality(
    input.stations,
    input.latitude,
    input.longitude,
    input.originMunicipalityId,
  ).filter((candidate) => !already.has(candidate.municipalityId));

  switch (definition.reach) {
    case "NEAREST_MUNICIPALITY":
      return ranked.slice(0, 1);
    case "MUNICIPALITIES_WITHIN_RADIUS":
      return ranked.filter((candidate) => candidate.distanceMeters <= NEARBY_RADIUS_METERS);
    case "WHOLE_PROVINCE":
      return ranked;
    default:
      return [];
  }
}

/** Whether a person may declare this level at all. */
export function isDeclarableAlarmLevel(level: number): level is AlarmLevel {
  return Number.isInteger(level)
    && level >= FIRST_DECLARABLE_ALARM_LEVEL
    && level <= MAX_ALARM_LEVEL;
}
