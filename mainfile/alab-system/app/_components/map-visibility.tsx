"use client";

// shortcut: the on/off choice is saved in this browser only (localStorage), so another device still shows the pin; move it to a database column when it must be shared.
const STORAGE_KEY = "alab:municipal-map-off";

export type MapOff = { trucks: string[]; stations: string[]; water: string[] };

const ids = (value: unknown) => (Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []);

export function readMapOff(): MapOff {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return { trucks: ids(saved.trucks), stations: ids(saved.stations), water: ids(saved.water) };
  } catch {
    return { trucks: [], stations: [], water: [] };
  }
}

export function writeMapOff(change: Partial<MapOff>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readMapOff(), ...change }));
  } catch {
    // Private windows can block storage; the switch then lasts until the page reloads.
  }
}

export const mapSwitchStyles = `
  .map-switch { position:absolute; top:1rem; right:.85rem; z-index:1; display:inline-flex; align-items:center; gap:.4rem; min-height:34px; padding:.3rem .6rem .3rem .45rem; border:1px solid rgba(255,255,255,.5); border-radius:999px; background:rgba(255,255,255,.18); color:#fff; font:inherit; font-size:.68rem; font-weight:800; letter-spacing:.03em; cursor:pointer; }
  .map-switch:hover { background:rgba(255,255,255,.28); }
  .map-switch:focus-visible { outline:3px solid rgba(255,255,255,.8); outline-offset:2px; }
  .map-switch__track { position:relative; width:30px; height:17px; flex:0 0 30px; border-radius:999px; background:#22c55e; transition:background .15s; }
  .map-switch__track::after { content:""; position:absolute; top:2px; left:15px; width:13px; height:13px; border-radius:50%; background:#fff; transition:left .15s; }
  .map-switch.is-off .map-switch__track { background:#94a3b8; }
  .map-switch.is-off .map-switch__track::after { left:2px; }
  @media (prefers-reduced-motion:reduce) { .map-switch__track, .map-switch__track::after { transition:none; } }
`;

export function MapSwitch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`Show ${label} on the map`}
      title={on ? "Shown on the map. Click to hide it." : "Hidden from the map. Click to show it."}
      className={`map-switch${on ? "" : " is-off"}`}
      onClick={onToggle}
    >
      <span className="map-switch__track" aria-hidden="true" />
      {on ? "ON" : "OFF"}
    </button>
  );
}
