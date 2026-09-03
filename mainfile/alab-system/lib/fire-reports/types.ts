export const FIRE_REPORT_STATUSES = [
  "SUBMITTED", "PENDING_VERIFICATION", "UNDER_VERIFICATION", "VERIFIED", "CONFIRMED",
  "RESPONDING", "FIRETRUCK_DISPATCHED", "RESPONDER_ARRIVED", "UNDER_CONTROL", "RESOLVED",
  "REJECTED", "FALSE_REPORT", "DUPLICATE", "NEEDS_MORE_INFO", "CLOSED",
] as const;

export type FireReportStatus = (typeof FIRE_REPORT_STATUSES)[number];
export type FireType = "HOUSE_BUILDING" | "GRASS" | "FOREST" | "VEHICLE" | "OTHER";

export const fireReportStatusLabels: Record<FireReportStatus, string> = {
  SUBMITTED: "Report submitted", PENDING_VERIFICATION: "Pending verification", UNDER_VERIFICATION: "Pending verification",
  VERIFIED: "Verified", CONFIRMED: "Verified", RESPONDING: "BFP is responding", FIRETRUCK_DISPATCHED: "Firetruck dispatched",
  RESPONDER_ARRIVED: "Responder arrived", UNDER_CONTROL: "Under control", RESOLVED: "Resolved",
  REJECTED: "Rejected", FALSE_REPORT: "False report", DUPLICATE: "Duplicate report", NEEDS_MORE_INFO: "Needs more information", CLOSED: "Closed",
};

export type Coordinate = [number, number];
export type RoadRoute = {
  mode: "road" | "direct";
  distanceMeters?: number;
  durationSeconds?: number;
  directKilometers: number;
  coordinates: Coordinate[];
};

export type StructureMaterial = "LIGHT_MATERIALS" | "MIXED_SEMI_CONCRETE" | "CONCRETE" | "COMMERCIAL_STORAGE" | "OTHER";
export type HouseDensity = "PACKED_MAGKAKADIKIT" | "MODERATE_SPACING" | "ISOLATED_FAR";
export type RouteAccessibility = "WIDE_ROAD" | "NARROW_STREET" | "INTERIOR_ALLEY_ESKINITA" | "DEAD_END_OR_BLOCKED";
export type CalculatedSeverityLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export const severityLevelLabels: Record<CalculatedSeverityLevel, string> = {
  LOW: "Low Severity",
  MODERATE: "Moderate Severity",
  HIGH: "High Severity",
  CRITICAL: "Critical Severity",
};

