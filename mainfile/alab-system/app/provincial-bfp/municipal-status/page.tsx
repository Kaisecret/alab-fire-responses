'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

type StationStatus = 'ready' | 'responding' | 'aid';

type MunicipalStation = {
  name: string;
  district: 'North Antique' | 'Central Antique' | 'South Antique';
  status: StationStatus;
  statusLabel: string;
  respondingCount?: number;
  availableTrucks: number;
  totalTrucks: number;
  crew: number;
  hydrants: number;
  contact: string;
  leadOfficer: string;
  activeAlarms?: string;
  mutualAidTarget?: string;
};

const municipalitiesList: MunicipalStation[] = [
  {
    name: 'San Jose de Buenavista',
    district: 'South Antique',
    status: 'responding',
    statusLabel: 'Responding',
    respondingCount: 1,
    availableTrucks: 4,
    totalTrucks: 5,
    crew: 16,
    hydrants: 24,
    contact: '(036) 540-8000',
    leadOfficer: 'Insp. Rafael Mendoza',
    activeAlarms: 'Brgy. Funda-Dalipe (2nd Alarm)',
  },
  {
    name: 'Sibalom',
    district: 'Central Antique',
    status: 'responding',
    statusLabel: 'Responding',
    respondingCount: 1,
    availableTrucks: 2,
    totalTrucks: 3,
    crew: 12,
    hydrants: 18,
    contact: '(036) 543-7000',
    leadOfficer: 'SFO2 Mario Gomez',
    activeAlarms: 'Brgy. Bari (1st Alarm)',
  },
  {
    name: 'Tibiao',
    district: 'North Antique',
    status: 'responding',
    statusLabel: 'Responding',
    respondingCount: 1,
    availableTrucks: 1,
    totalTrucks: 2,
    crew: 9,
    hydrants: 8,
    contact: '(036) 546-5000',
    leadOfficer: 'FO3 Dennis Alcala',
    activeAlarms: 'Brgy. Alegre (Under Control)',
  },
  {
    name: 'Hamtic',
    district: 'South Antique',
    status: 'aid',
    statusLabel: 'Mutual Aid Active',
    availableTrucks: 2,
    totalTrucks: 2,
    crew: 10,
    hydrants: 12,
    contact: '(036) 540-9111',
    leadOfficer: 'SFO1 Arthur Nolasco',
    mutualAidTarget: 'Reinforcing San Jose Engine 2',
  },
  {
    name: 'Bugasong',
    district: 'Central Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 2,
    totalTrucks: 2,
    crew: 8,
    hydrants: 10,
    contact: '(036) 547-2000',
    leadOfficer: 'FO2 Carlos Rivera',
  },
  {
    name: 'Pandan',
    district: 'North Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 2,
    totalTrucks: 2,
    crew: 10,
    hydrants: 14,
    contact: '(036) 549-3000',
    leadOfficer: 'SFO1 Dante Perez',
  },
  {
    name: 'Culasi',
    district: 'North Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 2,
    totalTrucks: 2,
    crew: 11,
    hydrants: 12,
    contact: '(036) 548-1000',
    leadOfficer: 'SFO1 Elena Soriano',
  },
  {
    name: 'Barbaza',
    district: 'North Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 1,
    totalTrucks: 2,
    crew: 8,
    hydrants: 6,
    contact: '(036) 545-4000',
    leadOfficer: 'FO3 Jayson Villar',
  },
  {
    name: 'Tobias Fornier',
    district: 'South Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 2,
    totalTrucks: 2,
    crew: 9,
    hydrants: 9,
    contact: '(036) 541-6000',
    leadOfficer: 'FO2 Ronald Cruz',
  },
  {
    name: 'Patnongon',
    district: 'Central Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 2,
    totalTrucks: 2,
    crew: 8,
    hydrants: 11,
    contact: '(036) 544-8000',
    leadOfficer: 'SFO1 Neil Tan',
  },
  {
    name: 'Anini-y',
    district: 'South Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 1,
    totalTrucks: 1,
    crew: 7,
    hydrants: 5,
    contact: '(036) 542-1000',
    leadOfficer: 'FO2 Gabriel Ramos',
  },
  {
    name: 'Belison',
    district: 'Central Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 1,
    totalTrucks: 1,
    crew: 6,
    hydrants: 4,
    contact: '(036) 540-6500',
    leadOfficer: 'FO3 Victor Dela Cruz',
  },
  {
    name: 'Caluya',
    district: 'North Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 2,
    totalTrucks: 2,
    crew: 8,
    hydrants: 6,
    contact: '(036) 550-9000',
    leadOfficer: 'SFO2 Patrick Uy',
  },
  {
    name: 'Laua-an',
    district: 'Central Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 1,
    totalTrucks: 1,
    crew: 7,
    hydrants: 7,
    contact: '(036) 546-2000',
    leadOfficer: 'FO2 Leo Santos',
  },
  {
    name: 'Libertad',
    district: 'North Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 1,
    totalTrucks: 1,
    crew: 7,
    hydrants: 6,
    contact: '(036) 551-3000',
    leadOfficer: 'FO3 Noel Morales',
  },
  {
    name: 'San Remigio',
    district: 'Central Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 1,
    totalTrucks: 1,
    crew: 8,
    hydrants: 5,
    contact: '(036) 543-9000',
    leadOfficer: 'SFO1 Gary Flores',
  },
  {
    name: 'Sebaste',
    district: 'North Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 1,
    totalTrucks: 1,
    crew: 6,
    hydrants: 4,
    contact: '(036) 548-8000',
    leadOfficer: 'FO2 Alvin Dimas',
  },
  {
    name: 'Valderrama',
    district: 'Central Antique',
    status: 'ready',
    statusLabel: 'Operational Ready',
    availableTrucks: 1,
    totalTrucks: 1,
    crew: 7,
    hydrants: 5,
    contact: '(036) 544-1000',
    leadOfficer: 'FO3 Joel Bautista',
  },
];

