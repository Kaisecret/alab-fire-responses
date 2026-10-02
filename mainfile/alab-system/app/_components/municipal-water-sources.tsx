"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { municipalTabFetch as fetch } from "../../lib/auth/municipal-tab-fetch";
import type { MunicipalWaterSourceRegistry, WaterSource } from "../../lib/water-sources/types";
import { MunicipalStatCards } from "./municipal-stat-cards";

function DialogField({ id, label, icon, wide, children }: { id: string; label: string; icon: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`water-dialog__field${wide ? " water-dialog__field--wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <span className="water-dialog__control"><i className={`fa-solid ${icon}`} aria-hidden="true" />{children}</span>
    </div>
  );
}

const styles = `
  .water-registry { padding: 1.5rem clamp(1rem, 2vw, 2rem) 3rem; color: #172033; font-family: 'Plus Jakarta Sans', sans-serif; }
  .water-registry * { box-sizing: border-box; }
  .water-registry__header { display:flex; justify-content:space-between; gap:1rem; align-items:center; margin-bottom:1.25rem; }
  .water-registry__eyebrow { color:#b42318; font-size:.72rem; font-weight:800; letter-spacing:.11em; text-transform:uppercase; margin:0 0 .45rem; }
  .water-registry h1 { display:flex; align-items:center; gap:.65rem; margin:0; font-size:1.65rem; font-weight:800; letter-spacing:-.035em; }
  .water-registry h1 i { color:#dc2626; }
  .water-registry__button { min-height:44px; border:0; border-radius:8px; background:linear-gradient(135deg,#D00F09 0%,#EF5350 100%); color:#fff; padding:.6rem 1.25rem; font:inherit; font-size:.85rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:.55rem; justify-content:center; box-shadow:0 4px 14px rgba(208,15,9,.28); transition:transform .2s,box-shadow .2s; }
  .water-registry__button:hover:not(:disabled) { transform:translateY(-1.5px); box-shadow:0 6px 18px rgba(208,15,9,.38); }
  .water-registry__button:active:not(:disabled) { transform:translateY(0); }
  .water-registry__button:focus-visible, .water-registry a:focus-visible, .water-registry input:focus-visible, .water-registry select:focus-visible { outline:3px solid rgba(37,99,235,.35); outline-offset:2px; }
  .water-registry__button:disabled { opacity:.6; cursor:wait; }
  .water-registry__toolbar { display:flex; align-items:center; justify-content:space-between; gap:.75rem; margin:1.15rem 0; }
  .water-registry__search { min-height:44px; width:min(410px,100%); border:1px solid #d0d5dd; border-radius:9px; padding:.7rem .85rem; font:inherit; color:#172033; background:#fff; }
  .water-registry__count { color:#667085; font-size:.8rem; font-weight:700; white-space:nowrap; }
  .water-registry__grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(285px,1fr)); gap:.75rem; }
  .water-registry__card { appearance:none; width:100%; padding:0; text-align:left; font:inherit; cursor:pointer; display:flex; flex-direction:column; min-height:230px; color:inherit; text-decoration:none; background:#fff; border:1px solid #e4e7ec; border-radius:12px; overflow:hidden; transition:border-color .18s, transform .18s, box-shadow .18s; }
  .water-registry__card-main { display:flex; flex:1; flex-direction:column; color:inherit; text-decoration:none; }
  .water-registry__card-main:focus-visible { outline:3px solid rgba(37,99,235,.35); outline-offset:-3px; }
  .water-registry__edit { min-height:44px; width:100%; border:0; border-top:1px solid #f0f1f3; background:#fff; color:#0f766e; font:inherit; font-size:.73rem; font-weight:800; cursor:pointer; }
  .water-registry__edit:hover { background:#f0fdfa; }
  .water-registry__card:hover { border-color:#84c7c3; transform:translateY(-2px); box-shadow:0 10px 28px rgba(15,23,42,.08); }
  .water-registry__card-head { display:flex; align-items:center; gap:.75rem; padding:1rem; background:#0f766e; color:#fff; }
  .water-registry__icon { width:38px; height:38px; flex:0 0 38px; display:grid; place-items:center; border-radius:9px; background:rgba(255,255,255,.15); }
  .water-registry__card-title { margin:0; font-size:.88rem; font-weight:800; line-height:1.35; }
  .water-registry__kind { margin:.15rem 0 0; font-size:.7rem; opacity:.82; }
  .water-registry__card-body { display:grid; gap:.62rem; padding:1rem; flex:1; }
  .water-registry__row { display:flex; justify-content:space-between; gap:1rem; font-size:.76rem; }
  .water-registry__row span { color:#667085; }
  .water-registry__row strong { text-align:right; font-weight:750; }
  .water-registry__origin { display:inline-flex; width:max-content; border-radius:999px; background:#f2f4f7; color:#475467; padding:.28rem .52rem; font-size:.66rem; font-weight:750; }
  .water-registry__map-cue { margin-top:auto; padding:.72rem 1rem; border-top:1px solid #f0f1f3; color:#0f766e; font-size:.73rem; font-weight:800; }
  .water-registry__state { padding:3rem 1rem; text-align:center; color:#667085; background:#fff; border:1px dashed #d0d5dd; border-radius:12px; }
  .water-dialog-backdrop { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:1rem; background:rgba(15,23,42,.62); backdrop-filter:blur(3px); }
  .water-dialog { width:min(600px,100%); max-height:calc(100vh - 2rem); overflow:auto; color:#172033; font-family:'Plus Jakarta Sans', sans-serif; background:#fff; border-radius:18px; box-shadow:0 30px 80px -24px rgba(15,23,42,.55); }
  .water-dialog * { box-sizing:border-box; }
  .water-dialog__head { display:flex; align-items:center; gap:.85rem; padding:1.1rem 1.25rem; border-bottom:1px solid #e4e7ec; background:linear-gradient(120deg,#f0fdfa 0%,#ffffff 70%); }
  .water-dialog__head > div { flex:1 1 auto; min-width:0; }
  .water-dialog__head h2 { margin:0; font-size:1.05rem; font-weight:800; letter-spacing:-.01em; }
  .water-dialog__head p { margin:.2rem 0 0; color:#667085; font-size:.76rem; }
  .water-dialog__head .water-registry__eyebrow { margin:0 0 .15rem; color:#0f766e; font-size:.64rem; }
  .water-dialog__badge { flex:0 0 auto; display:grid; width:46px; height:46px; place-items:center; border-radius:13px; background:linear-gradient(135deg,#14b8a6,#0f766e); color:#fff; font-size:1.1rem; box-shadow:0 10px 20px -10px rgba(15,118,110,.85); }
  .water-dialog__close { flex:0 0 auto; display:grid; width:40px; height:40px; place-items:center; border:0; border-radius:10px; background:#f2f4f7; color:#344054; cursor:pointer; transition:background .15s; }
  .water-dialog__close:hover:not(:disabled) { background:#e4e7ec; }
  .water-dialog form { padding:1.1rem 1.25rem 0; }
  .water-dialog__grid { display:grid; grid-template-columns:1fr 1fr; gap:.85rem; }
  .water-dialog__section { grid-column:1 / -1; display:flex; align-items:center; gap:.6rem; color:#667085; font-size:.64rem; font-weight:800; letter-spacing:.07em; text-transform:uppercase; }
  .water-dialog__section::after { content:""; flex:1; height:1px; background:#eaecf0; }
  .water-dialog__section:not(:first-child) { margin-top:.35rem; }
  .water-dialog__field { display:grid; align-content:start; gap:.38rem; min-width:0; }
  .water-dialog__field--wide { grid-column:1 / -1; }
  .water-dialog label { color:#344054; font-size:.74rem; font-weight:750; }
  .water-dialog__control { position:relative; display:block; }
  .water-dialog__control > i { position:absolute; top:50%; left:.85rem; width:1rem; transform:translateY(-50%); color:#0f766e; font-size:.82rem; text-align:center; pointer-events:none; }
  .water-dialog input, .water-dialog select { display:block; width:100%; height:44px; margin:0; border:1px solid #d0d5dd; border-radius:10px; padding:0 .85rem 0 2.45rem; background-color:#fff; color:#172033; font:inherit; font-size:.85rem; transition:border-color .15s, box-shadow .15s; }
  .water-dialog select { appearance:none; padding-right:2.2rem; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%23667085' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right .85rem center; background-size:12px 8px; cursor:pointer; }
  .water-dialog input::placeholder { color:#98a2b3; }
  .water-dialog input:hover, .water-dialog select:hover { border-color:#98a2b3; }
  .water-dialog input:focus, .water-dialog select:focus { outline:none; border-color:#14b8a6; box-shadow:0 0 0 4px rgba(20,184,166,.16); }
  .water-dialog__error { display:flex; align-items:center; gap:.5rem; margin:.9rem 0 0; padding:.65rem .8rem; border:1px solid #fecdca; border-radius:10px; background:#fef3f2; color:#b42318; font-size:.78rem; font-weight:700; }
  .water-dialog__actions { position:sticky; bottom:0; display:flex; justify-content:flex-end; gap:.6rem; margin:1.15rem -1.25rem 0; padding:.9rem 1.25rem; border-top:1px solid #eef2f6; background:#f8fafc; }
  .water-dialog__secondary { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; min-height:44px; border:1px solid #d0d5dd; border-radius:9px; background:#fff; padding:.6rem 1rem; color:#344054; font:inherit; font-size:.85rem; font-weight:750; cursor:pointer; transition:background .15s; }
  .water-dialog__secondary:hover:not(:disabled) { background:#f2f4f7; }
  .water-dialog__summary { display:grid; grid-template-columns:1fr 1fr; gap:.65rem; padding:1rem 1.25rem 0; }
  .water-dialog__fact { display:flex; align-items:flex-start; gap:.6rem; min-width:0; padding:.7rem .75rem; border:1px solid #e4e7ec; border-radius:12px; background:#f8fafc; }
  .water-dialog__fact > i { flex:0 0 auto; display:grid; width:30px; height:30px; place-items:center; border-radius:9px; background:#ccfbf1; color:#0f766e; font-size:.78rem; }
  .water-dialog__fact > div { min-width:0; }
  .water-dialog__fact span { display:block; margin-bottom:.15rem; color:#667085; font-size:.64rem; font-weight:800; letter-spacing:.05em; text-transform:uppercase; }
  .water-dialog__fact strong { display:block; font-size:.78rem; line-height:1.4; word-break:break-word; font-variant-numeric:tabular-nums; }
  .water-dialog__map { color:#0f766e; text-decoration:none; }
  @media (max-width:760px) { .water-registry__header { flex-direction:column; } .water-registry__header .water-registry__button { width:100%; } .water-registry__toolbar { align-items:stretch; flex-direction:column; } }
  @media (max-width:520px) {
    .water-dialog-backdrop { align-items:end; padding:0; }
    .water-dialog { width:100%; max-height:92vh; border-radius:18px 18px 0 0; }
    .water-dialog__grid, .water-dialog__summary { grid-template-columns:1fr; }
    .water-dialog__field--wide { grid-column:auto; }
    .water-dialog__actions { flex-direction:column-reverse; }
    .water-dialog__actions > * { width:100%; justify-content:center; }
  }
  @media (prefers-reduced-motion:reduce) { .water-registry__card, .water-registry__button { transition:none; } .water-registry__button:hover:not(:disabled) { transform:none; } }
`;

const emptyForm = { sourceKind: "FIRE_HYDRANT", quantity: "1", exactLocation: "", latitude: "", longitude: "", typeColor: "Wet barrel" };
function labelFor(source: WaterSource) { return source.sourceKind === "FIRE_HYDRANT" ? "Fire hydrant" : "Water source"; }

export function MunicipalWaterSources() {
  const [registry, setRegistry] = useState<MunicipalWaterSourceRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedSource, setSelectedSource] = useState<WaterSource | null>(null);
  const [editForm, setEditForm] = useState({ exactLocation: "", quantity: "1", typeColor: "" });
  const [editError, setEditError] = useState("");
  const [updating, setUpdating] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/municipal-bfp/water-sources", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Unable to load water sources."); return response.json(); })
      .then((data: MunicipalWaterSourceRegistry) => { setRegistry(data); setLoadError(""); })
      .catch((error) => { if (error?.name !== "AbortError") setLoadError(error instanceof Error ? error.message : "Unable to load water sources."); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedSource) return;

    const page = document.querySelector<HTMLElement>("main.water-registry");
    const dialog = document.querySelector<HTMLElement>('[aria-labelledby="water-edit-title"]');
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

  const sources = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return registry?.sources ?? [];
    return (registry?.sources ?? []).filter((source) => `${source.exactLocation} ${source.typeColor} ${labelFor(source)}`.toLowerCase().includes(value));
  }, [query, registry]);

  async function retryLoad() {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/municipal-bfp/water-sources", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load water sources.");
      setRegistry(await response.json());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load water sources.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setFormError("");
    try {
      const response = await fetch("/api/municipal-bfp/water-sources", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, quantity: Number(form.quantity), latitude: Number(form.latitude), longitude: Number(form.longitude) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to add the water source.");
      setRegistry((current) => current ? { ...current, sources: [...current.sources, result.source], summary: { ...current.summary, sourceCount: current.summary.sourceCount + 1, totalQuantity: current.summary.totalQuantity + result.source.quantity, fireHydrantCount: current.summary.fireHydrantCount + (result.source.sourceKind === "FIRE_HYDRANT" ? 1 : 0), waterSourceCount: current.summary.waterSourceCount + (result.source.sourceKind === "WATER_SOURCE" ? 1 : 0), manualCount: current.summary.manualCount + 1 } } : current);
      setForm(emptyForm); setOpen(false);
    } catch (error) { setFormError(error instanceof Error ? error.message : "Unable to add the water source."); }
    finally { setSaving(false); }
  }

  function openDetails(source: WaterSource) {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedSource(source);
    setEditForm({ exactLocation: source.exactLocation, quantity: String(source.quantity), typeColor: source.typeColor });
    setEditError("");
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSource) return;
    setUpdating(true);
    setEditError("");
    try {
      const response = await fetch("/api/municipal-bfp/water-sources", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selectedSource.id, exactLocation: editForm.exactLocation, quantity: Number(editForm.quantity), typeColor: editForm.typeColor }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update the water source.");
      const updated = result.source as WaterSource;
      setRegistry((current) => current ? {
        ...current,
        sources: current.sources.map((source) => source.id === updated.id ? updated : source),
        summary: { ...current.summary, totalQuantity: current.summary.totalQuantity - selectedSource.quantity + updated.quantity },
      } : current);
      setSelectedSource(updated);
      setEditForm({ exactLocation: updated.exactLocation, quantity: String(updated.quantity), typeColor: updated.typeColor });
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Unable to update the water source.");
    } finally {
      setUpdating(false);
    }
  }

  return <>
    <style>{styles}</style>
    <main className="water-registry">
      <header className="water-registry__header"><h1><i className="fa-solid fa-droplet" aria-hidden="true" />Water Sources</h1><button className="water-registry__button" type="button" onClick={() => setOpen(true)}><i className="fa-solid fa-plus" aria-hidden="true" /> Add fire hydrant or water source</button></header>
      <MunicipalStatCards label="Water source totals" items={[
        { key: "locations", icon: "fa-location-dot", tone: "blue", value: registry?.summary.sourceCount ?? 0, label: "Locations", badge: "Mapped", description: "Recorded water access points", loading },
        { key: "hydrants", icon: "fa-fire-extinguisher", tone: "red", value: registry?.summary.fireHydrantCount ?? 0, label: "Fire hydrants", badge: "Hydrants", description: "Municipal fire hydrant records", loading },
        { key: "other", icon: "fa-droplet", tone: "violet", value: registry?.summary.waterSourceCount ?? 0, label: "Other sources", badge: "Water", description: "Other recorded water sources", loading },
        { key: "units", icon: "fa-layer-group", tone: "emerald", value: registry?.summary.totalQuantity ?? 0, label: "Total units", badge: "Total", description: "Units across all recorded locations", loading },
      ]} />
      <div className="water-registry__toolbar"><input className="water-registry__search" aria-label="Search water sources" placeholder="Search location, type, or color" value={query} onChange={(event) => setQuery(event.target.value)} /><span className="water-registry__count">Showing {sources.length} location{sources.length === 1 ? "" : "s"}</span></div>
      {loading ? <div className="water-registry__state">Loading municipal water sources…</div> : loadError ? <div className="water-registry__state"><p>{loadError}</p><button className="water-registry__button" type="button" onClick={() => void retryLoad()}>Retry</button></div> : sources.length === 0 ? <div className="water-registry__state">No matching water sources were found.</div> : <section className="water-registry__grid" aria-label="Municipal water sources">{sources.map((source) => <div className="water-registry__card" key={source.id}><Link className="water-registry__card-main" href={`/municipal-bfp/gis-map?layer=water-sources&waterSource=${source.id}`} aria-label={`View ${source.exactLocation} on map`}><div className="water-registry__card-head"><span className="water-registry__icon"><i className={source.sourceKind === "FIRE_HYDRANT" ? "fa-solid fa-fire-extinguisher" : "fa-solid fa-droplet"} /></span><div><p className="water-registry__card-title">{source.exactLocation}</p><p className="water-registry__kind">{labelFor(source)}</p></div></div><div className="water-registry__card-body"><div className="water-registry__row"><span>Type / color</span><strong>{source.typeColor}</strong></div><div className="water-registry__row"><span>Quantity</span><strong>{source.quantity}</strong></div><div className="water-registry__row"><span>Coordinates</span><strong>{source.latitude.toFixed(7)}, {source.longitude.toFixed(7)}</strong></div><span className="water-registry__origin">{source.recordOrigin === "BFP_LOCATOR_CHART_2018" ? "BFP locator chart · 2018" : "Municipal entry"}</span></div><span className="water-registry__map-cue"><i className="fa-solid fa-map-location-dot" /> Go to map</span></Link><button type="button" className="water-registry__edit" onClick={() => openDetails(source)} aria-label={`Edit ${source.exactLocation}`}><i className="fa-solid fa-pen-to-square" /> Edit water source</button></div>)}</section>}
    </main>
    {open && createPortal(
      <div className="water-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
        <section className="water-dialog" role="dialog" aria-modal="true" aria-labelledby="water-dialog-title">
          <header className="water-dialog__head">
            <span className="water-dialog__badge" aria-hidden="true"><i className="fa-solid fa-droplet" /></span>
            <div><h2 id="water-dialog-title">Add a mapped water source</h2><p>The signed-in municipality is assigned automatically.</p></div>
            <button className="water-dialog__close" type="button" aria-label="Close" onClick={() => setOpen(false)} disabled={saving}><i className="fa-solid fa-xmark" /></button>
          </header>
          <form onSubmit={submit}>
            <div className="water-dialog__grid">
              <p className="water-dialog__section">Source</p>
              <DialogField id="water-kind" label="Source category" icon={form.sourceKind === "FIRE_HYDRANT" ? "fa-fire-extinguisher" : "fa-water"}>
                <select id="water-kind" value={form.sourceKind} onChange={(event) => setForm({ ...form, sourceKind: event.target.value })}><option value="FIRE_HYDRANT">Fire hydrant</option><option value="WATER_SOURCE">Other water source</option></select>
              </DialogField>
              <DialogField id="water-quantity" label="Quantity" icon="fa-hashtag">
                <input id="water-quantity" type="number" min="1" max="999" required value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
              </DialogField>
              <DialogField id="water-type-color" label="Type and color" icon="fa-palette" wide>
                <input id="water-type-color" required maxLength={120} placeholder="Example: Wet barrel / Red" value={form.typeColor} onChange={(event) => setForm({ ...form, typeColor: event.target.value })} />
              </DialogField>
              <p className="water-dialog__section">Location</p>
              <DialogField id="water-location" label="Exact location / address" icon="fa-location-dot" wide>
                <input id="water-location" required maxLength={500} placeholder="Street, barangay or landmark" value={form.exactLocation} onChange={(event) => setForm({ ...form, exactLocation: event.target.value })} />
              </DialogField>
              <DialogField id="water-latitude" label="Latitude" icon="fa-arrows-up-down">
                <input id="water-latitude" type="number" step="0.0000001" min="4" max="22" required placeholder="10.7445" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} />
              </DialogField>
              <DialogField id="water-longitude" label="Longitude" icon="fa-arrows-left-right">
                <input id="water-longitude" type="number" step="0.0000001" min="116" max="127" required placeholder="121.9412" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} />
              </DialogField>
            </div>
            {formError && <p className="water-dialog__error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{formError}</p>}
            <div className="water-dialog__actions">
              <button className="water-dialog__secondary" type="button" onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
              <button className="water-registry__button" type="submit" disabled={saving}><i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} aria-hidden="true" />{saving ? "Saving…" : "Save water source"}</button>
            </div>
          </form>
        </section>
      </div>,
      document.body,
    )}
    {selectedSource && createPortal(
      <div className="water-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !updating) setSelectedSource(null); }}>
        <section className="water-dialog" role="dialog" aria-modal="true" aria-labelledby="water-edit-title">
          <header className="water-dialog__head">
            <span className="water-dialog__badge" aria-hidden="true"><i className={`fa-solid ${selectedSource.sourceKind === "FIRE_HYDRANT" ? "fa-fire-extinguisher" : "fa-water"}`} /></span>
            <div><p className="water-registry__eyebrow">{labelFor(selectedSource)}</p><h2 id="water-edit-title">Water-source details</h2><p>Coordinates are controlled by Provincial BFP.</p></div>
            <button className="water-dialog__close" type="button" aria-label="Close details" onClick={() => setSelectedSource(null)} disabled={updating}><i className="fa-solid fa-xmark" /></button>
          </header>
          <div className="water-dialog__summary">
            <div className="water-dialog__fact"><i className="fa-solid fa-crosshairs" aria-hidden="true" /><div><span>Coordinates</span><strong>{selectedSource.latitude.toFixed(7)}, {selectedSource.longitude.toFixed(7)}</strong></div></div>
            <div className="water-dialog__fact"><i className="fa-solid fa-file-lines" aria-hidden="true" /><div><span>Record source</span><strong>{selectedSource.recordOrigin === "BFP_LOCATOR_CHART_2018" ? "BFP locator chart · 2018" : "Municipal entry"}</strong></div></div>
          </div>
          <form onSubmit={submitEdit}>
            <div className="water-dialog__grid">
              <DialogField id="edit-water-location" label="Exact location / name" icon="fa-location-dot" wide>
                <input id="edit-water-location" required maxLength={500} value={editForm.exactLocation} onChange={(event) => setEditForm({ ...editForm, exactLocation: event.target.value })} />
              </DialogField>
              <DialogField id="edit-water-type-color" label="Type / color" icon="fa-palette">
                <input id="edit-water-type-color" required maxLength={120} placeholder="Example: Wet Barrel / Red" value={editForm.typeColor} onChange={(event) => setEditForm({ ...editForm, typeColor: event.target.value })} />
              </DialogField>
              <DialogField id="edit-water-quantity" label="Quantity" icon="fa-hashtag">
                <input id="edit-water-quantity" type="number" min="1" max="999" required value={editForm.quantity} onChange={(event) => setEditForm({ ...editForm, quantity: event.target.value })} />
              </DialogField>
            </div>
            {editError && <p className="water-dialog__error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{editError}</p>}
            <div className="water-dialog__actions">
              <Link className="water-dialog__secondary water-dialog__map" href={`/municipal-bfp/gis-map?layer=water-sources&waterSource=${selectedSource.id}`}><i className="fa-solid fa-location-dot" aria-hidden="true" /> View on map</Link>
              <button className="water-registry__button" type="submit" disabled={updating}><i className={`fa-solid ${updating ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} aria-hidden="true" />{updating ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </section>
      </div>,
      document.body,
    )}
  </>;
}
