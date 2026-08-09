'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useRef } from 'react';
import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type {
  CircleMarker,
  LayerGroup,
  LatLngBoundsExpression,
  Map as LeafletMap,
} from 'leaflet';

export type OperationalLayer = 'incident' | 'station' | 'water';

export type OperationalLayerVisibility = Record<OperationalLayer, boolean>;

const ANTIQUE_BOUNDS: LatLngBoundsExpression = [
  [10.28, 121.62],
  [11.9, 122.48],
];

const ANTIQUE_CENTER: [number, number] = [11.08, 122.04];
const ANTIQUE_CAPITAL: [number, number] = [10.752, 121.941];
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
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

const alabPalette = {
  incident: '#D00F09',
  station: '#1565C0',
  water: '#00838f',
  text: '#1f2937',
  road: '#4b5563',
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

const antiquePoint = {
  name: 'San Jose de Buenavista',
  label: 'Provincial capital of Antique',
  coordinates: ANTIQUE_CAPITAL,
};

const antiqueMunicipalities = [
  { name: 'San Jose', coordinates: [10.752, 121.941] as [number, number] },
  { name: 'Hamtic', coordinates: [10.7, 121.98] as [number, number] },
  { name: 'Sibalom', coordinates: [10.7889, 122.0175] as [number, number] },
  { name: 'Bugasong', coordinates: [11.0059, 122.0474] as [number, number] },
  { name: 'Culasi', coordinates: [11.4257, 122.0561] as [number, number] },
  { name: 'Pandan', coordinates: [11.716, 122.095] as [number, number] },
  { name: 'Tibiao', coordinates: [11.3008, 122.0633] as [number, number] },
  { name: 'Anini-y', coordinates: [10.4639, 122.0263] as [number, number] },
];

type MapPoint = {
  id: string;
  type: OperationalLayer;
  label: string;
  coordinates: [number, number];
  title: string;
};

const mapPoints: MapPoint[] = [
  {
    id: 'incident-sibalom',
    type: 'incident',
    label: 'Sibalom',
    coordinates: [10.89, 122.06],
    title: 'Structure Fire',
  },
  {
    id: 'incident-patnongon',
    type: 'incident',
    label: 'Patnongon',
    coordinates: [10.91, 122.02],
    title: 'Residential Fire',
  },
  {
    id: 'incident-bugasong',
    type: 'incident',
    label: 'Bugasong',
    coordinates: [11.05, 122.07],
    title: 'Grass Fire',
  },
  {
    id: 'incident-culasi',
    type: 'incident',
    label: 'Culasi',
    coordinates: [11.43, 122.06],
    title: 'Brush Fire',
  },
  {
    id: 'station-san-jose',
    type: 'station',
    label: 'San Jose BFP',
    coordinates: [10.75, 121.94],
    title: 'Fire Station',
  },
  {
    id: 'station-pandan',
    type: 'station',
    label: 'Pandan BFP',
    coordinates: [11.72, 122.09],
    title: 'Fire Station',
  },
  {
    id: 'water-tibiao',
    type: 'water',
    label: 'Tibiao',
    coordinates: [11.29, 122.04],
    title: 'Water Source',
  },
  {
    id: 'water-hamtic',
    type: 'water',
    label: 'Hamtic',
    coordinates: [10.7, 121.98],
    title: 'Water Source',
  },
  {
    id: 'water-laua-an',
    type: 'water',
    label: 'Laua-an',
    coordinates: [11.14, 122.1],
    title: 'Water Source',
  },
];

const markerCounts = {
  incident: mapPoints.filter((point) => point.type === 'incident').length,
  station: mapPoints.filter((point) => point.type === 'station').length,
  water: mapPoints.filter((point) => point.type === 'water').length,
};

const pointColors: Record<OperationalLayer, string> = {
  incident: alabPalette.incident,
  station: alabPalette.station,
  water: alabPalette.water,
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

type OperationalMarker = {
  point: MapPoint;
  marker: CircleMarker;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
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
          coordinates: coordinates as [number, number],
        },
      }];
    }),
  };
}

