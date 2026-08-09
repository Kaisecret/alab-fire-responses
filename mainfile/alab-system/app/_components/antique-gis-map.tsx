'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import { useEffect, useRef } from 'react';
import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type { GeoJSONSource, LngLatBoundsLike, Map, MapGeoJSONFeature, Marker } from 'maplibre-gl';

export type OperationalLayer = 'incident' | 'station' | 'water';

export type OperationalLayerVisibility = Record<OperationalLayer, boolean>;

const ANTIQUE_BOUNDS: LngLatBoundsLike = [
  [121.62, 10.28],
  [122.48, 11.9],
];

const ANTIQUE_CENTER: [number, number] = [122.04, 11.08];
const ANTIQUE_CAPITAL: [number, number] = [121.941, 10.752];
const OSM_VECTOR_TILES_URL = process.env.NEXT_PUBLIC_OSM_VECTOR_TILES_URL ?? 'https://tiles.openfreemap.org/planet';
const ESRI_SATELLITE_TILES_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const TERRAIN_DEM_TILES_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const PUBLIC_STRUCTURE_OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
] as const;
const PUBLIC_STRUCTURE_OVERPASS_QUERY = `
[out:json][timeout:25];
(
  nwr["amenity"~"school|college|university|hospital|fire_station|police|clinic|townhall|community_centre|place_of_worship|marketplace|social_facility|library|kindergarten"](10.28,121.62,11.9,122.48);
  nwr["office"="government"](10.28,121.62,11.9,122.48);
);
out center tags;
`;

const DEFAULT_OPERATIONAL_VISIBILITY: OperationalLayerVisibility = {
  incident: true,
  station: true,
  water: true,
};

const interactiveMapLayerIds = [
  'alab-building-footprints',
  'alab-road-network',
  'alab-public-place-points',
  'antique-public-structures-points',
  'antique-public-structures-labels',
  'antique-point',
  'antique-label',
  'antique-municipality-points',
  'antique-municipality-labels',
  'road_motorway',
  'road_trunk_primary',
  'road_secondary_tertiary',
  'road_minor',
  'road_service_track',
  'road_link',
  'poi_r1',
  'poi_r7',
  'poi_r20',
];

const alabPalette = {
  incident: '#D00F09',
  station: '#1565C0',
  water: '#00838f',
  land: '#eef8f1',
  waterBase: '#dceff8',
  road: '#d9e1dd',
  text: '#1f2937',
};

const antiqueBoundary: FeatureCollection<Polygon, { name: string }> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Province of Antique' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [121.9, 11.82],
          [122.13, 11.71],
          [122.18, 11.47],
          [122.2, 11.25],
          [122.16, 11.05],
          [122.18, 10.88],
          [122.13, 10.69],
          [122.0, 10.42],
          [121.82, 10.43],
          [121.79, 10.67],
          [121.82, 10.9],
          [121.79, 11.14],
          [121.81, 11.37],
          [121.79, 11.62],
          [121.9, 11.82],
        ]],
      },
    },
  ],
};

const recommendedRoute: FeatureCollection<LineString, { name: string }> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Recommended Route' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [121.94, 10.75],
          [121.98, 10.79],
          [122.03, 10.82],
          [122.06, 10.89],
        ],
      },
    },
  ],
};

type PublicStructureProperties = {
  name: string;
  category: string;
  source: 'OpenStreetMap';
  osmId: string;
};

type PublicStructureCollection = FeatureCollection<Point, PublicStructureProperties>;

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const emptyPublicStructures: PublicStructureCollection = {
  type: 'FeatureCollection',
  features: [],
};

const antiquePoint: FeatureCollection<Point, { name: string; label: string }> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: ANTIQUE_CAPITAL },
      properties: {
        name: 'San Jose de Buenavista',
        label: 'Provincial capital of Antique',
      },
    },
  ],
};

