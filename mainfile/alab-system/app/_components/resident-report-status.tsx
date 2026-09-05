"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useMemo, useState } from "react";
import { fireReportStatusLabels, type FireReportStatus } from "../../lib/fire-reports/types";
import { useResidentLanguage, getLocalizedStatusLabel, type ResidentLanguage } from "../_lib/resident-i18n";

type Report = {
  id: string;
  reference_number: string;
  status: FireReportStatus;
  fire_type: string;
  description: string;
  nearest_landmark: string | null;
  municipality: string;
  barangay: string;
  submitted_at: string;
  structure_material?: string | null;
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
};

const detailStyles = `
  .resident-report-detail { min-height: 100vh; padding: 1.4rem 1rem 8rem; background: #fbfaf9; color: #1e293b; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .resident-report-detail-inner { width: min(100%, 51rem); margin: 0 auto; }
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
    word-break: break-word;
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
    gap: 0.55rem;
    margin-bottom: 0.85rem;
  }
  .resident-photo-preview-thumb {
    position: relative;
    aspect-ratio: 1;
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
    object-fit: cover;
    display: block;
    transition: transform 0.25s ease;
  }
  .resident-photo-preview-thumb:hover .resident-photo-preview-img {
    transform: scale(1.06);
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
`;

const timeline = [
  { status: "PENDING_VERIFICATION", label: "Submitted" },
  { status: "VERIFIED", label: "Verified" },
  { status: "RESPONDING", label: "Responding" },
  { status: "FIRETRUCK_DISPATCHED", label: "Dispatched" },
  { status: "RESOLVED", label: "Resolved" },
] as const;

