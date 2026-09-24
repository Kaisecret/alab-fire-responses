"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { municipalTabFetch as fetch } from "../../lib/auth/municipal-tab-fetch";
import { formatGallons } from "../../lib/fire-trucks/presentation";
import type { FireTruck, MunicipalFireTruckRegistry } from "../../lib/fire-trucks/types";
import { FireTruckCard, fireTruckCardStyles } from "./fire-truck-card";
import { FireTruckDetailsDialog, fireTruckDialogStyles } from "./fire-truck-details-dialog";

const styles = `
  .truck-registry { padding:1.5rem clamp(1rem,2vw,2rem) 3rem; color:#172033; font-family:'Plus Jakarta Sans',sans-serif; }
  .truck-registry * { box-sizing:border-box; }
  .truck-registry__header { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; margin-bottom:1.25rem; }
  .truck-registry__eyebrow { margin:0 0 .45rem; color:#b42318; font-size:.72rem; font-weight:800; letter-spacing:.11em; text-transform:uppercase; }
  .truck-registry h1 { margin:0; font-size:clamp(1.45rem,2vw,2rem); letter-spacing:-.035em; }
  .truck-registry__subtitle { max-width:720px; margin:.45rem 0 0; color:#667085; font-size:.9rem; line-height:1.55; }
  .truck-registry__badge { display:inline-flex; align-items:center; gap:.45rem; min-height:40px; padding:.55rem .75rem; border:1px solid #d0d5dd; border-radius:9px; background:#fff; color:#475467; font-size:.75rem; font-weight:800; white-space:nowrap; }
  .truck-registry__stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); margin-bottom:1rem; border:1px solid #e4e7ec; border-radius:12px; background:#fff; }
  .truck-registry__stat { padding:1rem 1.15rem; border-right:1px solid #e4e7ec; }
  .truck-registry__stat:last-child { border-right:0; }
  .truck-registry__stat strong { display:block; font-size:1.35rem; letter-spacing:-.03em; }
  .truck-registry__stat span { color:#667085; font-size:.75rem; font-weight:700; }
  .truck-registry__toolbar { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.75rem; margin:1.15rem 0; }
  .truck-registry__search { min-height:44px; width:min(380px,100%); padding:.7rem .85rem; border:1px solid #d0d5dd; border-radius:9px; background:#fff; color:#172033; font:inherit; }
  .truck-registry__search:focus-visible, .truck-registry__chip:focus-visible, .truck-registry__button:focus-visible { outline:3px solid rgba(37,99,235,.35); outline-offset:2px; }
  .truck-registry__chips { display:flex; flex-wrap:wrap; gap:.4rem; }
  .truck-registry__chip { min-height:36px; padding:.45rem .8rem; border:1px solid #d0d5dd; border-radius:999px; background:#fff; color:#475467; font:inherit; font-size:.74rem; font-weight:750; cursor:pointer; }
  .truck-registry__chip.is-active { border-color:#b42318; background:#fef3f2; color:#b42318; }
  .truck-registry__group { margin-top:1.1rem; }
  .truck-registry__group-head { display:flex; align-items:baseline; justify-content:space-between; gap:.75rem; margin:0 0 .6rem; }
  .truck-registry__group-head h2 { margin:0; font-size:.95rem; letter-spacing:-.01em; }
  .truck-registry__group-head span { color:#667085; font-size:.74rem; font-weight:700; }
  .truck-registry__state { padding:3rem 1rem; border:1px dashed #d0d5dd; border-radius:12px; background:#fff; color:#667085; text-align:center; }
  .truck-registry__button { min-height:44px; margin-top:.75rem; padding:.7rem 1rem; border:0; border-radius:9px; background:#b42318; color:#fff; font:inherit; font-size:.82rem; font-weight:800; cursor:pointer; }
  @media (max-width:760px) { .truck-registry__header { flex-direction:column; } .truck-registry__stats { grid-template-columns:1fr 1fr; } .truck-registry__stat:nth-child(2) { border-right:0; } .truck-registry__stat:nth-child(-n+2) { border-bottom:1px solid #e4e7ec; } .truck-registry__toolbar { flex-direction:column; align-items:stretch; } }
  ${fireTruckCardStyles}
  ${fireTruckDialogStyles}
`;

const loadFailure = "Unable to load fire trucks.";

async function fetchRegistry(signal?: AbortSignal): Promise<MunicipalFireTruckRegistry> {
  const response = await fetch("/api/municipal-bfp/fire-trucks", { cache: "no-store", signal });
  if (!response.ok) throw new Error(loadFailure);
  return response.json();
}