const antiqueMunicipalities: FeatureCollection<Point, { name: string }> = {
  type: 'FeatureCollection',
  features: [
    ['San Jose', [121.941, 10.752]],
    ['Hamtic', [121.98, 10.7]],
    ['Sibalom', [122.0175, 10.7889]],
    ['Bugasong', [122.0474, 11.0059]],
    ['Culasi', [122.0561, 11.4257]],
    ['Pandan', [122.095, 11.716]],
    ['Tibiao', [122.0633, 11.3008]],
    ['Anini-y', [122.0263, 10.4639]],
  ].map(([name, coordinates]) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: coordinates as [number, number] },
    properties: { name: name as string },
  })),
};

type MapPoint = {
  id: string;
  type: 'incident' | 'station' | 'water';
  label: string;
  coordinates: [number, number];
  icon: string;
  title: string;
};

const mapPoints: MapPoint[] = [
  {
    id: 'incident-sibalom',
    type: 'incident',
    label: 'Sibalom',
    coordinates: [122.06, 10.89],
    icon: 'fa-location-dot',
    title: 'Structure Fire',
  },
  {
    id: 'incident-patnongon',
    type: 'incident',
    label: 'Patnongon',
    coordinates: [122.02, 10.91],
    icon: 'fa-location-dot',
    title: 'Residential Fire',
  },
  {
    id: 'incident-bugasong',
    type: 'incident',
    label: 'Bugasong',
    coordinates: [122.07, 11.05],
    icon: 'fa-location-dot',
    title: 'Grass Fire',
  },
  {
    id: 'incident-culasi',
    type: 'incident',
    label: 'Culasi',
    coordinates: [122.06, 11.43],
    icon: 'fa-location-dot',
    title: 'Brush Fire',
  },
  {
    id: 'station-san-jose',
    type: 'station',
    label: 'San Jose BFP',
    coordinates: [121.94, 10.75],
    icon: 'fa-house-fire',
    title: 'Fire Station',
  },
  {
    id: 'station-pandan',
    type: 'station',
    label: 'Pandan BFP',
    coordinates: [122.09, 11.72],
    icon: 'fa-house-fire',
    title: 'Fire Station',
  },
  {
    id: 'water-tibiao',
    type: 'water',
    label: 'Tibiao',
    coordinates: [122.04, 11.29],
    icon: 'fa-droplet',
    title: 'Water Source',
  },
  {
    id: 'water-hamtic',
    type: 'water',
    label: 'Hamtic',
    coordinates: [121.98, 10.7],
    icon: 'fa-droplet',
    title: 'Water Source',
  },
  {
    id: 'water-laua-an',
    type: 'water',
    label: 'Laua-an',
    coordinates: [122.1, 11.14],
    icon: 'fa-droplet',
    title: 'Water Source',
  },
];

type PointType = MapPoint['type'];

const pointColors: Record<PointType, string> = {
  incident: alabPalette.incident,
  station: alabPalette.station,
  water: alabPalette.water,
};

const markerCounts = {
  incident: mapPoints.filter((point) => point.type === 'incident').length,
  station: mapPoints.filter((point) => point.type === 'station').length,
  water: mapPoints.filter((point) => point.type === 'water').length,
};

