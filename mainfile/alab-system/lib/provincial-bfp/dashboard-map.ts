import type { FeatureCollection, Position } from "geojson";
import type { ProvincialIncidentSummary } from "../intermunicipality/provincial";

export type DashboardIncidentLocation = {
  key: string;
  latitude: number;
  longitude: number;
  incidents: ProvincialIncidentSummary[];
};

const CLOSED_STATUSES = new Set(["RESOLVED", "REJECTED", "FALSE_REPORT", "DUPLICATE", "CLOSED"]);

function pointInRing(longitude: number, latitude: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const cross = (longitude - xi) * (yj - yi) - (latitude - yi) * (xj - xi);
    if (Math.abs(cross) < 1e-10 && longitude >= Math.min(xi, xj) && longitude <= Math.max(xi, xj)
      && latitude >= Math.min(yi, yj) && latitude <= Math.max(yi, yj)) return true;
    if ((yi > latitude) !== (yj > latitude)
      && longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function isPointInAntique(latitude: number, longitude: number, boundary: FeatureCollection): boolean {
  return boundary.features.some(({ geometry }) => {
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return false;
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    return polygons.some(([outer, ...holes]) => outer && pointInRing(longitude, latitude, outer)
      && !holes.some(hole => pointInRing(longitude, latitude, hole)));
  });
}

export function groupAntiqueDashboardIncidents(
  incidents: ProvincialIncidentSummary[],
  boundary: FeatureCollection,
): DashboardIncidentLocation[] {
  const locations = new Map<string, DashboardIncidentLocation>();
  for (const incident of incidents) {
    const { latitude, longitude } = incident;
    if (CLOSED_STATUSES.has(incident.status) || typeof latitude !== "number" || typeof longitude !== "number"
      || !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || !isPointInAntique(latitude, longitude, boundary)) continue;
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const location = locations.get(key);
    if (location) location.incidents.push(incident);
    else locations.set(key, { key, latitude, longitude, incidents: [incident] });
  }
  return [...locations.values()];
}
