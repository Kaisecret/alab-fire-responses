import type {
  NearbyMunicipalityCandidate,
  StationCandidate,
} from "./types";

type IncidentPoint = {
  latitude: number;
  longitude: number;
  originMunicipalityId: string;
};

function validCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

export function distanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(toLatitude - fromLatitude);
  const longitudeDelta = radians(toLongitude - fromLongitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(fromLatitude))
    * Math.cos(radians(toLatitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  const meters = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(meters * 100) / 100;
}

export function rankNearbyMunicipalities(
  stations: StationCandidate[],
  incident: IncidentPoint,
  limit = 2,
): NearbyMunicipalityCandidate[] {
  if (!validCoordinate(incident.latitude, incident.longitude)) {
    throw new Error("INVALID_INCIDENT_COORDINATES");
  }

  const nearestByMunicipality = new Map<string, NearbyMunicipalityCandidate>();
  for (const station of stations) {
    if (
      station.municipalityId === incident.originMunicipalityId
      || !validCoordinate(station.latitude, station.longitude)
    ) {
      continue;
    }
    const candidate = {
      ...station,
      distanceMeters: distanceMeters(
        incident.latitude,
        incident.longitude,
        station.latitude,
        station.longitude,
      ),
    };
    const current = nearestByMunicipality.get(station.municipalityId);
    if (
      !current
      || candidate.distanceMeters < current.distanceMeters
      || (
        candidate.distanceMeters === current.distanceMeters
        && candidate.stationId.localeCompare(current.stationId) < 0
      )
    ) {
      nearestByMunicipality.set(station.municipalityId, candidate);
    }
  }

  return [...nearestByMunicipality.values()]
    .sort((left, right) => (
      left.distanceMeters - right.distanceMeters
      || left.municipalityId.localeCompare(right.municipalityId)
    ))
    .slice(0, Math.max(0, Math.trunc(limit)));
}