const styles = `
  .pbfp-page {
    padding: 10px 1.5rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #EEF5FD;
    min-height: 100%;
    color: #0F172A;
  }

  /* ========== HEADER ROW ========== */
  .pbfp-header-hub {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .pbfp-header-left {
    display: flex;
    align-items: center;
    gap: 0.9rem;
  }

  .pbfp-header-icon-badge {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #E23632 0%, #B91C1C 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 1.25rem;
    box-shadow: 0 4px 14px rgba(226, 54, 50, 0.35);
    flex-shrink: 0;
  }

  .pbfp-header-title-box h1 {
    font-size: 1.35rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .pbfp-header-actions {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .pbfp-btn-gis {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 1.1rem;
    background: #0F172A;
    color: #FFFFFF;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.8rem;
    text-decoration: none;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .pbfp-btn-gis:hover {
    background: #1E293B;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.25);
  }

  /* ========== TOOLBAR HUB ========== */
  .pbfp-toolbar-box {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 0.75rem 1.15rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    flex-wrap: wrap;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.03);
  }

  .pbfp-filter-pills {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: #F1F5F9;
    padding: 0.25rem;
    border-radius: 10px;
  }

  .pbfp-filter-pill {
    padding: 0.4rem 0.85rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 700;
    border: none;
    background: transparent;
    color: #64748B;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pbfp-filter-pill:hover {
    color: #0F172A;
  }

  .pbfp-filter-pill.active {
    background: #E23632;
    color: #FFFFFF;
    box-shadow: 0 2px 8px rgba(226, 54, 50, 0.3);
  }

  .pbfp-pill-count {
    padding: 0.12rem 0.4rem;
    border-radius: 6px;
    font-size: 0.68rem;
    font-weight: 800;
    background: rgba(0, 0, 0, 0.08);
  }

  .pbfp-filter-pill.active .pbfp-pill-count {
    background: rgba(255, 255, 255, 0.25);
    color: #FFFFFF;
  }

  .pbfp-search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 999px;
    padding: 0.42rem 0.95rem;
    width: 250px;
    transition: all 0.15s;
  }

  .pbfp-search-box:focus-within {
    border-color: #E23632;
    background: #FFFFFF;
    box-shadow: 0 0 0 3px rgba(226, 54, 50, 0.1);
  }

  .pbfp-search-box i {
    color: #94A3B8;
    font-size: 0.8rem;
  }

  .pbfp-search-input {
    border: none;
    outline: none;
    font-size: 0.78rem;
    width: 100%;
    background: transparent;
    color: #0F172A;
    font-weight: 600;
    font-family: inherit;
  }

  .pbfp-search-input::placeholder {
    color: #94A3B8;
    font-weight: 500;
  }

  /* ========== 18 CLEAN & SLEEK MUNICIPAL TILES (10PX GAP) ========== */
  .pbfp-grid-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .pbfp-clean-card {
    background: #FFFFFF;
    border: 1.5px solid #E2E8F0;
    border-radius: 16px;
    padding: 1.25rem 1.3rem;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 1.25rem;
    cursor: pointer;
    transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    user-select: none;
    animation: pbfpCardReveal 0.42s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-clean-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.09), 0 0 0 1px #CBD5E1;
    border-color: #CBD5E1;
  }

  .pbfp-clean-card.responding {
    border-color: rgba(226, 54, 50, 0.35);
    background: linear-gradient(180deg, #FFFDFD 0%, #FFFFFF 100%);
    box-shadow: 0 4px 16px rgba(226, 54, 50, 0.08);
  }

  .pbfp-clean-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .pbfp-station-identity {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .pbfp-station-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.22;
    letter-spacing: -0.01em;
  }

  .pbfp-station-district {
    font-size: 0.72rem;
    color: #94A3B8;
    font-weight: 600;
    margin-top: 0.25rem;
  }

  /* Status Badges */
  .pbfp-tile-status-pill {
    font-size: 0.68rem;
    font-weight: 800;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    white-space: nowrap;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .pbfp-beacon-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .pbfp-tile-status-pill.ready {
    background: #ECFDF5;
    color: #059669;
    border: 1px solid #D1FAE5;
  }
  .pbfp-tile-status-pill.ready .pbfp-beacon-dot {
    background: #059669;
  }

  .pbfp-tile-status-pill.responding {
    background: #FFF1F2;
    color: #E23632;
    border: 1px solid #FFE4E6;
    box-shadow: 0 0 12px rgba(226, 54, 50, 0.2);
  }
  .pbfp-tile-status-pill.responding .pbfp-beacon-dot {
    background: #E23632;
    box-shadow: 0 0 6px #E23632;
    animation: pbfpBreathe 1s infinite alternate;
  }

  .pbfp-tile-status-pill.aid {
    background: #FFFBEB;
    color: #D97706;
    border: 1px solid #FEF3C7;
  }
  .pbfp-tile-status-pill.aid .pbfp-beacon-dot {
    background: #D97706;
  }

  /* Clean Footer Cue */
  .pbfp-clean-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.6rem;
    border-top: 1px solid #F1F5F9;
    font-size: 0.74rem;
    font-weight: 700;
    color: #64748B;
  }

  .pbfp-open-prompt {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #E23632;
    font-weight: 700;
    transition: transform 0.15s ease;
  }

  .pbfp-clean-card:hover .pbfp-open-prompt {
    transform: translateX(3px);
  }

  /* ========== 3-SECOND FLOATING FIRE LOADER (NO BACKGROUND CARD / CIRCLE ROTATING) ========== */
  .pbfp-fire-loader-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-fire-loader-stage {
    position: relative;
    width: 140px;
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pbfpFloatLevitate 2.5s ease-in-out infinite alternate;
  }

  .pbfp-fire-outer-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    padding: 6.5px;
    background: conic-gradient(from 0deg, #E23632 0%, #FF6B35 30%, #FFAA00 65%, transparent 80%, #E23632 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: pbfpRingSpin 1.6s linear infinite;
    filter: drop-shadow(0 0 16px rgba(226, 54, 50, 0.95)) drop-shadow(0 0 30px rgba(255, 107, 53, 0.7));
  }

  .pbfp-fire-outer-ring-orbit {
    position: absolute;
    inset: -7px;
    border-radius: 50%;
    padding: 2px;
    background: conic-gradient(from 180deg, rgba(255, 170, 0, 0.85) 0%, transparent 40%, rgba(226, 54, 50, 0.7) 80%, transparent 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: pbfpRingSpinReverse 2.4s linear infinite;
    filter: drop-shadow(0 0 10px rgba(255, 120, 40, 0.6));
  }

  .pbfp-fire-pulse-glow {
    position: absolute;
    width: 105px;
    height: 105px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(226, 54, 50, 0.35) 0%, rgba(255, 107, 53, 0.12) 65%, transparent 80%);
    animation: pbfpFlameBreathe 1.5s ease-in-out infinite alternate;
  }

  .pbfp-fire-logo-img {
    width: 72px;
    height: 72px;
    object-fit: contain;
    display: block;
    position: relative;
    z-index: 2;
    filter: drop-shadow(0 4px 16px rgba(226, 54, 50, 0.55));
    animation: pbfpFlameBreathe 1.5s ease-in-out infinite alternate;
  }

  .pbfp-ember {
    position: absolute;
    width: 4px;
    height: 4px;
    background: #FFAE00;
    border-radius: 50%;
    box-shadow: 0 0 8px #FF5100, 0 0 16px #FF1A00;
    opacity: 0;
  }

  .pbfp-ember:nth-child(1) { left: 15%; bottom: 20%; animation: pbfpEmberDrift 1.6s ease-out infinite 0.1s; }
  .pbfp-ember:nth-child(2) { right: 18%; bottom: 25%; animation: pbfpEmberDrift 1.9s ease-out infinite 0.3s; }
  .pbfp-ember:nth-child(3) { left: 45%; bottom: 10%; animation: pbfpEmberDrift 1.4s ease-out infinite 0.6s; }
  .pbfp-ember:nth-child(4) { right: 30%; bottom: 15%; animation: pbfpEmberDrift 1.8s ease-out infinite 0.9s; }

  /* ========== FULL STATION COMMAND MODAL ========== */
  .pbfp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 1.5rem;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-modal-card {
    background: #FFFFFF;
    border-radius: 24px;
    box-shadow: 0 30px 70px rgba(15, 23, 42, 0.3);
    border: 1px solid #E2E8F0;
    max-width: 580px;
    width: 100%;
    overflow: hidden;
    animation: pbfpModalPop 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-modal-header {
    padding: 1.35rem 1.6rem;
    background: #F8FAFC;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pbfp-modal-title-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .pbfp-modal-icon-badge {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: #FFF1F2;
    border: 1px solid #FFE4E6;
    color: #E23632;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
  }

  .pbfp-modal-title h3 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-modal-close {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #64748B;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.95rem;
    transition: all 0.15s;
  }

  .pbfp-modal-close:hover {
    background: #F1F5F9;
    color: #0F172A;
  }

  .pbfp-modal-body {
    padding: 1.6rem;
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
  }

  .pbfp-modal-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .pbfp-modal-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: #F8FAFC;
    padding: 0.85rem 1rem;
    border-radius: 12px;
    border: 1px solid #F1F5F9;
  }

  .pbfp-modal-field label {
    font-size: 0.68rem;
    font-weight: 800;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .pbfp-modal-field p {
    font-size: 0.92rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
  }

  .pbfp-modal-footer {
    padding: 1.1rem 1.6rem;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .pbfp-modal-btn {
    padding: 0.6rem 1.25rem;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 700;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .pbfp-modal-btn.primary {
    background: #E23632;
    color: #FFFFFF;
    border-color: #E23632;
  }

  .pbfp-modal-btn.primary:hover {
    background: #C42724;
  }

  @keyframes pbfpFloatLevitate {
    0% { transform: translateY(0px) scale(1); }
    100% { transform: translateY(-6px) scale(1.02); }
  }

  @keyframes pbfpRingSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes pbfpRingSpinReverse {
    0% { transform: rotate(360deg); }
    100% { transform: rotate(0deg); }
  }

  @keyframes pbfpFlameBreathe {
    0% { transform: scale(0.96); opacity: 0.85; }
    100% { transform: scale(1.05); opacity: 1; }
  }

  @keyframes pbfpEmberDrift {
    0% { opacity: 0; transform: translateY(0) scale(0.4); }
    40% { opacity: 1; transform: translateY(-20px) translateX(6px) scale(1); }
    100% { opacity: 0; transform: translateY(-50px) translateX(-8px) scale(0.2); }
  }

  @keyframes pbfpBreathe {
    0% { transform: scale(0.9); opacity: 0.8; }
    100% { transform: scale(1.3); opacity: 1; }
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

  @keyframes pbfpCardReveal {
    0% {
      opacity: 0;
      transform: translateY(16px) scale(0.96);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes pbfpModalPop {
    0% {
      opacity: 0;
      transform: scale(0.92) translateY(20px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* Responsive Breakpoints */
  @media (max-width: 1280px) {
    .pbfp-grid-cards {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 1024px) {
    .pbfp-grid-cards {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .pbfp-grid-cards {
      grid-template-columns: 1fr;
    }
    .pbfp-toolbar-box {
      flex-direction: column;
      align-items: stretch;
    }
    .pbfp-search-box {
      width: 100%;
    }
  }
`;

