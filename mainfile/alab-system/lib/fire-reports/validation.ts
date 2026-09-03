import type { FireReportStatus, FireType, StructureMaterial, HouseDensity, RouteAccessibility } from "./types";

const fireTypes = new Set<FireType>(["HOUSE_BUILDING", "GRASS", "FOREST", "VEHICLE", "OTHER"]);
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/jpg"]);
const terminalStatuses = new Set<FireReportStatus>(["RESOLVED", "REJECTED", "FALSE_REPORT", "DUPLICATE", "CLOSED"]);
const municipalResolutionStatuses = new Set<FireReportStatus>([
  "RESPONDING",
  "FIRETRUCK_DISPATCHED",
  "RESPONDER_ARRIVED",
  "UNDER_CONTROL",
]);

export type FireReportInput = {
  fireType: FireType;
  latitude: number;
  longitude: number;
  locationAccuracy: number | null;
  municipality: string;
  barangay: string;
  landmark: string;
  description: string;
  structureMaterial?: StructureMaterial | string | null;
  houseDensity?: HouseDensity | string | null;
  routeAccessibility?: RouteAccessibility | string | null;
  weatherTemperature?: number | null;
  weatherHumidity?: number | null;
  weatherWindSpeed?: number | null;
  weatherWindDirection?: number | null;
  weatherWindCondition?: string | null;
};

export type OfficialBarangay = { id: string; name: string };

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
  const officialDirection = withoutPrefix
    .replace(/\bNorth\b/gi, 'Norte')
    .replace(/\bSouth\b/gi, 'Sur');

  // Numeric barangays are officially named "Barangay 1", "Barangay 2", etc.
  if (/^\d+[a-z]?$/i.test(officialDirection)) return `Barangay ${officialDirection}`;

  return officialDirection;
}

function barangayKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveDetectedBarangay(officialBarangays: OfficialBarangay[], detectedValue: unknown) {
  const barangayName = normalizeDetectedBarangay(detectedValue);
  const officialMatch = officialBarangays.find((barangay) => barangayKey(barangay.name) === barangayKey(barangayName));

  return {
    barangayId: officialMatch?.id ?? null,
    barangayName: officialMatch?.name ?? barangayName,
    needsVerification: !officialMatch,
  };
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

  // Optional environmental and tactical inputs (defaults gracefully)
  const structureMaterial = text(raw.structureMaterial, 60) || null;
  const houseDensity = text(raw.houseDensity, 60) || null;
  const routeAccessibility = text(raw.routeAccessibility, 60) || null;

  const weatherTemperature = raw.weatherTemperature != null && raw.weatherTemperature !== "" ? Number(raw.weatherTemperature) : null;
  const weatherHumidity = raw.weatherHumidity != null && raw.weatherHumidity !== "" ? Number(raw.weatherHumidity) : null;
  const weatherWindSpeed = raw.weatherWindSpeed != null && raw.weatherWindSpeed !== "" ? Number(raw.weatherWindSpeed) : null;
  const weatherWindDirection = raw.weatherWindDirection != null && raw.weatherWindDirection !== "" ? Number(raw.weatherWindDirection) : null;
  const weatherWindCondition = text(raw.weatherWindCondition, 40) || null;

  if (!fireTypes.has(fireType)) throw new Error("Select what is burning.");
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 4 || latitude > 22 || longitude < 116 || longitude > 127) throw new Error("A valid Philippine location is required.");
  if (locationAccuracy !== null && (!Number.isFinite(locationAccuracy) || locationAccuracy < 0 || locationAccuracy > 100000)) throw new Error("Invalid location accuracy.");
  if (!municipality || !barangay) throw new Error("Detected municipality and barangay are required.");
  if (landmark.length > 180 || description.length > 1200) throw new Error("Report details are too long.");

  return {
    fireType,
    latitude,
    longitude,
    locationAccuracy,
    municipality,
    barangay,
    landmark,
    description,
    structureMaterial,
    houseDensity,
    routeAccessibility,
    weatherTemperature,
    weatherHumidity,
    weatherWindSpeed,
    weatherWindDirection,
    weatherWindCondition,
  };
}

export function validateTacticalDetailsUpdate(raw: Record<string, unknown>): {
  structureMaterial?: string | null;
  houseDensity?: string | null;
  routeAccessibility?: string | null;
} {
  return {
    structureMaterial: raw.structureMaterial !== undefined ? text(raw.structureMaterial, 60) || null : undefined,
    houseDensity: raw.houseDensity !== undefined ? text(raw.houseDensity, 60) || null : undefined,
    routeAccessibility: raw.routeAccessibility !== undefined ? text(raw.routeAccessibility, 60) || null : undefined,
  };
}

export function validateFireReportPhoto(file: File | null) {
  if (!file) return;
  const isImageMime = imageTypes.has(file.type.toLowerCase()) || file.type.startsWith("image/");
  if (!isImageMime && file.type) throw new Error("Use a JPEG, PNG, or WebP fire photo.");
  if (file.size > 20 * 1024 * 1024) throw new Error("The photo must be 20 MB or smaller.");
}

export function canTransitionReportStatus(current: FireReportStatus, next: FireReportStatus) {
  if (terminalStatuses.has(current)) return false;
  if (next === "RESPONDING") return ["SUBMITTED", "PENDING_VERIFICATION", "UNDER_VERIFICATION", "VERIFIED", "CONFIRMED"].includes(current);
  return current !== next;
}

export function canMunicipalResolveReport(status: FireReportStatus) {
  return municipalResolutionStatuses.has(status);
}
