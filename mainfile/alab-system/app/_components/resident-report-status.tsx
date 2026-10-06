"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useMemo, useState } from "react";
import { fireReportStatusLabels, type FireReportStatus } from "../../lib/fire-reports/types";
import { useResidentLanguage, type ResidentLanguage } from "../_lib/resident-i18n";
import { situationForFireTypes } from "../../lib/fire-reports/fire-type-situation";
import { SharedIncidentCard, SharedIncidentPopup, type SharedIncident } from "./resident-shared-incident";

type Report = {
  id: string;
  reference_number: string;
  status: FireReportStatus;
  can_edit?: boolean;
  fire_type: string;
  /** Every kind of fire reported; fire_type is the one that set the level. */
  fire_types?: string[] | null;
  description: string;
  nearest_landmark: string | null;
  municipality: string;
  barangay: string;
  submitted_at: string;
  structure_material?: string | null;
  reported_house_density?: string | null;
  house_density?: string | null;
  route_accessibility?: string | null;
  weather_temperature?: number | string | null;
  weather_humidity?: number | string | null;
  weather_wind_speed?: number | string | null;
  weather_wind_direction?: number | string | null;
  weather_wind_condition?: string | null;
  calculated_severity?: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | null;
  severity_score?: number | null;
  severity_factors?: string[] | null;
  history: Array<{ next_status: FireReportStatus; resident_message: string | null; created_at: string }>;
  photos: Array<{ url: string | null }>;
  /** Present when other residents reported the same fire within 100 m. */
  incident?: SharedIncident | null;
};

