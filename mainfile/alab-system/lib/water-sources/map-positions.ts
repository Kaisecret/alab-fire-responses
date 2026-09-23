import type { WaterSource } from "./types";

export type WaterSourceMapGroup = {
  point: [number, number];
  approximate: boolean;
  sources: WaterSource[];
};

const MAX_DISTANCE_FROM_MUNICIPAL_CENTER_KM = 40;

function distanceKilometers(a: [number, number], b: [number, number]): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (b[0] - a[0]) * radians;
  const longitudeDelta = (b[1] - a[1]) * radians;
  const arc = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(a[0] * radians) * Math.cos(b[0] * radians)
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

export function groupWaterSourceMapMarkers(
  sources: WaterSource[],
  municipalCenters: Record<string, [number, number]>,
): WaterSourceMapGroup[] {
  const groups: WaterSourceMapGroup[] = [];
  const approximateGroups = new Map<string, WaterSourceMapGroup>();

  for (const source of sources) {
    const center = municipalCenters[source.municipalityName];
    const point: [number, number] = [source.latitude, source.longitude];
    const validPoint = Number.isFinite(point[0]) && Number.isFinite(point[1]);
    const approximate = Boolean(center) && (
      !validPoint || distanceKilometers(center, point) > MAX_DISTANCE_FROM_MUNICIPAL_CENTER_KM
    );

    if (approximate && center) {
      let group = approximateGroups.get(source.municipalityName);
      if (!group) {
        group = { point: center, approximate: true, sources: [] };
        approximateGroups.set(source.municipalityName, group);
        groups.push(group);
      }
      group.sources.push(source);
    } else if (validPoint) {
      groups.push({ point, approximate: false, sources: [source] });
    }
  }

  return groups;
}
