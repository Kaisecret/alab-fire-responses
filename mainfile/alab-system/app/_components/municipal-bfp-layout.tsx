'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

type NavItem = { label: string; href: string; icon: string; exact?: boolean; badge?: number };
const sidebarNav: NavItem[] = [
  { label: 'Dashboard', href: '/municipal-bfp', icon: 'fa-solid fa-table-cells-large', exact: true },
  { label: 'Active Incidents', href: '/municipal-bfp/active-incidents', icon: 'fa-solid fa-fire' },
  { label: 'Verification Queue', href: '/municipal-bfp/verification-queue', icon: 'fa-solid fa-clipboard-check' },
  { label: 'Dispatch & Routing', href: '/municipal-bfp/dispatch-routing', icon: 'fa-solid fa-route' },
  { label: 'GIS Map', href: '/municipal-bfp/gis-map', icon: 'fa-solid fa-map-location-dot' },
  { label: 'Firetrucks', href: '/municipal-bfp/firetrucks', icon: 'fa-solid fa-truck-moving' },
  { label: 'Water Sources', href: '/municipal-bfp/water-sources', icon: 'fa-solid fa-droplet' },
  { label: 'Responders', href: '/municipal-bfp/responders', icon: 'fa-solid fa-users' },
  { label: 'Incident Reports', href: '/municipal-bfp/incident-reports', icon: 'fa-solid fa-file-lines' },
  { label: 'Knowledge Base', href: '/municipal-bfp/knowledge-base', icon: 'fa-solid fa-book' },
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
    background: #f0f2f5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* ========== SIDEBAR ========== */
  .mbfp-sidebar {
    width: 240px;
    min-width: 240px;
    background: #ffffff;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    overflow-y: auto;
    overflow-x: hidden;
    border-left: 4px solid #D00F09;
  }

  .mbfp-sidebar::-webkit-scrollbar {
    width: 4px;
  }
  .mbfp-sidebar::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
  }

  /* Sidebar Logo */
  .mbfp-sidebar-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.2rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .mbfp-sidebar-logo-img {
    width: 180px;
    height: 70px;
    object-fit: contain;
  }


  /* Sidebar Navigation */
  .mbfp-sidebar-nav {
    flex: 1;
    padding: 0.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mbfp-sidebar-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 1.2rem;
    text-decoration: none;
    color: #4b5563;
    font-size: 0.88rem;
    font-weight: 500;
    border-left: 4px solid transparent;
    transition: all 0.18s ease;
    position: relative;
    margin-left: -4px;
  }

  .mbfp-sidebar-link:hover {
    background: #fef2f2;
    color: #b91c1c;
  }

  .mbfp-sidebar-link.active {
    background: linear-gradient(90deg, #fef2f2 0%, #fff5f5 100%);
    color: #D00F09;
    font-weight: 700;
    border-left-color: #D00F09;
  }

  .mbfp-sidebar-link.active .mbfp-sidebar-icon {
    color: #D00F09;
  }

  .mbfp-sidebar-icon {
    width: 1.15rem;
    text-align: center;
    font-size: 0.95rem;
    color: #9ca3af;
    transition: color 0.18s;
    flex-shrink: 0;
  }

  .mbfp-sidebar-link:hover .mbfp-sidebar-icon {
    color: #b91c1c;
  }

  .mbfp-sidebar-badge {
    margin-left: auto;
    background: #D00F09;
    color: white;
    font-size: 0.68rem;
    font-weight: 700;
    min-width: 1.3rem;
    height: 1.3rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  /* Sidebar Municipality Info (bottom) */
  .mbfp-sidebar-municipality {
    padding: 1rem;
    border-top: 1px solid #f3f4f6;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
  }

  .mbfp-sidebar-muni-label {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #9ca3af;
  }

  .mbfp-sidebar-muni-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: #1f2937;
    line-height: 1.3;
  }

  .mbfp-sidebar-muni-province {
    font-size: 0.75rem;
    color: #6b7280;
    font-style: italic;
  }

  .mbfp-sidebar-muni-seal {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #fef2f2;
    margin-top: 0.25rem;
    box-shadow: 0 2px 8px rgba(211,47,47,0.12);
  }

  /* ========== MAIN AREA ========== */
  .mbfp-main-area {
    flex: 1;
    margin-left: 240px;
    width: calc(100% - 240px);
    min-width: 0;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* ========== TOP HEADER ========== */
  .mbfp-header {
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    z-index: 90;
    border-top: 3px solid #D00F09;
  }

  .mbfp-header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1.5rem;
    gap: 1rem;
  }

  .mbfp-header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .mbfp-header-logo {
    width: 42px;
    height: 42px;
    object-fit: contain;
  }

  .mbfp-header-titles {
    display: flex;
    flex-direction: column;
  }

  .mbfp-header-title {
    font-size: 0.9rem;
    font-weight: 800;
    color: #1f2937;
    line-height: 1.3;
  }

  .mbfp-header-subtitle {
    font-size: 0.72rem;
    font-weight: 600;
    color: #D00F09;
  }

  .mbfp-header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mbfp-header-location {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 2rem;
    padding: 0.4rem 0.9rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #b91c1c;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mbfp-header-location:hover {
    background: #fee2e2;
    border-color: #fca5a5;
  }

  .mbfp-header-location i {
    font-size: 0.85rem;
    color: #D00F09;
  }

  .mbfp-header-icon-btn {
    position: relative;
    background: none;
    border: 1px solid #e5e7eb;
    border-radius: 50%;
    width: 2.2rem;
    height: 2.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #4b5563;
    font-size: 0.95rem;
    transition: all 0.2s;
  }

  .mbfp-header-icon-btn:hover {
    background: #f3f4f6;
    color: #1f2937;
    border-color: #d1d5db;
  }

  .mbfp-header-notif-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background: #D00F09;
    color: white;
    font-size: 0.6rem;
    font-weight: 700;
    min-width: 1rem;
    height: 1rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    line-height: 1;
  }

  .mbfp-header-user {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-left: 0.5rem;
    padding: 0.3rem 0.5rem;
    border-radius: 2rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .mbfp-header-user:hover {
    background: #f3f4f6;
  }

  .mbfp-header-avatar {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 50%;
    background: linear-gradient(135deg, #D00F09, #EF5350);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.9rem;
    font-weight: 700;
    border: 2px solid #fecaca;
  }

  .mbfp-header-user-info {
    display: flex;
    flex-direction: column;
  }

  .mbfp-header-user-role {
    font-size: 0.78rem;
    font-weight: 700;
    color: #1f2937;
    line-height: 1.2;
  }

  .mbfp-header-user-rank {
    font-size: 0.68rem;
    color: #6b7280;
    font-weight: 500;
  }

  .mbfp-header-user-chevron {
    font-size: 0.65rem;
    color: #9ca3af;
  }

  /* ========== PROFILE DROPDOWN ========== */
  .mbfp-profile-wrapper {
    position: relative;
  }
  .mbfp-profile-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    width: 240px;
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    border: 1px solid #e5e7eb;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    z-index: 200;
  }
  .mbfp-dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.8rem;
    text-decoration: none;
    color: #4b5563;
    font-size: 0.85rem;
    font-weight: 500;
    border-radius: 0.5rem;
    transition: all 0.2s;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
  }
  .mbfp-dropdown-item:hover {
    background: #f9fafb;
    color: #1f2937;
  }
  .mbfp-dropdown-item i {
    font-size: 1rem;
    width: 1.2rem;
    text-align: center;
    color: #6b7280;
  }
  .mbfp-dropdown-item.logout {
    color: #D00F09;
    margin-top: 0.5rem;
    border-top: 1px solid #f3f4f6;
    border-radius: 0 0 0.5rem 0.5rem;
    padding-top: 0.8rem;
  }
  .mbfp-dropdown-item.logout i {
    color: #D00F09;
  }
  .mbfp-dropdown-item.logout:hover {
    background: #fef2f2;
    color: #b91c1c;
  }

  /* ========== CONTENT ========== */
  .mbfp-content {
    flex: 1;
    padding: 0;
  }

  /* ========== FOOTER ========== */
  .mbfp-footer {
    background: #ffffff;
    border-top: 1px solid #e5e7eb;
    padding: 0.8rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.72rem;
    color: #9ca3af;
  }

  .mbfp-footer-version {
    font-weight: 600;
    color: #6b7280;
  }

  /* ========== RESPONSIVE ========== */
  @media (max-width: 1024px) {
    .mbfp-sidebar {
      width: 200px;
      min-width: 200px;
    }
    .mbfp-main-area {
      margin-left: 200px;
      width: calc(100% - 200px);
    }
  }

  @media (max-width: 768px) {
    .mbfp-sidebar {
      width: 60px;
      min-width: 60px;
    }
    .mbfp-sidebar-logo-text,
    .mbfp-sidebar-link span,
    .mbfp-sidebar-municipality,
    .mbfp-sidebar-badge {
      display: none;
    }
    .mbfp-sidebar-link {
      justify-content: center;
      padding: 0.7rem 0;
    }
    .mbfp-sidebar-icon {
      font-size: 1.1rem;
    }
    .mbfp-main-area {
      margin-left: 60px;
      width: calc(100% - 60px);
    }
    .mbfp-header-titles {
      display: none;
    }
    .mbfp-header-user-info {
      display: none;
    }
  }