const detailStyles = `
  .resident-report-detail { min-height: 100vh; padding: 1.4rem 1rem 8rem; background: #fbfaf9; color: #1e293b; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .resident-report-detail-inner { width: min(100%, 51rem); margin: 0 auto; }
  .resident-already-notice { display:flex; align-items:flex-start; gap:.75rem; margin-bottom:1rem; padding:.95rem 1rem; border:1px solid #BFDBFE; border-radius:1rem; background:#EFF6FF; color:#1E3A8A; animation:alreadyIn .3s ease both; }
  .resident-already-icon { flex:0 0 auto; width:2.2rem; height:2.2rem; display:grid; place-items:center; border-radius:.75rem; background:#DBEAFE; color:#1D4ED8; }
  .resident-already-notice div { flex:1; min-width:0; }
  .resident-already-notice strong { display:block; font-size:.9rem; font-weight:850; }
  .resident-already-notice p { margin:.25rem 0 0; color:#334155; font-size:.8rem; line-height:1.45; }
  .resident-already-notice button { flex:0 0 auto; width:1.9rem; height:1.9rem; border:0; border-radius:50%; background:transparent; color:#1E3A8A; cursor:pointer; }
  @keyframes alreadyIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
  .resident-detail-heading { display:flex; align-items:center; gap:.75rem; margin-bottom:1rem; }
  .resident-detail-back { width:2.25rem; height:2.25rem; display:grid; place-items:center; border:0; border-radius:.65rem; color:#334155; background:#fff; font-size:1.5rem; text-decoration:none; box-shadow:0 1px 3px rgba(15,23,42,.1); }
  .resident-detail-heading h1 { margin:0; font-size:1.32rem; font-weight:800; }
  .resident-detail-hero { display:flex; justify-content:space-between; align-items:center; gap:.8rem; padding:1rem; margin-bottom:1rem; border:1px solid #ffcaca; border-radius:1rem; background:#fff7f6; flex-wrap:wrap; }
  .resident-detail-reference { display:flex; align-items:center; gap:.7rem; font-size:1.08rem; font-weight:800; }
  .resident-detail-reference-icon { display:block; width:1.55rem; height:1.55rem; object-fit:contain; }
  .resident-hero-badges { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
  .resident-status-pill { display:inline-flex; align-items:center; gap:.35rem; border-radius:99px; padding:.4rem .7rem; background:#e32118; color:#fff; font-size:.75rem; font-weight:800; white-space:nowrap; }
  .resident-status-pill::before { content:''; width:.4rem; height:.4rem; border-radius:50%; background:currentColor; }

  /* Severity Badge */
  .severity-pill { display:inline-flex; align-items:center; gap:.3rem; border-radius:99px; padding:.4rem .7rem; font-size:.72rem; font-weight:850; letter-spacing:.03em; text-transform:uppercase; }
  .severity-pill.CRITICAL { background:#7F1D1D; color:#FEE2E2; border:1px solid #B91C1C; }
  .severity-pill.HIGH { background:#991B1B; color:#FEF2F2; border:1px solid #DC2626; }
  .severity-pill.MODERATE { background:#D97706; color:#FFFBEB; border:1px solid #F59E0B; }
  .severity-pill.LOW { background:#065F46; color:#D1FAE5; border:1px solid #10B981; }

  .resident-detail-card { margin-bottom:1rem; padding:1.2rem; border:1px solid #f0e6e5; border-radius:1.1rem; background:#fff; box-shadow:0 2px 10px rgba(15,23,42,.03); }
  .resident-detail-card h2 { margin:0 0 .95rem; font-size:.95rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:.5rem; }
  .resident-detail-card h2 span { color:#e32118; }
  .resident-detail-info { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1.1rem 1rem; }
  .resident-detail-info-item { display:flex; align-items:flex-start; gap:.65rem; }
  .resident-detail-info-item svg { width:1.15rem; height:1.15rem; color:#e32118; flex:none; margin-top:.15rem; }
  .resident-detail-info-item span { display:flex; flex-direction:column; gap:.15rem; }
  .resident-detail-info-item small { color:#64748b; font-size:.73rem; font-weight:700; text-transform:uppercase; letter-spacing:.03em; }
  .resident-detail-info-item strong { color:#1e293b; font-size:.88rem; font-weight:750; word-break:break-word; }
  .resident-detail-info-item strong.status { color:#e32118; }

  /* Phase 2 Tactical Enrichment Styling */
  .tactical-enrichment-card {
    border: 1.5px solid #FED7AA;
    background: #FFFDFB;
  }
  .tactical-header-desc {
    margin: -0.3rem 0 0.65rem;
    font-size: 0.76rem;
    color: #64748B;
    line-height: 1.4;
  }
  .tactical-group {
    margin-bottom: 0.75rem;
  }
  .tactical-group:last-child {
    margin-bottom: 0;
  }
  .tactical-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.45rem;
  }
  .tactical-label {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 850;
    color: #475569;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .tactical-select-guide {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.69rem;
    font-weight: 800;
    color: #DC2626;
    background: #FEF2F2;
    border: 1px solid #FCA5A5;
    padding: 0.16rem 0.5rem;
    border-radius: 999px;
    letter-spacing: 0.01em;
  }
  .tactical-select-guide.is-done {
    color: #15803D;
    background: #F0FDF4;
    border-color: #86EFAC;
  }

  /* Interactive Animated Onboarding Guide */
  @keyframes onboardingSlideIn {
    0% {
      opacity: 0;
      transform: translateY(-8px) scale(0.97);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  @keyframes onboardingFadeOut {
    0% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateY(-8px) scale(0.97);
      pointer-events: none;
    }
  }
  @keyframes pulseSubtleGlow {
    0%, 100% {
      box-shadow: 0 4px 16px rgba(220, 38, 38, 0.08), 0 0 0 0 rgba(220, 38, 38, 0.2);
    }
    50% {
      box-shadow: 0 6px 22px rgba(220, 38, 38, 0.16), 0 0 0 6px rgba(220, 38, 38, 0);
    }
  }

  .interactive-onboarding-toast {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-radius: 0.85rem;
    background: #FFFFFF;
    border: 1.5px solid #FCA5A5;
    box-shadow: 0 4px 18px rgba(220, 38, 38, 0.12);
    margin-bottom: 1rem;
    animation: onboardingSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards, pulseSubtleGlow 3s infinite;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }
  .interactive-onboarding-toast.is-dismissing {
    animation: onboardingFadeOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .onboarding-icon {
    font-size: 1.35rem;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }
  .onboarding-content {
    flex: 1;
    min-width: 0;
  }
  .onboarding-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  .onboarding-title strong {
    font-size: 0.82rem;
    font-weight: 850;
    color: #991B1B;
  }
  .onboarding-close-btn {
    border: 0;
    background: transparent;
    color: #94A3B8;
    cursor: pointer;
    font-size: 1rem;
    padding: 0;
    line-height: 1;
    display: grid;
    place-items: center;
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 50%;
    transition: all 0.15s ease;
  }
  .onboarding-close-btn:hover {
    background: #FEE2E2;
    color: #DC2626;
  }
  .onboarding-desc {
    margin: 0 0 0.55rem;
    font-size: 0.74rem;
    color: #475569;
    line-height: 1.4;
    font-weight: 550;
  }
  .onboarding-dismiss-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #DC2626;
    font-size: 0.7rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .onboarding-dismiss-pill:hover {
    background: #DC2626;
    color: #FFFFFF;
    border-color: #DC2626;
  }

  /* Equal-width grid rows */
  .tactical-grid-3 {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.55rem;
  }
  .tactical-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .tactical-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    padding: 0.75rem 0.65rem;
    border: 1.5px solid #E2E8F0;
    border-radius: 0.85rem;
    background: #F8FAFC;
    color: #1E293B;
    font-size: 0.82rem;
    font-weight: 750;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    min-height: 48px;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
  }
  .tactical-btn:hover {
    border-color: #CBD5E1;
    background: #F1F5F9;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(15, 23, 42, 0.05);
  }
  .tactical-btn:active {
    transform: scale(0.98);
  }
  .tactical-btn.is-selected {
    border-color: #DB1B0D;
    background: #DB1B0D;
    color: #FFFFFF;
    box-shadow: 0 4px 14px rgba(219, 27, 13, 0.28);
  }
  .tactical-btn-icon {
    font-size: 1.15rem;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.85rem;
    height: 1.85rem;
    border-radius: 0.5rem;
    background: rgba(15, 23, 42, 0.05);
    transition: all 0.15s ease;
  }
  .tactical-btn-icon.icon-wood { color: #854D0E; }
  .tactical-btn-icon.icon-semi { color: #EA580C; }
  .tactical-btn-icon.icon-concrete { color: #475569; }
  .tactical-btn-icon.icon-packed { color: #DC2626; }
  .tactical-btn-icon.icon-spaced { color: #0284C7; }
  .tactical-btn-icon.icon-alley { color: #D97706; }
  .tactical-btn-icon.icon-truck { color: #DC2626; }

  .tactical-btn.is-selected .tactical-btn-icon {
    background: rgba(255, 255, 255, 0.22);
    color: #FFFFFF !important;
  }
  .tactical-btn-text {
    white-space: normal;
    overflow-wrap: break-word;
    hyphens: auto;
    line-height: 1.2;
    text-align: center;
    font-size: 0.8rem;
  }

  /* Radio dot indicators */
  .tactical-radio-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1.8px solid #94A3B8;
    background: #FFFFFF;
    margin-left: auto;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .tactical-btn.is-selected .tactical-radio-dot {
    border-color: #FFFFFF;
    background: #FFFFFF;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);
  }
  .tactical-btn.is-selected .tactical-radio-dot::after {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #DB1B0D;
  }

  /* Stacked card buttons for accessibility */
  .tactical-btn.tactical-btn-stacked {
    padding: 0.75rem 0.85rem;
    text-align: left;
    justify-content: flex-start;
    gap: 0.65rem;
  }
  .tactical-btn-content {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
    flex: 1;
  }
  .tactical-btn-content strong {
    font-size: 0.82rem;
    font-weight: 800;
    line-height: 1.25;
    color: inherit;
  }
  .tactical-btn-content small {
    font-size: 0.68rem;
    font-weight: 600;
    color: #64748B;
    line-height: 1.3;
  }
  .tactical-btn.is-selected .tactical-btn-content small {
    color: rgba(255, 255, 255, 0.88);
  }

  .tactical-saved-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #047857;
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 800;
    margin-top: 0.75rem;
    animation: fadeIn 0.2s ease-in;
  }


  @media (max-width: 580px) {
    .tactical-grid-2 {
      grid-template-columns: 1fr;
    }
    .tactical-grid-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.45rem;
    }
    .tactical-grid-3 .tactical-btn {
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.55rem 0.25rem;
      font-size: 0.72rem;
      min-height: 64px;
    }
    .tactical-grid-3 .tactical-btn-text {
      font-size: 0.71rem;
      line-height: 1.15;
    }
    .tactical-grid-3 .tactical-radio-dot {
      margin-left: 0;
      margin-top: 0.15rem;
      width: 14px;
      height: 14px;
    }
    .tactical-grid-3 .tactical-radio-dot::after {
      width: 6px;
      height: 6px;
    }
  }

  /* Environmental Wind Hazard Alert */
  .wind-hazard-banner { display:flex; align-items:flex-start; gap:.8rem; padding:.9rem 1rem; border-radius:.85rem; background:#FEF3C7; border:1px solid #FDE68A; margin-bottom:.9rem; }
  .wind-hazard-icon { font-size:1.4rem; line-height:1; }
  .wind-hazard-body strong { display:block; font-size:.82rem; font-weight:800; color:#92400E; margin-bottom:.2rem; }
  .wind-hazard-body p { margin:0; font-size:.75rem; color:#78350F; line-height:1.4; }

  .resident-timeline { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); margin-top:.2rem; }
  .resident-timeline-step { position:relative; text-align:center; padding-top:1.8rem; color:#94a3b8; font-size:.64rem; font-weight:700; line-height:1.2; }
  .resident-timeline-step::before { content:''; position:absolute; top:.58rem; left:0; width:100%; height:2px; background:#d9e1ea; }
  .resident-timeline-step:first-child::before { left:50%; width:50%; }.resident-timeline-step:last-child::before { width:50%; }
  .resident-timeline-dot { position:absolute; top:0; left:50%; width:1.2rem; height:1.2rem; transform:translateX(-50%); display:grid; place-items:center; border:2px solid #d9e1ea; border-radius:50%; background:#eff3f7; color:#fff; font-size:.67rem; z-index:1; }
  .resident-timeline-step.complete, .resident-timeline-step.current { color:#e32118; }.resident-timeline-step.complete::before, .resident-timeline-step.current::before { background:#e32118; }.resident-timeline-step.complete .resident-timeline-dot, .resident-timeline-step.current .resident-timeline-dot { border-color:#e32118; background:#e32118; }.resident-timeline-step.current .resident-timeline-dot { box-shadow:0 0 0 5px rgba(227,33,24,.13); }
  .resident-timeline-date { display:block; margin-top:.18rem; color:#8da0b5; font-size:.58rem; font-weight:600; }
  .resident-bfp-update { margin:0; border-radius:.7rem; padding:.8rem; background:#fff3f2; color:#4a5568; font-size:.84rem; line-height:1.45; }
  .resident-update-time { margin:.65rem 0 0; color:#718096; font-size:.72rem; font-weight:700; }

  /* Incident Photo Showcase & Slideshow */
  .resident-photos-preview-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.6rem;
    margin: 0.2rem 0 0.95rem;
  }
  .resident-photos-preview-grid.count-1 { grid-template-columns: 1fr; }
  .resident-photos-preview-grid.count-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .resident-photos-preview-grid.count-1 .resident-photo-preview-thumb { aspect-ratio: 4 / 3; }
  .resident-photo-preview-thumb {
    position: relative;
    aspect-ratio: 3 / 4;
    border-radius: 0.75rem;
    overflow: hidden;
    border: 1.5px solid #E2E8F0;
    cursor: pointer;
    background: #0F172A;
    padding: 0;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .resident-photo-preview-thumb:hover {
    border-color: #DB1B0D;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(219, 27, 13, 0.22);
  }
  .resident-photo-preview-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
  .resident-photo-preview-badge {
    position: absolute;
    bottom: 0.3rem;
    left: 0.3rem;
    background: rgba(15, 23, 42, 0.78);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    color: #FFFFFF;
    font-size: 0.62rem;
    font-weight: 800;
    padding: 0.12rem 0.45rem;
    border-radius: 999px;
    letter-spacing: 0.02em;
  }
  .resident-photo-button {
    width: 100%;
    border: 1.5px solid #DB1B0D;
    border-radius: 0.85rem;
    padding: 0.75rem 1rem;
    color: #DB1B0D;
    background: #FFF8F7;
    font: inherit;
    font-weight: 800;
    font-size: 0.84rem;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  .resident-photo-button:hover {
    background: #DB1B0D;
    color: #FFFFFF;
    box-shadow: 0 4px 14px rgba(219, 27, 13, 0.28);
    transform: translateY(-1px);
  }

  /* Fullscreen Slideshow Modal */
  .resident-photo-backdrop {
    position: fixed;
    inset: 0;
    z-index: 300;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(10, 15, 29, 0.90);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    animation: fadeIn 0.2s ease-out;
  }
  .resident-photo-dialog {
    position: relative;
    width: min(100%, 50rem);
    max-height: 92dvh;
    display: flex;
    flex-direction: column;
    padding: 0.9rem;
    border-radius: 1.25rem;
    background: #0F172A;
    border: 1.5px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65);
    box-sizing: border-box;
  }
  .resident-photo-dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.65rem;
    margin-bottom: 0.65rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .resident-photo-counter-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.32rem 0.75rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    color: #F8FAFC;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.02em;
  }
  .resident-photo-close {
    width: 2.2rem;
    height: 2.2rem;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    color: #FFFFFF;
    font-size: 1.35rem;
    line-height: 1;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .resident-photo-close:hover {
    background: #DB1B0D;
    color: #FFFFFF;
    transform: scale(1.08);
  }
  .resident-photo-stage {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 250px;
    max-height: 64dvh;
    border-radius: 0.85rem;
    background: #020617;
    overflow: hidden;
  }
  .resident-photo-dialog-image {
    display: block;
    max-width: 100%;
    max-height: 64dvh;
    object-fit: contain;
    border-radius: 0.85rem;
    transition: opacity 0.2s ease, transform 0.2s ease;
    user-select: none;
    -webkit-user-drag: none;
  }
  .photo-nav-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 2.85rem;
    height: 2.85rem;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.25);
    background: rgba(15, 23, 42, 0.82);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: #FFFFFF;
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1;
    display: grid;
    place-items: center;
    cursor: pointer;
    z-index: 10;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .photo-nav-arrow:hover {
    background: #DB1B0D;
    border-color: #DB1B0D;
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 6px 18px rgba(219, 27, 13, 0.45);
  }
  .photo-nav-arrow:active {
    transform: translateY(-50%) scale(0.95);
  }
  .photo-nav-arrow.prev {
    left: 0.75rem;
  }
  .photo-nav-arrow.next {
    right: 0.75rem;
  }
  .resident-photo-dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    margin-top: 0.75rem;
  }
  .photo-slide-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 0;
    background: rgba(255, 255, 255, 0.28);
    cursor: pointer;
    padding: 0;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .photo-slide-dot:hover {
    background: rgba(255, 255, 255, 0.65);
  }
  .photo-slide-dot.active {
    width: 24px;
    border-radius: 999px;
    background: #DB1B0D;
    box-shadow: 0 0 10px rgba(219, 27, 13, 0.7);
  }

  .resident-safety-card { display:flex; gap:.8rem; padding:1rem; border:1px solid #ffd1cf; border-radius:1rem; background:#fff7f6; color:#44546a; }.resident-safety-icon { display:grid; place-items:center; width:2.2rem; height:2.2rem; flex:none; border-radius:.7rem; background:#ffe0de; }.resident-safety-icon img { width:1.35rem; height:1.35rem; object-fit:contain; }.resident-safety-card h2 { margin:0 0 .25rem; color:#e32118; font-size:.9rem; }.resident-safety-card p { margin:0; font-size:.78rem; line-height:1.45; }
  .resident-report-detail-loading { padding:3rem 1rem; text-align:center; color:#64748b; font-weight:700; }

  /* Responsive 2-Column Bento Grid */
  .resident-detail-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    align-items: start;
  }
  .resident-grid-col {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
  }

  @media (min-width: 820px) {
    .resident-report-detail-inner {
      width: min(100%, 64rem);
    }
    .resident-detail-grid {
      grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
      gap: 1.25rem;
    }
  }
  @media (min-width:760px) { .resident-report-detail { padding-top:2rem; }.resident-detail-card { padding:1.25rem; } }
  @media (max-width:420px) { .resident-report-detail { padding-inline:.75rem; }.resident-detail-info { gap:.8rem .6rem; }.resident-detail-info-item strong { font-size:.78rem; }.resident-detail-reference { font-size:.95rem; }.resident-status-pill { font-size:.67rem; padding:.35rem .55rem; } }
  /* ---- Report detail: status first, icons over paragraphs ---- */
  .resident-detail-heading > div { min-width:0; }
  .resident-detail-back { font-size:.95rem; }
  .resident-detail-back:focus-visible, .rrs-jump:focus-visible, .resident-photo-preview-thumb:focus-visible { outline:3px solid rgba(227,33,24,.35); outline-offset:2px; }
  .resident-detail-sub { margin:.15rem 0 0; color:#64748b; font-size:.76rem; font-weight:650; font-variant-numeric:tabular-nums; }
  .resident-detail-card h2 > i { color:#e32118; font-size:.9rem; }

  .rrs-status { --tone:#B45309; --tone-soft:#FEF3C7; --tone-line:#FDE68A; margin-bottom:1rem; padding:1.05rem 1.05rem 1.1rem; border:1px solid var(--tone-line); border-radius:1.15rem; background:#fff; box-shadow:0 4px 16px rgba(15,23,42,.05), 0 1px 3px rgba(15,23,42,.03); }
  .rrs-status.tone-good { --tone:#047857; --tone-soft:#D1FAE5; --tone-line:#A7F3D0; }
  .rrs-status.tone-stop { --tone:#475569; --tone-soft:#E2E8F0; --tone-line:#CBD5E1; }
  .rrs-status.tone-info { --tone:#1D4ED8; --tone-soft:#DBEAFE; --tone-line:#BFDBFE; }
  .rrs-status-top { display:flex; align-items:flex-start; gap:.85rem; }
  .rrs-status-icon { flex:none; width:3rem; height:3rem; display:grid; place-items:center; border-radius:.95rem; background:var(--tone-soft); color:var(--tone); font-size:1.3rem; }
  .rrs-status-text { min-width:0; }
  .rrs-status h2 { margin:.1rem 0 0; color:#0f172a; font-size:1.12rem; font-weight:800; letter-spacing:-.015em; line-height:1.25; text-wrap:balance; }
  .rrs-status p { margin:.3rem 0 0; color:#334155; font-size:.84rem; line-height:1.45; }
  .rrs-live { display:inline-flex; align-items:center; gap:.4rem; margin-top:.5rem; color:#64748b; font-size:.7rem; font-weight:700; font-variant-numeric:tabular-nums; }
  .rrs-live::before { content:''; width:.45rem; height:.45rem; border-radius:50%; background:var(--tone); box-shadow:0 0 0 0 var(--tone); animation:rrsLive 2.4s ease-out infinite; }
  @keyframes rrsLive { 0% { box-shadow:0 0 0 0 color-mix(in srgb, var(--tone) 45%, transparent); } 80%, 100% { box-shadow:0 0 0 .45rem transparent; } }

  .rrs-track { list-style:none; display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); margin:1.05rem 0 0; padding:0; }
  .rrs-step { position:relative; display:flex; flex-direction:column; align-items:center; gap:.32rem; color:#94a3b8; font-size:.66rem; font-weight:750; line-height:1.15; text-align:center; }
  .rrs-step::before { content:''; position:absolute; top:1.02rem; right:50%; width:100%; height:3px; border-radius:99px; background:#e2e8f0; }
  .rrs-step:first-child::before { display:none; }
  .rrs-step.done::before, .rrs-step.current::before { background:#10B981; }
  .rrs-step-dot { position:relative; z-index:1; width:2.1rem; height:2.1rem; display:grid; place-items:center; border:2px solid #e2e8f0; border-radius:50%; background:#f8fafc; color:#94a3b8; font-size:.78rem; transition:background-color .2s ease, border-color .2s ease; }
  .rrs-step.done { color:#047857; }
  .rrs-step.done .rrs-step-dot { border-color:#10B981; background:#10B981; color:#fff; }
  .rrs-step.current { color:#0f172a; }
  .rrs-step.current .rrs-step-dot { border-color:var(--tone); background:#fff; color:var(--tone); box-shadow:0 0 0 4px color-mix(in srgb, var(--tone) 18%, transparent); }
  .rrs-step time { color:#64748b; font-size:.6rem; font-weight:650; font-variant-numeric:tabular-nums; }

  .rrs-jump { display:flex; align-items:center; gap:.7rem; width:100%; margin-top:1rem; padding:.65rem .75rem; border:1px solid #fecaca; border-radius:.9rem; background:#fff5f4; color:#7f1d1d; font:inherit; text-align:left; cursor:pointer; touch-action:manipulation; -webkit-tap-highlight-color:transparent; transition:background-color .18s ease, transform .18s ease; }
  .rrs-jump:hover { background:#ffeceb; }
  .rrs-jump:active { transform:scale(.99); }
  .rrs-jump-lead { flex:none; width:2.1rem; height:2.1rem; display:grid; place-items:center; border-radius:.65rem; background:#e32118; color:#fff; font-size:.85rem; }
  .rrs-jump-text { flex:1; min-width:0; display:flex; flex-direction:column; gap:.05rem; }
  .rrs-jump-text strong { font-size:.86rem; font-weight:800; }
  .rrs-jump-text small { color:#9f1239; font-size:.72rem; font-weight:650; }
  .rrs-jump-arrow { flex:none; width:2rem; height:2rem; display:grid; place-items:center; border-radius:50%; background:#fff; color:#e32118; box-shadow:0 2px 6px rgba(227,33,24,.18); animation:rrsNudge 1.8s cubic-bezier(.16,1,.3,1) infinite; }
  @keyframes rrsNudge { 0%, 100% { transform:translateY(0); } 45% { transform:translateY(3px); } }

  .wind-hazard-icon { flex:none; width:2.3rem; height:2.3rem; display:grid; place-items:center; border-radius:.75rem; background:#FDE68A; color:#92400E; font-size:1rem; }
  .wind-hazard-body strong { font-size:.84rem; }
  .wind-hazard-body p { font-size:.78rem; }

  .rrs-danger { --lv:#DC2626; --lv-soft:#FEF2F2; }
  .rrs-danger.LOW { --lv:#047857; --lv-soft:#ECFDF5; }
  .rrs-danger.MODERATE { --lv:#B45309; --lv-soft:#FFFBEB; }
  .rrs-danger.CRITICAL { --lv:#7F1D1D; --lv-soft:#FEE2E2; }
  .rrs-danger-head { display:flex; align-items:center; gap:.85rem; }
  .rrs-danger-icon { flex:none; width:3rem; height:3rem; display:grid; place-items:center; border-radius:.95rem; background:var(--lv); color:#fff; font-size:1.3rem; box-shadow:0 6px 14px color-mix(in srgb, var(--lv) 28%, transparent); }
  .rrs-danger-title { flex:1; min-width:0; }
  .rrs-danger-title small { display:block; color:#64748b; font-size:.68rem; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
  .resident-detail-card.rrs-danger h2 { margin:.1rem 0 0; color:var(--lv); font-size:1.15rem; letter-spacing:-.015em; }
  .rrs-danger-score { flex:none; padding:.3rem .55rem; border-radius:99px; background:var(--lv-soft); color:var(--lv); font-size:.74rem; font-weight:800; font-variant-numeric:tabular-nums; }
  .rrs-danger-score:empty { display:none; }
  .rrs-meter { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.3rem; margin:.95rem 0 .3rem; }
  .rrs-meter span { height:.42rem; border-radius:99px; background:#e2e8f0; }
  .rrs-meter span.on { background:var(--lv); }
  .rrs-meter-labels { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.3rem; color:#94a3b8; font-size:.62rem; font-weight:750; }
  .rrs-meter-labels .is-current { color:var(--lv); font-weight:850; }
  .rrs-factors { list-style:none; display:flex; flex-wrap:wrap; gap:.45rem; margin:.95rem 0 0; padding:0; }
  .rrs-factor { display:inline-flex; align-items:center; gap:.45rem; max-width:100%; padding:.32rem .65rem .32rem .32rem; border:1px solid #e2e8f0; border-radius:99px; background:#f8fafc; color:#1e293b; font-size:.76rem; font-weight:700; line-height:1.25; }
  .rrs-factor i { flex:none; width:1.55rem; height:1.55rem; display:grid; place-items:center; border-radius:50%; background:var(--lv-soft); color:var(--lv); font-size:.72rem; }
  .rrs-danger-note { display:flex; align-items:center; gap:.45rem; margin:.85rem 0 0; color:#64748b; font-size:.74rem; font-weight:600; }

  .tactical-enrichment-card:focus { outline:none; }
  .tactical-enrichment-card:focus-visible { outline:3px solid rgba(227,33,24,.3); outline-offset:3px; }
  .rrs-help-count { margin-left:auto; padding:.2rem .55rem; border-radius:99px; background:#fee2e2; color:#b91c1c; font-size:.72rem; font-weight:850; font-variant-numeric:tabular-nums; }
  .rrs-help-count.is-done { background:#d1fae5; color:#047857; }

  .rrs-details { list-style:none; display:grid; margin:0; padding:0; }
  .rrs-details li { display:flex; align-items:center; gap:.75rem; padding:.6rem 0; border-bottom:1px solid #f1f5f9; }
  .rrs-details li:first-child { padding-top:0; }
  .rrs-details li:last-child { padding-bottom:0; border-bottom:0; }
  .rrs-details li > i { flex:none; width:2rem; height:2rem; display:grid; place-items:center; border-radius:.6rem; background:#fff1f0; color:#e32118; font-size:.8rem; }
  .rrs-details span { min-width:0; display:flex; flex-direction:column; gap:.08rem; }
  .rrs-details small { color:#64748b; font-size:.67rem; font-weight:750; text-transform:uppercase; letter-spacing:.035em; }
  .rrs-details strong { color:#0f172a; font-size:.86rem; font-weight:750; overflow-wrap:anywhere; }

  .resident-photos-preview-grid.rrs-photos { grid-template-columns:repeat(3,minmax(0,1fr)); margin:0; }
  .rrs-photos .resident-photo-preview-thumb { aspect-ratio:1; }
  .rrs-photos .resident-photo-preview-img { object-fit:cover; }
  .rrs-photo-zoom { position:absolute; right:.35rem; bottom:.35rem; width:1.6rem; height:1.6rem; display:grid; place-items:center; border-radius:50%; background:rgba(15,23,42,.72); color:#fff; font-size:.66rem; }

  @media (prefers-reduced-motion: reduce) {
    .rrs-live::before, .rrs-jump-arrow { animation:none; }
  }
  @media (max-width:420px) {
    .rrs-status { padding:.95rem .85rem 1rem; }
    .rrs-status-icon, .rrs-danger-icon { width:2.7rem; height:2.7rem; font-size:1.15rem; }
    .rrs-track { margin-inline:-.45rem; }
    .rrs-step { font-size:.58rem; letter-spacing:-.01em; }
    .rrs-step-dot { width:1.9rem; height:1.9rem; font-size:.72rem; }
    .rrs-step::before { top:.92rem; }
  }

`;