function createMarkerElement(point: MapPoint) {
  const marker = document.createElement('button');
  marker.type = 'button';
  marker.className = `mbfp-antique-marker ${point.type}`;
  marker.title = `${point.title}: ${point.label}`;
  marker.setAttribute('aria-label', `${point.title} in ${point.label}`);
  marker.style.setProperty('--marker-color', pointColors[point.type]);
  marker.innerHTML = `<i class="fa-solid ${point.icon}" aria-hidden="true"></i><span>${point.label}</span>`;
  return marker;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function getFeatureProperty(feature: MapGeoJSONFeature, keys: string[]) {
  const properties = feature.properties as Record<string, unknown> | undefined;

  for (const key of keys) {
    const value = properties?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return '';
}

function getFeatureTitle(feature: MapGeoJSONFeature) {
  const sourceLayer = feature.sourceLayer ?? '';

  if (sourceLayer === 'building') return 'Mapped building';
  if (sourceLayer === 'transportation') return 'Road';
  if (feature.source === 'antique-point') {
    return getFeatureProperty(feature, ['name']) || 'Antique capital';
  }
  if (feature.source === 'antique-municipalities') {
    return getFeatureProperty(feature, ['name']) || 'Antique municipality';
  }
  if (feature.source === 'antique-public-structures') {
    return getFeatureProperty(feature, ['name']) || 'Public facility';
  }
  return getFeatureProperty(feature, ['name_en', 'name']) || 'Public place';
}

function getFeatureCategory(feature: MapGeoJSONFeature) {
  const sourceLayer = feature.sourceLayer ?? '';
  if (sourceLayer === 'building') return 'OpenStreetMap building footprint';
  if (sourceLayer === 'transportation') {
    return getFeatureProperty(feature, ['class', 'subclass']) || 'Mapped road';
  }
  if (feature.source === 'antique-point') return 'Provincial capital';
  if (feature.source === 'antique-municipalities') return 'Antique municipality';
  if (feature.source === 'antique-public-structures') {
    return getFeatureProperty(feature, ['category']) || 'OpenStreetMap public facility';
  }

  return getFeatureProperty(feature, ['class', 'subclass']) || 'OpenStreetMap place';
}

function createFeaturePopupHtml(feature: MapGeoJSONFeature) {
  const name = getFeatureProperty(feature, ['name_en', 'name']);
  const title = getFeatureTitle(feature);
  const category = getFeatureCategory(feature);

  return `<div class="mbfp-map-popup"><strong>${escapeHtml(name || title)}</strong><span>${escapeHtml(category)}</span>${name ? `<small>${escapeHtml(title)}</small>` : ''}</div>`;
}

function getPublicStructureCategory(tags: Record<string, string>) {
  const category = tags.amenity
    ?? tags.office
    ?? tags.building
    ?? tags.tourism
    ?? tags.historic
    ?? tags.leisure
    ?? 'public facility';

  return category.replace(/_/g, ' ');
}

function createPublicStructureCollection(elements: OverpassElement[]): PublicStructureCollection {
  return {
    type: 'FeatureCollection',
    features: elements.flatMap((element) => {
      const coordinates = element.lon !== undefined && element.lat !== undefined
        ? [element.lon, element.lat]
        : element.center
          ? [element.center.lon, element.center.lat]
          : null;

      if (!coordinates) return [];

      const tags = element.tags ?? {};
      const name = tags.name ?? tags['name:en'] ?? tags.official_name ?? '';

      return [{
        type: 'Feature' as const,
        properties: {
          name,
          category: getPublicStructureCategory(tags),
          source: 'OpenStreetMap' as const,
          osmId: `${element.type}/${element.id}`,
        },
        geometry: {
          type: 'Point' as const,
          coordinates,
        },
      }];
    }),
  };
}

async function loadPublicStructures(map: Map, isActive: () => boolean) {
  for (const endpoint of PUBLIC_STRUCTURE_OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 18000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: new URLSearchParams({ data: PUBLIC_STRUCTURE_OVERPASS_QUERY }),
        signal: controller.signal,
      });

      if (!response.ok) continue;

      const payload = await response.json() as { elements?: OverpassElement[] };
      if (!isActive() || !Array.isArray(payload.elements)) return;

      const source = map.getSource('antique-public-structures') as GeoJSONSource | undefined;
      source?.setData(createPublicStructureCollection(payload.elements));
      return;
    } catch {
      // The vector POI layer remains available if the public-data request is unavailable.
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
}

function addMapDetailLayers(map: Map) {
  const firstRoadLayer = map.getLayer('road_motorway_link_casing') ? 'road_motorway_link_casing' : undefined;
  const firstPlaceLayer = map.getLayer('poi_r20') ? 'poi_r20' : undefined;

  if (!map.getLayer('alab-building-footprints')) {
    map.addLayer({
      id: 'alab-building-footprints',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-color': '#ffffff',
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          13,
          0.28,
          17,
          0.62,
        ],
        'fill-outline-color': '#b9c9c1',
      },
    }, firstRoadLayer);
  }

  if (!map.getLayer('alab-road-network')) {
    map.addLayer({
      id: 'alab-road-network',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 10,
      filter: [
        'match',
        ['get', 'class'],
        ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'track', 'path'],
        true,
        false,
      ],
      paint: {
        'line-color': '#aabeb5',
        'line-opacity': 0.55,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          0.7,
          16,
          2.4,
        ],
      },
    }, firstRoadLayer);
  }

  if (!map.getLayer('alab-public-place-points')) {
    map.addLayer({
      id: 'alab-public-place-points',
      type: 'circle',
      source: 'openmaptiles',
      'source-layer': 'poi',
      minzoom: 11,
      filter: [
        'all',
        ['has', 'name'],
        ['match', ['get', 'class'], ['hospital', 'school', 'fire_station', 'government', 'police', 'townhall', 'clinic', 'community_centre', 'place_of_worship', 'fuel'], true, false],
      ],
      paint: {
        'circle-color': '#00838f',
        'circle-opacity': 0.82,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 2.5, 17, 4],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.2,
      },
    }, firstPlaceLayer);
  }
}

