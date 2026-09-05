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

import { antiqueBarangays } from '../../_content/antique-barangays.ts';

const OFFICIAL_MUNICIPALITIES = Object.keys(antiqueBarangays);
const MUNICIPALITY_ALIASES: Record<string, string> = {
  'san jose': 'San Jose de Buenavista',
  'san jose antique': 'San Jose de Buenavista',
  'dao': 'Tobias Fornier',
  'valderama': 'Valderrama',
  'lauaan': 'Laua-an',
};

function normalizeTokens(str: string): string {
  return str
    .normalize('NFKD')
    .toLowerCase()
    .replace(/\b(barangay|brgy\.?|bgy\.?)\b/gi, '')
    .replace(/\bnorth\b/g, 'norte')
    .replace(/\bsouth\b/g, 'sur')
    .replace(/\beast\b/g, 'este')
    .replace(/\bwest\b/g, 'weste')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

function resolveCanonicalMunicipality(raw: string): string {
  if (!raw) return '';
  const clean = raw.replace(/\b(municipality|bayan|city)\s+of\b/gi, '').trim().toLowerCase();
  for (const m of OFFICIAL_MUNICIPALITIES) {
    if (m.toLowerCase() === clean) return m;
  }
  if (MUNICIPALITY_ALIASES[clean]) return MUNICIPALITY_ALIASES[clean];
  for (const m of OFFICIAL_MUNICIPALITIES) {
    const mLower = m.toLowerCase();
    if (mLower.includes(clean) || clean.includes(mLower)) return m;
  }
  return raw;
}

export function resolvePhilippineAddress(
  address: Record<string, string>,
  displayNameOrPlace?: string | ReverseGeocodePlace,
): ResolvedAddress {
  const displayName = typeof displayNameOrPlace === 'string'
    ? displayNameOrPlace
    : (displayNameOrPlace?.name || '');

  // 1. Resolve Municipality
  const rawMunicipality = address.municipality
    || address.city
    || address.town
    || '';
  let municipality = resolveCanonicalMunicipality(rawMunicipality);

  if (!municipality || !(municipality in antiqueBarangays)) {
    for (const m of OFFICIAL_MUNICIPALITIES) {
      const reg = new RegExp('\\b' + m + '\\b', 'i');
      if (reg.test(displayName) || (address.county && reg.test(address.county))) {
        municipality = m;
        break;
      }
    }
  }

  const isAntique = municipality in antiqueBarangays
    || address['ISO3166-2-lvl4'] === 'PH-ANT'
    || address.state?.trim().toLowerCase() === 'antique'
    || address.county?.trim().toLowerCase() === 'antique'
    || address.province?.trim().toLowerCase() === 'antique';

  // 2. Resolve Barangay
  const explicitBarangay = Object.entries(address)
    .filter(([k]) => !['road', 'amenity', 'shop', 'tourism', 'building', 'country', 'state', 'region', 'postcode'].includes(k))
    .map(([, v]) => v)
    .find((value) => /\bbarangay\b/i.test(value));

  const candidates = [
    explicitBarangay,
    address.village,
    address.quarter,
    address.suburb,
    address.city_district,
    address.district,
    address.hamlet,
    address.neighbourhood,
    address.residential,
    ...(displayName ? displayName.split(',').map((s) => s.trim()) : []),
  ].filter(Boolean) as string[];

  let barangay = '';
  if (municipality && antiqueBarangays[municipality]) {
    const mBrgys = antiqueBarangays[municipality];
    for (const c of candidates) {
      const cNorm = normalizeTokens(c);
      if (!cNorm) continue;
      const found = mBrgys.find((b) => normalizeTokens(b) === cNorm);
      if (found) {
        barangay = found;
        break;
      }
    }
  }

  if (!barangay && isAntique) {
    for (const c of candidates) {
      const cNorm = normalizeTokens(c);
      if (!cNorm) continue;
      for (const [mName, mBrgys] of Object.entries(antiqueBarangays)) {
        const found = mBrgys.find((b) => normalizeTokens(b) === cNorm);
        if (found) {
          barangay = found;
          if (!municipality) municipality = mName;
          break;
        }
      }
      if (barangay) break;
    }
  }

  if (!barangay) {
    barangay = explicitBarangay
      || address.village
      || address.suburb
      || address.quarter
      || address.neighbourhood
      || address.hamlet
      || '';
  }

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
