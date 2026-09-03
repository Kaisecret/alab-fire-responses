export type StructureMaterial =
  | "LIGHT_MATERIALS"
  | "MIXED_SEMI_CONCRETE"
  | "CONCRETE"
  | "COMMERCIAL_STORAGE"
  | "OTHER";

export type HouseDensity =
  | "PACKED_MAGKAKADIKIT"
  | "MODERATE_SPACING"
  | "ISOLATED_FAR";

export type RouteAccessibility =
  | "WIDE_ROAD"
  | "NARROW_STREET"
  | "INTERIOR_ALLEY_ESKINITA"
  | "DEAD_END_OR_BLOCKED";

export type CalculatedSeverityLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type SeverityInput = {
  fireType?: string;
  structureMaterial?: StructureMaterial | string | null;
  houseDensity?: HouseDensity | string | null;
  routeAccessibility?: RouteAccessibility | string | null;
  windSpeedKph?: number;
  windDirectionDeg?: number;
  temperatureC?: number;
  relativeHumidity?: number;
  isOffRoadAlley?: boolean; // From OSRM road distance check (> 35m)
};

export type SeverityAssessment = {
  score: number; // 0 to 100
  level: CalculatedSeverityLevel;
  alarmRecommendation: string;
  factors: string[];
  weights: {
    density: number;
    wind: number;
    structure: number;
    route: number;
    weather: number;
  };
};

// AHP Multi-Criteria Decision Weights (Sum = 1.00)
export const AHP_WEIGHTS = {
  density: 0.30,   // House Density ("Magkakadikit")
  wind: 0.25,      // Wind velocity and gusts
  structure: 0.20, // Structural materials / fuel load
  route: 0.15,     // Road and alley accessibility
  weather: 0.10,   // Ambient heat and relative humidity
} as const;

export function calculateFireSeverity(input: SeverityInput): SeverityAssessment {
  const factors: string[] = [];

  // 1. House Density Criterion (Weight: 0.30)
  let densityScore = 30; // default baseline
  if (input.houseDensity === "PACKED_MAGKAKADIKIT") {
    densityScore = 100;
    factors.push("Dikit-dikit na kabahayan (High conflagration risk)");
  } else if (input.houseDensity === "MODERATE_SPACING") {
    densityScore = 50;
    factors.push("Katamtamang agwat ng mga bahay (2–5m)");
  } else if (input.houseDensity === "ISOLATED_FAR") {
    densityScore = 10;
  }

  // 2. Wind Speed & Velocity Criterion (Weight: 0.25)
  const windSpeed = Number.isFinite(input.windSpeedKph) ? Math.max(0, input.windSpeedKph!) : 12;
  let windScore = 20;
  if (windSpeed >= 40) {
    windScore = 100;
    factors.push(`Napakalakas na hangin / gale (${Math.round(windSpeed)} km/h)`);
  } else if (windSpeed >= 25) {
    windScore = 80;
    factors.push(`Malakas ang hangin (${Math.round(windSpeed)} km/h - mabilis kumalat ang apoy)`);
  } else if (windSpeed >= 12) {
    windScore = 45;
  } else {
    windScore = 15;
  }

  // 3. Structure Combustibility Criterion (Weight: 0.20)
  let structureScore = 40;
  const isHouse = !input.fireType || input.fireType === "HOUSE_BUILDING";
  if (input.structureMaterial === "LIGHT_MATERIALS" || (isHouse && !input.structureMaterial && input.houseDensity === "PACKED_MAGKAKADIKIT")) {
    structureScore = 100;
    factors.push("Light combustible materials (Kahoy/Kawayan/Nipa)");
  } else if (input.structureMaterial === "COMMERCIAL_STORAGE") {
    structureScore = 90;
    factors.push("Commercial / Storage / Flammable materials");
  } else if (input.structureMaterial === "MIXED_SEMI_CONCRETE") {
    structureScore = 55;
    factors.push("Semi-concrete structure");
  } else if (input.structureMaterial === "CONCRETE") {
    structureScore = 20;
  } else if (input.fireType === "FOREST" || input.fireType === "GRASS") {
    structureScore = windSpeed >= 20 ? 70 : 40;
    if (structureScore >= 70) factors.push("Mabilis na pagkalat ng apoy sa damuhan o kagubatan");
  }

  // 4. Route Complexity & Accessibility Criterion (Weight: 0.15)
  let routeScore = 15;
  if (input.routeAccessibility === "INTERIOR_ALLEY_ESKINITA" || input.isOffRoadAlley) {
    routeScore = 100;
    factors.push("Eskinita / Makipot na looban (Hindi mapasok ng malaking firetruck, kailangan ng mahabang hose)");
  } else if (input.routeAccessibility === "DEAD_END_OR_BLOCKED") {
    routeScore = 80;
    factors.push("Dead-end o baradong daan");
  } else if (input.routeAccessibility === "NARROW_STREET") {
    routeScore = 50;
    factors.push("Makipot na kalsada (1-lane passage)");
  } else if (input.routeAccessibility === "WIDE_ROAD") {
    routeScore = 10;
  }

  // 5. Ambient Dryness / Heat Index Criterion (Weight: 0.10)
  const temp = Number.isFinite(input.temperatureC) ? input.temperatureC! : 29;
  const humidity = Number.isFinite(input.relativeHumidity) ? input.relativeHumidity! : 75;
  let weatherScore = 35;
  if (temp >= 33 && humidity <= 55) {
    weatherScore = 100;
    factors.push(`Matinding init at tuyong panahon (${Math.round(temp)}°C, ${Math.round(humidity)}% RH)`);
  } else if (temp >= 31 && humidity <= 65) {
    weatherScore = 70;
  } else if (humidity >= 85) {
    weatherScore = 10; // Rain / dampening effect
  }

  // AHP Weighted Linear Combination: S = SUM(w_i * C_i)
  const compositeScore = Math.round(
    AHP_WEIGHTS.density * densityScore +
    AHP_WEIGHTS.wind * windScore +
    AHP_WEIGHTS.structure * structureScore +
    AHP_WEIGHTS.route * routeScore +
    AHP_WEIGHTS.weather * weatherScore
  );

  const clampedScore = Math.min(100, Math.max(0, compositeScore));

  // Tier Classification & BFP Alarm Dispatch Recommendation
  let level: CalculatedSeverityLevel;
  let alarmRecommendation: string;

  if (clampedScore >= 75) {
    level = "CRITICAL";
    alarmRecommendation = "Recommend 2nd / 3rd Alarm: Full station dispatch + Tanker relay + Mutual aid standby";
  } else if (clampedScore >= 50) {
    level = "HIGH";
    alarmRecommendation = "Recommend 1st Alarm Full Response: Primary pumper + Auxiliary hose deployment";
  } else if (clampedScore >= 25) {
    level = "MODERATE";
    alarmRecommendation = "Recommend Standard Response: 1 Fire engine initial response";
  } else {
    level = "LOW";
    alarmRecommendation = "Recommend Minor Incident Verification: Single crew response";
  }

  return {
    score: clampedScore,
    level,
    alarmRecommendation,
    factors: factors.length > 0 ? factors : ["Standard localized incident"],
    weights: { ...AHP_WEIGHTS },
  };
}
