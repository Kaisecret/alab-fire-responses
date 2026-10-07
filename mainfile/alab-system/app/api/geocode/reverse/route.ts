import { NextResponse } from 'next/server';

import { locateAntiqueBarangay, type LocatedBarangay } from '../../../../lib/locations/barangay-locator';

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

export const dynamic = 'force-dynamic';

const ANTIQUE_BOUNDS = {
  south: 10.2712376,
  west: 121.1450673,
  north: 12.279476,
  east: 122.332383,
};

const ANTIQUE_MUNICIPAL_CENTERS: Record<string, [number, number]> = {
  'Anini-y': [10.431, 121.926],
  'Barbaza': [11.195, 122.037],
  'Belison': [10.837, 121.961],
  'Bugasong': [11.044, 122.064],
  'Caluya': [11.934, 121.548],
  'Culasi': [11.445, 122.057],
  'Tobias Fornier': [10.515, 121.932],
  'Hamtic': [10.704, 121.982],
  'Laua-an': [11.186, 122.111],
  'Libertad': [11.774, 121.92],
  'Pandan': [11.718, 122.093],
  'Patnongon': [10.918, 122.004],
  'San Jose de Buenavista': [10.744, 121.942],
  'San Remigio': [10.82, 122.08],
  'Sebaste': [11.625, 122.095],
  'Sibalom': [10.79, 122.028],
  'Tibiao': [11.289, 122.048],
  'Valderrama': [11.009, 122.047],
};

function getNearestAntiqueMunicipality(lat: number, lon: number): string {
  let closest = 'San Jose de Buenavista';
  let minDistanceSq = Infinity;
  for (const [name, [mLat, mLon]] of Object.entries(ANTIQUE_MUNICIPAL_CENTERS)) {
    const dLat = lat - mLat;
    const dLon = lon - mLon;
    const distSq = dLat * dLat + dLon * dLon;
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      closest = name;
    }
  }
  return closest;
}

// OpenStreetMap's barangay is a guess from the nearest barangay point. The PSA
// boundary is the real answer, so it replaces every barangay-level field.
const OSM_AREA_FIELDS = ['village', 'quarter', 'suburb', 'city_district', 'district', 'hamlet', 'neighbourhood', 'residential', 'city'];

function withOfficialBarangay(payload: { address?: Record<string, string>; [key: string]: unknown }, located: LocatedBarangay | null) {
  if (!located) return payload;
  const address = { ...(payload.address ?? {}) };
  for (const field of OSM_AREA_FIELDS) delete address[field];
  return {
    ...payload,
    address: {
      ...address,
      village: located.barangay,
      town: located.municipality,
      municipality: located.municipality,
      state: 'Antique',
      'ISO3166-2-lvl4': 'PH-ANT',
      country: address.country ?? 'Philippines',
    },
  };
}

type CachedGeocode = {
  payload: Record<string, unknown>;
  timestamp: number;
};

const geocodeCache = new Map<string, CachedGeocode>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_SIZE = 1500;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const latitude = Number(requestUrl.searchParams.get('lat'));
  const longitude = Number(requestUrl.searchParams.get('lon'));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
  }

  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const now = Date.now();
  const cached = geocodeCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.payload, {
      headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400' },
    });
  }

  const located = locateAntiqueBarangay(latitude, longitude);
  const isAntique = latitude >= ANTIQUE_BOUNDS.south
    && latitude <= ANTIQUE_BOUNDS.north
    && longitude >= ANTIQUE_BOUNDS.west
    && longitude <= ANTIQUE_BOUNDS.east;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const query = new URLSearchParams({
      format: 'jsonv2',
      lat: String(latitude),
      lon: String(longitude),
      zoom: '18',
      addressdetails: '1',
    });

    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${query.toString()}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
        'User-Agent': 'ALAB Fire Response System/1.0 (resident location lookup)',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    if (response.ok) {
      const payload = await response.json() as {
        address?: Record<string, string>;
        display_name?: string;
        [key: string]: unknown;
      };

      const addr = payload.address ?? {};
      const hasBarangay = Boolean(
        addr.village
        || addr.quarter
        || addr.suburb
        || addr.city_district
        || addr.district
        || addr.hamlet
        || addr.neighbourhood,
      );

      // If zoom=18 returned a POI/road without barangay, query zoom=16 for administrative boundary
      if (!hasBarangay && isAntique) {
        try {
          const fallbackQuery = new URLSearchParams({
            format: 'jsonv2',
            lat: String(latitude),
            lon: String(longitude),
            zoom: '16',
            addressdetails: '1',
          });
          const fbResponse = await fetch(`${NOMINATIM_REVERSE_URL}?${fallbackQuery.toString()}`, {
            headers: {
              Accept: 'application/json',
              'Accept-Language': 'en',
              'User-Agent': 'ALAB Fire Response System/1.0 (resident location lookup)',
            },
            signal: controller.signal,
            cache: 'no-store',
          });
          if (fbResponse.ok) {
            const fbPayload = await fbResponse.json() as { address?: Record<string, string> };
            payload.address = { ...fbPayload.address, ...payload.address };
          }
        } catch {
          // Ignore secondary fallback errors
        }
      }

      clearTimeout(timeoutId);
      if (geocodeCache.size > MAX_CACHE_SIZE) {
        geocodeCache.clear();
      }
      const official = withOfficialBarangay(payload, located);
      geocodeCache.set(cacheKey, { payload: official, timestamp: now });
      return NextResponse.json(official, {
        headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400' },
      });
    }
  } catch {
    clearTimeout(timeoutId);
  }

  if (isAntique || located) {
    const nearestMuni = located?.municipality ?? getNearestAntiqueMunicipality(latitude, longitude);
    const fallbackPayload = withOfficialBarangay({
      name: nearestMuni,
      display_name: `${nearestMuni}, Antique, Philippines`,
      address: {
        municipality: nearestMuni,
        county: 'Antique',
        state: 'Antique',
        'ISO3166-2-lvl4': 'PH-ANT',
        country: 'Philippines',
      },
    }, located);
    geocodeCache.set(cacheKey, { payload: fallbackPayload, timestamp: now });
    return NextResponse.json(fallbackPayload, {
      headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400' },
    });
  }

  return NextResponse.json({ error: 'Address lookup is temporarily unavailable.' }, { status: 502 });
}
