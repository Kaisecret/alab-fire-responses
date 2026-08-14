'use client';
import Link from 'next/link';

/* =====================================================================
   Municipal BFP Dashboard — Mission Command Center
   Redesigned with Taste-Skill & Impeccable Design Principles
   - Rich tactile micro-surfaces & precision borders
   - Mission-critical color accents & glowing threat states
   - Fluid staggered entrance animations & interactive micro-motion
   ===================================================================== */

const dashboardStyles = `
  /* ========== ROOT & ANIMATIONS ========== */
  @keyframes mbfpEntryFade {
    0% {
      opacity: 0;
      transform: translateY(12px) scale(0.99);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes mbfpRadarGlow {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(226, 54, 50, 0.5);
    }
    50% {
      opacity: 0.85;
      transform: scale(1.06);
      box-shadow: 0 0 0 6px rgba(226, 54, 50, 0);
    }
  }

  @keyframes mbfpEmeraldPulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45);
    }
    50% {
      transform: scale(1.08);
      box-shadow: 0 0 0 5px rgba(16, 185, 129, 0);
    }
  }

  @keyframes mbfpAmberPulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5);
    }
    50% {
      transform: scale(1.08);
      box-shadow: 0 0 0 5px rgba(245, 158, 11, 0);
    }
  }

  /* ========== DASHBOARD BASE ========== */
  .mbfp-dash {
    padding: 1.1rem 1.25rem 3rem;
    max-width: 1640px;
    margin: 0 auto;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1E293B;
  }

  /* ========== ULTRA-PREMIUM STAT CARDS ROW ========== */
  .mbfp-stats-row {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.85rem;
    margin-bottom: 1.25rem;
  }

  .mbfp-stat-card {
    position: relative;
    background: #FFFFFF;
    border-radius: 14px;
    padding: 1.15rem 1rem 1rem;
    border: 1px solid #E2E8F0;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.02);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    overflow: hidden;
    text-decoration: none;
    animation: mbfpEntryFade 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mbfp-stat-card:nth-child(1) { animation-delay: 0.05s; }
  .mbfp-stat-card:nth-child(2) { animation-delay: 0.1s; }
  .mbfp-stat-card:nth-child(3) { animation-delay: 0.15s; }
  .mbfp-stat-card:nth-child(4) { animation-delay: 0.2s; }
  .mbfp-stat-card:nth-child(5) { animation-delay: 0.25s; }

  .mbfp-stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    opacity: 0.9;
  }

  .mbfp-stat-card.red::before { background: linear-gradient(90deg, #E23632, #FF6B6B); }
  .mbfp-stat-card.amber::before { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
  .mbfp-stat-card.blue::before { background: linear-gradient(90deg, #2563EB, #60A5FA); }
  .mbfp-stat-card.emerald::before { background: linear-gradient(90deg, #10B981, #34D399); }
  .mbfp-stat-card.purple::before { background: linear-gradient(90deg, #8B5CF6, #A78BFA); }

  .mbfp-stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 28px -6px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04);
  }

  .mbfp-stat-card.red:hover { border-color: #FECDD3; box-shadow: 0 12px 28px -6px rgba(226, 54, 50, 0.16); }
  .mbfp-stat-card.amber:hover { border-color: #FDE68A; box-shadow: 0 12px 28px -6px rgba(245, 158, 11, 0.16); }
  .mbfp-stat-card.blue:hover { border-color: #BFDBFE; box-shadow: 0 12px 28px -6px rgba(37, 99, 235, 0.16); }
  .mbfp-stat-card.emerald:hover { border-color: #A7F3D0; box-shadow: 0 12px 28px -6px rgba(16, 185, 129, 0.16); }
  .mbfp-stat-card.purple:hover { border-color: #DDD6FE; box-shadow: 0 12px 28px -6px rgba(139, 92, 246, 0.16); }

  .mbfp-stat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .mbfp-stat-icon {
    width: 2.85rem;
    height: 2.85rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    flex-shrink: 0;
    transition: transform 0.25s ease;
  }

  .mbfp-stat-card:hover .mbfp-stat-icon {
    transform: scale(1.08) rotate(-3deg);
  }

  .mbfp-stat-icon.red { background: linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%); color: #E23632; border: 1px solid #FECDD3; }
  .mbfp-stat-icon.amber { background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); color: #D97706; box-shadow: none; border: 1px solid #FDE68A; }
  .mbfp-stat-icon.blue { background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); color: #2563EB; border: 1px solid #BFDBFE; }
  .mbfp-stat-icon.emerald { background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); color: #059669; border: 1px solid #A7F3D0; }
  .mbfp-stat-icon.purple { background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%); color: #7C3AED; border: 1px solid #DDD6FE; }

  .mbfp-stat-trend-tag {
    font-size: 0.64rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .mbfp-stat-trend-tag.red { background: #FFF1F2; color: #E23632; }
  .mbfp-stat-trend-tag.amber { background: #FFFBEB; color: #D97706; }
  .mbfp-stat-trend-tag.blue { background: #EFF6FF; color: #2563EB; }
  .mbfp-stat-trend-tag.emerald { background: #ECFDF5; color: #059669; }
  .mbfp-stat-trend-tag.purple { background: #F5F3FF; color: #7C3AED; }

  .mbfp-stat-body {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .mbfp-stat-label {
    font-size: 0.78rem;
    font-weight: 700;
    color: #64748B;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mbfp-stat-value {
    font-size: 1.85rem;
    font-weight: 880;
    color: #0F172A;
    line-height: 1.15;
    letter-spacing: -0.03em;
    font-feature-settings: 'tnum';
  }

  .mbfp-stat-foot {
    margin-top: 0.6rem;
    padding-top: 0.55rem;
    border-top: 1px solid #F1F5F9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.68rem;
    font-weight: 600;
    color: #94A3B8;
  }

  .mbfp-stat-link-arrow {
    font-size: 0.72rem;
    color: #64748B;
    transition: transform 0.2s ease, color 0.2s ease;
  }

  .mbfp-stat-card:hover .mbfp-stat-link-arrow {
    transform: translateX(3px);
    color: #E23632;
  }

  /* ========== TWO COLUMN GRID ========== */
  .mbfp-grid {
    display: grid;
    grid-template-columns: 1.75fr 1fr;
    gap: 1.25rem;
    margin-bottom: 1.25rem;
  }

  /* Glassmorphic Card Container */
  .mbfp-card {
    background: #FFFFFF;
    border-radius: 16px;
    border: 1px solid #E2E8F0;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.02);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: mbfpEntryFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mbfp-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.95rem 1.25rem;
    border-bottom: 1px solid #F1F5F9;
    background: linear-gradient(180deg, #FFFFFF 0%, #FAFCFF 100%);
  }

  .mbfp-card-title-wrap {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .mbfp-card-title-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #FFF1F2;
    color: #E23632;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
  }

  .mbfp-card-title {
    font-size: 0.92rem;
    font-weight: 800;
    color: #0F172A;
    letter-spacing: -0.02em;
  }

  .mbfp-card-badge {
    font-size: 0.68rem;
    font-weight: 700;
    color: #059669;
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    padding: 0.22rem 0.6rem;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .mbfp-card-badge::before {
    content: '';
    width: 6px;
    height: 6px;
    background: #10B981;
    border-radius: 50%;
    animation: mbfpEmeraldPulse 2s infinite;
  }

  .mbfp-card-body {
    padding: 1rem 1.25rem;
  }

  /* ========== RECENT / ACTIVE INCIDENT QUEUE TABLE ========== */
  .mbfp-incident-table-wrap {
    overflow-x: auto;
    width: 100%;
  }

  .mbfp-incident-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.8rem;
  }

  .mbfp-incident-table th {
    text-align: left;
    font-weight: 750;
    color: #64748B;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.75rem 0.9rem;
    background: #F8FAFC;
    border-bottom: 1px solid #E2E8F0;
    white-space: nowrap;
  }

  .mbfp-incident-table th:first-child { border-top-left-radius: 8px; }
  .mbfp-incident-table th:last-child { border-top-right-radius: 8px; }

  .mbfp-incident-table td {
    padding: 0.85rem 0.9rem;
    border-bottom: 1px solid #F1F5F9;
    color: #334155;
    font-weight: 600;
    vertical-align: middle;
    white-space: nowrap;
    transition: background 0.18s ease;
  }

  .mbfp-incident-row {
    transition: all 0.15s ease;
  }

  .mbfp-incident-row:hover td {
    background: #FFF8F8;
  }

  .mbfp-incident-row:last-child td {
    border-bottom: none;
  }

  .mbfp-ref-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.76rem;
    font-weight: 750;
    color: #0F172A;
    background: #F1F5F9;
    padding: 0.25rem 0.55rem;
    border-radius: 6px;
    border: 1px solid #E2E8F0;
    display: inline-block;
  }

  .mbfp-fire-type-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #1E293B;
  }

  .mbfp-fire-type-tag i {
    color: #E23632;
    font-size: 0.8rem;
  }

  /* Status Badges with Pulse Dots */
  .mbfp-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.28rem 0.75rem;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 750;
    letter-spacing: 0.01em;
    white-space: nowrap;
  }

  .mbfp-status-pill.pending {
    background: #FFFBEB;
    color: #B45309;
    border: 1px solid #FDE68A;
  }
  .mbfp-status-pill.pending .mbfp-pill-dot {
    background: #F59E0B;
    animation: mbfpAmberPulse 1.8s infinite;
  }

  .mbfp-status-pill.confirmed {
    background: #ECFDF5;
    color: #047857;
    border: 1px solid #A7F3D0;
  }
  .mbfp-status-pill.confirmed .mbfp-pill-dot {
    background: #10B981;
    animation: mbfpEmeraldPulse 2s infinite;
  }

  .mbfp-status-pill.dispatched {
    background: #EFF6FF;
    color: #1D4ED8;
    border: 1px solid #BFDBFE;
  }
  .mbfp-status-pill.dispatched .mbfp-pill-dot {
    background: #3B82F6;
  }

  .mbfp-status-pill.responding {
    background: #FFF1F2;
    color: #BE123C;
    border: 1px solid #FECDD3;
  }
  .mbfp-status-pill.responding .mbfp-pill-dot {
    background: #E23632;
    animation: mbfpRadarGlow 1.6s infinite;
  }

  .mbfp-status-pill.contained {
    background: #F8FAFC;
    color: #475569;
    border: 1px solid #E2E8F0;
  }
  .mbfp-status-pill.contained .mbfp-pill-dot {
    background: #94A3B8;
  }

  .mbfp-pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .mbfp-view-all-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1.25rem;
    border-top: 1px solid #F1F5F9;
    background: #FAFCFF;
    text-decoration: none;
    font-size: 0.82rem;
    font-weight: 750;
    color: #E23632;
    transition: all 0.2s ease;
  }

  .mbfp-view-all-footer:hover {
    background: #FFF1F2;
    color: #B91C1C;
    padding-left: 1.45rem;
  }

  .mbfp-view-all-footer i {
    transition: transform 0.2s ease;
  }

  .mbfp-view-all-footer:hover i {
    transform: translateX(4px);
  }

  /* ========== QUICK ACTIONS (IMPECCABLE TACTICAL GRID) ========== */
  .mbfp-quick-actions-wrap {
    padding: 1.15rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    height: 100%;
  }

  .mbfp-qa-grid-top {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
  }

  .mbfp-qa-box {
    position: relative;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 1.3rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    text-decoration: none;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }

  .mbfp-qa-box:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 24px -4px rgba(226, 54, 50, 0.15), 0 4px 8px rgba(226, 54, 50, 0.06);
    border-color: #FECDD3;
    background: linear-gradient(180deg, #FFFFFF 0%, #FFF8F8 100%);
  }

  .mbfp-qa-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-qa-box:hover .mbfp-qa-icon-wrap {
    transform: scale(1.12);
  }

  .mbfp-qa-icon-wrap.red { background: #FFF1F2; color: #E23632; border: 1px solid #FECDD3; }
  .mbfp-qa-icon-wrap.blue { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
  .mbfp-qa-icon-wrap.amber { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
  .mbfp-qa-icon-wrap.purple { background: #F5F3FF; color: #7C3AED; border: 1px solid #DDD6FE; }

  .mbfp-qa-text {
    font-size: 0.88rem;
    font-weight: 800;
    color: #0F172A;
    text-align: center;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  .mbfp-qa-box.full-width {
    width: 100%;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 0.85rem;
    padding: 0.95rem 1.35rem;
    background: linear-gradient(135deg, #FFFFFF 0%, #FFF5F5 100%);
    border-color: #FECDD3;
  }

  .mbfp-qa-box.full-width:hover {
    background: linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%);
    border-color: #FDA4AF;
  }

  /* ========== VERIFICATION REQUESTS (STREAMLINED CARDS) ========== */
  .mbfp-verif-list {
    display: flex;
    flex-direction: column;
  }

  .mbfp-verif-card {
    display: flex;
    gap: 0.95rem;
    padding: 1.05rem 1.25rem;
    border-bottom: 1px solid #F1F5F9;
    transition: all 0.2s ease;
    align-items: flex-start;
  }

  .mbfp-verif-card:hover {
    background: #FFFBFB;
  }

  .mbfp-verif-card:last-child {
    border-bottom: none;
  }

  .mbfp-verif-accent-box {
    width: 58px;
    height: 52px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    color: #FFFFFF;
    font-weight: 800;
    font-size: 0.72rem;
    flex-shrink: 0;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
  }

  .mbfp-verif-accent-box.fire {
    background: linear-gradient(135deg, #FF6B35 0%, #E23632 50%, #C41C18 100%);
  }

  .mbfp-verif-accent-box.smoke {
    background: linear-gradient(135deg, #FF8A65 0%, #F59E0B 50%, #D97706 100%);
  }

  .mbfp-verif-accent-box i {
    font-size: 1.15rem;
  }

  .mbfp-verif-content {
    flex: 1;
    min-width: 0;
  }

  .mbfp-verif-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }

  .mbfp-verif-id-pill {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.78rem;
    font-weight: 800;
    color: #0F172A;
  }

  .mbfp-verif-time-badge {
    font-size: 0.7rem;
    color: #E23632;
    font-weight: 750;
    background: #FFF1F2;
    padding: 0.18rem 0.55rem;
    border-radius: 6px;
    border: 1px solid #FFE4E6;
  }

  .mbfp-verif-loc {
    font-size: 0.78rem;
    color: #334155;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-bottom: 0.2rem;
  }

  .mbfp-verif-loc i {
    color: #E23632;
    font-size: 0.72rem;
  }

  .mbfp-verif-summary {
    font-size: 0.74rem;
    color: #64748B;
    font-weight: 500;
    margin-bottom: 0.55rem;
  }

  .mbfp-verif-btn-row {
    display: flex;
    gap: 0.5rem;
  }

  .mbfp-btn-action {
    font-size: 0.72rem;
    font-weight: 750;
    padding: 0.35rem 0.85rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-btn-action.verify-now {
    background: linear-gradient(135deg, #10B981, #059669);
    color: #FFFFFF;
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
  }

  .mbfp-btn-action.verify-now:hover {
    background: linear-gradient(135deg, #059669, #047857);
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.35);
  }

  .mbfp-btn-action.open-map {
    background: #EFF6FF;
    color: #2563EB;
    border: 1px solid #BFDBFE;
  }

  .mbfp-btn-action.open-map:hover {
    background: #DBEAFE;
    transform: translateY(-1px);
  }

  /* ========== RESOURCE STATUS FLEET MATRIX ========== */
  .mbfp-col-right {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .mbfp-resource-matrix {
    display: flex;
    flex-direction: column;
  }

  .mbfp-resource-row {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid #F1F5F9;
    transition: background 0.15s ease;
  }

  .mbfp-resource-row:hover {
    background: #F8FAFC;
  }

  .mbfp-resource-row:last-child {
    border-bottom: none;
  }

  .mbfp-res-glyph {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .mbfp-res-glyph.engine { background: #FFF1F2; color: #E23632; border: 1px solid #FECDD3; }
  .mbfp-res-glyph.rescue { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
  .mbfp-res-glyph.tanker { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }

  .mbfp-res-meta {
    flex: 1;
    min-width: 0;
  }

  .mbfp-res-title {
    font-size: 0.85rem;
    font-weight: 800;
    color: #0F172A;
  }

  .mbfp-res-loc {
    font-size: 0.72rem;
    color: #64748B;
    font-weight: 500;
  }

  .mbfp-res-state-pill {
    font-size: 0.72rem;
    font-weight: 750;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.65rem;
    border-radius: 20px;
    white-space: nowrap;
  }

  .mbfp-res-state-pill.available,
  .mbfp-res-state-pill.ready {
    background: #ECFDF5;
    color: #047857;
    border: 1px solid #A7F3D0;
  }
  .mbfp-res-state-pill.available .mbfp-res-dot,
  .mbfp-res-state-pill.ready .mbfp-res-dot {
    background: #10B981;
    animation: mbfpEmeraldPulse 2s infinite;
  }

  .mbfp-res-state-pill.on-route {
    background: #FFFBEB;
    color: #B45309;
    border: 1px solid #FDE68A;
  }
  .mbfp-res-state-pill.on-route .mbfp-res-dot {
    background: #F59E0B;
    animation: mbfpAmberPulse 1.8s infinite;
  }

  .mbfp-res-state-pill.maintenance {
    background: #F8FAFC;
    color: #64748B;
    border: 1px solid #E2E8F0;
  }
  .mbfp-res-state-pill.maintenance .mbfp-res-dot {
    background: #94A3B8;
  }

  .mbfp-res-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ========== EMERGENCY MUTUAL AID & COORDINATION ========== */
  .mbfp-aid-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.95rem 1.25rem;
    border-bottom: 1px solid #F1F5F9;
    gap: 0.85rem;
    transition: background 0.15s ease;
  }

  .mbfp-aid-item:hover {
    background: #F8FAFC;
  }

  .mbfp-aid-item:last-child {
    border-bottom: none;
  }

  .mbfp-aid-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .mbfp-aid-title {
    font-size: 0.85rem;
    font-weight: 800;
    color: #0F172A;
  }

  .mbfp-aid-sub {
    font-size: 0.72rem;
    color: #64748B;
    font-weight: 500;
  }

  .mbfp-aid-phone {
    font-size: 0.74rem;
    font-weight: 700;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.15rem;
  }

  .mbfp-aid-phone i {
    color: #10B981;
    font-size: 0.75rem;
  }

  .mbfp-aid-btn {
    font-size: 0.75rem;
    font-weight: 750;
    padding: 0.45rem 0.95rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    white-space: nowrap;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-aid-btn.support {
    background: linear-gradient(135deg, #10B981, #059669);
    color: #FFFFFF;
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
  }

  .mbfp-aid-btn.support:hover {
    background: linear-gradient(135deg, #059669, #047857);
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.35);
  }

  .mbfp-aid-btn.provincial {
    background: #FFF1F2;
    color: #E23632;
    border: 1px solid #FECDD3;
  }

  .mbfp-aid-btn.provincial:hover {
    background: #FFE4E6;
    border-color: #FDA4AF;
    transform: translateY(-1px);
  }

  /* ========== RESPONSIVE RULES ========== */
  @media (max-width: 1400px) {
    .mbfp-stats-row {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 1024px) {
    .mbfp-stats-row {
      grid-template-columns: repeat(2, 1fr);
    }
    .mbfp-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .mbfp-dash {
      padding: 0.75rem;
    }
    .mbfp-stats-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
    }
    .mbfp-stat-card {
      min-width: 0;
      padding: 0.85rem 0.75rem;
    }
    .mbfp-stat-value {
      font-size: 1.45rem;
    }
    .mbfp-quick-actions,
    .mbfp-quick-actions-wrap,
    .mbfp-qa-grid-top {
      grid-template-columns: 1fr;
    }
    .mbfp-card-body {
      overflow-x: auto;
    }
    .mbfp-incident-table {
      min-width: 580px;
    }
    .mbfp-emergency-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.7rem;
    }
    .mbfp-aid-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.65rem;
    }
    .mbfp-aid-btn {
      width: 100%;
      justify-content: center;
    }
  }
`;

