"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/*
 * Municipal summary cards: solid color gradients with white text, a frosted
 * icon tile, a soft decorative wave and a colored shadow. Links and filters
 * keep their existing destinations and pressed states.
 */

export type StatTone = "red" | "emerald" | "blue" | "amber" | "violet" | "slate";

export type StatItem = {
  key: string;
  icon: string;
  tone: StatTone;
  value: ReactNode;
  label: string;
  badge?: string;
  description?: string;
  /** A unit or "of" total shown small beside the value. */
  suffix?: ReactNode;
  href?: string;
  onClick?: () => void;
  /** For filter cards: whether this filter is on. */
  active?: boolean;
  loading?: boolean;
};

export const municipalStatCardStyles = `
  .mstat-row { display: grid; grid-template-columns: repeat(var(--mstat-columns, 4), minmax(0, 1fr)); grid-auto-rows: 1fr; gap: 1rem; }
  .mstat-card {
    --mstat-start: #64748B; --mstat-end: #334155; --mstat-glow: rgba(51, 65, 85, 0.45);
    position: relative; isolation: isolate; overflow: hidden;
    display: flex; flex-direction: column; justify-content: space-between;
    min-width: 0; min-height: 138px; box-sizing: border-box; padding: 12px 1.15rem 10px;
    border: 0; border-radius: 16px;
    background: linear-gradient(135deg, var(--mstat-start) 0%, var(--mstat-end) 100%);
    color: #FFFFFF; font: inherit; text-align: left; text-decoration: none;
    box-shadow: 0 16px 30px -16px var(--mstat-glow), 0 3px 8px rgba(15, 23, 42, 0.08);
    transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }
  /* Colors chosen so white text keeps readable contrast across the gradient. */
  .mstat-card.red { --mstat-start: #EF4444; --mstat-end: #B91C1C; --mstat-glow: rgba(185, 28, 28, 0.55); }
  .mstat-card.amber { --mstat-start: #E58A0F; --mstat-end: #B45309; --mstat-glow: rgba(180, 83, 9, 0.5); }
  .mstat-card.blue { --mstat-start: #3B82F6; --mstat-end: #1D4ED8; --mstat-glow: rgba(29, 78, 216, 0.5); }
  .mstat-card.violet { --mstat-start: #8B5CF6; --mstat-end: #6D28D9; --mstat-glow: rgba(109, 40, 217, 0.5); }
  .mstat-card.emerald { --mstat-start: #10A574; --mstat-end: #047857; --mstat-glow: rgba(4, 120, 87, 0.5); }
  .mstat-card::before { content: ""; position: absolute; z-index: -1; top: -45%; right: -18%; width: 70%; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 70%); pointer-events: none; }
  .mstat-wave { position: absolute; z-index: -1; right: 0; bottom: 30px; width: 46%; height: 44px; pointer-events: none; opacity: 0.85; }
  a.mstat-card, button.mstat-card { cursor: pointer; }
  a.mstat-card:hover, button.mstat-card:hover { transform: translateY(-3px); box-shadow: 0 22px 36px -16px var(--mstat-glow), 0 4px 10px rgba(15, 23, 42, 0.1); }
  .mstat-card:focus-visible { outline: 3px solid var(--mstat-end); outline-offset: 3px; }
  .mstat-card.is-active { outline: 3px solid var(--mstat-start); outline-offset: 3px; }
  .mstat-header { display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; min-width: 0; margin-bottom: 4px; }
  .mstat-icon { flex: 0 0 auto; width: 36px; height: 36px; display: grid; place-items: center; border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 11px; background: rgba(255, 255, 255, 0.2); color: #FFFFFF; font-size: 1.02rem; backdrop-filter: blur(4px); }
  .mstat-tag { min-width: 0; overflow: hidden; padding: 0.22rem 0.55rem; border-radius: 999px; background: rgba(255, 255, 255, 0.18); color: #FFFFFF; font-size: 0.62rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; text-overflow: ellipsis; }
  .mstat-tag i { margin-right: 0.3rem; opacity: 0.9; }
  .mstat-body { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; margin: 0.15rem 0 0.1rem; }
  .mstat-value { display: flex; align-items: baseline; gap: 0.25rem; font-size: 1.9rem; font-weight: 900; line-height: 1.05; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }
  .mstat-value small { color: rgba(255, 255, 255, 0.82); font-size: 0.85rem; font-weight: 700; letter-spacing: 0; }
  .mstat-label { color: rgba(255, 255, 255, 0.92); font-size: 0.7rem; font-weight: 800; line-height: 1.35; text-transform: uppercase; letter-spacing: 0.04em; overflow-wrap: anywhere; }
  .mstat-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; min-height: 1.5rem; margin-top: 4px; padding-top: 5px; border-top: 1px solid rgba(255, 255, 255, 0.24); color: rgba(255, 255, 255, 0.92); font-size: 0.7rem; font-weight: 650; line-height: 1.4; }
  .mstat-footer i { flex: 0 0 auto; font-size: 0.72rem; transition: transform 0.2s ease; }
  a.mstat-card:hover .mstat-footer i, button.mstat-card:hover .mstat-footer i { transform: translateX(3px); }
  .mstat-skel { display: inline-block; width: 2.5rem; height: 1.75rem; border-radius: 6px; background: linear-gradient(90deg, rgba(255,255,255,0.18) 25%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.18) 75%); background-size: 200% 100%; animation: mstatShimmer 1.4s ease-in-out infinite; }
  @keyframes mstatShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  @media (max-width: 1024px) { .mstat-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 640px) { .mstat-row { gap: 0.75rem; } .mstat-card { padding: 10px 0.85rem 8px; min-height: 124px; } .mstat-icon { width: 32px; height: 32px; font-size: 0.95rem; } .mstat-tag { padding: 0.2rem 0.4rem; font-size: 0.58rem; } .mstat-value { font-size: 1.7rem; } .mstat-wave { display: none; } }
  @media (max-width: 360px) { .mstat-row { grid-template-columns: minmax(0, 1fr); } }
  @media (prefers-reduced-motion: reduce) { .mstat-skel { animation: none; } .mstat-card { transition: none; } a.mstat-card:hover, button.mstat-card:hover { transform: none; } }
`;