export function ResidentReportStatus({ reportId }: { reportId: string }) {
  const { lang, t } = useResidentLanguage();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
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
        setShowOnboarding(true);
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

  const activeTimelineIndex = useMemo(() => (report ? timelineIndex(report.status) : 0), [report]);

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
    setReport((prev) => (prev ? { ...prev, [mappedField]: val } : prev));
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
        setReport((prev) => (prev ? { ...prev, ...data.report } : prev));
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
  const severity = report.calculated_severity || "MODERATE";
  const hasPhotos = photos.length > 0;

  return (
    <Shell>
      <div className="resident-detail-heading">
        <a className="resident-detail-back" href="/resident/reports" aria-label="Back to reports">
          ‹
        </a>
        <h1>Report Details</h1>
      </div>

      <section className="resident-detail-hero">
        <div className="resident-hero-main">
          <p className="resident-ref-badge">REPORT #{report.reference_number || report.id.slice(0, 8)}</p>
          <p className="resident-hero-time">Reported on {formatDate(report.submitted_at)}</p>
        </div>
        <div className="resident-hero-badges">
          <span className={`severity-pill ${severity}`}>
            {severity} {lang === "en" ? "Severity" : lang === "hil" ? "Kagrabehon" : "Kaselanan"}
          </span>
          <span className="resident-status-pill">{getLocalizedStatusLabel(report.status, lang)}</span>
        </div>
      </section>

      {windSpeed >= 25 && (
        <section className="wind-hazard-banner" role="alert">
          <span className="wind-hazard-icon" aria-hidden="true">💨</span>
          <div className="wind-hazard-body">
            <strong>Malakas ang Hangin ({Math.round(windSpeed)} km/h {report.weather_wind_condition})</strong>
            <p>
              Mabilis kumalat ang apoy sa direksyon ng hangin. Lumikas patungong <strong>UPWIND</strong> (salungat sa direksyon ng hangin at usok) upang manatiling ligtas.
            </p>
          </div>
        </section>
      )}

      <div className="resident-detail-grid">
        <div className="resident-grid-col">
          <section className="resident-detail-card tactical-enrichment-card">
            <h2>
              <i className="fa-solid fa-bolt" style={{ color: "#DC2626", marginRight: "0.4rem" }} />{" "}
              {lang === "en" ? "Help Responders" : lang === "hil" ? "Bulig sa mga Responders" : "Tulong sa Responders"}
            </h2>
            <p className="tactical-header-desc">
              {lang === "en"
                ? "Select to help BFP prepare appropriate equipment while en route:"
                : lang === "hil"
                ? "Pilia agud mahanda sang BFP ang insakto nga kagamitan samtang nagapadulong:"
                : "Piliin para maihanda ang angkop na kagamitan ng BFP habang papunta:"}
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

            <div className="tactical-group">
              <div className="tactical-group-header">
                <span className="tactical-label">Materyales (Fuel):</span>
                <span className={`tactical-select-guide ${report.structure_material ? "is-done" : ""}`}>
                  {report.structure_material ? "✓ Napili" : "Pumili ng 1"}
                </span>
              </div>
              <div className="tactical-grid-3">
                <button
                  type="button"
                  className={`tactical-btn ${report.structure_material === "LIGHT_MATERIALS" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("structureMaterial", "LIGHT_MATERIALS")}
                  aria-pressed={report.structure_material === "LIGHT_MATERIALS"}
                >
                  <span className="tactical-btn-icon icon-wood"><i className="fa-solid fa-tree" /></span>
                  <span className="tactical-btn-text">Kahoy / Light</span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`tactical-btn ${report.structure_material === "CONCRETE_MIXED" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("structureMaterial", "CONCRETE_MIXED")}
                  aria-pressed={report.structure_material === "CONCRETE_MIXED"}
                >
                  <span className="tactical-btn-icon icon-semi"><i className="fa-solid fa-house-chimney" /></span>
                  <span className="tactical-btn-text">Semento / Halos</span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`tactical-btn ${report.structure_material === "COMMERCIAL_STEEL" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("structureMaterial", "COMMERCIAL_STEEL")}
                  aria-pressed={report.structure_material === "COMMERCIAL_STEEL"}
                >
                  <span className="tactical-btn-icon icon-concrete"><i className="fa-solid fa-building" /></span>
                  <span className="tactical-btn-text">Bakal / Warehouse</span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="tactical-group">
              <div className="tactical-group-header">
                <span className="tactical-label">Dikit-dikit ng Kabahayan:</span>
                <span className={`tactical-select-guide ${report.house_density ? "is-done" : ""}`}>
                  {report.house_density ? "✓ Napili" : "Pumili ng 1"}
                </span>
              </div>
              <div className="tactical-grid-3">
                <button
                  type="button"
                  className={`tactical-btn ${report.house_density === "ISOLATED" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("houseDensity", "ISOLATED")}
                  aria-pressed={report.house_density === "ISOLATED"}
                >
                  <span className="tactical-btn-icon icon-spaced"><i className="fa-solid fa-house" /></span>
                  <span className="tactical-btn-text">Malayo (Hiwalay)</span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`tactical-btn ${report.house_density === "MODERATE" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("houseDensity", "MODERATE")}
                  aria-pressed={report.house_density === "MODERATE"}
                >
                  <span className="tactical-btn-icon icon-semi"><i className="fa-solid fa-house-chimney-window" /></span>
                  <span className="tactical-btn-text">Katamtaman</span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`tactical-btn ${report.house_density === "HIGH_DENSITY" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("houseDensity", "HIGH_DENSITY")}
                  aria-pressed={report.house_density === "HIGH_DENSITY"}
                >
                  <span className="tactical-btn-icon icon-packed"><i className="fa-solid fa-city" /></span>
                  <span className="tactical-btn-text">Dikit-dikit (Kumpul-kumpol)</span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="tactical-group">
              <div className="tactical-group-header">
                <span className="tactical-label">Luwang ng Daanan (Truck Access):</span>
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
                  <span className="tactical-btn-icon icon-truck"><i className="fa-solid fa-truck-fire" /></span>
                  <span className="tactical-btn-content">
                    <strong>Malapad na Kalsada</strong>
                    <small>Kasya ang malalaking firetruck</small>
                  </span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`tactical-btn tactical-btn-stacked ${report.route_accessibility === "NARROW_ALLEY" ? "is-selected" : ""}`}
                  onClick={() => updateTacticalDetail("routeAccessibility", "NARROW_ALLEY")}
                  aria-pressed={report.route_accessibility === "NARROW_ALLEY"}
                >
                  <span className="tactical-btn-icon icon-alley"><i className="fa-solid fa-person-walking" /></span>
                  <span className="tactical-btn-content">
                    <strong>Makipot / Eskenita</strong>
                    <small>Maaaring mahirapan o kailangan ng hose extension</small>
                  </span>
                  <span className="tactical-radio-dot" aria-hidden="true" />
                </button>
              </div>
            </div>

            {savedFeedback && <span className="tactical-saved-pill">{savedFeedback}</span>}
          </section>

          <section className="resident-detail-card">
            <h2>
              <span>⏱</span> {lang === "en" ? "Status Timeline" : lang === "hil" ? "Timeline sang Status" : "Timeline ng Katayuan"}
            </h2>
            <div className="resident-timeline">
              {timeline.map((item, index) => {
                const isComplete = index < activeTimelineIndex;
                const isCurrent = index === activeTimelineIndex;
                const historyItem = report.history.find((entry) => entry.next_status === item.status);
                return (
                  <div
                    key={item.status}
                    className={`resident-timeline-step ${isComplete ? "complete" : ""} ${isCurrent ? "current" : ""}`}
                  >
                    <div className="resident-timeline-dot">{isComplete ? "✓" : index + 1}</div>
                    {getTimelineLabel(item.status, item.label)}
                    {historyItem && (
                      <span className="resident-timeline-date">{formatDate(historyItem.created_at)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="resident-detail-card">
            <h2>
              <span>▣</span> {lang === "en" ? "Latest Update from Municipal BFP" : lang === "hil" ? "Pinakabag-o nga Update halin sa BFP" : "Pinakabagong Update mula sa BFP"}
            </h2>
            <p className="resident-bfp-update">
              {report.status === "RESPONDING"
                ? (lang === "hil"
                    ? "Nagaresponde na ang BFP sa imo report sang sunog. Magpabilin sa luwas nga lugar kag sunda ang mga panudlo."
                    : lang === "tl"
                    ? "Tumutugon na ang BFP sa iyong ulat ng sunog. Manatili sa ligtas na lugar at sundin ang mga tagubilin."
                    : "BFP is responding to your fire report. Please stay in a safe location and follow responder instructions.")
                : latest?.resident_message || (lang === "hil" ? "Nabaton na ang imo report kag ginaproseso na ini." : lang === "tl" ? "Natanggap na ang iyong ulat at kasalukuyan itong pinoproseso." : "Your report has been received and is being processed.")}
            </p>
            <p className="resident-update-time">
              {latest ? formatDate(latest.created_at) : formatDate(report.submitted_at)}
            </p>
          </section>
        </div>

        <div className="resident-grid-col">
          <section className="resident-detail-card">
            <h2>
              <span>⌖</span> {lang === "en" ? "Incident Information" : lang === "hil" ? "Impormasyon sang Insidente" : "Impormasyon ng Insidente"}
            </h2>
            <div className="resident-detail-info">
              <Info label={lang === "en" ? "Location" : "Lokasyon"} value={`${report.barangay}, ${report.municipality}`} icon="pin" />
              <Info label={lang === "en" ? "Nearest Landmark" : lang === "hil" ? "Pinakamalapit nga Landmark" : "Pinakamalapit na Landmark"} value={report.nearest_landmark || (lang === "en" ? "Not provided" : "Hindi tinukoy")} icon="home" />
              <Info label={t("thDateReported")} value={formatDate(report.submitted_at)} icon="calendar" />
              <Info label={lang === "en" ? "Fire Type" : lang === "hil" ? "Klase sang Kalayo" : "Uri ng Sunog"} value={formatFireType(report.fire_type)} icon="fire" />
            </div>
          </section>

          <section className="resident-detail-card">
            <h2>
              <span>▧</span> {lang === "en" ? "Report Information" : lang === "hil" ? "Impormasyon sang Report" : "Impormasyon ng Ulat"}
            </h2>
            <div className="resident-detail-info">
              <Info label={lang === "en" ? "Report ID" : lang === "hil" ? "Report ID" : "ID ng Ulat"} value={report.id} icon="file" />
              <Info label={t("thStatus")} value={getLocalizedStatusLabel(report.status, lang)} icon="file" status />
              <Info label={lang === "en" ? "Municipality" : lang === "hil" ? "Munisipyo" : "Munisipalidad"} value={report.municipality} icon="pin" />
              <Info label="Barangay" value={report.barangay} icon="pin" />
            </div>
          </section>

          {hasPhotos && (
            <section className="resident-detail-card">
              <h2>
                <span>📷</span> {lang === "en" ? "Incident Photos" : lang === "hil" ? "Mga Litrato sang Insidente" : "Mga Litrato ng Insidente"} ({photos.length})
              </h2>

              {photos.length > 1 && (
                <div className="resident-photos-preview-grid">
                  {photos.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="resident-photo-preview-thumb"
                      onClick={() => {
                        setActivePhotoIndex(idx);
                        setIsPhotoDialogOpen(true);
                      }}
                      aria-label={`Open photo ${idx + 1}`}
                    >
                      <img src={p.url} alt={`Fire incident ${idx + 1}`} className="resident-photo-preview-img" />
                      <span className="resident-photo-preview-badge">Photo {idx + 1}</span>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="resident-photo-button"
                onClick={() => {
                  setActivePhotoIndex(0);
                  setIsPhotoDialogOpen(true);
                }}
                aria-haspopup="dialog"
              >
                <span>{lang === "en" ? "View incident photo" : lang === "hil" ? "Tan-awon ang litrato" : "Tingnan ang litrato"} {photos.length > 1 ? `slideshow (${photos.length} photos)` : ""}</span>
              </button>
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

function Info({
  label,
  value,
  icon,
  status = false,
}: {
  label: string;
  value: string;
  icon: "pin" | "home" | "calendar" | "fire" | "file" | "person" | "phone";
  status?: boolean;
}) {
  return (
    <div className="resident-detail-info-item">
      <InfoIcon icon={icon} />
      <span>
        <small>{label}</small>
        <strong className={status ? "status" : undefined}>{value}</strong>
      </span>
    </div>
  );
}

function InfoIcon({ icon }: { icon: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {icon === "pin" && (
        <>
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0Z" />
          <circle cx="12" cy="10" r="3" />
        </>
      )}
      {icon === "home" && (
        <>
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v10h14V10" />
        </>
      )}
      {icon === "calendar" && (
        <>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </>
      )}
      {icon === "fire" && (
        <path d="M12 22c4 0 7-2.8 7-6.6 0-3.1-1.9-5.1-4.1-7.8-.4 2.3-1.4 3.7-2.9 4.6.1-3-1.1-5.3-3.2-7.3.2 3-1.6 5-2.8 6.8C4.7 13.7 5 22 12 22Z" />
      )}
      {icon === "file" && (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
        </>
      )}
      {icon === "person" && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      )}
      {icon === "phone" && (
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7A2 2 0 0 1 22 16.9Z" />
      )}
    </svg>
  );
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
      OTHER: "Other",
    } as Record<string, string>)[value] || "Fire incident"
  );
}
