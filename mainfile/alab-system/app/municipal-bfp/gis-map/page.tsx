'use client';

import { useState } from 'react';
import {
  AntiqueGisMap,
  type OperationalLayer,
  type OperationalLayerVisibility,
} from '../../_components/antique-gis-map';

const styles = `
  .mbfp-page { padding: 1.2rem 1.5rem 2rem; font-family: 'Plus Jakarta Sans', sans-serif; }
  .mbfp-page-header { margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; }
  .mbfp-page-header h1 { font-size: 1.3rem; font-weight: 800; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; }
  .mbfp-page-header h1 i { color: #D00F09; }
  .mbfp-gis-controls { display: flex; gap: 0.5rem; }
  .mbfp-gis-ctrl { padding: 0.45rem 0.9rem; border-radius: 0.5rem; font-size: 0.78rem; font-weight: 600; border: 1px solid #e5e7eb; background: white; color: #4b5563; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 0.3rem; }
  .mbfp-gis-ctrl:hover { background: #fef2f2; color: #D00F09; border-color: #fecaca; }
  .mbfp-gis-ctrl.active { background: #D00F09; color: white; border-color: #D00F09; }
  .mbfp-gis-ctrl i { font-size: 0.85rem; }
  .mbfp-antique-map-shell { width: 100%; height: calc(100vh - 200px); min-height: 500px; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; position: relative; overflow: hidden; background: #eef8f1; }
  .mbfp-antique-map { position: absolute; inset: 0; }
  .mbfp-antique-map-title { position: absolute; top: 14px; left: 14px; z-index: 1000; display: flex; flex-direction: column; gap: 0.1rem; background: rgba(255,255,255,0.92); border: 1px solid rgba(229,231,235,0.9); border-radius: 0.55rem; padding: 0.55rem 0.75rem; box-shadow: 0 8px 20px rgba(31,41,55,0.1); }
  .mbfp-antique-map-title span { font-size: 0.82rem; font-weight: 800; color: #1f2937; }
  .mbfp-antique-map-title small { font-size: 0.62rem; font-weight: 600; color: #6b7280; }
  .mbfp-antique-marker { border: none; background: transparent; color: var(--marker-color); display: flex; flex-direction: column; align-items: center; gap: 0.1rem; transform: translateY(0); cursor: pointer; filter: drop-shadow(0 3px 5px rgba(15,23,42,0.28)); }
  .mbfp-antique-marker i { font-size: 1.55rem; line-height: 1; }
  .mbfp-antique-marker.station i { font-size: 1.45rem; }
  .mbfp-antique-marker.water i { font-size: 1.25rem; }
  .mbfp-antique-marker span { max-width: 110px; color: #1f2937; background: rgba(255,255,255,0.92); border: 1px solid rgba(229,231,235,0.9); padding: 0.12rem 0.38rem; border-radius: 0.25rem; font-size: 0.62rem; font-weight: 800; white-space: nowrap; box-shadow: 0 2px 5px rgba(31,41,55,0.09); }
  .mbfp-antique-marker:hover { transform: translateY(-2px) scale(1.08); }
  .leaflet-container { font-family: 'Plus Jakarta Sans', sans-serif; background: #dceff8; }
  .leaflet-control-zoom { border: none !important; border-radius: 0.45rem; overflow: hidden; box-shadow: 0 5px 16px rgba(31,41,55,0.16); }
  .leaflet-control-zoom a { width: 2rem; height: 2rem; line-height: 2rem; color: #1f2937; border: none; }
  .leaflet-control-zoom a:hover { color: #D00F09; background: #fff7f7; }
  .leaflet-control-scale-line { border: 1px solid rgba(31,41,55,0.55); border-top: none; background: rgba(255,255,255,0.86); color: #1f2937; font-size: 0.6rem; }
  .leaflet-control-antique-reset { border: none !important; margin-top: 0.45rem !important; overflow: hidden; box-shadow: 0 5px 16px rgba(31,41,55,0.16); }
  .leaflet-control-antique-reset button { width: 2rem; height: 2rem; display: grid; place-items: center; border: 0; background: rgba(255,255,255,0.96); color: #1f2937; cursor: pointer; }
  .leaflet-control-antique-reset button:hover { color: #D00F09; background: #fff7f7; }
  .leaflet-tooltip.leaflet-operational-label { border: none; border-radius: 0.25rem; padding: 0.14rem 0.32rem; color: #1f2937; background: rgba(255,255,255,0.94); box-shadow: 0 2px 6px rgba(31,41,55,0.14); font-size: 0.62rem; font-weight: 800; }
  .leaflet-popup-content { margin: 0.75rem 0.85rem; }
  .leaflet-popup-content-wrapper { border-radius: 0.55rem; box-shadow: 0 8px 24px rgba(31,41,55,0.18); }
  .mbfp-gis-legend { position: absolute; bottom: 12px; left: 12px; background: rgba(255,255,255,0.95); border-radius: 0.5rem; padding: 0.6rem 0.8rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 1000; display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.68rem; font-weight: 600; color: #4b5563; }
  .mbfp-gis-legend-item { display: flex; align-items: center; gap: 0.4rem; }
  .mbfp-gis-legend-dot { width: 10px; height: 10px; border-radius: 50%; }
  .mbfp-gis-route-line { border-top: 2px dashed #4b5563; width: 16px; display: inline-block; }
  .mbfp-gis-building-key { width: 10px; height: 10px; border: 1px solid #b9c9c1; background: #ffffff; display: inline-block; }
  .mbfp-gis-place-key { width: 10px; height: 10px; border-radius: 50%; background: #00838f; border: 1px solid #ffffff; box-shadow: 0 0 0 1px #00838f; display: inline-block; }
  .mbfp-gis-evacuation-key { width: 10px; height: 10px; border-radius: 50%; background: #15803d; border: 1px solid #ffffff; box-shadow: 0 0 0 1px #15803d; display: inline-block; }
  .mbfp-map-popup { display: flex; flex-direction: column; gap: 0.2rem; font-family: 'Plus Jakarta Sans', sans-serif; color: #1f2937; }
  .mbfp-map-popup strong { font-size: 0.78rem; }
  .mbfp-map-popup span { color: #00838f; font-size: 0.65rem; font-weight: 700; text-transform: capitalize; }
  .mbfp-map-popup small { color: #6b7280; font-size: 0.62rem; }

  /* New Layout Styles */
  .mbfp-layout-grid {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .mbfp-bottom-stats {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
  }
  
  /* Side Card Styles */
  .mbfp-side-card {
    background: #ffffff;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    border: 1px solid #f3f4f6;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .mbfp-side-card-header {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f3f4f6;
  }
  
  .mbfp-side-card-title {
    font-weight: 800;
    font-size: 0.9rem;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .mbfp-side-card-title i { color: #D00F09; }
  
  .mbfp-view-all {
    color: #1565C0;
    font-size: 0.75rem;
    font-weight: 700;
    text-decoration: none;
  }
  
  .mbfp-tabs {
    display: flex;
    padding: 0.75rem 1rem;
    gap: 0.5rem;
    border-bottom: 1px solid #f3f4f6;
  }
  
  .mbfp-tab {
    padding: 0.4rem 0.8rem;
    border-radius: 2rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: #4b5563;
    background: white;
    border: 1px solid #e5e7eb;
    cursor: pointer;
  }
  
  .mbfp-tab.active {
    background: #1f2937;
    color: white;
    border-color: #1f2937;
  }
  
  .mbfp-incident-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .mbfp-incident-item {
    background: #ffffff;
    border: 1px solid #f3f4f6;
    border-radius: 0.5rem;
    padding: 0.75rem;
    display: flex;
    gap: 0.75rem;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  }
  
  .mbfp-incident-icon {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 50%;
    background: #D00F09;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }
  
  .mbfp-incident-details {
    flex: 1;
  }
  
  .mbfp-incident-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.2rem;
  }
  
  .mbfp-incident-name {
    font-weight: 800;
    font-size: 0.8rem;
    color: #1f2937;
  }
  
  .mbfp-incident-badge {
    font-size: 0.6rem;
    padding: 0.15rem 0.4rem;
    border-radius: 1rem;
    font-weight: 700;
  }
  
  .mbfp-incident-badge.responding { background: #fef2f2; color: #D00F09; border: 1px solid #fecaca; }
  
  .mbfp-incident-location {
    font-size: 0.7rem;
    color: #4b5563;
    line-height: 1.3;
    margin-bottom: 0.4rem;
  }
  
  .mbfp-incident-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .mbfp-incident-meta-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.65rem;
    color: #6b7280;
    font-weight: 600;
  }
  
  .mbfp-incident-meta-item { display: flex; align-items: center; gap: 0.3rem; }
  .mbfp-incident-meta-item .dot { width: 6px; height: 6px; border-radius: 50%; }
  .mbfp-incident-meta-item .dot.orange { background: #f59e0b; }
  .mbfp-incident-meta-item .dot.green { background: #10b981; }
  .mbfp-incident-meta-item .dot.red { background: #ef4444; }
  
  .mbfp-incident-time {
    font-size: 0.65rem;
    color: #6b7280;
    font-weight: 600;
  }
  
  .mbfp-view-all-btn {
    padding: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 0.8rem;
    color: #1f2937;
    border-top: 1px solid #f3f4f6;
    background: transparent;
    border-bottom: none;
    border-left: none;
    border-right: none;
    cursor: pointer;
    width: 100%;
  }
  
  /* Bottom Stats */
  .mbfp-bottom-stat {
    background: #ffffff;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    border: 1px solid #f3f4f6;
    padding: 1.25rem 1rem;
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .mbfp-bstat-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    flex-shrink: 0;
  }
  
  .mbfp-bstat-icon.red { background: #fef2f2; color: #D00F09; }
  .mbfp-bstat-icon.slate { background: #f1f5f9; color: #475569; }
  .mbfp-bstat-icon.blue { background: #eff6ff; color: #2563eb; }
  .mbfp-bstat-icon.purple { background: #f5f3ff; color: #7c3aed; }
  .mbfp-bstat-icon.teal { background: #f0fdfa; color: #0d9488; }
  
  .mbfp-bstat-content {
    display: flex;
    flex-direction: column;
  }
  
  .mbfp-bstat-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: #4b5563;
    margin-bottom: 0.2rem;
  }
  
  .mbfp-bstat-value {
    font-size: 1.5rem;
    font-weight: 800;
    color: #1f2937;
    line-height: 1;
    margin-bottom: 0.25rem;
  }
  
  .mbfp-bstat-sub {
    font-size: 0.7rem;
    font-weight: 600;
  }
  
  .mbfp-bstat-sub.red { color: #D00F09; }
  .mbfp-bstat-sub.green { color: #16a34a; }
  .mbfp-bstat-sub.blue { color: #2563eb; }
  
  @media (max-width: 1024px) {
    .mbfp-layout-grid { grid-template-columns: 1fr; }
    .mbfp-bottom-stats { grid-template-columns: repeat(3, 1fr); }
  }

  @media (max-width: 768px) {
    .mbfp-page { padding: 0.8rem; }
    .mbfp-page-header { align-items: flex-start; flex-direction: column; gap: 0.75rem; }
    .mbfp-gis-controls { flex-wrap: wrap; }
    .mbfp-layout-grid { grid-template-columns: minmax(0, 1fr); }
    .mbfp-antique-map-shell { height: 560px; min-height: 560px; min-width: 0; max-width: 100%; }
    .mbfp-antique-map-title { top: 10px; left: 10px; max-width: calc(100% - 7.5rem); }
    .mbfp-gis-legend { max-width: calc(100% - 5.5rem); padding: 0.45rem 0.55rem; gap: 0.2rem; font-size: 0.58rem; }
    .leaflet-control-antique-reset button { width: 2.25rem; height: 2.25rem; }
    .mbfp-bottom-stats { grid-template-columns: 1fr; }
  }
`;

