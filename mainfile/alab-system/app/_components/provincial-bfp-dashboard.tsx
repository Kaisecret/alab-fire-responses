'use client';

import Link from 'next/link';
import { useState } from 'react';

type MunicipalStationStatus = {
  name: string;
  status: 'READY' | 'RESPONDING' | 'MUTUAL_AID' | 'STANDBY';
  activeIncidents: number;
  availableTrucks: number;
  totalTrucks: number;
  dutyResponders: number;
  lastCheckIn: string;
};

const municipalReadinessData: MunicipalStationStatus[] = [
  { name: 'San Jose de Buenavista', status: 'RESPONDING', activeIncidents: 1, availableTrucks: 4, totalTrucks: 5, dutyResponders: 16, lastCheckIn: 'Just now' },
  { name: 'Sibalom', status: 'RESPONDING', activeIncidents: 1, availableTrucks: 2, totalTrucks: 3, dutyResponders: 12, lastCheckIn: '2m ago' },
  { name: 'Tibiao', status: 'RESPONDING', activeIncidents: 1, availableTrucks: 1, totalTrucks: 2, dutyResponders: 9, lastCheckIn: '5m ago' },
  { name: 'Hamtic', status: 'MUTUAL_AID', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 10, lastCheckIn: '3m ago' },
  { name: 'Bugasong', status: 'READY', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 8, lastCheckIn: '6m ago' },
  { name: 'Pandan', status: 'READY', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 10, lastCheckIn: '8m ago' },
  { name: 'Culasi', status: 'READY', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 11, lastCheckIn: '1m ago' },
  { name: 'Barbaza', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 2, dutyResponders: 8, lastCheckIn: '12m ago' },
  { name: 'Tobias Fornier', status: 'READY', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 9, lastCheckIn: '4m ago' },
  { name: 'Patnongon', status: 'READY', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 8, lastCheckIn: '7m ago' },
  { name: 'Anini-y', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 7, lastCheckIn: '15m ago' },
  { name: 'Belison', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 6, lastCheckIn: '10m ago' },
  { name: 'Caluya', status: 'READY', activeIncidents: 0, availableTrucks: 2, totalTrucks: 2, dutyResponders: 8, lastCheckIn: '18m ago' },
  { name: 'Laua-an', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 7, lastCheckIn: '9m ago' },
  { name: 'Libertad', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 7, lastCheckIn: '14m ago' },
  { name: 'San Remigio', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 8, lastCheckIn: '11m ago' },
  { name: 'Sebaste', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 6, lastCheckIn: '16m ago' },
  { name: 'Valderrama', status: 'READY', activeIncidents: 0, availableTrucks: 1, totalTrucks: 1, dutyResponders: 7, lastCheckIn: '13m ago' },
];