function addPublicStructureLayers(map: Map) {
  if (!map.getSource('antique-public-structures')) {
    map.addSource('antique-public-structures', {
      type: 'geojson',
      data: emptyPublicStructures,
    });
  }

  if (!map.getLayer('antique-public-structures-points')) {
    map.addLayer({
      id: 'antique-public-structures-points',
      type: 'circle',
      source: 'antique-public-structures',
      minzoom: 8,
      paint: {
        'circle-color': [
          'match',
          ['get', 'category'],
          ['school', 'college', 'university', 'kindergarten', 'library'],
          alabPalette.station,
          ['hospital', 'clinic'],
          alabPalette.incident,
          ['fire station', 'police', 'government', 'townhall'],
          '#b45309',
          alabPalette.water,
        ],
        'circle-opacity': 0.88,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3.2, 13, 5.4],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.4,
      },
    });
  }

  if (!map.getLayer('antique-public-structures-labels')) {
    map.addLayer({
      id: 'antique-public-structures-labels',
      type: 'symbol',
      source: 'antique-public-structures',
      minzoom: 10,
      filter: ['all', ['has', 'name'], ['!=', ['get', 'name'], '']],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 11,
        'text-anchor': 'top',
        'text-offset': [0, 1.1],
        'text-optional': true,
      },
      paint: {
        'text-color': alabPalette.text,
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.4,
      },
    });
  }
}

function addAntiqueReferenceLayers(map: Map) {
  if (!map.getSource('antique-point')) {
    map.addSource('antique-point', {
      type: 'geojson',
      data: antiquePoint,
    });
  }

  if (!map.getSource('antique-municipalities')) {
    map.addSource('antique-municipalities', {
      type: 'geojson',
      data: antiqueMunicipalities,
    });
  }

  if (!map.getLayer('antique-municipality-points')) {
    map.addLayer({
      id: 'antique-municipality-points',
      type: 'circle',
      source: 'antique-municipalities',
      minzoom: 8,
      paint: {
        'circle-radius': 3.8,
        'circle-color': alabPalette.station,
        'circle-opacity': 0.84,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.2,
      },
    });
  }

  if (!map.getLayer('antique-municipality-labels')) {
    map.addLayer({
      id: 'antique-municipality-labels',
      type: 'symbol',
      source: 'antique-municipalities',
      minzoom: 8,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 11,
        'text-offset': [0, 1.05],
        'text-anchor': 'top',
        'text-optional': true,
      },
      paint: {
        'text-color': alabPalette.text,
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    });
  }

  if (!map.getLayer('antique-point')) {
    map.addLayer({
      id: 'antique-point',
      type: 'circle',
      source: 'antique-point',
      minzoom: 8,
      paint: {
        'circle-radius': 8,
        'circle-color': alabPalette.incident,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff',
      },
    });
  }

  if (!map.getLayer('antique-label')) {
    map.addLayer({
      id: 'antique-label',
      type: 'symbol',
      source: 'antique-point',
      minzoom: 8,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 14,
        'text-offset': [0, 1.25],
        'text-anchor': 'top',
        'text-optional': true,
      },
      paint: {
        'text-color': alabPalette.text,
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.8,
      },
    });
  }
}

