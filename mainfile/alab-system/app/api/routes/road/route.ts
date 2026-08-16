import { NextRequest, NextResponse } from "next/server";

import { normalizeOsrmRoute, straightLineKilometers } from "../../../../lib/fire-reports/route";

export const runtime = "nodejs";

function coordinate(value: string | null, minimum: number, maximum: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

export async function GET(request: NextRequest) {
  const fromLat = coordinate(request.nextUrl.searchParams.get("fromLat"), 4, 22);
  const fromLng = coordinate(request.nextUrl.searchParams.get("fromLng"), 116, 127);
  const toLat = coordinate(request.nextUrl.searchParams.get("toLat"), 4, 22);
  const toLng = coordinate(request.nextUrl.searchParams.get("toLng"), 116, 127);
  if ([fromLat, fromLng, toLat, toLng].some((value) => value === null)) return NextResponse.json({ error: "Valid Philippine coordinates are required." }, { status: 400 });
  const directKilometers = straightLineKilometers(fromLat!, fromLng!, toLat!, toLng!);
  const direct = { mode: "direct" as const, directKilometers, coordinates: [[fromLat!, fromLng!], [toLat!, toLng!]] };
  try {
    const search = new URLSearchParams({ overview: "full", geometries: "geojson" });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?${search}`, { signal: controller.signal, headers: { Accept: "application/json" } });
    clearTimeout(timeout);
    if (!response.ok) return NextResponse.json(direct);
    const route = normalizeOsrmRoute(await response.json());
    return NextResponse.json(route ? { mode: "road", ...route, directKilometers } : direct);
  } catch {
    return NextResponse.json(direct);
  }
}