export function MunicipalFireTrucks() {
  const [registry, setRegistry] = useState<MunicipalFireTruckRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [stationId, setStationId] = useState("ALL");
  const [selectedTruck, setSelectedTruck] = useState<FireTruck | null>(null);
  const closeDetails = useCallback(() => setSelectedTruck(null), []);

  useEffect(() => {
    const controller = new AbortController();
    fetchRegistry(controller.signal)
      .then((data) => { setRegistry(data); setLoadError(""); })
      .catch((error) => { if (error?.name !== "AbortError") setLoadError(error instanceof Error ? error.message : loadFailure); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function retryLoad() {
    setLoading(true);
    setLoadError("");
    try {
      setRegistry(await fetchRegistry());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : loadFailure);
    } finally {
      setLoading(false);
    }
  }

  const stationsWithTrucks = useMemo(() => {
    const trucks = registry?.trucks ?? [];
    const seen = new Map<string, string>();
    for (const truck of trucks) seen.set(truck.stationId, truck.stationName);
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [registry]);

  const groups = useMemo(() => {
    const value = query.trim().toLowerCase();
    const visible = (registry?.trucks ?? []).filter((truck) =>
      (stationId === "ALL" || truck.stationId === stationId) &&
      (!value || `${truck.make} ${truck.stationName} ${truck.remarks ?? ""} ${truck.capacityGallons}`.toLowerCase().includes(value)),
    );
    return stationsWithTrucks
      .map((station) => ({ ...station, trucks: visible.filter((truck) => truck.stationId === station.id) }))
      .filter((group) => group.trucks.length > 0);
  }, [query, registry, stationId, stationsWithTrucks]);

  const visibleCount = groups.reduce((sum, group) => sum + group.trucks.length, 0);
  const summary = registry?.summary;

  return <>
    <style>{styles}</style>
    <main className="truck-registry">
      <header className="truck-registry__header">
        <div>
          <p className="truck-registry__eyebrow">Fleet readiness</p>
          <h1>{registry?.municipality.name || "Municipal"} fire trucks</h1>
          <p className="truck-registry__subtitle">Fire trucks assigned to your stations, from the provincial fire truck inventory. Select a card to see its full details.</p>
        </div>
        <span className="truck-registry__badge"><i className="fa-solid fa-lock" aria-hidden="true" /> Records managed by Provincial BFP</span>
      </header>
      <section className="truck-registry__stats" aria-label="Fire truck totals">
        <div className="truck-registry__stat"><strong>{summary?.truckCount ?? 0}</strong><span>Fire trucks</span></div>
        <div className="truck-registry__stat"><strong>{summary?.serviceableCount ?? 0}</strong><span>Serviceable</span></div>
        <div className="truck-registry__stat"><strong>{summary?.outOfServiceCount ?? 0}</strong><span>Out of service</span></div>
        <div className="truck-registry__stat"><strong>{formatGallons(summary?.totalCapacityGallons ?? 0)}</strong><span>Total water capacity</span></div>
      </section>
      <div className="truck-registry__toolbar">
        <input className="truck-registry__search" aria-label="Search fire trucks" placeholder="Search make, station, or remarks" value={query} onChange={(event) => setQuery(event.target.value)} />
        {stationsWithTrucks.length > 1 && <div className="truck-registry__chips" role="group" aria-label="Filter by station">
          <button type="button" className={`truck-registry__chip${stationId === "ALL" ? " is-active" : ""}`} aria-pressed={stationId === "ALL"} onClick={() => setStationId("ALL")}>All stations</button>
          {stationsWithTrucks.map((station) => <button type="button" key={station.id} className={`truck-registry__chip${stationId === station.id ? " is-active" : ""}`} aria-pressed={stationId === station.id} onClick={() => setStationId(station.id)}>{station.name}</button>)}
        </div>}
      </div>
      {loading ? <div className="truck-registry__state">Loading fire trucks…</div>
        : loadError ? <div className="truck-registry__state"><p>{loadError}</p><button className="truck-registry__button" type="button" onClick={() => void retryLoad()}>Retry</button></div>
        : visibleCount === 0 ? <div className="truck-registry__state">{registry?.trucks.length ? "No fire trucks match your search." : "No fire trucks are recorded for your municipality yet. Provincial BFP adds them to the inventory."}</div>
        : groups.map((group) => <section key={group.id} className="truck-registry__group" aria-label={group.name}>
            <header className="truck-registry__group-head"><h2>{group.name}</h2><span>{group.trucks.length} {group.trucks.length === 1 ? "truck" : "trucks"}</span></header>
            <div className="truck-grid">{group.trucks.map((truck) => <FireTruckCard key={truck.id} truck={truck} onOpen={setSelectedTruck} />)}</div>
          </section>)}
    </main>
    <FireTruckDetailsDialog truck={selectedTruck} onClose={closeDetails} pageSelector="main.truck-registry" />
  </>;
}
