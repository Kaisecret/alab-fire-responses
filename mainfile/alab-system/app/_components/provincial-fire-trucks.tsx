"use client";

import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import { formatGallons } from "../../lib/fire-trucks/presentation";
import type { FireTruck, ProvincialFireTruckRegistry } from "../../lib/fire-trucks/types";
import { FireTruckCard, fireTruckCardStyles } from "./fire-truck-card";
import { FireTruckDetailsDialog, fireTruckDialogStyles } from "./fire-truck-details-dialog";
import { useDialogFocus } from "./use-dialog-focus";

const styles = `
  .prov-trucks { padding:1.5rem clamp(1rem,2vw,2rem) 3rem; color:#172033; font-family:'Plus Jakarta Sans',sans-serif; }
  .prov-trucks * { box-sizing:border-box; }
  .prov-trucks__top-row { display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:1.25rem; flex-wrap:wrap; }
  .prov-trucks__button { min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:.5rem; padding:.7rem 1.15rem; border:0; border-radius:9px; background:#b42318; color:#fff; font:inherit; font-size:.82rem; font-weight:800; cursor:pointer; white-space:nowrap; box-shadow:0 2px 8px rgba(180,35,24,.2); transition:background .15s, transform .15s; }
  .prov-trucks__button:hover { background:#912018; transform:translateY(-1px); }
  .prov-trucks__button:disabled { opacity:.6; cursor:wait; transform:none; }
  /* ========== 4 PASTEL KPI METRIC CARDS (DASHBOARD STYLE) ========== */
  .pbfp-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
  .pbfp-kpi-box {
    position: relative;
    border-radius: 14px;
    padding: 1rem 1.15rem 0.85rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    min-height: 128px;
  }
  .pbfp-kpi-box.red {
    background: linear-gradient(145deg, #FFE8E8 0%, #FFD6D6 100%);
    border: 1.5px solid #FFBEBE;
    box-shadow: 0 4px 16px rgba(226, 54, 50, 0.06);
  }
  .pbfp-kpi-box.amber {
    background: linear-gradient(145deg, #FFF5DE 0%, #FFE8BA 100%);
    border: 1.5px solid #FFDC99;
    box-shadow: 0 4px 16px rgba(217, 119, 6, 0.06);
  }
  .pbfp-kpi-box.blue {
    background: linear-gradient(145deg, #E6EFFF 0%, #D2E3FD 100%);
    border: 1.5px solid #B8D3FD;
    box-shadow: 0 4px 16px rgba(37, 99, 235, 0.06);
  }
  .pbfp-kpi-box.purple {
    background: linear-gradient(145deg, #F0E8FF 0%, #E2D3FD 100%);
    border: 1.5px solid #D0BCFD;
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.06);
  }
  .pbfp-kpi-box:hover { transform: translateY(-3px); }
  .pbfp-kpi-box.red:hover { border-color: #FFA3A3; box-shadow: 0 10px 22px -4px rgba(226, 54, 50, 0.2); }
  .pbfp-kpi-box.amber:hover { border-color: #FFCF70; box-shadow: 0 10px 22px -4px rgba(217, 119, 6, 0.2); }
  .pbfp-kpi-box.blue:hover { border-color: #91B8FA; box-shadow: 0 10px 22px -4px rgba(37, 99, 235, 0.2); }
  .pbfp-kpi-box.purple:hover { border-color: #B79BFB; box-shadow: 0 10px 22px -4px rgba(124, 58, 237, 0.2); }

  .pbfp-kpi-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    margin-bottom: 0.45rem;
  }
  .pbfp-kpi-badge-icon {
    width: 2.35rem;
    height: 2.35rem;
    border-radius: 10px;
    background: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.95);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.05rem;
    flex-shrink: 0;
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .pbfp-kpi-box:hover .pbfp-kpi-badge-icon { transform: scale(1.06); }
  .pbfp-kpi-badge-icon.red { color: #E23632; }
  .pbfp-kpi-badge-icon.amber { color: #D97706; }
  .pbfp-kpi-badge-icon.blue { color: #2563EB; }
  .pbfp-kpi-badge-icon.purple { color: #7C3AED; }

  .pbfp-kpi-trend-tag {
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .pbfp-kpi-trend-tag.red { color: #991B1B; background: #FDE8E8; }
  .pbfp-kpi-trend-tag.amber { color: #92400E; background: #FEF3C7; }
  .pbfp-kpi-trend-tag.blue { color: #1E40AF; background: #DBEAFE; }
  .pbfp-kpi-trend-tag.purple { color: #5B21B6; background: #EDE9FE; }

  .pbfp-kpi-body {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    margin: 0.15rem 0 0.1rem;
  }
  .pbfp-kpi-label {
    order: 2;
    font-size: 0.69rem;
    font-weight: 750;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pbfp-kpi-number {
    order: 1;
    font-size: 1.85rem;
    font-weight: 900;
    color: #0F172A;
    line-height: 1.05;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .pbfp-kpi-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.55rem;
    padding-top: 0.45rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    font-size: 0.7rem;
    font-weight: 600;
  }
  .pbfp-kpi-box.red .pbfp-kpi-footer { color: #DC2626; border-top-color: #FED7D7; }
  .pbfp-kpi-box.amber .pbfp-kpi-footer { color: #D97706; border-top-color: #FEEBC8; }
  .pbfp-kpi-box.blue .pbfp-kpi-footer { color: #2563EB; border-top-color: #DCE7FC; }
  .pbfp-kpi-box.purple .pbfp-kpi-footer { color: #7C3AED; border-top-color: #E9D8FD; }

  .pbfp-kpi-footer-subtext {
    font-weight: 600;
    opacity: 0.9;
  }
  .pbfp-kpi-footer i {
    font-size: 0.72rem;
    transition: transform 0.2s ease;
  }
  .pbfp-kpi-box:hover .pbfp-kpi-footer i {
    transform: translateX(3px);
  }

  .prov-trucks .truck-grid { gap:calc(.75rem + 5px); }
  .prov-trucks__toolbar { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.75rem; margin:1.25rem 0; }
  .prov-trucks__search-box { position:relative; width:min(380px,100%); display:flex; align-items:center; }
  .prov-trucks__search-icon { position:absolute; left:.9rem; color:#98a2b3; font-size:.82rem; pointer-events:none; }
  .prov-trucks__search { min-height:44px; width:100%; padding:.7rem .85rem .7rem 2.35rem; border:1px solid #d0d5dd; border-radius:9px; background:#fff; color:#172033; font:inherit; font-size:.82rem; }
  .prov-trucks__filter-group { display:flex; flex-wrap:wrap; align-items:center; gap:.55rem; }
  .prov-trucks__filter-label { display:inline-flex; align-items:center; gap:.35rem; color:#475467; font-size:.78rem; font-weight:750; }
  .prov-trucks__select { min-height:44px; min-width:240px; padding:.65rem 2.2rem .65rem .85rem; border:1px solid #d0d5dd; border-radius:9px; background:#fff; color:#172033; font:inherit; font-size:.82rem; font-weight:650; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E"); background-position:right .75rem center; background-repeat:no-repeat; background-size:1.15rem; }
  .prov-trucks__badge { display:inline-flex; align-items:center; gap:.45rem; min-height:44px; padding:.55rem .85rem; border:1px solid #d0d5dd; border-radius:9px; background:#fff; color:#475467; font-size:.76rem; font-weight:800; white-space:nowrap; }
  .prov-trucks__search:focus-visible, .prov-trucks__select:focus-visible, .prov-trucks__button:focus-visible, .prov-trucks__secondary:focus-visible { outline:3px solid rgba(37,99,235,.35); outline-offset:2px; }
  .prov-trucks__state { padding:3.5rem 1rem; border:1px dashed #d0d5dd; border-radius:12px; background:#fff; color:#667085; text-align:center; font-size:.85rem; }
  .prov-trucks__form { padding:1.15rem 1.35rem 1.35rem; }
  .prov-trucks__form-grid { display:grid; grid-template-columns:1fr 1fr; gap:.85rem; }
  .prov-trucks__field { display:grid; gap:.35rem; }
  .prov-trucks__field--wide { grid-column:1 / -1; }
  .prov-trucks__field label { color:#344054; font-size:.73rem; font-weight:800; }
  .prov-trucks__field input, .prov-trucks__field select, .prov-trucks__field textarea { min-height:44px; padding:.65rem .75rem; border:1px solid #d0d5dd; border-radius:8px; background:#fff; color:#172033; font:inherit; font-size:.82rem; }
  .prov-trucks__field textarea { min-height:76px; resize:vertical; }
  .prov-trucks__field small { color:#667085; font-size:.68rem; }
  .prov-trucks__field-error { color:#b42318 !important; font-weight:700; }
  .prov-trucks__error { margin:.9rem 0 0; color:#b42318; font-size:.78rem; font-weight:700; }
  .prov-trucks__actions { display:flex; justify-content:flex-end; gap:.6rem; margin-top:1.15rem; }
  .prov-trucks__secondary { min-height:44px; padding:.65rem 1rem; border:1px solid #d0d5dd; border-radius:9px; background:#fff; color:#344054; font:inherit; font-size:.8rem; font-weight:750; cursor:pointer; }
  @media (max-width:760px) {
    .pbfp-kpi-row { grid-template-columns: 1fr 1fr; }
    .prov-trucks__toolbar { flex-direction:column; align-items:stretch; }
    .prov-trucks__search-box { width:100%; }
    .prov-trucks__filter-group { flex-direction:column; align-items:stretch; }
    .prov-trucks__select { width:100%; min-width:0; }
    .prov-trucks__form-grid { grid-template-columns:1fr; }
    .prov-trucks__field--wide { grid-column:auto; }
    .prov-trucks__actions { flex-direction:column-reverse; }
    .prov-trucks__actions button { width:100%; }
  }
  ${fireTruckCardStyles}
  ${fireTruckDialogStyles}
`;

