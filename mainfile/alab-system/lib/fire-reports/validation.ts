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

const OFFICIAL_MUNICIPALITIES = [
  'Anini-y', 'Barbaza', 'Belison', 'Bugasong', 'Caluya', 'Culasi',
  'Tobias Fornier', 'Hamtic', 'Laua-an', 'Libertad', 'Pandan', 'Patnongon',
  'San Jose de Buenavista', 'San Remigio', 'Sebaste', 'Sibalom', 'Tibiao', 'Valderrama',
];

const MUNICIPALITY_ALIASES: Record<string, string> = {
  'san jose': 'San Jose de Buenavista',
  'san jose antique': 'San Jose de Buenavista',
  'dao': 'Tobias Fornier',
  'valderama': 'Valderrama',
  'lauaan': 'Laua-an',
};

export function normalizeDetectedMunicipality(value: unknown) {
  const municipality = text(value, 120);
  const clean = municipality.replace(/\b(municipality|bayan|city)\s+of\b/gi, '').trim().toLowerCase();

  for (const m of OFFICIAL_MUNICIPALITIES) {
    if (m.toLowerCase() === clean) return m;
  }
  if (MUNICIPALITY_ALIASES[clean]) return MUNICIPALITY_ALIASES[clean];
  for (const m of OFFICIAL_MUNICIPALITIES) {
    const mLower = m.toLowerCase();
    if (mLower.includes(clean) || clean.includes(mLower)) return m;
  }

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
  const rawBarangay = text(detectedValue, 120);
  let officialMatch = officialBarangays.find((barangay) => barangayKey(barangay.name) === barangayKey(rawBarangay));

  const barangayName = normalizeDetectedBarangay(detectedValue);
  if (!officialMatch) {
    officialMatch = officialBarangays.find((barangay) => barangayKey(barangay.name) === barangayKey(barangayName));
  }

  return {
    barangayId: officialMatch?.id ?? null,
    barangayName: officialMatch?.name ?? barangayName,
    needsVerification: !officialMatch,
  };
}

export function normalizeStructureMaterial(value: unknown): StructureMaterial | null {
  const clean = text(value, 60).toUpperCase();
  if (!clean) return null;
  if (clean.includes("LIGHT") || clean.includes("WOOD") || clean.includes("KAHOY")) {
    return "LIGHT_MATERIALS";
  }
  if (clean.includes("SEMI") || clean.includes("MIXED") || clean.includes("HALOS") || clean.includes("SEMENTO") || clean.includes("CONCRETE_MIXED")) {
    return "MIXED_SEMI_CONCRETE";
  }
  if (clean.includes("COMMERCIAL") || clean.includes("STEEL") || clean.includes("WAREHOUSE") || clean.includes("BAKAL") || clean.includes("STORAGE")) {
    return "COMMERCIAL_STORAGE";
  }
  if (clean === "CONCRETE") {
    return "CONCRETE";
  }
  if (clean === "OTHER") {
    return "OTHER";
  }
  return null;
}

export function normalizeHouseDensity(value: unknown): HouseDensity | null {
  const clean = text(value, 60).toUpperCase();
  if (!clean) return null;
  if (clean.includes("PACKED") || clean.includes("DIKIT") || clean.includes("HIGH") || clean.includes("DENSE") || clean.includes("KUMPUL")) {
    return "PACKED_MAGKAKADIKIT";
  }
  if (clean.includes("ISOLATED") || clean.includes("FAR") || clean.includes("HIWALAY") || clean.includes("MALAYO") || clean.includes("SPACED")) {
    return "ISOLATED_FAR";
  }
  if (clean.includes("MODERATE") || clean.includes("KATAMTAMAN") || clean.includes("SPACING")) {
    return "MODERATE_SPACING";
  }
  return null;
}

export function normalizeRouteAccessibility(value: unknown): RouteAccessibility | null {
  const clean = text(value, 60).toUpperCase();
  if (!clean) return null;
  if (clean.includes("WIDE") || clean.includes("MALAPAD") || clean.includes("MAIN")) {
    return "WIDE_ROAD";
  }
  if (clean.includes("ESKINITA") || clean.includes("ALLEY") || clean.includes("INTERIOR") || clean.includes("LOOBAN") || clean.includes("MAKIPOT") || clean.includes("NARROW_ALLEY")) {
    return "INTERIOR_ALLEY_ESKINITA";
  }
  if (clean.includes("NARROW_STREET") || clean.includes("STREET")) {
    return "NARROW_STREET";
  }
  if (clean.includes("DEAD_END") || clean.includes("BLOCKED")) {
    return "DEAD_END_OR_BLOCKED";
  }
  return null;
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
  const structureMaterial = raw.structureMaterial !== undefined ? normalizeStructureMaterial(raw.structureMaterial) : null;
  const houseDensity = raw.houseDensity !== undefined ? normalizeHouseDensity(raw.houseDensity) : null;
  const routeAccessibility = raw.routeAccessibility !== undefined ? normalizeRouteAccessibility(raw.routeAccessibility) : null;

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
    structureMaterial: raw.structureMaterial !== undefined ? normalizeStructureMaterial(raw.structureMaterial) : undefined,
    houseDensity: raw.houseDensity !== undefined ? normalizeHouseDensity(raw.houseDensity) : undefined,
    routeAccessibility: raw.routeAccessibility !== undefined ? normalizeRouteAccessibility(raw.routeAccessibility) : undefined,
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
