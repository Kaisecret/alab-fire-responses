'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import { useEffect, useRef } from 'react';
import type { FeatureCollection, LineString, Polygon } from 'geojson';
import type { GeoJSONSource, LngLatBoundsLike, Map, Marker } from 'maplibre-gl';

const ANTIQUE_BOUNDS: LngLatBoundsLike = [
  [121.62, 10.28],
  [122.48, 11.9],
];

const ANTIQUE_CENTER: [number, number] = [122.04, 11.08];

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
  const style = map.getStyle();

  for (const layer of style.layers ?? []) {
    if (layer.type === 'background') {
      map.setPaintProperty(layer.id, 'background-color', alabPalette.land);
    }

    if (layer.type === 'raster') {
      map.setPaintProperty(layer.id, 'raster-saturation', -0.35);
      map.setPaintProperty(layer.id, 'raster-contrast', -0.12);
      map.setPaintProperty(layer.id, 'raster-brightness-min', 0.08);
      map.setPaintProperty(layer.id, 'raster-brightness-max', 0.94);
    }

    if (layer.type === 'fill' && /water/i.test(layer.id)) {
      map.setPaintProperty(layer.id, 'fill-color', alabPalette.waterBase);
    }

    if (layer.type === 'fill' && /land|park|wood|grass|earth/i.test(layer.id)) {
      map.setPaintProperty(layer.id, 'fill-color', alabPalette.land);
    }

    if (layer.type === 'line' && /road|street|path|track/i.test(layer.id)) {
      map.setPaintProperty(layer.id, 'line-color', alabPalette.road);
    }

    if (layer.type === 'symbol' && /label|place|name/i.test(layer.id)) {
      map.setPaintProperty(layer.id, 'text-color', alabPalette.text);
      map.setPaintProperty(layer.id, 'text-halo-color', '#ffffff');
      map.setPaintProperty(layer.id, 'text-halo-width', 1.2);
    }
  }
}

export function AntiqueGisMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);

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
          glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap contributors',
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
              id: 'osm-muted-raster',
              type: 'raster',
              source: 'osm',
              paint: {
                'raster-saturation': -0.35,
                'raster-contrast': -0.12,
                'raster-brightness-min': 0.08,
                'raster-brightness-max': 0.94,
              },
            },
          ],
        },
        center: ANTIQUE_CENTER,
        zoom: 8.4,
        minZoom: 8,
        maxZoom: 15,
        maxBounds: ANTIQUE_BOUNDS,
        attributionControl: false,
      });

      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      map.on('load', () => {
        tintBaseMap(map);
        addOperationalLayers(map);
        refreshBoundaryData(map);

        markersRef.current = mapPoints.map((point) => (
          new maplibregl.Marker({
            element: createMarkerElement(point),
            anchor: 'bottom',
            offset: [0, -4],
          })
            .setLngLat(point.coordinates)
            .addTo(map)
        ));

        map.fitBounds(ANTIQUE_BOUNDS, {
          padding: { top: 42, right: 42, bottom: 42, left: 42 },
          duration: 0,
        });
      });
    }

    initializeMap();

    return () => {
      isMounted = false;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="mbfp-antique-map-shell">
      <div ref={containerRef} className="mbfp-antique-map" aria-label="Province of Antique GIS map" />
      <div className="mbfp-antique-map-wash" />
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
      </div>
    </div>
  );
}