export default function GisMapPage() {
  const [visibleLayers, setVisibleLayers] = useState<OperationalLayerVisibility>({
    incident: true,
    station: true,
    water: true,
  });
  const allLayersVisible = Object.values(visibleLayers).every(Boolean);

  const toggleLayer = (layer: OperationalLayer) => {
    setVisibleLayers((current) => ({
      ...current,
      [layer]: !current[layer],
    }));
  };

  const toggleAllLayers = () => {
    const nextVisibility = !allLayersVisible;
    setVisibleLayers({
      incident: nextVisibility,
      station: nextVisibility,
      water: nextVisibility,
    });
  };

  return (
    <>
      <style>{styles}</style>
      <div className="mbfp-page">
        <div className="mbfp-page-header">
          <h1><i className="fa-solid fa-map-location-dot" /> GIS Map</h1>
          <div className="mbfp-gis-controls">
            <button
              type="button"
              className={`mbfp-gis-ctrl ${visibleLayers.incident ? 'active' : ''}`}
              aria-pressed={visibleLayers.incident}
              onClick={() => toggleLayer('incident')}
            ><i className="fa-solid fa-fire" /> Incidents</button>
            <button
              type="button"
              className={`mbfp-gis-ctrl ${visibleLayers.station ? 'active' : ''}`}
              aria-pressed={visibleLayers.station}
              onClick={() => toggleLayer('station')}
            ><i className="fa-solid fa-house-fire" /> Stations</button>
            <button
              type="button"
              className={`mbfp-gis-ctrl ${visibleLayers.water ? 'active' : ''}`}
              aria-pressed={visibleLayers.water}
              onClick={() => toggleLayer('water')}
            ><i className="fa-solid fa-droplet" /> Water Sources</button>
            <button
              type="button"
              className={`mbfp-gis-ctrl ${allLayersVisible ? 'active' : ''}`}
              aria-pressed={allLayersVisible}
              onClick={toggleAllLayers}
            ><i className="fa-solid fa-layer-group" /> All Layers</button>
          </div>
        </div>

        <div className="mbfp-layout-grid">
          <AntiqueGisMap visibleLayers={visibleLayers} />

          <div className="mbfp-side-card">
            <div className="mbfp-side-card-header">
              <div className="mbfp-side-card-title"><i className="fa-solid fa-fire" /> Incidents</div>
              <a href="#" className="mbfp-view-all">View All</a>
            </div>
            
            <div className="mbfp-tabs">
              <button className="mbfp-tab">All</button>
              <button className="mbfp-tab">Pending</button>
              <button className="mbfp-tab active">Responding</button>
              <button className="mbfp-tab">Resolved</button>
            </div>
            
            <div className="mbfp-incident-list">
              {/* Incident 1 */}
              <div className="mbfp-incident-item">
                <div className="mbfp-incident-icon"><i className="fa-solid fa-fire" /></div>
                <div className="mbfp-incident-details">
                  <div className="mbfp-incident-header">
                    <div className="mbfp-incident-name">Residential Fire</div>
                    <div className="mbfp-incident-badge responding">Responding</div>
                  </div>
                  <div className="mbfp-incident-location">Brgy. Poblacion<br/>San Jose de Buenavista</div>
                  <div className="mbfp-incident-meta">
                    <div className="mbfp-incident-meta-left">
                      <div className="mbfp-incident-meta-item"><span className="dot orange" /> Medium</div>
                      <div className="mbfp-incident-meta-item"><i className="fa-solid fa-location-dot" /> 1.2 km away</div>
                    </div>
                    <div className="mbfp-incident-time">10:28 AM</div>
                  </div>
                </div>
              </div>

              {/* Incident 2 */}
              <div className="mbfp-incident-item">
                <div className="mbfp-incident-icon"><i className="fa-solid fa-fire" /></div>
                <div className="mbfp-incident-details">
                  <div className="mbfp-incident-header">
                    <div className="mbfp-incident-name">Grass Fire</div>
                    <div className="mbfp-incident-badge responding">Responding</div>
                  </div>
                  <div className="mbfp-incident-location">Brgy. Mag-aba<br/>San Jose de Buenavista</div>
                  <div className="mbfp-incident-meta">
                    <div className="mbfp-incident-meta-left">
                      <div className="mbfp-incident-meta-item"><span className="dot green" /> Low</div>
                      <div className="mbfp-incident-meta-item"><i className="fa-solid fa-location-dot" /> 3.6 km away</div>
                    </div>
                    <div className="mbfp-incident-time">09:56 AM</div>
                  </div>
                </div>
              </div>

              {/* Incident 3 */}
              <div className="mbfp-incident-item">
                <div className="mbfp-incident-icon"><i className="fa-solid fa-fire" /></div>
                <div className="mbfp-incident-details">
                  <div className="mbfp-incident-header">
                    <div className="mbfp-incident-name">Commercial Fire</div>
                    <div className="mbfp-incident-badge responding">Responding</div>
                  </div>
                  <div className="mbfp-incident-location">Brgy. Tagbak<br/>San Jose de Buenavista</div>
                  <div className="mbfp-incident-meta">
                    <div className="mbfp-incident-meta-left">
                      <div className="mbfp-incident-meta-item"><span className="dot red" /> High</div>
                      <div className="mbfp-incident-meta-item"><i className="fa-solid fa-location-dot" /> 2.1 km away</div>
                    </div>
                    <div className="mbfp-incident-time">09:15 AM</div>
                  </div>
                </div>
              </div>
            </div>

            <button className="mbfp-view-all-btn">
              View All Incidents <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mbfp-bottom-stats">
          <div className="mbfp-bottom-stat">
            <div className="mbfp-bstat-icon red"><i className="fa-solid fa-fire-flame-curved" /></div>
            <div className="mbfp-bstat-content">
              <span className="mbfp-bstat-label">Active Incidents</span>
              <span className="mbfp-bstat-value">14</span>
              <span className="mbfp-bstat-sub red">Responding</span>
            </div>
          </div>
          
          <div className="mbfp-bottom-stat">
            <div className="mbfp-bstat-icon slate"><i className="fa-solid fa-clipboard-check" /></div>
            <div className="mbfp-bstat-content">
              <span className="mbfp-bstat-label">Verified Today</span>
              <span className="mbfp-bstat-value">8</span>
              <span className="mbfp-bstat-sub green">+2 from yesterday</span>
            </div>
          </div>

          <div className="mbfp-bottom-stat">
            <div className="mbfp-bstat-icon blue"><i className="fa-solid fa-truck-moving" /></div>
            <div className="mbfp-bstat-content">
              <span className="mbfp-bstat-label">Firetrucks Available</span>
              <span className="mbfp-bstat-value">6 <span style={{ color: '#9ca3af', fontWeight: '600' }}>/ 14</span></span>
              <span className="mbfp-bstat-sub blue">43% in service</span>
            </div>
          </div>

          <div className="mbfp-bottom-stat">
            <div className="mbfp-bstat-icon purple"><i className="fa-solid fa-users" /></div>
            <div className="mbfp-bstat-content">
              <span className="mbfp-bstat-label">Responders On Duty</span>
              <span className="mbfp-bstat-value">52</span>
              <span className="mbfp-bstat-sub blue">Active personnel</span>
            </div>
          </div>

          <div className="mbfp-bottom-stat">
            <div className="mbfp-bstat-icon teal"><i className="fa-solid fa-droplet" /></div>
            <div className="mbfp-bstat-content">
              <span className="mbfp-bstat-label">Water Sources</span>
              <span className="mbfp-bstat-value">23</span>
              <span className="mbfp-bstat-sub green">Verified</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
