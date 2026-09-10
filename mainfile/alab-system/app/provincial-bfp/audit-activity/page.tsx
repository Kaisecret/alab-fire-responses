'use client';

import React from 'react';
import { useProvincialManagementList } from '../../_components/use-provincial-management-list';
import { ProvincialManagementPagination } from '../../_components/provincial-management-toolbar';
import type { ProvincialAuditEvent } from '../../../lib/provincial-bfp/management/audit';

export default function AuditActivityPage() {
  const { items: events, total, page, pageSize, setPage, filters, setFilter, loading, error, refresh: fetchEvents } = useProvincialManagementList<ProvincialAuditEvent>({ endpoint: '/api/provincial-bfp/audit-events' });
  const search = filters.search || '';
  const setSearch = (value: string) => setFilter('search', value);

  return (
    <div style={{ padding: '1.5rem 1.75rem 3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#E23632' }}>✦</span> Provincial System Audit & Security Activity Logs
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748B' }}>
            Immutable event logs of administrative actions, personnel transfers, station edits, and verification decisions across Antique.
          </p>
        </div>

        <button
          onClick={fetchEvents}
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
          {loading ? 'Refreshing…' : '↻ Refresh Logs'}
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          background: '#FFFFFF',
          padding: '1rem 1.25rem',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Search audit action, target, officer, or reason..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ fontSize: '0.875rem', color: '#64748B' }}>
          Total logged events: <strong>{total}</strong>
        </div>
      </div>

      {/* Audit Table */}
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
            Loading audit activity records…
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B', fontSize: '0.875rem' }}>
            No audit records found matching the search criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 16px' }}>Action</th>
                  <th style={{ padding: '10px 16px' }}>Target Type & ID</th>
                  <th style={{ padding: '10px 16px' }}>Municipality</th>
                  <th style={{ padding: '10px 16px' }}>Officer / Actor</th>
                  <th style={{ padding: '10px 16px' }}>Reason / Notes</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          background: '#F1F5F9',
                          color: '#0F172A',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                        }}
                      >
                        {ev.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{ev.targetType}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>
                        {ev.targetId.slice(0, 13)}…
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {ev.targetMunicipalityName || 'Antique Province'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{ev.actorName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{ev.actorRole}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', maxWidth: 280, fontSize: '0.8125rem' }}>
                      {ev.reason || 'No specific rationale supplied'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748B', whiteSpace: 'nowrap' }}>
                      {new Date(ev.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ProvincialManagementPagination page={page} pageSize={pageSize} total={total} loading={loading} setPage={setPage} />
    </div>
  );
}