function addMapFeatureInteractions(map: Map, Popup: typeof import('maplibre-gl').Popup) {
  const availableLayerIds = interactiveMapLayerIds.filter((layerId) => map.getLayer(layerId));

  for (const layerId of availableLayerIds) {
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  }

  if (!availableLayerIds.length) return;

  map.on('click', (event) => {
    const features = map.queryRenderedFeatures(event.point, { layers: availableLayerIds });
    const feature = features.find((candidate) => candidate.sourceLayer === 'building'
      || candidate.sourceLayer === 'transportation'
      || candidate.sourceLayer === 'poi'
      || candidate.source === 'antique-point'
      || candidate.source === 'antique-municipalities'
      || candidate.source === 'antique-public-structures');

    if (!feature) return;

    new Popup({ closeButton: true, closeOnClick: true, maxWidth: '260px' })
      .setLngLat(event.lngLat)
      .setHTML(createFeaturePopupHtml(feature))
      .addTo(map);
  });
}

function addOperationalLayers(map: Map) {
  if (!map.getSource('antique-boundary')) {
    map.addSource('antique-boundary', {
      type: 'geojson',
      data: antiqueBoundary,
    });
  }

  if (!map.getLayer('antique-boundary-fill')) {
    map.addLayer({
      id: 'antique-boundary-fill',
      type: 'fill',
      source: 'antique-boundary',
      paint: {
        'fill-color': alabPalette.incident,
        'fill-opacity': 0.05,
      },
    });
  }

  if (!map.getLayer('antique-boundary-line')) {
    map.addLayer({
      id: 'antique-boundary-line',
      type: 'line',
      source: 'antique-boundary',
      paint: {
        'line-color': alabPalette.incident,
        'line-width': 2,
        'line-opacity': 0.55,
      },
    });
  }

  if (!map.getSource('recommended-route')) {
    map.addSource('recommended-route', {
      type: 'geojson',
      data: recommendedRoute,
    });
  }

  if (!map.getLayer('recommended-route-line')) {
    map.addLayer({
      id: 'recommended-route-line',
      type: 'line',
      source: 'recommended-route',
      paint: {
        'line-color': '#4b5563',
        'line-width': 3,
        'line-dasharray': [1.2, 1.1],
        'line-opacity': 0.75,
      },
    });
  }
}

function refreshBoundaryData(map: Map) {
  const source = map.getSource('antique-boundary') as GeoJSONSource | undefined;
  source?.setData(antiqueBoundary);
}

function tintBaseMap(map: Map) {
  if (map.getLayer('alab-background')) {
    map.setPaintProperty('alab-background', 'background-color', alabPalette.land);
  }

  if (map.getLayer('osm-raster-fallback')) {
    map.setPaintProperty('osm-raster-fallback', 'raster-opacity', 0.92);
  }
}

type OperationalMarker = {
  point: MapPoint;
  marker: Marker;
};

function applyOperationalLayerVisibility(
  markers: OperationalMarker[],
  visibility: OperationalLayerVisibility,
) {
  markers.forEach(({ point, marker }) => {
    marker.getElement().style.display = visibility[point.type] ? '' : 'none';
  });
}

type AntiqueGisMapProps = {
  visibleLayers?: OperationalLayerVisibility;
};

