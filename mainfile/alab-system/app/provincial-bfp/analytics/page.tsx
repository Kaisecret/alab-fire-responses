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
  .pbfp-analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.25rem;
  }
  .pbfp-stat-box {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .pbfp-stat-title {
    font-size: 0.75rem;
    font-weight: 700;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .pbfp-stat-value {
    font-size: 1.8rem;
    font-weight: 800;
    color: #0F172A;
  }
  .pbfp-bar-row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.78rem;
  }
  .pbfp-bar-track {
    height: 8px;
    background: #F1F5F9;
    border-radius: 999px;
    overflow: hidden;
  }
  .pbfp-bar-fill {
    height: 100%;
    border-radius: 999px;
  }
`;

export default function AnalyticsPage() {
  return (
    <>
      <style>{styles}</style>
      <div className="pbfp-page">
        <div className="pbfp-header-top">
          <h1>
            <i className="fa-solid fa-chart-pie" style={{ color: '#DB1B0D' }} />
            Provincial Fire Response Intelligence & Analytics
          </h1>
          <p>
            Statistical overview of response durations, incident distribution by municipality, alarm frequencies, and apparatus utilization in Antique.
          </p>
        </div>

        <div className="pbfp-analytics-grid">
          <div className="pbfp-stat-box">
            <span className="pbfp-stat-title">Average Response Time (Province)</span>
            <div className="pbfp-stat-value">6.8 mins</div>
            <p style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
              <i className="fa-solid fa-arrow-trend-down" /> 18% faster than regional target (8.0 mins)
            </p>
          </div>

          <div className="pbfp-stat-box">
            <span className="pbfp-stat-title">Total Incidents Recorded (2026 YTD)</span>
            <div className="pbfp-stat-value">84 Incidents</div>
            <p style={{ fontSize: '0.78rem', color: '#64748B' }}>
              62 Residential • 14 Grass/Brush • 8 Commercial
            </p>
          </div>

          <div className="pbfp-stat-box">
            <span className="pbfp-stat-title">Verification & Dispatch Accuracy</span>
            <div className="pbfp-stat-value">97.4%</div>
            <p style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
              Verified within 90 seconds of citizen report
            </p>
          </div>
        </div>

        <div className="pbfp-analytics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
          <div className="pbfp-stat-box">
            <span className="pbfp-stat-title">Incident Distribution by Top Municipalities</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
              <div className="pbfp-bar-row">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>San Jose de Buenavista</span>
                  <strong>28 incidents (33%)</strong>
                </div>
                <div className="pbfp-bar-track">
                  <div className="pbfp-bar-fill" style={{ width: '33%', background: '#DB1B0D' }} />
                </div>
              </div>

              <div className="pbfp-bar-row">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sibalom</span>
                  <strong>16 incidents (19%)</strong>
                </div>
                <div className="pbfp-bar-track">
                  <div className="pbfp-bar-fill" style={{ width: '19%', background: '#2563EB' }} />
                </div>
              </div>

              <div className="pbfp-bar-row">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Culasi</span>
                  <strong>10 incidents (12%)</strong>
                </div>
                <div className="pbfp-bar-track">
                  <div className="pbfp-bar-fill" style={{ width: '12%', background: '#059669' }} />
                </div>
              </div>

              <div className="pbfp-bar-row">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Hamtic</span>
                  <strong>8 incidents (9.5%)</strong>
                </div>
                <div className="pbfp-bar-track">
                  <div className="pbfp-bar-fill" style={{ width: '9.5%', background: '#D97706' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pbfp-stat-box">
            <span className="pbfp-stat-title">Causes of Fire Incidents</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
              <div className="pbfp-bar-row">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Electrical Connection / Overload</span>
                  <strong>48%</strong>
                </div>
                <div className="pbfp-bar-track">
                  <div className="pbfp-bar-fill" style={{ width: '48%', background: '#DB1B0D' }} />
                </div>
              </div>

              <div className="pbfp-bar-row">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Open Flame / Unattended Cooking</span>
                  <strong>26%</strong>
                </div>
                <div className="pbfp-bar-track">
                  <div className="pbfp-bar-fill" style={{ width: '26%', background: '#D97706' }} />
                </div>
              </div>

              <div className="pbfp-bar-row">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Agricultural / Grass Burning</span>
                  <strong>16%</strong>
                </div>
                <div className="pbfp-bar-track">
                  <div className="pbfp-bar-fill" style={{ width: '16%', background: '#059669' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
