"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { ProvincialWaterSourceRegistry } from "../../lib/water-sources/types";

const styles = `
  .prov-water { padding:1.5rem clamp(1rem,2vw,2rem) 3rem; color:#172033; font-family:'Plus Jakarta Sans',sans-serif; }
  .prov-water * { box-sizing:border-box; }
  .prov-water__header { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; margin-bottom:1.25rem; }
  .prov-water__eyebrow { margin:0 0 .4rem; color:#b42318; font-size:.7rem; font-weight:850; letter-spacing:.11em; text-transform:uppercase; }
  .prov-water h1 { margin:0; font-size:clamp(1.45rem,2vw,2rem); letter-spacing:-.035em; }
  .prov-water__subtitle { max-width:760px; margin:.45rem 0 0; color:#667085; font-size:.87rem; line-height:1.55; }
  .prov-water__badge { display:inline-flex; align-items:center; gap:.45rem; min-height:40px; padding:.55rem .75rem; border:1px solid #d0d5dd; border-radius:9px; background:#fff; color:#475467; font-size:.75rem; font-weight:800; white-space:nowrap; }
  .prov-water__summary { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); border:1px solid #e4e7ec; border-radius:12px; background:#fff; margin-bottom:1rem; }
  .prov-water__summary div { padding:1rem 1.15rem; border-right:1px solid #e4e7ec; }
  .prov-water__summary div:last-child { border-right:0; }
  .prov-water__summary strong { display:block; font-size:1.35rem; }
  .prov-water__summary span { color:#667085; font-size:.74rem; font-weight:700; }
  .prov-water__layout { display:grid; grid-template-columns:minmax(300px, .82fr) minmax(420px,1.5fr); gap:1rem; align-items:start; }
  .prov-water__panel { border:1px solid #e4e7ec; border-radius:12px; background:#fff; overflow:hidden; }
  .prov-water__panel-head { padding:1rem 1.1rem; border-bottom:1px solid #e4e7ec; display:flex; align-items:center; justify-content:space-between; gap:.75rem; }
  .prov-water__panel-head h2 { margin:0; font-size:.92rem; }
  .prov-water__panel-head span { color:#667085; font-size:.7rem; font-weight:700; }
  .prov-water__municipalities { display:grid; max-height:650px; overflow:auto; }
  .prov-water__municipality { appearance:none; width:100%; border:0; border-bottom:1px solid #f0f1f3; background:#fff; padding:.9rem 1.1rem; text-align:left; cursor:pointer; display:grid; grid-template-columns:1fr auto; gap:.3rem .8rem; color:#344054; }
  .prov-water__municipality:hover { background:#f8fafc; }
  .prov-water__municipality.is-active { background:#f0fdfa; box-shadow:inset 3px 0 #0f766e; }
  .prov-water__municipality:focus-visible, .prov-water a:focus-visible, .prov-water input:focus-visible { outline:3px solid rgba(37,99,235,.35); outline-offset:-3px; }
  .prov-water__municipality strong { font-size:.8rem; }
  .prov-water__municipality span { color:#667085; font-size:.7rem; }
  .prov-water__municipality b { grid-row:1 / 3; grid-column:2; align-self:center; display:grid; place-items:center; min-width:34px; height:28px; border-radius:999px; background:#f2f4f7; color:#344054; font-size:.74rem; }
  .prov-water__detail { min-height:520px; }
  .prov-water__search { min-height:40px; width:min(260px,100%); padding:.55rem .7rem; border:1px solid #d0d5dd; border-radius:8px; font:inherit; font-size:.76rem; }
  .prov-water__records { display:grid; gap:.6rem; padding:.75rem; }
  .prov-water__record { display:grid; grid-template-columns:42px 1fr auto; gap:.75rem; align-items:center; color:inherit; text-decoration:none; padding:.85rem; border:1px solid #e4e7ec; border-radius:9px; transition:border-color .18s,background .18s; }
  .prov-water__record:hover { border-color:#84c7c3; background:#f8fffe; }
  .prov-water__record-icon { width:42px; height:42px; display:grid; place-items:center; border-radius:8px; background:#e8f7f5; color:#0f766e; }
  .prov-water__record h3 { margin:0; font-size:.78rem; line-height:1.4; }
  .prov-water__record p { margin:.25rem 0 0; color:#667085; font-size:.68rem; }
  .prov-water__record-meta { text-align:right; }
  .prov-water__record-meta strong { display:block; font-size:.7rem; }
  .prov-water__record-meta span { color:#0f766e; font-size:.66rem; font-weight:800; }
  .prov-water__empty { padding:3rem 1rem; text-align:center; color:#667085; font-size:.82rem; }
  @media(max-width:900px){ .prov-water__layout{grid-template-columns:1fr;} .prov-water__municipalities{max-height:340px;} }
  @media(max-width:600px){ .prov-water__header{flex-direction:column;} .prov-water__summary{grid-template-columns:1fr;} .prov-water__summary div{border-right:0;border-bottom:1px solid #e4e7ec;} .prov-water__summary div:last-child{border-bottom:0;} .prov-water__panel-head{align-items:flex-start;flex-direction:column;} .prov-water__search{width:100%;} .prov-water__record{grid-template-columns:38px 1fr;} .prov-water__record-meta{grid-column:2;text-align:left;} }
`;

