'use client';

import React, { useState } from 'react';

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
  .pbfp-settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.25rem;
  }
  .pbfp-settings-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .pbfp-settings-card h2 {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .pbfp-form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .pbfp-form-group label {
    font-size: 0.8rem;
    font-weight: 700;
    color: #334155;
  }
  .pbfp-input {
    padding: 0.65rem 0.85rem;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.86rem;
    color: #0F172A;
    font-family: inherit;
  }
  .pbfp-btn-save {
    background: #DB1B0D;
    color: #FFFFFF;
    padding: 0.65rem 1.25rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.84rem;
    border: none;
    cursor: pointer;
    align-self: flex-start;
    transition: all 0.18s;
  }
  .pbfp-btn-save:hover {
    background: #c2160a;
  }
`;

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="pbfp-page">
        <div className="pbfp-header-top">
          <h1>
            <i className="fa-solid fa-sliders" style={{ color: '#DB1B0D' }} />
            Provincial Command Center Settings & Preferences
          </h1>
          <p>
            Configure operational dispatch parameters, administrative alerts, and profile security for Antique BFP Headquarters.
          </p>
        </div>

        {saved && (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 600 }}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: '0.4rem' }} /> Settings successfully updated.
          </div>
        )}

        <div className="pbfp-settings-grid">
          <form className="pbfp-settings-card" onSubmit={handleSubmit}>
            <h2>
              <i className="fa-solid fa-bell" style={{ color: '#DB1B0D' }} />
              Alert & Alarm Escalation Thresholds
            </h2>
            <div className="pbfp-form-group">
              <label>Default Escalation Alarm Trigger</label>
              <select className="pbfp-input" defaultValue="2">
                <option value="1">1st Alarm (Local Station Response)</option>
                <option value="2">2nd Alarm (Automatic Provincial Mutual Aid Notice)</option>
                <option value="3">3rd Alarm (Province-wide Task Force Alpha)</option>
              </select>
            </div>
            <div className="pbfp-form-group">
              <label>Mutual Aid Radius Warning (km)</label>
              <input type="number" className="pbfp-input" defaultValue="25" />
            </div>
            <button type="submit" className="pbfp-btn-save">
              Save Alert Preferences
            </button>
          </form>

          <form className="pbfp-settings-card" onSubmit={handleSubmit}>
            <h2>
              <i className="fa-solid fa-shield-halved" style={{ color: '#DB1B0D' }} />
              Headquarters Administrative Info
            </h2>
            <div className="pbfp-form-group">
              <label>Provincial Command Center Designation</label>
              <input type="text" className="pbfp-input" defaultValue="Antique BFP Provincial Headquarters" />
            </div>
            <div className="pbfp-form-group">
              <label>Emergency Dispatch Hotline</label>
              <input type="text" className="pbfp-input" defaultValue="(036) 540-9911 / 911" />
            </div>
            <button type="submit" className="pbfp-btn-save">
              Update Information
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
