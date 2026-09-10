'use client';

import { ProvincialManagementToolbar } from './provincial-management-toolbar';
import React, { useState, useEffect } from 'react';
import { useProvincialManagementList } from './use-provincial-management-list';
import { ProvincialMunicipalityFilter, ProvincialManagementPagination } from './provincial-management-toolbar';
import type { ProvincialReportRow } from '../../lib/provincial-bfp/management/types';
import { ProvincialReportDetail } from './provincial-report-detail';

interface ProvincialReportDirectoryProps {
  initialMunicipalityId?: string;
}

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span style={{ background: '#DC2626', color: '#FFFFFF', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>CONFIRMED</span>;
      case 'CLOSED':
        return <span style={{ background: '#059669', color: '#FFFFFF', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>CLOSED</span>;
      case 'SUBMITTED':
      case 'UNDER_VERIFICATION':
        return <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>SUBMITTED</span>;
      case 'FALSE_REPORT':
      case 'REJECTED':
      case 'DUPLICATE':
        return <span style={{ background: '#F1F5F9', color: '#64748B', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>{status}</span>;
      default:
        return <span style={{ background: '#E2E8F0', color: '#475569', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>{status}</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span style={{ background: '#7F1D1D', color: '#FECACA', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 800 }}>CRITICAL</span>;
      case 'HIGH':
        return <span style={{ background: '#991B1B', color: '#FEE2E2', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 800 }}>HIGH</span>;
      case 'MODERATE':
        return <span style={{ background: '#D97706', color: '#FEF3C7', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 800 }}>MODERATE</span>;
      case 'LOW':
        return <span style={{ background: '#047857', color: '#D1FAE5', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>LOW</span>;
      default: return <span style={{ color: '#64748B' }}>Not available</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'inherit' }}>
      <ProvincialManagementToolbar exportOnly dataset="FIRE_REPORTS" filters={filters} onFilterChange={() => {}} />
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            All Municipal Fire Reports
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748B' }}>
            Comprehensive unified registry of all emergency fire reports and dispatches across Antique Province.
          </p>
        </div>

        <button
          onClick={fetchReports}
          disabled={loading}
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          {loading ? 'Refreshing…' : '↻ Refresh Reports'}
        </button>
      </div>

<ProvincialMunicipalityFilter value={municipalityFilter} onChange={setMunicipalityFilter} />
      {/* Filter Bar */}
      <div
        style={{
          background: '#FFFFFF',
          padding: '1rem 1.25rem',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.875rem',
          alignItems: 'flex-end',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
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
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Source</label>
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
          >
            <option value="">All Sources</option>
            <option value="ALAB_APP">ALAB Mobile App</option>
            <option value="PHONE_CALL">Phone Call</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Fire Type</label>
          <select
            value={fireTypeFilter}
            onChange={(e) => { setFireTypeFilter(e.target.value); setPage(1); }}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
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
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: 'span 2' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Search</label>
          <input
            type="text"
            placeholder="Search reference, barangay, municipality, narrative..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {/* Reports Table */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 16px' }}>Reference</th>
                  <th style={{ padding: '10px 16px' }}>Municipality / Barangay</th>
                  <th style={{ padding: '10px 16px' }}>Source</th>
                  <th style={{ padding: '10px 16px' }}>Type / Severity</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 16px' }}>Submitted Time</th>
                  <th style={{ padding: '10px 16px' }}>Dispatches</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((rep) => (
                  <tr
                    key={rep.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                      {rep.referenceNumber}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{rep.municipalityName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{rep.barangay}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8125rem' }}>
                      <span style={{ padding: '2px 6px', background: '#F1F5F9', borderRadius: 4, fontWeight: 600, color: '#475569' }}>
                        {rep.reportSource === 'ALAB_APP' ? 'App' : 'Phone'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, color: '#1E293B' }}>{rep.fireType}</div>
                      <div style={{ marginTop: 2 }}>{getSeverityBadge(rep.severity)}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(rep.status)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>
                      {new Date(rep.submittedAt).toLocaleDateString()} {new Date(rep.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: '#64748B' }}>
                      {rep.latestDispatchSummary || 'No dispatch active'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedReportId(rep.id)}
                        style={{
                          background: '#E23632',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(226, 54, 50, 0.2)',
                        }}
                      >
                        View Report
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
