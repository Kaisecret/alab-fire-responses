'use client';

import React from 'react';

const styles = `
  .pbfp-page {
    padding: 1.5rem 1.75rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .pbfp-header-top h1 {
    font-size: 1.45rem;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.25rem;
  }
  .pbfp-header-top p {
    font-size: 0.86rem;
    color: #64748B;
    margin: 0;
  }
  .pbfp-grid-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
  .pbfp-muni-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .pbfp-muni-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  }
  .pbfp-muni-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .pbfp-muni-name {
    font-size: 1rem;
    font-weight: 800;
    color: #0F172A;
  }
  .pbfp-muni-status-pill {
    font-size: 0.68rem;
    font-weight: 800;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
  }
  .pbfp-muni-status-pill.ready { background: #ECFDF5; color: #059669; }
  .pbfp-muni-status-pill.responding { background: #FEF2F2; color: #DB1B0D; }
  .pbfp-muni-status-pill.aid { background: #FFFBEB; color: #D97706; }
  .pbfp-muni-detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    border-bottom: 1px solid #F1F5F9;
    padding-bottom: 0.4rem;
  }
  .pbfp-muni-detail-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .pbfp-detail-label { color: #64748B; font-weight: 600; }
  .pbfp-detail-val { color: #0F172A; font-weight: 700; }
`;

const municipalitiesList = [
  { name: 'San Jose de Buenavista', status: 'responding', statusLabel: 'Responding (1)', trucks: '4 / 5 Ready', crew: '16 on duty', hydrants: '24 verified', contact: '(036) 540-8000' },
  { name: 'Sibalom', status: 'responding', statusLabel: 'Responding (1)', trucks: '2 / 3 Ready', crew: '12 on duty', hydrants: '18 verified', contact: '(036) 543-7000' },
  { name: 'Tibiao', status: 'responding', statusLabel: 'Responding (1)', trucks: '1 / 2 Ready', crew: '9 on duty', hydrants: '8 verified', contact: '(036) 546-5000' },
  { name: 'Hamtic', status: 'aid', statusLabel: 'Mutual Aid Active', trucks: '2 / 2 Ready', crew: '10 on duty', hydrants: '12 verified', contact: '(036) 540-9111' },
  { name: 'Bugasong', status: 'ready', statusLabel: 'Operational Ready', trucks: '2 / 2 Ready', crew: '8 on duty', hydrants: '10 verified', contact: '(036) 547-2000' },
  { name: 'Pandan', status: 'ready', statusLabel: 'Operational Ready', trucks: '2 / 2 Ready', crew: '10 on duty', hydrants: '14 verified', contact: '(036) 549-3000' },
  { name: 'Culasi', status: 'ready', statusLabel: 'Operational Ready', trucks: '2 / 2 Ready', crew: '11 on duty', hydrants: '12 verified', contact: '(036) 548-1000' },
  { name: 'Barbaza', status: 'ready', statusLabel: 'Operational Ready', trucks: '1 / 2 Ready', crew: '8 on duty', hydrants: '6 verified', contact: '(036) 545-4000' },
  { name: 'Tobias Fornier', status: 'ready', statusLabel: 'Operational Ready', trucks: '2 / 2 Ready', crew: '9 on duty', hydrants: '9 verified', contact: '(036) 541-6000' },
  { name: 'Patnongon', status: 'ready', statusLabel: 'Operational Ready', trucks: '2 / 2 Ready', crew: '8 on duty', hydrants: '11 verified', contact: '(036) 544-8000' },
  { name: 'Anini-y', status: 'ready', statusLabel: 'Operational Ready', trucks: '1 / 1 Ready', crew: '7 on duty', hydrants: '5 verified', contact: '(036) 542-1000' },
  { name: 'Belison', status: 'ready', statusLabel: 'Operational Ready', trucks: '1 / 1 Ready', crew: '6 on duty', hydrants: '4 verified', contact: '(036) 540-6500' },
  { name: 'Caluya', status: 'ready', statusLabel: 'Operational Ready', trucks: '2 / 2 Ready', crew: '8 on duty', hydrants: '6 verified', contact: '(036) 550-9000' },
  { name: 'Laua-an', status: 'ready', statusLabel: 'Operational Ready', trucks: '1 / 1 Ready', crew: '7 on duty', hydrants: '7 verified', contact: '(036) 546-2000' },
  { name: 'Libertad', status: 'ready', statusLabel: 'Operational Ready', trucks: '1 / 1 Ready', crew: '7 on duty', hydrants: '6 verified', contact: '(036) 551-3000' },
  { name: 'San Remigio', status: 'ready', statusLabel: 'Operational Ready', trucks: '1 / 1 Ready', crew: '8 on duty', hydrants: '5 verified', contact: '(036) 543-9000' },
  { name: 'Sebaste', status: 'ready', statusLabel: 'Operational Ready', trucks: '1 / 1 Ready', crew: '6 on duty', hydrants: '4 verified', contact: '(036) 548-8000' },
  { name: 'Valderrama', status: 'ready', statusLabel: 'Operational Ready', trucks: '1 / 1 Ready', crew: '7 on duty', hydrants: '5 verified', contact: '(036) 544-1000' },
];

export default function MunicipalStatusPage() {
  return (
    <>
      <style>{styles}</style>
      <div className="pbfp-page">
        <div className="pbfp-header-top">
          <h1>
            <i className="fa-solid fa-building-shield" style={{ color: '#DB1B0D' }} />
            Municipal Fire Station Status & Readiness
          </h1>
          <p>
            Real-time status, apparatus availability, and duty personnel coverage across all 18 Municipal BFP Stations in Antique.
          </p>
        </div>

        <div className="pbfp-grid-cards">
          {municipalitiesList.map((m) => (
            <div className="pbfp-muni-card" key={m.name}>
              <div className="pbfp-muni-card-header">
                <span className="pbfp-muni-name">{m.name}</span>
                <span className={`pbfp-muni-status-pill ${m.status}`}>{m.statusLabel}</span>
              </div>
              <div className="pbfp-muni-detail-row">
                <span className="pbfp-detail-label">Fleet Readiness</span>
                <span className="pbfp-detail-val">{m.trucks}</span>
              </div>
              <div className="pbfp-muni-detail-row">
                <span className="pbfp-detail-label">Active Shift Crew</span>
                <span className="pbfp-detail-val">{m.crew}</span>
              </div>
              <div className="pbfp-muni-detail-row">
                <span className="pbfp-detail-label">Water Hydrants</span>
                <span className="pbfp-detail-val">{m.hydrants}</span>
              </div>
              <div className="pbfp-muni-detail-row">
                <span className="pbfp-detail-label">Station Hotline</span>
                <span className="pbfp-detail-val" style={{ fontFamily: 'monospace' }}>{m.contact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
