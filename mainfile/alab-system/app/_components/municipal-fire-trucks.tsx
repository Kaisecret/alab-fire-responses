"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { municipalTabFetch as fetch } from "../../lib/auth/municipal-tab-fetch";
import { formatGallons } from "../../lib/fire-trucks/presentation";
import type { FireTruck, MunicipalFireTruckRegistry } from "../../lib/fire-trucks/types";
import { FireTruckCard, fireTruckCardStyles } from "./fire-truck-card";
import { FireTruckDetailsDialog, fireTruckDialogStyles } from "./fire-truck-details-dialog";
import { MunicipalStatCards } from "./municipal-stat-cards";

const styles = `
  .truck-registry { padding:1.5rem clamp(1rem,2vw,2rem) 3rem; color:#172033; font-family:'Plus Jakarta Sans',sans-serif; }
  .truck-registry * { box-sizing:border-box; }
  .truck-registry__header { margin-bottom:1.25rem; }
  .truck-registry h1 { display:flex; align-items:center; gap:.65rem; margin:0; font-size:1.65rem; font-weight:800; letter-spacing:-.035em; }
  .truck-registry h1 i { color:#dc2626; }
  .truck-registry__toolbar { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.75rem; margin:1.15rem 0; }
  .truck-registry__search { min-height:44px; width:min(380px,100%); padding:.7rem .85rem; border:1px solid #d0d5dd; border-radius:9px; background:#fff; color:#172033; font:inherit; }
  .truck-registry__search:focus-visible, .truck-registry__chip:focus-visible, .truck-registry__button:focus-visible { outline:3px solid rgba(37,99,235,.35); outline-offset:2px; }
  .truck-registry__chips { display:flex; flex-wrap:wrap; gap:.4rem; }
  .truck-registry__chip { min-height:36px; padding:.45rem .8rem; border:1px solid #d0d5dd; border-radius:999px; background:#fff; color:#475467; font:inherit; font-size:.74rem; font-weight:750; cursor:pointer; }
  .truck-registry__chip.is-active { border-color:#b42318; background:#fef3f2; color:#b42318; }
  .truck-registry__state { padding:3rem 1rem; border:1px dashed #d0d5dd; border-radius:12px; background:#fff; color:#667085; text-align:center; }
  .truck-registry__button { min-height:44px; margin-top:.75rem; padding:.7rem 1rem; border:0; border-radius:9px; background:#b42318; color:#fff; font:inherit; font-size:.82rem; font-weight:800; cursor:pointer; }
  @media (max-width:760px) { .truck-registry__toolbar { flex-direction:column; align-items:stretch; } }
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

  const visibleTrucks = useMemo(() => {
    const value = query.trim().toLowerCase();
    return (registry?.trucks ?? []).filter((truck) =>
      (stationId === "ALL" || truck.stationId === stationId) &&
      (!value || `${truck.make} ${truck.stationName} ${truck.remarks ?? ""} ${truck.capacityGallons}`.toLowerCase().includes(value)),
    );
  }, [query, registry, stationId]);

  const visibleCount = visibleTrucks.length;
  const summary = registry?.summary;

  return <>
    <style>{styles}</style>
    <main className="truck-registry">
      <header className="truck-registry__header">
        <h1><i className="fa-solid fa-truck-moving" aria-hidden="true" />Fire trucks</h1>
      </header>
      <MunicipalStatCards label="Fire truck totals" items={[
        { key: "trucks", icon: "fa-truck-moving", tone: "blue", value: summary?.truckCount ?? 0, label: "Fire trucks", badge: "Fleet", description: "Trucks assigned to your stations", loading },
        { key: "serviceable", icon: "fa-circle-check", tone: "emerald", value: summary?.serviceableCount ?? 0, label: "Serviceable", badge: "Ready", description: "Serviceable apparatus", loading },
        { key: "out", icon: "fa-screwdriver-wrench", tone: "amber", value: summary?.outOfServiceCount ?? 0, label: "Out of service", badge: "Maintenance", description: "Apparatus needing service", loading },
        { key: "capacity", icon: "fa-droplet", tone: "violet", value: formatGallons(summary?.totalCapacityGallons ?? 0), label: "Water capacity", badge: "Capacity", description: "Combined fleet capacity in gallons", loading },
      ]} />
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
        : <div className="truck-grid">{visibleTrucks.map((truck) => <FireTruckCard key={truck.id} truck={truck} onOpen={setSelectedTruck} />)}</div>}
    </main>
    <FireTruckDetailsDialog truck={selectedTruck} onClose={closeDetails} pageSelector="main.truck-registry" />
  </>;
}
