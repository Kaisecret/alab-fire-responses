'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useRef } from 'react';
import type { FeatureCollection, LineString, Point } from 'geojson';
import type {
  CircleMarker,
  LayerGroup,
  LatLngBoundsExpression,
  Map as LeafletMap,
} from 'leaflet';

export type OperationalLayer = 'incident' | 'station' | 'water';

export type OperationalLayerVisibility = Record<OperationalLayer, boolean>;

const ANTIQUE_RELATION_ID = 1506746;
const ANTIQUE_BOUNDS: LatLngBoundsExpression = [
  [10.2712376, 121.1450673],
  [12.2794760, 122.3323830],
];

const ANTIQUE_CENTER: [number, number] = [11.2753568, 121.7387252];
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_REFERENCE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const ESRI_IMAGERY_ATTRIBUTION = 'Sources: Esri, DigitalGlobe, GeoEye, i-cubed, USDA FSA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community';
const ESRI_REFERENCE_ATTRIBUTION = 'Sources: Esri, HERE, Garmin, FAO, NOAA, USGS, EPA, NPS';
const ANTIQUE_BOUNDARY_URL = '/data/antique-boundary.geojson';
const PUBLIC_STRUCTURE_OVERPASS_ENDPOINTS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
] as const;
const PUBLIC_STRUCTURE_OVERPASS_QUERY = `
[out:json][timeout:40];
rel(${ANTIQUE_RELATION_ID});
map_to_area->.antique;
(
  nwr(area.antique)["amenity"~"school|college|university|hospital|fire_station|police|clinic|townhall|community_centre|place_of_worship|marketplace|social_facility|library|kindergarten"];
  nwr(area.antique)["office"="government"];
  nwr(area.antique)["emergency"="assembly_point"];
  nwr(area.antique)["social_facility"="shelter"];
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
  const category = tags.emergency
    ?? tags.social_facility
    ?? tags.amenity
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
  if (['assembly point', 'shelter', 'community centre', 'social facility'].includes(category)) {
    return '#15803d';
  }
  return alabPalette.water;
}

function publicStructureIcon(leaflet: typeof import('leaflet'), category: string) {
  const iconClass = ['school', 'college', 'university', 'kindergarten', 'library'].includes(category)
    ? 'fa-school'
    : ['hospital', 'clinic'].includes(category)
      ? 'fa-hospital'
      : ['fire station', 'police', 'government', 'townhall'].includes(category)
        ? 'fa-building-columns'
        : ['assembly point', 'shelter', 'community centre', 'social facility'].includes(category)
          ? 'fa-house-flag'
          : 'fa-landmark';

  return leaflet.divIcon({
    className: 'mbfp-facility-marker-wrap',
    html: `<span class="mbfp-facility-marker" style="--facility-color: ${publicStructureColor(category)}"><i class="fa-solid ${iconClass}" aria-hidden="true"></i></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function publicStructurePopup(properties: PublicStructureProperties) {
  const name = properties.name || 'Public facility';
  return `<div class="mbfp-map-popup"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(properties.category)}</span><small>OpenStreetMap</small></div>`;
}

function addAntiqueResetControl(leaflet: typeof import('leaflet'), map: LeafletMap) {
  const AntiqueResetControl = leaflet.Control.extend({
    options: { position: 'topright' },
    onAdd: () => {
      const wrapper = leaflet.DomUtil.create('div', 'leaflet-control-antique-reset leaflet-bar');
      const button = leaflet.DomUtil.create('button', '', wrapper);
      button.type = 'button';
      button.title = 'Show all Antique';
      button.setAttribute('aria-label', 'Show all Antique');
      button.innerHTML = '<i class="fa-solid fa-map" aria-hidden="true"></i>';

      leaflet.DomEvent.disableClickPropagation(wrapper);
      leaflet.DomEvent.on(button, 'click', () => {
        map.fitBounds(ANTIQUE_BOUNDS, { padding: [24, 24], animate: true });
      });

      return wrapper;
    },
  });

  new AntiqueResetControl().addTo(map);
}

async function loadAntiqueBoundary(
  leaflet: typeof import('leaflet'),
  map: LeafletMap,
  isActive: () => boolean,
) {
  try {
    const response = await fetch(ANTIQUE_BOUNDARY_URL);
    if (!response.ok) throw new Error(`Boundary HTTP ${response.status}`);
    const boundary = await response.json() as FeatureCollection;
    if (!isActive()) return;

    leaflet.geoJSON(boundary, {
      style: {
        color: alabPalette.incident,
        weight: 2,
        opacity: 0.72,
        fillOpacity: 0,
      },
    })
      .bindPopup('<strong>Province of Antique</strong><br/>Operational fire response coverage')
      .addTo(map);
  } catch {
    if (!isActive()) return;
    leaflet.rectangle(ANTIQUE_BOUNDS, {
      color: alabPalette.incident,
      weight: 1.5,
      opacity: 0.45,
      fillOpacity: 0,
    }).addTo(map);
  }
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
  const shouldShow = map.getZoom() >= 12;
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
    const timeoutId = window.setTimeout(() => controller.abort(), 45000);

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
        const marker = leaflet.marker(
          [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
          {
            icon: publicStructureIcon(leaflet, properties.category),
            title: properties.name || properties.category,
            alt: properties.name || properties.category,
          },
        )
          .bindPopup(publicStructurePopup(properties), { maxWidth: 240 });

        marker.addTo(layer);
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
        zoom: 7.5,
        minZoom: 7,
        maxZoom: 19,
        maxBounds: ANTIQUE_BOUNDS,
        maxBoundsViscosity: 1,
        zoomControl: false,
        preferCanvas: true,
      });
      mapRef.current = map;

      const streetLayer = leaflet.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      const satelliteLayer = leaflet.tileLayer(SATELLITE_TILE_URL, {
        maxZoom: 19,
        attribution: ESRI_IMAGERY_ATTRIBUTION,
      }).addTo(map);
      const referenceLayer = leaflet.tileLayer(SATELLITE_REFERENCE_TILE_URL, {
        maxZoom: 19,
        attribution: ESRI_REFERENCE_ATTRIBUTION,
      }).addTo(map);
      leaflet.control.layers(
        { Satellite: satelliteLayer, 'Street map': streetLayer },
        { 'Place labels': referenceLayer },
        { position: 'topright', collapsed: true },
      ).addTo(map);
      leaflet.control.zoom({ position: 'topright' }).addTo(map);
      addAntiqueResetControl(leaflet, map);
      leaflet.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 120 }).addTo(map);
      void loadAntiqueBoundary(leaflet, map, () => isMounted);

      leaflet.geoJSON(recommendedRoute, {
        style: {
          color: alabPalette.road,
          weight: 3,
          opacity: 0.76,
          dashArray: '7 7',
        },
      }).bindPopup('<strong>Recommended Route</strong>').addTo(map);

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
        <small>Satellite imagery + OSM facility reference</small>
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
          Mapped buildings &amp; satellite roofs
        </div>
        <div className="mbfp-gis-legend-item">
          <span className="mbfp-gis-place-key" />
          Schools & public facilities
        </div>
        <div className="mbfp-gis-legend-item">
          <span className="mbfp-gis-evacuation-key" />
          Evacuation areas
        </div>
      </div>
    </div>
  );
}
