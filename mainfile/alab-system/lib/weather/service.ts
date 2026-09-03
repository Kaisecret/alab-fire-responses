export type WeatherReading = {
  temperatureC: number;
  relativeHumidity: number;
  windSpeedKph: number;
  windDirectionDeg: number;
  windGustsKph: number;
  windCondition: "CALM" | "MODERATE" | "STRONG_WIND" | "GALE";
  source: "LIVE_STATION" | "FALLBACK_TROPICAL";
  fetchedAt: string;
};

// Standard Philippine tropical coastal fallback (Antique baseline: 29°C, 75% RH, 12 km/h breeze)
const FALLBACK_WEATHER: WeatherReading = {
  temperatureC: 29,
  relativeHumidity: 75,
  windSpeedKph: 12,
  windDirectionDeg: 60, // East-Northeast trade wind (Amihan)
  windGustsKph: 18,
  windCondition: "MODERATE",
  source: "FALLBACK_TROPICAL",
  fetchedAt: new Date().toISOString(),
};

export function classifyWindCondition(speedKph: number): WeatherReading["windCondition"] {
  if (speedKph < 12) return "CALM";
  if (speedKph <= 25) return "MODERATE";
  if (speedKph <= 45) return "STRONG_WIND";
  return "GALE";
}

/**
 * Fetches real-time localized weather and wind vectors via Open-Meteo API.
 * Free, zero API key required, sub-500ms response time with 2-second timeout.
 */
export async function fetchLiveWeather(latitude: number, longitude: number): Promise<WeatherReading> {
  // Validate coordinates inside or near Antique / Panay Island
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 4 || latitude > 22 || longitude < 116 || longitude > 127) {
    return { ...FALLBACK_WEATHER, fetchedAt: new Date().toISOString() };
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kmh`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s emergency timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 300 }, // 5 min cache
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { ...FALLBACK_WEATHER, fetchedAt: new Date().toISOString() };
    }

    const data = await response.json();
    const current = data?.current;

    if (!current || typeof current.wind_speed_10m !== "number") {
      return { ...FALLBACK_WEATHER, fetchedAt: new Date().toISOString() };
    }

    const windSpeedKph = Math.max(0, Math.round(current.wind_speed_10m * 10) / 10);
    const windGustsKph = typeof current.wind_gusts_10m === "number" ? Math.round(current.wind_gusts_10m * 10) / 10 : windSpeedKph;

    return {
      temperatureC: Math.round(current.temperature_2m * 10) / 10,
      relativeHumidity: Math.round(current.relative_humidity_2m),
      windSpeedKph,
      windDirectionDeg: Math.round(current.wind_direction_10m ?? 0),
      windGustsKph,
      windCondition: classifyWindCondition(windSpeedKph),
      source: "LIVE_STATION",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return { ...FALLBACK_WEATHER, fetchedAt: new Date().toISOString() };
  }
}
