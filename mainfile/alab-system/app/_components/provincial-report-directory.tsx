'use client';

import { ProvincialManagementToolbar } from './provincial-management-toolbar';
import React, { useState, useEffect } from 'react';
import { useProvincialManagementList } from './use-provincial-management-list';
import { ProvincialMunicipalityFilter, ProvincialManagementPagination } from './provincial-management-toolbar';
import type { ProvincialReportRow } from '../../lib/provincial-bfp/management/types';
import { getFireTypeLabel, getSeverityLabel, getStatusLabel } from '../../lib/municipal-bfp/reports/formatters';
import { ProvincialReportDetail } from './provincial-report-detail';

interface ProvincialReportDirectoryProps {
  initialMunicipalityId?: string;
}

const directoryStyles = `
  /*
   * Inline styles cannot express a hover, a focus ring or a selection, so the
   * parts of this page the browser draws for us are themed here rather than
   * left at their defaults.
   */
  .prd-row { transition: background-color 0.14s ease; }
  .prd-row:hover { background: #F8FAFC; }
  .prd-row:last-child td { border-bottom: none; }

  .prd-view {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: #E23632;
    color: #FFFFFF;
    border: none;
    padding: 0.55rem 0.95rem;
    border-radius: 9px;
    font-size: 0.8rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease, transform 0.15s ease;
  }
  .prd-view:hover { background: #C42B27; transform: translateY(-1px); }
  .prd-view:active { transform: none; }

  .prd-card ::selection { background: #FEE2E2; color: #7F1D1D; }

  .prd-card :is(button, select, input, a):focus-visible {
    outline: 2px solid #E23632;
    outline-offset: 2px;
    border-radius: 8px;
  }

  .prd-card select:hover,
  .prd-card input:hover { border-color: #94A3B8; }

  .prd-scroll { overflow-x: auto; scrollbar-width: thin; scrollbar-color: #CBD5E1 transparent; }
  .prd-scroll::-webkit-scrollbar { height: 9px; }
  .prd-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 999px; }
  .prd-scroll::-webkit-scrollbar-track { background: transparent; }
`;

