'use client';

import { ProvincialManagementToolbar } from './provincial-management-toolbar';
import React, { useState, useEffect, useRef } from 'react';
import { useProvincialManagementList } from './use-provincial-management-list';
import { ProvincialMunicipalityFilter, ProvincialManagementPagination } from './provincial-management-toolbar';
import { useManagementDialog } from './use-management-dialog';
import type { ManagedApplication } from '../../lib/provincial-bfp/management/types';

interface ApplicationReviewProps {
  initialMunicipalityId?: string;
}

export function ProvincialResidentApplicationReview({ initialMunicipalityId = '' }: ApplicationReviewProps) {
  const { items: applications, total, page, pageSize, setPage, loading, error, filters, setFilter, refresh: fetchApplications } = useProvincialManagementList<ManagedApplication>({ endpoint: '/api/provincial-bfp/resident-applications', initialFilters: { municipalityId: initialMunicipalityId } });
  const municipalityFilter = filters.municipalityId || '';
  const setMunicipalityFilter = (value: string) => setFilter('municipalityId', value);
  const statusFilter = filters.status || '';
  const setStatusFilter = (value: string) => setFilter('status', value);
  const search = filters.search || '';
  const setSearch = (value: string) => setFilter('search', value);

  // Review Dossier State
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<ManagedApplication | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);

  // Action states
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const detailController = useRef<AbortController | null>(null);
  const operation = useRef<{ payload: string; requestId: string } | null>(null);
  useEffect(() => () => detailController.current?.abort(), []);
  const operationId = (payload: string) => {
    if (operation.current?.payload !== payload) operation.current = { payload, requestId: crypto.randomUUID() };
    return operation.current.requestId;
  };
  const loadDossier = async (id: string) => {
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    setDossier(null);
    setSelectedAppId(id);
    setDossierLoading(true);
    setDossierError(null);
    setActionSuccess(null);
    setActionError(null);
    setCorrectionReason('');
    try {
      const res = await fetch(`/api/provincial-bfp/resident-applications/${id}`, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load application dossier');
      }
      const data = await res.json();
      if (!controller.signal.aborted) setDossier(data.application);
    } catch (err: unknown) {
      if (!controller.signal.aborted) setDossierError(err instanceof Error ? err.message : 'Error fetching application dossier');
    } finally {
      if (!controller.signal.aborted) setDossierLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!dossier) return;
    if (!window.confirm(`Are you sure you want to APPROVE ${dossier.firstName} ${dossier.lastName}'s resident application?`)) {
      return;
    }

    setIsApproving(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/provincial-bfp/resident-applications/${dossier.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedSubmissionNumber: dossier.submissionNumber,
          requestId: operationId(`${dossier.id}:${dossier.submissionNumber}:approve`),
          reason: 'Verified and approved by Provincial BFP Command',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Approval failed');
      }

      await loadDossier(dossier.id);
      setActionSuccess('Application approval saved.');
      fetchApplications();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to approve application');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRequestCorrections = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossier) return;
    if (correctionReason.trim().length < 10) {
      setActionError('Correction reason must be at least 10 characters detailing what needs to be changed.');
      return;
    }

    setIsRejecting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/provincial-bfp/resident-applications/${dossier.id}/request-corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedSubmissionNumber: dossier.submissionNumber,
          requestId: operationId(`${dossier.id}:${dossier.submissionNumber}:corrections:${correctionReason.trim()}`),
          message: correctionReason.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Requesting corrections failed');
      }

      await loadDossier(dossier.id);
      const deliveries = Array.isArray(data.delivery) ? data.delivery as Array<{ channel: string; status: string }> : [];
      setActionSuccess(`Correction request saved. ${deliveries.length ? deliveries.map(item => `${item.channel}: ${item.status.replaceAll('_', ' ').toLowerCase()}`).join('; ') : 'Notification delivery is unconfirmed.'}`);
      fetchApplications();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to request corrections');
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>PENDING REVIEW</span>;
      case 'VERIFIED':
        return <span style={{ background: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>VERIFIED</span>;
      case 'CHANGES_REQUESTED':
        return <span style={{ background: '#FFEDD5', color: '#9A3412', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>CHANGES REQUESTED</span>;
      default:
        return <span style={{ background: '#E2E8F0', color: '#475569', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>{status}</span>;
    }
  };

  useManagementDialog(!!selectedAppId, () => { setSelectedAppId(null); }, isApproving || isRejecting);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'inherit' }}>
      <ProvincialManagementToolbar exportOnly dataset="APPLICATIONS" filters={filters} onFilterChange={() => {}} />
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Resident Applications Review
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748B' }}>
            Provincial jurisdiction queue for reviewing, verifying, and requesting corrections on resident accounts across Antique.
          </p>
        </div>

        <button
          onClick={fetchApplications}
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
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          {loading ? 'Refreshing…' : '↻ Refresh Queue'}
        </button>
      </div>

<ProvincialMunicipalityFilter value={municipalityFilter} onChange={setMunicipalityFilter} />
      {/* Filter Controls */}
      <div
        style={{
          background: '#FFFFFF',
          padding: '1rem 1.25rem',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              fontSize: '0.875rem',
              color: '#1E293B',
              background: '#FFFFFF',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
            <option value="VERIFIED">Verified</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Search Applicant</label>
          <input
            type="text"
            placeholder="Search by name, reference, email, or phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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

        <div style={{ alignSelf: 'flex-end', paddingBottom: 6 }}>
          <span style={{ fontSize: '0.875rem', color: '#64748B' }}>
            Showing <strong>{applications.length}</strong> of <strong>{total}</strong> applications
          </span>
        </div>
      </div>

      {/* Main Table */}
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
          <div style={{ padding: '1rem', background: '#FEE2E2', color: '#991B1B', fontSize: '0.875rem', borderBottom: '1px solid #FCA5A5' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B', fontSize: '0.875rem' }}>
            Loading resident verification queue…
          </div>
        ) : applications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B', fontSize: '0.875rem' }}>
            No resident applications found matching the current filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 16px' }}>Reference</th>
                  <th style={{ padding: '10px 16px' }}>Applicant</th>
                  <th style={{ padding: '10px 16px' }}>Municipality / Barangay</th>
                  <th style={{ padding: '10px 16px' }}>Subm #</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 16px' }}>Submitted At</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: selectedAppId === app.id ? '#EFF6FF' : '#FFFFFF',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>
                      {app.reference}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{app.firstName} {app.lastName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{app.email} · {app.phone}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, color: '#334155' }}>{app.municipalityName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{app.barangayName}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>
                      v{app.submissionNumber}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(app.status)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>
                      {new Date(app.submittedAt).toLocaleDateString()} {new Date(app.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => loadDossier(app.id)}
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
                        Review Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProvincialManagementPagination page={page} pageSize={pageSize} total={total} loading={loading} setPage={setPage} />

      {/* Review Dossier Drawer / Modal */}
      {selectedAppId && (
        <div data-management-dialog
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 700,
              background: '#FFFFFF',
              height: '100%',
              overflowY: 'auto',
              padding: '2rem',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            }}
          >
            {/* Dossier Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E23632', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PROVINCIAL VERIFICATION DOSSIER
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                  {dossier ? `${dossier.firstName} ${dossier.lastName}` : 'Loading…'}
                </h2>
                {dossier && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#64748B' }}>{dossier.reference}</span>
                    {getStatusBadge(dossier.status)}
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Submission #{dossier.submissionNumber}</span>
                  </div>
                )}
              </div>
              <button
                aria-label="Close application" disabled={isApproving || isRejecting} onClick={() => setSelectedAppId(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            {/* Dossier Body */}
            {dossierLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>Loading application evidence and audit logs…</div>
            ) : dossierError ? (
              <div style={{ padding: '1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 6 }}>{dossierError}</div>
            ) : dossier ? (
              <>
                {/* Alerts */}
                {actionSuccess && (
                  <div style={{ padding: '12px 16px', background: '#D1FAE5', color: '#065F46', borderRadius: 6, fontSize: '0.875rem', fontWeight: 600 }}>
                    ✓ {actionSuccess}
                  </div>
                )}
                {actionError && (
                  <div style={{ padding: '12px 16px', background: '#FEE2E2', color: '#991B1B', borderRadius: 6, fontSize: '0.875rem', fontWeight: 600 }}>
                    ⚠ {actionError}
                  </div>
                )}

                {/* Resident Details */}
                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 8, border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>MUNICIPALITY</div>
                    <div style={{ fontWeight: 700, color: '#1E293B' }}>{dossier.municipalityName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>BARANGAY</div>
                    <div style={{ fontWeight: 700, color: '#1E293B' }}>{dossier.barangayName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>CONTACT NUMBER</div>
                    <div style={{ color: '#1E293B' }}>{dossier.phone}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>EMAIL ADDRESS</div>
                    <div style={{ color: '#1E293B' }}>{dossier.email}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>FULL RESIDENTIAL ADDRESS</div>
                    <div style={{ color: '#1E293B' }}>{dossier.address}</div>
                  </div>
                </div>

                {/* Government ID & Selfie Evidence */}
                <div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
                    Identity Verification Evidence
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    {/* Front ID */}
                    <div style={{ border: '1px solid #CBD5E1', borderRadius: 6, overflow: 'hidden', background: '#F8FAFC' }}>
                      <div style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, background: '#E2E8F0', color: '#334155' }}>Front Government ID</div>
                      {dossier.evidence?.frontUrl ? (
                        <a href={dossier.evidence.frontUrl} target="_blank" rel="noopener noreferrer">
                          <img src={dossier.evidence.frontUrl} alt="Front ID" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                        </a>
                      ) : (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem' }}>No document uploaded</div>
                      )}
                    </div>

                    {/* Back ID */}
                    <div style={{ border: '1px solid #CBD5E1', borderRadius: 6, overflow: 'hidden', background: '#F8FAFC' }}>
                      <div style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, background: '#E2E8F0', color: '#334155' }}>Back Government ID</div>
                      {dossier.evidence?.backUrl ? (
                        <a href={dossier.evidence.backUrl} target="_blank" rel="noopener noreferrer">
                          <img src={dossier.evidence.backUrl} alt="Back ID" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                        </a>
                      ) : (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem' }}>No document uploaded</div>
                      )}
                    </div>

                    {/* Selfie */}
                    <div style={{ border: '1px solid #CBD5E1', borderRadius: 6, overflow: 'hidden', background: '#F8FAFC' }}>
                      <div style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, background: '#E2E8F0', color: '#334155' }}>Selfie with ID</div>
                      {dossier.evidence?.selfieUrl ? (
                        <a href={dossier.evidence.selfieUrl} target="_blank" rel="noopener noreferrer">
                          <img src={dossier.evidence.selfieUrl} alt="Selfie" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                        </a>
                      ) : (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem' }}>No selfie uploaded</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification History / Events */}
                {dossier.events && dossier.events.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                      Verification History
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 150, overflowY: 'auto' }}>
                      {dossier.events.map((ev, idx) => (
                        <div key={idx} style={{ padding: '6px 10px', background: '#F8FAFC', borderRadius: 4, border: '1px solid #E2E8F0', fontSize: '0.75rem' }}>
                          <span style={{ fontWeight: 700, color: '#334155' }}>{ev.eventType}</span> · <span style={{ color: '#64748B' }}>{new Date(ev.createdAt).toLocaleString()}</span>
                          {ev.notes && <div style={{ color: '#475569', marginTop: 2 }}>{ev.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Actions */}
                {dossier.status === 'PENDING' ? (
                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Review Actions</h3>

                    {/* Approve Button */}
                    <div>
                      <button
                        onClick={handleApprove}
                        disabled={isApproving || isRejecting}
                        style={{
                          width: '100%',
                          background: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '10px 16px',
                          borderRadius: 6,
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          cursor: isApproving ? 'wait' : 'pointer',
                          boxShadow: '0 1px 3px rgba(5, 150, 105, 0.3)',
                        }}
                      >
                        {isApproving ? 'Verifying & Approving…' : '✓ Approve Resident Application'}
                      </button>
                    </div>

                    <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 700 }}>OR</div>

                    {/* Request Corrections Form */}
                    <form onSubmit={handleRequestCorrections} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
                        Request Corrections from Resident
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Detail specifically what needs clarification or re-upload (e.g., 'The ID photo is blurry and illegible. Please upload a clear photo of your primary ID')..."
                        value={correctionReason}
                        onChange={(e) => setCorrectionReason(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.875rem',
                          color: '#1E293B',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={isApproving || isRejecting || correctionReason.trim().length < 10}
                        style={{
                          background: correctionReason.trim().length >= 10 ? '#D97706' : '#94A3B8',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '10px 16px',
                          borderRadius: 6,
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          cursor: isRejecting ? 'wait' : 'pointer',
                        }}
                      >
                        {isRejecting ? 'Sending Correction Notice…' : 'Request Corrections'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem', color: '#64748B', fontSize: '0.875rem' }}>
                    This application has already been processed as <strong>{dossier.status}</strong>.
                    {dossier.correctionReason && (
                      <div style={{ marginTop: 6, padding: '8px 12px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 6, color: '#C2410C' }}>
                        <strong>Reason:</strong> {dossier.correctionReason}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