const dashboardStyles = `
  .pbfp-dash {
    padding: 1.5rem 1.75rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ========== WELCOME BANNER ========== */
  .pbfp-hero {
    background: linear-gradient(135deg, #161C2B 0%, #1E273D 100%);
    border-radius: 14px;
    padding: 1.5rem 1.75rem;
    color: #FFFFFF;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.08);
    position: relative;
    overflow: hidden;
  }

  .pbfp-hero::after {
    content: '';
    position: absolute;
    right: -40px;
    top: -40px;
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, rgba(219, 27, 13, 0.2) 0%, transparent 70%);
    pointer-events: none;
  }

  .pbfp-hero-content {
    max-width: 680px;
    position: relative;
    z-index: 1;
  }

  .pbfp-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    background: rgba(219, 27, 13, 0.2);
    border: 1px solid rgba(219, 27, 13, 0.5);
    color: #FFA59E;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 0.6rem;
  }

  .pbfp-hero-title {
    font-size: 1.45rem;
    font-weight: 800;
    color: #FFFFFF;
    line-height: 1.25;
    margin-bottom: 0.4rem;
  }

  .pbfp-hero-desc {
    color: #94A3B8;
    font-size: 0.88rem;
    line-height: 1.5;
  }

  .pbfp-hero-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .pbfp-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.15rem;
    border-radius: 8px;
    font-size: 0.84rem;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.18s;
    border: none;
    font-family: inherit;
  }

  .pbfp-btn-primary {
    background: #DB1B0D;
    color: #FFFFFF;
    box-shadow: 0 4px 14px rgba(219, 27, 13, 0.35);
  }

  .pbfp-btn-primary:hover {
    background: #c2160a;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(219, 27, 13, 0.45);
  }

  .pbfp-btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    color: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .pbfp-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  /* ========== METRICS KPI GRID ========== */
  .pbfp-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 1rem;
  }

  .pbfp-kpi-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 1.15rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    position: relative;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .pbfp-kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  }

  .pbfp-kpi-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pbfp-kpi-title {
    font-size: 0.75rem;
    font-weight: 700;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .pbfp-kpi-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
  }

  .pbfp-kpi-icon.red { background: #FEF2F2; color: #DB1B0D; }
  .pbfp-kpi-icon.blue { background: #EFF6FF; color: #2563EB; }
  .pbfp-kpi-icon.emerald { background: #ECFDF5; color: #059669; }
  .pbfp-kpi-icon.amber { background: #FFFBEB; color: #D97706; }

  .pbfp-kpi-body {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }

  .pbfp-kpi-value {
    font-size: 1.85rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1;
  }

  .pbfp-kpi-subtitle {
    font-size: 0.76rem;
    color: #64748B;
  }

  .pbfp-kpi-footer {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    color: #64748B;
    border-top: 1px solid #F1F5F9;
    padding-top: 0.55rem;
  }

  .pbfp-kpi-footer strong {
    color: #0F172A;
  }

  /* ========== TWO-COLUMN OPERATIONAL SECTIONS ========== */
  .pbfp-grid-2col {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 1.25rem;
  }

  .pbfp-panel {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .pbfp-panel-header {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    background: #FAFAFA;
  }

  .pbfp-panel-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .pbfp-panel-title i {
    color: #DB1B0D;
  }

  .pbfp-panel-search {
    padding: 0.35rem 0.65rem;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    font-size: 0.78rem;
    width: 170px;
    outline: none;
    font-family: inherit;
  }

  .pbfp-panel-search:focus {
    border-color: #DB1B0D;
  }

  /* Municipal Readiness Table */
  .pbfp-table-wrap {
    overflow-x: auto;
    max-height: 480px;
  }

  .pbfp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  .pbfp-table th {
    background: #F8FAFC;
    color: #475569;
    font-weight: 700;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid #E2E8F0;
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .pbfp-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #F1F5F9;
    color: #334155;
    vertical-align: middle;
  }

  .pbfp-table tr:hover td {
    background: #F8FAFC;
  }

  .pbfp-muni-name {
    font-weight: 700;
    color: #0F172A;
  }

  .pbfp-muni-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
  }

  .pbfp-muni-badge.ready {
    background: #ECFDF5;
    color: #059669;
  }

  .pbfp-muni-badge.responding {
    background: #FEF2F2;
    color: #DB1B0D;
  }

  .pbfp-muni-badge.mutual_aid {
    background: #FFFBEB;
    color: #D97706;
  }

  /* Right Side Incident Cards & Alerts */
  .pbfp-incidents-list {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .pbfp-incident-item {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-left: 4px solid #DB1B0D;
    border-radius: 8px;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.03);
    transition: transform 0.15s;
  }

  .pbfp-incident-item:hover {
    transform: translateX(2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
  }

  .pbfp-incident-item.alarm-2 {
    border-left-color: #B91C1C;
    background: #FFFAF9;
  }

  .pbfp-incident-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .pbfp-incident-loc {
    font-size: 0.86rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-alarm-tag {
    background: #DB1B0D;
    color: #FFFFFF;
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    letter-spacing: 0.03em;
  }

  .pbfp-incident-details {
    font-size: 0.76rem;
    color: #64748B;
    line-height: 1.4;
  }

  .pbfp-incident-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.7rem;
    color: #475569;
    padding-top: 0.35rem;
    border-top: 1px dashed #E2E8F0;
  }

  /* Activity Feed List */
  .pbfp-feed-list {
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .pbfp-feed-item {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    font-size: 0.78rem;
  }

  .pbfp-feed-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #94A3B8;
    margin-top: 5px;
    flex-shrink: 0;
  }

  .pbfp-feed-dot.red { background: #DB1B0D; }
  .pbfp-feed-dot.green { background: #10B981; }
  .pbfp-feed-dot.blue { background: #2563EB; }

  .pbfp-feed-text {
    flex: 1;
    color: #334155;
    line-height: 1.4;
  }

  .pbfp-feed-time {
    font-size: 0.68rem;
    color: #94A3B8;
    white-space: nowrap;
  }

  @media (max-width: 1024px) {
    .pbfp-grid-2col {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .pbfp-dash {
      padding: 1rem;
      gap: 1rem;
    }

    .pbfp-hero {
      flex-direction: column;
      align-items: flex-start;
      padding: 1.25rem;
    }

    .pbfp-hero-actions {
      width: 100%;
      flex-direction: column;
    }

    .pbfp-hero-actions .pbfp-btn {
      width: 100%;
      justify-content: center;
    }
  }
`;

