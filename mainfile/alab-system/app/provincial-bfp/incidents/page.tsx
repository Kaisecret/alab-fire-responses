'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

type AlarmClass = 'first' | 'second' | 'third' | 'controlled' | 'resolved';

type IncidentRecord = {
  id: string;
  municipality: string;
  location: string;
  type: string;
  typeIcon: string;
  alarmLevel: string;
  alarmClass: AlarmClass;
  assignedStation: string;
  trucksDeployed: string;
  engines: number;
  tankers: number;
  mutualAid?: string;
  reportedTime: string;
  reportedExact: string;
  status: 'ACTIVE' | 'RESOLVED';
  leadOfficer: string;
  casualties: string;
  waterSupplyStatus: string;
};

const initialIncidents: IncidentRecord[] = [
  {
    id: 'INC-ANT-2026-0814',
    municipality: 'San Jose de Buenavista',
    location: 'Brgy. Funda-Dalipe, Commercial District',
    type: 'Commercial Structure Fire',
    typeIcon: 'fa-solid fa-building-fire',
    alarmLevel: '2nd Alarm',
    alarmClass: 'second',
    assignedStation: 'San Jose Main Station',
    trucksDeployed: '3 Engines, 1 Tanker',
    engines: 3,
    tankers: 1,
    mutualAid: 'Hamtic BFP (Engine 2)',
    reportedTime: '17:35 PHT (25m ago)',
    reportedExact: 'Aug 14, 2026 • 5:35:12 PM',
    status: 'ACTIVE',
    leadOfficer: 'Insp. Rafael Mendoza',
    casualties: '0 Reported • Evacuation Complete',
    waterSupplyStatus: 'Hydrant + 10kL Tanker Shuttle Active',
  },
  {
    id: 'INC-ANT-2026-0813',
    municipality: 'Sibalom',
    location: 'Brgy. Bari, Purok 4',
    type: 'Residential Fire',
    typeIcon: 'fa-solid fa-house-fire',
    alarmLevel: '1st Alarm',
    alarmClass: 'first',
    assignedStation: 'Sibalom Fire Station',
    trucksDeployed: '2 Engines',
    engines: 2,
    tankers: 0,
    reportedTime: '17:12 PHT (48m ago)',
    reportedExact: 'Aug 14, 2026 • 5:12:00 PM',
    status: 'ACTIVE',
    leadOfficer: 'SFO2 Mario Gomez',
    casualties: 'None • All occupants accounted for',
    waterSupplyStatus: 'Direct River Drafting + Engine Pump',
  },
  {
    id: 'INC-ANT-2026-0812',
    municipality: 'Tibiao',
    location: 'Brgy. Alegre, Highway vicinity',
    type: 'Grassland / Brush Fire',
    typeIcon: 'fa-solid fa-fire-flame-curved',
    alarmLevel: 'Under Control',
    alarmClass: 'controlled',
    assignedStation: 'Tibiao Fire Station',
    trucksDeployed: '1 Engine, 1 Tanker',
    engines: 1,
    tankers: 1,
    reportedTime: '16:45 PHT (1h 15m ago)',
    reportedExact: 'Aug 14, 2026 • 4:45:30 PM',
    status: 'ACTIVE',
    leadOfficer: 'FO3 Dennis Alcala',
    casualties: 'None',
    waterSupplyStatus: 'Overhauling & Mopping Up Perimeter',
  },
  {
    id: 'INC-ANT-2026-0811',
    municipality: 'Culasi',
    location: 'Brgy. Centro Poblacion',
    type: 'Electrical Short Circuit',
    typeIcon: 'fa-solid fa-bolt-lightning',
    alarmLevel: 'Resolved',
    alarmClass: 'resolved',
    assignedStation: 'Culasi Fire Station',
    trucksDeployed: '1 Engine',
    engines: 1,
    tankers: 0,
    reportedTime: '12:20 PHT (5h ago)',
    reportedExact: 'Aug 14, 2026 • 12:20:10 PM',
    status: 'RESOLVED',
    leadOfficer: 'SFO1 Elena Soriano',
    casualties: 'None • Circuit Breaker Replaced',
    waterSupplyStatus: 'Fire Out Confirmed at 12:45 PHT',
  },
];

