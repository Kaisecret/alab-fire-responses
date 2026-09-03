import { NextRequest, NextResponse } from "next/server";
import { fetchLiveWeather } from "../../../../lib/weather/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng") || searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Valid coordinates required." }, { status: 400 });
  }

  try {
    const reading = await fetchLiveWeather(lat, lng);
    return NextResponse.json({ weather: reading });
  } catch (error) {
    console.error("Weather endpoint error", error);
    return NextResponse.json({ error: "Failed to fetch weather." }, { status: 500 });
  }
}
