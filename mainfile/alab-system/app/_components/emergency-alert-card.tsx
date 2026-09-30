"use client";

import type { ReactNode } from "react";

/*
 * The emergency alert card shared by the municipal fire-report alarm and the
 * provincial backup alarm: coloured header, a jumping flame, the report code,
 * a grid of short facts and two actions. Each alarm keeps its own backdrop,
 * sound and logic; this only draws the card.
 */

export type AlertTheme = {
  /** Main accent, e.g. the header gradient end and the primary button. */
  primary: string;
  /** Darker accent for the header gradient start and code text. */
  dark: string;
  /** Tinted background for the code tile and icon circles. */
  soft: string;
  /** Border for tinted surfaces. */
  softBorder: string;
};

export type AlertFact = { icon: string; label: string; value: string };

export type AlertAction = {
  label: string;
  icon: string;
  onClick: () => void;
  variant: "primary" | "secondary";
  disabled?: boolean;
  autoFocus?: boolean;
};

const styles = `
  .eac-card { width:100%; max-width:470px; max-height:calc(100vh - 2rem); overflow:auto; border-radius:22px; background:#fff; box-shadow:0 34px 70px -24px rgba(69,6,3,.55), 0 0 0 1px rgba(255,255,255,.4); font-family:'Plus Jakarta Sans','Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; animation:eacPop .26s cubic-bezier(.16,1,.3,1) both; scrollbar-width:thin; }
  .eac-head { position:relative; overflow:hidden; display:flex; align-items:center; gap:.9rem; padding:1.15rem 1.3rem; color:#fff; background:linear-gradient(135deg,var(--eac-dark) 0%,var(--eac-primary) 100%); }
  .eac-head-flame { position:absolute; right:-10px; top:-18px; width:120px; height:130px; opacity:.2; pointer-events:none; }
  .eac-bell { position:relative; z-index:1; flex:0 0 auto; width:54px; height:54px; display:grid; place-items:center; border-radius:50%; background:rgba(255,255,255,.16); box-shadow:0 0 0 6px rgba(255,255,255,.08); }
  .eac-bell span { width:40px; height:40px; display:grid; place-items:center; border-radius:50%; background:rgba(255,255,255,.95); color:var(--eac-primary); font-size:1.05rem; animation:eacRing 1.6s ease-in-out infinite; transform-origin:50% 20%; }
  .eac-title { position:relative; z-index:1; margin:0; font-size:1.2rem; font-weight:850; letter-spacing:-.02em; line-height:1.15; }
  .eac-sub { position:relative; z-index:1; margin:.22rem 0 0; font-size:.8rem; font-weight:600; opacity:.9; }
  .eac-body { padding:0 1.15rem 1.1rem; }
  .eac-hero { position:relative; height:150px; display:grid; place-items:end center; padding-bottom:8px; overflow:hidden; }
  .eac-hero::before { content:""; position:absolute; left:50%; top:-40px; width:250px; height:250px; transform:translateX(-50%); border-radius:50%; background:radial-gradient(circle,var(--eac-soft) 0%,var(--eac-soft) 34%,rgba(255,255,255,0) 35%,rgba(255,255,255,0) 44%,var(--eac-soft) 45%,rgba(255,255,255,0) 70%); opacity:.9; }
  .eac-flame-wrap { position:relative; z-index:1; display:grid; justify-items:center; }
  .eac-flame { width:96px; height:112px; transform-origin:50% 100%; animation:eacJump .8s ease-in-out infinite; filter:drop-shadow(0 10px 14px rgba(234,88,12,.28)); }
  .eac-flame-shadow { width:74px; height:12px; margin-top:-4px; border-radius:50%; background:radial-gradient(closest-side,rgba(220,38,38,.34),rgba(220,38,38,0)); animation:eacShadow .8s ease-in-out infinite; }
  .eac-badge { position:absolute; z-index:2; right:calc(50% - 64px); bottom:22px; width:34px; height:34px; display:grid; place-items:center; border:3px solid #fff; border-radius:50%; background:var(--eac-dark); color:#fff; font-size:.78rem; box-shadow:0 8px 16px -8px rgba(15,23,42,.6); }
  .eac-code { display:flex; align-items:center; gap:.85rem; padding:.8rem .95rem; border:1px solid var(--eac-soft-border); border-radius:14px; background:var(--eac-soft); }
  .eac-ic { flex:0 0 auto; width:42px; height:42px; display:grid; place-items:center; border-radius:50%; background:#fff; color:var(--eac-primary); font-size:1rem; box-shadow:inset 0 0 0 1px var(--eac-soft-border); }
  .eac-label { display:block; color:#64748B; font-size:.64rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
  .eac-code strong { display:block; margin-top:.12rem; color:var(--eac-dark); font-size:1.12rem; font-weight:850; letter-spacing:-.01em; font-variant-numeric:tabular-nums; word-break:break-all; }
  .eac-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.6rem; margin-top:.6rem; }
  .eac-fact { display:flex; align-items:center; gap:.7rem; min-width:0; padding:.7rem .8rem; border:1px solid #E7ECF2; border-radius:14px; background:#F8FAFC; }
  .eac-fact .eac-ic { width:36px; height:36px; font-size:.86rem; background:var(--eac-soft); box-shadow:none; }
  .eac-fact strong { display:block; margin-top:.1rem; color:#0F172A; font-size:.9rem; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .eac-extra { display:grid; gap:.6rem; margin-top:.75rem; }
  .eac-foot { display:grid; grid-template-columns:1fr 1fr; gap:.65rem; margin-top:.95rem; padding-top:.95rem; border-top:1px solid #EDF1F6; }
  .eac-btn { min-height:50px; display:inline-flex; align-items:center; justify-content:center; gap:.55rem; border-radius:14px; font:inherit; font-size:.9rem; font-weight:800; cursor:pointer; transition:transform .14s ease, box-shadow .14s ease, background .14s ease; }
  .eac-btn:disabled { opacity:.6; cursor:not-allowed; }
  .eac-btn.secondary { border:1.5px solid #D5DDE7; background:#fff; color:#1E293B; }
  .eac-btn.secondary:hover:not(:disabled) { background:#F8FAFC; }
  .eac-btn.primary { border:0; color:#fff; background:linear-gradient(180deg,var(--eac-primary) 0%,var(--eac-dark) 100%); box-shadow:0 14px 24px -14px var(--eac-primary); }
  .eac-btn.primary:hover:not(:disabled) { transform:translateY(-1px); }
  .eac-btn:focus-visible { outline:3px solid rgba(15,23,42,.35); outline-offset:2px; }
  @keyframes eacPop { from { opacity:0; transform:translateY(14px) scale(.97); } to { opacity:1; transform:none; } }
  @keyframes eacRing { 0%,55%,100% { transform:rotate(0); } 10% { transform:rotate(14deg); } 20% { transform:rotate(-12deg); } 30% { transform:rotate(8deg); } 40% { transform:rotate(-5deg); } }
  /* A lively jump: up about 10px with a slight scale and tilt, never a spin. */
  @keyframes eacJump {
    0%, 100% { transform:translateY(0) scale(1) rotate(0deg); }
    25% { transform:translateY(-5px) scale(1.03) rotate(-1.5deg); }
    50% { transform:translateY(-10px) scale(1.06) rotate(1deg); }
    75% { transform:translateY(-4px) scale(1.03) rotate(1.5deg); }
  }
  /* The shadow shrinks and fades while the flame is in the air. */
  @keyframes eacShadow {
    0%, 100% { transform:scaleX(1); opacity:1; }
    50% { transform:scaleX(.7); opacity:.5; }
  }
  @media (prefers-reduced-motion: reduce) { .eac-card, .eac-bell span, .eac-flame, .eac-flame-shadow { animation:none; } }
  @media (max-width:480px) {
    .eac-title { font-size:1.05rem; }
    .eac-grid, .eac-foot { grid-template-columns:1fr; }
    .eac-hero { height:128px; }
  }
`;

