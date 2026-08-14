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

export default function RespondersPage() {
  const responders = [
    { name: 'SINSP Roberto Ramos', rank: 'Senior Inspector', role: 'Municipal Fire Marshal', station: 'San Jose de Buenavista', dutyStatus: 'On Duty (Command)', shift: 'A-Shift' },
    { name: 'SFO3 Eduardo Dela Peña', rank: 'Senior Fire Officer 3', role: 'Shift Supervisor', station: 'San Jose de Buenavista', dutyStatus: 'Dispatched (Funda-Dalipe)', shift: 'A-Shift' },
    { name: 'INSP Maria Santos', rank: 'Inspector', role: 'Municipal Fire Marshal', station: 'Sibalom BFP Station', dutyStatus: 'On Duty (Command)', shift: 'A-Shift' },
    { name: 'SFO2 Manuel Garcia', rank: 'Senior Fire Officer 2', role: 'Nozzleman / Lead Responder', station: 'Sibalom BFP Station', dutyStatus: 'Dispatched (Bari)', shift: 'A-Shift' },
    { name: 'SFO1 Carlos Mendoza', rank: 'Senior Fire Officer 1', role: 'Pump Operator / Driver', station: 'Hamtic BFP Station', dutyStatus: 'Mutual Aid Dispatched', shift: 'A-Shift' },
    { name: 'FO3 Ana Valenzuela', rank: 'Fire Officer 3', role: 'First Responder / EMT', station: 'Tibiao BFP Station', dutyStatus: 'Dispatched (Alegre)', shift: 'A-Shift' },
    { name: 'FO2 John Paul Cruz', rank: 'Fire Officer 2', role: 'Rescue Specialist', station: 'Culasi BFP Station', dutyStatus: 'Station Standby', shift: 'A-Shift' },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="pbfp-page">
        <div className="pbfp-header-top">
          <h1>
            <i className="fa-solid fa-users" style={{ color: '#DB1B0D' }} />
            Provincial Firefighting Personnel & Duty Responders
          </h1>
          <p>
            Roster of active shift officers, commanders, pump operators, and emergency responders deployed across Antique.
          </p>
        </div>

        <div className="pbfp-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="pbfp-table">
              <thead>
                <tr>
                  <th>Officer Name</th>
                  <th>Rank & Position</th>
                  <th>Operational Role</th>
                  <th>Assigned Station</th>
                  <th>Shift & Current Duty</th>
                </tr>
              </thead>
              <tbody>
                {responders.map((r) => (
                  <tr key={r.name}>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{r.name}</td>
                    <td>{r.rank}</td>
                    <td>{r.role}</td>
                    <td><strong>{r.station}</strong></td>
                    <td>
                      <span style={{
                        background: r.dutyStatus.includes('Dispatched') ? '#FEF2F2' : '#ECFDF5',
                        color: r.dutyStatus.includes('Dispatched') ? '#DB1B0D' : '#059669',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}>
                        {r.dutyStatus}
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
