import { distanceMeters } from "../intermunicipality/proximity.ts";

// Which of a municipality's own stations should go, and with how many trucks.
// Distance is straight-line from the report's GPS point, since road distance
// is not known. The recommendation is the nearest staffed station for
// low/moderate/high danger, and all staffed local stations for critical
// danger. A town with one station has no station to choose, but its truck
// quantity still follows the Level of Danger. Truck quantities use the
// serviceable inventory; the officer confirms availability and decides what
// to dispatch.

export type NearestStationCandidate = {
  id: string;
  stationName: string;
  latitude: number;
  longitude: number;
  activePersonnelCount: number;
  serviceableTruckCount?: number | null;
};

export type RankedStation<S extends NearestStationCandidate> = S & {
  distanceMeters: number | null;
  recommended: boolean;
  /** null means the inventory is unknown; zero means no truck is recommended. */
  recommendedTruckCount: number | null;
  /** The station name without the "· Head: …" suffix it is stored with. */
  displayName: string;
  head: string | null;
};

const HEAD_SUFFIX = /^(.*?)\s*(?:·\s*Head:\s*|\(Head:\s*|\s*-\s*Head:\s*)(.*?)\)?$/i;

function splitHead(stationName: string) {
  const match = HEAD_SUFFIX.exec(stationName);
  return match ? { displayName: match[1].trim(), head: match[2].trim() || null } : { displayName: stationName, head: null };
}

function usable(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

export function rankStationsForIncident<S extends NearestStationCandidate>(
  incident: { latitude: number; longitude: number; calculatedSeverity?: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | null },
  stations: readonly S[],
): RankedStation<S>[] | null {
  if (stations.length === 0) return null;
  const located = usable(incident.latitude, incident.longitude);
  const ranked = stations
    .map((station, index) => ({
      index,
      station,
      distance: located && usable(station.latitude, station.longitude)
        ? distanceMeters(incident.latitude, incident.longitude, station.latitude, station.longitude)
        : null,
    }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.index - b.index);
  const crewOnly = incident.calculatedSeverity === "LOW";
  const allStations = incident.calculatedSeverity === "CRITICAL";
  const eligible = (station: S) => station.activePersonnelCount > 0
    && (crewOnly || station.serviceableTruckCount == null || station.serviceableTruckCount > 0);
  // A lone station is not compared with any other, so it needs no distance.
  const recommendedId = ranked.find((entry) => (entry.distance !== null || ranked.length === 1) && eligible(entry.station))?.station.id;
  return ranked.map(({ station, distance }) => {
    const recommended = allStations ? eligible(station) : station.id === recommendedId;
    const recommendedTruckCount = !recommended || crewOnly ? 0
      : station.serviceableTruckCount == null ? null
      : incident.calculatedSeverity === "HIGH" || allStations ? station.serviceableTruckCount : 1;
    return {
      ...station,
      ...splitHead(station.stationName),
      distanceMeters: distance,
      recommended,
      recommendedTruckCount,
    };
  });
}

export function formatStationDistance(meters: number | null) {
  if (meters === null) return "Distance unknown";
  if (meters < 1000) return `${Math.round(meters / 50) * 50} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
