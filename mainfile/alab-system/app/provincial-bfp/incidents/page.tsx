'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const pageStyles = `
  .pbfp-incidents-page {
    padding: 1.5rem 1.75rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .pbfp-incidents-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .pbfp-incidents-title h1 {
    font-size: 1.45rem;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
  }

  .pbfp-incidents-title h1 i {
    color: #DB1B0D;
  }

  .pbfp-incidents-title p {
    font-size: 0.86rem;
    color: #64748B;
    margin-top: 0.25rem;
  }

  .pbfp-table-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  }

  .pbfp-filter-bar {
    padding: 1rem 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    background: #FAFAFA;
    border-bottom: 1px solid #E2E8F0;
  }

  .pbfp-filter-tabs {
    display: flex;
    gap: 0.5rem;
  }

  .pbfp-tab-btn {
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 700;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #64748B;
    cursor: pointer;
    transition: all 0.15s;
  }

  .pbfp-tab-btn.active {
    background: #DB1B0D;
    color: #FFFFFF;
    border-color: #DB1B0D;
  }

  .pbfp-inc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }

  .pbfp-inc-table th {
    background: #F8FAFC;
    color: #475569;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.85rem 1.25rem;
    text-align: left;
    border-bottom: 1px solid #E2E8F0;
  }

  .pbfp-inc-table td {
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid #F1F5F9;
    color: #334155;
    vertical-align: middle;
  }

  .pbfp-inc-table tr:hover td {
    background: #F8FAFC;
  }

  .pbfp-alarm-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.02em;
  }

  .pbfp-alarm-chip.first { background: #FEF3C7; color: #B45309; }
  .pbfp-alarm-chip.second { background: #FEE2E2; color: #DC2626; }
  .pbfp-alarm-chip.controlled { background: #ECFDF5; color: #059669; }
`;

export default function ProvinceIncidentsPage() {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ACTIVE');

  const incidents = [
    {
      id: 'INC-ANT-2026-0814',
      municipality: 'San Jose de Buenavista',
      location: 'Brgy. Funda-Dalipe, Commercial District',
      type: 'Commercial Structure Fire',
      alarmLevel: '2nd Alarm',
      alarmClass: 'second',
      assignedStation: 'San Jose Main Station',
      trucksDeployed: '3 Engines, 1 Tanker (Hamtic Mutual Aid)',
      reportedTime: '17:35 PHT (25m ago)',
      status: 'ACTIVE',
    },
    {
      id: 'INC-ANT-2026-0813',
      municipality: 'Sibalom',
      location: 'Brgy. Bari, Purok 4',
      type: 'Residential Fire',
      alarmLevel: '1st Alarm',
      alarmClass: 'first',
      assignedStation: 'Sibalom Fire Station',
      trucksDeployed: '2 Engines',
      reportedTime: '17:12 PHT (48m ago)',
      status: 'ACTIVE',
    },
    {
      id: 'INC-ANT-2026-0812',
      municipality: 'Tibiao',
      location: 'Brgy. Alegre, Highway vicinity',
      type: 'Grassland / Brush Fire',
      alarmLevel: 'Under Control',
      alarmClass: 'controlled',
      assignedStation: 'Tibiao Fire Station',
      trucksDeployed: '1 Engine, 1 Tanker',
      reportedTime: '16:45 PHT (1h 15m ago)',
      status: 'ACTIVE',
    },
    {
      id: 'INC-ANT-2026-0811',
      municipality: 'Culasi',
      location: 'Brgy. Centro Poblacion',
      type: 'Electrical Short Circuit / Small Kitchen',
      alarmLevel: 'Under Control',
      alarmClass: 'controlled',
      assignedStation: 'Culasi Fire Station',
      trucksDeployed: '1 Engine',
      reportedTime: '12:20 PHT (5h ago)',
      status: 'RESOLVED',
    },
  ];

  const filtered = incidents.filter((inc) => {
    if (filter === 'ALL') return true;
    return inc.status === filter;
  });

  return (
    <>
      <style>{pageStyles}</style>
      <div className="pbfp-incidents-page">
        <div className="pbfp-incidents-header">
          <div className="pbfp-incidents-title">
            <h1>
              <i className="fa-solid fa-fire" /> Province-Wide Incident Command Roster
            </h1>
            <p>
              Consolidated real-time operational log of all reported, active, and controlled fire incidents across the 18 municipalities of Antique.
            </p>
          </div>
          <Link
            href="/provincial-bfp/gis-map"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1rem',
              background: '#0F172A',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              textDecoration: 'none',
            }}
          >
            <i className="fa-solid fa-map-location-dot" /> Open GIS View
          </Link>
        </div>

        <div className="pbfp-table-card">
          <div className="pbfp-filter-bar">
            <div className="pbfp-filter-tabs">
              <button
                type="button"
                className={`pbfp-tab-btn ${filter === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => setFilter('ACTIVE')}
              >
                Active Incidents ({incidents.filter((i) => i.status === 'ACTIVE').length})
              </button>
              <button
                type="button"
                className={`pbfp-tab-btn ${filter === 'RESOLVED' ? 'active' : ''}`}
                onClick={() => setFilter('RESOLVED')}
              >
                Resolved Today ({incidents.filter((i) => i.status === 'RESOLVED').length})
              </button>
              <button
                type="button"
                className={`pbfp-tab-btn ${filter === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilter('ALL')}
              >
                All Incidents ({incidents.length})
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="pbfp-inc-table">
              <thead>
                <tr>
                  <th>Incident Reference</th>
                  <th>Municipality & Location</th>
                  <th>Classification</th>
                  <th>Alarm Status</th>
                  <th>Units Dispatched</th>
                  <th>Reported Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inc) => (
                  <tr key={inc.id}>
                    <td>
                      <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{inc.id}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{inc.municipality}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{inc.location}</div>
                    </td>
                    <td>{inc.type}</td>
                    <td>
                      <span className={`pbfp-alarm-chip ${inc.alarmClass}`}>{inc.alarmLevel}</span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#334155' }}>{inc.trucksDeployed}</td>
                    <td style={{ color: '#64748B', fontSize: '0.78rem' }}>{inc.reportedTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
