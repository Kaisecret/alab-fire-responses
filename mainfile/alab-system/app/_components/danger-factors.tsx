"use client";

import {
  describeDangerFactors,
  type DangerFactorKind,
} from "../../lib/fire-reports/danger-factor-display";
import { getFireTypeLabel } from "../../lib/municipal-bfp/reports/formatters";

// "Why this Level of Danger" for BFP screens: the level and score, a chip per
// reported fire type when there is more than one, and each reason with the
// icon of the criterion it comes from.

const KIND_ICONS: Record<DangerFactorKind, string> = {
  wind: "fa-wind",
  weather: "fa-temperature-high",
  distance: "fa-ruler-horizontal",
  density: "fa-city",
  material: "fa-cubes",
  route: "fa-road",
  vehicle: "fa-car-burst",
  rubbish: "fa-dumpster-fire",
  other: "fa-circle-info",
};

const KIND_LABELS: Record<DangerFactorKind, string> = {
  wind: "Wind",
  weather: "Weather",
  distance: "Nearest building",
  density: "Building density",
  material: "Structure",
  route: "Road access",
  vehicle: "Vehicle",
  rubbish: "Rubbish",
  other: "Note",
};

const TYPE_ICONS: Record<string, string> = {
  HOUSE_BUILDING: "fa-house-fire",
  GRASS: "fa-seedling",
  FOREST: "fa-tree",
  VEHICLE: "fa-car-burst",
  OTHER: "fa-dumpster-fire",
};

const LEVEL_ICONS: Record<string, string> = {
  CRITICAL: "fa-triangle-exclamation",
  HIGH: "fa-circle-exclamation",
  MODERATE: "fa-triangle-exclamation",
  LOW: "fa-shield",
};

export const dangerFactorStyles = `
  .dgf { display:grid; gap:.9rem; padding:1.15rem 1.2rem; border:1px solid #E2E8F0; border-radius:14px; background:#FFFFFF; box-shadow:0 1px 3px rgba(15,23,42,.03); }
  .dgf.is-tile { background:#F8FAFC; border-radius:12px; box-shadow:none; }
  .dgf-head { display:flex; align-items:center; justify-content:space-between; gap:.75rem; flex-wrap:wrap; }
  .dgf-title { margin:0; display:flex; align-items:center; gap:.5rem; color:#334155; font-size:.78rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
  .dgf-title i { color:#DC2626; font-size:.85rem; }
  .dgf-level { display:flex; align-items:center; gap:.4rem; }
  .dgf-pill { display:inline-flex; align-items:center; gap:.35rem; padding:3px 10px; border-radius:999px; font-size:.72rem; font-weight:800; letter-spacing:.02em; white-space:nowrap; }
  .dgf-pill.CRITICAL { background:#7F1D1D; color:#FECACA; }
  .dgf-pill.HIGH { background:#991B1B; color:#FEE2E2; }
  .dgf-pill.MODERATE { background:#B45309; color:#FEF3C7; }
  .dgf-pill.LOW { background:#047857; color:#D1FAE5; }
  .dgf-pill.NONE { background:#F1F5F9; color:#475569; border:1px solid #E2E8F0; }
  .dgf-score { padding:3px 10px; border-radius:999px; border:1px solid #E2E8F0; background:#F1F5F9; color:#334155; font-size:.72rem; font-weight:800; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .dgf-types { display:grid; grid-template-columns:repeat(auto-fit,minmax(12.5rem,1fr)); gap:.6rem; }
  .dgf-type { display:flex; align-items:center; gap:.7rem; min-width:0; padding:.7rem .8rem; border:1px solid #E2E8F0; border-radius:12px; background:#FFFFFF; }
  .dgf.is-tile .dgf-type { background:#FFFFFF; }
  .dgf-type.is-lead { border-color:#FCA5A5; background:#FFF5F5; box-shadow:0 4px 14px -10px rgba(220,38,38,.55); }
  .dgf-type-icon { flex:0 0 auto; width:2.2rem; height:2.2rem; display:grid; place-items:center; border-radius:10px; background:#F1F5F9; color:#475569; font-size:.95rem; }
  .dgf-type.is-lead .dgf-type-icon { background:#DC2626; color:#FFFFFF; }
  .dgf-type-text { display:grid; gap:.1rem; min-width:0; }
  .dgf-type-text strong { color:#0F172A; font-size:.86rem; font-weight:800; line-height:1.25; }
  .dgf-type-text small { color:#475569; font-size:.72rem; font-weight:700; font-variant-numeric:tabular-nums; }
  .dgf-type.is-lead .dgf-type-text small { color:#B91C1C; }
  .dgf-list { list-style:none; margin:0; padding:0; display:grid; gap:.5rem; }
  .dgf-row { display:flex; align-items:flex-start; gap:.7rem; padding:.6rem .7rem; border-radius:10px; background:#F8FAFC; border:1px solid #EEF2F7; }
  .dgf.is-tile .dgf-row { background:#FFFFFF; border-color:#E2E8F0; }
  .dgf-row-icon { flex:0 0 auto; width:1.9rem; height:1.9rem; display:grid; place-items:center; border-radius:9px; font-size:.82rem; }
  .dgf-row-body { display:grid; gap:.1rem; min-width:0; padding-top:.05rem; }
  .dgf-row-body small { color:#64748B; font-size:.64rem; font-weight:800; letter-spacing:.05em; text-transform:uppercase; }
  .dgf-row-body span { color:#1E293B; font-size:.84rem; font-weight:600; line-height:1.45; overflow-wrap:anywhere; }
  .dgf-row.wind .dgf-row-icon { background:#EFF6FF; color:#2563EB; }
  .dgf-row.weather .dgf-row-icon { background:#FFFBEB; color:#D97706; }
  .dgf-row.distance .dgf-row-icon { background:#EEF2FF; color:#4F46E5; }
  .dgf-row.density .dgf-row-icon { background:#FEF2F2; color:#DC2626; }
  .dgf-row.material .dgf-row-icon { background:#FFF7ED; color:#C2410C; }
  .dgf-row.route .dgf-row-icon { background:#F1F5F9; color:#334155; }
  .dgf-row.vehicle .dgf-row-icon, .dgf-row.rubbish .dgf-row-icon { background:#FEF2F2; color:#B91C1C; }
  .dgf-row.other .dgf-row-icon { background:#F1F5F9; color:#64748B; }
  @media (max-width:640px) { .dgf { padding:1rem; } .dgf-types { grid-template-columns:1fr; } }
`;

