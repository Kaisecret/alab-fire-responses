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

export default function ProvincialReportsPage() {
  const reports = [
    { title: 'Monthly Provincial Fire Incident Summary (July 2026)', code: 'REP-2026-07-PBF', period: 'July 1 - July 31, 2026', author: 'Provincial Operations Branch', size: '1.8 MB PDF' },
    { title: 'Mutual Aid & Apparatus Utilization Assessment', code: 'REP-2026-Q2-AID', period: 'Q2 2026 (Apr - Jun)', author: 'Logistics Division', size: '2.4 MB PDF' },
    { title: 'Municipal Hydrant Reliability & Water Source Audit', code: 'REP-2026-H2-WTR', period: 'First Semester 2026', author: 'Inspection Directorate', size: '3.1 MB PDF' },
    { title: 'Antique Provincial BFP Annual Readiness Report', code: 'REP-2025-ANNUAL', period: 'Year 2025 Full Review', author: 'Office of the Provincial Marshal', size: '4.7 MB PDF' },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="pbfp-page">
        <div className="pbfp-header-top">
          <h1>
            <i className="fa-solid fa-file-shield" style={{ color: '#DB1B0D' }} />
            Provincial BFP Official Reports & Documentation
          </h1>
          <p>
            Generate, archive, and export official executive BFP reports, incident summaries, and logistics audits for Antique Province.
          </p>
        </div>

        <div className="pbfp-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="pbfp-table">
              <thead>
                <tr>
                  <th>Report Title</th>
                  <th>Reference Code</th>
                  <th>Coverage Period</th>
                  <th>Issuing Unit</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.code}>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{r.title}</td>
                    <td style={{ fontFamily: 'monospace', color: '#64748B' }}>{r.code}</td>
                    <td>{r.period}</td>
                    <td>{r.author}</td>
                    <td>
                      <button
                        type="button"
                        style={{
                          background: '#0F172A',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <i className="fa-solid fa-download" /> Download
                      </button>
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