function publicStructureColor(category: string) {
  if (['school', 'college', 'university', 'kindergarten', 'library'].includes(category)) {
    return alabPalette.station;
  }

  if (['hospital', 'clinic'].includes(category)) return alabPalette.incident;
  if (['fire station', 'police', 'government', 'townhall'].includes(category)) return '#b45309';
  return alabPalette.water;
}

function publicStructurePopup(properties: PublicStructureProperties) {
  const name = properties.name || 'Public facility';
  return `<div class="mbfp-map-popup"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(properties.category)}</span><small>OpenStreetMap</small></div>`;
}

function addNearbySheltersControl(leaflet: typeof import('leaflet'), map: LeafletMap) {
  const NearbySheltersControl = leaflet.Control.extend({
    options: { position: 'bottomright' },
    onAdd: () => {
      const wrapper = leaflet.DomUtil.create('div', 'leaflet-control-nearby-shelters');
      const button = leaflet.DomUtil.create('button', '', wrapper);
      button.type = 'button';
      button.title = 'Show nearby fire stations';
      button.setAttribute('aria-label', 'Show nearby fire stations');
      button.innerHTML = '<i class="fa-solid fa-house-fire" aria-hidden="true"></i><span>Nearby shelters</span>';

      leaflet.DomEvent.disableClickPropagation(wrapper);
      leaflet.DomEvent.on(button, 'click', () => {
        const stations = mapPoints
          .filter((point) => point.type === 'station')
          .map((point) => point.coordinates);
        map.fitBounds(stations, { padding: [42, 42], maxZoom: 12, animate: true });
      });

      return wrapper;
    },
  });

  new NearbySheltersControl().addTo(map);
}

function applyOperationalLayerVisibility(
  map: LeafletMap,
  markers: OperationalMarker[],
  visibility: OperationalLayerVisibility,
) {
  markers.forEach(({ point, marker }) => {
    if (visibility[point.type]) {
      marker.addTo(map);
    } else {
      marker.removeFrom(map);
    }
  });
}

function updatePublicStructureVisibility(map: LeafletMap, layer: LayerGroup) {
  const shouldShow = map.getZoom() >= 9.5;
  if (shouldShow && !map.hasLayer(layer)) layer.addTo(map);
  if (!shouldShow && map.hasLayer(layer)) map.removeLayer(layer);
}

