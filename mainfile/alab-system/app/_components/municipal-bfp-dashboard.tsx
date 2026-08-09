'use client';
import { useEffect } from 'react';

/* =====================================================================
   Municipal BFP Dashboard — Main dashboard page component
   Matches the screenshot: stat cards, incident queue,
   quick actions, resource status, verification requests,
   smart dispatch, emergency contacts.
   ===================================================================== */

const dashboardStyles = `
  /* ========== DASHBOARD BASE ========== */
  .mbfp-dash {
    padding: 0.8rem 1rem 2.5rem;
    max-width: 1600px;
    margin: 0 auto;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }



  /* ========== STAT CARDS ROW ========== */
  .mbfp-stats-row {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .mbfp-stat-card {
    background: #ffffff;
    border-radius: 0.75rem;
    padding: 1.2rem 0.8rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    border: 1px solid #f3f4f6;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: transform 0.2s, box-shadow 0.2s;
    cursor: pointer;
  }

  .mbfp-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .mbfp-stat-icon {
    width: 2.8rem;
    height: 2.8rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    color: white;
    flex-shrink: 0;
  }

  .mbfp-stat-icon.red { background: linear-gradient(135deg, #D00F09, #EF5350); }
  .mbfp-stat-icon.orange { background: linear-gradient(135deg, #E65100, #FF8F00); }
  .mbfp-stat-icon.blue { background: linear-gradient(135deg, #1565C0, #42A5F5); }
  .mbfp-stat-icon.green { background: linear-gradient(135deg, #2E7D32, #66BB6A); }
  .mbfp-stat-icon.teal { background: linear-gradient(135deg, #00695C, #26A69A); }
  .mbfp-stat-icon.purple { background: linear-gradient(135deg, #6A1B9A, #AB47BC); }

  .mbfp-stat-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .mbfp-stat-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #6b7280;
    line-height: 1.3;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mbfp-stat-value {
    font-size: 1.6rem;
    font-weight: 800;
    color: #1f2937;
    line-height: 1.2;
  }

  .mbfp-stat-link {
    font-size: 0.68rem;
    color: #D00F09;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.2rem;
    margin-top: 0.15rem;
    cursor: pointer;
    transition: color 0.2s;
  }

  .mbfp-stat-link:hover {
    color: #B71C1C;
  }

  /* ========== TWO COLUMN GRID ========== */
  .mbfp-grid {
    display: grid;
    grid-template-columns: 1.8fr 1fr;
    gap: 1.2rem;
  }

  .mbfp-card {
    background: #ffffff;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    border: 1px solid #f3f4f6;
    overflow: hidden;
  }

  .mbfp-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.8rem 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .mbfp-card-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #1f2937;
  }

  .mbfp-card-badge {
    font-size: 0.65rem;
    font-weight: 600;
    color: #16a34a;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .mbfp-card-badge::before {
    content: '';
    width: 6px;
    height: 6px;
    background: #16a34a;
    border-radius: 50%;
    animation: mbfp-pulse 2s infinite;
  }

  @keyframes mbfp-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .mbfp-card-body {
    padding: 0.8rem 1rem;
  }

  /* ========== INCIDENT QUEUE TABLE ========== */
  .mbfp-incident-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.75rem;
  }

  .mbfp-incident-table th {
    text-align: left;
    font-weight: 700;
    color: #6b7280;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid #f3f4f6;
    white-space: nowrap;
  }

  .mbfp-incident-table td {
    padding: 0.55rem 0.6rem;
    border-bottom: 1px solid #fafafa;
    color: #374151;
    font-weight: 500;
    white-space: nowrap;
  }

  .mbfp-incident-table tr:hover td {
    background: #fefce8;
  }

  .mbfp-status-badge {
    display: inline-block;
    padding: 0.2rem 0.55rem;
    border-radius: 2rem;
    font-size: 0.65rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .mbfp-status-badge.pending { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
  .mbfp-status-badge.confirmed { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .mbfp-status-badge.dispatched { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .mbfp-status-badge.responding { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
  .mbfp-status-badge.contained { background: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db; }

  .mbfp-view-all-link {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: #D00F09;
    text-decoration: none;
    padding: 0.6rem 1rem;
    border-top: 1px solid #f3f4f6;
    transition: background 0.15s;
  }

  .mbfp-view-all-link:hover {
    background: #fef2f2;
  }

  /* Live Map Styles Removed */

  /* ========== QUICK ACTIONS ========== */
  .mbfp-quick-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    padding: 0.8rem 1rem;
  }

  .mbfp-qa-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 0.8rem;
    background: #fafafa;
    border: 1px solid #f3f4f6;
    border-radius: 0.6rem;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    color: #374151;
  }

  .mbfp-qa-btn:hover {
    background: #fef2f2;
    border-color: #fecaca;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(211,47,47,0.1);
  }

  .mbfp-qa-btn i {
    font-size: 1.5rem;
    color: #D00F09;
  }

  .mbfp-qa-btn span {
    font-size: 0.9rem;
    font-weight: 600;
    text-align: center;
    line-height: 1.3;
  }

  .mbfp-qa-btn.full-width {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: center;
    gap: 0.8rem;
    padding: 0.8rem 1rem;
  }

  /* ========== VERIFICATION REQUESTS ========== */
  .mbfp-verif-item {
    display: flex;
    gap: 0.7rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f9fafb;
    transition: background 0.15s;
  }

  .mbfp-verif-item:hover {
    background: #fffbeb;
  }

  .mbfp-verif-thumb {
    width: 52px;
    height: 42px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
    background: linear-gradient(135deg, #ff6b35 0%, #D00F09 50%, #ff8a65 100%);
  }

  .mbfp-verif-info {
    flex: 1;
    min-width: 0;
  }

  .mbfp-verif-id {
    font-size: 0.75rem;
    font-weight: 800;
    color: #1f2937;
  }

  .mbfp-verif-time {
    font-size: 0.65rem;
    color: #D00F09;
    font-weight: 700;
    margin-left: auto;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .mbfp-verif-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.15rem;
  }

  .mbfp-verif-location {
    font-size: 0.68rem;
    color: #4b5563;
    font-weight: 600;
  }

  .mbfp-verif-desc {
    font-size: 0.65rem;
    color: #6b7280;
    font-weight: 500;
  }

  .mbfp-verif-actions {
    display: flex;
    gap: 0.3rem;
    margin-top: 0.4rem;
  }

  .mbfp-verif-btn {
    font-size: 0.62rem;
    font-weight: 700;
    padding: 0.25rem 0.6rem;
    border-radius: 1rem;
    border: none;
    cursor: pointer;
    transition: all 0.15s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
  }

  .mbfp-verif-btn.verify {
    background: #16a34a;
    color: white;
  }

  .mbfp-verif-btn.verify:hover {
    background: #15803d;
  }

  .mbfp-verif-btn.view-map {
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
  }

  .mbfp-verif-btn.view-map:hover {
    background: #dbeafe;
  }

  /* ========== SMART DISPATCH ========== */
  .mbfp-dispatch-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.8rem 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .mbfp-dispatch-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .mbfp-dispatch-title i {
    color: #D00F09;
  }

  .mbfp-ai-badge {
    font-size: 0.58rem;
    font-weight: 700;
    background: linear-gradient(135deg, #f3e8ff, #ede9fe);
    color: #7c3aed;
    padding: 0.2rem 0.5rem;
    border-radius: 1rem;
    border: 1px solid #ddd6fe;
  }

  .mbfp-dispatch-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    padding: 0.8rem 1rem;
  }

  .mbfp-dispatch-item {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .mbfp-dispatch-item-label {
    font-size: 0.62rem;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .mbfp-dispatch-item-value {
    font-size: 0.78rem;
    font-weight: 700;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .mbfp-dispatch-item-value i {
    color: #D00F09;
    font-size: 0.85rem;
  }

  .mbfp-dispatch-item-sub {
    font-size: 0.62rem;
    color: #6b7280;
    font-weight: 500;
  }

  .mbfp-dispatch-actions {
    display: flex;
    gap: 0.6rem;
    padding: 0.8rem 1rem;
    border-top: 1px solid #f3f4f6;
  }

  .mbfp-dispatch-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.6rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.78rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mbfp-dispatch-btn.primary {
    background: linear-gradient(135deg, #D00F09, #EF5350);
    color: white;
    box-shadow: 0 2px 8px rgba(211,47,47,0.3);
  }

  .mbfp-dispatch-btn.primary:hover {
    background: linear-gradient(135deg, #B71C1C, #D00F09);
    box-shadow: 0 4px 12px rgba(211,47,47,0.4);
    transform: translateY(-1px);
  }

  .mbfp-dispatch-btn.secondary {
    background: white;
    color: #D00F09;
    border: 2px solid #D00F09;
  }

  .mbfp-dispatch-btn.secondary:hover {
    background: #fef2f2;
    transform: translateY(-1px);
  }

  /* ========== RESOURCE STATUS ========== */
  .mbfp-resource-list {
    padding: 0;
  }

  .mbfp-resource-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 1rem;
    border-bottom: 1px solid #fafafa;
    transition: background 0.15s;
  }

  .mbfp-resource-item:last-child {
    border-bottom: none;
  }

  .mbfp-resource-item:hover {
    background: #f9fafb;
  }

  .mbfp-resource-icon {
    width: 2rem;
    height: 2rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .mbfp-resource-icon.engine {
    background: #fee2e2;
    color: #D00F09;
  }

  .mbfp-resource-icon.rescue {
    background: #fff7ed;
    color: #ea580c;
  }

  .mbfp-resource-icon.tanker {
    background: #eff6ff;
    color: #2563eb;
  }

  .mbfp-resource-info {
    flex: 1;
    min-width: 0;
  }

  .mbfp-resource-name {
    font-size: 0.78rem;
    font-weight: 700;
    color: #1f2937;
  }

  .mbfp-resource-station {
    font-size: 0.65rem;
    color: #6b7280;
    font-weight: 500;
  }

  .mbfp-resource-status {
    font-size: 0.62rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    white-space: nowrap;
  }

  .mbfp-resource-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .mbfp-resource-status.available .mbfp-resource-status-dot { background: #16a34a; }
  .mbfp-resource-status.available { color: #16a34a; }

  .mbfp-resource-status.ready .mbfp-resource-status-dot { background: #16a34a; }
  .mbfp-resource-status.ready { color: #16a34a; }

  .mbfp-resource-status.on-route .mbfp-resource-status-dot { background: #ea580c; }
  .mbfp-resource-status.on-route { color: #ea580c; }

  .mbfp-resource-status.maintenance .mbfp-resource-status-dot { background: #9ca3af; }
  .mbfp-resource-status.maintenance { color: #9ca3af; }

  /* ========== EMERGENCY CONTACTS ========== */
  .mbfp-emergency {
    border-top: 1px solid #f3f4f6;
  }

  .mbfp-emergency-header {
    padding: 0.8rem 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .mbfp-emergency-title {
    font-size: 0.78rem;
    font-weight: 700;
    color: #1f2937;
  }

  .mbfp-emergency-subtitle {
    font-size: 0.62rem;
    color: #6b7280;
    font-weight: 500;
  }

  .mbfp-emergency-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.7rem 1rem;
    border-bottom: 1px solid #fafafa;
  }

  .mbfp-emergency-item:last-child {
    border-bottom: none;
  }

  .mbfp-emergency-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .mbfp-emergency-name {
    font-size: 0.78rem;
    font-weight: 700;
    color: #1f2937;
  }

  .mbfp-emergency-role {
    font-size: 0.62rem;
    color: #6b7280;
    font-weight: 500;
  }

  .mbfp-emergency-phone {
    font-size: 0.65rem;
    color: #4b5563;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }

  .mbfp-emergency-btn {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.35rem 0.75rem;
    border-radius: 0.4rem;
    border: none;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    white-space: nowrap;
  }

  .mbfp-emergency-btn.request {
    background: linear-gradient(135deg, #16a34a, #22c55e);
    color: white;
  }

  .mbfp-emergency-btn.request:hover {
    background: linear-gradient(135deg, #15803d, #16a34a);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(22,163,74,0.3);
  }

  .mbfp-emergency-btn.contact {
    background: #fef2f2;
    color: #D00F09;
    border: 1px solid #fecaca;
  }

  .mbfp-emergency-btn.contact:hover {
    background: #fee2e2;
  }

  /* ========== COLUMN SECTIONS ========== */
  .mbfp-col-left,
  .mbfp-col-right {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  /* ========== REFRESH BADGE ========== */
  .mbfp-refresh-badge {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.62rem;
    color: #6b7280;
    font-weight: 500;
  }

  .mbfp-refresh-btn {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 0.7rem;
    padding: 0.15rem;
    transition: color 0.15s;
  }

  .mbfp-refresh-btn:hover {
    color: #D00F09;
  }

  @media (max-width: 1400px) {
    .mbfp-stats-row {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 1024px) {
    .mbfp-stats-row {
      grid-template-columns: repeat(2, 1fr);
    }
    .mbfp-grid {
      grid-template-columns: 1fr;
    }
    .mbfp-dispatch-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .mbfp-dash {
      padding: 0.8rem;
    }
    .mbfp-stats-row {
      grid-template-columns: 1fr;
    }
    .mbfp-dispatch-grid {
      grid-template-columns: 1fr;
    }
  }
`;

