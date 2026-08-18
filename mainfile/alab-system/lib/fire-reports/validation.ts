import type { FireReportStatus, FireType } from "./types";

const fireTypes = new Set<FireType>(["HOUSE_BUILDING", "GRASS", "FOREST", "VEHICLE", "OTHER"]);
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const terminalStatuses = new Set<FireReportStatus>(["RESOLVED", "REJECTED", "FALSE_REPORT", "DUPLICATE", "CLOSED"]);

export type FireReportInput = {
  fireType: FireType;
  latitude: number;
  longitude: number;
  locationAccuracy: number | null;
  municipality: string;
  barangay: string;
  landmark: string;
  description: string;
};

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function normalizeDetectedMunicipality(value: unknown) {
  const municipality = text(value, 120);
  const normalized = municipality.toLocaleLowerCase();

  // Nominatim commonly returns the short local name, while the official PSGC
  // municipality stored by ALAB uses the full name.
  if (normalized === "san jose") return "San Jose de Buenavista";

  return municipality;
}

export function normalizeDetectedBarangay(value: unknown) {
  const barangay = text(value, 120);
  const withoutPrefix = barangay.replace(/^(?:barangay|brgy\.?)\s+/i, '');

  // Numeric barangays are officially named "Barangay 1", "Barangay 2", etc.
  if (/^\d+[a-z]?$/i.test(withoutPrefix)) return `Barangay ${withoutPrefix}`;

  return withoutPrefix;
}

export function validateFireReportInput(raw: Record<string, unknown>): FireReportInput {
  const fireType = text(raw.fireType, 40) as FireType;
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  const locationAccuracy = raw.locationAccuracy === "" || raw.locationAccuracy == null ? null : Number(raw.locationAccuracy);
  const municipality = normalizeDetectedMunicipality(raw.municipality);
  const barangay = text(raw.barangay, 120);
  const landmark = text(raw.landmark, 180);
  const description = text(raw.description, 1200);
  if (!fireTypes.has(fireType)) throw new Error("Select what is burning.");
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 4 || latitude > 22 || longitude < 116 || longitude > 127) throw new Error("A valid Philippine location is required.");
  if (locationAccuracy !== null && (!Number.isFinite(locationAccuracy) || locationAccuracy < 0 || locationAccuracy > 100000)) throw new Error("Invalid location accuracy.");
  if (!municipality || !barangay) throw new Error("Detected municipality and barangay are required.");
  if (landmark.length > 180 || description.length > 1200) throw new Error("Report details are too long.");
  return { fireType, latitude, longitude, locationAccuracy, municipality, barangay, landmark, description };
}

export function validateFireReportPhoto(file: File | null) {
  if (!file) return;
  if (!imageTypes.has(file.type)) throw new Error("Use a JPEG, PNG, or WebP fire photo.");
  if (file.size > 8 * 1024 * 1024) throw new Error("The photo must be 8 MB or smaller.");
}

export function canTransitionReportStatus(current: FireReportStatus, next: FireReportStatus) {
  if (terminalStatuses.has(current)) return false;
  if (next === "RESPONDING") return ["SUBMITTED", "PENDING_VERIFICATION", "UNDER_VERIFICATION", "VERIFIED", "CONFIRMED"].includes(current);
  return current !== next;
}
