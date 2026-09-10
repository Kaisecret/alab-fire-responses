'use client';

import React, { useState } from 'react';
import { useProvincialManagementList } from '../../_components/use-provincial-management-list';
import Link from 'next/link';
import type { MunicipalitySummary } from '../../../lib/provincial-bfp/management/types';

const styles = `
  .pbfp-page {
    padding: 10px 1.5rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #EEF5FD;
    min-height: 100%;
    color: #0F172A;
  }

  /* Header Hub */
  .pbfp-header-hub {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .pbfp-header-left {
    display: flex;
    align-items: center;
    gap: 0.9rem;
  }

  .pbfp-header-icon-badge {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #E23632 0%, #B91C1C 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 1.25rem;
    box-shadow: 0 4px 14px rgba(226, 54, 50, 0.35);
    flex-shrink: 0;
  }

  .pbfp-header-title-box h1 {
    font-size: 1.35rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .pbfp-header-title-box p {
    font-size: 0.8rem;
    color: #64748B;
    margin: 0.15rem 0 0;
    font-weight: 500;
  }

  .pbfp-header-actions {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .pbfp-btn-refresh {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 0.95rem;
    background: #FFFFFF;
    color: #334155;
    border: 1px solid #CBD5E1;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pbfp-btn-refresh:hover {
    background: #F8FAFC;
    color: #0F172A;
    border-color: #94A3B8;
  }

  .pbfp-btn-gis {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 1.1rem;
    background: #0F172A;
    color: #FFFFFF;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.8rem;
    text-decoration: none;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .pbfp-btn-gis:hover {
    background: #1E293B;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.25);
  }

  /* Toolbar */
  .pbfp-toolbar-box {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 0.75rem 1.15rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    flex-wrap: wrap;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.03);
  }

  .pbfp-filter-pills {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: #F1F5F9;
    padding: 0.25rem;
    border-radius: 10px;
    flex-wrap: wrap;
  }

  .pbfp-filter-pill {
    padding: 0.4rem 0.85rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 700;
    border: none;
    background: transparent;
    color: #64748B;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pbfp-filter-pill:hover {
    color: #0F172A;
  }

  .pbfp-filter-pill.active {
    background: #E23632;
    color: #FFFFFF;
    box-shadow: 0 2px 8px rgba(226, 54, 50, 0.3);
  }

  .pbfp-pill-count {
    padding: 0.12rem 0.4rem;
    border-radius: 6px;
    font-size: 0.68rem;
    font-weight: 800;
    background: rgba(0, 0, 0, 0.08);
  }

  .pbfp-filter-pill.active .pbfp-pill-count {
    background: rgba(255, 255, 255, 0.25);
    color: #FFFFFF;
  }

  .pbfp-search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 999px;
    padding: 0.42rem 0.95rem;
    width: 270px;
    transition: all 0.15s;
  }

  .pbfp-search-box:focus-within {
    border-color: #E23632;
    background: #FFFFFF;
    box-shadow: 0 0 0 3px rgba(226, 54, 50, 0.1);
  }

  .pbfp-search-box i {
    color: #94A3B8;
    font-size: 0.8rem;
  }

  .pbfp-search-input {
    border: none;
    outline: none;
    font-size: 0.78rem;
    width: 100%;
    background: transparent;
    color: #0F172A;
    font-weight: 600;
    font-family: inherit;
  }

  /* Cards Grid */
  .pbfp-grid-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .pbfp-clean-card {
    background: #FFFFFF;
    border: 1.5px solid #E2E8F0;
    border-radius: 16px;
    padding: 1.25rem 1.3rem;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 1.1rem;
    cursor: pointer;
    transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    user-select: none;
    animation: pbfpCardReveal 0.42s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-clean-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.09), 0 0 0 1px #CBD5E1;
    border-color: #CBD5E1;
  }

  .pbfp-clean-card.has-active-incidents {
    border-color: rgba(226, 54, 50, 0.35);
    background: linear-gradient(180deg, #FFFDFD 0%, #FFFFFF 100%);
    box-shadow: 0 4px 16px rgba(226, 54, 50, 0.08);
  }

  .pbfp-clean-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .pbfp-station-identity {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .pbfp-station-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.22;
    letter-spacing: -0.01em;
  }

  .pbfp-station-district {
    font-size: 0.72rem;
    color: #94A3B8;
    font-weight: 600;
    margin-top: 0.25rem;
  }

  /* Status Badges */
  .pbfp-tile-status-pill {
    font-size: 0.68rem;
    font-weight: 800;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    white-space: nowrap;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .pbfp-beacon-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .pbfp-tile-status-pill.ready {
    background: #ECFDF5;
    color: #059669;
    border: 1px solid #D1FAE5;
  }
  .pbfp-tile-status-pill.ready .pbfp-beacon-dot {
    background: #059669;
  }

  .pbfp-tile-status-pill.active-fire {
    background: #FFF1F2;
    color: #E23632;
    border: 1px solid #FFE4E6;
    box-shadow: 0 0 12px rgba(226, 54, 50, 0.2);
  }
  .pbfp-tile-status-pill.active-fire .pbfp-beacon-dot {
    background: #E23632;
    box-shadow: 0 0 6px #E23632;
    animation: pbfpBreathe 1s infinite alternate;
  }

  .pbfp-metrics-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    background: #F8FAFC;
    padding: 0.65rem;
    border-radius: 12px;
    border: 1px solid #F1F5F9;
  }

  .pbfp-metric-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .pbfp-metric-value {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.2;
  }

  .pbfp-metric-label {
    font-size: 0.66rem;
    font-weight: 700;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-top: 0.15rem;
  }

  .pbfp-clean-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.6rem;
    border-top: 1px solid #F1F5F9;
    font-size: 0.74rem;
    font-weight: 700;
    color: #64748B;
  }

  .pbfp-open-prompt {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #E23632;
    font-weight: 700;
    transition: transform 0.15s ease;
  }

  .pbfp-clean-card:hover .pbfp-open-prompt {
    transform: translateX(3px);
  }

  /* Command Inspector Modal */
  .pbfp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 1.5rem;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-modal-card {
    background: #FFFFFF;
    border-radius: 24px;
    box-shadow: 0 30px 70px rgba(15, 23, 42, 0.3);
    border: 1px solid #E2E8F0;
    max-width: 640px;
    width: 100%;
    overflow: hidden;
    animation: pbfpModalPop 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-modal-header {
    padding: 1.35rem 1.6rem;
    background: #F8FAFC;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pbfp-modal-title-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .pbfp-modal-icon-badge {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: #FFF1F2;
    border: 1px solid #FFE4E6;
    color: #E23632;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
  }

  .pbfp-modal-title h3 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-modal-title span {
    font-size: 0.74rem;
    color: #64748B;
    font-weight: 600;
  }

  .pbfp-modal-close {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #64748B;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.95rem;
    transition: all 0.15s;
  }

  .pbfp-modal-close:hover {
    background: #F1F5F9;
    color: #0F172A;
  }

  .pbfp-modal-body {
    padding: 1.6rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-height: 70vh;
    overflow-y: auto;
  }

  .pbfp-modal-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.85rem;
  }

  .pbfp-modal-stat-box {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 0.85rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .pbfp-modal-stat-box.alert {
    background: #FFF1F2;
    border-color: #FFE4E6;
  }

  .pbfp-modal-stat-box.warning {
    background: #FFFBEB;
    border-color: #FEF3C7;
  }

  .pbfp-modal-stat-num {
    font-size: 1.4rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.1;
  }

  .pbfp-modal-stat-box.alert .pbfp-modal-stat-num {
    color: #E23632;
  }

  .pbfp-modal-stat-box.warning .pbfp-modal-stat-num {
    color: #D97706;
  }

  .pbfp-modal-stat-lbl {
    font-size: 0.68rem;
    font-weight: 700;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-top: 0.2rem;
  }

  .pbfp-modal-links-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .pbfp-modal-links-title {
    font-size: 0.75rem;
    font-weight: 800;
    color: #334155;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.2rem;
  }

  .pbfp-modal-link-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    color: #0F172A;
    font-size: 0.82rem;
    font-weight: 700;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .pbfp-modal-link-btn:hover {
    background: #EEF5FD;
    border-color: #CBD5E1;
    transform: translateX(3px);
  }

  .pbfp-modal-footer {
    padding: 1.1rem 1.6rem;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .pbfp-modal-btn {
    padding: 0.6rem 1.25rem;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 700;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .pbfp-modal-btn.primary {
    background: #E23632;
    color: #FFFFFF;
    border-color: #E23632;
  }

  .pbfp-modal-btn.primary:hover {
    background: #C42724;
  }

  @keyframes pbfpBreathe {
    0% { transform: scale(0.9); opacity: 0.8; }
    100% { transform: scale(1.3); opacity: 1; }
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pbfpCardReveal {
    0% { opacity: 0; transform: translateY(16px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes pbfpModalPop {
    0% { opacity: 0; transform: scale(0.92) translateY(20px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }

  @media (max-width: 1280px) {
    .pbfp-grid-cards { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 1024px) {
    .pbfp-grid-cards { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .pbfp-grid-cards { grid-template-columns: 1fr; }
    .pbfp-toolbar-box { flex-direction: column; align-items: stretch; }
    .pbfp-search-box { width: 100%; }
  }
`;

