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
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }
  .pbfp-ft-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  }
  .pbfp-ft-top {
    background: linear-gradient(135deg, #161C2B 0%, #1E273D 100%);
    color: #FFFFFF;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .pbfp-ft-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: rgba(219, 27, 13, 0.25);
    color: #FF6B6B;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
  }
  .pbfp-ft-body {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.82rem;
  }
  .pbfp-ft-row {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #F1F5F9;
    padding-bottom: 0.35rem;
  }
  .pbfp-ft-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

export default function FiretrucksStationsPage() {
  const provincialFleet = [
    { name: 'San Jose Engine 1', plate: 'BFP-SJ-001', municipality: 'San Jose de Buenavista', type: 'Pumper Truck (3,000 L)', crew: '4 Personnel', status: 'Dispatched', color: '#DB1B0D' },
    { name: 'San Jose Tanker 1', plate: 'BFP-SJ-T01', municipality: 'San Jose de Buenavista', type: 'Water Tanker (10,000 L)', crew: '2 Personnel', status: 'Dispatched', color: '#DB1B0D' },
    { name: 'Hamtic Engine 1', plate: 'BFP-HM-001', municipality: 'Hamtic', type: 'Pumper Truck (4,000 L)', crew: '4 Personnel', status: 'Mutual Aid', color: '#D97706' },
    { name: 'Sibalom Engine 1', plate: 'BFP-SB-001', municipality: 'Sibalom', type: 'Pumper Truck (3,000 L)', crew: '4 Personnel', status: 'Dispatched', color: '#DB1B0D' },
    { name: 'Tibiao Engine 1', plate: 'BFP-TB-001', municipality: 'Tibiao', type: 'Pumper Truck (3,000 L)', crew: '3 Personnel', status: 'Dispatched', color: '#DB1B0D' },
    { name: 'Bugasong Engine 1', plate: 'BFP-BG-001', municipality: 'Bugasong', type: 'Pumper Truck (3,500 L)', crew: '4 Personnel', status: 'Ready / Standby', color: '#059669' },
    { name: 'Pandan Engine 1', plate: 'BFP-PD-001', municipality: 'Pandan', type: 'Pumper Truck (3,000 L)', crew: '4 Personnel', status: 'Ready / Standby', color: '#059669' },
    { name: 'Culasi Engine 1', plate: 'BFP-CL-001', municipality: 'Culasi', type: 'Pumper Truck (4,000 L)', crew: '4 Personnel', status: 'Ready / Standby', color: '#059669' },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="pbfp-page">
        <div className="pbfp-header-top">
          <h1>
            <i className="fa-solid fa-truck-moving" style={{ color: '#DB1B0D' }} />
            Provincial Fire Station & Firetruck Fleet Oversight
          </h1>
          <p>
            Complete roster and operational health of all 42 firefighting apparatus and 18 municipal stations across Antique.
          </p>
        </div>

        <div className="pbfp-grid-cards">
          {provincialFleet.map((truck) => (
            <div className="pbfp-ft-card" key={truck.plate}>
              <div className="pbfp-ft-top">
                <div className="pbfp-ft-icon">
                  <i className="fa-solid fa-truck-fire" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{truck.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'monospace' }}>{truck.plate}</div>
                </div>
              </div>
              <div className="pbfp-ft-body">
                <div className="pbfp-ft-row">
                  <span style={{ color: '#64748B' }}>Home Station</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{truck.municipality}</span>
                </div>
                <div className="pbfp-ft-row">
                  <span style={{ color: '#64748B' }}>Apparatus Type</span>
                  <span style={{ fontWeight: 600 }}>{truck.type}</span>
                </div>
                <div className="pbfp-ft-row">
                  <span style={{ color: '#64748B' }}>Crew Complement</span>
                  <span style={{ fontWeight: 600 }}>{truck.crew}</span>
                </div>
                <div className="pbfp-ft-row">
                  <span style={{ color: '#64748B' }}>Deployment Status</span>
                  <span style={{ fontWeight: 800, color: truck.color }}>{truck.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