export function AntiqueGisMap({ visibleLayers = DEFAULT_OPERATIONAL_VISIBILITY }: AntiqueGisMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<OperationalMarker[]>([]);
  const visibleLayersRef = useRef(visibleLayers);

  useEffect(() => {
    visibleLayersRef.current = visibleLayers;
    applyOperationalLayerVisibility(markersRef.current, visibleLayers);
  }, [visibleLayers]);

  useEffect(() => {
    let isMounted = true;

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) return;

      const maplibregl = await import('maplibre-gl');

      if (!isMounted || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap contributors',
            },
            openmaptiles: {
              type: 'vector',
              url: OSM_VECTOR_TILES_URL,
              attribution: '&copy; OpenFreeMap &middot; &copy; OpenStreetMap contributors',
            },
            'esri-satellite': {
              type: 'raster',
              tiles: [ESRI_SATELLITE_TILES_URL],
              tileSize: 256,
              attribution: 'Tiles &copy; Esri',
            },
            'terrain-dem': {
              type: 'raster-dem',
              tiles: [TERRAIN_DEM_TILES_URL],
              tileSize: 256,
              encoding: 'terrarium',
            },
          },
          layers: [
            {
              id: 'alab-background',
              type: 'background',
              paint: {
                'background-color': alabPalette.land,
              },
            },
            {
              id: 'osm-raster-fallback',
              type: 'raster',
              source: 'osm',
              paint: {
                'raster-opacity': 0.92,
                'raster-saturation': -0.32,
                'raster-contrast': -0.08,
                'raster-brightness-min': 0.08,
                'raster-brightness-max': 0.96,
              },
            },
            {
              id: 'esri-satellite-layer',
              type: 'raster',
              source: 'esri-satellite',
              paint: {
                'raster-opacity': 0.34,
                'raster-saturation': -0.12,
                'raster-contrast': 0.05,
              },
            },
          ],
        },
        center: ANTIQUE_CENTER,
        zoom: 8.4,
        pitch: 22,
        bearing: -8,
        maxPitch: 62,
        minZoom: 8,
        maxZoom: 19,
        maxBounds: ANTIQUE_BOUNDS,
        attributionControl: false,
      });

      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
      map.addControl(new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '&copy; OpenFreeMap &middot; &copy; OpenStreetMap contributors &middot; Tiles &copy; Esri',
      }), 'bottom-right');

      map.on('load', () => {
        map.setTerrain({ source: 'terrain-dem', exaggeration: 1.15 });
        tintBaseMap(map);
        addMapDetailLayers(map);
        addAntiqueReferenceLayers(map);
        addPublicStructureLayers(map);
        addOperationalLayers(map);
        refreshBoundaryData(map);
        addMapFeatureInteractions(map, maplibregl.Popup);
        void loadPublicStructures(map, () => isMounted);

        markersRef.current = mapPoints.map((point) => {
          const marker = new maplibregl.Marker({
            element: createMarkerElement(point),
            anchor: 'bottom',
            offset: [0, -4],
          })
            .setLngLat(point.coordinates)
            .addTo(map);

          return { point, marker };
        });
        applyOperationalLayerVisibility(markersRef.current, visibleLayersRef.current);

        map.fitBounds(ANTIQUE_BOUNDS, {
          padding: { top: 42, right: 42, bottom: 42, left: 42 },
          duration: 0,
        });
      });
    }

    initializeMap();

    return () => {
      isMounted = false;
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="mbfp-antique-map-shell">
      <div ref={containerRef} className="mbfp-antique-map" aria-label="Province of Antique GIS map" />
      <div className="mbfp-antique-map-title">
        <span>Province of Antique</span>
        <small>Operational fire response coverage</small>
      </div>
      <div className="mbfp-gis-legend">
        <div className="mbfp-gis-legend-item">
          <span className="mbfp-gis-legend-dot" style={{ background: alabPalette.incident }} />
          Fire Incident ({markerCounts.incident})
        </div>
        <div className="mbfp-gis-legend-item">
          <span className="mbfp-gis-legend-dot" style={{ background: alabPalette.station }} />
          Fire Station ({markerCounts.station})
        </div>
        <div className="mbfp-gis-legend-item">
          <span className="mbfp-gis-legend-dot" style={{ background: alabPalette.water }} />
          Water Source ({markerCounts.water})
        </div>
        <div className="mbfp-gis-legend-item">
          <span className="mbfp-gis-route-line" />
          Recommended Route
        </div>
        <div className="mbfp-gis-legend-item">
          <span className="mbfp-gis-building-key" />
          Mapped buildings
        </div>
        <div className="mbfp-gis-legend-item">
          <span className="mbfp-gis-place-key" />
          Schools & public facilities
        </div>
      </div>
    </div>
  );
}