/** A soft decorative wave; it is not a chart and carries no data. */
function Wave() {
  return (
    <svg className="mstat-wave" viewBox="0 0 160 56" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 44 C 22 44, 30 20, 52 24 S 84 46, 106 30 S 140 6, 160 12 L 160 56 L 0 56 Z" fill="rgba(255,255,255,0.10)" />
      <path d="M0 44 C 22 44, 30 20, 52 24 S 84 46, 106 30 S 140 6, 160 12" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function CardContent({ item }: { item: StatItem }) {
  return (
    <>
      <Wave />
      <span className="mstat-header">
        <span className="mstat-icon" aria-hidden="true"><i className={`fa-solid ${item.icon}`} /></span>
        <span className="mstat-tag" title={item.badge ?? item.label}><i className={`fa-solid ${item.icon}`} aria-hidden="true" />{item.badge ?? item.label}</span>
      </span>
      <span className="mstat-body">
        <span className="mstat-value">
          {item.loading ? <span className="mstat-skel" /> : <>{item.value}{item.suffix != null && <small>{item.suffix}</small>}</>}
        </span>
        <span className="mstat-label">{item.label}</span>
      </span>
      {(item.description || item.href || item.onClick) && <span className="mstat-footer">
        <span>{item.description ?? item.label}</span>
        {(item.href || item.onClick) && <i className="fa-solid fa-arrow-right" aria-hidden="true" />}
      </span>}
    </>
  );
}

export function MunicipalStatCards({ items, label, columns, className }: { items: StatItem[]; label: string; columns?: number; className?: string }) {
  return (
    <section className={`mstat-row${className ? ` ${className}` : ""}`} aria-label={label} style={{ ["--mstat-columns" as string]: String(columns ?? items.length) }}>
      <style>{municipalStatCardStyles}</style>
      {items.map((item) => {
        if (item.href) {
          return <Link key={item.key} href={item.href} className={`mstat-card ${item.tone}`}><CardContent item={item} /></Link>;
        }
        if (item.onClick) {
          return (
            <button key={item.key} type="button" className={`mstat-card ${item.tone}${item.active ? " is-active" : ""}`} onClick={item.onClick} aria-pressed={item.active ?? false}>
              <CardContent item={item} />
            </button>
          );
        }
        return <div key={item.key} className={`mstat-card ${item.tone}`}><CardContent item={item} /></div>;
      })}
    </section>
  );
}

/** The same cards on the Provincial BFP pages, so both portals match. */
export const StatCards = MunicipalStatCards;