/** Flat flame illustration: red outer, orange middle, yellow core, sparks. */
export function FlameIllustration({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 120 140" aria-hidden="true">
    <defs>
      <linearGradient id="eac-outer" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#FB923C" />
        <stop offset="55%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#DC2626" />
      </linearGradient>
      <linearGradient id="eac-middle" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#FDBA74" />
        <stop offset="100%" stopColor="#F97316" />
      </linearGradient>
      <radialGradient id="eac-core" cx="50%" cy="70%" r="60%">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="45%" stopColor="#FDE68A" />
        <stop offset="100%" stopColor="#FBBF24" />
      </radialGradient>
    </defs>
    <g stroke="#F97316" strokeWidth="5" strokeLinecap="round">
      <path d="M20 38 L28 47" />
      <path d="M100 38 L92 47" />
      <path d="M10 70 L21 72" stroke="#EF4444" />
      <path d="M110 70 L99 72" stroke="#EF4444" />
    </g>
    <circle cx="31" cy="22" r="3" fill="#FDBA74" />
    <circle cx="91" cy="20" r="2.6" fill="#FCA5A5" />
    <path fill="url(#eac-outer)" d="M60 6 C63 24 76 34 86 47 C96 60 100 74 98 91 C95 115 79 132 60 132 C41 132 24 117 23 94 C22 77 30 65 39 57 C39 67 43 75 51 79 C46 60 49 42 53 31 C55 22 58 14 60 6 Z" />
    <path fill="url(#eac-middle)" d="M62 44 C66 62 81 71 81 93 C81 111 72 123 60 123 C48 123 39 113 39 99 C39 87 45 79 52 72 C52 82 56 87 60 89 C58 74 58 59 62 44 Z" />
    <path fill="url(#eac-core)" d="M60 76 C64 89 71 96 71 106 C71 115 66 121 60 121 C54 121 49 116 49 108 C49 99 56 93 60 76 Z" />
  </svg>;
}

export function EmergencyAlertCard({
  theme,
  titleId,
  title,
  subtitle,
  heroBadge,
  code,
  facts,
  children,
  actions,
}: {
  theme: AlertTheme;
  titleId: string;
  title: string;
  subtitle: string;
  heroBadge?: string;
  code: { label: string; value: string };
  facts: AlertFact[];
  children?: ReactNode;
  actions: AlertAction[];
}) {
  const vars = {
    "--eac-primary": theme.primary,
    "--eac-dark": theme.dark,
    "--eac-soft": theme.soft,
    "--eac-soft-border": theme.softBorder,
  } as React.CSSProperties;
  return <div className="eac-card" style={vars}>
    <style>{styles}</style>
    <div className="eac-head">
      <FlameIllustration className="eac-head-flame" />
      <span className="eac-bell" aria-hidden="true"><span><i className="fa-solid fa-bell" /></span></span>
      <div>
        <h2 className="eac-title" id={titleId}>{title}</h2>
        <p className="eac-sub">{subtitle}</p>
      </div>
    </div>
    <div className="eac-body">
      <div className="eac-hero" aria-hidden="true">
        <div className="eac-flame-wrap">
          <FlameIllustration className="eac-flame" />
          <span className="eac-flame-shadow" />
        </div>
        {heroBadge && <span className="eac-badge"><i className={`fa-solid ${heroBadge}`} /></span>}
      </div>
      <div className="eac-code">
        <span className="eac-ic" aria-hidden="true"><i className="fa-solid fa-file-lines" /></span>
        <div><span className="eac-label">{code.label}</span><strong>{code.value}</strong></div>
      </div>
      <div className="eac-grid">
        {facts.map((fact) => <div className="eac-fact" key={fact.label}>
          <span className="eac-ic" aria-hidden="true"><i className={`fa-solid ${fact.icon}`} /></span>
          <div style={{ minWidth: 0 }}><span className="eac-label">{fact.label}</span><strong title={fact.value}>{fact.value}</strong></div>
        </div>)}
      </div>
      {children && <div className="eac-extra">{children}</div>}
      <div className="eac-foot">
        {actions.map((action) => <button
          key={action.label}
          type="button"
          className={`eac-btn ${action.variant}`}
          onClick={action.onClick}
          disabled={action.disabled}
          autoFocus={action.autoFocus}
        >
          <i className={`fa-solid ${action.icon}`} aria-hidden="true" />{action.label}
        </button>)}
      </div>
    </div>
  </div>;
}
