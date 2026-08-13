"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

/* ─────────────────────────────────────────────
   Shared Resident Layout
   Provides consistent header + bottom nav across
   ALL /resident/* pages.
   ───────────────────────────────────────────── */

const layoutStyles = `
  /* ==================== SHARED RESIDENT LAYOUT ==================== */
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  .resident-shell {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }

  /* ==================== DESKTOP HEADER ==================== */
  .rl-desktop-header {
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    padding: 0.4rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .rl-header-left {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }
  .rl-brand-fire-logo {
    height: 3.2rem;
    width: auto;
    object-fit: contain;
  }
  .rl-brand-logo {
    height: 6rem;
    width: auto;
  }
  .rl-header-nav {
    display: flex;
    align-items: center;
    gap: 2.5rem;
  }
  .rl-nav-item-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    padding: 0.5rem 0;
  }
  .rl-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    color: #64748b;
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 600;
    transition: color 0.2s;
  }
  .rl-nav-item:hover { color: #d91b10; }
  .rl-nav-item.rl-active { color: #d91b10; }
  .rl-nav-item.rl-active::after {
    content: '';
    display: block;
    width: 100%;
    height: 3px;
    background: #d91b10;
    border-radius: 3px 3px 0 0;
    position: absolute;
    bottom: 0;
  }
  .rl-nav-icon {
    width: 1.5rem;
    height: 1.5rem;
  }
  .rl-nav-item.rl-report-fire-nav { color: #d91b10; }
  .rl-nav-item.rl-report-fire-nav .rl-nav-icon {
    background: #d91b10;
    color: white;
    border-radius: 50%;
    padding: 0.35rem;
    width: 2.2rem;
    height: 2.2rem;
  }
  .rl-fire-logo-tint {
    filter: brightness(0) invert(1);
    object-fit: contain;
    width: 100%;
    height: 100%;
  }
  .rl-header-right {
    display: flex;
    align-items: center;
  }
  .rl-notif-btn, .rl-lang-btn {
    background: none;
    border: none;
    position: relative;
    cursor: pointer;
    color: #1e293b;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-weight: 600;
    font-size: 0.95rem;
  }
  .rl-notif-btn:hover, .rl-lang-btn:hover { color: #d91b10; }
  .rl-notif-badge {
    position: absolute;
    top: 0;
    right: 0;
    background: #d91b10;
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
  }

  /* Profile dropdown */
  .rl-profile-menu {
    position: relative;
    margin-left: 0.5rem;
  }
  .rl-profile-btn {
    background: none; border: none; cursor: pointer;
    padding: 0.2rem; display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: 2px solid transparent; transition: all 0.2s;
  }
  .rl-profile-btn img {
    width: 2.2rem; height: 2.2rem; border-radius: 50%; object-fit: cover;
  }
  .rl-profile-btn:hover, .rl-profile-menu:focus-within .rl-profile-btn {
    border-color: #d91b10;
  }
  .rl-profile-dropdown {
    position: absolute; top: calc(100% + 0.5rem); right: 0;
    background: white; border: 1px solid #e2e8f0;
    border-radius: 0.8rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); width: 230px;
    opacity: 0; visibility: hidden; transform: translateY(-10px);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 100; padding: 0.5rem 0;
  }
  .rl-profile-menu:focus-within .rl-profile-dropdown,
  .rl-profile-menu:hover .rl-profile-dropdown {
    opacity: 1; visibility: visible; transform: translateY(0);
  }
  .rl-dropdown-item {
    display: flex; align-items: center; gap: 0.8rem;
    padding: 0.7rem 1.2rem; text-decoration: none;
    color: #1e293b; font-size: 0.95rem; font-weight: 500;
    transition: background-color 0.2s;
  }
  .rl-dropdown-item:hover { background-color: #f1f5f9; }
  .rl-dropdown-icon { width: 1.2rem; height: 1.2rem; color: #64748b; }
  .rl-dropdown-divider { height: 1px; background-color: #e2e8f0; margin: 0.5rem 0; }
  .rl-dropdown-item.rl-logout { color: #d91b10; }
  .rl-dropdown-item.rl-logout .rl-dropdown-icon { color: #d91b10; }
  .rl-logout-form { margin: 0; }
  .rl-logout-button {
    width: 100%; border: 0; background: transparent; cursor: pointer;
    font-family: inherit; text-align: left;
  }

  .resident-logout-backdrop {
    position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center;
    padding: 1.25rem; background: rgba(15, 23, 42, 0.62); backdrop-filter: blur(6px);
    animation: resident-logout-fade-in 0.18s ease-out;
  }
  .resident-logout-dialog {
    width: min(100%, 26rem); padding: 2rem; border-radius: 1.35rem;
    background: #ffffff; box-shadow: 0 1.5rem 4.5rem rgba(15, 23, 42, 0.32);
    text-align: center; animation: resident-logout-dialog-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .resident-logout-icon {
    width: 3.65rem; height: 3.65rem; margin: 0 auto 1.1rem; border-radius: 50%;
    display: grid; place-items: center; background: #fff1f2; color: #d91b10;
  }
  .resident-logout-icon svg { width: 1.85rem; height: 1.85rem; }
  .resident-logout-title { margin: 0; color: #1e293b; font-size: 1.38rem; font-weight: 800; letter-spacing: -0.02em; }
  .resident-logout-copy { margin: 0.6rem auto 1.5rem; max-width: 20rem; color: #64748b; font-size: 0.94rem; line-height: 1.55; }
  .resident-logout-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
  .resident-logout-action {
    min-height: 2.75rem; border-radius: 0.75rem; padding: 0.65rem 0.8rem; cursor: pointer;
    font: inherit; font-size: 0.9rem; font-weight: 750; transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
  }
  .resident-logout-action:hover { transform: translateY(-1px); }
  .resident-logout-cancel { border: 1px solid #cbd5e1; background: #ffffff; color: #334155; }
  .resident-logout-cancel:hover { background: #f8fafc; }
  .resident-logout-confirm { border: 1px solid #c81e12; background: #d91b10; color: #ffffff; box-shadow: 0 0.5rem 1rem rgba(217, 27, 16, 0.2); }
  .resident-logout-confirm:hover { background: #b91c1c; box-shadow: 0 0.7rem 1.35rem rgba(217, 27, 16, 0.3); }
  @keyframes resident-logout-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes resident-logout-dialog-in { from { opacity: 0; transform: translateY(0.6rem) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @media (prefers-reduced-motion: reduce) {
    .resident-logout-backdrop, .resident-logout-dialog { animation: none; }
    .resident-logout-action { transition: none; }
  }

  /* ==================== MOBILE HEADER ==================== */
  .rl-mobile-header {
    display: none;
  }

  /* ==================== MOBILE BOTTOM NAV ==================== */
  .rl-mobile-nav {
    display: none;
  }

  /* ==================== RESPONSIVE ==================== */
  @media (max-width: 950px) {
    .rl-desktop-header {
      display: none !important;
    }

    .rl-mobile-header {
      display: flex !important;
      align-items: center;
      justify-content: center;
      min-height: 4.2rem;
      padding: 0.6rem 1rem;
      background: linear-gradient(180deg, #b91c1c 0%, #c5221f 60%, #d91b10 100%);
        position: static;
      box-shadow: 0 4px 20px rgba(185, 28, 28, 0.25);
    }

    .rl-m-left {
      position: absolute;
      left: 1rem;
      display: flex;
      align-items: center;
    }
    .rl-m-left img {
      height: 3.6rem;
      width: auto;
      object-fit: contain;
      filter: drop-shadow(0 0.15rem 0.4rem rgba(0, 0, 0, 0.3));
    }

    .rl-m-brand {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .rl-m-brand img {
      height: 4.5rem;
      width: auto;
      object-fit: contain;
    }

    .rl-m-actions {
      position: absolute;
      right: 1rem;
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }
    .rl-m-notif-btn {
      position: relative;
      width: 2.7rem;
      height: 2.7rem;
      padding: 0;
      display: grid;
      place-items: center;
      color: white;
      background: rgba(255, 255, 255, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 0.75rem;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      cursor: pointer;
      transition: background 0.2s;
    }
    .rl-m-notif-btn:hover {
      background: rgba(255, 255, 255, 0.28);
    }
    .rl-m-notif-btn svg {
      width: 1.3rem;
      height: 1.3rem;
      display: block;
    }
    .rl-m-notif-badge {
      position: absolute;
      top: -0.2rem;
      right: -0.2rem;
      background: #fbbf24;
      color: #78350f;
      font-size: 0.58rem;
      font-weight: 800;
      width: 1.05rem;
      height: 1.05rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #b91c1c;
      z-index: 5;
    }

    /* ===== MOBILE BOTTOM NAV ===== */
    .rl-mobile-nav {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      background: white;
      border-top: 1px solid #e2e8f0;
      min-height: 5.3rem;
      box-sizing: border-box;
      padding: 0.7rem 0.7rem calc(0.8rem + env(safe-area-inset-bottom));
      justify-content: space-between;
      align-items: flex-end;
      isolation: isolate;
      z-index: 100;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.06);
    }

    .rl-mn-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
      color: #94a3b8;
      font-size: 0.74rem;
      font-weight: 600;
      text-decoration: none;
      width: 20%;
      transition: color 0.2s;
    }
    .rl-mn-item.rl-mn-active {
      color: #d91b10;
    }
    .rl-mn-item svg {
      width: 1.7rem;
      height: 1.7rem;
    }

    .rl-mn-fab-wrap {
      position: relative;
      width: 20%;
      height: 3.8rem;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .rl-mn-fab {
      position: absolute;
      bottom: 1.05rem;
      display: flex;
      width: 4.2rem;
      height: 4.2rem;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding-bottom: 0.28rem;
      border: 3px solid #ffffff;
      border-radius: 50%;
      color: #ffffff;
      background: linear-gradient(145deg, #ef4444, #b91c1c);
      box-shadow: 0 .55rem 1.35rem rgba(217, 27, 16, .36);
      text-decoration: none;
      transition: transform .15s ease, box-shadow .15s ease;
    }
    .rl-mn-fab:active { transform: scale(.94); }
    .rl-mn-fab:hover { box-shadow: 0 .6rem 1.5rem rgba(217, 27, 16, .4); }
    .rl-mn-fab img {
      width: 2.2rem;
      height: 2.2rem;
      margin-top: .12rem;
      object-fit: contain;
      filter: brightness(0) invert(1);
    }
    .rl-mn-fab span {
      margin-top: -.3rem;
      font-size: .49rem;
      font-weight: 800;
      letter-spacing: .02em;
      white-space: nowrap;
    }

  }
`;