export function ProvincialWaterSources() {
  const [registry, setRegistry] = useState<ProvincialWaterSourceRegistry | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState("ALL");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/provincial-bfp/water-sources", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Unable to load the provincial registry."); return response.json(); })
      .then((data: ProvincialWaterSourceRegistry) => { setRegistry(data); })
      .catch((reason) => { if (reason?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Unable to load the provincial registry."); });
    return () => controller.abort();
  }, []);

  const totalLocations = registry?.municipalities.reduce((sum, item) => sum + item.sourceCount, 0) ?? 0;
  const totalHydrants = registry?.municipalities.reduce((sum, item) => sum + item.fireHydrantCount, 0) ?? 0;
  const selected = registry?.municipalities.find((item) => item.municipalityId === selectedMunicipality);
  const allSelected = selectedMunicipality === "ALL";
  const records = useMemo(() => {
    const value = query.trim().toLowerCase();
    return (registry?.sources ?? []).filter((source) => (selectedMunicipality === "ALL" || source.municipalityId === selectedMunicipality) && (!value || `${source.exactLocation} ${source.typeColor} ${source.municipalityName}`.toLowerCase().includes(value)));
  }, [query, registry, selectedMunicipality]);

  return <>
    <style>{styles}</style>
    <main className="prov-water">
      <header className="prov-water__header"><div><p className="prov-water__eyebrow">Antique provincial overview</p><h1>Water sources by municipality</h1><p className="prov-water__subtitle">A municipality-level view of 148 records from the BFP locator chart, with exact coordinates, source type, color, and locally added records.</p></div><span className="prov-water__badge"><i className="fa-solid fa-file-shield" /> BFP source register</span></header>
      <section className="prov-water__summary" aria-label="Provincial totals"><div><strong>{registry?.municipalities.length ?? 0}</strong><span>Municipalities</span></div><div><strong>{totalLocations}</strong><span>Mapped locations</span></div><div><strong>{totalHydrants}</strong><span>Fire hydrants</span></div></section>
      {error ? <div className="prov-water__panel prov-water__empty">{error}</div> : !registry ? <div className="prov-water__panel prov-water__empty">Loading the province-wide registry…</div> : <div className="prov-water__layout">
        <section className="prov-water__panel"><header className="prov-water__panel-head"><h2>Municipal registry</h2><span>Select a municipality</span></header><div className="prov-water__municipalities"><button type="button" className={`prov-water__municipality ${allSelected ? "is-active" : ""}`} aria-pressed={allSelected} onClick={() => { setSelectedMunicipality("ALL"); setQuery(""); }}><strong>All municipalities</strong><span>Province-wide water-source registry</span><b>{totalLocations}</b></button>{registry.municipalities.map((municipality) => <button type="button" key={municipality.municipalityId} className={`prov-water__municipality ${municipality.municipalityId === selectedMunicipality ? "is-active" : ""}`} aria-pressed={municipality.municipalityId === selectedMunicipality} onClick={() => { setSelectedMunicipality(municipality.municipalityId); setQuery(""); }}><strong>{municipality.municipalityName}</strong><span>{municipality.fireHydrantCount} hydrants · {municipality.waterSourceCount} other sources</span><b>{municipality.sourceCount}</b></button>)}</div></section>
        <section className="prov-water__panel prov-water__detail"><header className="prov-water__panel-head"><div><h2>{allSelected ? "All municipalities" : selected?.municipalityName || "Municipality"}</h2><span>{allSelected ? totalLocations : selected?.sourceCount ?? 0} mapped locations</span></div><input className="prov-water__search" aria-label="Search selected municipality" placeholder="Search location or type" value={query} onChange={(event) => setQuery(event.target.value)} /></header>{records.length === 0 ? <div className="prov-water__empty">No water-source records found for this municipality.</div> : <div className="prov-water__records">{records.map((source) => <Link key={source.id} className="prov-water__record" href={`/provincial-bfp/gis-map?municipalityId=${source.municipalityId}&waterSource=${source.id}`}><span className="prov-water__record-icon"><i className={source.sourceKind === "FIRE_HYDRANT" ? "fa-solid fa-fire-extinguisher" : "fa-solid fa-droplet"} /></span><div><h3>{source.exactLocation}</h3><p>{source.municipalityName} · {source.typeColor} · {source.latitude.toFixed(7)}, {source.longitude.toFixed(7)}</p></div><div className="prov-water__record-meta"><strong>Qty. {source.quantity}</strong><span>View on map →</span></div></Link>)}</div>}</section>
      </div>}
    </main>
  </>;
}
