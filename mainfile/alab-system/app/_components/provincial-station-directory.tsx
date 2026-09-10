'use client';

import { ProvincialManagementToolbar } from './provincial-management-toolbar';
import { useManagementMutation } from './use-management-mutation';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProvincialManagementList } from './use-provincial-management-list';
import { useManagementDialog } from './use-management-dialog';
import type { ManagedStation } from '../../lib/provincial-bfp/management/types';

export function ProvincialStationDirectory() {
  const mutate = useManagementMutation();
  const { items: stations, total, loading, error, page, pageSize, setPage, filters, setFilter, refresh: fetchStations } = useProvincialManagementList<ManagedStation>({ endpoint: '/api/provincial-bfp/stations' });
  const municipalityId = filters.municipalityId || '';
  const setMunicipalityId = (value: string) => setFilter('municipalityId', value);
  const status = filters.status || '';
  const setStatus = (value: string) => setFilter('status', value);
  const search = filters.search || '';
  const setSearch = (value: string) => setFilter('search', value);

  // Municipalities for dropdown
  const [municipalities, setMunicipalities] = useState<Array<{ id: string; name: string }>>([]);

  // Modals state
  const [editingStation, setEditingStation] = useState<ManagedStation | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deactivatingStation, setDeactivatingStation] = useState<ManagedStation | null>(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [newStation, setNewStation] = useState({
    municipalityId: municipalityId,
    stationName: '',
    latitude: 10.743,
    longitude: 121.94,
  });

  // Fetch municipalities for filter
  useEffect(() => {
    fetch('/api/provincial-bfp/municipalities?pageSize=100&page=1')
      .then((res) => res.json())
      .then((data) => setMunicipalities(data.items || []))
      .catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate('/api/provincial-bfp/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStation),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create station');
      setIsCreating(false);
      setNewStation({ municipalityId: '', stationName: '', latitude: 10.743, longitude: 121.94 });
      fetchStations();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error creating station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStation) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/stations/${editingStation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': editingStation.updatedAt,
        },
        body: JSON.stringify({
          action: 'UPDATE',
          stationName: editingStation.stationName,
          latitude: editingStation.latitude,
          longitude: editingStation.longitude,
          expectedVersion: editingStation.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update station');
      setEditingStation(null);
      fetchStations();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error updating station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingStation) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/stations/${deactivatingStation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': deactivatingStation.updatedAt,
        },
        body: JSON.stringify({
          action: 'DEACTIVATE',
          reason: deactivationReason,
          expectedVersion: deactivatingStation.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate station');
      setDeactivatingStation(null);
      setDeactivationReason('');
      fetchStations();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error deactivating station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (station: ManagedStation) => {
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await mutate(`/api/provincial-bfp/stations/${station.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'if-match': station.updatedAt,
        },
        body: JSON.stringify({
          action: 'REACTIVATE',
          expectedVersion: station.updatedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reactivate station');
      fetchStations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error reactivating station');
    } finally {
      setSubmitting(false);
    }
  };

  useManagementDialog(!!(isCreating || editingStation || deactivatingStation), () => { setIsCreating(false); setEditingStation(null); setDeactivatingStation(null); }, submitting);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ProvincialManagementToolbar exportOnly dataset="STATIONS" filters={filters} onFilterChange={() => {}} />
      {/* Header Hub */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            <i className="fa-solid fa-truck-fire" style={{ color: '#E23632', marginRight: '0.6rem' }} />
            Provincial Fire Station Directory
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.2rem 0 0' }}>
            Manage all municipal BFP fire stations, geographical coordinates, and deployment readiness across Antique.
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
            <i className="fa-solid fa-plus" /> Provision Station
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
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
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
            <option value="INACTIVE">Inactive Only</option>
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
            width: '240px',
          }}
        >
          <i className="fa-solid fa-magnifying-glass" style={{ color: '#94A3B8', fontSize: '0.8rem' }} />
          <input
            type="text"
            placeholder="Search station..."
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
          <button type="button" onClick={() => fetchStations()} style={{ background: '#E23632', color: '#FFF', border: 'none', borderRadius: '8px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
        </div>
      )}

      {/* Stations Table */}
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
              <th style={{ padding: '0.9rem 1.25rem' }}>STATION NAME</th>
              <th style={{ padding: '0.9rem 1rem' }}>MUNICIPALITY</th>
              <th style={{ padding: '0.9rem 1rem' }}>COORDINATES</th>
              <th style={{ padding: '0.9rem 1rem' }}>PERSONNEL</th>
              <th style={{ padding: '0.9rem 1rem' }}>STATUS</th>
              <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading && stations.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td colSpan={6} style={{ padding: '1.2rem', textAlign: 'center', color: '#94A3B8' }}>
                    Loading stations registry…
                  </td>
                </tr>
              ))
            ) : stations.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
                  <i className="fa-solid fa-building-shield" style={{ fontSize: '2.5rem', color: '#CBD5E1', marginBottom: '0.5rem', display: 'block' }} />
                  <strong style={{ display: 'block', color: '#0F172A', fontSize: '1rem' }}>No fire stations found</strong>
                  <span style={{ fontSize: '0.8rem' }}>Try changing your municipality or status filters.</span>
                </td>
              </tr>
            ) : (
              stations.map((st) => (
                <tr key={st.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '0.9rem 1.25rem', fontWeight: 800, color: '#0F172A' }}>
                    {st.stationName}
                  </td>
                  <td style={{ padding: '0.9rem 1rem', color: '#334155', fontWeight: 600 }}>
                    {st.municipalityName}
                  </td>
                  <td style={{ padding: '0.9rem 1rem', color: '#64748B', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    <Link
                      href={`/provincial-bfp/responders?stationId=${st.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: '#2563EB',
                        fontWeight: 700,
                        textDecoration: 'none',
                        background: '#EFF6FF',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                      }}
                    >
                      <i className="fa-solid fa-users" style={{ fontSize: '0.7rem' }} />
                      {st.personnelCount} Personnel
                    </Link>
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    {st.status === 'ACTIVE' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#ECFDF5', color: '#059669', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} /> ACTIVE
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#F1F5F9', color: '#64748B', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }} /> INACTIVE
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => setEditingStation(st)}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          padding: '0.3rem 0.6rem',
                          color: '#334155',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <i className="fa-solid fa-pen" /> Edit
                      </button>
                      {st.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={() => setDeactivatingStation(st)}
                          style={{
                            background: '#FFF1F2',
                            border: '1px solid #FFE4E6',
                            borderRadius: '6px',
                            padding: '0.3rem 0.6rem',
                            color: '#E23632',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReactivate(st)}
                          style={{
                            background: '#ECFDF5',
                            border: '1px solid #D1FAE5',
                            borderRadius: '6px',
                            padding: '0.3rem 0.6rem',
                            color: '#059669',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Reactivate
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
          <span>Showing <strong>{stations.length}</strong> of <strong>{total}</strong> stations</span>
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

      {/* Provision Station Modal */}
      {isCreating && (
        <div data-management-dialog style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#FFF', borderRadius: '20px', maxWidth: '500px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>Provision New Fire Station</h3>
              <button type="button" onClick={() => setIsCreating(false)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Municipality (Antique)</label>
                <select
                  required
                  value={newStation.municipalityId}
                  onChange={(e) => setNewStation({ ...newStation, municipalityId: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                >
                  <option value="">Select Municipality...</option>
                  {municipalities.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Station Official Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. San Jose Sub-Station 1"
                  value={newStation.stationName}
                  onChange={(e) => setNewStation({ ...newStation, stationName: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Latitude (4 to 22)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newStation.latitude}
                    onChange={(e) => setNewStation({ ...newStation, latitude: parseFloat(e.target.value) })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Longitude (116 to 127)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newStation.longitude}
                    onChange={(e) => setNewStation({ ...newStation, longitude: parseFloat(e.target.value) })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsCreating(false)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: '#E23632', color: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>{submitting ? 'Creating…' : 'Create Station'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Station Modal */}
      {editingStation && (
        <div data-management-dialog style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#FFF', borderRadius: '20px', maxWidth: '500px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>Edit Station: {editingStation.stationName}</h3>
              <button type="button" onClick={() => setEditingStation(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
            </div>
            <form onSubmit={handleUpdate} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Municipality</label>
                <input
                  type="text"
                  disabled
                  value={editingStation.municipalityName}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Station Official Name</label>
                <input
                  type="text"
                  required
                  value={editingStation.stationName}
                  onChange={(e) => setEditingStation({ ...editingStation, stationName: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editingStation.latitude}
                    onChange={(e) => setEditingStation({ ...editingStation, latitude: parseFloat(e.target.value) })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editingStation.longitude}
                    onChange={(e) => setEditingStation({ ...editingStation, longitude: parseFloat(e.target.value) })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditingStation(null)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: '#E23632', color: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>{submitting ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Station Reason Modal */}
      {deactivatingStation && (
        <div data-management-dialog style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#FFF', borderRadius: '20px', maxWidth: '480px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#FFF1F2', borderBottom: '1px solid #FFE4E6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#E23632' }}>Deactivate Station</h3>
              <button type="button" onClick={() => setDeactivatingStation(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {actionError && (
                <div style={{ background: '#FFF1F2', color: '#E23632', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>{actionError}</div>
              )}
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>
                Are you sure you want to deactivate <strong>{deactivatingStation.stationName}</strong> in <strong>{deactivatingStation.municipalityName}</strong>?
                Deactivation will block this station from new mobile dispatches. Note that deactivation is blocked if there are active personnel assignments or active emergency responses.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>Mandatory Deactivation Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the operational reason for deactivation..."
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setDeactivatingStation(null)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Cancel</button>
                <button
                  type="button"
                  disabled={submitting || !deactivationReason.trim()}
                  onClick={handleDeactivate}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: '#E23632', color: '#FFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                >
                  {submitting ? 'Deactivating…' : 'Confirm Deactivation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