/* ─── SVG Icon components (modern uniform Lucide-style) ─── */

function IconHome({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? "2.3" : "2"} strokeLinecap="round" strokeLinejoin="round" className="rl-nav-icon">
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function IconReports({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? "2.3" : "2"} strokeLinecap="round" strokeLinejoin="round" className="rl-nav-icon">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 13H8" />
      <path d="M16 17H8" />
      <path d="M16 13h-2" />
    </svg>
  );
}

function IconGuide({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? "2.3" : "2"} strokeLinecap="round" strokeLinejoin="round" className="rl-nav-icon">
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  );
}

function IconProfile({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? "2.3" : "2"} strokeLinecap="round" strokeLinejoin="round" className="rl-nav-icon">
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "1.2rem", height: "1.2rem", marginRight: "0.3rem" }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

/* ─── Nav items config ─── */
const navItems = [
  { href: "/resident", label: "Home", key: "home" },
  { href: "/resident/reports", label: "Reports", key: "reports" },
  { href: "/resident/report-fire", label: "Report Fire", key: "report-fire" },
  { href: "/resident/guide", label: "Guide", key: "guide" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/resident") return pathname === "/resident";
  return pathname.startsWith(href);
}

export default function ResidentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const logoutFormRef = useRef<HTMLFormElement | null>(null);
  const cancelLogoutButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isLogoutDialogOpen) return;
    cancelLogoutButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLogoutDialogOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isLogoutDialogOpen]);

  const requestLogoutConfirmation = (event: FormEvent<HTMLDivElement>) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.getAttribute("action") !== "/api/auth/logout") return;
    event.preventDefault();
    logoutFormRef.current = form;
    setIsLogoutDialogOpen(true);
  };

  const confirmLogout = () => logoutFormRef.current?.submit();

  /* Don't show shared nav on login/signup */
  const isAuth = pathname.startsWith("/resident/login") || pathname.startsWith("/resident/signup");
  if (isAuth) return <>{children}</>;

  const activeKey = navItems.find((n) => isActive(pathname, n.href))?.key ?? "";
  const isProfileActive = pathname.startsWith("/resident/profile");

  return (
    <>
      <style>{layoutStyles}</style>
      <div className="resident-shell" onSubmitCapture={requestLogoutConfirmation}>
        {/* ===== MOBILE HEADER ===== */}
        <header className="rl-mobile-header">
          <div className="rl-m-left">
            <img src="/images/LOGO FIRE.webp" alt="ALAB Fire Logo" />
          </div>
          <div className="rl-m-brand">
            <img src="/images/logo white tint.webp" alt="ALAB Logo" />
          </div>
          <div className="rl-m-actions">
            <button className="rl-m-notif-btn" aria-label="Notifications">
              <IconBell />
              <span className="rl-m-notif-badge">1</span>
            </button>
          </div>
        </header>

        {/* ===== DESKTOP HEADER ===== */}
        <header className="rl-desktop-header">
          <div className="rl-header-left">
            <img src="/images/Logo.webp" alt="ALAB Logo" className="rl-brand-logo" />
          </div>

          <div className="rl-header-nav">
            {navItems.map((item) => (
              <div className="rl-nav-item-wrap" key={item.key}>
                <a
                  href={item.href}
                  className={`rl-nav-item${isActive(pathname, item.href) ? " rl-active" : ""}${item.key === "report-fire" ? " rl-report-fire-nav" : ""}`}
                >
                  {item.key === "home" && <IconHome filled={activeKey === "home"} />}
                  {item.key === "reports" && <IconReports filled={activeKey === "reports"} />}
                  {item.key === "report-fire" && (
                    <div className="rl-nav-icon">
                      <img src="/images/fire logo.webp" alt="Fire" className="rl-fire-logo-tint" />
                    </div>
                  )}
                  {item.key === "guide" && <IconGuide filled={activeKey === "guide"} />}
                  {item.label}
                </a>
              </div>
            ))}
          </div>

          <div className="rl-header-right">
            <button className="rl-notif-btn">
              <IconBell />
              <span className="rl-notif-badge">1</span>
            </button>
            <button className="rl-lang-btn">
              <IconGlobe />
              EN
            </button>
            <div className="rl-profile-menu">
              <button className="rl-profile-btn" aria-haspopup="true">
                <img
                  src="https://ui-avatars.com/api/?name=Resident&background=1e293b&color=fff&size=150"
                  alt="Profile"
                />
              </button>
              <div className="rl-profile-dropdown">
                <a href="/resident/profile" className="rl-dropdown-item">
                  <svg className="rl-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                  Profile Settings
                </a>
                <a href="/resident/guide" className="rl-dropdown-item">
                  <svg className="rl-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  Help Center
                </a>
                <div className="rl-dropdown-divider" />
                <form action="/api/auth/logout" method="post" className="rl-logout-form">
                  <button type="submit" className="rl-dropdown-item rl-logout rl-logout-button">
                  <svg className="rl-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                  Logout
                  </button>
                </form>
              </div>
            </div>
          </div>
        </header>

        {/* ===== PAGE CONTENT ===== */}
        {children}

        {/* ===== MOBILE BOTTOM NAV ===== */}
        <nav className="rl-mobile-nav">
          <a href="/resident" className={`rl-mn-item${activeKey === "home" ? " rl-mn-active" : ""}`}>
            <IconHome filled={activeKey === "home"} />
            Home
          </a>
          <a href="/resident/reports" className={`rl-mn-item${activeKey === "reports" ? " rl-mn-active" : ""}`}>
            <IconReports filled={activeKey === "reports"} />
            Reports
          </a>
          <div className="rl-mn-fab-wrap">
            <a href="/resident/report-fire" className="rl-mn-fab">
              <img src="/images/fire logo.webp" alt="Fire Logo" />
              <span>Report Fire</span>
            </a>
          </div>
          <a href="/resident/guide" className={`rl-mn-item${activeKey === "guide" ? " rl-mn-active" : ""}`}>
            <IconGuide filled={activeKey === "guide"} />
            Guide
          </a>
          <a href="/resident/profile" className={`rl-mn-item${isProfileActive ? " rl-mn-active" : ""}`}>
            <IconProfile filled={isProfileActive} />
            Profile
          </a>
        </nav>
      </div>
      {isLogoutDialogOpen && (
        <div className="resident-logout-backdrop" role="presentation" onMouseDown={() => setIsLogoutDialogOpen(false)}>
          <section
            id="residentLogoutDialog"
            className="resident-logout-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="residentLogoutTitle"
            aria-describedby="residentLogoutDescription"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="resident-logout-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 19V5a2 2 0 0 0-2-2h-6" /></svg>
            </div>
            <h2 id="residentLogoutTitle" className="resident-logout-title">Log out?</h2>
            <p id="residentLogoutDescription" className="resident-logout-copy">You will need to sign in again to access your resident account.</p>
            <div className="resident-logout-actions">
              <button ref={cancelLogoutButtonRef} type="button" className="resident-logout-action resident-logout-cancel" onClick={() => setIsLogoutDialogOpen(false)}>Cancel</button>
              <button type="button" className="resident-logout-action resident-logout-confirm" onClick={confirmLogout}>Yes, log out</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
