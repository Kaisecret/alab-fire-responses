'use client';

import { ProvincialManagementToolbar } from './provincial-management-toolbar';
import { useManagementMutation } from './use-management-mutation';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProvincialManagementList } from './use-provincial-management-list';
import { useManagementDialog } from './use-management-dialog';
import type { ManagedPersonnel } from '../../lib/provincial-bfp/management/types';

export function ProvincialPersonnelDirectory() {
  const mutate = useManagementMutation();
  const { items: personnel, total, loading, error, page, pageSize, setPage, filters, setFilter, refresh: fetchPersonnel } = useProvincialManagementList<ManagedPersonnel>({ endpoint: '/api/provincial-bfp/personnel' });
  const municipalityId = filters.municipalityId || '';
  const setMunicipalityId = (value: string) => setFilter('municipalityId', value);
  const status = filters.status || '';
  const setStatus = (value: string) => setFilter('status', value);
  const search = filters.search || '';
  const setSearch = (value: string) => setFilter('search', value);
  const stationId = filters.stationId || '';
  const setStationId = (value: string) => setFilter('stationId', value);

  // Reference lists
  const [municipalities, setMunicipalities] = useState<Array<{ id: string; name: string }>>([]);
  const [stations, setStations] = useState<Array<{ id: string; stationName: string; municipalityId: string }>>([]);

  // Modals
  const [isCreating, setIsCreating] = useState(false);
  const [editingPerson, setEditingPerson] = useState<ManagedPersonnel | null>(null);
  const [transferringPerson, setTransferringPerson] = useState<ManagedPersonnel | null>(null);
  const [assigningStationPerson, setAssigningStationPerson] = useState<ManagedPersonnel | null>(null);
  const [suspendingPerson, setSuspendingPerson] = useState<ManagedPersonnel | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [newPerson, setNewPerson] = useState({
    email: '',
    displayName: '',
    rankOrPosition: 'Fire Officer 1',
    municipalityId: municipalityId,
    stationId: '',
    assignmentRole: 'MUNICIPAL_STAFF' as 'MUNICIPAL_ADMIN' | 'MUNICIPAL_STAFF',
    temporaryPassword: '',
  });

  // Transfer state
  const [transferState, setTransferState] = useState({
    municipalityId: '',
    stationId: '',
    assignmentRole: 'MUNICIPAL_STAFF' as 'MUNICIPAL_ADMIN' | 'MUNICIPAL_STAFF',
    reason: '',
  });

  // Assign station state
  const [targetStationId, setTargetStationId] = useState('');

  // Load municipalities & stations
  useEffect(() => {
    fetch('/api/provincial-bfp/municipalities?pageSize=100&page=1')
      .then((res) => res.json())
      .then((data) => setMunicipalities(data.items || []))
      .catch(() => {});

    fetch('/api/provincial-bfp/stations?pageSize=100&page=1')
      .then((res) => res.json())
      .then((data) => setStations(data.items || []))
      .catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate('/api/provincial-bfp/personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPerson),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create personnel');
      setIsCreating(false);
      setNewPerson({
        email: '',
        displayName: '',
        rankOrPosition: 'Fire Officer 1',
        municipalityId: '',
        stationId: '',
        assignmentRole: 'MUNICIPAL_STAFF',
        temporaryPassword: '',
      });
      fetchPersonnel();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error creating personnel');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/personnel/${editingPerson.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': editingPerson.updatedAt,
        },
        body: JSON.stringify({
          action: 'UPDATE',
          displayName: editingPerson.displayName,
          rankOrPosition: editingPerson.rankOrPosition ?? '',
          expectedVersion: editingPerson.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      setEditingPerson(null);
      fetchPersonnel();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error updating profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningStationPerson) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/personnel/${assigningStationPerson.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': assigningStationPerson.updatedAt,
        },
        body: JSON.stringify({
          action: 'ASSIGN_STATION',
          stationId: targetStationId || null,
          expectedVersion: assigningStationPerson.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign station');
      setAssigningStationPerson(null);
      setTargetStationId('');
      fetchPersonnel();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error assigning station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringPerson) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/personnel/${transferringPerson.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': transferringPerson.updatedAt,
        },
        body: JSON.stringify({
          action: 'TRANSFER_MUNICIPALITY',
          municipalityId: transferState.municipalityId,
          stationId: transferState.stationId || null,
          assignmentRole: transferState.assignmentRole,
          reason: transferState.reason,
          expectedVersion: transferringPerson.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to transfer personnel');
      setTransferringPerson(null);
      fetchPersonnel();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error transferring personnel');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendingPerson) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/personnel/${suspendingPerson.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': suspendingPerson.updatedAt,
        },
        body: JSON.stringify({
          action: 'SUSPEND',
          reason: suspensionReason,
          expectedVersion: suspendingPerson.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to suspend account');
      setSuspendingPerson(null);
      setSuspensionReason('');
      fetchPersonnel();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error suspending account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (person: ManagedPersonnel) => {
    try {
      setSubmitting(true);
      const res = await mutate(`/api/provincial-bfp/personnel/${person.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': person.updatedAt,
        },
        body: JSON.stringify({
          action: 'REACTIVATE',
          expectedVersion: person.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reactivate account');
      fetchPersonnel();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error reactivating account');
    } finally {
      setSubmitting(false);
    }
  };

  useManagementDialog(!!(isCreating || editingPerson || transferringPerson || assigningStationPerson || suspendingPerson), () => { setIsCreating(false); setEditingPerson(null); setTransferringPerson(null); setAssigningStationPerson(null); setSuspendingPerson(null); }, submitting);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ProvincialManagementToolbar exportOnly dataset="PERSONNEL" filters={filters} onFilterChange={() => {}} />
      {/* Header Hub */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            <i className="fa-solid fa-user-shield" style={{ color: '#E23632', marginRight: '0.6rem' }} />
            Municipal BFP Personnel Registry
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.2rem 0 0' }}>
            Authoritative roster of all municipal BFP administrators, station firefighters, and operational personnel across Antique.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.15rem',
              background: '#E23632',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(226, 54, 50, 0.25)',
            }}
          >
            <i className="fa-solid fa-user-plus" /> Provision Personnel
          </button>
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
          {/* Municipality select */}
          <select
            value={municipalityId}
            onChange={(e) => {
              setMunicipalityId(e.target.value);
              setStationId('');
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

          {/* Station select */}
          <select
            value={stationId}
            onChange={(e) => {
              setStationId(e.target.value);
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
            <option value="">All Stations</option>
            {stations
              .filter((s) => !municipalityId || s.municipalityId === municipalityId)
              .map((s) => (
                <option key={s.id} value={s.id}>{s.stationName}</option>
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
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>

          {(municipalityId || stationId || status || search) && (
            <button
              type="button"
              onClick={() => {
                setMunicipalityId('');
                setStationId('');
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

        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '999px',
            padding: '0.4rem 0.9rem',
            width: '250px',
          }}
        >
          <i className="fa-solid fa-magnifying-glass" style={{ color: '#94A3B8', fontSize: '0.8rem' }} />
          <input
            type="text"
            placeholder="Search name, rank, email..."
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
          <button type="button" onClick={() => fetchPersonnel()} style={{ background: '#E23632', color: '#FFF', border: 'none', borderRadius: '8px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
        </div>
      )}

      {/* Personnel Table */}
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
              <th style={{ padding: '0.9rem 1.25rem' }}>OFFICER / STAFF</th>
              <th style={{ padding: '0.9rem 1rem' }}>RANK & POSITION</th>
              <th style={{ padding: '0.9rem 1rem' }}>MUNICIPALITY</th>
              <th style={{ padding: '0.9rem 1rem' }}>ASSIGNED STATION</th>
              <th style={{ padding: '0.9rem 1rem' }}>ROLE</th>
              <th style={{ padding: '0.9rem 1rem' }}>ACCOUNT</th>
              <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading && personnel.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td colSpan={7} style={{ padding: '1.2rem', textAlign: 'center', color: '#94A3B8' }}>
                    Loading personnel directory…
                  </td>
                </tr>
              ))
            ) : personnel.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
                  <i className="fa-solid fa-users" style={{ fontSize: '2.5rem', color: '#CBD5E1', marginBottom: '0.5rem', display: 'block' }} />
                  <strong style={{ display: 'block', color: '#0F172A', fontSize: '1rem' }}>No personnel records found</strong>
                  <span style={{ fontSize: '0.8rem' }}>Try clearing filters or search term.</span>
                </td>
              </tr>
            ) : (
              personnel.map((p) => (
                <tr key={p.userId} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '0.9rem 1.25rem' }}>
                    <div style={{ fontWeight: 800, color: '#0F172A' }}>{p.displayName}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{p.email}</div>
                  </td>
                  <td style={{ padding: '0.9rem 1rem', color: '#334155', fontWeight: 600 }}>
                    {p.rankOrPosition || '—'}
                  </td>
                  <td style={{ padding: '0.9rem 1rem', color: '#0F172A', fontWeight: 700 }}>
                    {p.municipalityName || <span style={{ color: '#94A3B8' }}>Unassigned</span>}
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    {p.stationName ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 600, color: '#334155' }}>
                        <i className="fa-solid fa-building" style={{ fontSize: '0.7rem', color: '#64748B' }} />
                        {p.stationName}
                      </span>
                    ) : (
                      <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No station assigned</span>
                    )}
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    {p.assignmentRole === 'MUNICIPAL_ADMIN' ? (
                      <span style={{ background: '#FFFBEB', color: '#D97706', border: '1px solid #FEF3C7', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>
                        ADMIN
                      </span>
                    ) : (
                      <span style={{ background: '#F1F5F9', color: '#475569', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                        STAFF
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    {p.accountStatus === 'ACTIVE' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#ECFDF5', color: '#059669', padding: '0.2rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} /> ACTIVE
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#FFF1F2', color: '#E23632', padding: '0.2rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E23632' }} /> SUSPENDED
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setEditingPerson(p)}
                        style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0.3rem 0.55rem', color: '#334155', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        title="Edit profile"
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAssigningStationPerson(p);
                          setTargetStationId(p.stationId || '');
                        }}
                        style={{ background: '#EFF6FF', border: '1px solid #BFD7FE', borderRadius: '6px', padding: '0.3rem 0.55rem', color: '#2563EB', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        title="Assign station"
                      >
                        <i className="fa-solid fa-building-circle-check" /> Station
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTransferringPerson(p);
                          setTransferState({
                            municipalityId: p.municipalityId || '',
                            stationId: '',
                            assignmentRole: p.assignmentRole || 'MUNICIPAL_STAFF',
                            reason: '',
                          });
                        }}
                        style={{ background: '#F0E8FF', border: '1px solid #D5C4FE', borderRadius: '6px', padding: '0.3rem 0.55rem', color: '#7C3AED', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        title="Transfer municipality"
                      >
                        <i className="fa-solid fa-right-left" /> Transfer
                      </button>
                      {p.accountStatus === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={() => setSuspendingPerson(p)}
                          style={{ background: '#FFF1F2', border: '1px solid #FFE4E6', borderRadius: '6px', padding: '0.3rem 0.55rem', color: '#E23632', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                          title="Suspend account"
                        >
                          <i className="fa-solid fa-ban" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReactivate(p)}
                          style={{ background: '#ECFDF5', border: '1px solid #D1FAE5', borderRadius: '6px', padding: '0.3rem 0.55rem', color: '#059669', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                          title="Reactivate account"
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
          <span>Showing <strong>{personnel.length}</strong> of <strong>{total}</strong> personnel</span>
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

      {/* Provision Personnel Modal */}
      {isCreating && (
        <div data-management-dialog style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#FFF', borderRadius: '20px', maxWidth: '520px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>Provision BFP Officer / Staff</h3>
              <button type="button" onClick={() => setIsCreating(false)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Official Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Roberto Ramos"
                    value={newPerson.displayName}
                    onChange={(e) => setNewPerson({ ...newPerson, displayName: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Official Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. r.ramos@bfp.gov.ph"
                    value={newPerson.email}
                    onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Rank or Position</label>
                  <input
                    type="text"
                    placeholder="e.g. SFO1 / Driver"
                    value={newPerson.rankOrPosition}
                    onChange={(e) => setNewPerson({ ...newPerson, rankOrPosition: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', fontWeight: 700 }}>
                  Temporary password
                  <input type="password" autoComplete="new-password" required minLength={12} value={newPerson.temporaryPassword}
                    onChange={event => setNewPerson({ ...newPerson, temporaryPassword: event.target.value })}
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid #CBD5E1', borderRadius: 8, marginTop: 5 }} />
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 400, marginTop: 4 }}>Use at least 12 characters. Share it securely with the officer; they must change it at sign-in.</span>
                </label>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Role Assignment</label>
                  <select
                    value={newPerson.assignmentRole}
                    onChange={(e) => setNewPerson({ ...newPerson, assignmentRole: e.target.value as "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF" })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  >
                    <option value="MUNICIPAL_STAFF">Municipal Staff / Responder</option>
                    <option value="MUNICIPAL_ADMIN">Municipal Administrator</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Municipality (Antique)</label>
                  <select
                    required
                    value={newPerson.municipalityId}
                    onChange={(e) => setNewPerson({ ...newPerson, municipalityId: e.target.value, stationId: '' })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  >
                    <option value="">Select Municipality...</option>
                    {municipalities.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Initial Station (Optional)</label>
                  <select
                    value={newPerson.stationId}
                    onChange={(e) => setNewPerson({ ...newPerson, stationId: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  >
                    <option value="">Unassigned</option>
                    {stations
                      .filter((s) => s.municipalityId === newPerson.municipalityId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.stationName}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsCreating(false)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: '#E23632', color: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>{submitting ? 'Provisioning…' : 'Issue Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingPerson && (
        <div data-management-dialog style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#FFF', borderRadius: '20px', maxWidth: '480px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>Edit Personnel Profile</h3>
              <button type="button" onClick={() => setEditingPerson(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
            </div>
            <form onSubmit={handleUpdate} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Email (Immutable)</label>
                <input type="text" disabled value={editingPerson.email} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={editingPerson.displayName}
                  onChange={(e) => setEditingPerson({ ...editingPerson, displayName: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Rank / Position</label>
                <input
                  type="text"
                  value={editingPerson.rankOrPosition || ''}
                  onChange={(e) => setEditingPerson({ ...editingPerson, rankOrPosition: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditingPerson(null)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: '#E23632', color: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>{submitting ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Station Modal */}
      {assigningStationPerson && (
        <div data-management-dialog style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#FFF', borderRadius: '20px', maxWidth: '480px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>Assign Station: {assigningStationPerson.displayName}</h3>
              <button type="button" onClick={() => setAssigningStationPerson(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
            </div>
            <form onSubmit={handleAssignStation} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                Assigning to station within <strong>{assigningStationPerson.municipalityName}</strong>. Select a fire station or unassign.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Target Fire Station</label>
                <select
                  value={targetStationId}
                  onChange={(e) => setTargetStationId(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                >
                  <option value="">No Station (Unassigned)</option>
                  {stations
                    .filter((s) => s.municipalityId === assigningStationPerson.municipalityId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.stationName}</option>
                    ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setAssigningStationPerson(null)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>{submitting ? 'Assigning…' : 'Save Assignment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Municipality Modal */}
      {transferringPerson && (
        <div data-management-dialog style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#FFF', borderRadius: '20px', maxWidth: '520px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#F0E8FF', borderBottom: '1px solid #D5C4FE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#7C3AED' }}>Transfer Personnel: {transferringPerson.displayName}</h3>
              <button type="button" onClick={() => setTransferringPerson(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
            </div>
            <form onSubmit={handleTransfer} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', color: '#334155' }}>
                Current Municipality: <strong>{transferringPerson.municipalityName}</strong> · Current Station: <strong>{transferringPerson.stationName || 'Unassigned'}</strong>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Destination Municipality (Antique)</label>
                <select
                  required
                  value={transferState.municipalityId}
                  onChange={(e) => setTransferState({ ...transferState, municipalityId: e.target.value, stationId: '' })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                >
                  <option value="">Select Destination Municipality...</option>
                  {municipalities
                    .filter((m) => m.id !== transferringPerson.municipalityId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Destination Role</label>
                  <select
                    value={transferState.assignmentRole}
                    onChange={(e) => setTransferState({ ...transferState, assignmentRole: e.target.value as "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF" })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  >
                    <option value="MUNICIPAL_STAFF">Municipal Staff</option>
                    <option value="MUNICIPAL_ADMIN">Municipal Administrator</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Destination Station</label>
                  <select
                    value={transferState.stationId}
                    onChange={(e) => setTransferState({ ...transferState, stationId: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  >
                    <option value="">Unassigned</option>
                    {stations
                      .filter((s) => s.municipalityId === transferState.municipalityId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.stationName}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Transfer Reason & Authority</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Special order for regional repositioning..."
                  value={transferState.reason}
                  onChange={(e) => setTransferState({ ...transferState, reason: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setTransferringPerson(null)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" disabled={submitting || !transferState.municipalityId} style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: '#7C3AED', color: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>{submitting ? 'Transferring…' : 'Execute Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Account Modal */}
      {suspendingPerson && (
        <div data-management-dialog style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#FFF', borderRadius: '20px', maxWidth: '480px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#FFF1F2', borderBottom: '1px solid #FFE4E6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#E23632' }}>Suspend Account: {suspendingPerson.displayName}</h3>
              <button type="button" onClick={() => setSuspendingPerson(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>
                Suspending this account will immediately revoke all access and refuse existing sessions on the next API call.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Mandatory Suspension Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the administrative or disciplinary reason..."
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setSuspendingPerson(null)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Cancel</button>
                <button
                  type="button"
                  disabled={submitting || !suspensionReason.trim()}
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
    </div>
  );
}
