'use client';

import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import type { OperationalLayerVisibility } from '../../_components/antique-gis-map';

const AntiqueGisMap = dynamic(
  () => import('../../_components/antique-gis-map').then((mod) => mod.AntiqueGisMap),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '480px', color: '#64748B', fontSize: '0.85rem' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.5rem', color: '#DB1B0D' }} /> Loading Provincial GIS Map…
      </div>
    ),
  }
);

const styles = `
  .pbfp-gis-page {
    padding: 1.25rem 1.75rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .pbfp-gis-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .pbfp-gis-title h1 {
    font-size: 1.35rem;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
  }

  .pbfp-gis-title h1 i {
    color: #DB1B0D;
  }

  .pbfp-gis-title p {
    font-size: 0.84rem;
    color: #64748B;
    margin-top: 0.25rem;
  }

  .pbfp-layer-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .pbfp-layer-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.85rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #475569;
    transition: all 0.15s;
  }

  .pbfp-layer-btn.active {
    background: #0F172A;
    color: #FFFFFF;
    border-color: #0F172A;
  }

  .pbfp-map-container {
    height: calc(100vh - 200px);
    min-height: 520px;
    background: #E2E8F0;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #CBD5E1;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08);
    position: relative;
  }

  /* Override map shell inside */
  .mbfp-antique-map-shell {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .mbfp-antique-map {
    width: 100%;
    height: 100%;
  }

  .mbfp-antique-map-title {
    position: absolute;
    top: 12px;
    left: 12px;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(8px);
    color: #FFFFFF;
    padding: 0.5rem 0.85rem;
    border-radius: 8px;
    z-index: 500;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
  }

  .mbfp-antique-map-title span {
    font-weight: 800;
    font-size: 0.84rem;
  }

  .mbfp-antique-map-title small {
    font-size: 0.68rem;
    color: #94A3B8;
  }

  .mbfp-gis-legend {
    position: absolute;
    bottom: 18px;
    right: 18px;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 0.75rem;
    color: #F8FAFC;
    font-size: 0.72rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    z-index: 500;
  }

  .mbfp-gis-legend-item {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .mbfp-gis-legend-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
`;

export default function ProvincialGisMapPage() {
  const [layers, setLayers] = useState<OperationalLayerVisibility>({
    incident: true,
    station: true,
    water: true,
  });

  const toggleLayer = (layer: keyof OperationalLayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <>
      <style>{styles}</style>
      <div className="pbfp-gis-page">
        <div className="pbfp-gis-header">
          <div className="pbfp-gis-title">
            <h1>
              <i className="fa-solid fa-map-location-dot" /> Provincial GIS Incident & Infrastructure Map
            </h1>
            <p>
              Interactive spatial monitoring across 18 municipalities: live fire incidents, BFP stations, water sources, and response routes.
            </p>
          </div>

          <div className="pbfp-layer-controls">
            <button
              type="button"
              className={`pbfp-layer-btn ${layers.incident ? 'active' : ''}`}
              onClick={() => toggleLayer('incident')}
            >
              <i className="fa-solid fa-fire" style={{ color: '#DB1B0D' }} /> Incidents
            </button>
            <button
              type="button"
              className={`pbfp-layer-btn ${layers.station ? 'active' : ''}`}
              onClick={() => toggleLayer('station')}
            >
              <i className="fa-solid fa-building-shield" style={{ color: '#2563EB' }} /> BFP Stations
            </button>
            <button
              type="button"
              className={`pbfp-layer-btn ${layers.water ? 'active' : ''}`}
              onClick={() => toggleLayer('water')}
            >
              <i className="fa-solid fa-droplet" style={{ color: '#059669' }} /> Water Sources
            </button>
          </div>
        </div>

        <div className="pbfp-map-container">
          <AntiqueGisMap visibleLayers={layers} />
        </div>
      </div>
    </>
  );
}
