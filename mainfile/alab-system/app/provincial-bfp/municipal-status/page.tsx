'use client';

import React, { useEffect, useState } from 'react';
import { useProvincialManagementList } from '../../_components/use-provincial-management-list';
import Link from 'next/link';
import type { MunicipalitySummary } from '../../../lib/provincial-bfp/management/types';

const styles = `
  .pbfp-page {
    padding: 10px 1.5rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #EEF5FD;
    min-height: 100%;
    color: #0F172A;
    position: relative;
    isolation: isolate;
  }

  /* Frosted panels need something to refract. These wide, faint colour fields
     sit behind the grid and only register through the blur. */
  .pbfp-page::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(760px circle at 12% 8%, rgba(226, 54, 50, 0.1), transparent 60%),
      radial-gradient(680px circle at 88% 22%, rgba(37, 99, 235, 0.11), transparent 62%),
      radial-gradient(720px circle at 62% 92%, rgba(5, 150, 105, 0.09), transparent 60%);
  }

  /* Header Hub */
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

  .pbfp-header-title-box p {
    font-size: 0.8rem;
    color: #64748B;
    margin: 0.15rem 0 0;
    font-weight: 500;
  }

  .pbfp-header-actions {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .pbfp-btn-refresh {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 0.95rem;
    background: #FFFFFF;
    color: #334155;
    border: 1px solid #CBD5E1;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pbfp-btn-refresh:hover {
    background: #F8FAFC;
    color: #0F172A;
    border-color: #94A3B8;
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

  /* Toolbar */
  .pbfp-toolbar-box {
    background: rgba(255, 255, 255, 0.68);
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 14px;
    padding: 0.75rem 1.15rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    flex-wrap: wrap;
    box-shadow:
      0 4px 16px rgba(38, 65, 99, 0.07),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  .pbfp-filter-pills {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: #F1F5F9;
    padding: 0.25rem;
    border-radius: 10px;
    flex-wrap: wrap;
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
    width: 270px;
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

  /* Carries the metric names for assistive tech now that the captions are gone. */
  .pbfp-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Cards Grid */
  .pbfp-grid-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  /* Frosted panel: a translucent surface over the page tint, lifted by a bright
     inner top edge. The blur is what sells it, so the fill stays under 70%. */
  .pbfp-clean-card {
    background: rgba(255, 255, 255, 0.62);
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 16px;
    padding: 1.1rem 1.15rem 0.9rem;
    box-shadow:
      0 4px 16px rgba(38, 65, 99, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    cursor: pointer;
    transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease, background 0.18s ease;
    position: relative;
    user-select: none;
    overflow: hidden;
    animation: pbfpCardReveal 0.42s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  /* The accent rail is the card's status in peripheral vision, before any text is read. */
  .pbfp-clean-card::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: #E2E8F0;
    transition: background 0.18s ease;
  }

  .pbfp-clean-card:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.78);
    border-color: rgba(255, 255, 255, 0.95);
    box-shadow:
      0 14px 32px rgba(38, 65, 99, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.95);
  }

  .pbfp-clean-card:focus-visible {
    outline: none;
    border-color: #E23632;
    box-shadow: 0 0 0 3px rgba(226, 54, 50, 0.18);
  }

  /* An active municipality is busy, not broken. It gets a warmer surface and a
     lit rail rather than a hard red outline, so it stands out in the grid
     without reading as an error state. */
  .pbfp-clean-card.has-active-incidents {
    border-color: rgba(226, 54, 50, 0.22);
    background:
      linear-gradient(180deg, rgba(255, 241, 242, 0.92) 0%, rgba(255, 255, 255, 0.72) 55%),
      rgba(255, 255, 255, 0.55);
  }

  .pbfp-clean-card.has-active-incidents::before {
    background: linear-gradient(180deg, #F97316 0%, #E23632 100%);
  }

  .pbfp-clean-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .pbfp-station-identity {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
  }

  /* Crest tile: gives every card a fixed optical anchor on the left. */
  .pbfp-card-crest {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    background: rgba(241, 245, 249, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.8);
    color: #64748B;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    flex-shrink: 0;
    transition: background 0.18s ease, color 0.18s ease;
  }

  .pbfp-clean-card.has-active-incidents .pbfp-card-crest {
    background: #FFF1F2;
    color: #E23632;
  }

  .pbfp-station-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .pbfp-station-title {
    font-size: 0.98rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.25;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pbfp-station-district {
    font-size: 0.7rem;
    color: #94A3B8;
    font-weight: 600;
    margin-top: 0.1rem;
  }

  /* Status Badges */
  .pbfp-tile-status-pill {
    font-size: 0.64rem;
    font-weight: 800;
    padding: 0.22rem 0.55rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    white-space: nowrap;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  /* A quiet municipality says so with a dot; only a live one spends words. */
  .pbfp-tile-status-pill.ready .pbfp-status-word {
    display: none;
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

  .pbfp-tile-status-pill.active-fire {
    background: #FFF1F2;
    color: #E23632;
    border: 1px solid #FFE4E6;
    box-shadow: 0 0 12px rgba(226, 54, 50, 0.2);
  }
  .pbfp-tile-status-pill.active-fire .pbfp-beacon-dot {
    background: #E23632;
    box-shadow: 0 0 6px #E23632;
    animation: pbfpBreathe 1s infinite alternate;
  }

  .pbfp-metrics-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
  }

  /* The icon names the measure and the figure carries it, so the caption that
     used to truncate under a narrow tile is no longer needed. */
  .pbfp-metric-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.75);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
    border-radius: 11px;
    padding: 0.5rem 0.4rem;
    min-width: 0;
  }

  .pbfp-metric-icon {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    flex-shrink: 0;
  }

  .pbfp-metric-icon.stations { background: #FEE2E2; color: #DC2626; }
  .pbfp-metric-icon.personnel { background: #DBEAFE; color: #2563EB; }
  .pbfp-metric-icon.residents { background: #DCFCE7; color: #059669; }

  .pbfp-metric-value {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  /* Zero is real information here, but it should not shout like a count does. */
  .pbfp-metric-item.is-zero .pbfp-metric-value {
    color: #94A3B8;
  }

  .pbfp-metric-item.is-zero .pbfp-metric-icon {
    opacity: 0.55;
  }

  .pbfp-clean-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding-top: 0.6rem;
    margin-top: auto;
    border-top: 1px solid #F1F5F9;
    font-size: 0.72rem;
    font-weight: 700;
    color: #64748B;
  }

  .pbfp-footer-note {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
  }

  .pbfp-footer-note i {
    font-size: 0.68rem;
    color: #94A3B8;
  }

  /* Pending work is a queue someone has to clear, so it is amber, not grey. */
  .pbfp-footer-note.pending {
    color: #B45309;
  }

  .pbfp-footer-note.pending i {
    color: #D97706;
  }

  .pbfp-open-prompt {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #E23632;
    font-weight: 700;
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }

  .pbfp-clean-card:hover .pbfp-open-prompt {
    transform: translateX(3px);
  }

  /* Command Inspector Modal */
  /* The page behind a dialog must not scroll, so the overlay owns the scrolling. */
  body.pbfp-scroll-locked {
    overflow: hidden;
  }

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
    overflow-y: auto;
    overscroll-behavior: contain;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-modal-card {
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border-radius: 20px;
    box-shadow:
      0 30px 70px rgba(15, 23, 42, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.9);
    max-width: 640px;
    width: 100%;
    max-height: calc(100vh - 3rem);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: pbfpModalPop 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pbfp-modal-header {
    padding: 1.15rem 1.35rem;
    background: rgba(255, 255, 255, 0.55);
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .pbfp-modal-title-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .pbfp-modal-icon-badge {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: #FFF1F2;
    border: 1px solid #FFE4E6;
    color: #E23632;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
  }

  .pbfp-modal-title h3 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pbfp-modal-title span {
    font-size: 0.74rem;
    color: #64748B;
    font-weight: 600;
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
    padding: 1.35rem;
    display: flex;
    flex-direction: column;
    gap: 1.35rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    flex: 1 1 auto;
    min-height: 0;
  }

  .pbfp-modal-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.6rem;
  }

  .pbfp-modal-stat-box {
    background: rgba(255, 255, 255, 0.62);
    border: 1px solid rgba(255, 255, 255, 0.85);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
    border-radius: 12px;
    padding: 0.8rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .pbfp-modal-stat-icon {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    background: #F1F5F9;
    color: #64748B;
  }

  .pbfp-modal-stat-icon.red { background: #FEE2E2; color: #DC2626; }
  .pbfp-modal-stat-icon.blue { background: #DBEAFE; color: #2563EB; }
  .pbfp-modal-stat-icon.green { background: #DCFCE7; color: #059669; }
  .pbfp-modal-stat-icon.amber { background: #FEF3C7; color: #D97706; }

  .pbfp-modal-stat-box.alert {
    background: #FFF1F2;
    border-color: #FFE4E6;
  }

  .pbfp-modal-stat-box.warning {
    background: #FFFBEB;
    border-color: #FEF3C7;
  }

  .pbfp-modal-stat-num {
    font-size: 1.35rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  .pbfp-modal-stat-box.is-zero .pbfp-modal-stat-num {
    color: #94A3B8;
  }

  .pbfp-modal-stat-box.alert .pbfp-modal-stat-num {
    color: #E23632;
  }

  .pbfp-modal-stat-box.warning .pbfp-modal-stat-num {
    color: #D97706;
  }

  .pbfp-modal-stat-lbl {
    font-size: 0.64rem;
    font-weight: 700;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1.25;
  }

  .pbfp-modal-links-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .pbfp-modal-links-title {
    font-size: 0.75rem;
    font-weight: 800;
    color: #334155;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.2rem;
  }

  .pbfp-modal-link-btn {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.7rem 0.85rem;
    background: rgba(255, 255, 255, 0.62);
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 12px;
    color: #0F172A;
    font-size: 0.82rem;
    font-weight: 700;
    text-decoration: none;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
  }

  .pbfp-modal-link-btn:hover {
    background: rgba(255, 255, 255, 0.92);
    border-color: rgba(203, 213, 225, 0.9);
    transform: translateX(3px);
  }

  .pbfp-link-icon {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.78rem;
    flex-shrink: 0;
  }

  .pbfp-link-icon.red { background: #FEE2E2; color: #DC2626; }
  .pbfp-link-icon.blue { background: #DBEAFE; color: #2563EB; }
  .pbfp-link-icon.green { background: #DCFCE7; color: #059669; }
  .pbfp-link-icon.amber { background: #FEF3C7; color: #D97706; }

  .pbfp-link-text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .pbfp-link-count {
    font-size: 0.68rem;
    font-weight: 600;
    color: #94A3B8;
    text-transform: none;
    letter-spacing: 0;
  }

  .pbfp-link-count.pending {
    color: #B45309;
  }

  /* The chevron sits hard right whatever the label length. */
  .pbfp-modal-link-btn > .fa-arrow-right {
    margin-left: auto;
    color: #CBD5E1;
    font-size: 0.75rem;
  }

  .pbfp-modal-link-btn:hover > .fa-arrow-right {
    color: #64748B;
  }

  .pbfp-modal-footer {
    padding: 0.95rem 1.35rem;
    background: rgba(248, 250, 252, 0.72);
    border-top: 1px solid rgba(226, 232, 240, 0.9);
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-shrink: 0;
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

  /* Skeletons carry the height of a real card so the grid does not jump. */
  .pbfp-card-skeleton {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    height: 168px;
    position: relative;
    overflow: hidden;
  }

  .pbfp-card-skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(148, 163, 184, 0.12) 50%, transparent 100%);
    animation: pbfpShimmer 1.4s infinite;
  }

  @keyframes pbfpShimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  @keyframes pbfpBreathe {
    0% { transform: scale(0.9); opacity: 0.8; }
    100% { transform: scale(1.3); opacity: 1; }
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pbfpCardReveal {
    0% { opacity: 0; transform: translateY(16px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes pbfpModalPop {
    0% { opacity: 0; transform: scale(0.92) translateY(20px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }

  @media (max-width: 1280px) {
    .pbfp-grid-cards { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 1024px) {
    .pbfp-grid-cards { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .pbfp-grid-cards { grid-template-columns: 1fr; }
    .pbfp-toolbar-box { flex-direction: column; align-items: stretch; }
    .pbfp-search-box { width: 100%; }
    .pbfp-modal-overlay { padding: 0.75rem; }
    .pbfp-modal-card { max-height: calc(100vh - 1.5rem); }
    .pbfp-modal-stats-grid { grid-template-columns: repeat(2, 1fr); }
    .pbfp-modal-footer { flex-direction: column-reverse; }
    .pbfp-modal-btn { justify-content: center; }
  }

  /* Honour a reduced-motion preference: keep the states, drop the movement. */
  @media (prefers-reduced-motion: reduce) {
    .pbfp-clean-card,
    .pbfp-modal-card,
    .pbfp-modal-overlay {
      animation: none;
    }
    .pbfp-clean-card:hover { transform: none; }
    .pbfp-modal-link-btn:hover { transform: none; }
    .pbfp-clean-card:hover .pbfp-open-prompt { transform: none; }
    .pbfp-tile-status-pill.active-fire .pbfp-beacon-dot { animation: none; }
  }
`;

