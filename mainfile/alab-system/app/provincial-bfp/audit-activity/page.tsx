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

export default function AuditActivityPage() {
  const logs = [
    { event: 'ACCOUNT_ISSUED', actor: 'CINSP Juan Dela Cruz', details: 'Provisioned Municipal Administrator account for Culasi BFP Station', target: 'culasi.bfp@antique.gov.ph', timestamp: 'Today, 17:25 PHT' },
    { event: 'MUTUAL_AID_AUTHORIZED', actor: 'CINSP Juan Dela Cruz', details: 'Approved Hamtic Tanker 1 deployment to San Jose Funda-Dalipe incident', target: 'San Jose / Hamtic', timestamp: 'Today, 17:38 PHT' },
    { event: 'INCIDENT_ESCALATED', actor: 'San Jose BFP Officer', details: 'Upgraded Brgy. Funda-Dalipe fire from 1st Alarm to 2nd Alarm', target: 'INC-ANT-2026-0814', timestamp: 'Today, 17:40 PHT' },
    { event: 'ACCOUNT_PASSWORD_CHANGED', actor: 'SFO2 Ricardo Santos', details: 'Initial temporary password replaced with personal password', target: 'sanjose.admin@antique.gov.ph', timestamp: 'Yesterday, 14:15 PHT' },
    { event: 'HYDRANT_STATUS_UPDATED', actor: 'INSP Maria Santos', details: 'Verified pressure output for Sibalom River Refill Point', target: 'WS-ANT-003', timestamp: 'Yesterday, 11:30 PHT' },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="pbfp-page">
        <div className="pbfp-header-top">
          <h1>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: '#DB1B0D' }} />
            Provincial System Audit & Security Activity Logs
          </h1>
          <p>
            Immutable event logs of administrative actions, account provisioning, mutual aid authorizations, and emergency escalations.
          </p>
        </div>

        <div className="pbfp-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="pbfp-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Actor / Officer</th>
                  <th>Description</th>
                  <th>Target Entity</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, index) => (
                  <tr key={index}>
                    <td>
                      <span style={{ background: '#F1F5F9', color: '#1E293B', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        {l.event}
                      </span>
                    </td>
                    <td><strong>{l.actor}</strong></td>
                    <td style={{ color: '#334155' }}>{l.details}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: '#64748B' }}>{l.target}</td>
                    <td style={{ color: '#64748B', whiteSpace: 'nowrap' }}>{l.timestamp}</td>
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
