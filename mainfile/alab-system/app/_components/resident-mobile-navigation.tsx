import Link from "next/link";
import type { ReactNode } from "react";
import { useResidentLanguage } from "@/app/_lib/resident-i18n";

type ResidentMobileNavigationProps = {
  activeKey: string;
  isProfileActive: boolean;
};

export const residentMobileNavigationStyles = `
  .rl-mobile-nav {
    display: none;
  }

  @media (max-width: 950px) {
    .rl-mobile-nav,
    .rl-mobile-nav * {
      box-sizing: border-box !important;
    }

    .rl-mobile-nav {
      position: fixed;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 100;
      display: flex;
      height: calc(5.3rem + env(safe-area-inset-bottom));
      box-sizing: border-box !important;
      align-items: flex-end;
      justify-content: space-between;
      padding: 0.7rem 0.7rem calc(0.8rem + env(safe-area-inset-bottom));
      border-top: 1px solid #e2e8f0;
      background: #ffffff;
      box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.08);
      isolation: isolate;
    }

    .rl-mn-item,
    .rl-mn-fab-wrap {
      width: 20%;
      min-width: 0;
      box-sizing: border-box !important;
    }

    .rl-mn-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
      color: #94a3b8;
      font-size: 0.74rem;
      font-weight: 650;
      line-height: 1.15;
      text-decoration: none;
      transition: color 0.2s ease;
      box-sizing: border-box !important;
    }

    .rl-mn-item.rl-mn-active { color: #d91b10; }
    .rl-mn-item svg { width: 1.7rem; height: 1.7rem; }

    .rl-mn-fab-wrap {
      position: relative;
      display: flex;
      height: 3.8rem;
      align-items: flex-end;
      justify-content: center;
      box-sizing: border-box !important;
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
      box-shadow: 0 0.55rem 1.35rem rgba(217, 27, 16, 0.36);
      text-decoration: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      box-sizing: border-box !important;
    }

    .rl-mn-fab:hover { box-shadow: 0 0.7rem 1.55rem rgba(217, 27, 16, 0.42); }
    .rl-mn-fab:active { transform: scale(0.94); }
    .rl-mn-fab img {
      width: 2.2rem;
      height: 2.2rem;
      margin-top: 0.12rem;
      object-fit: contain;
      filter: brightness(0) invert(1);
    }
    .rl-mn-fab span {
      margin-top: -0.3rem;
      font-size: 0.49rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      line-height: 1;
      white-space: nowrap;
    }

    /* Keep the emergency action pixel-identical even when a page loads other CSS. */
    .rl-mobile-nav .rl-mn-fab {
      width: 67.2px !important;
      height: 67.2px !important;
      bottom: 16.8px !important;
      box-sizing: border-box !important;
    }
  }
`;

function NavIcon({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function HomeIcon({ active }: { active: boolean }) {
  return <NavIcon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.3" : "2"} strokeLinecap="round" strokeLinejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg></NavIcon>;
}

function ReportsIcon({ active }: { active: boolean }) {
  return <NavIcon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.3" : "2"} strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 13H8" /><path d="M16 17H8" /><path d="M16 13h-2" /></svg></NavIcon>;
}

function GuideIcon({ active }: { active: boolean }) {
  return <NavIcon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.3" : "2"} strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg></NavIcon>;
}

function ProfileIcon({ active }: { active: boolean }) {
  return <NavIcon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.3" : "2"} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg></NavIcon>;
}

export function ResidentMobileNavigation({ activeKey, isProfileActive }: ResidentMobileNavigationProps) {
  return (
    <nav className="rl-mobile-nav" aria-label="Resident navigation">
      <a href="/resident" className={`rl-mn-item${activeKey === "home" ? " rl-mn-active" : ""}`}><HomeIcon active={activeKey === "home"} /><span>Home</span></a>
      <Link href="/resident/reports" className={`rl-mn-item${activeKey === "reports" ? " rl-mn-active" : ""}`}><ReportsIcon active={activeKey === "reports"} /><span>Reports</span></Link>
      <div className="rl-mn-fab-wrap"><a href="/resident/report-fire" className="rl-mn-fab" aria-label="Report Fire"><img src="/images/fire logo.webp" alt="" /><span>Report Fire</span></a></div>
      <a href="/resident/guide" className={`rl-mn-item${activeKey === "guide" ? " rl-mn-active" : ""}`}><GuideIcon active={activeKey === "guide"} /><span>Guide</span></a>
      <a href="/resident/profile" className={`rl-mn-item${isProfileActive ? " rl-mn-active" : ""}`}><ProfileIcon active={isProfileActive} /><span>Profile</span></a>
    </nav>
  );
}
