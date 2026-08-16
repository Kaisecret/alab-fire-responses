import type { Coordinate } from "./types";

const earthRadiusKm = 6371;
const radians = (value: number) => value * Math.PI / 180;

export function straightLineKilometers(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const lat = radians(toLat - fromLat);
  const lng = radians(toLng - fromLng);
  const a = Math.sin(lat / 2) ** 2 + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(lng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function normalizeOsrmRoute(payload: unknown) {
  const route = (payload as { routes?: Array<{ distance?: unknown; duration?: unknown; geometry?: { coordinates?: unknown } }> })?.routes?.[0];
  if (!route || !Array.isArray(route.geometry?.coordinates) || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) return null;
  const coordinates: Coordinate[] = [];
  for (const pair of route.geometry.coordinates) {
    if (!Array.isArray(pair) || pair.length < 2 || !Number.isFinite(pair[0]) || !Number.isFinite(pair[1])) return null;
    coordinates.push([Number(pair[1]), Number(pair[0])]);
  }
  return coordinates.length > 1 ? { distanceMeters: Number(route.distance), durationSeconds: Number(route.duration), coordinates } : null;
}
