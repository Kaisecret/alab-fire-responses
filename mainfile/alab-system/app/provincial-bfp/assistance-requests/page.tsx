'use client';

import React from 'react';

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
  .pbfp-aid-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .pbfp-aid-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .pbfp-aid-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
  }
  .pbfp-aid-badge {
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 800;
  }
  .pbfp-aid-badge.active { background: #FEF3C7; color: #B45309; }
  .pbfp-aid-badge.completed { background: #ECFDF5; color: #059669; }
  .pbfp-route-preview {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 0.85rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.82rem;
  }
`;

export default function AssistanceRequestsPage() {
  return (
    <>
      <style>{styles}</style>
      <div className="pbfp-page">
        <div className="pbfp-header-top">
          <h1>
            <i className="fa-solid fa-handshake-angle" style={{ color: '#DB1B0D' }} />
            Inter-Municipality Assistance & Mutual Aid Coordination
          </h1>
          <p>
            Provincial oversight for inter-municipality apparatus dispatch, tanker reinforcements, and emergency resource sharing across Antique.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="pbfp-aid-card" style={{ borderLeft: '4px solid #DB1B0D' }}>
            <div className="pbfp-aid-header">
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Request #AID-2026-003 • Commercial Fire Reinforcement
                </span>
                <div className="pbfp-aid-title">San Jose de Buenavista ➔ Requesting Tanker Support from Hamtic BFP</div>
              </div>
              <span className="pbfp-aid-badge active">
                <i className="fa-solid fa-truck-fast" style={{ marginRight: '0.35rem' }} /> En Route / Coordinated
              </span>
            </div>

            <p style={{ color: '#475569', fontSize: '0.84rem', margin: '0.25rem 0' }}>
              Due to a 2nd alarm commercial fire at Brgy. Funda-Dalipe, San Jose BFP requested immediate 10,000L water tanker support and 1 pumper engine from Hamtic BFP.
            </p>

            <div className="pbfp-route-preview">
              <span><strong>Dispatching Unit:</strong> Hamtic Tanker 1 (Plate BFP-HM-001)</span>
              <span><strong>Estimated ETA:</strong> 12 mins via National Highway</span>
              <span style={{ color: '#059669', fontWeight: 700 }}>Authorized by Provincial Fire Marshal</span>
            </div>
          </div>

          <div className="pbfp-aid-card">
            <div className="pbfp-aid-header">
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Request #AID-2026-002 • Mutual Aid Completed
                </span>
                <div className="pbfp-aid-title">Bugasong BFP ➔ Assisted Patnongon BFP for Warehouse Fire</div>
              </div>
              <span className="pbfp-aid-badge completed">
                <i className="fa-solid fa-circle-check" style={{ marginRight: '0.35rem' }} /> Completed & Returned
              </span>
            </div>

            <p style={{ color: '#475569', fontSize: '0.84rem', margin: '0.25rem 0' }}>
              Bugasong Engine 2 deployed 4 personnel to assist Patnongon station in extinguishing a localized storage fire. All units safely returned to mother stations.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
