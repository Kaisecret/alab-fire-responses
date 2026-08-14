'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type NavItem = {
  label: string;
  href: string;
  icon: string;
  exact?: boolean;
  badge?: number | string;
};

type NavGroup = {
  groupTitle: string;
  items: NavItem[];
};

const navigationGroups: NavGroup[] = [
  {
    groupTitle: 'OVERVIEW',
    items: [
      {
        label: 'Provincial Dashboard',
        href: '/provincial-bfp',
        icon: 'fa-solid fa-table-cells-large',
        exact: true,
      },
    ],
  },
  {
    groupTitle: 'COMMAND & COORDINATION',
    items: [
      {
        label: 'Province Incidents',
        href: '/provincial-bfp/incidents',
        icon: 'fa-solid fa-fire',
        badge: 3,
      },
      {
        label: 'Municipal Status',
        href: '/provincial-bfp/municipal-status',
        icon: 'fa-solid fa-building-shield',
      },
      {
        label: 'Assistance Requests',
        href: '/provincial-bfp/assistance-requests',
        icon: 'fa-solid fa-handshake-angle',
        badge: 1,
      },
      {
        label: 'Provincial GIS Map',
        href: '/provincial-bfp/gis-map',
        icon: 'fa-solid fa-map-location-dot',
      },
    ],
  },
  {
    groupTitle: 'RESOURCE OVERSIGHT',
    items: [
      {
        label: 'Firetrucks & Stations',
        href: '/provincial-bfp/firetrucks-stations',
        icon: 'fa-solid fa-truck-moving',
      },
      {
        label: 'Water Sources',
        href: '/provincial-bfp/water-sources',
        icon: 'fa-solid fa-droplet',
      },
      {
        label: 'Responders',
        href: '/provincial-bfp/responders',
        icon: 'fa-solid fa-users',
      },
    ],
  },
  {
    groupTitle: 'INTELLIGENCE',
    items: [
      {
        label: 'Analytics',
        href: '/provincial-bfp/analytics',
        icon: 'fa-solid fa-chart-pie',
      },
      {
        label: 'Provincial Reports',
        href: '/provincial-bfp/reports',
        icon: 'fa-solid fa-file-shield',
      },
    ],
  },
  {
    groupTitle: 'ADMINISTRATION',
    items: [
      {
        label: 'Municipal Accounts',
        href: '/provincial-bfp/municipal-accounts',
        icon: 'fa-solid fa-id-card-clip',
      },
      {
        label: 'Audit Activity',
        href: '/provincial-bfp/audit-activity',
        icon: 'fa-solid fa-clock-rotate-left',
      },
      {
        label: 'Settings',
        href: '/provincial-bfp/settings',
        icon: 'fa-solid fa-sliders',
      },
    ],
  },
];