const pageStyles = `
  .pbfp-incidents-page {
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
    width: 46px;
    height: 46px;
    border-radius: 14px;
    background: linear-gradient(135deg, #E23632 0%, #B91C1C 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 1.35rem;
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
    padding: 0.6rem 1.15rem;
    background: #0F172A;
    color: #FFFFFF;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.82rem;
    text-decoration: none;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .pbfp-btn-gis:hover {
    background: #1E293B;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.25);
  }

  /* ========== 4 TACTICAL KPI CARDS ========== */
  .pbfp-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .pbfp-kpi-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 1rem 1.15rem;
    display: flex;
    align-items: center;
    gap: 0.9rem;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02);
    transition: transform 0.18s, box-shadow 0.18s;
    animation: pbfpCardReveal 0.42s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  }

  .pbfp-kpi-badge {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    flex-shrink: 0;
  }

  .pbfp-kpi-badge.red { background: #FFF1F2; border: 1px solid #FFE4E6; color: #E23632; }
  .pbfp-kpi-badge.blue { background: #EFF6FF; border: 1px solid #DBEAFE; color: #2563EB; }
  .pbfp-kpi-badge.orange { background: #FFFBEB; border: 1px solid #FEF3C7; color: #D97706; }
  .pbfp-kpi-badge.green { background: #ECFDF5; border: 1px solid #D1FAE5; color: #059669; }

  .pbfp-kpi-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .pbfp-kpi-lbl {
    font-size: 0.68rem;
    font-weight: 800;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .pbfp-kpi-val {
    font-size: 1.45rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.15;
    margin: 0.1rem 0;
  }

  .pbfp-kpi-sub {
    font-size: 0.72rem;
    color: #64748B;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ========== TABLE SECTION CARD ========== */
  .pbfp-table-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
    display: flex;
    flex-direction: column;
    animation: pbfpCardReveal 0.48s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-toolbar {
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid #F1F5F9;
    flex-wrap: wrap;
    background: #FFFFFF;
  }

  /* Modern Tab Filters */
  .pbfp-tab-pills {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: #F1F5F9;
    padding: 0.3rem;
    border-radius: 10px;
  }

  .pbfp-tab-pill {
    padding: 0.45rem 0.95rem;
    border-radius: 8px;
    font-size: 0.76rem;
    font-weight: 700;
    border: none;
    background: transparent;
    color: #64748B;
    cursor: pointer;
    transition: all 0.16s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pbfp-tab-pill:hover {
    color: #0F172A;
  }

  .pbfp-tab-pill.active {
    background: #E23632;
    color: #FFFFFF;
    box-shadow: 0 2px 8px rgba(226, 54, 50, 0.35);
  }

  .pbfp-tab-count {
    padding: 0.15rem 0.45rem;
    border-radius: 6px;
    font-size: 0.68rem;
    font-weight: 800;
    background: rgba(0, 0, 0, 0.08);
  }

  .pbfp-tab-pill.active .pbfp-tab-count {
    background: rgba(255, 255, 255, 0.25);
    color: #FFFFFF;
  }

  /* Search and Secondary Filter */
  .pbfp-search-wrapper {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .pbfp-search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 999px;
    padding: 0.42rem 0.95rem;
    width: 240px;
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

  /* Table Style */
  .pbfp-table-responsive {
    width: 100%;
    overflow-x: auto;
  }

  .pbfp-roster-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    text-align: left;
  }

  .pbfp-roster-table th {
    background: #F8FAFC;
    color: #475569;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.9rem 1.15rem;
    border-bottom: 1px solid #E2E8F0;
    white-space: nowrap;
  }

  .pbfp-roster-table td {
    padding: 1rem 1.15rem;
    border-bottom: 1px solid #F1F5F9;
    color: #1E293B;
    vertical-align: middle;
    transition: background 0.15s;
  }

  .pbfp-roster-table tbody tr {
    animation: pbfpRowReveal 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-roster-table tr:hover td {
    background: #FAFCFE;
  }

  /* Reference ID Badge */
  .pbfp-ref-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
    font-weight: 800;
    font-size: 0.78rem;
    color: #0F172A;
    background: #F1F5F9;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    border: 1px solid #E2E8F0;
    white-space: nowrap;
  }

  .pbfp-pulse-beacon {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
  }

  .pbfp-pulse-beacon.active {
    background: #E23632;
    box-shadow: 0 0 8px #E23632;
    animation: pbfpBeaconBreathe 1.2s infinite alternate;
  }

  .pbfp-pulse-beacon.resolved {
    background: #059669;
    box-shadow: 0 0 6px #059669;
  }

  /* Location Group */
  .pbfp-loc-box {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .pbfp-loc-muni {
    font-weight: 800;
    color: #0F172A;
    font-size: 0.86rem;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pbfp-loc-detail {
    font-size: 0.74rem;
    color: #64748B;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .pbfp-loc-detail i {
    color: #E23632;
    font-size: 0.72rem;
  }

  /* Classification Badge */
  .pbfp-class-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 600;
    font-size: 0.78rem;
    color: #334155;
  }

  .pbfp-class-tag i {
    color: #E23632;
    font-size: 0.82rem;
  }

  /* Alarm Chips */
  .pbfp-alarm-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.24rem 0.75rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .pbfp-alarm-pill.second {
    background: #FFF1F2;
    color: #E23632;
    border: 1px solid #FFE4E6;
    box-shadow: 0 0 10px rgba(226, 54, 50, 0.12);
  }

  .pbfp-alarm-pill.first {
    background: #FFFBEB;
    color: #D97706;
    border: 1px solid #FEF3C7;
  }

  .pbfp-alarm-pill.controlled {
    background: #ECFDF5;
    color: #059669;
    border: 1px solid #D1FAE5;
  }

  .pbfp-alarm-pill.resolved {
    background: #F1F5F9;
    color: #475569;
    border: 1px solid #E2E8F0;
  }

  /* Apparatus Fleet Summary */
  .pbfp-fleet-stack {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .pbfp-fleet-main {
    font-size: 0.78rem;
    font-weight: 700;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .pbfp-fleet-main i {
    color: #2563EB;
    font-size: 0.75rem;
  }

  .pbfp-fleet-aid {
    font-size: 0.7rem;
    color: #D97706;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  /* Action Buttons */
  .pbfp-row-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .pbfp-action-btn {
    padding: 0.35rem 0.7rem;
    border-radius: 6px;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #475569;
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  .pbfp-action-btn:hover {
    background: #F8FAFC;
    color: #E23632;
    border-color: #CBD5E1;
  }

  .pbfp-action-btn.primary {
    background: #FFF1F2;
    color: #E23632;
    border-color: #FFE4E6;
  }

  .pbfp-action-btn.primary:hover {
    background: #E23632;
    color: #FFFFFF;
    border-color: #E23632;
  }

  /* Table Footer */
  .pbfp-table-footer {
    padding: 0.85rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #F1F5F9;
    font-size: 0.76rem;
    color: #64748B;
    font-weight: 600;
    background: #FFFFFF;
  }

  /* ========== 1-SECOND FLOATING FIRE LOADER ========== */
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

  /* ========== MODAL CARD ========== */
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
    padding: 1.25rem 1.5rem;
    background: #F8FAFC;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pbfp-modal-title {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .pbfp-modal-title h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-modal-close {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #64748B;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.15s;
  }

  .pbfp-modal-close:hover {
    background: #F1F5F9;
    color: #0F172A;
  }

  .pbfp-modal-body {
    padding: 1.5rem;
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
    gap: 0.2rem;
    background: #F8FAFC;
    padding: 0.75rem 0.9rem;
    border-radius: 10px;
    border: 1px solid #F1F5F9;
  }

  .pbfp-modal-field label {
    font-size: 0.7rem;
    font-weight: 800;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .pbfp-modal-field p {
    font-size: 0.84rem;
    font-weight: 700;
    color: #0F172A;
    margin: 0;
  }

  .pbfp-modal-footer {
    padding: 1rem 1.5rem;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
  }

  .pbfp-modal-btn {
    padding: 0.55rem 1.15rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 700;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s;
  }

  .pbfp-modal-btn.primary {
    background: #E23632;
    color: #FFFFFF;
    border-color: #E23632;
  }

  .pbfp-modal-btn.primary:hover {
    background: #C42724;
  }

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

  @keyframes pbfpRowReveal {
    0% {
      opacity: 0;
      transform: translateY(8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
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

  @keyframes pbfpBeaconBreathe {
    0% { transform: scale(0.9); opacity: 0.8; }
    100% { transform: scale(1.3); opacity: 1; }
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* Responsive Adjustments */
  @media (max-width: 1024px) {
    .pbfp-kpi-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .pbfp-kpi-grid {
      grid-template-columns: 1fr;
    }
    .pbfp-toolbar {
      flex-direction: column;
      align-items: stretch;
    }
    .pbfp-search-box {
      width: 100%;
    }
  }
`;