`;

export function MunicipalBfpLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isActive = (item: typeof sidebarNav[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <>
      <style>{layoutStyles}</style>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />

      <div className="mbfp-layout">
        {/* ===== SIDEBAR ===== */}
        <aside className="mbfp-sidebar">
          {/* Logo */}
          <div className="mbfp-sidebar-logo">
            <img
              src="/images/Logo.webp"
              alt="ALAB Logo"
              className="mbfp-sidebar-logo-img"
            />
          </div>

          {/* Navigation */}
          <nav className="mbfp-sidebar-nav" aria-label="Municipal BFP navigation">
            {sidebarNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`mbfp-sidebar-link ${isActive(item) ? 'active' : ''}`}
              >
                <i className={`${item.icon} mbfp-sidebar-icon`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="mbfp-sidebar-badge">{item.badge}</span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        {/* ===== MAIN AREA ===== */}
        <div className="mbfp-main-area">
          {/* Top Header */}
          <header className="mbfp-header">
            <div className="mbfp-header-inner">
              {/* Left: System title */}
              <div className="mbfp-header-left">
                <img
                  src="/images/FAVICON.webp"
                  alt="ALAB"
                  className="mbfp-header-logo"
                />
                <div className="mbfp-header-titles">
                  <span className="mbfp-header-title">
                    GIS-Based Provincial Fire Response and Decision Support System
                  </span>
                  <span className="mbfp-header-subtitle">
                    Municipal BFP Dashboard
                  </span>
                </div>
              </div>

              {/* Right: Location, notifications, user */}
              <div className="mbfp-header-right">
                <div className="mbfp-header-location">
                  <i className="fa-solid fa-location-dot" />
                  <span>San Jose de Buenavista</span>
                  <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.6rem', marginLeft: '0.2rem' }} />
                </div>

                <button className="mbfp-header-icon-btn" title="Notifications">
                  <i className="fa-solid fa-bell" />
                  <span className="mbfp-header-notif-badge">2</span>
                </button>

                <button className="mbfp-header-icon-btn" title="Search">
                  <i className="fa-solid fa-magnifying-glass" />
                </button>

                <div className="mbfp-profile-wrapper">
                  <div className="mbfp-header-user" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                    <div className="mbfp-header-avatar">
                      <i className="fa-solid fa-user-shield" />
                    </div>
                    <div className="mbfp-header-user-info">
                      <span className="mbfp-header-user-role">Municipal BFP</span>
                      <span className="mbfp-header-user-rank">Station Commander</span>
                    </div>
                    <i className={`fa-solid fa-chevron-${isProfileOpen ? 'up' : 'down'} mbfp-header-user-chevron`} />
                  </div>

                  {isProfileOpen && (
                    <div className="mbfp-profile-dropdown">
                      <Link href="/municipal-bfp/profile" className="mbfp-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                        <i className="fa-solid fa-gear" /> Profile Settings
                      </Link>
                      <Link href="/municipal-bfp/notifications" className="mbfp-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                        <i className="fa-regular fa-bell" /> Notification Settings
                      </Link>
                      <button className="mbfp-dropdown-item">
                        <i className="fa-solid fa-phone" /> Emergency Contacts
                      </button>
                      <button className="mbfp-dropdown-item">
                        <i className="fa-regular fa-circle-question" /> Help Center
                      </button>
                      <Link href="/login" className="mbfp-dropdown-item logout" onClick={() => setIsProfileOpen(false)}>
                        <i className="fa-solid fa-arrow-right-from-bracket" /> Logout
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="mbfp-content">
            {children}
          </main>

          {/* Footer */}
          <footer className="mbfp-footer">
            <span>© 2025 ALAB Fire Response System. All rights reserved.</span>
            <span className="mbfp-footer-version">v1.2.0</span>
          </footer>
        </div>
      </div>
    </>
  );
}