export function ProvincialBfpDashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStations = municipalReadinessData.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <style>{dashboardStyles}</style>
      <div className="pbfp-dash">
        {/* ===== HERO OVERVIEW ===== */}
        <section className="pbfp-hero">
          <div className="pbfp-hero-content">
            <div className="pbfp-hero-badge">
              <i className="fa-solid fa-satellite-dish" /> Operational Command Status • Antique
            </div>
            <h2 className="pbfp-hero-title">Provincial Fire Command & Coordination Center</h2>
            <p className="pbfp-hero-desc">
              Centralized oversight of all 18 municipalities, real-time fire incident response,
              firetruck resources, mutual aid coordination, and municipal staff provisioning for Antique.
            </p>
          </div>
          <div className="pbfp-hero-actions">
            <Link href="/provincial-bfp/municipal-accounts" className="pbfp-btn pbfp-btn-primary">
              <i className="fa-solid fa-id-card-clip" /> Manage Accounts
            </Link>
            <Link href="/provincial-bfp/gis-map" className="pbfp-btn pbfp-btn-secondary">
              <i className="fa-solid fa-map-location-dot" /> Province GIS Map
            </Link>
          </div>
        </section>

        {/* ===== KPI METRICS ===== */}
        <section className="pbfp-kpi-grid" aria-label="Provincial Key Performance Indicators">
          {/* Active Incidents */}
          <div className="pbfp-kpi-card">
            <div className="pbfp-kpi-header">
              <span className="pbfp-kpi-title">Active Province Incidents</span>
              <div className="pbfp-kpi-icon red">
                <i className="fa-solid fa-fire" />
              </div>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-value">3</span>
              <span className="pbfp-kpi-subtitle">in progress</span>
            </div>
            <div className="pbfp-kpi-footer">
              <span>San Jose (1) • Sibalom (1) • Tibiao (1)</span>
            </div>
          </div>

          {/* Municipal Stations */}
          <div className="pbfp-kpi-card">
            <div className="pbfp-kpi-header">
              <span className="pbfp-kpi-title">Municipal Stations Online</span>
              <div className="pbfp-kpi-icon blue">
                <i className="fa-solid fa-building-shield" />
              </div>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-value">18 / 18</span>
              <span className="pbfp-kpi-subtitle">connected</span>
            </div>
            <div className="pbfp-kpi-footer">
              <span><strong>100%</strong> coverage across Antique</span>
            </div>
          </div>

          {/* Firetruck Readiness */}
          <div className="pbfp-kpi-card">
            <div className="pbfp-kpi-header">
              <span className="pbfp-kpi-title">Total Fire Trucks</span>
              <div className="pbfp-kpi-icon emerald">
                <i className="fa-solid fa-truck-moving" />
              </div>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-value">42</span>
              <span className="pbfp-kpi-subtitle">fleet total</span>
            </div>
            <div className="pbfp-kpi-footer">
              <span>36 Ready • 4 Responding • 2 Maint.</span>
            </div>
          </div>

          {/* Mutual Aid Assistance */}
          <div className="pbfp-kpi-card">
            <div className="pbfp-kpi-header">
              <span className="pbfp-kpi-title">Assistance Requests</span>
              <div className="pbfp-kpi-icon amber">
                <i className="fa-solid fa-handshake-angle" />
              </div>
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-value">1</span>
              <span className="pbfp-kpi-subtitle">active coordination</span>
            </div>
            <div className="pbfp-kpi-footer">
              <span>Sibalom ➔ San Jose Tanker Support</span>
            </div>
          </div>
        </section>

        {/* ===== TWO COLUMN OPERATIONAL PANELS ===== */}
        <section className="pbfp-grid-2col">
          {/* Left Panel: Municipal Readiness Roster */}
          <div className="pbfp-panel">
            <div className="pbfp-panel-header">
              <div className="pbfp-panel-title">
                <i className="fa-solid fa-building-circle-check" />
                <span>Municipal Readiness & Station Status (18 Municipalities)</span>
              </div>
              <input
                type="text"
                className="pbfp-panel-search"
                placeholder="Search municipality…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter municipalities"
              />
            </div>
            <div className="pbfp-table-wrap">
              <table className="pbfp-table">
                <thead>
                  <tr>
                    <th>Municipality</th>
                    <th>Status</th>
                    <th>Incidents</th>
                    <th>Trucks Ready</th>
                    <th>Duty Responders</th>
                    <th>Last Check-In</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStations.map((station) => (
                    <tr key={station.name}>
                      <td className="pbfp-muni-name">{station.name}</td>
                      <td>
                        <span
                          className={`pbfp-muni-badge ${
                            station.status === 'RESPONDING'
                              ? 'responding'
                              : station.status === 'MUTUAL_AID'
                              ? 'mutual_aid'
                              : 'ready'
                          }`}
                        >
                          {station.status === 'RESPONDING' && <i className="fa-solid fa-fire" />}
                          {station.status === 'MUTUAL_AID' && (
                            <i className="fa-solid fa-handshake-angle" />
                          )}
                          {station.status === 'READY' && <i className="fa-solid fa-check" />}
                          {station.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {station.activeIncidents > 0 ? (
                          <strong style={{ color: '#DB1B0D' }}>{station.activeIncidents} Active</strong>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>0</span>
                        )}
                      </td>
                      <td>
                        <strong>{station.availableTrucks}</strong> / {station.totalTrucks}
                      </td>
                      <td>{station.dutyResponders} crew</td>
                      <td style={{ color: '#64748B' }}>{station.lastCheckIn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Active Incidents & System Activity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Active Incidents */}
            <div className="pbfp-panel">
              <div className="pbfp-panel-header">
                <div className="pbfp-panel-title">
                  <i className="fa-solid fa-triangle-exclamation" />
                  <span>Active Incidents (Province-Wide)</span>
                </div>
                <Link
                  href="/provincial-bfp/incidents"
                  style={{ fontSize: '0.75rem', color: '#DB1B0D', fontWeight: 700, textDecoration: 'none' }}
                >
                  View All &rarr;
                </Link>
              </div>
              <div className="pbfp-incidents-list">
                {/* Incident 1 */}
                <div className="pbfp-incident-item alarm-2">
                  <div className="pbfp-incident-top">
                    <span className="pbfp-incident-loc">Brgy. Funda-Dalipe, San Jose</span>
                    <span className="pbfp-alarm-tag">2nd Alarm</span>
                  </div>
                  <p className="pbfp-incident-details">
                    Commercial structure fire near trade center. 3 engines deployed, mutual aid requested.
                  </p>
                  <div className="pbfp-incident-meta">
                    <span>Assigned: San Jose BFP Station</span>
                    <span>Reported 24m ago</span>
                  </div>
                </div>

                {/* Incident 2 */}
                <div className="pbfp-incident-item">
                  <div className="pbfp-incident-top">
                    <span className="pbfp-incident-loc">Brgy. Bari, Sibalom</span>
                    <span className="pbfp-alarm-tag">1st Alarm</span>
                  </div>
                  <p className="pbfp-incident-details">
                    Residential fire response underway. Tanker reinforcement en route.
                  </p>
                  <div className="pbfp-incident-meta">
                    <span>Assigned: Sibalom BFP Station</span>
                    <span>Reported 48m ago</span>
                  </div>
                </div>

                {/* Incident 3 */}
                <div className="pbfp-incident-item">
                  <div className="pbfp-incident-top">
                    <span className="pbfp-incident-loc">Brgy. Alegre, Tibiao</span>
                    <span className="pbfp-alarm-tag">Under Control</span>
                  </div>
                  <p className="pbfp-incident-details">
                    Grass fire near highway. Overhauling operations in progress.
                  </p>
                  <div className="pbfp-incident-meta">
                    <span>Assigned: Tibiao BFP Station</span>
                    <span>Reported 1h 15m ago</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Command Logs */}
            <div className="pbfp-panel">
              <div className="pbfp-panel-header">
                <div className="pbfp-panel-title">
                  <i className="fa-solid fa-clock-rotate-left" />
                  <span>Recent Provincial Coordination Activity</span>
                </div>
              </div>
              <div className="pbfp-feed-list">
                <div className="pbfp-feed-item">
                  <div className="pbfp-feed-dot red" />
                  <div className="pbfp-feed-text">
                    <strong>Mutual aid dispatched:</strong> Hamtic Engine 1 rerouted to San Jose Funda-Dalipe.
                  </div>
                  <span className="pbfp-feed-time">12m ago</span>
                </div>
                <div className="pbfp-feed-item">
                  <div className="pbfp-feed-dot green" />
                  <div className="pbfp-feed-text">
                    <strong>Account issued:</strong> Municipal Admin account provisioned for <em>Culasi BFP Office</em>.
                  </div>
                  <span className="pbfp-feed-time">35m ago</span>
                </div>
                <div className="pbfp-feed-item">
                  <div className="pbfp-feed-dot blue" />
                  <div className="pbfp-feed-text">
                    <strong>Resource update:</strong> Sibalom Water Tanker 1 reported full and operational.
                  </div>
                  <span className="pbfp-feed-time">1h ago</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