const provincialLayoutStyles = `
  /* ========== RESET & ROOT VARIABLES ========== */
  .pbfp-shell *,
  .pbfp-shell *::before,
  .pbfp-shell *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .pbfp-shell {
    --pbfp-red: #DB1B0D;
    --pbfp-red-hover: #b81409;
    --pbfp-red-soft: rgba(219, 27, 13, 0.16);
    --pbfp-red-glow: rgba(219, 27, 13, 0.35);
    --pbfp-navy-bg: #161C2B;
    --pbfp-navy-surface: #1B2336;
    --pbfp-navy-hover: #222C44;
    --pbfp-navy-border: rgba(255, 255, 255, 0.08);
    --pbfp-text-muted: #8E9DAE;
    --pbfp-text-bright: #F1F5F9;
    --pbfp-content-bg: #F4F6F9;
    --pbfp-sidebar-width: 270px;
    --pbfp-sidebar-collapsed: 78px;

    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    min-height: 100vh;
    background: var(--pbfp-content-bg);
    color: #1E293B;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* ========== SIDEBAR CONTAINER ========== */
  .pbfp-sidebar {
    width: var(--pbfp-sidebar-width);
    min-width: var(--pbfp-sidebar-width);
    background: var(--pbfp-navy-bg);
    border-right: 1px solid var(--pbfp-navy-border);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 4px 0 24px rgba(10, 14, 23, 0.4);
    overflow: hidden;
  }

  .pbfp-sidebar.collapsed {
    width: var(--pbfp-sidebar-collapsed);
    min-width: var(--pbfp-sidebar-collapsed);
  }

  /* Top thin red accent border on sidebar */
  .pbfp-sidebar::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #DB1B0D 0%, #FF5A4E 100%);
    z-index: 10;
  }

  /* ========== SIDEBAR HEADER / BRAND ========== */
  .pbfp-sidebar-header {
    padding: 1.1rem 1rem 1rem;
    border-bottom: 1px solid var(--pbfp-navy-border);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    position: relative;
    background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%);
  }

  .pbfp-brand-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .pbfp-brand-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    min-width: 0;
  }

  .pbfp-brand-logo-wrap {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 10px;
    background: #0f1420;
    border: 1px solid rgba(219, 27, 13, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 12px rgba(219, 27, 13, 0.25);
    overflow: hidden;
  }

  .pbfp-brand-logo-img {
    width: 30px;
    height: 30px;
    object-fit: contain;
  }

  .pbfp-brand-text {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    white-space: nowrap;
    transition: opacity 0.2s, transform 0.2s;
  }

  .pbfp-sidebar.collapsed .pbfp-brand-text {
    opacity: 0;
    pointer-events: none;
    position: absolute;
    transform: translateX(-10px);
  }

  .pbfp-brand-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: #FFFFFF;
    letter-spacing: -0.01em;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    line-height: 1.2;
  }

  .pbfp-brand-title span {
    color: var(--pbfp-red);
  }

  .pbfp-brand-subtitle {
    font-size: 0.7rem;
    font-weight: 600;
    color: #94A3B8;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .pbfp-collapse-btn {
    background: transparent;
    border: 1px solid var(--pbfp-navy-border);
    color: #94A3B8;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .pbfp-collapse-btn:hover {
    background: var(--pbfp-navy-hover);
    color: #FFFFFF;
    border-color: rgba(255, 255, 255, 0.2);
  }

  /* Province Status Pill */
  .pbfp-status-indicator {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.4rem 0.65rem;
    border-radius: 6px;
    transition: opacity 0.2s;
  }

  .pbfp-sidebar.collapsed .pbfp-status-indicator {
    justify-content: center;
    padding: 0.4rem 0;
  }

  .pbfp-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 8px #10B981;
    position: relative;
    flex-shrink: 0;
  }

  .pbfp-status-dot::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1px solid #10B981;
    animation: pbfpPulse 2s infinite;
    opacity: 0.7;
  }

  @keyframes pbfpPulse {
    0% { transform: scale(0.9); opacity: 0.8; }
    70% { transform: scale(2.2); opacity: 0; }
    100% { transform: scale(2.2); opacity: 0; }
  }

  .pbfp-status-label {
    font-size: 0.68rem;
    font-weight: 600;
    color: #CBD5E1;
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pbfp-sidebar.collapsed .pbfp-status-label {
    display: none;
  }

  /* ========== NAVIGATION SCROLL AREA ========== */
  .pbfp-sidebar-nav {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.75rem 0.65rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  .pbfp-sidebar-nav::-webkit-scrollbar {
    width: 4px;
  }

  .pbfp-sidebar-nav::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 4px;
  }

  .pbfp-nav-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .pbfp-nav-group-title {
    font-size: 0.65rem;
    font-weight: 700;
    color: #64748B;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.2rem 0.65rem 0.4rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 0.2s;
  }

  .pbfp-sidebar.collapsed .pbfp-nav-group-title {
    text-align: center;
    font-size: 0.55rem;
    padding: 0.3rem 0;
    opacity: 0.5;
  }

  /* Navigation Link Rows - 46px Height */
  .pbfp-nav-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    height: 46px;
    padding: 0 0.75rem;
    border-radius: 8px;
    text-decoration: none;
    color: var(--pbfp-text-muted);
    font-size: 0.86rem;
    font-weight: 500;
    position: relative;
    transition: all 0.18s ease;
    border-left: 3px solid transparent;
  }

  .pbfp-sidebar.collapsed .pbfp-nav-link {
    justify-content: center;
    padding: 0;
    border-left: none;
  }

  .pbfp-nav-link:hover {
    background: var(--pbfp-navy-hover);
    color: var(--pbfp-text-bright);
  }

  .pbfp-nav-link:hover .pbfp-nav-icon {
    color: #CBD5E1;
  }

  .pbfp-nav-link.active {
    background: var(--pbfp-red-soft);
    color: #FFFFFF;
    font-weight: 700;
    border-left-color: var(--pbfp-red);
  }

  .pbfp-sidebar.collapsed .pbfp-nav-link.active {
    border-left-color: transparent;
    box-shadow: inset 0 0 0 1px rgba(219, 27, 13, 0.4);
  }

  .pbfp-nav-icon {
    width: 1.3rem;
    text-align: center;
    font-size: 0.95rem;
    color: #64748B;
    transition: color 0.18s, transform 0.18s;
    flex-shrink: 0;
  }

  .pbfp-nav-link.active .pbfp-nav-icon {
    color: var(--pbfp-red);
    transform: scale(1.08);
  }

  .pbfp-nav-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    line-height: 1;
  }

  .pbfp-sidebar.collapsed .pbfp-nav-label {
    display: none;
  }

  .pbfp-nav-badge {
    background: var(--pbfp-red);
    color: #FFFFFF;
    font-size: 0.65rem;
    font-weight: 800;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.35rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    box-shadow: 0 2px 6px rgba(219, 27, 13, 0.4);
    margin-left: auto;
  }

  .pbfp-sidebar.collapsed .pbfp-nav-badge {
    position: absolute;
    top: 6px;
    right: 8px;
    min-width: 0.9rem;
    height: 0.9rem;
    font-size: 0.55rem;
    padding: 0;
  }

  /* Tooltip for collapsed mode */
  .pbfp-tooltip {
    position: absolute;
    left: calc(100% + 10px);
    background: #0F172A;
    color: #FFFFFF;
    padding: 0.45rem 0.75rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateX(-6px);
    transition: opacity 0.18s, transform 0.18s;
    z-index: 1000;
  }

  .pbfp-sidebar.collapsed .pbfp-nav-link:hover .pbfp-tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateX(0);
  }

  /* ========== SIDEBAR BOTTOM PROFILE AREA ========== */
  .pbfp-sidebar-footer {
    padding: 0.85rem 0.75rem;
    border-top: 1px solid var(--pbfp-navy-border);
    background: var(--pbfp-navy-surface);
    position: relative;
  }

  .pbfp-profile-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: all 0.2s;
  }

  .pbfp-sidebar.collapsed .pbfp-profile-card {
    justify-content: center;
    padding: 0.45rem;
  }

  .pbfp-profile-card:hover {
    background: var(--pbfp-navy-hover);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .pbfp-profile-avatar {
    width: 38px;
    height: 38px;
    border-radius: 9px;
    background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
    border: 1.5px solid var(--pbfp-red);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 0.95rem;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(219, 27, 13, 0.25);
  }

  .pbfp-profile-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }

  .pbfp-sidebar.collapsed .pbfp-profile-info {
    display: none;
  }

  .pbfp-profile-name {
    font-size: 0.82rem;
    font-weight: 700;
    color: #FFFFFF;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.25;
  }

  .pbfp-profile-role {
    font-size: 0.68rem;
    color: #94A3B8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .pbfp-profile-province-tag {
    font-size: 0.62rem;
    font-weight: 700;
    color: #F87171;
    background: rgba(219, 27, 13, 0.15);
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    letter-spacing: 0.02em;
  }

  .pbfp-profile-chevron {
    color: #64748B;
    font-size: 0.7rem;
    transition: transform 0.2s;
  }

  .pbfp-sidebar.collapsed .pbfp-profile-chevron {
    display: none;
  }

  /* Profile Dropdown Menu */
  .pbfp-profile-popover {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 10px;
    right: 10px;
    background: #1B2336;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
    padding: 0.45rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 200;
    animation: pbfpPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pbfp-sidebar.collapsed .pbfp-profile-popover {
    left: calc(100% + 10px);
    right: auto;
    bottom: 10px;
    width: 220px;
  }

  @keyframes pbfpPopIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .pbfp-popover-item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.6rem 0.75rem;
    color: #CBD5E1;
    font-size: 0.8rem;
    font-weight: 500;
    border-radius: 6px;
    text-decoration: none;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }

  .pbfp-popover-item:hover {
    background: var(--pbfp-navy-hover);
    color: #FFFFFF;
  }

  .pbfp-popover-item i {
    width: 1.1rem;
    text-align: center;
    color: #94A3B8;
  }

  .pbfp-popover-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 0.3rem 0;
  }

  .pbfp-popover-logout {
    color: #F87171;
  }

  .pbfp-popover-logout i {
    color: #F87171;
  }

  .pbfp-popover-logout:hover {
    background: rgba(219, 27, 13, 0.15);
    color: #FF8A80;
  }

  /* ========== MAIN AREA ========== */
  .pbfp-main-area {
    flex: 1;
    margin-left: var(--pbfp-sidebar-width);
    width: calc(100% - var(--pbfp-sidebar-width));
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--pbfp-content-bg);
    transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .pbfp-main-area.collapsed {
    margin-left: var(--pbfp-sidebar-collapsed);
    width: calc(100% - var(--pbfp-sidebar-collapsed));
  }

  /* ========== TOP COMMAND CENTER HEADER ========== */
  .pbfp-topbar {
    background: #FFFFFF;
    border-bottom: 1px solid #E2E8F0;
    position: sticky;
    top: 0;
    z-index: 90;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
  }

  .pbfp-topbar-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 1.75rem;
    gap: 1.25rem;
  }

  .pbfp-topbar-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    min-width: 0;
  }

  .pbfp-mobile-menu-btn {
    display: none;
    width: 38px;
    height: 38px;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    background: #FFFFFF;
    color: #334155;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1rem;
  }

  .pbfp-topbar-title-group {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .pbfp-topbar-kicker {
    font-size: 0.68rem;
    font-weight: 800;
    color: var(--pbfp-red);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .pbfp-topbar-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pbfp-topbar-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  /* Live Clock & Jurisdiction Chip */
  .pbfp-topbar-meta {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .pbfp-clock-chip {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    background: #F1F5F9;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 0.35rem 0.65rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #475569;
    font-variant-numeric: tabular-nums;
  }

  .pbfp-clock-chip i {
    color: #64748B;
    font-size: 0.75rem;
  }

  .pbfp-muni-count-chip {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: #EFF6FF;
    border: 1px solid #BFDBFE;
    border-radius: 6px;
    padding: 0.35rem 0.65rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #1D4ED8;
  }

  .pbfp-muni-count-chip i {
    color: #2563EB;
    font-size: 0.75rem;
  }

  .pbfp-topbar-icon-btn {
    position: relative;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #475569;
    font-size: 0.9rem;
    transition: all 0.18s;
  }

  .pbfp-topbar-icon-btn:hover {
    background: #F8FAFC;
    color: #0F172A;
    border-color: #CBD5E1;
  }

  .pbfp-topbar-badge {
    position: absolute;
    top: -3px;
    right: -3px;
    background: var(--pbfp-red);
    color: white;
    font-size: 0.6rem;
    font-weight: 800;
    min-width: 1rem;
    height: 1rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    line-height: 1;
  }

  .pbfp-topbar-admin-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.3rem 0.6rem;
    border-radius: 8px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    cursor: pointer;
    transition: all 0.18s;
  }

  .pbfp-topbar-admin-btn:hover {
    background: #F1F5F9;
    border-color: #CBD5E1;
  }

  .pbfp-topbar-admin-avatar {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: var(--pbfp-navy-bg);
    color: #FFFFFF;
    font-size: 0.72rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--pbfp-red);
  }

  .pbfp-topbar-admin-text {
    font-size: 0.78rem;
    font-weight: 700;
    color: #1E293B;
  }

  /* ========== CONTENT CONTAINER ========== */
  .pbfp-content {
    flex: 1;
    padding: 0;
  }

  /* ========== FOOTER ========== */
  .pbfp-footer {
    background: #FFFFFF;
    border-top: 1px solid #E2E8F0;
    padding: 0.85rem 1.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.74rem;
    color: #64748B;
  }

  .pbfp-footer-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 600;
    color: #334155;
  }

  .pbfp-footer-badge i {
    color: var(--pbfp-red);
  }

  /* ========== MOBILE DRAWER & BACKDROP ========== */
  .pbfp-backdrop {
    display: none;
  }

  @media (max-width: 900px) {
    .pbfp-sidebar {
      width: min(84vw, 290px);
      min-width: min(84vw, 290px);
      transform: translateX(-100%);
      transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 16px 0 32px rgba(10, 14, 23, 0.45);
    }

    .pbfp-sidebar.mobile-open {
      transform: translateX(0);
    }

    .pbfp-sidebar.collapsed {
      width: min(84vw, 290px);
      min-width: min(84vw, 290px);
    }

    .pbfp-sidebar.collapsed .pbfp-brand-text,
    .pbfp-sidebar.collapsed .pbfp-status-label,
    .pbfp-sidebar.collapsed .pbfp-nav-label,
    .pbfp-sidebar.collapsed .pbfp-profile-info {
      display: flex;
      opacity: 1;
      position: static;
      transform: none;
    }

    .pbfp-sidebar.collapsed .pbfp-nav-link {
      justify-content: flex-start;
      padding: 0 0.75rem;
      border-left: 3px solid transparent;
    }

    .pbfp-sidebar.collapsed .pbfp-nav-link.active {
      border-left-color: var(--pbfp-red);
    }

    .pbfp-main-area,
    .pbfp-main-area.collapsed {
      margin-left: 0;
      width: 100%;
    }

    .pbfp-mobile-menu-btn {
      display: flex;
    }

    .pbfp-topbar-inner {
      padding: 0.6rem 1rem;
    }

    .pbfp-topbar-meta {
      display: none;
    }

    .pbfp-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 95;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.25s, visibility 0.25s;
    }

    .pbfp-backdrop.visible {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    .pbfp-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.4rem;
      padding: 0.85rem 1rem;
    }
  }
`;