export default function MunicipalStatusPage() {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE_INCIDENTS' | 'PENDING_APPS' | 'HAS_STATIONS'>('ALL');

  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalitySummary | null>(null);
  const { items: municipalities, loading, error, updatedAt: lastUpdated, filters, setFilter: setListFilter, refresh: fetchMunicipalities } = useProvincialManagementList<MunicipalitySummary>({ endpoint: '/api/provincial-bfp/municipalities', initialFilters: { pageSize: 25 } });
  const searchQuery = filters.search || '';
  const setSearchQuery = (value: string) => setListFilter('search', value);

  const filtered = municipalities.filter((m) => {
    if (filter === 'ACTIVE_INCIDENTS') return m.activeIncidentCount > 0;
    if (filter === 'PENDING_APPS') return m.pendingApplicationCount > 0;
    if (filter === 'HAS_STATIONS') return m.stationCount > 0;
    return true;
  });

  const activeIncidentsTotal = municipalities.filter((m) => m.activeIncidentCount > 0).length;
  const pendingAppsTotal = municipalities.filter((m) => m.pendingApplicationCount > 0).length;
  const hasStationsTotal = municipalities.filter((m) => m.stationCount > 0).length;

  return (
    <>
      <style>{styles}</style>
      <div className="pbfp-page">
        {/* Header Bar */}
        <div className="pbfp-header-hub">
          <div className="pbfp-header-left">
            <div className="pbfp-header-icon-badge">
              <i className="fa-solid fa-building-shield" />
            </div>
            <div className="pbfp-header-title-box">
              <h1>Municipality Directory</h1>
              <p>
                Province of Antique · {municipalities.length} Local Government Units
                {lastUpdated && ` · Updated ${new Date(lastUpdated).toLocaleTimeString()}`}
              </p>
            </div>
          </div>
          <div className="pbfp-header-actions">
            <button
              type="button"
              className="pbfp-btn-refresh"
              onClick={() => fetchMunicipalities()}
              disabled={loading}
            >
              <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} /> Refresh
            </button>
            <Link href="/provincial-bfp/gis-map" className="pbfp-btn-gis">
              <i className="fa-solid fa-map-location-dot" /> Open GIS View
            </Link>
          </div>
        </div>

        {/* Toolbar Hub */}
        <div className="pbfp-toolbar-box">
          <div className="pbfp-filter-pills">
            <button
              type="button"
              className={`pbfp-filter-pill ${filter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              <span>All LGUs</span>
              <span className="pbfp-pill-count">{municipalities.length}</span>
            </button>
            <button
              type="button"
              className={`pbfp-filter-pill ${filter === 'ACTIVE_INCIDENTS' ? 'active' : ''}`}
              onClick={() => setFilter('ACTIVE_INCIDENTS')}
            >
              <span>Active Emergencies</span>
              <span className="pbfp-pill-count">{activeIncidentsTotal}</span>
            </button>
            <button
              type="button"
              className={`pbfp-filter-pill ${filter === 'PENDING_APPS' ? 'active' : ''}`}
              onClick={() => setFilter('PENDING_APPS')}
            >
              <span>Pending Reviews</span>
              <span className="pbfp-pill-count">{pendingAppsTotal}</span>
            </button>
            <button
              type="button"
              className={`pbfp-filter-pill ${filter === 'HAS_STATIONS' ? 'active' : ''}`}
              onClick={() => setFilter('HAS_STATIONS')}
            >
              <span>Active Stations</span>
              <span className="pbfp-pill-count">{hasStationsTotal}</span>
            </button>
          </div>

          <div className="pbfp-search-box">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              className="pbfp-search-input"
              placeholder="Search municipality..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{ background: '#FFF1F2', border: '1px solid #FFE4E6', borderRadius: '12px', padding: '1rem', color: '#E23632', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />{error}</span>
            <button type="button" onClick={() => fetchMunicipalities()} style={{ background: '#E23632', color: '#FFF', border: 'none', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
          </div>
        )}

        {/* Cards Grid */}
        <div className="pbfp-grid-cards">
          {loading && municipalities.length === 0 ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '1.25rem', height: '180px', opacity: 0.6 }} />
            ))
          ) : filtered.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem 1rem', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', color: '#64748B' }}>
              <i className="fa-solid fa-building-shield" style={{ fontSize: '2.5rem', color: '#CBD5E1', marginBottom: '0.5rem', display: 'block' }} />
              <strong style={{ display: 'block', color: '#0F172A', fontSize: '1rem' }}>No matching Antique municipalities found</strong>
              <span style={{ fontSize: '0.8rem' }}>Try clearing your search query or choosing another status tab.</span>
            </div>
          ) : (
            filtered.map((m, index) => {
              const hasActive = m.activeIncidentCount > 0;
              return (
                <div
                  className={`pbfp-clean-card ${hasActive ? 'has-active-incidents' : ''}`}
                  key={m.id}
                  style={{ animationDelay: `${Math.min(index * 35, 400)}ms` }}
                  onClick={() => setSelectedMunicipality(m)}
                >
                  <div className="pbfp-clean-card-header">
                    <div className="pbfp-station-identity">
                      <span className="pbfp-station-title">{m.name}</span>
                      <span className="pbfp-station-district">{m.province}</span>
                    </div>
                    {hasActive ? (
                      <span className="pbfp-tile-status-pill active-fire">
                        <span className="pbfp-beacon-dot" />
                        <span>Active Incident ({m.activeIncidentCount})</span>
                      </span>
                    ) : (
                      <span className="pbfp-tile-status-pill ready">
                        <span className="pbfp-beacon-dot" />
                        <span>No Active Incidents</span>
                      </span>
                    )}
                  </div>

                  <div className="pbfp-metrics-strip">
                    <div className="pbfp-metric-item">
                      <span className="pbfp-metric-value">{m.stationCount}</span>
                      <span className="pbfp-metric-label">Stations</span>
                    </div>
                    <div className="pbfp-metric-item">
                      <span className="pbfp-metric-value">{m.personnelCount}</span>
                      <span className="pbfp-metric-label">Personnel</span>
                    </div>
                    <div className="pbfp-metric-item">
                      <span className="pbfp-metric-value">{m.residentCount}</span>
                      <span className="pbfp-metric-label">Residents</span>
                    </div>
                  </div>

                  <div className="pbfp-clean-card-footer">
                    <span>
                      {m.pendingApplicationCount > 0
                        ? `${m.pendingApplicationCount} Pending Verification`
                        : `${m.totalReportCount} Total Reports`}
                    </span>
                    <span className="pbfp-open-prompt">
                      Inspect <i className="fa-solid fa-arrow-right" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Command Inspector Modal */}
      {selectedMunicipality && (
        <div className="pbfp-modal-overlay" onClick={() => setSelectedMunicipality(null)}>
          <div className="pbfp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pbfp-modal-header">
              <div className="pbfp-modal-title-group">
                <div className="pbfp-modal-icon-badge">
                  <i className="fa-solid fa-building-shield" />
                </div>
                <div className="pbfp-modal-title">
                  <h3>{selectedMunicipality.name}</h3>
                  <span>Province of Antique · Municipal Jurisdiction</span>
                </div>
              </div>
              <button
                type="button"
                className="pbfp-modal-close"
                onClick={() => setSelectedMunicipality(null)}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="pbfp-modal-body">
              <div className="pbfp-modal-stats-grid">
                <div className="pbfp-modal-stat-box">
                  <span className="pbfp-modal-stat-num">{selectedMunicipality.stationCount}</span>
                  <span className="pbfp-modal-stat-lbl">Active Stations</span>
                </div>
                <div className="pbfp-modal-stat-box">
                  <span className="pbfp-modal-stat-num">{selectedMunicipality.personnelCount}</span>
                  <span className="pbfp-modal-stat-lbl">BFP Personnel</span>
                </div>
                <div className="pbfp-modal-stat-box">
                  <span className="pbfp-modal-stat-num">{selectedMunicipality.residentCount}</span>
                  <span className="pbfp-modal-stat-lbl">Registered Residents</span>
                </div>
                <div className={`pbfp-modal-stat-box ${selectedMunicipality.activeIncidentCount > 0 ? 'alert' : ''}`}>
                  <span className="pbfp-modal-stat-num">{selectedMunicipality.activeIncidentCount}</span>
                  <span className="pbfp-modal-stat-lbl">Active Emergencies</span>
                </div>
                <div className={`pbfp-modal-stat-box ${selectedMunicipality.pendingApplicationCount > 0 ? 'warning' : ''}`}>
                  <span className="pbfp-modal-stat-num">{selectedMunicipality.pendingApplicationCount}</span>
                  <span className="pbfp-modal-stat-lbl">Pending Applications</span>
                </div>
                <div className="pbfp-modal-stat-box">
                  <span className="pbfp-modal-stat-num">{selectedMunicipality.resolvedIncidentCount}</span>
                  <span className="pbfp-modal-stat-lbl">Resolved Fires</span>
                </div>
              </div>

              <div className="pbfp-modal-links-section">
                <span className="pbfp-modal-links-title">Provincial Management Modules</span>
                <Link
                  href={`/provincial-bfp/firetrucks-stations?municipalityId=${selectedMunicipality.id}`}
                  className="pbfp-modal-link-btn"
                >
                  <span><i className="fa-solid fa-truck-fire" style={{ marginRight: '0.6rem', color: '#E23632' }} /> View Municipal Fire Stations ({selectedMunicipality.stationCount})</span>
                  <i className="fa-solid fa-arrow-right" />
                </Link>
                <Link
                  href={`/provincial-bfp/responders?municipalityId=${selectedMunicipality.id}`}
                  className="pbfp-modal-link-btn"
                >
                  <span><i className="fa-solid fa-user-shield" style={{ marginRight: '0.6rem', color: '#2563EB' }} /> Manage BFP Personnel Roster ({selectedMunicipality.personnelCount})</span>
                  <i className="fa-solid fa-arrow-right" />
                </Link>
                <Link
                  href={`/provincial-bfp/residents?municipalityId=${selectedMunicipality.id}`}
                  className="pbfp-modal-link-btn"
                >
                  <span><i className="fa-solid fa-users" style={{ marginRight: '0.6rem', color: '#059669' }} /> Inspect Registered Residents ({selectedMunicipality.residentCount})</span>
                  <i className="fa-solid fa-arrow-right" />
                </Link>
                <Link
                  href={`/provincial-bfp/resident-applications?municipalityId=${selectedMunicipality.id}`}
                  className="pbfp-modal-link-btn"
                >
                  <span><i className="fa-solid fa-id-card" style={{ marginRight: '0.6rem', color: '#D97706' }} /> Review Resident Applications ({selectedMunicipality.pendingApplicationCount} Pending)</span>
                  <i className="fa-solid fa-arrow-right" />
                </Link>
                <Link
                  href={`/provincial-bfp/incident-reports?municipalityId=${selectedMunicipality.id}`}
                  className="pbfp-modal-link-btn"
                >
                  <span><i className="fa-solid fa-fire" style={{ marginRight: '0.6rem', color: '#E23632' }} /> All Municipal Fire Reports ({selectedMunicipality.totalReportCount})</span>
                  <i className="fa-solid fa-arrow-right" />
                </Link>
              </div>
            </div>

            <div className="pbfp-modal-footer">
              <button
                type="button"
                className="pbfp-modal-btn"
                onClick={() => setSelectedMunicipality(null)}
              >
                Close
              </button>
              <Link
                href={`/provincial-bfp/gis-map?municipalityId=${selectedMunicipality.id}`}
                className="pbfp-modal-btn primary"
              >
                <i className="fa-solid fa-map-location-dot" /> Focus in GIS View
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