export function ProvincialReportDirectory({ initialMunicipalityId = '' }: ProvincialReportDirectoryProps) {
  const { items: reports, total, page, pageSize, setPage, loading, error, filters, setFilter, refresh: fetchReports } = useProvincialManagementList<ProvincialReportRow>({ endpoint: '/api/provincial-bfp/incident-reports', initialFilters: { municipalityId: initialMunicipalityId } });
  const municipalityFilter = filters.municipalityId || '';
  const setMunicipalityFilter = (value: string) => setFilter('municipalityId', value);
  const statusFilter = filters.status || '';
  const setStatusFilter = (value: string) => setFilter('status', value);
  const search = filters.search || '';
  const setSearch = (value: string) => setFilter('search', value);
  const sourceFilter = filters.reportSource || '';
  const setSourceFilter = (value: string) => setFilter('reportSource', value);
  const fireTypeFilter = filters.fireType || '';
  const setFireTypeFilter = (value: string) => setFilter('fireType', value);
  const fromDate = filters.from || '';
  const setFromDate = (value: string) => setFilter('from', value);
  const toDate = filters.to || '';
  const setToDate = (value: string) => setFilter('to', value);

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    const restoreReport = () => setSelectedReportId(new URLSearchParams(window.location.search).get('report'));
    restoreReport();
    window.addEventListener('popstate', restoreReport);
    return () => window.removeEventListener('popstate', restoreReport);
  }, []);

  const badgeStyle = (bg: string, color: string, border: string): React.CSSProperties => ({
    display: 'inline-block',
    background: bg,
    color,
    border: `1px solid ${border}`,
    padding: '3px 9px',
    borderRadius: 999,
    fontSize: '0.72rem',
    fontWeight: 800,
    whiteSpace: 'nowrap',
    letterSpacing: '0.01em',
  });

  const getStatusBadge = (status: string) => {
    const palette: Record<string, [string, string, string]> = {
      CONFIRMED: ['#DC2626', '#FFFFFF', '#B91C1C'],
      VERIFIED: ['#DC2626', '#FFFFFF', '#B91C1C'],
      RESPONDING: ['#EA580C', '#FFFFFF', '#C2410C'],
      FIRETRUCK_DISPATCHED: ['#EA580C', '#FFFFFF', '#C2410C'],
      RESPONDER_ARRIVED: ['#2563EB', '#FFFFFF', '#1D4ED8'],
      UNDER_CONTROL: ['#2563EB', '#FFFFFF', '#1D4ED8'],
      RESOLVED: ['#059669', '#FFFFFF', '#047857'],
      CLOSED: ['#059669', '#FFFFFF', '#047857'],
      SUBMITTED: ['#FEF3C7', '#92400E', '#FDE68A'],
      PENDING_VERIFICATION: ['#FEF3C7', '#92400E', '#FDE68A'],
      UNDER_VERIFICATION: ['#FEF3C7', '#92400E', '#FDE68A'],
    };
    const [bg, color, border] = palette[status] ?? ['#F1F5F9', '#475569', '#E2E8F0'];
    return <span style={badgeStyle(bg, color, border)}>{getStatusLabel(status)}</span>;
  };

  const getSeverityBadge = (severity: string) => {
    const palette: Record<string, [string, string, string]> = {
      CRITICAL: ['#FEE2E2', '#991B1B', '#FECACA'],
      HIGH: ['#FFEDD5', '#C2410C', '#FED7AA'],
      MODERATE: ['#FEF3C7', '#B45309', '#FDE68A'],
      LOW: ['#DCFCE7', '#15803D', '#BBF7D0'],
    };
    const [bg, color, border] = palette[severity] ?? ['#F1F5F9', '#475569', '#E2E8F0'];
    return <span style={badgeStyle(bg, color, border)}>{getSeverityLabel(severity)}</span>;
  };


  return (
    <div className="prd-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: 'inherit' }}>
      <style>{directoryStyles}</style>
      {/*
        One command strip: the title, what the registry currently holds, and the
        two actions that act on it. The export button used to float above the
        page with nothing around it, and the municipality filter sat loose
        between two cards belonging to neither.
      */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E8EDF4',
        borderRadius: 14,
        padding: '1.35rem 1.5rem',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 0 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#FEF2F2',
              color: '#E23632',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1.05rem',
              flexShrink: 0,
            }}>
              <i className="fa-solid fa-file-lines" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                All Municipal Fire Reports
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                {loading && total === 0
                  ? 'Reading the provincial registry…'
                  : `${total.toLocaleString()} report${total === 1 ? '' : 's'} across Antique Province`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              onClick={fetchReports}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                padding: '9px 15px',
                borderRadius: 9,
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#334155',
                cursor: loading ? 'progress' : 'pointer',
                transition: 'background 0.15s ease, border-color 0.15s ease',
              }}
            >
              <i className={`fa-solid fa-arrows-rotate${loading ? ' fa-spin' : ''}`} style={{ fontSize: '0.78rem' }} />
              {loading ? 'Refreshing' : 'Refresh'}
            </button>
            <ProvincialManagementToolbar exportOnly dataset="FIRE_REPORTS" filters={filters} onFilterChange={() => {}} />
          </div>
        </div>

        <ProvincialMunicipalityFilter value={municipalityFilter} onChange={setMunicipalityFilter} />
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: '#FFFFFF',
          padding: '1.25rem 1.5rem',
          borderRadius: 14,
          border: '1px solid #E8EDF4',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1.1rem',
          alignItems: 'flex-end',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', background: '#FFFFFF', color: '#0F172A' }}
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING_VERIFICATION">Pending verification</option>
            <option value="VERIFIED">Verified</option>
            <option value="RESPONDING">Responding</option>
            <option value="FIRETRUCK_DISPATCHED">Firetruck dispatched</option>
            <option value="RESPONDER_ARRIVED">Responder arrived</option>
            <option value="UNDER_CONTROL">Under control</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="FALSE_REPORT">False Report</option>
            <option value="REJECTED">Rejected</option>
            <option value="DUPLICATE">Duplicate</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source</label>
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', background: '#FFFFFF', color: '#0F172A' }}
          >
            <option value="">All Sources</option>
            <option value="ALAB_APP">ALAB Mobile App</option>
            <option value="PHONE_CALL">Phone Call</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fire Type</label>
          <select
            value={fireTypeFilter}
            onChange={(e) => { setFireTypeFilter(e.target.value); setPage(1); }}
            style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', background: '#FFFFFF', color: '#0F172A' }}
          >
            <option value="">All Types</option>
            <option value="HOUSE_BUILDING">House / Building</option>
            <option value="GRASS">Grass Fire</option>
            <option value="FOREST">Forest Fire</option>
            <option value="VEHICLE">Vehicle Fire</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', background: '#FFFFFF', color: '#0F172A' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', background: '#FFFFFF', color: '#0F172A' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: 'span 2' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search</label>
          <input
            type="text"
            placeholder="Search reference, barangay, municipality, narrative..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', background: '#FFFFFF', color: '#0F172A' }}
          />
        </div>
      </div>

      {/* Reports Table */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E8EDF4',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          overflow: 'hidden',
        }}
      >
        {error && (
          <div style={{ padding: '1rem', background: '#FEE2E2', color: '#991B1B', fontSize: '0.875rem' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B', fontSize: '0.875rem' }}>
            Loading municipal fire reports across Antique…
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B', fontSize: '0.875rem' }}>
            No incident reports found for the selected criteria.
          </div>
        ) : (
          <div className="prd-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '14px 18px' }}>Reference</th>
                  <th style={{ padding: '14px 18px' }}>Municipality / Barangay</th>
                  <th style={{ padding: '14px 18px' }}>Source</th>
                  <th style={{ padding: '14px 18px' }}>Type / Danger Level</th>
                  <th style={{ padding: '14px 18px' }}>Status</th>
                  <th style={{ padding: '14px 18px' }}>Submitted Time</th>
                  <th style={{ padding: '14px 18px' }}>Dispatches</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((rep) => (
                  <tr
                    key={rep.id}
                    className="prd-row"
                    style={{ borderBottom: '1px solid #F1F5F9' }}
                  >
                    <td style={{ padding: '17px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {rep.referenceNumber}
                    </td>
                    <td style={{ padding: '17px 18px' }}>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{rep.municipalityName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{rep.barangay}</div>
                    </td>
                    <td style={{ padding: '17px 18px', fontSize: '0.8125rem' }}>
                      <span style={{ padding: '2px 6px', background: '#F1F5F9', borderRadius: 4, fontWeight: 600, color: '#475569' }}>
                        {rep.reportSource === 'ALAB_APP' ? 'App' : 'Phone'}
                      </span>
                    </td>
                    <td style={{ padding: '17px 18px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>{getFireTypeLabel(rep.fireType)}</div>
                      <div style={{ marginTop: 4 }}>
                        {rep.severity && rep.severity !== 'UNKNOWN'
                          ? getSeverityBadge(rep.severity)
                          : <span style={{ fontSize: '0.76rem', color: '#94A3B8', fontWeight: 600 }}>Not rated</span>}
                      </div>
                    </td>
                    <td style={{ padding: '17px 18px' }}>
                      {getStatusBadge(rep.status)}
                    </td>
                    <td style={{ padding: '17px 18px', color: '#64748B', whiteSpace: 'nowrap' }}>
                      {new Date(rep.submittedAt).toLocaleDateString()} {new Date(rep.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '17px 18px', fontSize: '0.75rem', color: '#64748B' }}>
                      {rep.latestDispatchSummary || 'No dispatch active'}
                    </td>
                    <td style={{ padding: '17px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedReportId(rep.id)}
                        className="prd-view"
                      >
                        <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.72rem' }} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      <ProvincialManagementPagination page={page} pageSize={pageSize} total={total} loading={loading} setPage={setPage} />

      {selectedReportId && (
        <ProvincialReportDetail
          key={selectedReportId}
          reportId={selectedReportId}
          onClose={() => {
            setSelectedReportId(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('report');
            window.history.replaceState(window.history.state, '', url);
          }}
        />
      )}
    </div>
  );
}
