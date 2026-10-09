import type { NearbyMunicipalityCandidate } from "./types";

/**
 * Towns that always watch a municipality's fires, whatever the distance.
 *
 * San Jose sits between Hamtic and Sibalom, and its fires are watched by
 * those two. Measured alone, a fire in north San Jose such as Funda-Dalipe
 * would pick Belison over Hamtic. A town without an entry here is watched by
 * the towns nearest the fire.
 */
const OBSERVER_PAIRINGS: Record<string, string[]> = {
  sanjosedebuenavista: ["Hamtic", "Sibalom"],
  sanjose: ["Hamtic", "Sibalom"],
};

const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * The towns that watch a fire: the origin's paired towns first, then the
 * nearest others. A paired town drops out when it has no eligible station in
 * `ranked`, and the next nearest town takes its place.
 */
export function chooseObserverMunicipalities(
  ranked: NearbyMunicipalityCandidate[],
  originMunicipalityName: string,
  limit: number,
): NearbyMunicipalityCandidate[] {
  const paired = (OBSERVER_PAIRINGS[key(originMunicipalityName)] ?? []).map(key);
  const pairedCandidates = paired
    .map((name) => ranked.find((candidate) => key(candidate.municipalityName) === name))
    .filter((candidate): candidate is NearbyMunicipalityCandidate => Boolean(candidate));
  const others = ranked.filter((candidate) => !pairedCandidates.includes(candidate));
  return [...pairedCandidates, ...others].slice(0, Math.max(0, Math.trunc(limit)));
}