const incidentData = [
  { ref: 'INC-2025-0421', barangay: 'Poblacion', type: 'Structure Fire', time: '10:24 AM', status: 'pending', statusLabel: 'Pending Verification' },
  { ref: 'INC-2025-0420', barangay: 'Sampaguita', type: 'Grass Fire', time: '09:58 AM', status: 'confirmed', statusLabel: 'Confirmed' },
  { ref: 'INC-2025-0419', barangay: 'San Roque', type: 'Structure Fire', time: '09:15 AM', status: 'dispatched', statusLabel: 'Dispatched' },
  { ref: 'INC-2025-0418', barangay: 'Libertad', type: 'Brush Fire', time: '08:42 AM', status: 'responding', statusLabel: 'Responding' },
  { ref: 'INC-2025-0417', barangay: 'Poblacion', type: 'Electrical Fire', time: '07:30 AM', status: 'contained', statusLabel: 'Contained' },
];

const resourceData = [
  { name: 'Engine 1', station: 'Poblacion Fire Station', type: 'engine', status: 'available', statusLabel: 'Available' },
  { name: 'Engine 2', station: 'Poblacion Fire Station', type: 'engine', status: 'ready', statusLabel: 'Ready' },
  { name: 'Rescue 1', station: 'Poblacion Fire Station', type: 'rescue', status: 'on-route', statusLabel: 'On Route' },
  { name: 'Tanker 1', station: 'Poblacion Fire Station', type: 'tanker', status: 'maintenance', statusLabel: 'Maintenance' },
];

