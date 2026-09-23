"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import type { ProvincialWaterSourceRegistry, WaterSource } from "../../lib/water-sources/types";

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
  .prov-water__record { appearance:none; width:100%; cursor:pointer; text-align:left; font:inherit; background:#fff; display:grid; grid-template-columns:42px 1fr auto; gap:.75rem; align-items:center; color:inherit; text-decoration:none; padding:.85rem; border:1px solid #e4e7ec; border-radius:9px; transition:border-color .18s,background .18s; }
  .prov-water__record:hover { border-color:#84c7c3; background:#f8fffe; }
  .prov-water__record-icon { width:42px; height:42px; display:grid; place-items:center; border-radius:8px; background:#e8f7f5; color:#0f766e; }
  .prov-water__record h3 { margin:0; font-size:.78rem; line-height:1.4; }
  .prov-water__record p { margin:.25rem 0 0; color:#667085; font-size:.68rem; }
  .prov-water__record-meta { text-align:right; }
  .prov-water__record-meta strong { display:block; font-size:.7rem; }
  .prov-water__record-meta span { color:#0f766e; font-size:.66rem; font-weight:800; }
  .prov-water__empty { padding:3rem 1rem; text-align:center; color:#667085; font-size:.82rem; }
  .prov-water__backdrop { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:1rem; background:rgba(15,23,42,.62); }
  .prov-water__dialog { width:min(620px,100%); max-height:calc(100vh - 2rem); overflow:auto; border:1px solid #e4e7ec; border-radius:14px; background:#fff; box-shadow:0 28px 90px rgba(15,23,42,.3); }
  .prov-water__dialog-head { display:flex; justify-content:space-between; gap:1rem; padding:1.2rem 1.25rem; border-bottom:1px solid #e4e7ec; }
  .prov-water__dialog-head h2 { margin:.2rem 0 0; font-size:1.05rem; line-height:1.4; }
  .prov-water__dialog-head p { margin:0; color:#0f766e; font-size:.7rem; font-weight:850; letter-spacing:.08em; text-transform:uppercase; }
  .prov-water__close { width:44px; height:44px; flex:0 0 44px; border:0; border-radius:9px; background:#f2f4f7; color:#344054; cursor:pointer; }
  .prov-water__facts { display:grid; grid-template-columns:repeat(3,1fr); gap:.65rem; padding:1rem 1.25rem; border-bottom:1px solid #e4e7ec; }
  .prov-water__fact { padding:.75rem; border-radius:9px; background:#f8fafc; }
  .prov-water__fact span { display:block; margin-bottom:.25rem; color:#667085; font-size:.66rem; font-weight:700; }
  .prov-water__fact strong { display:block; font-size:.76rem; line-height:1.4; word-break:break-word; }
  .prov-water__dialog form { padding:1.2rem 1.25rem; }
  .prov-water__form-grid { display:grid; grid-template-columns:1fr 1fr; gap:.85rem; }
  .prov-water__field { display:grid; gap:.35rem; }
  .prov-water__field label { color:#344054; font-size:.73rem; font-weight:800; }
  .prov-water__field input { min-height:44px; border:1px solid #d0d5dd; border-radius:8px; padding:.65rem .75rem; font:inherit; font-size:.82rem; }
  .prov-water__help { margin:.75rem 0 0; color:#667085; font-size:.72rem; line-height:1.5; }
  .prov-water__error { margin:.75rem 0 0; color:#b42318; font-size:.76rem; font-weight:750; }
  .prov-water__actions { display:flex; justify-content:flex-end; gap:.6rem; margin-top:1rem; }
  .prov-water__action { min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:.45rem; border:1px solid #d0d5dd; border-radius:9px; padding:.65rem 1rem; background:#fff; color:#344054; text-decoration:none; font:inherit; font-size:.78rem; font-weight:800; cursor:pointer; }
  .prov-water__action--primary { border-color:#0f766e; background:#0f766e; color:#fff; }
  .prov-water__action:disabled { opacity:.6; cursor:wait; }
  @media(max-width:900px){ .prov-water__layout{grid-template-columns:1fr;} .prov-water__municipalities{max-height:340px;} }
  @media(max-width:600px){ .prov-water__header{flex-direction:column;} .prov-water__summary{grid-template-columns:1fr;} .prov-water__summary div{border-right:0;border-bottom:1px solid #e4e7ec;} .prov-water__summary div:last-child{border-bottom:0;} .prov-water__panel-head{align-items:flex-start;flex-direction:column;} .prov-water__search{width:100%;} .prov-water__record{grid-template-columns:38px 1fr;} .prov-water__record-meta{grid-column:2;text-align:left;} .prov-water__facts,.prov-water__form-grid{grid-template-columns:1fr;} .prov-water__actions{flex-direction:column-reverse;} .prov-water__action{width:100%;} }
`;

export function ProvincialWaterSources() {
  const [registry, setRegistry] = useState<ProvincialWaterSourceRegistry | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState("ALL");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [selectedSource, setSelectedSource] = useState<WaterSource | null>(null);
  const [coordinateForm, setCoordinateForm] = useState({ latitude: "", longitude: "" });
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/provincial-bfp/water-sources", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Unable to load the provincial registry."); return response.json(); })
      .then((data: ProvincialWaterSourceRegistry) => { setRegistry(data); })
      .catch((reason) => { if (reason?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Unable to load the provincial registry."); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedSource) return;

    const page = document.querySelector<HTMLElement>("main.prov-water");
    const dialog = document.querySelector<HTMLElement>('[aria-labelledby="prov-water-edit-title"]');
    dialogRef.current = dialog;
    page?.setAttribute("inert", "");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusFirst = window.requestAnimationFrame(() => {
      dialog?.querySelector<HTMLElement>(focusableSelector)?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedSource(null);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFirst);
      document.removeEventListener("keydown", handleKeyDown);
      page?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
      dialogRef.current = null;
      openerRef.current?.focus();
    };
  }, [selectedSource]);

  const totalLocations = registry?.municipalities.reduce((sum, item) => sum + item.sourceCount, 0) ?? 0;
  const totalHydrants = registry?.municipalities.reduce((sum, item) => sum + item.fireHydrantCount, 0) ?? 0;
  const selected = registry?.municipalities.find((item) => item.municipalityId === selectedMunicipality);
  const allSelected = selectedMunicipality === "ALL";
  const records = useMemo(() => {
    const value = query.trim().toLowerCase();
    return (registry?.sources ?? []).filter((source) => (selectedMunicipality === "ALL" || source.municipalityId === selectedMunicipality) && (!value || `${source.exactLocation} ${source.typeColor} ${source.municipalityName}`.toLowerCase().includes(value)));
  }, [query, registry, selectedMunicipality]);

  function openDetails(source: WaterSource) {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedSource(source);
    setCoordinateForm({ latitude: source.latitude.toFixed(7), longitude: source.longitude.toFixed(7) });
    setEditError("");
  }

  async function submitCoordinates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSource) return;
    setSaving(true);
    setEditError("");
    try {
      const response = await fetch("/api/provincial-bfp/water-sources", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selectedSource.id, latitude: Number(coordinateForm.latitude), longitude: Number(coordinateForm.longitude) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update the coordinates.");
      const updated = result.source as WaterSource;
      setRegistry((current) => current ? { ...current, sources: current.sources.map((source) => source.id === updated.id ? updated : source) } : current);
      setSelectedSource(updated);
      setCoordinateForm({ latitude: updated.latitude.toFixed(7), longitude: updated.longitude.toFixed(7) });
    } catch (reason) {
      setEditError(reason instanceof Error ? reason.message : "Unable to update the coordinates.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <style>{styles}</style>
    <main className="prov-water">
      <header className="prov-water__header"><div><p className="prov-water__eyebrow">Antique provincial overview</p><h1>Water sources by municipality</h1><p className="prov-water__subtitle">A municipality-level view of 148 records from the BFP locator chart, with exact coordinates, source type, color, and locally added records.</p></div><span className="prov-water__badge"><i className="fa-solid fa-file-shield" /> BFP source register</span></header>
      <section className="prov-water__summary" aria-label="Provincial totals"><div><strong>{registry?.municipalities.length ?? 0}</strong><span>Municipalities</span></div><div><strong>{totalLocations}</strong><span>Mapped locations</span></div><div><strong>{totalHydrants}</strong><span>Fire hydrants</span></div></section>
      {error ? <div className="prov-water__panel prov-water__empty">{error}</div> : !registry ? <div className="prov-water__panel prov-water__empty">Loading the province-wide registry…</div> : <div className="prov-water__layout">
        <section className="prov-water__panel"><header className="prov-water__panel-head"><h2>Municipal registry</h2><span>Select a municipality</span></header><div className="prov-water__municipalities"><button type="button" className={`prov-water__municipality ${allSelected ? "is-active" : ""}`} aria-pressed={allSelected} onClick={() => { setSelectedMunicipality("ALL"); setQuery(""); }}><strong>All municipalities</strong><span>Province-wide water-source registry</span><b>{totalLocations}</b></button>{registry.municipalities.map((municipality) => <button type="button" key={municipality.municipalityId} className={`prov-water__municipality ${municipality.municipalityId === selectedMunicipality ? "is-active" : ""}`} aria-pressed={municipality.municipalityId === selectedMunicipality} onClick={() => { setSelectedMunicipality(municipality.municipalityId); setQuery(""); }}><strong>{municipality.municipalityName}</strong><span>{municipality.fireHydrantCount} hydrants · {municipality.waterSourceCount} other sources</span><b>{municipality.sourceCount}</b></button>)}</div></section>
        <section className="prov-water__panel prov-water__detail"><header className="prov-water__panel-head"><div><h2>{allSelected ? "All municipalities" : selected?.municipalityName || "Municipality"}</h2><span>{allSelected ? totalLocations : selected?.sourceCount ?? 0} mapped locations</span></div><input className="prov-water__search" aria-label="Search selected municipality" placeholder="Search location or type" value={query} onChange={(event) => setQuery(event.target.value)} /></header>{records.length === 0 ? <div className="prov-water__empty">No water-source records found for this municipality.</div> : <div className="prov-water__records">{records.map((source) => <button type="button" key={source.id} className="prov-water__record" onClick={() => openDetails(source)} aria-label={`Open details for ${source.exactLocation}`}><span className="prov-water__record-icon"><i className={source.sourceKind === "FIRE_HYDRANT" ? "fa-solid fa-fire-extinguisher" : "fa-solid fa-droplet"} /></span><div><h3>{source.exactLocation}</h3><p>{source.municipalityName} · {source.typeColor} · {source.latitude.toFixed(7)}, {source.longitude.toFixed(7)}</p></div><div className="prov-water__record-meta"><strong>Qty. {source.quantity}</strong><span>Edit coordinates →</span></div></button>)}</div>}</section>
      </div>}
    </main>
    {selectedSource && <div className="prov-water__backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSelectedSource(null); }}><section className="prov-water__dialog" role="dialog" aria-modal="true" aria-labelledby="prov-water-edit-title"><header className="prov-water__dialog-head"><div><p>{selectedSource.sourceKind === "FIRE_HYDRANT" ? "Fire hydrant" : "Water source"} · {selectedSource.municipalityName}</p><h2 id="prov-water-edit-title">{selectedSource.exactLocation}</h2></div><button className="prov-water__close" type="button" aria-label="Close details" onClick={() => setSelectedSource(null)} disabled={saving}><i className="fa-solid fa-xmark" /></button></header><div className="prov-water__facts"><div className="prov-water__fact"><span>Type / color</span><strong>{selectedSource.typeColor}</strong></div><div className="prov-water__fact"><span>Quantity</span><strong>{selectedSource.quantity}</strong></div><div className="prov-water__fact"><span>Record source</span><strong>{selectedSource.recordOrigin === "BFP_LOCATOR_CHART_2018" ? "BFP chart · 2018" : "Municipal entry"}</strong></div></div><form onSubmit={submitCoordinates}><div className="prov-water__form-grid"><div className="prov-water__field"><label htmlFor="prov-water-latitude">Latitude</label><input id="prov-water-latitude" type="number" step="0.0000001" min="4" max="22" required value={coordinateForm.latitude} onChange={(event) => setCoordinateForm({ ...coordinateForm, latitude: event.target.value })} /></div><div className="prov-water__field"><label htmlFor="prov-water-longitude">Longitude</label><input id="prov-water-longitude" type="number" step="0.0000001" min="116" max="127" required value={coordinateForm.longitude} onChange={(event) => setCoordinateForm({ ...coordinateForm, longitude: event.target.value })} /></div></div><p className="prov-water__help">Edit coordinates only when the mapped point has been verified. Municipal users continue to control the location name and quantity.</p>{editError && <p className="prov-water__error" role="alert">{editError}</p>}<div className="prov-water__actions"><Link className="prov-water__action" href={`/provincial-bfp/gis-map?municipalityId=${selectedSource.municipalityId}&waterSource=${selectedSource.id}`}><i className="fa-solid fa-location-dot" /> View on map</Link><button className="prov-water__action prov-water__action--primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save coordinates"}</button></div></form></section></div>}
  </>;
}
