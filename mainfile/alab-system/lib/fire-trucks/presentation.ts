import type { FireTruck, FireTruckOwnership, FireTruckStatus } from "./types";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const fireTruckStatusLabels: Record<FireTruckStatus, string> = {
  SERVICEABLE: "Serviceable",
  UNSERVICEABLE: "Unserviceable",
  FOR_BER: "For BER",
  BER: "BER",
};

export const fireTruckStatusDescriptions: Record<FireTruckStatus, string> = {
  SERVICEABLE: "Available for response",
  UNSERVICEABLE: "Out of service until repaired",
  FOR_BER: "Proposed for beyond economic repair",
  BER: "Declared beyond economic repair",
};

export const fireTruckOwnershipLabels: Record<FireTruckOwnership, string> = {
  BFP: "BFP",
  LGU: "LGU (not BFP)",
};

export function formatGallons(value: number) {
  return `${value.toLocaleString("en-US")} gal`;
}

export function formatAcquired(truck: Pick<FireTruck, "acquiredOn" | "acquiredPrecision" | "acquiredLabel">) {
  if (truck.acquiredOn && truck.acquiredPrecision) {
    const [year, month, day] = truck.acquiredOn.split("-").map(Number);
    const monthName = monthNames[month - 1] ?? "";
    return truck.acquiredPrecision === "MONTH" ? `${monthName} ${year}` : `${monthName} ${day}, ${year}`;
  }
  if (truck.acquiredLabel) return `${truck.acquiredLabel} (year not recorded)`;
  return "Not recorded";
}

export function isOutOfService(truck: Pick<FireTruck, "operationalStatus">) {
  return truck.operationalStatus !== "SERVICEABLE";
}
