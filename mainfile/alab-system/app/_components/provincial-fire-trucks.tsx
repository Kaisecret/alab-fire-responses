"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { formatGallons } from "../../lib/fire-trucks/presentation";
import type { FireTruck, ProvincialFireTruckRegistry } from "../../lib/fire-trucks/types";
import { FireTruckCard, fireTruckCardStyles } from "./fire-truck-card";
import { FireTruckDetailsDialog, fireTruckDialogStyles } from "./fire-truck-details-dialog";
import { useDialogFocus } from "./use-dialog-focus";

const styles = `
  .prov-trucks { padding:1.5rem clamp(1rem,2vw,2rem) 3rem; color:#172033; font-family:'Plus Jakarta Sans',sans-serif; }
  .prov-trucks * { box-sizing:border-box; }
  .prov-trucks__header { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; margin-bottom:1.25rem; }
  .prov-trucks__eyebrow { margin:0 0 .4rem; color:#b42318; font-size:.7rem; font-weight:850; letter-spacing:.11em; text-transform:uppercase; }
  .prov-trucks h1 { margin:0; font-size:clamp(1.45rem,2vw,2rem); letter-spacing:-.035em; }
  .prov-trucks__subtitle { max-width:760px; margin:.45rem 0 0; color:#667085; font-size:.87rem; line-height:1.55; }
  .prov-trucks__button { min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:.5rem; padding:.7rem 1rem; border:0; border-radius:9px; background:#b42318; color:#fff; font:inherit; font-size:.82rem; font-weight:800; cursor:pointer; white-space:nowrap; }
  .prov-trucks__button:hover { background:#912018; }
  .prov-trucks__button:disabled { opacity:.6; cursor:wait; }
  .prov-trucks__summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); margin-bottom:1rem; border:1px solid #e4e7ec; border-radius:12px; background:#fff; }
  .prov-trucks__summary div { padding:1rem 1.15rem; border-right:1px solid #e4e7ec; }
  .prov-trucks__summary div:last-child { border-right:0; }
  .prov-trucks__summary strong { display:block; font-size:1.35rem; }
  .prov-trucks__summary span { color:#667085; font-size:.74rem; font-weight:700; }
  .prov-trucks__layout { display:grid; grid-template-columns:minmax(280px,.72fr) minmax(420px,1.6fr); gap:1rem; align-items:start; }
  .prov-trucks__panel { overflow:hidden; border:1px solid #e4e7ec; border-radius:12px; background:#fff; }
  .prov-trucks__panel-head { display:flex; align-items:center; justify-content:space-between; gap:.75rem; padding:1rem 1.1rem; border-bottom:1px solid #e4e7ec; }
  .prov-trucks__panel-head h2 { margin:0; font-size:.92rem; }
  .prov-trucks__panel-head span { color:#667085; font-size:.7rem; font-weight:700; }
  .prov-trucks__municipalities { display:grid; max-height:680px; overflow:auto; }
  .prov-trucks__municipality { appearance:none; display:grid; grid-template-columns:1fr auto; gap:.3rem .8rem; width:100%; padding:.9rem 1.1rem; border:0; border-bottom:1px solid #f0f1f3; background:#fff; color:#344054; text-align:left; font:inherit; cursor:pointer; }
  .prov-trucks__municipality:hover { background:#f8fafc; }
  .prov-trucks__municipality.is-active { background:#fef3f2; box-shadow:inset 3px 0 #b42318; }
  .prov-trucks__municipality strong { font-size:.8rem; }
  .prov-trucks__municipality span { color:#667085; font-size:.7rem; }
  .prov-trucks__municipality b { grid-row:1 / 3; grid-column:2; align-self:center; display:grid; place-items:center; min-width:34px; height:28px; border-radius:999px; background:#f2f4f7; color:#344054; font-size:.74rem; }
  .prov-trucks__municipality:focus-visible, .prov-trucks__search:focus-visible, .prov-trucks__button:focus-visible { outline:3px solid rgba(37,99,235,.35); outline-offset:-3px; }
  .prov-trucks__detail { min-height:520px; }
  .prov-trucks__tools { display:flex; gap:.5rem; align-items:center; }
  .prov-trucks__search { min-height:40px; width:min(240px,100%); padding:.55rem .7rem; border:1px solid #d0d5dd; border-radius:8px; font:inherit; font-size:.76rem; }
  .prov-trucks__records { padding:.85rem; }
  .prov-trucks__group + .prov-trucks__group { margin-top:1rem; }
  .prov-trucks__group-head { display:flex; justify-content:space-between; gap:.75rem; margin:0 0 .55rem; }
  .prov-trucks__group-head h3 { margin:0; font-size:.82rem; }
  .prov-trucks__group-head span { color:#667085; font-size:.7rem; font-weight:700; }
  .prov-trucks__empty { padding:3rem 1rem; color:#667085; font-size:.82rem; text-align:center; }
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
  @media (max-width:980px) { .prov-trucks__layout { grid-template-columns:1fr; } .prov-trucks__municipalities { max-height:320px; } }
  @media (max-width:640px) { .prov-trucks__header { flex-direction:column; } .prov-trucks__header .prov-trucks__button { width:100%; } .prov-trucks__summary { grid-template-columns:1fr 1fr; } .prov-trucks__summary div:nth-child(2) { border-right:0; } .prov-trucks__summary div:nth-child(-n+2) { border-bottom:1px solid #e4e7ec; } .prov-trucks__panel-head { flex-direction:column; align-items:stretch; } .prov-trucks__search { width:100%; } .prov-trucks__form-grid { grid-template-columns:1fr; } .prov-trucks__field--wide { grid-column:auto; } .prov-trucks__actions { flex-direction:column-reverse; } .prov-trucks__actions button { width:100%; } }
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

export function ProvincialFireTrucks({ initialMunicipalityId = "" }: { initialMunicipalityId?: string }) {
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
  const selected = registry?.municipalities.find((item) => item.municipalityId === selectedMunicipality);
  const totals = useMemo(() => (registry?.municipalities ?? []).reduce(
    (sum, item) => ({
      trucks: sum.trucks + item.truckCount,
      serviceable: sum.serviceable + item.serviceableCount,
      down: sum.down + item.outOfServiceCount,
      stations: sum.stations + item.stationCount,
    }),
    { trucks: 0, serviceable: 0, down: 0, stations: 0 },
  ), [registry]);

  const groups = useMemo(() => {
    const value = query.trim().toLowerCase();
    const visible = (registry?.trucks ?? []).filter((truck) =>
      (allSelected || truck.municipalityId === selectedMunicipality) &&
      (!value || `${truck.make} ${truck.stationName} ${truck.municipalityName} ${truck.remarks ?? ""}`.toLowerCase().includes(value)),
    );
    const byStation = new Map<string, { id: string; name: string; municipalityName: string; trucks: FireTruck[] }>();
    for (const truck of visible) {
      const group = byStation.get(truck.stationId) ?? { id: truck.stationId, name: truck.stationName, municipalityName: truck.municipalityName, trucks: [] };
      group.trucks.push(truck);
      byStation.set(truck.stationId, group);
    }
    return Array.from(byStation.values());
  }, [allSelected, query, registry, selectedMunicipality]);

  const visibleCount = groups.reduce((sum, group) => sum + group.trucks.length, 0);
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
      <header className="prov-trucks__header">
        <div>
          <p className="prov-trucks__eyebrow">Antique provincial fleet</p>
          <h1>Fire trucks by municipality</h1>
          <p className="prov-trucks__subtitle">Every fire truck on the provincial inventory, grouped by municipality and station. Only Provincial BFP can add trucks; municipal accounts see their own fleet.</p>
        </div>
        <button className="prov-trucks__button" type="button" onClick={openAdd} disabled={!registry}><i className="fa-solid fa-plus" aria-hidden="true" /> Add fire truck</button>
      </header>
      <section className="prov-trucks__summary" aria-label="Provincial fleet totals">
        <div><strong>{totals.trucks}</strong><span>Fire trucks</span></div>
        <div><strong>{totals.serviceable}</strong><span>Serviceable</span></div>
        <div><strong>{totals.down}</strong><span>Out of service</span></div>
        <div><strong>{totals.stations}</strong><span>Active stations</span></div>
      </section>
      {loadError ? <div className="prov-trucks__panel prov-trucks__empty"><p>{loadError}</p><button className="prov-trucks__button" type="button" onClick={() => void load()}>Retry</button></div>
        : !registry ? <div className="prov-trucks__panel prov-trucks__empty">Loading the provincial fire truck inventory…</div>
        : <div className="prov-trucks__layout">
          <section className="prov-trucks__panel">
            <header className="prov-trucks__panel-head"><h2>Municipalities</h2><span>Select a municipality</span></header>
            <div className="prov-trucks__municipalities">
              <button type="button" className={`prov-trucks__municipality${allSelected ? " is-active" : ""}`} aria-pressed={allSelected} onClick={() => { setSelectedMunicipality("ALL"); setQuery(""); }}>
                <strong>All municipalities</strong><span>{totals.stations} stations · {totals.down} out of service</span><b>{totals.trucks}</b>
              </button>
              {registry.municipalities.map((municipality) => <button type="button" key={municipality.municipalityId} className={`prov-trucks__municipality${municipality.municipalityId === selectedMunicipality ? " is-active" : ""}`} aria-pressed={municipality.municipalityId === selectedMunicipality} onClick={() => { setSelectedMunicipality(municipality.municipalityId); setQuery(""); }}>
                <strong>{municipality.municipalityName}</strong>
                <span>{municipality.incomeClass ? `${municipality.incomeClass} class · ` : ""}{municipality.stationCount} {municipality.stationCount === 1 ? "station" : "stations"} · {formatGallons(municipality.totalCapacityGallons)}</span>
                <b>{municipality.truckCount}</b>
              </button>)}
            </div>
          </section>
          <section className="prov-trucks__panel prov-trucks__detail">
            <header className="prov-trucks__panel-head">
              <div><h2>{allSelected ? "All municipalities" : selected?.municipalityName || "Municipality"}</h2><span>{visibleCount} {visibleCount === 1 ? "fire truck" : "fire trucks"}</span></div>
              <div className="prov-trucks__tools"><input className="prov-trucks__search" aria-label="Search fire trucks" placeholder="Search make, station, or remarks" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
            </header>
            {visibleCount === 0 ? <div className="prov-trucks__empty">{query ? "No fire trucks match your search." : "No fire trucks are recorded for this municipality yet."}</div>
              : <div className="prov-trucks__records">{groups.map((group) => <section key={group.id} className="prov-trucks__group" aria-label={group.name}>
                  <header className="prov-trucks__group-head"><h3>{allSelected ? `${group.name} · ${group.municipalityName}` : group.name}</h3><span>{group.trucks.length} {group.trucks.length === 1 ? "truck" : "trucks"}</span></header>
                  <div className="truck-grid">{group.trucks.map((truck) => <FireTruckCard key={truck.id} truck={truck} onOpen={setSelectedTruck} />)}</div>
                </section>)}</div>}
          </section>
        </div>}
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
