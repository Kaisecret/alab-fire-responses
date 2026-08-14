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
  .pbfp-table-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  }
  .pbfp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }
  .pbfp-table th {
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
  .pbfp-table td {
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid #F1F5F9;
    color: #334155;
    vertical-align: middle;
  }
`;

export default function WaterSourcesPage() {
  const sources = [
    { id: 'WS-ANT-001', name: 'San Jose Municipal Hydrant #1', municipality: 'San Jose de Buenavista', location: 'Trade Center, Brgy. Funda-Dalipe', type: 'Pressurized Hydrant', pressure: '45 PSI (Adequate)', status: 'Operational' },
    { id: 'WS-ANT-002', name: 'San Jose Plaza Hydrant', municipality: 'San Jose de Buenavista', location: 'Plaza Rizal, Poblacion', type: 'Pressurized Hydrant', pressure: '50 PSI (Adequate)', status: 'Operational' },
    { id: 'WS-ANT-003', name: 'Sibalom River Refill Point', municipality: 'Sibalom', location: 'Sibalom River Bridge Access', type: 'Open Natural Water Source', pressure: 'Drafting Point', status: 'Operational' },
    { id: 'WS-ANT-004', name: 'Tibiao River Drafting Station', municipality: 'Tibiao', location: 'Brgy. Importante Riverbank', type: 'Natural Water Source', pressure: 'Drafting Point', status: 'Operational' },
    { id: 'WS-ANT-005', name: 'Hamtic Public Market Hydrant', municipality: 'Hamtic', location: 'Hamtic Public Market', type: 'Pressurized Hydrant', pressure: '40 PSI (Adequate)', status: 'Operational' },
    { id: 'WS-ANT-006', name: 'Pandan Spring Refill Reservoir', municipality: 'Pandan', location: 'Bugang Spring Access Road', type: 'Gravity Feed Reservoir', pressure: 'High Volume', status: 'Operational' },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="pbfp-page">
        <div className="pbfp-header-top">
          <h1>
            <i className="fa-solid fa-droplet" style={{ color: '#00838f' }} />
            Province-Wide Water Sources & Hydrant Network
          </h1>
          <p>
            Catalog of 128 verified municipal hydrants, high-capacity drafting points, and natural water reservoirs in Antique.
          </p>
        </div>

        <div className="pbfp-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="pbfp-table">
              <thead>
                <tr>
                  <th>Hydrant Code</th>
                  <th>Source Name</th>
                  <th>Municipality & Location</th>
                  <th>Supply Type</th>
                  <th>Pressure / Capacity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>{s.id}</td>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{s.name}</td>
                    <td>
                      <div><strong>{s.municipality}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{s.location}</div>
                    </td>
                    <td>{s.type}</td>
                    <td>{s.pressure}</td>
                    <td>
                      <span style={{ background: '#ECFDF5', color: '#059669', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800 }}>
                        <i className="fa-solid fa-circle-check" style={{ marginRight: '0.3rem' }} /> {s.status}
                      </span>
                    </td>
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