const incidentData = [
  { ref: 'INC-2025-0421', barangay: 'Poblacion', type: 'Structure Fire', time: '10:24 AM', status: 'pending', statusLabel: 'Pending Verification' },
  { ref: 'INC-2025-0420', barangay: 'Sampaguita', type: 'Grass Fire', time: '09:58 AM', status: 'confirmed', statusLabel: 'Confirmed' },
  { ref: 'INC-2025-0419', barangay: 'San Roque', type: 'Structure Fire', time: '09:15 AM', status: 'dispatched', statusLabel: 'Dispatched' },
  { ref: 'INC-2025-0418', barangay: 'Libertad', type: 'Brush Fire', time: '08:42 AM', status: 'responding', statusLabel: 'Responding' },
  { ref: 'INC-2025-0417', barangay: 'Poblacion', type: 'Electrical Fire', time: '07:30 AM', status: 'contained', statusLabel: 'Contained' },
];

const resourceData = [
  { name: 'Engine 1', station: 'Poblacion Fire Station', type: 'engine', status: 'available', statusLabel: 'Available' },
  { name: 'Engine 2', station: 'Poblacion Fire Station', type: 'engine', status: 'ready', statusLabel: 'Ready' },
  { name: 'Rescue 1', station: 'Poblacion Fire Station', type: 'rescue', status: 'on-route', statusLabel: 'On Route' },
  { name: 'Tanker 1', station: 'Poblacion Fire Station', type: 'tanker', status: 'maintenance', statusLabel: 'Maintenance' },
];

