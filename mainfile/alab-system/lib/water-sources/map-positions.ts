import type { WaterSource } from "./types";

export type WaterSourceMapGroup = {
  point: [number, number];
  approximate: boolean;
  testOnly: boolean;
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
  const belisonCenter = municipalCenters.Belison;
  const belisonMockSources = belisonCenter
    ? sources.filter((source) => source.municipalityName === "Belison"
      && source.recordOrigin === "BFP_LOCATOR_CHART_2018"
      && (!Number.isFinite(source.latitude) || !Number.isFinite(source.longitude)
        || distanceKilometers(belisonCenter, [source.latitude, source.longitude]) > MAX_DISTANCE_FROM_MUNICIPAL_CENTER_KM))
      .sort((a, b) => a.id.localeCompare(b.id))
    : [];
  const belisonMockPositions = new Map(belisonMockSources.map((source, index) => [
    source.id,
    [
      belisonCenter![0] + (Math.floor(index / 5) - 1.5) * 0.0025,
      belisonCenter![1] + 0.001 + (index % 5) * 0.002,
    ] as [number, number],
  ]));

  for (const source of sources) {
    const mockPoint = belisonMockPositions.get(source.id);
    if (mockPoint) {
      groups.push({ point: mockPoint, approximate: true, testOnly: true, sources: [source] });
      continue;
    }
    const center = municipalCenters[source.municipalityName];
    const point: [number, number] = [source.latitude, source.longitude];
    const validPoint = Number.isFinite(point[0]) && Number.isFinite(point[1]);
    const approximate = source.recordOrigin !== "MUNICIPAL_ENTRY" && Boolean(center) && (
      !validPoint || distanceKilometers(center, point) > MAX_DISTANCE_FROM_MUNICIPAL_CENTER_KM
    );

    if (approximate && center) {
      let group = approximateGroups.get(source.municipalityName);
      if (!group) {
        group = { point: center, approximate: true, testOnly: false, sources: [] };
        approximateGroups.set(source.municipalityName, group);
        groups.push(group);
      }
      group.sources.push(source);
    } else if (validPoint) {
      groups.push({ point, approximate: false, testOnly: false, sources: [source] });
    }
  }

  return groups;
}
