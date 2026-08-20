'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type NavItem = {
  label: string;
  href: string;
  icon: string;
  exact?: boolean;
  badge?: number;
  badgeType?: 'red' | 'amber' | 'blue';
};

type NavGroup = {
  groupTitle: string;
  items: NavItem[];
};

const navigationGroups: NavGroup[] = [
  {
    groupTitle: 'MAIN COMMAND',
    items: [
      { label: 'Dashboard', href: '/municipal-bfp', icon: 'custom-dashboard-grid', exact: true },
      { label: 'Active Incidents', href: '/municipal-bfp/active-incidents', icon: 'fa-solid fa-fire', badge: 3, badgeType: 'red' },
      { label: 'Resident Applications', href: '/municipal-bfp/verification-queue', icon: 'fa-solid fa-id-card' },
    ],
  },
  {
    groupTitle: 'DISPATCH & TACTICAL',
    items: [
      { label: 'Dispatch & Routing', href: '/municipal-bfp/dispatch-routing', icon: 'fa-solid fa-route' },
      { label: 'GIS Map', href: '/municipal-bfp/gis-map', icon: 'fa-solid fa-map-location-dot' },
    ],
  },
  {
    groupTitle: 'STATION RESOURCES',
    items: [
      { label: 'Firetrucks', href: '/municipal-bfp/firetrucks', icon: 'fa-solid fa-truck-moving' },
      { label: 'Water Sources', href: '/municipal-bfp/water-sources', icon: 'fa-solid fa-droplet' },
      { label: 'Responders', href: '/municipal-bfp/responders', icon: 'fa-solid fa-users' },
    ],
  },
  {
    groupTitle: 'RECORDS & ARCHIVES',
    items: [
      { label: 'Incident Reports', href: '/municipal-bfp/incident-reports', icon: 'fa-solid fa-file-lines' },
      { label: 'Knowledge Base', href: '/municipal-bfp/knowledge-base', icon: 'fa-solid fa-book' },
    ],
  },
];

