import { NextResponse } from 'next/server';

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const latitude = Number(requestUrl.searchParams.get('lat'));
  const longitude = Number(requestUrl.searchParams.get('lon'));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
  }

  const query = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    zoom: '18',
    addressdetails: '1',
  });

  try {
    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${query.toString()}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
        'User-Agent': 'ALAB Fire Response System/1.0 (resident location lookup)',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Address lookup is temporarily unavailable.' }, { status: 502 });
    }

    const payload = await response.json();
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Address lookup is temporarily unavailable.' }, { status: 502 });
  }
}
