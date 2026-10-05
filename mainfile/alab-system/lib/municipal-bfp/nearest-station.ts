import { distanceMeters } from "../intermunicipality/proximity.ts";

// Which of a municipality's own stations is nearest the fire. Only a
// municipality with two or more stations has a choice to make; one station is
// dispatched by the button itself. Distance is straight-line from the report's
// GPS point, since road distance is not known. The recommendation is the
// nearest station with someone on duty, and it is advice: the officer decides.

export type NearestStationCandidate = {
  id: string;
  stationName: string;
  latitude: number;
  longitude: number;
  activePersonnelCount: number;
};

export type RankedStation<S extends NearestStationCandidate> = S & {
  distanceMeters: number | null;
  recommended: boolean;
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
  incident: { latitude: number; longitude: number },
  stations: readonly S[],
): RankedStation<S>[] | null {
  if (stations.length < 2) return null;
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
  const recommendedId = ranked.find((entry) => entry.distance !== null && entry.station.activePersonnelCount > 0)?.station.id;
  return ranked.map(({ station, distance }) => ({
    ...station,
    ...splitHead(station.stationName),
    distanceMeters: distance,
    recommended: station.id === recommendedId,
  }));
}

export function formatStationDistance(meters: number | null) {
  if (meters === null) return "Distance unknown";
  if (meters < 1000) return `${Math.round(meters / 50) * 50} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