type TruckForm = {
  municipalityId: string;
  stationId: string;
  make: string;
  capacityGallons: string;
  manufacturedYear: string;
  acquiredOn: string;
  operationalStatus: string;
  ownership: string;
  remarks: string;
};

const blankForm: TruckForm = {
  municipalityId: "",
  stationId: "",
  make: "",
  capacityGallons: "1000",
  manufacturedYear: "",
  acquiredOn: "",
  operationalStatus: "SERVICEABLE",
  ownership: "BFP",
  remarks: "",
};

const loadFailure = "Unable to load the provincial fire truck inventory.";

async function fetchRegistry(signal?: AbortSignal): Promise<ProvincialFireTruckRegistry> {
  const response = await fetch("/api/provincial-bfp/fire-trucks", { cache: "no-store", signal });
  if (!response.ok) throw new Error(loadFailure);
  return response.json();
}

export function ProvincialFireTrucks({
  initialMunicipalityId = "",
  topTabs,
}: {
  initialMunicipalityId?: string;
  topTabs?: ReactNode;
}) {
  const [registry, setRegistry] = useState<ProvincialFireTruckRegistry | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState(initialMunicipalityId || "ALL");
  const [query, setQuery] = useState("");
  const [selectedTruck, setSelectedTruck] = useState<FireTruck | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<TruckForm>(blankForm);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const closeDetails = useCallback(() => setSelectedTruck(null), []);
  const closeAdd = useCallback(() => { if (!saving) setAdding(false); }, [saving]);
  useDialogFocus(adding, "truck-add-title", closeAdd, "main.prov-trucks");

  useEffect(() => {
    const controller = new AbortController();
    fetchRegistry(controller.signal)
      .then((data) => { setRegistry(data); setLoadError(""); })
      .catch((error) => { if (error?.name !== "AbortError") setLoadError(error instanceof Error ? error.message : loadFailure); });
    return () => controller.abort();
  }, []);

  async function load() {
    setLoadError("");
    try {
      setRegistry(await fetchRegistry());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : loadFailure);
    }
  }

  const allSelected = selectedMunicipality === "ALL";
  const totals = useMemo(() => (registry?.municipalities ?? []).reduce(
    (sum, item) => ({
      trucks: sum.trucks + item.truckCount,
      serviceable: sum.serviceable + item.serviceableCount,
      down: sum.down + item.outOfServiceCount,
      stations: sum.stations + item.stationCount,
    }),
    { trucks: 0, serviceable: 0, down: 0, stations: 0 },
  ), [registry]);

  const visibleTrucks = useMemo(() => {
    const value = query.trim().toLowerCase();
    return (registry?.trucks ?? []).filter((truck) =>
      (allSelected || truck.municipalityId === selectedMunicipality) &&
      (!value || `${truck.make} ${truck.stationName} ${truck.municipalityName} ${truck.remarks ?? ""}`.toLowerCase().includes(value)),
    );
  }, [allSelected, query, registry, selectedMunicipality]);

  const visibleCount = visibleTrucks.length;
  const formStations = useMemo(
    () => (registry?.stations ?? []).filter((station) => station.municipalityId === form.municipalityId),
    [form.municipalityId, registry],
  );

  function openAdd() {
    const municipalityId = allSelected ? "" : selectedMunicipality;
    const stations = (registry?.stations ?? []).filter((station) => station.municipalityId === municipalityId);
    setForm({ ...blankForm, municipalityId, stationId: stations.length === 1 ? stations[0].id : "" });
    setFormError("");
    setFieldErrors({});
    setAdding(true);
  }

  function changeMunicipality(municipalityId: string) {
    const stations = (registry?.stations ?? []).filter((station) => station.municipalityId === municipalityId);
    setForm((current) => ({ ...current, municipalityId, stationId: stations.length === 1 ? stations[0].id : "" }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFieldErrors({});
    try {
      const response = await fetch("/api/provincial-bfp/fire-trucks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          capacityGallons: Number(form.capacityGallons),
          manufacturedYear: form.manufacturedYear ? Number(form.manufacturedYear) : null,
          acquiredOn: form.acquiredOn || null,
          remarks: form.remarks || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setFieldErrors(result.issues ?? {});
        throw new Error(result.error || "Unable to add the fire truck.");
      }
      await load();
      setSelectedMunicipality(form.municipalityId);
      setAdding(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to add the fire truck.");
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (name: keyof TruckForm) => fieldErrors[name] && <small className="prov-trucks__field-error">{fieldErrors[name]}</small>;

  return <>
    <style>{styles}</style>
    <main className="prov-trucks">
      <div className="prov-trucks__top-row">
        {topTabs ? topTabs : <div />}
        <button className="prov-trucks__button" type="button" onClick={openAdd} disabled={!registry}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> Add fire truck
        </button>
      </div>
      <section className="pbfp-kpi-row" aria-label="Provincial fleet totals">
        {/* Card 1: Red */}
        <div
          className="pbfp-kpi-box red"
          onClick={() => setSelectedMunicipality("ALL")}
          role="button"
          tabIndex={0}
          title="Click to view all fire trucks"
        >
          <div className="pbfp-kpi-header">
            <div className="pbfp-kpi-badge-icon red">
              <i className="fa-solid fa-truck-moving" />
            </div>
            <span className="pbfp-kpi-trend-tag red">
              <i className="fa-solid fa-fire" /> Total Fleet
            </span>
          </div>
          <div className="pbfp-kpi-body">
            <span className="pbfp-kpi-label">Fire Trucks</span>
            <span className="pbfp-kpi-number">{totals.trucks}</span>
          </div>
          <div className="pbfp-kpi-footer">
            <span className="pbfp-kpi-footer-subtext">Provincial Fleet Inventory</span>
            <i className="fa-solid fa-arrow-right" />
          </div>
        </div>

        {/* Card 2: Amber */}
        <div className="pbfp-kpi-box amber">
          <div className="pbfp-kpi-header">
            <div className="pbfp-kpi-badge-icon amber">
              <i className="fa-solid fa-circle-check" />
            </div>
            <span className="pbfp-kpi-trend-tag amber">
              <i className="fa-solid fa-circle-check" /> Ready
            </span>
          </div>
          <div className="pbfp-kpi-body">
            <span className="pbfp-kpi-label">Serviceable</span>
            <span className="pbfp-kpi-number">{totals.serviceable}</span>
          </div>
          <div className="pbfp-kpi-footer">
            <span className="pbfp-kpi-footer-subtext">Operational & Deployable</span>
            <i className="fa-solid fa-arrow-right" />
          </div>
        </div>

        {/* Card 3: Blue */}
        <div className="pbfp-kpi-box blue">
          <div className="pbfp-kpi-header">
            <div className="pbfp-kpi-badge-icon blue">
              <i className="fa-solid fa-wrench" />
            </div>
            <span className="pbfp-kpi-trend-tag blue">
              <i className="fa-solid fa-triangle-exclamation" /> Attention
            </span>
          </div>
          <div className="pbfp-kpi-body">
            <span className="pbfp-kpi-label">Out of Service</span>
            <span className="pbfp-kpi-number">{totals.down}</span>
          </div>
          <div className="pbfp-kpi-footer">
            <span className="pbfp-kpi-footer-subtext">Maintenance / For BER</span>
            <i className="fa-solid fa-arrow-right" />
          </div>
        </div>

        {/* Card 4: Purple */}
        <Link href="/provincial-bfp/firetrucks-stations?view=stations" className="pbfp-kpi-box purple">
          <div className="pbfp-kpi-header">
            <div className="pbfp-kpi-badge-icon purple">
              <i className="fa-solid fa-building-shield" />
            </div>
            <span className="pbfp-kpi-trend-tag purple">
              <i className="fa-solid fa-shield-halved" /> Antique
            </span>
          </div>
          <div className="pbfp-kpi-body">
            <span className="pbfp-kpi-label">Active Stations</span>
            <span className="pbfp-kpi-number">{totals.stations}</span>
          </div>
          <div className="pbfp-kpi-footer">
            <span className="pbfp-kpi-footer-subtext">Station Directory</span>
            <i className="fa-solid fa-arrow-right" />
          </div>
        </Link>
      </section>
      {loadError ? (
        <div className="prov-trucks__state">
          <p>{loadError}</p>
          <button className="prov-trucks__button" type="button" onClick={() => void load()}>Retry</button>
        </div>
      ) : !registry ? (
        <div className="prov-trucks__state">Loading the provincial fire truck inventory…</div>
      ) : (
        <>
          <div className="prov-trucks__toolbar">
            <div className="prov-trucks__search-box">
              <i className="fa-solid fa-magnifying-glass prov-trucks__search-icon" aria-hidden="true" />
              <input
                className="prov-trucks__search"
                aria-label="Search fire trucks"
                placeholder="Search make, station, municipality, or remarks"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="prov-trucks__filter-group">
              <label htmlFor="prov-municipality-select" className="prov-trucks__filter-label">
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                Municipality:
              </label>
              <select
                id="prov-municipality-select"
                className="prov-trucks__select"
                value={selectedMunicipality}
                onChange={(event) => { setSelectedMunicipality(event.target.value); }}
              >
                <option value="ALL">All municipalities ({totals.trucks})</option>
                {registry.municipalities.map((municipality) => (
                  <option key={municipality.municipalityId} value={municipality.municipalityId}>
                    {municipality.municipalityName} ({municipality.truckCount})
                  </option>
                ))}
              </select>
              <span className="prov-trucks__badge">
                {visibleCount} {visibleCount === 1 ? "fire truck" : "fire trucks"}
              </span>
            </div>
          </div>

          {visibleCount === 0 ? (
            <div className="prov-trucks__state">
              {query ? "No fire trucks match your search." : "No fire trucks are recorded for this municipality yet."}
            </div>
          ) : (
            <div className="truck-grid">
              {visibleTrucks.map((truck) => (
                <FireTruckCard
                  key={truck.id}
                  truck={truck}
                  onOpen={setSelectedTruck}
                  showMunicipality={true}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
    <FireTruckDetailsDialog truck={selectedTruck} onClose={closeDetails} pageSelector="main.prov-trucks" />
    {adding && registry && createPortal(<div className="truck-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAdd(); }}>
      <section className="truck-dialog" role="dialog" aria-modal="true" aria-labelledby="truck-add-title">
        <header className="truck-dialog__head">
          <div><p className="truck-dialog__eyebrow">Provincial BFP only</p><h2 id="truck-add-title">Add a fire truck</h2><p>The truck is assigned to one station and appears on that municipality&apos;s fleet page.</p></div>
          <button className="truck-dialog__close" type="button" aria-label="Close" onClick={closeAdd} disabled={saving}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
        </header>
        <form className="prov-trucks__form" onSubmit={submit}>
          <div className="prov-trucks__form-grid">
            <div className="prov-trucks__field"><label htmlFor="truck-municipality">Municipality</label><select id="truck-municipality" required value={form.municipalityId} onChange={(event) => changeMunicipality(event.target.value)}><option value="">Choose municipality</option>{registry.municipalities.map((municipality) => <option key={municipality.municipalityId} value={municipality.municipalityId}>{municipality.municipalityName}</option>)}</select>{fieldError("municipalityId")}</div>
            <div className="prov-trucks__field"><label htmlFor="truck-station">Station</label><select id="truck-station" required value={form.stationId} disabled={!form.municipalityId} onChange={(event) => setForm({ ...form, stationId: event.target.value })}><option value="">{form.municipalityId && formStations.length === 0 ? "No active station" : "Choose station"}</option>{formStations.map((station) => <option key={station.id} value={station.id}>{station.stationName}</option>)}</select>{fieldError("stationId")}</div>
            <div className="prov-trucks__field prov-trucks__field--wide"><label htmlFor="truck-make">Make</label><input id="truck-make" required maxLength={120} placeholder="Example: Isuzu FVR34" value={form.make} onChange={(event) => setForm({ ...form, make: event.target.value })} />{fieldError("make")}</div>
            <div className="prov-trucks__field"><label htmlFor="truck-capacity">Water capacity (gallons)</label><input id="truck-capacity" type="number" inputMode="numeric" min="1" max="20000" step="1" required value={form.capacityGallons} onChange={(event) => setForm({ ...form, capacityGallons: event.target.value })} />{fieldError("capacityGallons")}</div>
            <div className="prov-trucks__field"><label htmlFor="truck-year">Year model <span aria-hidden="true">(optional)</span></label><input id="truck-year" type="number" inputMode="numeric" min="1950" max="2100" step="1" placeholder="Example: 2023" value={form.manufacturedYear} onChange={(event) => setForm({ ...form, manufacturedYear: event.target.value })} />{fieldError("manufacturedYear")}</div>
            <div className="prov-trucks__field"><label htmlFor="truck-acquired">Acquired date <span aria-hidden="true">(optional)</span></label><input id="truck-acquired" type="date" value={form.acquiredOn} onChange={(event) => setForm({ ...form, acquiredOn: event.target.value })} />{fieldError("acquiredOn")}</div>
            <div className="prov-trucks__field"><label htmlFor="truck-status">Status</label><select id="truck-status" value={form.operationalStatus} onChange={(event) => setForm({ ...form, operationalStatus: event.target.value })}><option value="SERVICEABLE">Serviceable</option><option value="UNSERVICEABLE">Unserviceable</option><option value="FOR_BER">For BER</option><option value="BER">BER</option></select>{fieldError("operationalStatus")}</div>
            <div className="prov-trucks__field"><label htmlFor="truck-ownership">Ownership</label><select id="truck-ownership" value={form.ownership} onChange={(event) => setForm({ ...form, ownership: event.target.value })}><option value="BFP">BFP</option><option value="LGU">LGU (not BFP)</option></select>{fieldError("ownership")}</div>
            <div className="prov-trucks__field prov-trucks__field--wide"><label htmlFor="truck-remarks">Remarks <span aria-hidden="true">(optional)</span></label><textarea id="truck-remarks" maxLength={500} placeholder="Example: UNSERVICEABLE (for general repair)" value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />{fieldError("remarks")}</div>
          </div>
          {formError && <p className="prov-trucks__error" role="alert">{formError}</p>}
          <div className="prov-trucks__actions">
            <button className="prov-trucks__secondary" type="button" onClick={closeAdd} disabled={saving}>Cancel</button>
            <button className="prov-trucks__button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save fire truck"}</button>
          </div>
        </form>
      </section>
    </div>, document.body)}
  </>;
}
