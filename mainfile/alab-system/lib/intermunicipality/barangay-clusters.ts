import type { BarangayAlertIncident } from "./barangay-alert-types";

// Three or more reports in one barangay are flagged inside the municipality alert.
export const BARANGAY_CLUSTER_SIZE = 3;

export type BarangayGroup = { barangay: string | null; incidents: BarangayAlertIncident[] };

/** A municipality alert's incidents by barangay: largest first, unknown barangay last. */
export function groupByBarangay(incidents: BarangayAlertIncident[]): BarangayGroup[] {
  const groups = new Map<string | null, BarangayAlertIncident[]>();
  for (const incident of incidents) groups.set(incident.barangay, [...(groups.get(incident.barangay) ?? []), incident]);
  return [...groups].map(([barangay, rows]) => ({ barangay, incidents: rows }))
    .sort((a, b) => Number(a.barangay === null) - Number(b.barangay === null)
      || b.incidents.length - a.incidents.length
      || (a.barangay ?? "").localeCompare(b.barangay ?? ""));
}
