import type { CSSProperties } from "react";

/*
 * Skeleton placeholders shown while a tab loads its data, in the shape of the
 * content that is coming (table rows, list rows, cards, a detail sheet, a
 * chart or a whole page) instead of a spinner and a "Loading…" line.
 * React hoists the style tag once, so these work anywhere, even inside <tbody>.
 */

const css = `
  .skl { position: relative; display: block; overflow: hidden; height: 12px; border-radius: 6px; background: #E8EEF5; }
  .skl::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.72), rgba(255,255,255,0)); animation: skl-shimmer 1.35s ease-in-out infinite; }
  .skl-sm { height: 9px; }
  .skl-lg { height: 16px; }
  .skl-avatar { flex: 0 0 auto; width: 36px; height: 36px; border-radius: 10px; }
  .skl-pill { width: 74px; height: 24px; border-radius: 999px; }
  .skl-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .skl-lead { display: flex; align-items: center; gap: .7rem; min-width: 0; }
  .skl-lines { display: grid; flex: 1 1 auto; gap: .42rem; min-width: 0; }
  .skl-end { display: flex; justify-content: flex-end; }
  .skl-list { display: grid; gap: .6rem; }
  .skl-list-row { display: flex; align-items: center; gap: .75rem; padding: .8rem .9rem; border: 1px solid #EEF2F6; border-radius: 12px; background: #FFFFFF; }
  .skl-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: .9rem; }
  .skl-card { display: grid; gap: .7rem; padding: 1rem; border: 1px solid #E7EDF4; border-radius: 14px; background: #FFFFFF; }
  .skl-card-foot { display: flex; justify-content: space-between; gap: .75rem; padding-top: .7rem; border-top: 1px solid #F1F5F9; }
  .skl-detail { display: grid; gap: 1rem; }
  .skl-detail-hero { display: flex; align-items: center; gap: .9rem; padding: 1rem; border: 1px solid #EEF2F6; border-radius: 14px; background: #F8FAFC; }
  .skl-detail-hero .skl-avatar { width: 48px; height: 48px; border-radius: 14px; }
  .skl-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
  .skl-fact { display: grid; gap: .45rem; padding: .8rem; border: 1px solid #EEF2F6; border-radius: 11px; background: #FFFFFF; }
  .skl-chart { display: flex; align-items: flex-end; gap: 3%; height: 260px; padding: 1rem 1rem 0; border-bottom: 1px solid #E8EEF5; }
  .skl-chart .skl { flex: 1 1 0; height: auto; border-radius: 8px 8px 0 0; }
  .skl-page { display: grid; gap: 1rem; }
  .skl-page-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
  .skl-page-cards .skl { height: 138px; border-radius: 16px; }
  .skl-panel { display: grid; gap: .85rem; padding: 1rem; border: 1px solid #E7EDF4; border-radius: 14px; background: #FFFFFF; }
  .skl-toolbar { display: flex; justify-content: space-between; gap: 1rem; }
  .skl-table-row { display: grid; grid-template-columns: 2fr 1.2fr 1fr 1fr .7fr; align-items: center; gap: 1rem; padding: .55rem 0; border-top: 1px solid #F1F5F9; }
  .skl-map { height: min(560px, 62vh); border-radius: 16px; }
  @keyframes skl-shimmer { to { transform: translateX(100%); } }
  @media (max-width: 1024px) { .skl-page-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 640px) {
    .skl-facts { grid-template-columns: 1fr; }
    .skl-table-row { grid-template-columns: 2fr 1fr .7fr; }
    .skl-table-row > :nth-child(3), .skl-table-row > :nth-child(4) { display: none; }
  }
  @media (prefers-reduced-motion: reduce) { .skl::after { animation: none; } }
`;

function SkeletonStyles() {
  return <style href="alab-skeleton-loader" precedence="default">{css}</style>;
}

function Status({ label }: { label: string }) {
  return <span className="skl-sr" role="status">{label}</span>;
}

/** One shimmering bar. */
export function SkeletonBar({ width = "100%", height, radius, style }: { width?: CSSProperties["width"]; height?: number; radius?: number; style?: CSSProperties }) {
  return <><SkeletonStyles /><span className="skl" style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" /></>;
}

const widths = ["72%", "58%", "84%", "64%", "78%", "52%", "68%"];

/** Placeholder rows for a table body; the first cell shows an avatar and two lines, the last a pill. */
export function SkeletonTableRows({ rows = 6, columns, label }: { rows?: number; columns: number; label: string }) {
  return <>
    {Array.from({ length: rows }, (_, row) => (
      <tr key={row} className="skl-row">
        {Array.from({ length: columns }, (_, col) => (
          <td key={col}>
            {row === 0 && col === 0 && <><SkeletonStyles /><Status label={label} /></>}
            {col === 0 ? (
              <span className="skl-lead" aria-hidden="true">
                <span className="skl skl-avatar" />
                <span className="skl-lines"><span className="skl" style={{ width: widths[row % widths.length] }} /><span className="skl skl-sm" style={{ width: "45%" }} /></span>
              </span>
            ) : col === columns - 1 ? (
              <span className="skl-end" aria-hidden="true"><span className="skl skl-pill" /></span>
            ) : (
              <span className="skl" aria-hidden="true" style={{ width: widths[(row + col) % widths.length] }} />
            )}
          </td>
        ))}
      </tr>
    ))}
  </>;
}