function FastNumber({ value, duration = 650 }: { value: string | number; duration?: number }) {
  const [display, setDisplay] = useState<string>(() => {
    if (typeof value === 'number') return '0';
    return String(value).replace(/\d+/g, '0');
  });

  useEffect(() => {
    let startTimestamp: number | null = null;
    const strVal = String(value);
    const matches = strVal.match(/\d+/g);
    if (!matches) {
      return;
    }

    const targets = matches.map(Number);
    let frameId: number;

    const step = (now: number) => {
      if (!startTimestamp) startTimestamp = now;
      const progress = Math.min((now - startTimestamp) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      let matchIndex = 0;
      const currentText = strVal.replace(/\d+/g, () => {
        const target = targets[matchIndex];
        const current = Math.round(target * ease);
        matchIndex++;
        return String(current);
      });

      setDisplay(currentText);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplay(strVal);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return <span>{String(value).match(/\d+/g) ? display : String(value)}</span>;
}

export default function ProvinceIncidentsPage() {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [isLoadingIncident, setIsLoadingIncident] = useState(false);

  const incidents = initialIncidents;

  // Filter and Search Logic
  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      const matchesTab = filter === 'ALL' || inc.status === filter;
      const matchesQuery =
        searchQuery.trim() === '' ||
        inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.municipality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesQuery;
    });
  }, [incidents, filter, searchQuery]);

  const activeCount = incidents.filter((i) => i.status === 'ACTIVE').length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length;

  const handleIncidentView = (inc: IncidentRecord) => {
    setIsLoadingIncident(true);
    setTimeout(() => {
      setIsLoadingIncident(false);
      setSelectedIncident(inc);
    }, 1000);
  };

  return (
    <>
      <style>{pageStyles}</style>
      <div className="pbfp-incidents-page">
        {/* Header Bar */}
        <div className="pbfp-header-hub">
          <div className="pbfp-header-left">
            <div className="pbfp-header-icon-badge">
              <i className="fa-solid fa-fire" />
            </div>
            <div className="pbfp-header-title-box">
              <h1>Province-Wide Incident Command Roster</h1>
            </div>
          </div>
          <div className="pbfp-header-actions">
            <Link href="/provincial-bfp/gis-map" className="pbfp-btn-gis">
              <i className="fa-solid fa-map-location-dot" /> Open GIS View
            </Link>
          </div>
        </div>

        {/* 4 Tactical KPI Stat Cards */}
        <div className="pbfp-kpi-grid">
          <div className="pbfp-kpi-card" style={{ animationDelay: '0ms' }}>
            <div className="pbfp-kpi-badge red">
              <i className="fa-solid fa-fire-burner" />
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-lbl">Active Operations</span>
              <span className="pbfp-kpi-val"><FastNumber value={activeCount} /></span>
              <span className="pbfp-kpi-sub">In-Progress Alarms</span>
            </div>
          </div>

          <div className="pbfp-kpi-card" style={{ animationDelay: '50ms' }}>
            <div className="pbfp-kpi-badge blue">
              <i className="fa-solid fa-truck-moving" />
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-lbl">Fleet Deployed</span>
              <span className="pbfp-kpi-val"><FastNumber value="7 Units" /></span>
              <span className="pbfp-kpi-sub">5 Engines • 2 Tankers</span>
            </div>
          </div>

          <div className="pbfp-kpi-card" style={{ animationDelay: '100ms' }}>
            <div className="pbfp-kpi-badge orange">
              <i className="fa-solid fa-building-shield" />
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-lbl">Responding Stations</span>
              <span className="pbfp-kpi-val"><FastNumber value="3 Stations" /></span>
              <span className="pbfp-kpi-sub">San Jose, Sibalom, Tibiao</span>
            </div>
          </div>

          <div className="pbfp-kpi-card" style={{ animationDelay: '150ms' }}>
            <div className="pbfp-kpi-badge green">
              <i className="fa-solid fa-circle-check" />
            </div>
            <div className="pbfp-kpi-body">
              <span className="pbfp-kpi-lbl">Resolved Today</span>
              <span className="pbfp-kpi-val"><FastNumber value={resolvedCount} /></span>
              <span className="pbfp-kpi-sub">100% Contained (Culasi)</span>
            </div>
          </div>
        </div>

        {/* Main Incident Command Table Card */}
        <div className="pbfp-table-card">
          <div className="pbfp-toolbar">
            <div className="pbfp-tab-pills">
              <button
                type="button"
                className={`pbfp-tab-pill ${filter === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => setFilter('ACTIVE')}
              >
                <span>Active Incidents</span>
                <span className="pbfp-tab-count">{activeCount}</span>
              </button>
              <button
                type="button"
                className={`pbfp-tab-pill ${filter === 'RESOLVED' ? 'active' : ''}`}
                onClick={() => setFilter('RESOLVED')}
              >
                <span>Resolved Today</span>
                <span className="pbfp-tab-count">{resolvedCount}</span>
              </button>
              <button
                type="button"
                className={`pbfp-tab-pill ${filter === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilter('ALL')}
              >
                <span>All Incidents</span>
                <span className="pbfp-tab-count">{incidents.length}</span>
              </button>
            </div>

            <div className="pbfp-search-wrapper">
              <div className="pbfp-search-box">
                <i className="fa-solid fa-magnifying-glass" />
                <input
                  type="text"
                  className="pbfp-search-input"
                  placeholder="Search municipality, code, or type..."
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
          </div>

          <div className="pbfp-table-responsive">
            <table className="pbfp-roster-table">
              <thead>
                <tr>
                  <th>Incident Reference</th>
                  <th>Municipality & Location</th>
                  <th>Classification</th>
                  <th>Alarm Status</th>
                  <th>Units Dispatched</th>
                  <th>Reported Time</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B' }}>
                      <i className="fa-solid fa-shield-heart" style={{ fontSize: '2rem', color: '#CBD5E1', marginBottom: '0.5rem', display: 'block' }} />
                      <strong style={{ display: 'block', color: '#0F172A', fontSize: '0.92rem' }}>No matching incidents found</strong>
                      <span style={{ fontSize: '0.78rem' }}>Try clearing your search query or selecting another filter tab.</span>
                    </td>
                  </tr>
                ) : (
                  filtered.map((inc, index) => (
                    <tr key={inc.id} style={{ animationDelay: `${index * 45}ms` }}>
                      {/* Incident Ref */}
                      <td>
                        <div className="pbfp-ref-badge">
                          <span className={`pbfp-pulse-beacon ${inc.status === 'ACTIVE' ? 'active' : 'resolved'}`} />
                          <span>{inc.id}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td>
                        <div className="pbfp-loc-box">
                          <div className="pbfp-loc-muni">
                            <span>{inc.municipality}</span>
                          </div>
                          <div className="pbfp-loc-detail">
                            <i className="fa-solid fa-location-dot" />
                            <span>{inc.location}</span>
                          </div>
                        </div>
                      </td>

                      {/* Classification */}
                      <td>
                        <div className="pbfp-class-tag">
                          <i className={inc.typeIcon} />
                          <span>{inc.type}</span>
                        </div>
                      </td>

                      {/* Alarm Status */}
                      <td>
                        <span className={`pbfp-alarm-pill ${inc.alarmClass}`}>{inc.alarmLevel}</span>
                      </td>

                      {/* Fleet Units */}
                      <td>
                        <div className="pbfp-fleet-stack">
                          <div className="pbfp-fleet-main">
                            <i className="fa-solid fa-truck-moving" />
                            <span>{inc.trucksDeployed}</span>
                          </div>
                          {inc.mutualAid && (
                            <div className="pbfp-fleet-aid">
                              <i className="fa-solid fa-handshake-angle" />
                              <span>{inc.mutualAid}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td>
                        <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>{inc.reportedTime}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{inc.assignedStation}</div>
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="pbfp-row-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="pbfp-action-btn primary"
                            onClick={() => handleIncidentView(inc)}
                          >
                            <i className="fa-solid fa-eye" /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pbfp-table-footer">
            <span>
              Showing <strong>{filtered.length}</strong> of <strong>{incidents.length}</strong> total province incidents
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="pbfp-pulse-beacon active" /> Live Provincial Operations Feed
            </span>
          </div>
        </div>
      </div>

      {/* 1-Second Floating Fire Loader */}
      {isLoadingIncident && (
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

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="pbfp-modal-overlay" onClick={() => setSelectedIncident(null)}>
          <div className="pbfp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pbfp-modal-header">
              <div className="pbfp-modal-title">
                <span className={`pbfp-alarm-pill ${selectedIncident.alarmClass}`}>
                  {selectedIncident.alarmLevel}
                </span>
                <h3>{selectedIncident.id}</h3>
              </div>
              <button
                type="button"
                className="pbfp-modal-close"
                onClick={() => setSelectedIncident(null)}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="pbfp-modal-body">
              <div className="pbfp-modal-grid">
                <div className="pbfp-modal-field">
                  <label>Municipality</label>
                  <p>{selectedIncident.municipality}</p>
                </div>
                <div className="pbfp-modal-field">
                  <label>Assigned Station</label>
                  <p>{selectedIncident.assignedStation}</p>
                </div>
              </div>

              <div className="pbfp-modal-field">
                <label>Exact Location</label>
                <p>{selectedIncident.location}</p>
              </div>

              <div className="pbfp-modal-grid">
                <div className="pbfp-modal-field">
                  <label>Classification</label>
                  <p>{selectedIncident.type}</p>
                </div>
                <div className="pbfp-modal-field">
                  <label>Reported Timestamp</label>
                  <p>{selectedIncident.reportedExact}</p>
                </div>
              </div>

              <div className="pbfp-modal-grid">
                <div className="pbfp-modal-field">
                  <label>Apparatus Deployed</label>
                  <p>{selectedIncident.trucksDeployed}</p>
                </div>
                <div className="pbfp-modal-field">
                  <label>Incident Commander</label>
                  <p>{selectedIncident.leadOfficer}</p>
                </div>
              </div>

              <div className="pbfp-modal-field">
                <label>Casualties & Civilians</label>
                <p>{selectedIncident.casualties}</p>
              </div>

              <div className="pbfp-modal-field">
                <label>Water Supply & Logistics</label>
                <p>{selectedIncident.waterSupplyStatus}</p>
              </div>
            </div>

            <div className="pbfp-modal-footer">
              <button
                type="button"
                className="pbfp-modal-btn"
                onClick={() => setSelectedIncident(null)}
              >
                Close
              </button>
              <Link
                href="/provincial-bfp/gis-map"
                className="pbfp-modal-btn primary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <i className="fa-solid fa-map-location-dot" /> Track in GIS
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
