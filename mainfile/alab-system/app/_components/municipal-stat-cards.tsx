"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/*
 * The one summary-card style used across the Municipal BFP pages: a white
 * card with a tinted icon, the number, and a short label. Cards can link to a
 * page or act as a filter (pressed state) but carry no extra tags or footers.
 */

export type StatTone = "red" | "emerald" | "blue" | "amber" | "violet" | "slate";

export type StatItem = {
  key: string;
  icon: string;
  tone: StatTone;
  value: ReactNode;
  label: string;
  /** A unit or "of" total shown small beside the value. */
  suffix?: ReactNode;
  href?: string;
  onClick?: () => void;
  /** For filter cards: whether this filter is on. */
  active?: boolean;
  loading?: boolean;
};

export const municipalStatCardStyles = `
  .mstat-row { display: grid; grid-template-columns: repeat(var(--mstat-columns, 4), minmax(0, 1fr)); gap: 8px; }
  .mstat-card { display: flex; align-items: center; gap: 0.85rem; min-width: 0; padding: 0.85rem 0.95rem; border: 1px solid #E2E8F0; border-radius: 14px; background: #FFFFFF; color: #0F172A; font: inherit; text-align: left; text-decoration: none; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03); transition: border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  a.mstat-card, button.mstat-card { cursor: pointer; }
  a.mstat-card:hover, button.mstat-card:hover { border-color: #CBD5E1; transform: translateY(-1.5px); box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
  .mstat-card:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.3); outline-offset: 2px; }
  .mstat-card.is-active { border-color: #0F172A; box-shadow: 0 0 0 1px #0F172A, 0 8px 24px rgba(15, 23, 42, 0.08); }
  .mstat-icon { flex: 0 0 auto; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 10px; font-size: 1.05rem; }
  .mstat-icon.red { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
  .mstat-icon.emerald { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
  .mstat-icon.blue { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
  .mstat-icon.amber { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
  .mstat-icon.violet { background: #F5F3FF; color: #7C3AED; border: 1px solid #DDD6FE; }
  .mstat-icon.slate { background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0; }
  .mstat-body { display: flex; flex-direction: column; min-width: 0; }
  .mstat-value { display: flex; align-items: baseline; gap: 0.25rem; font-size: 1.45rem; font-weight: 850; line-height: 1.1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .mstat-value small { color: #64748B; font-size: 0.82rem; font-weight: 700; letter-spacing: 0; }
  .mstat-label { margin-top: 0.15rem; color: #64748B; font-size: 0.74rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mstat-skel { display: inline-block; width: 2rem; height: 1.4rem; border-radius: 6px; background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%); background-size: 200% 100%; animation: mstatShimmer 1.4s ease-in-out infinite; }
  @keyframes mstatShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  @media (max-width: 1024px) { .mstat-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 640px) { .mstat-card { padding: 0.75rem; gap: 0.65rem; } .mstat-icon { width: 36px; height: 36px; font-size: 0.95rem; } .mstat-value { font-size: 1.25rem; } }
  @media (prefers-reduced-motion: reduce) { .mstat-skel { animation: none; } .mstat-card { transition: none; } }
`;

function CardContent({ item }: { item: StatItem }) {
  return (
    <>
      <span className={`mstat-icon ${item.tone}`} aria-hidden="true"><i className={`fa-solid ${item.icon}`} /></span>
      <span className="mstat-body">
        <span className="mstat-value">
          {item.loading ? <span className="mstat-skel" /> : <>{item.value}{item.suffix != null && <small>{item.suffix}</small>}</>}
        </span>
        <span className="mstat-label">{item.label}</span>
      </span>
    </>
  );
}

export function MunicipalStatCards({ items, label, columns }: { items: StatItem[]; label: string; columns?: number }) {
  return (
    <section className="mstat-row" aria-label={label} style={{ ["--mstat-columns" as string]: String(columns ?? items.length) }}>
      <style>{municipalStatCardStyles}</style>
      {items.map((item) => {
        if (item.href) {
          return <Link key={item.key} href={item.href} className="mstat-card"><CardContent item={item} /></Link>;
        }
        if (item.onClick) {
          return (
            <button key={item.key} type="button" className={`mstat-card${item.active ? " is-active" : ""}`} onClick={item.onClick} aria-pressed={item.active ?? false}>
              <CardContent item={item} />
            </button>
          );
        }
        return <div key={item.key} className="mstat-card"><CardContent item={item} /></div>;
      })}
    </section>
  );
}
