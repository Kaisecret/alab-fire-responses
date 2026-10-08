import { locateAntiqueBarangay, nearbyAntiqueBarangays } from "../locations/barangay-locator.ts";

/**
 * The PSA boundaries are simplified, so a station on the edge of its town can
 * fall a little outside it. Further than this is a station saved in the wrong
 * place, such as Hamtic's "May Bato" station pinned in San Jose.
 */
const BORDER_TOLERANCE_METERS = 500;

type PlacedStation = { latitude: number; longitude: number; municipalityName: string };

const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Whether a station's pin lies in (or just beside) its own municipality. */
export function stationInOwnMunicipality(station: PlacedStation) {
  const own = key(station.municipalityName);
  const located = locateAntiqueBarangay(station.latitude, station.longitude);
  if (!located) return false;
  if (key(located.municipality) === own) return true;
  return nearbyAntiqueBarangays(station.latitude, station.longitude, BORDER_TOLERANCE_METERS)
    .some((place) => key(place.municipality) === own);
}

/**
 * Stations that can stand for their municipality when measuring how far it
 * is from a fire. A station pinned in another town would make its own town
 * look next door to every fire there.
 */
export function keepStationsInOwnMunicipality<T extends PlacedStation>(stations: T[]): T[] {
  return stations.filter((station) => {
    if (stationInOwnMunicipality(station)) return true;
    console.warn("Ignoring a station pinned outside its municipality", {
      municipality: station.municipalityName,
      latitude: station.latitude,
      longitude: station.longitude,
    });
    return false;
  });
}

/** Refuses a station position outside the station's own municipality. */
export function assertStationInMunicipality(latitude: number, longitude: number, municipalityName: string) {
  if (!stationInOwnMunicipality({ latitude, longitude, municipalityName })) {
    throw new Error("INVALID_STATION_OUTSIDE_MUNICIPALITY");
  }
}
