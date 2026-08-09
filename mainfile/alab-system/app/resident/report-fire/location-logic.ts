export const TARGET_ACCURACY_METERS = 50;
export const ACCEPTABLE_ACCURACY_METERS = 150;
export const REFINEMENT_WINDOW_MS = 10_000;

export type LocationReading = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};

export type LocationQuality = 'precise' | 'approximate' | 'poor';

export type ResolvedAddress = {
  barangay: string;
  municipality: string;
  isAntique: boolean;
};

export type ReverseGeocodePlace = {
  name?: string;
  address?: Record<string, string>;
};

const ANTIQUE_BOUNDS = {
  south: 10.2712376,
  west: 121.1450673,
  north: 12.279476,
  east: 122.332383,
};

export function isWithinAntiqueBounds(reading: LocationReading): boolean {
  return reading.latitude >= ANTIQUE_BOUNDS.south
    && reading.latitude <= ANTIQUE_BOUNDS.north
    && reading.longitude >= ANTIQUE_BOUNDS.west
    && reading.longitude <= ANTIQUE_BOUNDS.east;
}

export function chooseBetterReading(
  current: LocationReading | null,
  candidate: LocationReading,
): LocationReading {
  if (!current) return candidate;

  const currentIsInAntique = isWithinAntiqueBounds(current);
  const candidateIsInAntique = isWithinAntiqueBounds(candidate);
  if (currentIsInAntique !== candidateIsInAntique) {
    return candidateIsInAntique ? candidate : current;
  }

  return candidate.accuracy < current.accuracy ? candidate : current;
}

export function classifyAccuracy(accuracy: number): LocationQuality {
  if (accuracy <= TARGET_ACCURACY_METERS) return 'precise';
  if (accuracy <= ACCEPTABLE_ACCURACY_METERS) return 'approximate';
  return 'poor';
}

export function resolvePhilippineAddress(address: Record<string, string>): ResolvedAddress {
  const explicitBarangay = Object.values(address)
    .find((value) => /\bbarangay\b/i.test(value));
  const barangay = explicitBarangay
    || address.village
    || address.suburb
    || address.quarter
    || address.neighbourhood
    || address.hamlet
    || '';
  const municipality = address.municipality
    || address.city
    || address.town
    || '';
  const isAntique = address['ISO3166-2-lvl4'] === 'PH-ANT'
    || address.state?.trim().toLowerCase() === 'antique';

  return { barangay, municipality, isAntique };
}

export function resolveNearestLandmark(place: ReverseGeocodePlace): string {
  const address = place.address ?? {};
  const candidates = [
    place.name,
    address.amenity,
    address.shop,
    address.tourism,
    address.historic,
    address.leisure,
    address.office,
    address.building,
    address.road,
  ];

  return candidates.find((value) => {
    const normalized = value?.trim().toLowerCase();
    return Boolean(normalized && !['yes', 'no', 'building', 'house'].includes(normalized));
  })?.trim() ?? '';
}