const timeline = [
  { status: "PENDING_VERIFICATION", label: "Submitted", icon: "fa-paper-plane" },
  { status: "VERIFIED", label: "Verified", icon: "fa-shield-halved" },
  { status: "RESPONDING", label: "Responding", icon: "fa-person-running" },
  { status: "FIRETRUCK_DISPATCHED", label: "Dispatched", icon: "fa-truck-fast" },
  { status: "RESOLVED", label: "Resolved", icon: "fa-circle-check" },
] as const;

export function ResidentReportStatus({ reportId }: { reportId: string }) {
  const { lang, t } = useResidentLanguage();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [alreadyNotice, setAlreadyNotice] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("already") !== "1") return;
    url.searchParams.delete("already");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    queueMicrotask(() => setAlreadyNotice(true));
  }, []);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [updatingField, setUpdatingField] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isDismissingOnboarding, setIsDismissingOnboarding] = useState(false);

  const getTimelineLabel = (status: FireReportStatus, defaultLabel: string) => {
    if (lang === "hil") {
      switch (status) {
        case "PENDING_VERIFICATION": return "Napadala";
        case "VERIFIED": return "Nakumpirma";
        case "RESPONDING": return "Nagaresponde";
        case "FIRETRUCK_DISPATCHED": return "Nalarga";
        case "RESOLVED": return "Naapula";
        default: return defaultLabel;
      }
    }
    if (lang === "tl") {
      switch (status) {
        case "PENDING_VERIFICATION": return "Naipasa";
        case "VERIFIED": return "Nakumpirma";
        case "RESPONDING": return "Tumutugon";
        case "FIRETRUCK_DISPATCHED": return "Napadala";
        case "RESOLVED": return "Naapula";
        default: return defaultLabel;
      }
    }
    return defaultLabel;
  };

  useEffect(() => {
    try {
      const alreadyOnboarded = localStorage.getItem("alab_tactical_onboarded") === "true";
      if (!alreadyOnboarded && report && (!report.structure_material || !report.house_density || !report.route_accessibility)) {
        queueMicrotask(() => setShowOnboarding(true));
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, [report]);

  const dismissOnboarding = () => {
    setIsDismissingOnboarding(true);
    setTimeout(() => setShowOnboarding(false), 320);
    try {
      localStorage.setItem("alab_tactical_onboarded", "true");
    } catch {}
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/resident/fire-reports/${reportId}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) setReport(data.report);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load report.");
      }
    };
    void load();
    const timer = window.setInterval(load, 8_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [reportId]);

  const followsIncident = Boolean(report?.incident && !report.incident.viewerIsPrimary);
  const timelineStatus = (followsIncident ? report!.incident!.status : report?.status) as FireReportStatus | undefined;
  const timelineHistory = (followsIncident ? report!.incident!.history : report?.history ?? []) as Report["history"];
  const activeTimelineIndex = useMemo(() => (timelineStatus ? timelineIndex(timelineStatus) : 0), [timelineStatus]);

  const photos = useMemo(() => {
    return (report?.photos ?? []).filter((p): p is { url: string } => Boolean(p && p.url));
  }, [report?.photos]);

  useEffect(() => {
    if (!isPhotoDialogOpen || photos.length <= 1) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPhotoDialogOpen(false);
      } else if (e.key === "ArrowLeft") {
        setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
      } else if (e.key === "ArrowRight") {
        setActivePhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPhotoDialogOpen, photos.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || photos.length <= 1) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 45) {
      setActivePhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    } else if (diff < -45) {
      setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    }
    setTouchStart(null);
  };

  const updateTacticalDetail = async (key: "structureMaterial" | "houseDensity" | "routeAccessibility", val: string) => {
    if (!report) return;

    // Auto-vanish interactive onboarding wizard as soon as the user selects any option!
    if (showOnboarding) {
      dismissOnboarding();
    }

    const fieldMap = {
      structureMaterial: "structure_material",
      houseDensity: "house_density",
      routeAccessibility: "route_accessibility",
    } as const;

    const mappedField = fieldMap[key];

    // 1. INSTANT OPTIMISTIC UI: Fill red in 0ms immediately on tap!
    setReport((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [mappedField]: val };
      if (key === "houseDensity") {
        updated.reported_house_density = val;
      }
      return updated;
    });
    setSavedFeedback("✓ Na-save agad (Sent to BFP)");
    setTimeout(() => setSavedFeedback(null), 2500);

    // 2. Background persistence to PostgreSQL
    try {
      const response = await fetch(`/api/resident/fire-reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: val }),
      });
      const data = await response.json();
      if (response.ok && data.report) {
        setReport((prev) => {
          if (!prev) return prev;
          const r = data.report;
          return {
            ...prev,
            structure_material: r.structure_material ?? r.structureMaterial ?? prev.structure_material,
            reported_house_density: r.reported_house_density ?? r.reportedHouseDensity ?? prev.reported_house_density,
            house_density: r.house_density ?? r.houseDensity ?? prev.house_density,
            route_accessibility: r.route_accessibility ?? r.routeAccessibility ?? prev.route_accessibility,
            calculated_severity: r.calculated_severity ?? r.calculatedSeverity ?? prev.calculated_severity,
            severity_score: r.severity_score ?? r.severityScore ?? prev.severity_score,
            severity_factors: r.severity_factors ?? r.severityFactors ?? prev.severity_factors,
          };
        });
      }
    } catch {
      // Non-blocking background sync
    }
  };

  if (!report) {
    return (
      <Shell>
        <p className="resident-report-detail-loading" role={error ? "alert" : undefined}>
          {error || "Loading your fire report…"}
        </p>
      </Shell>
    );
  }

  const latest = report.history.at(-1);
  const currentPhoto = photos[activePhotoIndex] ?? photos[0];
  const photoUrl = currentPhoto?.url || "";
  const windSpeed = Number(report.weather_wind_speed) || 0;
  const fireTypes = report.fire_types?.length ? report.fire_types : [report.fire_type];
  const situationChoices = situationForFireTypes(fireTypes);
  const hasPhotos = photos.length > 0;

  const view = statusView(timelineStatus ?? report.status, lang);
  const showTracker = view.tone !== "stop" && view.tone !== "info";
  const statusMessage = latest?.resident_message || view.message;
  const helpGroups = [
    fireTypes.includes("HOUSE_BUILDING") ? Boolean(report.structure_material) : null,
    situationChoices.density ? Boolean(report.house_density || report.reported_house_density) : null,
    situationChoices.route ? Boolean(report.route_accessibility) : null,
  ].filter((answered): answered is boolean => answered !== null);
  const helpAnswered = helpGroups.filter(Boolean).length;
  // A rejected or duplicate report has nothing left for responders to prepare.
  const helpOpen = report.can_edit !== false && showTracker && helpGroups.length > helpAnswered;
  const lastStep = timeline.length - 1;
  const goToHelp = () => {
    const target = document.getElementById("help-responders");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.focus({ preventScroll: true });
  };
  const level = report.calculated_severity ?? null;
  const ruleBased = report.fire_type === "VEHICLE" || report.fire_type === "OTHER";
  const factors = Array.isArray(report.severity_factors) ? report.severity_factors : [];
  const pick = (en: string, hil: string, tl: string) => (lang === "en" ? en : lang === "hil" ? hil : tl);

  return (
    <Shell>
      <div className="resident-detail-heading">
        <a className="resident-detail-back" href="/resident/reports" aria-label="Back to reports">
          <i className="fa-solid fa-chevron-left" aria-hidden="true" />
        </a>
        <div>
          <h1>Report Details</h1>
          <p className="resident-detail-sub">#{report.reference_number || report.id.slice(0, 8)} · {formatDate(report.submitted_at)}</p>
        </div>
      </div>

      {alreadyNotice && (
        <div className="resident-already-notice" role="status">
          <span className="resident-already-icon" aria-hidden="true"><i className="fa-solid fa-location-dot" /></span>
          <div>
            <strong>{lang === "en" ? "You already reported a fire here" : lang === "hil" ? "Nakareport ka na sang sunog diri" : "Naiulat mo na ang sunog dito"}</strong>
            <p>{lang === "en" ? "This is your report. BFP is following it, so there is no need to send another." : lang === "hil" ? "Amo ini ang imo report. Ginasunod na ini sang BFP, gani indi na kinahanglan magpadala liwat." : "Ito ang iyong ulat. Sinusubaybayan na ito ng BFP, kaya hindi na kailangang magpadala ulit."}</p>
          </div>
          <button type="button" aria-label={lang === "en" ? "Close" : lang === "hil" ? "Isira" : "Isara"} onClick={() => setAlreadyNotice(false)}><i className="fa-solid fa-xmark" /></button>
        </div>
      )}

      {report.can_edit === false && (
        <div className="resident-already-notice" role="status">
          <div>
            <strong>{lang === "en" ? "Following an existing incident" : lang === "hil" ? "Ginasunod ang nareport na nga insidente" : "Sinusubaybayan ang naunang insidente"}</strong>
            <p>{lang === "en" ? "The same fire was already reported from this phone. This account can follow the latest BFP status without sending another report." : lang === "hil" ? "Nareport na ang amo nga sunog gamit ini nga telepono. Masunod sang ini nga account ang pinakabag-o nga status sang BFP nga wala nagapadala sang lain nga report." : "Naiulat na ang parehong sunog mula sa teleponong ito. Makikita ng account na ito ang pinakabagong status ng BFP nang hindi nagpapadala ng panibagong ulat."}</p>
          </div>
        </div>
      )}

      {/* Where the report stands comes first, so a worried resident sees it at once. */}
      <section className={`rrs-status tone-${view.tone}`} aria-live="polite" aria-label={pick("Report status", "Status sang report", "Katayuan ng ulat")}>
        <div className="rrs-status-top">
          <span className="rrs-status-icon" aria-hidden="true"><i className={`fa-solid ${view.icon}`} /></span>
          <div className="rrs-status-text">
            <h2>{view.title}</h2>
            <p>{statusMessage}</p>
            <span className="rrs-live">
              {pick("Updates by itself", "Kusa nga nagaupdate", "Kusang nag-a-update")} · {formatTime(latest ? latest.created_at : report.submitted_at)}
            </span>
          </div>
        </div>

        {showTracker && (
          <ol className="rrs-track">
            {timeline.map((item, index) => {
              // The last step is finished once reached, not "in progress".
              const isComplete = index < activeTimelineIndex || (index === lastStep && activeTimelineIndex === lastStep);
              const isCurrent = index === activeTimelineIndex && !isComplete;
              const historyItem = timelineHistory.find((entry) => entry.next_status === item.status);
              return (
                <li
                  key={item.status}
                  className={`rrs-step ${isComplete ? "done" : ""} ${isCurrent ? "current" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span className="rrs-step-dot" aria-hidden="true">
                    <i className={`fa-solid ${isComplete ? "fa-check" : item.icon}`} />
                  </span>
                  <span className="rrs-step-label">{getTimelineLabel(item.status, item.label)}</span>
                  {historyItem && (isComplete || isCurrent) && <time dateTime={historyItem.created_at}>{formatTime(historyItem.created_at)}</time>}
                </li>
              );
            })}
          </ol>
        )}

        {helpOpen && (
          <button type="button" className="rrs-jump" onClick={goToHelp}>
            <span className="rrs-jump-lead" aria-hidden="true"><i className="fa-solid fa-hand-holding-heart" /></span>
            <span className="rrs-jump-text">
              <strong>{pick("Help responders", "Bulig sa mga responder", "Tulungan ang mga responder")}</strong>
              <small>{pick(`${helpGroups.length - helpAnswered} quick taps left`, `${helpGroups.length - helpAnswered} ka pili nalang`, `${helpGroups.length - helpAnswered} pang mabilis na pili`)}</small>
            </span>
            <span className="rrs-jump-arrow" aria-hidden="true"><i className="fa-solid fa-arrow-down" /></span>
          </button>
        )}
      </section>

      {windSpeed >= 25 && (
        <section className="wind-hazard-banner" role="alert">
          <span className="wind-hazard-icon" aria-hidden="true"><i className="fa-solid fa-wind" /></span>
          <div className="wind-hazard-body">
            <strong>{pick("Strong wind", "Mabaskog nga hangin", "Malakas ang hangin")} · {Math.round(windSpeed)} km/h {report.weather_wind_condition}</strong>
            <p>{pick("Fire spreads fast with the wind. Move upwind, away from the smoke.", "Madasig maglapta ang kalayo. Magpalayo pakontra sa hangin kag sa aso.", "Mabilis kumalat ang apoy. Lumikas pasalungat sa hangin, palayo sa usok.")}</p>
          </div>
        </section>
      )}

      {report.incident && <SharedIncidentCard incident={report.incident} lang={lang} />}
      {report.incident && <SharedIncidentPopup reportId={report.id} incident={report.incident} lang={lang} />}

      <div className="resident-detail-grid">
        <div className="resident-grid-col">
          {level && (
            <section className={`resident-detail-card rrs-danger ${level}`} aria-label={pick("Level of Danger", "Lebel sang Kadilikado", "Antas ng Panganib")}>
              <div className="rrs-danger-head">
                <span className="rrs-danger-icon" aria-hidden="true"><i className={`fa-solid ${DANGER_ICONS[level]}`} /></span>
                <div className="rrs-danger-title">
                  <small>{pick("Level of Danger", "Lebel sang Kadilikado", "Antas ng Panganib")}</small>
                  <h2>{dangerTitle(level, lang)}</h2>
                </div>
                <span className="rrs-danger-score">{ruleBased ? pick("Rule-based", "Base sa rule", "Batay sa patakaran") : report.severity_score == null ? "" : `${report.severity_score}/100`}</span>
              </div>
              <div className="rrs-meter" role="img" aria-label={`${DANGER_ORDER.indexOf(level) + 1} / 4`}>
                {DANGER_ORDER.map((step, index) => (
                  <span key={step} className={index <= DANGER_ORDER.indexOf(level) ? "on" : ""} />
                ))}
              </div>
              <div className="rrs-meter-labels" aria-hidden="true">
                {DANGER_ORDER.map((step) => <span key={step} className={step === level ? "is-current" : ""}>{dangerWord(step, lang)}</span>)}
              </div>
              {factors.length > 0 && (
                <ul className="rrs-factors">
                  {factors.map((factor, index) => (
                    <li key={`${index}-${factor}`} className="rrs-factor" title={factor}>
                      <i className={`fa-solid ${factorIcon(factor)}`} aria-hidden="true" />
                      <span>{shortFactor(factor)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="rrs-danger-note">
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                {pick("BFP checks the actual fire size at the scene.", "Ang BFP ang magasukat sang kadako sang sunog sa lugar.", "Susuriin ng BFP ang laki ng sunog sa lugar.")}
              </p>
            </section>
          )}

          {report.can_edit !== false && <section id="help-responders" tabIndex={-1} className="resident-detail-card tactical-enrichment-card">
            <h2>
              <i className="fa-solid fa-hand-holding-heart" aria-hidden="true" />
              {pick("Help Responders", "Bulig sa mga Responders", "Tulong sa Responders")}
              {helpGroups.length > 0 && <span className={`rrs-help-count ${helpAnswered === helpGroups.length ? "is-done" : ""}`}>{helpAnswered}/{helpGroups.length}</span>}
            </h2>
            <p className="tactical-header-desc">
              {pick("Tap one per row. BFP gets it right away.", "Pili isa kada linya. Makadto dayon sa BFP.", "Pumili ng isa bawat hanay. Agad itong makikita ng BFP.")}
            </p>

            {showOnboarding && (
              <div
                className={`interactive-onboarding-toast ${isDismissingOnboarding ? "is-dismissing" : ""}`}
                role="status"
                aria-live="polite"
              >
                <div className="onboarding-icon" aria-hidden="true">✨</div>
                <div className="onboarding-content">
                  <div className="onboarding-title">
                    <strong>Gabay sa Pagpili (Interactive Guide)</strong>
                    <button
                      type="button"
                      className="onboarding-close-btn"
                      onClick={dismissOnboarding}
                      aria-label="Isara ang gabay"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="onboarding-desc">
                    Pumili ng isa sa bawat kahon sa ibaba. Awtomatiko itong maipapadala agad sa BFP responders nang hindi na kailangang mag-submit muli!
                  </p>
                  <button
                    type="button"
                    className="onboarding-dismiss-pill"
                    onClick={dismissOnboarding}
                  >
                    <span>✓ Naintindihan ko</span>
                  </button>
                </div>
              </div>
            )}

            {fireTypes.includes("HOUSE_BUILDING") && <div className="tactical-group">
              <div className="tactical-group-header">
                <span className="tactical-label">Building material:</span>
                <span className={`tactical-select-guide ${report.structure_material ? "is-done" : ""}`}>
                  {report.structure_material ? "✓ Napili" : "Pumili ng 1"}
                </span>
              </div>
              <div className="tactical-grid-3">
                <button
                  type="button"
                  className={`tactical-btn ${report.structure_material === "LIGHT_MATERIALS" || report.structure_material === "LIGHT_WOOD" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("structureMaterial", "LIGHT_MATERIALS")}
                  aria-pressed={report.structure_material === "LIGHT_MATERIALS" || report.structure_material === "LIGHT_WOOD"}
                >
                  <span className="tactical-btn-icon icon-wood"><i className="fa-solid fa-tree" /></span>
                  <span className="tactical-btn-text">Wood / Light materials</span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`tactical-btn ${report.structure_material === "MIXED_SEMI_CONCRETE" || report.structure_material === "CONCRETE_MIXED" || report.structure_material === "CONCRETE" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("structureMaterial", "MIXED_SEMI_CONCRETE")}
                  aria-pressed={report.structure_material === "MIXED_SEMI_CONCRETE" || report.structure_material === "CONCRETE_MIXED" || report.structure_material === "CONCRETE"}
                >
                  <span className="tactical-btn-icon icon-semi"><i className="fa-solid fa-house-chimney" /></span>
                  <span className="tactical-btn-text">Mixed / Semi-concrete</span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`tactical-btn ${report.structure_material === "COMMERCIAL_STORAGE" || report.structure_material === "COMMERCIAL_STEEL" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("structureMaterial", "COMMERCIAL_STORAGE")}
                  aria-pressed={report.structure_material === "COMMERCIAL_STORAGE" || report.structure_material === "COMMERCIAL_STEEL"}
                >
                  <span className="tactical-btn-icon icon-concrete"><i className="fa-solid fa-building" /></span>
                  <span className="tactical-btn-text">Storage / Flammable goods</span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
              </div>
            </div>}

            {situationChoices.density && <div className="tactical-group">
              <div className="tactical-group-header">
                <span className="tactical-label">Nearby houses:</span>
                <span className={`tactical-select-guide ${report.house_density || report.reported_house_density ? "is-done" : ""}`}>
                  {report.house_density || report.reported_house_density ? "✓ Napili" : "Pumili ng 1"}
                </span>
              </div>
              <div className="tactical-grid-3">
                <button
                  type="button"
                  className={`tactical-btn ${report.house_density === "ISOLATED_FAR" || report.reported_house_density === "ISOLATED_FAR" || report.house_density === "ISOLATED" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("houseDensity", "ISOLATED_FAR")}
                  aria-pressed={report.house_density === "ISOLATED_FAR" || report.reported_house_density === "ISOLATED_FAR" || report.house_density === "ISOLATED"}
                >
                  <span className="tactical-btn-icon icon-spaced"><i className="fa-solid fa-house" /></span>
                  <span className="tactical-btn-text">Far apart</span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`tactical-btn ${report.house_density === "MODERATE_SPACING" || report.reported_house_density === "MODERATE_SPACING" || report.house_density === "MODERATE" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("houseDensity", "MODERATE_SPACING")}
                  aria-pressed={report.house_density === "MODERATE_SPACING" || report.reported_house_density === "MODERATE_SPACING" || report.house_density === "MODERATE"}
                >
                  <span className="tactical-btn-icon icon-semi"><i className="fa-solid fa-house-chimney-window" /></span>
                  <span className="tactical-btn-text">Some spacing</span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`tactical-btn ${report.house_density === "PACKED_MAGKAKADIKIT" || report.reported_house_density === "PACKED_MAGKAKADIKIT" || report.house_density === "HIGH_DENSITY" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("houseDensity", "PACKED_MAGKAKADIKIT")}
                  aria-pressed={report.house_density === "PACKED_MAGKAKADIKIT" || report.reported_house_density === "PACKED_MAGKAKADIKIT" || report.house_density === "HIGH_DENSITY"}
                >
                  <span className="tactical-btn-icon icon-packed"><i className="fa-solid fa-city" /></span>
                  <span className="tactical-btn-text">Houses are close together</span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
              </div>
            </div>}

            {situationChoices.route && <div className="tactical-group">
              <div className="tactical-group-header">
                <span className="tactical-label">Road access for fire trucks:</span>
                <span className={`tactical-select-guide ${report.route_accessibility ? "is-done" : ""}`}>
                  {report.route_accessibility ? "✓ Napili" : "Pumili ng 1"}
                </span>
              </div>
              <div className="tactical-grid-2">
                <button
                  type="button"
                  className={`tactical-btn tactical-btn-stacked ${report.route_accessibility === "WIDE_ROAD" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("routeAccessibility", "WIDE_ROAD")}
                  aria-pressed={report.route_accessibility === "WIDE_ROAD"}
                >
                  <span className="tactical-btn-icon icon-truck"><i className="fa-solid fa-truck-fast" /></span>
                  <span className="tactical-btn-content">
                    <strong>Wide road</strong>
                    <small>Fire truck can pass</small>
                  </span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`tactical-btn tactical-btn-stacked ${report.route_accessibility === situationChoices.route ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("routeAccessibility", situationChoices.route!)}
                  aria-pressed={report.route_accessibility === situationChoices.route}
                >
                  <span className="tactical-btn-icon icon-alley"><i className="fa-solid fa-person-walking" /></span>
                  <span className="tactical-btn-content">
                    <strong>{situationChoices.route === "NARROW_STREET" ? "Narrow street" : situationChoices.route === "INTERIOR_ALLEY_ESKINITA" ? "Narrow alley" : "Difficult road access"}</strong>
                    <small>{situationChoices.route === "NARROW_STREET" ? "Fire trucks may have difficulty passing" : situationChoices.route === "INTERIOR_ALLEY_ESKINITA" ? "A fire truck may not fit" : "Road is blocked or ends before the fire"}</small>
                  </span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
              </div>
            </div>}

            {savedFeedback && <span className="tactical-saved-pill">{savedFeedback}</span>}
          </section>}
        </div>

        <div className="resident-grid-col">
          <section className="resident-detail-card">
            <h2>
              <i className="fa-solid fa-file-lines" aria-hidden="true" /> {pick("Report Information", "Impormasyon sang Report", "Impormasyon ng Ulat")}
            </h2>
            <ul className="rrs-details">
              <li>
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                <span><small>{pick("Location", "Lokasyon", "Lokasyon")}</small><strong>{`${report.barangay}, ${report.municipality}`}</strong></span>
              </li>
              {report.nearest_landmark && (
                <li>
                  <i className="fa-solid fa-landmark" aria-hidden="true" />
                  <span><small>{pick("Nearest Landmark", "Pinakamalapit nga Landmark", "Pinakamalapit na Landmark")}</small><strong>{report.nearest_landmark}</strong></span>
                </li>
              )}
              <li>
                <i className="fa-solid fa-fire" aria-hidden="true" />
                <span><small>{pick("Fire Type", "Klase sang Kalayo", "Uri ng Sunog")}</small><strong>{fireTypes.map(formatFireType).join(" + ")}</strong></span>
              </li>
              <li>
                <i className="fa-solid fa-clock" aria-hidden="true" />
                <span><small>{t("thDateReported")}</small><strong>{formatDate(report.submitted_at)}</strong></span>
              </li>
              <li>
                <i className="fa-solid fa-hashtag" aria-hidden="true" />
                <span><small>{pick("Report No.", "Report No.", "Numero ng Ulat")}</small><strong>{report.reference_number || report.id.slice(0, 8)}</strong></span>
              </li>
            </ul>
          </section>

          {hasPhotos && (
            <section className="resident-detail-card">
              <h2>
                <i className="fa-solid fa-camera" aria-hidden="true" /> {pick("Incident Photos", "Mga Litrato sang Insidente", "Mga Litrato ng Insidente")} ({photos.length})
              </h2>
              <div className="resident-photos-preview-grid rrs-photos">
                {photos.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="resident-photo-preview-thumb"
                    onClick={() => {
                      setActivePhotoIndex(idx);
                      setIsPhotoDialogOpen(true);
                    }}
                    aria-haspopup="dialog"
                    aria-label={`Open photo ${idx + 1}`}
                  >
                    <img src={p.url} alt={`Fire incident ${idx + 1}`} className="resident-photo-preview-img" />
                    <span className="rrs-photo-zoom" aria-hidden="true"><i className="fa-solid fa-expand" /></span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="resident-safety-card">
            <span className="resident-safety-icon">
              <img src="/images/fire logo.webp" alt="" aria-hidden />
            </span>
            <div>
              <h2>{lang === "en" ? "Fire Safety Reminder" : lang === "hil" ? "Pahanumdom sa Kaluwasan" : "Paalala sa Kaligtasan"}</h2>
              <p>{lang === "en" ? "Stay calm, move away from the fire, and follow the instructions of responders." : lang === "hil" ? "Magpabilin nga kalmado, magpalayo sa kalayo, kag sunda ang mga panudlo sang mga responder." : "Manatiling kalmado, lumayo sa sunog, at sundin ang mga tagubilin ng mga responder."}</p>
            </div>
          </section>
        </div>
      </div>

      {isPhotoDialogOpen && hasPhotos && currentPhoto && (
        <div
          className="resident-photo-backdrop"
          role="presentation"
          onMouseDown={() => setIsPhotoDialogOpen(false)}
        >
          <div
            className="resident-photo-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Submitted incident photo gallery"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="resident-photo-dialog-header">
              <span className="resident-photo-counter-pill">
                📷 {photos.length > 1 ? `Photo ${activePhotoIndex + 1} of ${photos.length}` : "Incident Photo"}
              </span>
              <button
                type="button"
                className="resident-photo-close"
                onClick={() => setIsPhotoDialogOpen(false)}
                aria-label="Close photo"
              >
                ×
              </button>
            </div>

            <div
              className="resident-photo-stage"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {photos.length > 1 && (
                <button
                  type="button"
                  className="photo-nav-arrow prev"
                  onClick={() => setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
              )}

              <img
                key={currentPhoto.url}
                className="resident-photo-dialog-image"
                src={currentPhoto.url}
                alt={`Submitted fire incident photo ${activePhotoIndex + 1}`}
              />

              {photos.length > 1 && (
                <button
                  type="button"
                  className="photo-nav-arrow next"
                  onClick={() => setActivePhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
                  aria-label="Next photo"
                >
                  ›
                </button>
              )}
            </div>

            {photos.length > 1 && (
              <div className="resident-photo-dots">
                {photos.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`photo-slide-dot ${idx === activePhotoIndex ? "active" : ""}`}
                    onClick={() => setActivePhotoIndex(idx)}
                    aria-label={`Go to photo ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{detailStyles}</style>
      <main className="resident-report-detail">
        <div className="resident-report-detail-inner">{children}</div>
      </main>
    </>
  );
}

type StatusTone = "wait" | "good" | "stop" | "info";

/** Plain words for where the report stands, so a resident does not have to read the tracker. */
function statusView(status: string, lang: ResidentLanguage): { tone: StatusTone; icon: string; title: string; message: string } {
  const pick = (en: string, hil: string, tl: string) => (lang === "en" ? en : lang === "hil" ? hil : tl);
  const keepSafe = pick("Stay in a safe place. This page updates by itself.", "Magpabilin sa luwas nga lugar. Kusa nga nagaupdate ini nga pahina.", "Manatili sa ligtas na lugar. Kusang nag-a-update ang pahinang ito.");
  const followResponders = pick("Stay in a safe place and follow responder instructions.", "Magpabilin sa luwas nga lugar kag sunda ang mga responder.", "Manatili sa ligtas na lugar at sundin ang mga responder.");
  switch (status) {
    case "NEEDS_MORE_INFO":
      return { tone: "wait", icon: "fa-circle-question", title: pick("BFP needs more details", "Kinahanglan sang BFP sang dugang nga detalye", "Kailangan ng BFP ng dagdag na detalye"), message: keepSafe };
    case "VERIFIED":
    case "CONFIRMED":
      return { tone: "good", icon: "fa-shield-halved", title: pick("BFP verified your report", "Nakumpirma sang BFP ang imo report", "Kinumpirma ng BFP ang iyong ulat"), message: keepSafe };
    case "RESPONDING":
      return { tone: "good", icon: "fa-person-running", title: pick("BFP is responding", "Nagaresponde na ang BFP", "Tumutugon na ang BFP"), message: followResponders };
    case "FIRETRUCK_DISPATCHED":
      return { tone: "good", icon: "fa-truck-fast", title: pick("A fire truck is on the way", "Nagapadulong na ang fire truck", "Papunta na ang fire truck"), message: followResponders };
    case "RESPONDER_ARRIVED":
      return { tone: "good", icon: "fa-helmet-safety", title: pick("Responders are at the scene", "Ara na ang mga responder sa lugar", "Nasa lugar na ang mga responder"), message: followResponders };
    case "UNDER_CONTROL":
      return { tone: "good", icon: "fa-fire-extinguisher", title: pick("The fire is under control", "Kontrolado na ang sunog", "Kontrolado na ang sunog"), message: followResponders };
    case "RESOLVED":
    case "CLOSED":
      return { tone: "good", icon: "fa-circle-check", title: pick("The fire is out", "Naapula na ang sunog", "Naapula na ang sunog"), message: pick("Thank you for reporting.", "Salamat sa imo pagreport.", "Salamat sa iyong pag-uulat.") };
    case "REJECTED":
    case "FALSE_REPORT":
      return { tone: "stop", icon: "fa-circle-xmark", title: pick("BFP could not verify this report", "Wala nakumpirma sang BFP ini nga report", "Hindi nakumpirma ng BFP ang ulat na ito"), message: pick("Call BFP or 911 if there is still a fire.", "Tawagi ang BFP ukon 911 kon may sunog pa.", "Tumawag sa BFP o 911 kung may sunog pa.") };
    case "DUPLICATE":
      return { tone: "info", icon: "fa-link", title: pick("This fire was already reported", "Nareport na ini nga sunog", "Naiulat na ang sunog na ito"), message: pick("BFP is following the first report.", "Ginasunod sang BFP ang nauna nga report.", "Sinusubaybayan ng BFP ang naunang ulat.") };
    default:
      return { tone: "wait", icon: "fa-paper-plane", title: pick("Report sent. BFP is checking it.", "Napadala na. Ginacheck na sang BFP.", "Naipadala na. Sinusuri na ng BFP."), message: keepSafe };
  }
}

const DANGER_ORDER = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
type DangerLevel = (typeof DANGER_ORDER)[number];

const DANGER_ICONS: Record<DangerLevel, string> = {
  LOW: "fa-temperature-low",
  MODERATE: "fa-triangle-exclamation",
  HIGH: "fa-fire",
  CRITICAL: "fa-fire-flame-curved",
};

function dangerWord(level: DangerLevel, lang: ResidentLanguage) {
  const words: Record<DangerLevel, [string, string, string]> = {
    LOW: ["Low", "Nubo", "Mababa"],
    MODERATE: ["Moderate", "Tunga-tunga", "Katamtaman"],
    HIGH: ["High", "Mataas", "Mataas"],
    CRITICAL: ["Critical", "Kritikal", "Kritikal"],
  };
  const [en, hil, tl] = words[level];
  return lang === "en" ? en : lang === "hil" ? hil : tl;
}

function dangerTitle(level: DangerLevel, lang: ResidentLanguage) {
  const word = dangerWord(level, lang);
  return lang === "en" ? `${word} danger` : lang === "hil" ? `${word} nga kadilikado` : `${word} na panganib`;
}

/** An icon for each reason the level was raised. */
function factorIcon(factor: string) {
  const text = factor.toLowerCase();
  if (text.includes("vehicle")) return "fa-car-burst";
  if (text.includes("rubbish")) return "fa-trash-can";
  if (text.includes("sets the level") || text.includes("also burning")) return "fa-fire";
  if (/hangin|wind|gale/.test(text)) return "fa-wind";
  if (/init|°c|tuyong|heat|dry/.test(text)) return "fa-temperature-high";
  if (/eskinita|alley|looban|off-road|malayo sa kalsada/.test(text)) return "fa-person-walking";
  if (/kalsada|daan|road|dead-end/.test(text)) return "fa-road";
  if (/dikit|close together|closely built/.test(text)) return "fa-city";
  if (/magkakalayo|far apart/.test(text)) return "fa-house";
  if (/kahoy|kawayan|nipa|light combustible/.test(text)) return "fa-tree";
  if (/commercial|storage|flammable/.test(text)) return "fa-warehouse";
  if (/semi-concrete/.test(text)) return "fa-house-chimney";
  if (/building/.test(text)) return "fa-building";
  return "fa-circle-exclamation";
}

/** "Malakas ang hangin (28 km/h - mabilis kumalat ang apoy)" becomes "Malakas ang hangin · 28 km/h". */
function shortFactor(factor: string) {
  const match = factor.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (!match) return factor;
  const measure = match[2].match(/^[\d.]+\s*(?:km\/h|°C)/);
  return measure ? `${match[1]} · ${measure[0]}` : match[1];
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function timelineIndex(status: FireReportStatus) {
  if (["RESOLVED", "CLOSED"].includes(status)) return 4;
  if (status === "FIRETRUCK_DISPATCHED" || status === "RESPONDER_ARRIVED" || status === "UNDER_CONTROL") return 3;
  if (status === "RESPONDING") return 2;
  if (["VERIFIED", "CONFIRMED"].includes(status)) return 1;
  return 0;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFireType(value: string) {
  return (
    ({
      HOUSE_BUILDING: "House/Building Fire",
      GRASS: "Grass Fire",
      FOREST: "Forest Fire",
      VEHICLE: "Vehicle Fire",
      OTHER: "Rubbish Fire",
    } as Record<string, string>)[value] || "Fire incident"
  );
}