export default function MunicipalStatusPage() {
  const [filter, setFilter] = useState<'ALL' | 'responding' | 'aid' | 'ready'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<MunicipalStation | null>(null);
  const [isLoadingStation, setIsLoadingStation] = useState(false);

  const stations = municipalitiesList;

  // Filter & Search Logic
  const filtered = useMemo(() => {
    return stations.filter((st) => {
      const matchesTab = filter === 'ALL' || st.status === filter;
      const matchesQuery =
        searchQuery.trim() === '' ||
        st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.contact.includes(searchQuery);
      return matchesTab && matchesQuery;
    });
  }, [stations, filter, searchQuery]);

  const respondingCount = stations.filter((s) => s.status === 'responding').length;
  const aidCount = stations.filter((s) => s.status === 'aid').length;
  const readyCount = stations.filter((s) => s.status === 'ready').length;

  const handleStationClick = (st: MunicipalStation) => {
    setIsLoadingStation(true);
    setTimeout(() => {
      setIsLoadingStation(false);
      setSelectedStation(st);
    }, 1000);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="pbfp-page">
        {/* Header Bar */}
        <div className="pbfp-header-hub">
          <div className="pbfp-header-left">
            <div className="pbfp-header-icon-badge">
              <i className="fa-solid fa-building-shield" />
            </div>
            <div className="pbfp-header-title-box">
              <h1>Municipal Fire Station Status & Readiness</h1>
            </div>
          </div>
          <div className="pbfp-header-actions">
            <Link href="/provincial-bfp/gis-map" className="pbfp-btn-gis">
              <i className="fa-solid fa-map-location-dot" /> Open GIS View
            </Link>
          </div>
        </div>

        {/* Toolbar Hub */}
        <div className="pbfp-toolbar-box">
          <div className="pbfp-filter-pills">
            <button
              type="button"
              className={`pbfp-filter-pill ${filter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              <span>All Stations</span>
              <span className="pbfp-pill-count">{stations.length}</span>
            </button>
            <button
              type="button"
              className={`pbfp-filter-pill ${filter === 'responding' ? 'active' : ''}`}
              onClick={() => setFilter('responding')}
            >
              <span>Responding</span>
              <span className="pbfp-pill-count">{respondingCount}</span>
            </button>
            <button
              type="button"
              className={`pbfp-filter-pill ${filter === 'aid' ? 'active' : ''}`}
              onClick={() => setFilter('aid')}
            >
              <span>Mutual Aid</span>
              <span className="pbfp-pill-count">{aidCount}</span>
            </button>
            <button
              type="button"
              className={`pbfp-filter-pill ${filter === 'ready' ? 'active' : ''}`}
              onClick={() => setFilter('ready')}
            >
              <span>Operational Ready</span>
              <span className="pbfp-pill-count">{readyCount}</span>
            </button>
          </div>

          <div className="pbfp-search-box">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              className="pbfp-search-input"
              placeholder="Search station or hotline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        {/* 18 Minimal & Aesthetic Municipal Tiles (8px gap) */}
        <div className="pbfp-grid-cards">
          {filtered.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem 1rem', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', color: '#64748B' }}>
              <i className="fa-solid fa-building-shield" style={{ fontSize: '2.5rem', color: '#CBD5E1', marginBottom: '0.5rem', display: 'block' }} />
              <strong style={{ display: 'block', color: '#0F172A', fontSize: '1rem' }}>No matching fire stations found</strong>
              <span style={{ fontSize: '0.8rem' }}>Try clearing your search query or choosing another status tab.</span>
            </div>
          ) : (
            filtered.map((m, index) => (
              <div
                className={`pbfp-clean-card ${m.status === 'responding' ? 'responding' : ''}`}
                key={m.name}
                style={{ animationDelay: `${Math.min(index * 35, 400)}ms` }}
                onClick={() => handleStationClick(m)}
              >
                <div className="pbfp-clean-card-header">
                  <div className="pbfp-station-identity">
                    <span className="pbfp-station-title">{m.name}</span>
                    <span className="pbfp-station-district">{m.district}</span>
                  </div>
                  <span className={`pbfp-tile-status-pill ${m.status}`}>
                    <span className="pbfp-beacon-dot" />
                    <span>{m.status === 'responding' ? `Responding (${m.respondingCount || 1})` : m.statusLabel}</span>
                  </span>
                </div>

                <div className="pbfp-clean-card-footer">
                  <span>Station Details</span>
                  <span className="pbfp-open-prompt">
                    Open <i className="fa-solid fa-arrow-right" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3-Second Floating Fire Loader */}
      {isLoadingStation && (
        <div className="pbfp-fire-loader-overlay">
          <div className="pbfp-fire-loader-stage">
            <div className="pbfp-fire-outer-ring" />
            <div className="pbfp-fire-outer-ring-orbit" />
            <div className="pbfp-fire-pulse-glow" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/fire logo.webp"
              alt="Bureau of Fire Protection"
              className="pbfp-fire-logo-img"
            />
            <div className="pbfp-ember" />
            <div className="pbfp-ember" />
            <div className="pbfp-ember" />
            <div className="pbfp-ember" />
          </div>
        </div>
      )}

      {/* Full Station Command Modal (Opens after 3s loader) */}
      {selectedStation && (
        <div className="pbfp-modal-overlay" onClick={() => setSelectedStation(null)}>
          <div className="pbfp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pbfp-modal-header">
              <div className="pbfp-modal-title-group">
                <div className="pbfp-modal-icon-badge">
                  <i className="fa-solid fa-building-shield" />
                </div>
                <div className="pbfp-modal-title">
                  <h3>{selectedStation.name} Fire Station</h3>
                </div>
              </div>
              <button
                type="button"
                className="pbfp-modal-close"
                onClick={() => setSelectedStation(null)}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="pbfp-modal-body">
              <div className="pbfp-modal-grid">
                <div className="pbfp-modal-field">
                  <label>District Area</label>
                  <p>{selectedStation.district}</p>
                </div>
                <div className="pbfp-modal-field">
                  <label>Operational Status</label>
                  <p style={{ color: selectedStation.status === 'responding' ? '#E23632' : selectedStation.status === 'aid' ? '#D97706' : '#059669' }}>
                    {selectedStation.statusLabel}
                  </p>
                </div>
              </div>

              {selectedStation.activeAlarms && (
                <div className="pbfp-modal-field" style={{ background: '#FFF1F2', borderColor: '#FFE4E6' }}>
                  <label style={{ color: '#E23632' }}>Active Response Incident</label>
                  <p style={{ color: '#E23632' }}>{selectedStation.activeAlarms}</p>
                </div>
              )}

              {selectedStation.mutualAidTarget && (
                <div className="pbfp-modal-field" style={{ background: '#FFFBEB', borderColor: '#FEF3C7' }}>
                  <label style={{ color: '#D97706' }}>Mutual Aid Coordination</label>
                  <p style={{ color: '#D97706' }}>{selectedStation.mutualAidTarget}</p>
                </div>
              )}

              <div className="pbfp-modal-grid">
                <div className="pbfp-modal-field">
                  <label>Station Commander</label>
                  <p>{selectedStation.leadOfficer}</p>
                </div>
                <div className="pbfp-modal-field">
                  <label>24/7 Dispatch Hotline</label>
                  <p><a href={`tel:${selectedStation.contact.replace(/[^0-9]/g, '')}`} style={{ color: '#2563EB', textDecoration: 'none' }}>{selectedStation.contact}</a></p>
                </div>
              </div>

              <div className="pbfp-modal-grid">
                <div className="pbfp-modal-field">
                  <label>Fleet Readiness</label>
                  <p>{selectedStation.availableTrucks} of {selectedStation.totalTrucks} Operational ({Math.round((selectedStation.availableTrucks / selectedStation.totalTrucks) * 100)}%)</p>
                </div>
                <div className="pbfp-modal-field">
                  <label>Active Duty Crew</label>
                  <p>{selectedStation.crew} Firefighters on Shift</p>
                </div>
              </div>

              <div className="pbfp-modal-field">
                <label>Water Supply & Hydrants</label>
                <p>{selectedStation.hydrants} Verified High-Pressure Municipal Hydrants</p>
              </div>
            </div>

            <div className="pbfp-modal-footer">
              <button
                type="button"
                className="pbfp-modal-btn"
                onClick={() => setSelectedStation(null)}
              >
                Close
              </button>
              <Link
                href="/provincial-bfp/gis-map"
                className="pbfp-modal-btn primary"
              >
                <i className="fa-solid fa-map-location-dot" /> Locate in Provincial GIS View
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