export function MunicipalBfpDashboard() {
  return (
    <>
      <style>{dashboardStyles}</style>
      <div className="mbfp-dash">
        {/* Stat Cards */}
        <div className="mbfp-stats-row">
          <Link href="/municipal-bfp/active-incidents" className="mbfp-stat-card red">
            <div className="mbfp-stat-header">
              <div className="mbfp-stat-icon red">
                <i className="fa-solid fa-fire-flame-curved" />
              </div>
              <span className="mbfp-stat-trend-tag red">
                <i className="fa-solid fa-triangle-exclamation" /> Priority
              </span>
            </div>
            <div className="mbfp-stat-body">
              <span className="mbfp-stat-label">Active Incidents</span>
              <span className="mbfp-stat-value">4</span>
            </div>
            <div className="mbfp-stat-foot">
              <span>Live Operations</span>
              <i className="fa-solid fa-arrow-right mbfp-stat-link-arrow" />
            </div>
          </Link>

          <Link href="/municipal-bfp/verification-queue" className="mbfp-stat-card amber">
            <div className="mbfp-stat-header">
              <div className="mbfp-stat-icon amber">
                <i className="fa-solid fa-clipboard-check" />
              </div>
              <span className="mbfp-stat-trend-tag amber">
                <i className="fa-solid fa-hourglass-half" /> Action Req.
              </span>
            </div>
            <div className="mbfp-stat-body">
              <span className="mbfp-stat-label">Pending Verification</span>
              <span className="mbfp-stat-value">2</span>
            </div>
            <div className="mbfp-stat-foot">
              <span>Incoming Citizen Reports</span>
              <i className="fa-solid fa-arrow-right mbfp-stat-link-arrow" />
            </div>
          </Link>

          <Link href="/municipal-bfp/firetrucks" className="mbfp-stat-card blue">
            <div className="mbfp-stat-header">
              <div className="mbfp-stat-icon blue">
                <i className="fa-solid fa-truck-moving" />
              </div>
              <span className="mbfp-stat-trend-tag blue">
                <i className="fa-solid fa-circle-check" /> Ready
              </span>
            </div>
            <div className="mbfp-stat-body">
              <span className="mbfp-stat-label">Firetrucks Available</span>
              <span className="mbfp-stat-value">5</span>
            </div>
            <div className="mbfp-stat-foot">
              <span>Fleet Status: 100%</span>
              <i className="fa-solid fa-arrow-right mbfp-stat-link-arrow" />
            </div>
          </Link>

          <Link href="/municipal-bfp/responders" className="mbfp-stat-card emerald">
            <div className="mbfp-stat-header">
              <div className="mbfp-stat-icon emerald">
                <i className="fa-solid fa-users" />
              </div>
              <span className="mbfp-stat-trend-tag emerald">
                <i className="fa-solid fa-shield" /> Shift Alpha
              </span>
            </div>
            <div className="mbfp-stat-body">
              <span className="mbfp-stat-label">Responders On Duty</span>
              <span className="mbfp-stat-value">18</span>
            </div>
            <div className="mbfp-stat-foot">
              <span>Station Personnel</span>
              <i className="fa-solid fa-arrow-right mbfp-stat-link-arrow" />
            </div>
          </Link>

          <Link href="/municipal-bfp/dispatch-routing" className="mbfp-stat-card purple">
            <div className="mbfp-stat-header">
              <div className="mbfp-stat-icon purple">
                <i className="fa-solid fa-handshake-angle" />
              </div>
              <span className="mbfp-stat-trend-tag purple">
                <i className="fa-solid fa-tower-broadcast" /> Mutual Aid
              </span>
            </div>
            <div className="mbfp-stat-body">
              <span className="mbfp-stat-label">Assistance Requests</span>
              <span className="mbfp-stat-value">1</span>
            </div>
            <div className="mbfp-stat-foot">
              <span>Inter-Station Link</span>
              <i className="fa-solid fa-arrow-right mbfp-stat-link-arrow" />
            </div>
          </Link>
        </div>

        {/* Top Row Grid: Incident Queue & Quick Actions */}
        <div className="mbfp-grid">
          {/* Incident Queue */}
          <div className="mbfp-card">
            <div className="mbfp-card-header">
              <div className="mbfp-card-title-wrap">
                <div className="mbfp-card-title-icon">
                  <i className="fa-solid fa-fire" />
                </div>
                <span className="mbfp-card-title">Recent / Active Incident Queue</span>
              </div>
              <span className="mbfp-card-badge">Live Monitoring</span>
            </div>

            <div className="mbfp-card-body" style={{ padding: 0 }}>
              <div className="mbfp-incident-table-wrap">
                <table className="mbfp-incident-table">
                  <thead>
                    <tr>
                      <th>Ref. No.</th>
                      <th>Barangay</th>
                      <th>Fire Type</th>
                      <th>Time Reported</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidentData.map((inc) => (
                      <tr key={inc.ref} className="mbfp-incident-row">
                        <td>
                          <span className="mbfp-ref-code">{inc.ref}</span>
                        </td>
                        <td>
                          <strong style={{ color: '#0F172A' }}>{inc.barangay}</strong>
                        </td>
                        <td>
                          <span className="mbfp-fire-type-tag">
                            <i className="fa-solid fa-fire-flame-simple" />
                            <span>{inc.type}</span>
                          </span>
                        </td>
                        <td style={{ color: '#64748B', fontFeatureSettings: 'tnum' }}>
                          {inc.time}
                        </td>
                        <td>
                          <span className={`mbfp-status-pill ${inc.status}`}>
                            <span className="mbfp-pill-dot" />
                            <span>{inc.statusLabel}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Link href="/municipal-bfp/active-incidents" className="mbfp-view-all-footer">
              <span>View All Active Incidents</span>
              <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>

          {/* Quick Actions Tactical Hub */}
          <div className="mbfp-card">
            <div className="mbfp-card-header">
              <div className="mbfp-card-title-wrap">
                <div className="mbfp-card-title-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <i className="fa-solid fa-bolt" />
                </div>
                <span className="mbfp-card-title">Tactical Quick Actions</span>
              </div>
            </div>

            <div className="mbfp-quick-actions-wrap">
              <div className="mbfp-qa-grid-top">
                <Link href="/municipal-bfp/verification-queue" prefetch={true} className="mbfp-qa-box">
                  <div className="mbfp-qa-icon-wrap red">
                    <i className="fa-solid fa-clipboard-check" />
                  </div>
                  <span className="mbfp-qa-text">Verify New Report</span>
                </Link>

                <Link href="/municipal-bfp/gis-map" prefetch={true} className="mbfp-qa-box">
                  <div className="mbfp-qa-icon-wrap blue">
                    <i className="fa-solid fa-map-location-dot" />
                  </div>
                  <span className="mbfp-qa-text">Open GIS Map</span>
                </Link>

                <Link href="/municipal-bfp/dispatch-routing" prefetch={true} className="mbfp-qa-box">
                  <div className="mbfp-qa-icon-wrap amber">
                    <i className="fa-solid fa-truck-moving" />
                  </div>
                  <span className="mbfp-qa-text">Dispatch Firetruck</span>
                </Link>

                <Link href="/municipal-bfp/dispatch-routing" prefetch={true} className="mbfp-qa-box">
                  <div className="mbfp-qa-icon-wrap purple">
                    <i className="fa-solid fa-shield-halved" />
                  </div>
                  <span className="mbfp-qa-text">Request Backup</span>
                </Link>
              </div>

              <Link href="/municipal-bfp/incident-reports" prefetch={true} className="mbfp-qa-box full-width">
                <div className="mbfp-qa-icon-wrap red" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
                  <i className="fa-solid fa-file-circle-plus" />
                </div>
                <span className="mbfp-qa-text">Generate Official Incident Report</span>
                <i className="fa-solid fa-arrow-right" style={{ marginLeft: 'auto', color: '#E23632', fontSize: '0.85rem' }} />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Row Grid: Verification Requests & Resource Status */}
        <div className="mbfp-grid">
          {/* Verification Requests */}
          <div className="mbfp-card">
            <div className="mbfp-card-header">
              <div className="mbfp-card-title-wrap">
                <div className="mbfp-card-title-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
                  <i className="fa-solid fa-triangle-exclamation" />
                </div>
                <span className="mbfp-card-title">Verification Requests (2)</span>
              </div>
              <span className="mbfp-card-badge" style={{ color: '#D97706', background: '#FFFBEB', borderColor: '#FDE68A' }}>
                Citizen Reports
              </span>
            </div>

            <div className="mbfp-verif-list">
              <div className="mbfp-verif-card">
                <div className="mbfp-verif-accent-box fire">
                  <i className="fa-solid fa-fire" />
                  <span>ALERT</span>
                </div>
                <div className="mbfp-verif-content">
                  <div className="mbfp-verif-top-row">
                    <span className="mbfp-verif-id-pill">VR-2025-0152</span>
                    <span className="mbfp-verif-time-badge">10:30 AM</span>
                  </div>
                  <div className="mbfp-verif-loc">
                    <i className="fa-solid fa-location-dot" />
                    <span>Sampaguita, San Jose de Buenavista</span>
                  </div>
                  <div className="mbfp-verif-summary">Possible grass fire near vacant lot. Caller notes light smoke spreading.</div>
                  <div className="mbfp-verif-btn-row">
                    <Link href="/municipal-bfp/verification-queue" className="mbfp-btn-action verify-now">
                      <i className="fa-solid fa-check" /> Verify Report
                    </Link>
                    <Link href="/municipal-bfp/gis-map" className="mbfp-btn-action open-map">
                      <i className="fa-solid fa-map-location-dot" /> View on Map
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mbfp-verif-card">
                <div className="mbfp-verif-accent-box smoke">
                  <i className="fa-solid fa-smog" />
                  <span>SMOKE</span>
                </div>
                <div className="mbfp-verif-content">
                  <div className="mbfp-verif-top-row">
                    <span className="mbfp-verif-id-pill">VR-2025-0151</span>
                    <span className="mbfp-verif-time-badge">10:12 AM</span>
                  </div>
                  <div className="mbfp-verif-loc">
                    <i className="fa-solid fa-location-dot" />
                    <span>San Roque, San Jose de Buenavista</span>
                  </div>
                  <div className="mbfp-verif-summary">Smoke coming from residential area. Nearby residents notified.</div>
                  <div className="mbfp-verif-btn-row">
                    <Link href="/municipal-bfp/verification-queue" className="mbfp-btn-action verify-now">
                      <i className="fa-solid fa-check" /> Verify Report
                    </Link>
                    <Link href="/municipal-bfp/gis-map" className="mbfp-btn-action open-map">
                      <i className="fa-solid fa-map-location-dot" /> View on Map
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <Link href="/municipal-bfp/verification-queue" className="mbfp-view-all-footer">
              <span>View All Pending Verification Requests</span>
              <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>

          {/* Right Column: Fleet Readiness & Mutual Aid */}
          <div className="mbfp-col-right">
            {/* Resource Status */}
            <div className="mbfp-card">
              <div className="mbfp-card-header">
                <div className="mbfp-card-title-wrap">
                  <div className="mbfp-card-title-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <i className="fa-solid fa-truck-medical" />
                  </div>
                  <span className="mbfp-card-title">Fleet &amp; Resource Status</span>
                </div>
              </div>

              <div className="mbfp-resource-matrix">
                {resourceData.map((res) => (
                  <div className="mbfp-resource-row" key={res.name}>
                    <div className={`mbfp-res-glyph ${res.type}`}>
                      <i className={`fa-solid ${res.type === 'engine' ? 'fa-truck-moving' : res.type === 'rescue' ? 'fa-truck-medical' : 'fa-droplet'}`} />
                    </div>
                    <div className="mbfp-res-meta">
                      <div className="mbfp-res-title">{res.name}</div>
                      <div className="mbfp-res-loc">{res.station}</div>
                    </div>
                    <div className={`mbfp-res-state-pill ${res.status}`}>
                      <span className="mbfp-res-dot" />
                      <span>{res.statusLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mutual Aid Coordination */}
            <div className="mbfp-card">
              <div className="mbfp-card-header">
                <div className="mbfp-card-title-wrap">
                  <div className="mbfp-card-title-icon" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                    <i className="fa-solid fa-tower-broadcast" />
                  </div>
                  <span className="mbfp-card-title">Inter-Municipality Coordination</span>
                </div>
              </div>

              <div>
                <div className="mbfp-aid-item">
                  <div className="mbfp-aid-meta">
                    <span className="mbfp-aid-title">Tobias Fornier Fire Station</span>
                    <span className="mbfp-aid-sub">Nearest Municipal BFP Support (12km)</span>
                    <span className="mbfp-aid-phone">
                      <i className="fa-solid fa-phone-volume" />
                      <span>(036) 536-0123</span>
                    </span>
                  </div>
                  <button type="button" className="mbfp-aid-btn support">
                    <i className="fa-solid fa-handshake" /> Request Backup
                  </button>
                </div>

                <div className="mbfp-aid-item">
                  <div className="mbfp-aid-meta">
                    <span className="mbfp-aid-title">Provincial BFP Command</span>
                    <span className="mbfp-aid-sub">Antique Provincial Headquarters</span>
                  </div>
                  <button type="button" className="mbfp-aid-btn provincial">
                    <i className="fa-solid fa-phone" /> Contact Command
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
