// shortcut: "Under maintenance" is saved in this browser only (localStorage), so another device still shows the source as ready; move it to a water_sources column when it must be shared.
const STORAGE_KEY = "alab:water-sources-under-maintenance";

/** Ids of the water sources marked Under maintenance on the municipal Water sources tab. */
export function readWaterSourcesUnderMaintenance(): string[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function writeWaterSourcesUnderMaintenance(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Private windows can block storage; the status then lasts until the page reloads.
  }
}
