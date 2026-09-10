'use client';

import React, { useState, useEffect } from 'react';

export interface ManagementToolbarFilters {
  municipalityId?: string;
  stationId?: string;
  barangayId?: string;
  reportSource?: string;
  fireType?: string;
  severity?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}

interface ProvincialManagementToolbarProps {
  filters: ManagementToolbarFilters;
  onFilterChange: (filters: ManagementToolbarFilters) => void;
  statusOptions?: Array<{ label: string; value: string }>;
  dataset?: 'STATIONS' | 'PERSONNEL' | 'RESIDENTS' | 'APPLICATIONS' | 'FIRE_REPORTS' | 'REPORT_SUMMARY';
  placeholder?: string;
  exportOnly?: boolean;
}

export function ProvincialManagementToolbar({
  filters,
  onFilterChange,
  statusOptions,
  dataset,
  exportOnly = false,
  placeholder = 'Search records...',
}: ProvincialManagementToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportCsv = async () => {
    if (!dataset) return;
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ dataset });
      setExportError(null);
      for (const [key, value] of Object.entries(filters)) if (value && value !== 'ALL') params.set(key, value);
      const response = await fetch(`/api/provincial-bfp/export?${params}`, { cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Export failed. Please retry.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dataset.toLowerCase()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  if (exportOnly) return <div className="no-print" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end' }}>
    {exportError && <span role="alert" style={{ color: '#B91C1C' }}>{exportError}</span>}
    <button type="button" onClick={handleExportCsv} disabled={isExporting || !dataset} style={{ padding: '10px 16px', border: '1px solid #CBD5E1', borderRadius: 8, background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>
      {isExporting ? 'Exporting?' : 'Export CSV'}
    </button>
  </div>;

  return (
    <div
      style={{
        background: '#FFFFFF',
        padding: '1rem 1.25rem',
        borderRadius: 8,
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.875rem',
        alignItems: 'flex-end',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {exportError && <div role="alert" style={{ flexBasis: '100%', color: '#B91C1C' }}>{exportError}</div>}
      <ProvincialMunicipalityFilter value={filters.municipalityId || ''} onChange={value => onFilterChange({ ...filters, municipalityId: value })} />
      {/* Search Field */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 220px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Search</label>
        <input
          type="text"
          aria-label="Search records"
          placeholder={placeholder}
          value={filters.search || ''}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #CBD5E1',
            fontSize: '0.875rem',
            color: '#1E293B',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Status Selector if provided */}
      {statusOptions && statusOptions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Status</label>
          <select
            aria-label="Status"            value={filters.status || ''}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              fontSize: '0.875rem',
              color: '#1E293B',
              background: '#FFFFFF',
            }}
          >
            <option value="">All Statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date Range if needed */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>From</label>
          <input
            type="date" aria-label="From date"
            value={filters.from ? filters.from.slice(0, 10) : ''}
            onChange={(e) => onFilterChange({ ...filters, from: e.target.value ? e.target.value : undefined })}
            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8125rem' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>To</label>
          <input
            type="date" aria-label="To date"
            value={filters.to ? filters.to.slice(0, 10) : ''}
            onChange={(e) => onFilterChange({ ...filters, to: e.target.value ? e.target.value : undefined })}
            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8125rem' }}
          />
        </div>
      </div>

      {/* Export CSV Button */}
      {dataset && (
        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            style={{
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #CBD5E1',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: isExporting ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <span>📥</span> {isExporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      )}
    </div>
  );
}

export function ProvincialMunicipalityFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [municipalities, setMunicipalities] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/provincial-bfp/municipalities?pageSize=100&page=1', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(body => setMunicipalities(body.items || []))
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
    Municipality
    <select value={value} onChange={event => onChange(event.target.value)} style={{ padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.875rem', background: '#fff', maxWidth: '100%' }}>
      <option value="">All Municipalities</option>
      {value && !municipalities.some(item => item.id === value) && <option value={value}>Selected municipality</option>}
      {municipalities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
    {error && <span role="alert">Municipality choices unavailable. Reload to retry.</span>}
  </label>;
}

export function ProvincialManagementPagination({ page, pageSize, total, loading, setPage }: {
  page: number; pageSize: number; total: number; loading: boolean; setPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <nav aria-label="Record pages" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: '0.8125rem', color: '#475569' }}>
    <span aria-live="polite">{total ? `${(page - 1) * pageSize + 1}?${Math.min(page * pageSize, total)} of ${total}` : '0 records'}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button type="button" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button type="button" disabled={loading || page >= pages} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  </nav>;
}