export function MunicipalBfpDashboard() {
  useEffect(() => {
    // Map code removed
  }, []);

  return (
    <>
      <style>{dashboardStyles}</style>
      <div className="mbfp-dash">

        {/* Stat Cards */}
        <div className="mbfp-stats-row">
          <div className="mbfp-stat-card">
            <div className="mbfp-stat-icon red">
              <i className="fa-solid fa-fire-flame-curved" />
            </div>
            <div className="mbfp-stat-info">
              <span className="mbfp-stat-label">Active Incidents</span>
              <span className="mbfp-stat-value">4</span>
            </div>
          </div>

          <div className="mbfp-stat-card">
            <div className="mbfp-stat-icon orange">
              <i className="fa-solid fa-clipboard-check" />
            </div>
            <div className="mbfp-stat-info">
              <span className="mbfp-stat-label">Pending Verification</span>
              <span className="mbfp-stat-value">2</span>
            </div>
          </div>

          <div className="mbfp-stat-card">
            <div className="mbfp-stat-icon blue">
              <i className="fa-solid fa-truck-moving" />
            </div>
            <div className="mbfp-stat-info">
              <span className="mbfp-stat-label">Firetrucks Available</span>
              <span className="mbfp-stat-value">5</span>
            </div>
          </div>

          <div className="mbfp-stat-card">
            <div className="mbfp-stat-icon green">
              <i className="fa-solid fa-users" />
            </div>
            <div className="mbfp-stat-info">
              <span className="mbfp-stat-label">Responders On Duty</span>
              <span className="mbfp-stat-value">18</span>
            </div>
          </div>

          <div className="mbfp-stat-card">
            <div className="mbfp-stat-icon purple">
              <i className="fa-solid fa-handshake-angle" />
            </div>
            <div className="mbfp-stat-info">
              <span className="mbfp-stat-label">Assistance Requests</span>
              <span className="mbfp-stat-value">1</span>
            </div>
          </div>
        </div>

        {/* Top Row Grid */}
        <div className="mbfp-grid" style={{ marginBottom: '1.2rem' }}>
          {/* Incident Queue */}
            <div className="mbfp-card">
              <div className="mbfp-card-header">
                <span className="mbfp-card-title">Recent / Active Incident Queue</span>
              </div>
              <div className="mbfp-card-body" style={{ padding: 0 }}>
                <table className="mbfp-incident-table">
                  <thead>
                    <tr>
                      <th>Ref. No.</th>
                      <th>Barangay</th>
                      <th>Fire Type</th>
                      <th>Time Reported</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidentData.map((inc) => (
                      <tr key={inc.ref}>
                        <td style={{ fontWeight: 700 }}>{inc.ref}</td>
                        <td>{inc.barangay}</td>
                        <td>{inc.type}</td>
                        <td>{inc.time}</td>
                        <td>
                          <span className={`mbfp-status-badge ${inc.status}`}>
                            {inc.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <a href="/municipal-bfp/active-incidents" className="mbfp-view-all-link">
                View All Incidents <i className="fa-solid fa-arrow-right" />
              </a>
            </div>

            {/* Quick Actions */}
            <div className="mbfp-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="mbfp-card-header">
                <span className="mbfp-card-title">Quick Actions</span>
              </div>
              <div className="mbfp-quick-actions" style={{ flex: 1, alignContent: 'center' }}>
                <a href="/municipal-bfp/verification-queue" className="mbfp-qa-btn">
                  <i className="fa-solid fa-clipboard-check" />
                  <span>Verify New Report</span>
                </a>
                <a href="/municipal-bfp/gis-map" className="mbfp-qa-btn">
                  <i className="fa-solid fa-map-location-dot" />
                  <span>Open GIS Map</span>
                </a>
                <a href="/municipal-bfp/dispatch-routing" className="mbfp-qa-btn">
                  <i className="fa-solid fa-truck-moving" />
                  <span>Dispatch Firetruck</span>
                </a>
                <a href="/municipal-bfp/dispatch-routing" className="mbfp-qa-btn">
                  <i className="fa-solid fa-handshake-angle" />
                  <span>Request Backup</span>
                </a>
                <a href="/municipal-bfp/incident-reports" className="mbfp-qa-btn full-width">
                  <i className="fa-solid fa-file-circle-plus" />
                  <span>Generate Report</span>
                </a>
              </div>
            </div>
        </div>

        {/* Bottom Row Grid */}
        <div className="mbfp-grid">
          {/* Verification Requests */}
          <div className="mbfp-card">
            <div className="mbfp-card-header">
                <span className="mbfp-card-title">Verification Requests (2)</span>
              </div>
              <div style={{ padding: 0 }}>
                <div className="mbfp-verif-item">
                  <div className="mbfp-verif-thumb" />
                  <div className="mbfp-verif-info">
                    <div className="mbfp-verif-top">
                      <span className="mbfp-verif-id">VR-2025-0152</span>
                      <span className="mbfp-verif-time">10:30 AM</span>
                    </div>
                    <div className="mbfp-verif-location">Sampaguita, San Jose de Buenavista</div>
                    <div className="mbfp-verif-desc">Possible grass fire near vacant lot.</div>
                    <div className="mbfp-verif-actions">
                      <button className="mbfp-verif-btn verify">Verify</button>
                      <a href="/municipal-bfp/gis-map" className="mbfp-verif-btn view-map">
                        <i className="fa-solid fa-map" /> View Map
                      </a>
                    </div>
                  </div>
                </div>
                <div className="mbfp-verif-item">
                  <div className="mbfp-verif-thumb" style={{ background: 'linear-gradient(135deg, #ff8a65 0%, #ef6c00 50%, #ffab91 100%)' }} />
                  <div className="mbfp-verif-info">
                    <div className="mbfp-verif-top">
                      <span className="mbfp-verif-id">VR-2025-0151</span>
                      <span className="mbfp-verif-time">10:12 AM</span>
                    </div>
                    <div className="mbfp-verif-location">San Roque, San Jose de Buenavista</div>
                    <div className="mbfp-verif-desc">Smoke coming from residential area.</div>
                    <div className="mbfp-verif-actions">
                      <button className="mbfp-verif-btn verify">Verify</button>
                      <a href="/municipal-bfp/gis-map" className="mbfp-verif-btn view-map">
                        <i className="fa-solid fa-map" /> View Map
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <a href="/municipal-bfp/verification-queue" className="mbfp-view-all-link">
                View All Verification Requests <i className="fa-solid fa-arrow-right" />
              </a>
            </div>

          <div className="mbfp-col-right">
            {/* Resource Status */}
            <div className="mbfp-card">
              <div className="mbfp-card-header">
                <span className="mbfp-card-title">Resource Status</span>
              </div>
              <div className="mbfp-resource-list">
                {resourceData.map((res) => (
                  <div className="mbfp-resource-item" key={res.name}>
                    <div className={`mbfp-resource-icon ${res.type}`}>
                      <i className={`fa-solid ${res.type === 'engine' ? 'fa-truck-moving' : res.type === 'rescue' ? 'fa-truck-medical' : 'fa-tank-water'}`} />
                    </div>
                    <div className="mbfp-resource-info">
                      <span className="mbfp-resource-name">{res.name}</span>
                      <span className="mbfp-resource-station">{res.station}</span>
                    </div>
                    <div className={`mbfp-resource-status ${res.status}`}>
                      <span className="mbfp-resource-status-dot" />
                      {res.statusLabel}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="mbfp-card">
              <div className="mbfp-emergency-header">
                <div className="mbfp-emergency-title">Emergency Contacts / Inter-Municipality Coordination</div>
              </div>
              <div>
                <div className="mbfp-emergency-item">
                  <div className="mbfp-emergency-info">
                    <span className="mbfp-emergency-name">Tobias Fornier Municipality</span>
                    <span className="mbfp-emergency-role">Nearest Municipal BFP Support</span>
                    <span className="mbfp-emergency-phone">
                      <i className="fa-solid fa-phone" /> (036) 536-0123
                    </span>
                  </div>
                  <button className="mbfp-emergency-btn request">
                    <i className="fa-solid fa-handshake" /> Request Assistance
                  </button>
                </div>
                <div className="mbfp-emergency-item">
                  <div className="mbfp-emergency-info">
                    <span className="mbfp-emergency-name">Provincial BFP Office</span>
                    <span className="mbfp-emergency-role">Provincial Command Center</span>
                  </div>
                  <button className="mbfp-emergency-btn contact">
                    <i className="fa-solid fa-phone" /> Contact Provincial BFP
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
