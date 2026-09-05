import { NextResponse } from 'next/server';

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

export const dynamic = 'force-dynamic';

type CachedGeocode = {
  payload: unknown;
  timestamp: number;
};

const geocodeCache = new Map<string, CachedGeocode>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 1500;

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

  const query = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    zoom: '18',
    addressdetails: '1',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${query.toString()}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
        'User-Agent': 'ALAB Fire Response System/1.0 (resident location lookup)',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const payload = await response.json();
      if (geocodeCache.size > MAX_CACHE_SIZE) {
        geocodeCache.clear();
      }
      geocodeCache.set(cacheKey, { payload, timestamp: now });
      return NextResponse.json(payload, {
        headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400' },
      });
    }
  } catch {
    clearTimeout(timeoutId);
  }

  const isAntique = latitude >= ANTIQUE_BOUNDS.south
    && latitude <= ANTIQUE_BOUNDS.north
    && longitude >= ANTIQUE_BOUNDS.west
    && longitude <= ANTIQUE_BOUNDS.east;

  if (isAntique) {
    const nearestMuni = getNearestAntiqueMunicipality(latitude, longitude);
    const fallbackPayload = {
      name: nearestMuni,
      display_name: `${nearestMuni}, Antique, Philippines`,
      address: {
        municipality: nearestMuni,
        county: 'Antique',
        state: 'Antique',
        'ISO3166-2-lvl4': 'PH-ANT',
        country: 'Philippines',
      },
    };
    geocodeCache.set(cacheKey, { payload: fallbackPayload, timestamp: now });
    return NextResponse.json(fallbackPayload, {
      headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400' },
    });
  }

  return NextResponse.json({ error: 'Address lookup is temporarily unavailable.' }, { status: 502 });
}
