import { ANTIQUE_BARANGAY_BOUNDARIES } from "./antique-barangay-boundaries.ts";

export type LocatedBarangay = { municipality: string; barangay: string };

/** A pin this close outside every boundary (shoreline, river) takes the nearest barangay. */
const NEAREST_LIMIT_METERS = 300;
const METERS_PER_DEGREE = 111_320;

function insideRing(longitude: number, latitude: number, ring: number[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
    if ((yi > latitude) !== (yj > latitude) && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function insidePolygon(longitude: number, latitude: number, rings: number[][]) {
  return insideRing(longitude, latitude, rings[0]) && !rings.slice(1).some((hole) => insideRing(longitude, latitude, hole));
}

/** Distance in meters from the point to the nearest edge of the ring. */
function distanceToRing(longitude: number, latitude: number, ring: number[]) {
  const scale = Math.cos((latitude * Math.PI) / 180);
  let best = Infinity;
  for (let i = 0; i + 3 < ring.length; i += 2) {
    const ax = (ring[i] - longitude) * scale, ay = ring[i + 1] - latitude;
    const bx = (ring[i + 2] - longitude) * scale, by = ring[i + 3] - latitude;
    const dx = bx - ax, dy = by - ay;
    const length = dx * dx + dy * dy;
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length));
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best * METERS_PER_DEGREE;
}

/**
 * The official barangay at a point, from the PSA barangay boundaries.
 * OpenStreetMap only has scattered barangay points in Antique, so its guess
 * is wrong for much of each town. Null outside Antique.
 */
export function locateAntiqueBarangay(latitude: number, longitude: number): LocatedBarangay | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  for (const [municipality, barangay, [west, south, east, north], polygons] of ANTIQUE_BARANGAY_BOUNDARIES) {
    if (longitude < west || longitude > east || latitude < south || latitude > north) continue;
    if (polygons.some((rings) => insidePolygon(longitude, latitude, rings))) return { municipality, barangay };
  }

  const margin = NEAREST_LIMIT_METERS / METERS_PER_DEGREE;
  let nearest: LocatedBarangay | null = null;
  let nearestMeters = NEAREST_LIMIT_METERS;
  for (const [municipality, barangay, [west, south, east, north], polygons] of ANTIQUE_BARANGAY_BOUNDARIES) {
    if (longitude < west - margin * 2 || longitude > east + margin * 2 || latitude < south - margin || latitude > north + margin) continue;
    for (const rings of polygons) {
      const meters = distanceToRing(longitude, latitude, rings[0]);
      if (meters <= nearestMeters) {
        nearestMeters = meters;
        nearest = { municipality, barangay };
      }
    }
  }
  return nearest;
}