async function loadPublicStructures(
  leaflet: typeof import('leaflet'),
  map: LeafletMap,
  layer: LayerGroup,
  isActive: () => boolean,
) {
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

      layer.clearLayers();
      createPublicStructureCollection(payload.elements).features.forEach((feature) => {
        const properties = feature.properties;
        leaflet.circleMarker(
          [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
          {
            radius: 4,
            color: '#ffffff',
            weight: 1.3,
            fillColor: publicStructureColor(properties.category),
            fillOpacity: 0.92,
          },
        )
          .bindPopup(publicStructurePopup(properties), { maxWidth: 240 })
          .addTo(layer);
      });
      updatePublicStructureVisibility(map, layer);
      return;
    } catch {
      // The OSM tile map and operational layers remain available if this request fails.
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
}

type AntiqueGisMapProps = {
  visibleLayers?: OperationalLayerVisibility;
};

export function AntiqueGisMap({ visibleLayers = DEFAULT_OPERATIONAL_VISIBILITY }: AntiqueGisMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<OperationalMarker[]>([]);
  const visibleLayersRef = useRef(visibleLayers);

  useEffect(() => {
    visibleLayersRef.current = visibleLayers;
    if (mapRef.current) {
      applyOperationalLayerVisibility(mapRef.current, markersRef.current, visibleLayers);
    }
  }, [visibleLayers]);

  useEffect(() => {
    let isMounted = true;

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) return;

      const leafletModule = await import('leaflet');
      const leaflet = leafletModule.default;
      if (!isMounted || !containerRef.current) return;

      const map = leaflet.map(containerRef.current, {
        center: ANTIQUE_CENTER,
        zoom: 8.4,
        minZoom: 8,
        maxZoom: 19,
        maxBounds: ANTIQUE_BOUNDS,
        maxBoundsViscosity: 0.86,
        zoomControl: false,
        preferCanvas: true,
      });
      mapRef.current = map;

      leaflet.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      leaflet.control.zoom({ position: 'topright' }).addTo(map);
      leaflet.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 120 }).addTo(map);
      addNearbySheltersControl(leaflet, map);

      leaflet.geoJSON(antiqueBoundary, {
        style: {
          color: alabPalette.incident,
          weight: 2,
          opacity: 0.68,
          fillColor: alabPalette.incident,
          fillOpacity: 0.035,
        },
      }).bindPopup('<strong>Province of Antique</strong><br/>Operational fire response coverage').addTo(map);

      leaflet.geoJSON(recommendedRoute, {
        style: {
          color: alabPalette.road,
          weight: 3,
          opacity: 0.76,
          dashArray: '7 7',
        },
      }).bindPopup('<strong>Recommended Route</strong>').addTo(map);

      const municipalityLayer = leaflet.layerGroup().addTo(map);
      antiqueMunicipalities.forEach((municipality) => {
        leaflet.circleMarker(municipality.coordinates, {
          radius: 4,
          color: '#ffffff',
          weight: 1.4,
          fillColor: alabPalette.station,
          fillOpacity: 0.96,
        })
          .bindTooltip(municipality.name, {
            permanent: true,
            direction: 'top',
            offset: [0, -3],
            className: 'leaflet-municipality-label',
          })
          .bindPopup(`<strong>${escapeHtml(municipality.name)}</strong><br/>Antique municipality`)
          .addTo(municipalityLayer);
      });

      leaflet.circleMarker(antiquePoint.coordinates, {
        radius: 8,
        color: '#ffffff',
        weight: 2.5,
        fillColor: alabPalette.incident,
        fillOpacity: 1,
      })
        .bindTooltip(antiquePoint.name, {
          permanent: true,
          direction: 'top',
          offset: [0, -7],
          className: 'leaflet-capital-label',
        })
        .bindPopup(`<strong>${antiquePoint.name}</strong><br/>${antiquePoint.label}`)
        .addTo(map);

      const publicStructuresLayer = leaflet.layerGroup();
      map.on('zoomend', () => updatePublicStructureVisibility(map, publicStructuresLayer));
      updatePublicStructureVisibility(map, publicStructuresLayer);
      void loadPublicStructures(leaflet, map, publicStructuresLayer, () => isMounted);

      markersRef.current = mapPoints.map((point) => {
        const marker = leaflet.circleMarker(point.coordinates, {
          radius: point.type === 'incident' ? 7 : 6,
          color: '#ffffff',
          weight: 2.5,
          fillColor: pointColors[point.type],
          fillOpacity: 0.98,
        })
          .bindTooltip(point.label, {
            direction: 'top',
            offset: [0, -8],
            className: 'leaflet-operational-label',
          })
          .bindPopup(`<strong>${escapeHtml(point.title)}</strong><br/>${escapeHtml(point.label)}`)
          .addTo(map);

        return { point, marker };
      });
      applyOperationalLayerVisibility(map, markersRef.current, visibleLayersRef.current);

      map.fitBounds(ANTIQUE_BOUNDS, {
        padding: [24, 24],
        animate: false,
      });
    }

    void initializeMap();

    return () => {
      isMounted = false;
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="mbfp-antique-map-shell">
      <div ref={containerRef} className="mbfp-antique-map" aria-label="Province of Antique Leaflet GIS map" />
      <div className="mbfp-antique-map-title">
        <span>Province of Antique</span>
        <small>OpenStreetMap operational coverage</small>
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
