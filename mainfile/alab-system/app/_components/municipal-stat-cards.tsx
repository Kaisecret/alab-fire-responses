"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/*
 * Municipal summary cards follow the original Provincial BFP card design:
 * colored backgrounds, white icon tiles, category badges, and large counts.
 * Links and filters retain their existing destinations and pressed states.
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
  .mstat-card { --mstat-start: #F1F5F9; --mstat-end: #E2E8F0; --mstat-border: #CBD5E1; --mstat-ink: #475569; --mstat-tag-bg: #E2E8F0; --mstat-tag-ink: #334155; position: relative; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; min-height: 138px; box-sizing: border-box; padding: 10px 1.2rem 8px; border: 1.5px solid var(--mstat-border); border-radius: 14px; background: linear-gradient(145deg, var(--mstat-start) 0%, var(--mstat-end) 100%); color: #0F172A; font: inherit; text-align: left; text-decoration: none; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06); transition: border-color 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1); }
  .mstat-card.red { --mstat-start: #FFE8E8; --mstat-end: #FFD6D6; --mstat-border: #FFBEBE; --mstat-ink: #DC2626; --mstat-tag-bg: #FDE8E8; --mstat-tag-ink: #991B1B; }
  .mstat-card.amber { --mstat-start: #FFF5DE; --mstat-end: #FFE8BA; --mstat-border: #FFDC99; --mstat-ink: #D97706; --mstat-tag-bg: #FEF3C7; --mstat-tag-ink: #92400E; }
  .mstat-card.blue { --mstat-start: #E6EFFF; --mstat-end: #D2E3FD; --mstat-border: #B8D3FD; --mstat-ink: #2563EB; --mstat-tag-bg: #DBEAFE; --mstat-tag-ink: #1E40AF; }
  .mstat-card.violet { --mstat-start: #F0E8FF; --mstat-end: #E2D3FD; --mstat-border: #D0BCFD; --mstat-ink: #7C3AED; --mstat-tag-bg: #EDE9FE; --mstat-tag-ink: #5B21B6; }
  .mstat-card.emerald { --mstat-start: #E3F8ED; --mstat-end: #CEF2DE; --mstat-border: #B1ECC8; --mstat-ink: #059669; --mstat-tag-bg: #D1FAE5; --mstat-tag-ink: #065F46; }
  a.mstat-card, button.mstat-card { cursor: pointer; }
  a.mstat-card:hover, button.mstat-card:hover { border-color: var(--mstat-ink); transform: translateY(-3px); box-shadow: 0 10px 22px -4px rgba(15, 23, 42, 0.16); }
  .mstat-card:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.3); outline-offset: 2px; }
  .mstat-card.is-active { border-color: var(--mstat-ink); box-shadow: 0 0 0 1px var(--mstat-ink), 0 8px 24px rgba(15, 23, 42, 0.08); }
  .mstat-header { display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; min-width: 0; margin-bottom: 3px; }
  .mstat-icon { flex: 0 0 auto; width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid rgba(255, 255, 255, 0.95); border-radius: 10px; background: #FFFFFF; color: var(--mstat-ink); font-size: 1.05rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }
  .mstat-tag { min-width: 0; overflow: hidden; padding: 0.2rem 0.5rem; border-radius: 6px; background: var(--mstat-tag-bg); color: var(--mstat-tag-ink); font-size: 0.65rem; font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap; text-overflow: ellipsis; }
  .mstat-tag i { margin-right: 0.25rem; }
  .mstat-body { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; margin: 0.15rem 0 0.1rem; }
  .mstat-value { display: flex; align-items: baseline; gap: 0.25rem; font-size: 1.85rem; font-weight: 900; line-height: 1.05; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .mstat-value small { color: #64748B; font-size: 0.82rem; font-weight: 700; letter-spacing: 0; }
  .mstat-label { color: #475569; font-size: 0.69rem; font-weight: 750; line-height: 1.35; text-transform: uppercase; letter-spacing: 0.03em; overflow-wrap: anywhere; }
  .mstat-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; min-height: 1.5rem; margin-top: 3px; padding-top: 4px; border-top: 1px solid var(--mstat-border); color: var(--mstat-ink); font-size: 0.7rem; font-weight: 600; line-height: 1.4; }
  .mstat-footer i { flex: 0 0 auto; font-size: 0.72rem; }
  .mstat-skel { display: inline-block; width: 2.5rem; height: 1.75rem; border-radius: 6px; background: linear-gradient(90deg, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0.3) 75%); background-size: 200% 100%; animation: mstatShimmer 1.4s ease-in-out infinite; }
  @keyframes mstatShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  @media (max-width: 1024px) { .mstat-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 640px) { .mstat-row { gap: 0.75rem; } .mstat-card { padding: 8px 0.85rem 6px; } .mstat-icon { width: 32px; height: 32px; font-size: 0.95rem; } .mstat-tag { padding: 0.2rem 0.3rem; font-size: 0.6rem; } .mstat-value { font-size: 1.7rem; } }
  @media (max-width: 360px) { .mstat-row { grid-template-columns: minmax(0, 1fr); } }
  @media (prefers-reduced-motion: reduce) { .mstat-skel { animation: none; } .mstat-card { transition: none; } a.mstat-card:hover, button.mstat-card:hover { transform: none; } }
`;

function CardContent({ item }: { item: StatItem }) {
  return (
    <>
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