/** Placeholder rows for a list (incident feed, notifications). */
export function SkeletonList({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <div className="skl-list">
      <SkeletonStyles /><Status label={label} />
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="skl-list-row" aria-hidden="true">
          <span className="skl skl-avatar" />
          <span className="skl-lines"><span className="skl" style={{ width: widths[row % widths.length] }} /><span className="skl skl-sm" style={{ width: "40%" }} /></span>
          <span className="skl skl-pill" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder cards (fire trucks, water-source registries). */
export function SkeletonCards({ count = 6, label }: { count?: number; label: string }) {
  return (
    <div className="skl-cards">
      <SkeletonStyles /><Status label={label} />
      {Array.from({ length: count }, (_, card) => (
        <div key={card} className="skl-card" aria-hidden="true">
          <span className="skl-lead"><span className="skl skl-avatar" /><span className="skl-lines"><span className="skl" style={{ width: widths[card % widths.length] }} /><span className="skl skl-sm" style={{ width: "40%" }} /></span></span>
          <span className="skl" style={{ width: "90%" }} />
          <span className="skl" style={{ width: "65%" }} />
          <span className="skl-card-foot"><span className="skl skl-sm" style={{ width: "35%" }} /><span className="skl skl-pill" /></span>
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a detail drawer or dialog: a header, fact tiles and a few lines. */
export function SkeletonDetail({ facts = 6, label }: { facts?: number; label: string }) {
  return (
    <div className="skl-detail">
      <SkeletonStyles /><Status label={label} />
      <div className="skl-detail-hero" aria-hidden="true">
        <span className="skl skl-avatar" />
        <span className="skl-lines"><span className="skl skl-lg" style={{ width: "55%" }} /><span className="skl skl-sm" style={{ width: "35%" }} /></span>
        <span className="skl skl-pill" />
      </div>
      <div className="skl-facts" aria-hidden="true">
        {Array.from({ length: facts }, (_, fact) => (
          <div key={fact} className="skl-fact"><span className="skl skl-sm" style={{ width: "40%" }} /><span className="skl" style={{ width: widths[fact % widths.length] }} /></div>
        ))}
      </div>
      <div className="skl-panel" aria-hidden="true">
        <span className="skl" style={{ width: "30%" }} />
        <span className="skl" /><span className="skl" style={{ width: "92%" }} /><span className="skl" style={{ width: "70%" }} />
      </div>
    </div>
  );
}

/** Placeholder for a chart area. */
export function SkeletonChart({ label }: { label: string }) {
  const bars = [46, 68, 38, 82, 57, 74, 50, 90, 62, 44, 70, 55];
  return (
    <div className="skl-panel">
      <SkeletonStyles /><Status label={label} />
      <span className="skl-toolbar" aria-hidden="true"><span className="skl" style={{ width: "28%" }} /><span className="skl skl-pill" /></span>
      <div className="skl-chart" aria-hidden="true">
        {bars.map((height, bar) => <span key={bar} className="skl" style={{ height: `${height}%` }} />)}
      </div>
    </div>
  );
}

/** A whole tab while its code or first data loads: summary cards, a toolbar and rows (or a map). */
export function SkeletonPage({ label, variant = "table", style }: { label: string; variant?: "table" | "map"; style?: CSSProperties }) {
  return (
    <div className="skl-page" style={style}>
      <SkeletonStyles /><Status label={label} />
      <div className="skl-page-cards" aria-hidden="true">{[0, 1, 2, 3].map((card) => <span key={card} className="skl" />)}</div>
      {variant === "map" ? (
        <span className="skl skl-map" aria-hidden="true" />
      ) : (
        <div className="skl-panel" aria-hidden="true">
          <span className="skl-toolbar"><span className="skl" style={{ width: "34%", height: 38, borderRadius: 9 }} /><span className="skl" style={{ width: "22%", height: 38, borderRadius: 9 }} /></span>
          {Array.from({ length: 7 }, (_, row) => (
            <span key={row} className="skl-table-row">
              <span className="skl-lead"><span className="skl skl-avatar" /><span className="skl-lines"><span className="skl" style={{ width: widths[row % widths.length] }} /><span className="skl skl-sm" style={{ width: "45%" }} /></span></span>
              <span className="skl" style={{ width: widths[(row + 2) % widths.length] }} />
              <span className="skl" style={{ width: widths[(row + 4) % widths.length] }} />
              <span className="skl" style={{ width: widths[(row + 1) % widths.length] }} />
              <span className="skl-end"><span className="skl skl-pill" /></span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