export function DangerFactors({
  factors,
  fireType,
  fireTypes,
  level,
  score,
  tone = "card",
  showLevel = false,
}: {
  factors: readonly string[] | null | undefined;
  fireType: string;
  fireTypes?: readonly string[] | null;
  level: string | null;
  score: number | null;
  tone?: "card" | "tile";
  /** Off where the screen already shows the level beside the reference. */
  showLevel?: boolean;
}) {
  const { types, rows, mixed } = describeDangerFactors({ factors, fireType, fireTypes, level, score });
  if (!rows.length && !mixed) return null;
  const ruleBased = fireType === "VEHICLE" || fireType === "OTHER";
  const levelKey = level && LEVEL_ICONS[level] ? level : "NONE";
  return (
    <section className={`dgf${tone === "tile" ? " is-tile" : ""}`} aria-label="Why this Level of Danger">
      <style>{dangerFactorStyles}</style>
      <div className="dgf-head">
        <h3 className="dgf-title"><i className="fa-solid fa-scale-balanced" aria-hidden="true" />Why this Level of Danger</h3>
        {showLevel && <div className="dgf-level">
          <span className={`dgf-pill ${levelKey}`}>
            {LEVEL_ICONS[levelKey] && <i className={`fa-solid ${LEVEL_ICONS[levelKey]}`} aria-hidden="true" />}
            {level ?? "Unassessed"}
          </span>
          <span className="dgf-score">{ruleBased ? "Rule-based" : score == null ? "No score" : `${score}/100`}</span>
        </div>}
      </div>

      {mixed && (
        <div className="dgf-types" role="list" aria-label="Reported fire types">
          {types.map((type) => (
            <div key={type.fireType} role="listitem" className={`dgf-type${type.setsLevel ? " is-lead" : ""}`}>
              <span className="dgf-type-icon" aria-hidden="true"><i className={`fa-solid ${TYPE_ICONS[type.fireType] ?? "fa-fire"}`} /></span>
              <span className="dgf-type-text">
                <strong>{getFireTypeLabel(type.fireType)}</strong>
                <small>
                  {type.setsLevel ? "Sets the level" : "Also burning"}
                  {type.level ? ` · ${type.level}` : ""}
                  {type.score != null && !(type.fireType === "VEHICLE" || type.fireType === "OTHER") ? ` ${type.score}/100` : ""}
                </small>
              </span>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <ul className="dgf-list">
          {rows.map((row, index) => (
            <li key={`${index}-${row.text}`} className={`dgf-row ${row.kind}`}>
              <span className="dgf-row-icon" aria-hidden="true"><i className={`fa-solid ${KIND_ICONS[row.kind]}`} /></span>
              <span className="dgf-row-body">
                <small>{KIND_LABELS[row.kind]}</small>
                <span>{row.text}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
