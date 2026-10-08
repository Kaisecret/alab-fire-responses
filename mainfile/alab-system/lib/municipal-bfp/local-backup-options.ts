import { distanceMeters } from "../intermunicipality/proximity.ts";

export type LocalStationInput = {
  id: string;
  stationName: string;
  latitude: number;
  longitude: number;
  activePersonnelCount: number;
  /** Already part of the dispatch the request is for. */
  onThisFire: boolean;
  /** Part of another active dispatch. */
  busyElsewhere: boolean;
};

export type LocalStationStatus = "AVAILABLE" | "BUSY" | "ON_THIS_FIRE" | "NO_CREW";

export type LocalStationCard = {
  id: string;
  name: string;
  head: string | null;
  distanceMeters: number;
  activePersonnelCount: number;
  status: LocalStationStatus;
  selectable: boolean;
  recommended: boolean;
};

/** "Dalipe Fire Sub-Station · Head: SFO3 Edgardo P. Villareal" → its name and its head. */
export function splitStationHead(stationName: string) {
  const [name, head] = stationName.split(/\s*·\s*Head:\s*/);
  return { name: name.trim(), head: head?.trim() || null };
}

function statusOf(station: LocalStationInput): LocalStationStatus {
  if (station.onThisFire) return "ON_THIS_FIRE";
  if (station.activePersonnelCount < 1) return "NO_CREW";
  return station.busyElsewhere ? "BUSY" : "AVAILABLE";
}

/**
 * One card per station of the responder's town, nearest the fire first. The
 * nearest free station is recommended; a busy one only when none is free,
 * since pulling a crew off another fire is the officer's call to make.
 */
export function buildLocalStationCards(
  stations: LocalStationInput[],
  fire: { latitude: number; longitude: number },
): LocalStationCard[] {
  const cards = stations
    .map((station): LocalStationCard => {
      const status = statusOf(station);
      return {
        id: station.id,
        ...splitStationHead(station.stationName),
        distanceMeters: Math.round(distanceMeters(fire.latitude, fire.longitude, station.latitude, station.longitude)),
        activePersonnelCount: station.activePersonnelCount,
        status,
        selectable: status === "AVAILABLE" || status === "BUSY",
        recommended: false,
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters || a.name.localeCompare(b.name));
  const pick = cards.find((card) => card.status === "AVAILABLE") ?? cards.find((card) => card.status === "BUSY");
  if (pick) pick.recommended = true;
  return cards;
}

/** Local backup needs a town with two or more stations and one that can still go. */
export function isLocalBackupEligible(cards: LocalStationCard[]) {
  return cards.length >= 2 && cards.some((card) => card.selectable);
}