const layoutStyles = `
  /* ========== RESET & BASE ========== */
  .mbfp-layout *,
  .mbfp-layout *::before,
  .mbfp-layout *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .mbfp-layout {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    min-height: 100vh;
    background: #EEF5FD;
    color: #1E293B;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* ========== DEEP DARK CRIMSON COMMAND SIDEBAR ========== */
  @keyframes mbfpSidebarSlideIn {
    0% {
      opacity: 0;
      transform: translateX(-100%);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .mbfp-sidebar {
    width: 260px;
    min-width: 260px;
    background: #940D07;
    border-right: 1px solid rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    transition: width 0.24s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 4px 0 28px rgba(0, 0, 0, 0.45);
    overflow: hidden;
    animation: mbfpSidebarSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mbfp-sidebar.collapsed {
    width: 78px;
    min-width: 78px;
  }

  /* Sidebar Header Brand */
  @keyframes mbfpSidebarHeaderIn {
    0% {
      opacity: 0;
      transform: translateY(-8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .mbfp-sidebar-header {
    padding: 1.15rem 1rem 1.05rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    min-height: 70px;
    box-sizing: border-box;
    animation: mbfpSidebarHeaderIn 0.45s 0.08s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mbfp-sidebar.collapsed .mbfp-sidebar-header {
    padding: 0.95rem 0.5rem;
    justify-content: center;
  }

  .mbfp-brand-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 0.6rem;
  }

  .mbfp-sidebar.collapsed .mbfp-brand-row {
    justify-content: center;
    width: 100%;
  }

  .mbfp-brand-link {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    text-decoration: none;
    touch-action: manipulation;
    cursor: pointer;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .mbfp-sidebar.collapsed .mbfp-brand-link {
    display: none;
  }

  .mbfp-brand-logo-wrap {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border-radius: 10px;
    background: #0f1420;
    border: 1px solid rgba(255, 255, 255, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 12px rgba(0, 0, 0, 0.35);
    overflow: hidden;
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease;
  }

  .mbfp-brand-logo-img {
    width: 32px;
    height: 32px;
    object-fit: contain;
    display: block;
  }

  .mbfp-brand-tint-img {
    height: 44px;
    max-width: 160px;
    width: auto;
    object-fit: contain;
    margin: 0 auto;
    display: block;
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.25));
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), filter 0.22s ease;
  }

  .mbfp-brand-link:hover .mbfp-brand-logo-wrap {
    transform: scale(1.05);
    box-shadow: 0 0 16px rgba(0, 0, 0, 0.5);
  }

  .mbfp-brand-link:hover .mbfp-brand-tint-img {
    transform: scale(1.03);
    filter: drop-shadow(0 4px 12px rgba(255, 255, 255, 0.3));
  }

  .mbfp-collapse-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.22);
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    touch-action: manipulation;
    font-size: 0.78rem;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    flex-shrink: 0;
  }

  .mbfp-collapse-btn:hover {
    background: rgba(0, 0, 0, 0.35);
    border-color: rgba(255, 255, 255, 0.4);
    color: #FFFFFF;
    transform: scale(1.06);
  }

  .mbfp-sidebar.collapsed .mbfp-collapse-btn {
    width: 38px;
    height: 38px;
    font-size: 0.85rem;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.25);
    border-color: rgba(255, 255, 255, 0.3);
    color: #FFFFFF;
  }

  .mbfp-sidebar-close {
    display: none;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.22);
    color: #FFFFFF;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .mbfp-sidebar-close:hover {
    background: rgba(0, 0, 0, 0.35);
    color: #FFFFFF;
    border-color: rgba(255, 255, 255, 0.4);
  }

  /* Navigation Body */
  .mbfp-sidebar-nav {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.85rem 0;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  .mbfp-sidebar-nav::-webkit-scrollbar {
    width: 4px;
  }
  .mbfp-sidebar-nav::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
  }

  .mbfp-nav-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  @keyframes mbfpNavItemEntrance {
    0% {
      opacity: 0;
      transform: translateX(-18px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .mbfp-nav-group:nth-child(1) { animation: mbfpNavItemEntrance 0.42s 0.10s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .mbfp-nav-group:nth-child(2) { animation: mbfpNavItemEntrance 0.42s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .mbfp-nav-group:nth-child(3) { animation: mbfpNavItemEntrance 0.42s 0.20s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .mbfp-nav-group:nth-child(4) { animation: mbfpNavItemEntrance 0.42s 0.25s cubic-bezier(0.16, 1, 0.3, 1) both; }

  .mbfp-nav-group-title {
    font-size: 0.65rem;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 1.25rem 0.35rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mbfp-sidebar.collapsed .mbfp-nav-group-title {
    display: none;
  }

  /* Floating Modern Nav Link */
  .mbfp-nav-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    height: 44px;
    margin: 0.1rem 0.75rem;
    padding: 0 0.85rem;
    border-radius: 12px;
    text-decoration: none;
    color: #FFFFFF;
    font-size: 0.85rem;
    font-weight: 600;
    position: relative;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  .mbfp-sidebar.collapsed .mbfp-nav-link {
    margin: 0.15rem 0.55rem;
    padding: 0;
    justify-content: center;
    height: 44px;
  }

  .mbfp-nav-link:hover {
    background: rgba(0, 0, 0, 0.18);
    color: #FFFFFF;
    transform: translateX(3px);
  }

  .mbfp-sidebar.collapsed .mbfp-nav-link:hover {
    transform: none;
  }

  .mbfp-nav-link:hover .mbfp-nav-icon,
  .mbfp-nav-link:hover .mbfp-custom-dash-icon {
    color: #FFFFFF;
    opacity: 1;
  }

  /* Active Pill State */
  .mbfp-nav-link.active {
    background: rgba(0, 0, 0, 0.22);
    color: #FFFFFF;
    font-weight: 700;
    border: 1px solid rgba(255, 255, 255, 0.25);
  }

  .mbfp-nav-icon {
    width: 1.25rem;
    text-align: center;
    font-size: 0.95rem;
    color: #FFFFFF;
    opacity: 0.92;
    transition: color 0.15s, transform 0.15s, opacity 0.15s;
    flex-shrink: 0;
  }

  .mbfp-custom-dash-icon {
    width: 1.15rem;
    height: 1.15rem;
    color: #FFFFFF;
    opacity: 0.92;
    transition: color 0.15s, transform 0.15s, opacity 0.15s;
    flex-shrink: 0;
  }

  .mbfp-nav-link.active .mbfp-nav-icon,
  .mbfp-nav-link.active .mbfp-custom-dash-icon {
    color: #FFFFFF;
    opacity: 1;
    transform: scale(1.08);
  }

  .mbfp-nav-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    line-height: 1;
  }

  .mbfp-sidebar.collapsed .mbfp-nav-label {
    display: none;
  }

  .mbfp-nav-badge {
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
    margin-left: auto;
    border: 1px solid rgba(255, 255, 255, 0.35);
  }

  .mbfp-nav-badge.red {
    background: #E52E2A;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  }

  .mbfp-nav-badge.amber {
    background: #D97706;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  }

  .mbfp-sidebar.collapsed .mbfp-nav-badge {
    position: absolute;
    top: 5px;
    right: 8px;
    min-width: 0.85rem;
    height: 0.85rem;
    font-size: 0.55rem;
    padding: 0;
  }

  /* Tooltip for Collapsed Sidebar */
  .mbfp-tooltip {
    position: absolute;
    left: calc(100% + 12px);
    background: #140201;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #FFFFFF;
    padding: 0.45rem 0.75rem;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.55);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateX(-8px);
    transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 1000;
  }

  .mbfp-sidebar.collapsed .mbfp-nav-link:hover .mbfp-tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateX(0);
  }

  /* Sidebar Bottom Officer Profile */
  @keyframes mbfpFooterEntrance {
    0% {
      opacity: 0;
      transform: translateY(8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .mbfp-sidebar-footer {
    padding: 0.85rem 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent;
    position: relative;
    animation: mbfpFooterEntrance 0.45s 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mbfp-profile-card {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.55rem 0.65rem;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.18);
    cursor: pointer;
    touch-action: manipulation;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-sidebar.collapsed .mbfp-profile-card {
    justify-content: center;
    padding: 0.45rem;
  }

  .mbfp-profile-card:hover {
    background: rgba(0, 0, 0, 0.38);
    border-color: rgba(255, 255, 255, 0.32);
    transform: translateY(-1px);
  }

  .mbfp-profile-avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #B91C1C;
    border: 1.5px solid rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 0.95rem;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .mbfp-profile-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }

  .mbfp-sidebar.collapsed .mbfp-profile-info {
    display: none;
  }

  .mbfp-profile-name {
    font-size: 0.82rem;
    font-weight: 800;
    color: #FFFFFF;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.25;
  }

  .mbfp-profile-role {
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.78);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .mbfp-profile-chevron {
    color: #FFFFFF;
    font-size: 0.72rem;
    transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .mbfp-profile-chevron.rotate-180 {
    transform: rotate(180deg);
  }

  .mbfp-sidebar.collapsed .mbfp-profile-chevron {
    display: none;
  }

  /* Profile Dropdown Menu */
  @keyframes mbfpPopIn {
    from { opacity: 0; transform: translateY(8px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .mbfp-profile-popover {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 10px;
    right: 10px;
    background: #1F0705;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
    padding: 0.45rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 200;
    animation: mbfpPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-sidebar.collapsed .mbfp-profile-popover {
    left: calc(100% + 10px);
    right: auto;
    bottom: 10px;
    width: 200px;
  }

  .mbfp-popover-item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.55rem 0.75rem;
    border-radius: 8px;
    color: #F1F5F9;
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }

  .mbfp-popover-item:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #FFFFFF;
  }

  .mbfp-popover-item i {
    width: 1.1rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.8);
  }

  .mbfp-popover-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.12);
    margin: 0.3rem 0;
  }

  .mbfp-popover-logout {
    color: #FFA39E;
  }

  .mbfp-popover-logout i {
    color: #FFA39E;
  }

  .mbfp-popover-logout:hover {
    background: rgba(226, 54, 50, 0.28);
    color: #FFFFFF;
  }

  /* ========== MAIN AREA ========== */
  .mbfp-main-area {
    flex: 1;
    margin-left: 260px;
    width: calc(100% - 260px);
    min-width: 0;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: #EEF5FD;
    transition: margin-left 0.24s cubic-bezier(0.4, 0, 0.2, 1), width 0.24s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .mbfp-main-area.collapsed {
    margin-left: 78px;
    width: calc(100% - 78px);
  }

  /* ========== TOP HEADER ========== */
  @keyframes mbfpTopbarEntrance {
    0% {
      opacity: 0;
      transform: translateY(-8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .mbfp-header {
    background: #FFFFFF;
    border-bottom: 1px solid #E2E8F0;
    position: sticky;
    top: 0;
    z-index: 90;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
    animation: mbfpTopbarEntrance 0.45s 0.06s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mbfp-header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 1.75rem;
    gap: 1rem;
  }

  .mbfp-header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .mbfp-mobile-menu-toggle {
    display: none;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    color: #334155;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.95rem;
    transition: all 0.18s ease;
  }

  .mbfp-mobile-menu-toggle:hover {
    background: #F8FAFC;
    color: #E23632;
    border-color: #CBD5E1;
  }

  .mbfp-header-titles {
    display: flex;
    flex-direction: column;
  }

  .mbfp-header-title {
    font-size: 0.88rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.25;
  }

  .mbfp-header-subtitle {
    font-size: 0.72rem;
    font-weight: 700;
    color: #E23632;
    line-height: 1.2;
    margin-top: 2px;
  }

  .mbfp-header-right {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .mbfp-header-location {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: #FFF1F2;
    border: 1px solid #FFE4E6;
    border-radius: 2rem;
    padding: 0.35rem 0.85rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: #E23632;
  }

  .mbfp-header-icon-btn {
    position: relative;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 50%;
    width: 2.2rem;
    height: 2.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #475569;
    font-size: 0.9rem;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-header-icon-btn:hover {
    background: #F8FAFC;
    color: #0F172A;
    border-color: #CBD5E1;
    transform: translateY(-1px);
  }

  .mbfp-header-notif-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background: #E23632;
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

  /* Content Entrance Animations */
  @keyframes mbfpContentEntrance {
    0% {
      opacity: 0;
      transform: translateY(12px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .mbfp-content {
    flex: 1;
    animation: mbfpContentEntrance 0.32s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: opacity, transform;
  }

  /* Footer */
  .mbfp-footer {
    background: #FFFFFF;
    border-top: 1px solid #E2E8F0;
    padding: 0.85rem 1.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.74rem;
    color: #64748B;
  }

  .mbfp-footer-version {
    font-weight: 700;
    color: #94A3B8;
  }

  /* Backdrop for Mobile Drawer */
  .mbfp-sidebar-backdrop {
    display: none;
  }

  @media (max-width: 768px) {
    .mbfp-sidebar {
      width: min(84vw, 280px);
      min-width: min(84vw, 280px);
      transform: translateX(-100%);
      animation: none;
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 16px 0 40px rgba(10, 14, 23, 0.55);
    }

    .mbfp-sidebar.mobile-open {
      transform: translateX(0);
    }

    .mbfp-sidebar.mobile-open .mbfp-nav-group {
      animation: mbfpDrawerItemFade 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .mbfp-sidebar.mobile-open .mbfp-nav-group:nth-child(1) { animation-delay: 0.04s; }
    .mbfp-sidebar.mobile-open .mbfp-nav-group:nth-child(2) { animation-delay: 0.08s; }
    .mbfp-sidebar.mobile-open .mbfp-nav-group:nth-child(3) { animation-delay: 0.12s; }
    .mbfp-sidebar.mobile-open .mbfp-nav-group:nth-child(4) { animation-delay: 0.16s; }

    @keyframes mbfpDrawerItemFade {
      0% {
        opacity: 0;
        transform: translateX(-10px);
      }
      100% {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .mbfp-sidebar-close {
      display: flex;
    }

    .mbfp-collapse-btn {
      display: none;
    }

    .mbfp-sidebar.collapsed .mbfp-brand-link {
      display: flex;
    }

    .mbfp-sidebar.collapsed .mbfp-nav-label,
    .mbfp-sidebar.collapsed .mbfp-nav-group-title,
    .mbfp-sidebar.collapsed .mbfp-profile-info {
      display: flex;
    }

    .mbfp-sidebar.collapsed .mbfp-nav-link {
      justify-content: flex-start;
      padding: 0 0.85rem;
    }

    .mbfp-main-area {
      margin-left: 0;
      width: 100%;
    }

    .mbfp-main-area.collapsed {
      margin-left: 0;
      width: 100%;
    }

    .mbfp-mobile-menu-toggle {
      display: flex;
    }

    .mbfp-sidebar-backdrop {
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

    .mbfp-sidebar-backdrop.visible {
      display: block;
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mbfp-sidebar,
    .mbfp-sidebar-header,
    .mbfp-nav-group,
    .mbfp-sidebar-footer,
    .mbfp-header,
    .mbfp-main-area,
    .mbfp-content,
    .mbfp-sidebar-backdrop,
    .mbfp-profile-popover,
    .mbfp-tooltip,
    .mbfp-sidebar.mobile-open .mbfp-nav-group {
      transition: none !important;
      animation: none !important;
    }
  }
`;

