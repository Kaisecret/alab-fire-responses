"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ProvincialFireTrucks } from "./provincial-fire-trucks";
import { ProvincialStationDirectory } from "./provincial-station-directory";

const styles = `
  .prov-fleet-tabs { display:inline-flex; gap:.2rem; margin:0; padding:.28rem; border:1px solid #cbd9e8; border-radius:12px; background:#fff; box-shadow:0 5px 14px rgba(15,23,42,.06); font-family:'Plus Jakarta Sans',sans-serif; }
  .prov-fleet-tab { display:inline-flex; align-items:center; gap:.48rem; min-height:2.55rem; padding:.55rem 1rem; border:0; border-radius:9px; background:transparent; color:#52627a; font:inherit; font-size:.82rem; font-weight:800; cursor:pointer; touch-action:manipulation; }
  .prov-fleet-tab:hover { color:#172033; }
  .prov-fleet-tab[aria-selected="true"] { background:#fef3f2; color:#b42318; }
  .prov-fleet-tab:focus-visible { outline:3px solid rgba(37,99,235,.35); outline-offset:2px; }
  #prov-fleet-panel .prov-trucks { padding:.35rem 0 0; }
`;

type FleetView = "trucks" | "stations";

export function ProvincialFiretrucksStations() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const view: FleetView = searchParams.get("view") === "stations" ? "stations" : "trucks";

  function select(next: FleetView) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const tabs = (
    <div className="prov-fleet-tabs" role="tablist" aria-label="Fire trucks and stations">
      <button
        type="button"
        role="tab"
        id="prov-fleet-tab-trucks"
        aria-controls="prov-fleet-panel"
        aria-selected={view === "trucks"}
        className="prov-fleet-tab"
        onClick={() => select("trucks")}
      >
        <i className="fa-solid fa-truck-moving" aria-hidden="true" />
        Fire trucks
      </button>
      <button
        type="button"
        role="tab"
        id="prov-fleet-tab-stations"
        aria-controls="prov-fleet-panel"
        aria-selected={view === "stations"}
        className="prov-fleet-tab"
        onClick={() => select("stations")}
      >
        <i className="fa-solid fa-building-shield" aria-hidden="true" />
        Stations
      </button>
    </div>
  );

  return <>
    <style>{styles}</style>
    {view === "trucks" ? null : tabs}
    <div id="prov-fleet-panel" role="tabpanel" aria-labelledby={view === "trucks" ? "prov-fleet-tab-trucks" : "prov-fleet-tab-stations"}>
      {view === "trucks"
        ? <ProvincialFireTrucks initialMunicipalityId={searchParams.get("municipalityId") ?? ""} topTabs={tabs} />
        : <ProvincialStationDirectory />}
    </div>
  </>;
}