export default function MunicipalStatusPage() {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE_INCIDENTS' | 'PENDING_APPS' | 'HAS_STATIONS'>('ALL');

  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalitySummary | null>(null);
  const { items: municipalities, loading, error, updatedAt: lastUpdated, filters, setFilter: setListFilter, refresh: fetchMunicipalities } = useProvincialManagementList<MunicipalitySummary>({ endpoint: '/api/provincial-bfp/municipalities', initialFilters: { pageSize: 25 } });
  const searchQuery = filters.search || '';
  const setSearchQuery = (value: string) => setListFilter('search', value);

  const filtered = municipalities.filter((m) => {
    if (filter === 'ACTIVE_INCIDENTS') return m.activeIncidentCount > 0;
    if (filter === 'PENDING_APPS') return m.pendingApplicationCount > 0;
    if (filter === 'HAS_STATIONS') return m.stationCount > 0;
    return true;
  });

  const activeIncidentsTotal = municipalities.filter((m) => m.activeIncidentCount > 0).length;
  const pendingAppsTotal = municipalities.filter((m) => m.pendingApplicationCount > 0).length;
  const hasStationsTotal = municipalities.filter((m) => m.stationCount > 0).length;

  // While the inspector is open the directory behind it must hold still, and
  // Escape has to close it the way every other dialog on the desktop does.
  useEffect(() => {
    if (!selectedMunicipality) return;

    document.body.classList.add('pbfp-scroll-locked');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedMunicipality(null);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.classList.remove('pbfp-scroll-locked');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedMunicipality]);

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
              <h1>Municipality Directory</h1>
              <p>
                Province of Antique · {municipalities.length} Local Government Units
                {lastUpdated && ` · Updated ${new Date(lastUpdated).toLocaleTimeString()}`}
              </p>
            </div>
          </div>
          <div className="pbfp-header-actions">
            <button
              type="button"
              className="pbfp-btn-refresh"
              onClick={() => fetchMunicipalities()}
              disabled={loading}
            >
              <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} /> Refresh
            </button>
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
              <span>All LGUs</span>
              <span className="pbfp-pill-count">{municipalities.length}</span>
            </button>
            <button
              type="button"
              className={`pbfp-filter-pill ${filter === 'ACTIVE_INCIDENTS' ? 'active' : ''}`}
              onClick={() => setFilter('ACTIVE_INCIDENTS')}
            >
              <span>Active Emergencies</span>
              <span className="pbfp-pill-count">{activeIncidentsTotal}</span>
            </button>
            <button
              type="button"
              className={`pbfp-filter-pill ${filter === 'PENDING_APPS' ? 'active' : ''}`}
              onClick={() => setFilter('PENDING_APPS')}
            >
              <span>Pending Reviews</span>
              <span className="pbfp-pill-count">{pendingAppsTotal}</span>
            </button>
            <button
              type="button"
              className={`pbfp-filter-pill ${filter === 'HAS_STATIONS' ? 'active' : ''}`}
              onClick={() => setFilter('HAS_STATIONS')}
            >
              <span>Active Stations</span>
              <span className="pbfp-pill-count">{hasStationsTotal}</span>
            </button>
          </div>

          <div className="pbfp-search-box">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              className="pbfp-search-input"
              placeholder="Search municipality..."
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

        {/* Error Notification */}
        {error && (
          <div style={{ background: '#FFF1F2', border: '1px solid #FFE4E6', borderRadius: '12px', padding: '1rem', color: '#E23632', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.5rem' }} />{error}</span>
            <button type="button" onClick={() => fetchMunicipalities()} style={{ background: '#E23632', color: '#FFF', border: 'none', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
          </div>
        )}

        {/* Cards Grid */}
        <div className="pbfp-grid-cards">
          {loading && municipalities.length === 0 ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="pbfp-card-skeleton" style={{ animationDelay: `${i * 60}ms` }} />
            ))
          ) : filtered.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem 1rem', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', color: '#64748B' }}>
              <i className="fa-solid fa-building-shield" style={{ fontSize: '2.5rem', color: '#CBD5E1', marginBottom: '0.5rem', display: 'block' }} />
              <strong style={{ display: 'block', color: '#0F172A', fontSize: '1rem' }}>No matching Antique municipalities found</strong>
              <span style={{ fontSize: '0.8rem' }}>Try clearing your search query or choosing another status tab.</span>
            </div>
          ) : (
            filtered.map((m, index) => {
              const hasActive = m.activeIncidentCount > 0;
              return (
                <div
                  className={`pbfp-clean-card ${hasActive ? 'has-active-incidents' : ''}`}
                  key={m.id}
                  style={{ animationDelay: `${Math.min(index * 35, 400)}ms` }}
                  onClick={() => setSelectedMunicipality(m)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedMunicipality(m);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect ${m.name}${hasActive ? `, ${m.activeIncidentCount} active incidents` : ', no active incidents'}`}
                >
                  <div className="pbfp-clean-card-header">
                    <div className="pbfp-station-identity">
                      <span className="pbfp-card-crest">
                        <i className={`fa-solid ${hasActive ? 'fa-fire' : 'fa-building-shield'}`} />
                      </span>
                      <span className="pbfp-station-text">
                        <span className="pbfp-station-title">{m.name}</span>
                        <span className="pbfp-station-district">{m.province}</span>
                      </span>
                    </div>
                    {hasActive ? (
                      <span className="pbfp-tile-status-pill active-fire" title={`${m.activeIncidentCount} active incidents`}>
                        <span className="pbfp-beacon-dot" />
                        <span className="pbfp-status-word">{m.activeIncidentCount} Active</span>
                      </span>
                    ) : (
                      <span className="pbfp-tile-status-pill ready" title="No active incidents">
                        <span className="pbfp-beacon-dot" />
                        <span className="pbfp-status-word">Clear</span>
                      </span>
                    )}
                  </div>

                  <div className="pbfp-metrics-strip">
                    <div
                      className={`pbfp-metric-item ${m.stationCount === 0 ? 'is-zero' : ''}`}
                      title={`${m.stationCount} fire stations`}
                    >
                      <span className="pbfp-metric-icon stations">
                        <i className="fa-solid fa-truck-fast" aria-hidden="true" />
                      </span>
                      <span className="pbfp-metric-value">{m.stationCount}</span>
                      <span className="pbfp-sr-only">fire stations</span>
                    </div>
                    <div
                      className={`pbfp-metric-item ${m.personnelCount === 0 ? 'is-zero' : ''}`}
                      title={`${m.personnelCount} BFP personnel`}
                    >
                      <span className="pbfp-metric-icon personnel">
                        <i className="fa-solid fa-user-shield" aria-hidden="true" />
                      </span>
                      <span className="pbfp-metric-value">{m.personnelCount}</span>
                      <span className="pbfp-sr-only">BFP personnel</span>
                    </div>
                    <div
                      className={`pbfp-metric-item ${m.residentCount === 0 ? 'is-zero' : ''}`}
                      title={`${m.residentCount} registered residents`}
                    >
                      <span className="pbfp-metric-icon residents">
                        <i className="fa-solid fa-users" aria-hidden="true" />
                      </span>
                      <span className="pbfp-metric-value">{m.residentCount}</span>
                      <span className="pbfp-sr-only">registered residents</span>
                    </div>
                  </div>

                  <div className="pbfp-clean-card-footer">
                    {m.pendingApplicationCount > 0 ? (
                      <span className="pbfp-footer-note pending">
                        <i className="fa-solid fa-id-card" />
                        {m.pendingApplicationCount} Pending Verification
                      </span>
                    ) : (
                      <span className="pbfp-footer-note">
                        <i className="fa-solid fa-file-lines" />
                        {m.totalReportCount} Total Reports
                      </span>
                    )}
                    <span className="pbfp-open-prompt">
                      Inspect <i className="fa-solid fa-arrow-right" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Command Inspector Modal */}
      {selectedMunicipality && (
        <div className="pbfp-modal-overlay" onClick={() => setSelectedMunicipality(null)}>
          <div
            className="pbfp-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pbfp-modal-heading"
          >
            <div className="pbfp-modal-header">
              <div className="pbfp-modal-title-group">
                <div className="pbfp-modal-icon-badge">
                  <i className="fa-solid fa-building-shield" />
                </div>
                <div className="pbfp-modal-title">
                  <h3 id="pbfp-modal-heading">{selectedMunicipality.name}</h3>
                  <span>Province of Antique · Municipal Jurisdiction</span>
                </div>
              </div>
              <button
                type="button"
                className="pbfp-modal-close"
                onClick={() => setSelectedMunicipality(null)}
                aria-label="Close municipality inspector"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="pbfp-modal-body">
              <div className="pbfp-modal-stats-grid">
                <div className={`pbfp-modal-stat-box ${selectedMunicipality.stationCount === 0 ? 'is-zero' : ''}`}>
                  <span className="pbfp-modal-stat-icon red"><i className="fa-solid fa-truck-fast" /></span>
                  <span className="pbfp-modal-stat-num">{selectedMunicipality.stationCount}</span>
                  <span className="pbfp-modal-stat-lbl">Active Stations</span>
                </div>
                <div className={`pbfp-modal-stat-box ${selectedMunicipality.personnelCount === 0 ? 'is-zero' : ''}`}>
                  <span className="pbfp-modal-stat-icon blue"><i className="fa-solid fa-user-shield" /></span>
                  <span className="pbfp-modal-stat-num">{selectedMunicipality.personnelCount}</span>
                  <span className="pbfp-modal-stat-lbl">BFP Personnel</span>
                </div>
                <div className={`pbfp-modal-stat-box ${selectedMunicipality.residentCount === 0 ? 'is-zero' : ''}`}>
                  <span className="pbfp-modal-stat-icon green"><i className="fa-solid fa-users" /></span>
                  <span className="pbfp-modal-stat-num">{selectedMunicipality.residentCount}</span>
                  <span className="pbfp-modal-stat-lbl">Registered Residents</span>
                </div>
                <div className={`pbfp-modal-stat-box ${selectedMunicipality.activeIncidentCount > 0 ? 'alert' : 'is-zero'}`}>
                  <span className="pbfp-modal-stat-icon red"><i className="fa-solid fa-fire" /></span>
                  <span className="pbfp-modal-stat-num">{selectedMunicipality.activeIncidentCount}</span>
                  <span className="pbfp-modal-stat-lbl">Active Emergencies</span>
                </div>
                <div className={`pbfp-modal-stat-box ${selectedMunicipality.pendingApplicationCount > 0 ? 'warning' : 'is-zero'}`}>
                  <span className="pbfp-modal-stat-icon amber"><i className="fa-solid fa-id-card" /></span>
                  <span className="pbfp-modal-stat-num">{selectedMunicipality.pendingApplicationCount}</span>
                  <span className="pbfp-modal-stat-lbl">Pending Applications</span>
                </div>
                <div className={`pbfp-modal-stat-box ${selectedMunicipality.resolvedIncidentCount === 0 ? 'is-zero' : ''}`}>
                  <span className="pbfp-modal-stat-icon green"><i className="fa-solid fa-circle-check" /></span>
                  <span className="pbfp-modal-stat-num">{selectedMunicipality.resolvedIncidentCount}</span>
                  <span className="pbfp-modal-stat-lbl">Resolved Fires</span>
                </div>
              </div>

              <div className="pbfp-modal-links-section">
                <span className="pbfp-modal-links-title">Provincial Management Modules</span>
                <Link
                  href={`/provincial-bfp/firetrucks-stations?view=stations&municipalityId=${selectedMunicipality.id}`}
                  className="pbfp-modal-link-btn"
                >
                  <span className="pbfp-link-icon red"><i className="fa-solid fa-truck-fast" /></span>
                  <span className="pbfp-link-text">
                    <span>Municipal Fire Stations</span>
                    <span className="pbfp-link-count">{selectedMunicipality.stationCount} on record</span>
                  </span>
                  <i className="fa-solid fa-arrow-right" />
                </Link>
                <Link
                  href={`/provincial-bfp/responders?municipalityId=${selectedMunicipality.id}`}
                  className="pbfp-modal-link-btn"
                >
                  <span className="pbfp-link-icon blue"><i className="fa-solid fa-user-shield" /></span>
                  <span className="pbfp-link-text">
                    <span>BFP Personnel Roster</span>
                    <span className="pbfp-link-count">{selectedMunicipality.personnelCount} assigned</span>
                  </span>
                  <i className="fa-solid fa-arrow-right" />
                </Link>
                <Link
                  href={`/provincial-bfp/resident-applications?municipalityId=${selectedMunicipality.id}`}
                  className="pbfp-modal-link-btn"
                >
                  <span className="pbfp-link-icon amber"><i className="fa-solid fa-id-card" /></span>
                  <span className="pbfp-link-text">
                    <span>Resident Applications</span>
                    <span className={`pbfp-link-count ${selectedMunicipality.pendingApplicationCount > 0 ? 'pending' : ''}`}>
                      {selectedMunicipality.pendingApplicationCount > 0
                        ? `${selectedMunicipality.pendingApplicationCount} awaiting review`
                        : 'Nothing awaiting review'}
                    </span>
                  </span>
                  <i className="fa-solid fa-arrow-right" />
                </Link>
                <Link
                  href={`/provincial-bfp/incident-reports?municipalityId=${selectedMunicipality.id}`}
                  className="pbfp-modal-link-btn"
                >
                  <span className="pbfp-link-icon red"><i className="fa-solid fa-fire" /></span>
                  <span className="pbfp-link-text">
                    <span>Municipal Fire Reports</span>
                    <span className="pbfp-link-count">{selectedMunicipality.totalReportCount} filed</span>
                  </span>
                  <i className="fa-solid fa-arrow-right" />
                </Link>
              </div>
            </div>

            <div className="pbfp-modal-footer">
              <button
                type="button"
                className="pbfp-modal-btn"
                onClick={() => setSelectedMunicipality(null)}
              >
                Close
              </button>
              <Link
                href={`/provincial-bfp/gis-map?municipalityId=${selectedMunicipality.id}`}
                className="pbfp-modal-btn primary"
              >
                <i className="fa-solid fa-map-location-dot" /> Focus in GIS View
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
