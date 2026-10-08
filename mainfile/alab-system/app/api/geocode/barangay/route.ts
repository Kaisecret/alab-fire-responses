import { NextResponse } from 'next/server';

import { antiqueBarangayOutline, locateAntiqueBarangay, nearbyAntiqueBarangays } from '../../../../lib/locations/barangay-locator';

export const dynamic = 'force-dynamic';

/** Pins this close to another barangay's line are offered that barangay too. */
const BORDER_RADIUS_METERS = 150;
const MAX_NEARBY = 3;

/**
 * The barangay at a map pin from the PSA boundaries, with the barangays just
 * across any nearby border and their outlines. Needs no outside service, so a
 * dispatcher gets the answer as soon as the pin lands.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get('lat'));
  const longitude = Number(url.searchParams.get('lon'));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
  }

  const located = locateAntiqueBarangay(latitude, longitude);
  const nearby = located ? nearbyAntiqueBarangays(latitude, longitude, BORDER_RADIUS_METERS).slice(0, MAX_NEARBY) : [];
  const outlines = [located, ...nearby].flatMap((place) => {
    const outline = place && antiqueBarangayOutline(place.municipality, place.barangay);
    return outline ? [{ municipality: place.municipality, barangay: place.barangay, outline }] : [];
  });

  return NextResponse.json({ located, nearby, outlines }, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