export function ProvincialBfpLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [timeString, setTimeString] = useState<string>('');
  const [identity, setIdentity] = useState<{
    displayName: string;
    rankOrPosition: string | null;
    email?: string;
    role?: string;
    province?: string;
    mustChangePassword?: boolean;
  } | null>(null);

  const isAuthenticationPage =
    pathname === '/provincial-bfp/login' || pathname === '/provincial-bfp/change-password';

  // Live operational clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) +
          ', ' +
          now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }) +
          ' PHT'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Provincial Identity
  useEffect(() => {
    if (isAuthenticationPage) return;
    let active = true;
    fetch('/api/provincial-bfp/me')
      .then(async (response) => {
        if (!response.ok) {
          // If unauthenticated, fallback to representative profile for command center preview
          return {
            user: {
              displayName: 'CINSP Juan Dela Cruz',
              rankOrPosition: 'Provincial Fire Marshal',
              role: 'PROVINCIAL_BFP',
              province: 'Antique',
            },
          };
        }
        return (await response.json()) as { user?: typeof identity };
      })
      .then((data) => {
        if (!active) return;
        if (data.user) {
          setIdentity(data.user);
        }
      })
      .catch(() => {
        if (!active) return;
        setIdentity({
          displayName: 'CINSP Juan Dela Cruz',
          rankOrPosition: 'Provincial Fire Marshal',
          role: 'PROVINCIAL_BFP',
          province: 'Antique',
        });
      });
    return () => {
      active = false;
    };
  }, [isAuthenticationPage]);

  // Handle escape key to close menus
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileOpen(false);
        setIsProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeMobileDrawer = () => setIsMobileOpen(false);

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/bfp/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal: 'PROVINCIAL' }),
      });
    } catch {
      // ignore
    }
    window.location.assign('/provincial-bfp/login');
  };

  if (isAuthenticationPage) {
    return <>{children}</>;
  }

  return (
    <>
      <style>{provincialLayoutStyles}</style>
      {/* Google Fonts - Plus Jakarta Sans */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      {/* FontAwesome 6 Icons */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />

      <div className="pbfp-shell">
        {/* ===== PROVINCIAL COMMAND SIDEBAR ===== */}
        <aside
          id="pbfp-sidebar"
          className={`pbfp-sidebar ${isCollapsed ? 'collapsed' : ''} ${
            isMobileOpen ? 'mobile-open' : ''
          }`}
          aria-label="Provincial BFP Navigation"
        >
          {/* Header Brand */}
          <div className="pbfp-sidebar-header">
            <div className="pbfp-brand-row">
              <Link href="/provincial-bfp" className="pbfp-brand-link" onClick={closeMobileDrawer}>
                <div className="pbfp-brand-logo-wrap">
                  <img
                    src="/images/FAVICON.webp"
                    alt="ALAB Logo"
                    className="pbfp-brand-logo-img"
                  />
                </div>
                <div className="pbfp-brand-text">
                  <div className="pbfp-brand-title">
                    ALAB <span>BFP</span>
                  </div>
                  <div className="pbfp-brand-subtitle">Provincial BFP Command Center</div>
                </div>
              </Link>

              <button
                type="button"
                className="pbfp-collapse-btn"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <i className={`fa-solid ${isCollapsed ? 'fa-angles-right' : 'fa-angles-left'}`} />
              </button>
            </div>

            {/* Status indicator */}
            <div className="pbfp-status-indicator" title="Province-wide monitoring active: Antique">
              <div className="pbfp-status-dot" />
              <span className="pbfp-status-label">Province-wide monitoring active</span>
            </div>
          </div>

          {/* Navigation Groups */}
          <nav className="pbfp-sidebar-nav" aria-label="Command Center Modules">
            {navigationGroups.map((group) => (
              <div key={group.groupTitle} className="pbfp-nav-group">
                <div className="pbfp-nav-group-title">{group.groupTitle}</div>
                {group.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`pbfp-nav-link ${active ? 'active' : ''}`}
                      onClick={closeMobileDrawer}
                    >
                      <i className={`${item.icon} pbfp-nav-icon`} />
                      <span className="pbfp-nav-label">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="pbfp-nav-badge">{item.badge}</span>
                      )}
                      {/* Tooltip for collapsed view */}
                      {isCollapsed && <span className="pbfp-tooltip">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Profile Area at Bottom */}
          <div className="pbfp-sidebar-footer">
            <div
              className="pbfp-profile-card"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              title="Administrator Profile"
            >
              <div className="pbfp-profile-avatar">
                <i className="fa-solid fa-shield-halved" />
              </div>
              <div className="pbfp-profile-info">
                <div className="pbfp-profile-name">
                  {identity?.displayName || 'CINSP Juan Dela Cruz'}
                </div>
                <div className="pbfp-profile-role">
                  <span>Provincial Administrator</span>
                  <span className="pbfp-profile-province-tag">Antique</span>
                </div>
              </div>
              <i
                className={`fa-solid fa-chevron-up pbfp-profile-chevron ${
                  isProfileOpen ? 'rotate-180' : ''
                }`}
              />
            </div>

            {/* Profile Popover Menu */}
            {isProfileOpen && (
              <div className="pbfp-profile-popover" role="menu">
                <Link
                  href="/provincial-bfp/settings"
                  className="pbfp-popover-item"
                  onClick={() => {
                    setIsProfileOpen(false);
                    closeMobileDrawer();
                  }}
                >
                  <i className="fa-solid fa-user-gear" />
                  <span>Profile & Security</span>
                </Link>
                <Link
                  href="/provincial-bfp/settings"
                  className="pbfp-popover-item"
                  onClick={() => {
                    setIsProfileOpen(false);
                    closeMobileDrawer();
                  }}
                >
                  <i className="fa-solid fa-sliders" />
                  <span>Command Settings</span>
                </Link>
                <div className="pbfp-popover-divider" />
                <button
                  type="button"
                  className="pbfp-popover-item pbfp-popover-logout"
                  onClick={handleLogout}
                >
                  <i className="fa-solid fa-arrow-right-from-bracket" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Backdrop for Mobile */}
        <div
          className={`pbfp-backdrop ${isMobileOpen ? 'visible' : ''}`}
          onClick={closeMobileDrawer}
          aria-hidden={!isMobileOpen}
        />

        {/* ===== MAIN CONTENT AREA ===== */}
        <div className={`pbfp-main-area ${isCollapsed ? 'collapsed' : ''}`}>
          {/* Top Command Center Header */}
          <header className="pbfp-topbar">
            <div className="pbfp-topbar-inner">
              {/* Left: Mobile button + Title */}
              <div className="pbfp-topbar-left">
                <button
                  type="button"
                  className="pbfp-mobile-menu-btn"
                  onClick={() => setIsMobileOpen(true)}
                  aria-label="Open command navigation menu"
                >
                  <i className="fa-solid fa-bars" />
                </button>
                <div className="pbfp-topbar-title-group">
                  <span className="pbfp-topbar-kicker">
                    <i className="fa-solid fa-shield-heart" /> Bureau of Fire Protection • Region VI
                  </span>
                  <h1 className="pbfp-topbar-title">
                    Provincial BFP Command & Coordination Center — Antique
                  </h1>
                </div>
              </div>

              {/* Right: Clock + Status + Quick Profile */}
              <div className="pbfp-topbar-right">
                <div className="pbfp-topbar-meta">
                  <div className="pbfp-clock-chip" title="Philippine Standard Time">
                    <i className="fa-regular fa-clock" />
                    <span>{timeString || 'Loading clock…'}</span>
                  </div>

                  <div
                    className="pbfp-muni-count-chip"
                    title="18 Municipal Fire Stations Online in Antique"
                  >
                    <i className="fa-solid fa-building-circle-check" />
                    <span>18 Municipalities Active</span>
                  </div>
                </div>

                <Link
                  href="/provincial-bfp/incidents"
                  className="pbfp-topbar-icon-btn"
                  title="3 Active Province Incidents"
                >
                  <i className="fa-solid fa-bell" />
                  <span className="pbfp-topbar-badge">3</span>
                </Link>

                <div
                  className="pbfp-topbar-admin-btn"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  title="Administrator Account"
                >
                  <div className="pbfp-topbar-admin-avatar">
                    <i className="fa-solid fa-user-shield" />
                  </div>
                  <span className="pbfp-topbar-admin-text">
                    {identity?.displayName ? identity.displayName.split(' ')[0] : 'Admin'}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Dynamic Page Content */}
          <main className="pbfp-content">{children}</main>

          {/* Footer */}
          <footer className="pbfp-footer">
            <div className="pbfp-footer-badge">
              <i className="fa-solid fa-fire-flame-curved" />
              <span>ALAB Fire Response System — Provincial Operations Center</span>
            </div>
            <div>Antique BFP Headquarters • 24/7 Monitoring Hotline: (036) 540-9911</div>
          </footer>
        </div>
      </div>
    </>
  );
}