export function MunicipalBfpLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [identity, setIdentity] = useState<{
    displayName: string;
    rankOrPosition: string | null;
    municipalityName: string | null;
    assignmentRole: string | null;
    mustChangePassword?: boolean;
  } | null>(null);

  const isAuthenticationPage = pathname === '/municipal-bfp/login' || pathname === '/municipal-bfp/change-password';

  useEffect(() => {
    if (isAuthenticationPage) return;
    let active = true;
    fetch('/api/municipal-bfp/me')
      .then(async (response) => ({ response, body: await response.json() as { user?: typeof identity; error?: string } }))
      .then(({ response, body }) => {
        if (!active) return;
        if (!response.ok || !body.user) {
          window.location.assign('/municipal-bfp/login');
          return;
        }
        if (body.user.mustChangePassword) {
          window.location.assign('/municipal-bfp/change-password');
          return;
        }
        setIdentity(body.user);
      })
      .catch(() => { if (active) window.location.assign('/municipal-bfp/login'); });
    return () => { active = false; };
  }, [isAuthenticationPage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileNavOpen(false);
        setIsProfileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeMobileNav = () => setIsMobileNavOpen(false);

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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'portal=MUNICIPAL',
      });
    } catch {
      // ignore
    }
    window.location.assign('/municipal-bfp/login');
  };

  if (isAuthenticationPage) return <>{children}</>;

  return (
    <>
      <style>{layoutStyles}</style>

      <div className="mbfp-layout">
        {/* ===== RED VIBRANT COMMAND SIDEBAR ===== */}
        <aside
          id="mbfp-sidebar"
          className={`mbfp-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileNavOpen ? 'mobile-open' : ''}`}
          aria-label="Municipal BFP navigation"
        >
          {/* Header Brand */}
          <div className="mbfp-sidebar-header">
            <div className="mbfp-brand-row">
              <Link href="/municipal-bfp" prefetch={true} className="mbfp-brand-link" onClick={closeMobileNav}>
                <div className="mbfp-brand-logo-wrap">
                  <img
                    src="/images/FAVICON.webp"
                    alt="ALAB Logo"
                    className="mbfp-brand-logo-img"
                  />
                </div>
                <img
                  src="/images/logo white tint.webp"
                  alt="ALAB BFP Command Center"
                  className="mbfp-brand-tint-img"
                />
              </Link>

              <button
                type="button"
                className="mbfp-sidebar-close"
                aria-label="Close navigation menu"
                onClick={() => setIsMobileNavOpen(false)}
              >
                <i className="fa-solid fa-xmark" />
              </button>

              <button
                type="button"
                className="mbfp-collapse-btn"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <i className={`fa-solid ${isCollapsed ? 'fa-angles-right' : 'fa-angles-left'}`} />
              </button>
            </div>
          </div>

          {/* Categorized Navigation Groups */}
          <nav className="mbfp-sidebar-nav" aria-label="Municipal BFP Modules">
            {navigationGroups.map((group) => (
              <div key={group.groupTitle} className="mbfp-nav-group">
                <div className="mbfp-nav-group-title">{group.groupTitle}</div>
                {group.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      className={`mbfp-nav-link ${active ? 'active' : ''}`}
                      onClick={closeMobileNav}
                    >
                      {item.icon === 'custom-dashboard-grid' ? (
                        <svg
                          className="mbfp-custom-dash-icon"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <rect x="2.5" y="2.5" width="8.2" height="12" rx="2.5" />
                          <rect x="2.5" y="16.5" width="8.2" height="5" rx="2" />
                          <rect x="13.3" y="2.5" width="8.2" height="5" rx="2" />
                          <rect x="13.3" y="9.5" width="8.2" height="12" rx="2.5" />
                        </svg>
                      ) : (
                        <i className={`${item.icon} mbfp-nav-icon`} />
                      )}
                      <span className="mbfp-nav-label">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={`mbfp-nav-badge ${item.badgeType || 'red'}`}>{item.badge}</span>
                      )}
                      {/* Tooltip in collapsed mode */}
                      {isCollapsed && <span className="mbfp-tooltip">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Profile Area at Bottom */}
          <div className="mbfp-sidebar-footer">
            <div
              className="mbfp-profile-card"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              title="Station Officer Profile"
            >
              <div className="mbfp-profile-avatar">
                <i className="fa-solid fa-user-shield" />
              </div>
              <div className="mbfp-profile-info">
                <div className="mbfp-profile-name">
                  {identity?.displayName || 'Officer on Duty'}
                </div>
                <div className="mbfp-profile-role">
                  <span>{identity?.rankOrPosition || 'Municipal Commander'}</span>
                </div>
              </div>
              <i
                className={`fa-solid fa-chevron-up mbfp-profile-chevron ${isProfileOpen ? 'rotate-180' : ''}`}
              />
            </div>

            {/* Profile Popover Menu */}
            {isProfileOpen && (
              <div className="mbfp-profile-popover" role="menu">
                <Link
                  href="/municipal-bfp/profile"
                  className="mbfp-popover-item"
                  onClick={() => {
                    setIsProfileOpen(false);
                    closeMobileNav();
                  }}
                >
                  <i className="fa-solid fa-gear" />
                  <span>Profile Settings</span>
                </Link>
                <Link
                  href="/municipal-bfp/notifications"
                  className="mbfp-popover-item"
                  onClick={() => {
                    setIsProfileOpen(false);
                    closeMobileNav();
                  }}
                >
                  <i className="fa-regular fa-bell" />
                  <span>Notifications</span>
                </Link>
                <div className="mbfp-popover-divider" />
                <button
                  type="button"
                  className="mbfp-popover-item mbfp-popover-logout"
                  onClick={handleLogout}
                >
                  <i className="fa-solid fa-arrow-right-from-bracket" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Backdrop */}
        <div
          className={`mbfp-sidebar-backdrop ${isMobileNavOpen ? 'visible' : ''}`}
          onClick={closeMobileNav}
          aria-hidden={!isMobileNavOpen}
        />

        {/* ===== MAIN AREA ===== */}
        <div className={`mbfp-main-area ${isCollapsed ? 'collapsed' : ''}`}>
          {/* Top Header */}
          <header className="mbfp-header">
            <div className="mbfp-header-inner">
              {/* Left: System title */}
              <div className="mbfp-header-left">
                <button
                  type="button"
                  className="mbfp-mobile-menu-toggle"
                  aria-label="Open navigation menu"
                  aria-controls="mbfp-sidebar"
                  aria-expanded={isMobileNavOpen}
                  onClick={() => setIsMobileNavOpen(true)}
                >
                  <i className="fa-solid fa-bars" />
                </button>
                <div className="mbfp-header-titles">
                  <span className="mbfp-header-title">
                    Bureau of Fire Protection • Municipal Operations
                  </span>
                  <span className="mbfp-header-subtitle">
                    {identity?.municipalityName ? `${identity.municipalityName} Fire Station Command` : 'Municipal BFP Station'}
                  </span>
                </div>
              </div>

              {/* Right: Location & notifications */}
              <div className="mbfp-header-right">
                <div className="mbfp-header-location">
                  <i className="fa-solid fa-location-dot" />
                  <span>{identity?.municipalityName ?? 'Antique BFP'}</span>
                </div>

                <Link
                  href="/municipal-bfp/notifications"
                  prefetch={true}
                  className="mbfp-header-icon-btn"
                  title="Notifications"
                >
                  <i className="fa-solid fa-bell" />
                  <span className="mbfp-header-notif-badge">2</span>
                </Link>
              </div>
            </div>
          </header>

          {/* Content with route entrance animation */}
          <main key={pathname} className="mbfp-content">{children}</main>

          {/* Footer */}
          <footer className="mbfp-footer">
            <span>© 2025 ALAB Fire Response System • Municipal Command Center</span>
            <span className="mbfp-footer-version">v2.0</span>
          </footer>
        </div>
      </div>
    </>
  );
}
