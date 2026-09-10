'use client';

import { ProvincialManagementToolbar } from './provincial-management-toolbar';
import { useManagementMutation } from './use-management-mutation';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProvincialManagementList } from './use-provincial-management-list';
import { useManagementDialog } from './use-management-dialog';
import type { ManagedResident } from '../../lib/provincial-bfp/management/types';

export function ProvincialResidentDirectory() {
  const mutate = useManagementMutation();
  const { items: residents, total, loading, error, page, pageSize, setPage, filters, setFilter, refresh: fetchResidents } = useProvincialManagementList<ManagedResident>({ endpoint: '/api/provincial-bfp/residents' });
  const municipalityId = filters.municipalityId || '';
  const setMunicipalityId = (value: string) => setFilter('municipalityId', value);
  const status = filters.status || '';
  const setStatus = (value: string) => setFilter('status', value);
  const search = filters.search || '';
  const setSearch = (value: string) => setFilter('search', value);

  const [municipalities, setMunicipalities] = useState<Array<{ id: string; name: string }>>([]);

  // Modals & Drawer
  const [selectedResident, setSelectedResident] = useState<ManagedResident | null>(null);
  const [editingResident, setEditingResident] = useState<ManagedResident | null>(null);
  const [suspendingResident, setSuspendingResident] = useState<ManagedResident | null>(null);
  const [reactivatingResident, setReactivatingResident] = useState<ManagedResident | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit address state
  const [editAddress, setEditAddress] = useState('');
  const [editSitio, setEditSitio] = useState('');
  const [editLandmark, setEditLandmark] = useState('');

  useEffect(() => {
    fetch('/api/provincial-bfp/municipalities?pageSize=100&page=1')
      .then((res) => res.json())
      .then((data) => setMunicipalities(data.items || []))
      .catch(() => {});
  }, []);

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResident) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/residents/${editingResident.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': editingResident.updatedAt,
        },
        body: JSON.stringify({
          action: 'UPDATE_ADMINISTRATIVE_DETAILS',
          completeAddress: editAddress,
          sitioOrPurok: editSitio,
          nearbyLandmark: editLandmark,
          expectedVersion: editingResident.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update address');
      setEditingResident(null);
      fetchResidents();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error updating address');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendingResident) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/residents/${suspendingResident.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': suspendingResident.updatedAt,
        },
        body: JSON.stringify({
          action: 'SUSPEND',
          reason: actionReason,
          expectedVersion: suspendingResident.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to suspend account');
      setSuspendingResident(null);
      setActionReason('');
      fetchResidents();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error suspending account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    if (!reactivatingResident) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/residents/${reactivatingResident.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': reactivatingResident.updatedAt,
        },
        body: JSON.stringify({
          action: 'REACTIVATE',
          reason: actionReason,
          expectedVersion: reactivatingResident.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'CANNOT_ACTIVATE_UNVERIFIED_RESIDENT') {
          throw new Error('Cannot reactivate an unverified resident. Resident must have an approved application.');
        }
        throw new Error(data.error || 'Failed to reactivate account');
      }
      setReactivatingResident(null);
      setActionReason('');
      fetchResidents();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error reactivating account');
    } finally {
      setSubmitting(false);
    }
  };

  useManagementDialog(!!(selectedResident || editingResident || suspendingResident || reactivatingResident), () => { setSelectedResident(null); setEditingResident(null); setSuspendingResident(null); setReactivatingResident(null); }, submitting);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ProvincialManagementToolbar exportOnly dataset="RESIDENTS" filters={filters} onFilterChange={() => {}} />
      {/* Header Hub */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            <i className="fa-solid fa-users" style={{ color: '#E23632', marginRight: '0.6rem' }} />
            Registered Residents Directory
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.2rem 0 0' }}>
            Comprehensive directory of resident citizen accounts, verified addresses, and identity statuses across Antique.
          </p>
        </div>
      </div>

      {/* Toolbar Box */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          padding: '0.85rem 1.2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.8rem',
          flexWrap: 'wrap',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Municipality Select */}
          <select
            value={municipalityId}
            onChange={(e) => {
              setMunicipalityId(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.45rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#0F172A',
              background: '#F8FAFC',
            }}
          >
            <option value="">All Municipalities</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.45rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#0F172A',
              background: '#F8FAFC',
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Account: Active</option>
            <option value="SUSPENDED">Account: Suspended</option>
            <option value="VERIFIED">App: Verified</option>
            <option value="PENDING">App: Pending</option>
            <option value="CHANGES_REQUESTED">App: Needs Correction</option>
            <option value="NO_APPLICATION">App: No Application</option>
          </select>

          {(municipalityId || status || search) && (
            <button
              type="button"
              onClick={() => {
                setMunicipalityId('');
                setStatus('');
                setSearch('');
                setPage(1);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#E23632',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '999px',
            padding: '0.4rem 0.9rem',
            width: '260px',
          }}
        >
          <i className="fa-solid fa-magnifying-glass" style={{ color: '#94A3B8', fontSize: '0.8rem' }} />
          <input
            type="text"
            placeholder="Search name, phone, email, ref..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.78rem',
              width: '100%',
              color: '#0F172A',
              fontWeight: 600,
            }}
          />
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div style={{ background: '#FFF1F2', border: '1px solid #FFE4E6', borderRadius: '12px', padding: '1rem', color: '#E23632', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />{error}</span>
          <button type="button" onClick={() => fetchResidents()} style={{ background: '#E23632', color: '#FFF', border: 'none', borderRadius: '8px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
        </div>
      )}

      {/* Residents Table */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          overflowX: 'auto',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '0.9rem 1.25rem' }}>RESIDENT NAME</th>
              <th style={{ padding: '0.9rem 1rem' }}>CONTACT INFO</th>
              <th style={{ padding: '0.9rem 1rem' }}>MUNICIPALITY & BARANGAY</th>
              <th style={{ padding: '0.9rem 1rem' }}>ACCOUNT STATUS</th>
              <th style={{ padding: '0.9rem 1rem' }}>APPLICATION STATUS</th>
              <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading && residents.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td colSpan={6} style={{ padding: '1.2rem', textAlign: 'center', color: '#94A3B8' }}>
                    Loading resident directory…
                  </td>
                </tr>
              ))
            ) : residents.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
                  <i className="fa-solid fa-users" style={{ fontSize: '2.5rem', color: '#CBD5E1', marginBottom: '0.5rem', display: 'block' }} />
                  <strong style={{ display: 'block', color: '#0F172A', fontSize: '1rem' }}>No resident records found</strong>
                  <span style={{ fontSize: '0.8rem' }}>Try changing municipality or status filters.</span>
                </td>
              </tr>
            ) : (
              residents.map((r) => (
                <tr key={r.userId} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '0.9rem 1.25rem' }}>
                    <div style={{ fontWeight: 800, color: '#0F172A' }}>{r.firstName} {r.lastName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>@{r.username}</div>
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    <div style={{ color: '#0F172A', fontWeight: 600 }}>{r.phone}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{r.email}</div>
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>
                      {r.municipalityName || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Unassigned</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{r.barangayName || 'No barangay'}</div>
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    {r.accountStatus === 'ACTIVE' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#ECFDF5', color: '#059669', padding: '0.2rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} /> ACTIVE
                      </span>
                    ) : r.accountStatus === 'SUSPENDED' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#FFF1F2', color: '#E23632', padding: '0.2rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E23632' }} /> SUSPENDED
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#FFFBEB', color: '#D97706', padding: '0.2rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706' }} /> PENDING REVIEW
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    {r.latestApplicationStatus === 'VERIFIED' ? (
                      <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #D1FAE5', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>
                        VERIFIED
                      </span>
                    ) : r.latestApplicationStatus === 'PENDING' ? (
                      <Link
                        href={`/provincial-bfp/resident-applications?search=${r.latestApplicationReference || ''}`}
                        style={{ background: '#FFFBEB', color: '#D97706', border: '1px solid #FEF3C7', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textDecoration: 'none' }}
                      >
                        PENDING REVIEW
                      </Link>
                    ) : r.latestApplicationStatus === 'CHANGES_REQUESTED' ? (
                      <span style={{ background: '#FFF1F2', color: '#E23632', border: '1px solid #FFE4E6', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                        CORRECTIONS
                      </span>
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: '0.72rem', fontStyle: 'italic' }}>None submitted</span>
                    )}
                  </td>
                  <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedResident(r)}
                        style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0.3rem 0.55rem', color: '#334155', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        title="View profile details"
                      >
                        <i className="fa-solid fa-eye" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingResident(r);
                          setEditAddress(r.completeAddress || '');
                          setEditSitio('');
                          setEditLandmark('');
                        }}
                        style={{ background: '#EFF6FF', border: '1px solid #BFD7FE', borderRadius: '6px', padding: '0.3rem 0.55rem', color: '#2563EB', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        disabled={!r.municipalityId}
                        title={r.municipalityId ? "Edit address" : "Municipality assignment required"}
                      >
                        <i className="fa-solid fa-location-dot" />
                      </button>
                      {r.accountStatus === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={() => setSuspendingResident(r)}
                          style={{ background: '#FFF1F2', border: '1px solid #FFE4E6', borderRadius: '6px', padding: '0.3rem 0.55rem', color: '#E23632', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                          disabled={!r.municipalityId}
                          title="Suspend account"
                        >
                          <i className="fa-solid fa-ban" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReactivatingResident(r)}
                          style={{ background: '#ECFDF5', border: '1px solid #D1FAE5', borderRadius: '6px', padding: '0.3rem 0.55rem', color: '#059669', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                          disabled={!r.municipalityId || r.latestApplicationStatus !== "VERIFIED"}
                          title="Reactivate verified account"
                        >
                          <i className="fa-solid fa-check" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div style={{ padding: '0.85rem 1.25rem', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748B' }}>
          <span>Showing <strong>{residents.length}</strong> of <strong>{total}</strong> residents</span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
              style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Profile Detail Drawer / Modal */}
      {selectedResident && (
        <div data-management-dialog style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#FFF', borderRadius: '20px', maxWidth: '540px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>{selectedResident.firstName} {selectedResident.lastName}</h3>
                <span style={{ fontSize: '0.74rem', color: '#64748B' }}>@{selectedResident.username} · Registered {new Date(selectedResident.createdAt).toLocaleDateString()}</span>
              </div>
              <button type="button" onClick={() => setSelectedResident(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Phone Number</label>
                  <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>{selectedResident.phone}</strong>
                </div>
                <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Email Address</label>
                  <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>{selectedResident.email}</strong>
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Primary Registered Address</label>
                <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>{selectedResident.completeAddress || 'Not recorded'}</strong>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.2rem' }}>
                  {selectedResident.barangayName}, {selectedResident.municipalityName}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Account Access Status</label>
                  <strong style={{ fontSize: '0.9rem', color: selectedResident.accountStatus === 'ACTIVE' ? '#059669' : '#E23632' }}>{selectedResident.accountStatus}</strong>
                </div>
                <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Application State</label>
                  <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>{selectedResident.latestApplicationStatus}</strong>
                </div>
              </div>
              {selectedResident.latestApplicationReference && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFBEB', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #FEF3C7' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#D97706' }}>Identity Verification Dossier</span>
                    <strong style={{ fontSize: '0.85rem', color: '#B45309' }}>{selectedResident.latestApplicationReference}</strong>
                  </div>
                  <Link
                    href={`/provincial-bfp/resident-applications?search=${selectedResident.latestApplicationReference}`}
                    style={{ background: '#D97706', color: '#FFF', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}
                  >
                    Open Review
                  </Link>
                </div>
              )}
            </div>
            <div style={{ padding: '1.1rem 1.5rem', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setSelectedResident(null)} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Address Modal */}
      {editingResident && (
        <div data-management-dialog style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#FFF', borderRadius: '20px', maxWidth: '480px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>Correct Address Details</h3>
              <button type="button" onClick={() => setEditingResident(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
            </div>
            <form onSubmit={handleUpdateAddress} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                Resident: <strong>{editingResident.firstName} {editingResident.lastName}</strong> ({editingResident.barangayName}, {editingResident.municipalityName})
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Complete Street Address</label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Sitio / Purok (Optional)</label>
                <input
                  type="text"
                  value={editSitio}
                  onChange={(e) => setEditSitio(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Nearby Landmark (Optional)</label>
                <input
                  type="text"
                  value={editLandmark}
                  onChange={(e) => setEditLandmark(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditingResident(null)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>{submitting ? 'Saving…' : 'Save Correction'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Resident Modal */}
      {suspendingResident && (
        <div data-management-dialog style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#FFF', borderRadius: '20px', maxWidth: '480px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#FFF1F2', borderBottom: '1px solid #FFE4E6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#E23632' }}>Suspend Resident Account</h3>
              <button type="button" onClick={() => setSuspendingResident(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>
                Suspending <strong>{suspendingResident.firstName} {suspendingResident.lastName}</strong> will immediately disable login and refuse further citizen app reports.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Mandatory Suspension Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the administrative reason for account suspension..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setSuspendingResident(null)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Cancel</button>
                <button
                  type="button"
                  disabled={submitting || !actionReason.trim()}
                  onClick={handleSuspend}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: '#E23632', color: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                >
                  {submitting ? 'Suspending…' : 'Confirm Suspension'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Resident Modal */}
      {reactivatingResident && (
        <div data-management-dialog style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#FFF', borderRadius: '20px', maxWidth: '480px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#ECFDF5', borderBottom: '1px solid #D1FAE5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>Reactivate Resident Account</h3>
              <button type="button" onClick={() => setReactivatingResident(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>
                Restoring active account access for <strong>{reactivatingResident.firstName} {reactivatingResident.lastName}</strong>.
                Note: Reactivation requires that the resident has an approved identity verification.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Mandatory Reactivation Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the reason for restoring access..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setReactivatingResident(null)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Cancel</button>
                <button
                  type="button"
                  disabled={submitting || !actionReason.trim()}
                  onClick={handleReactivate}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: '#059669', color: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                >
                  {submitting ? 'Reactivating…' : 'Confirm Reactivation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
