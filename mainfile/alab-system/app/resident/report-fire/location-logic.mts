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

export function chooseBetterReading(
  current: LocationReading | null,
  candidate: LocationReading,
): LocationReading {
  return !current || candidate.accuracy < current.accuracy ? candidate : current;
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
