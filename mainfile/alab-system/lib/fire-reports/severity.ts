import { computeAhpWeights } from "./ahp.ts";

export type StructureMaterial = "LIGHT_MATERIALS" | "MIXED_SEMI_CONCRETE" | "CONCRETE" | "COMMERCIAL_STORAGE" | "OTHER";
export type HouseDensity = "PACKED_MAGKAKADIKIT" | "MODERATE_SPACING" | "ISOLATED_FAR";
export type RouteAccessibility = "WIDE_ROAD" | "NARROW_STREET" | "INTERIOR_ALLEY_ESKINITA" | "DEAD_END_OR_BLOCKED";
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
  nearestBuildingDistanceMeters?: number | null;
};

export type SeverityAssessment = {
  score: number;
  level: CalculatedSeverityLevel;
  alarmRecommendation: string;
  factors: string[];
  weights: Record<string, number>;
};

// PROVISIONAL: replace with geometric-mean BFP respondent matrices once supplied.
// Structural ratios reproduce previous weights; no BFP responses are claimed.
const structuralReference = [0.30, 0.25, 0.20, 0.15, 0.10];
const vegetationReference = [0.35, 0.20, 0.30, 0.15];
const ratioMatrix = (weights: number[]) => weights.map((weight) => weights.map((other) => weight / other));

export const STRUCTURAL_AHP_MATRIX = ratioMatrix(structuralReference);
export const VEGETATION_AHP_MATRIX = ratioMatrix(vegetationReference);
export const STRUCTURAL_AHP_RESULT = computeAhpWeights(STRUCTURAL_AHP_MATRIX);
export const VEGETATION_AHP_RESULT = computeAhpWeights(VEGETATION_AHP_MATRIX);

if (STRUCTURAL_AHP_RESULT.cr > 0.10 || VEGETATION_AHP_RESULT.cr > 0.10) {
  throw new Error("AHP consistency ratio exceeds 0.10");
}

const [density, wind, structure, route, weather] = STRUCTURAL_AHP_RESULT.weights;
export const AHP_WEIGHTS = { density, wind, structure, route, weather };
const [vegetationWind, vegetationWeather, distance, vegetationRoute] = VEGETATION_AHP_RESULT.weights;
export const VEGETATION_AHP_WEIGHTS = {
  wind: vegetationWind, weather: vegetationWeather, distance, route: vegetationRoute,
};

function levelForScore(score: number): CalculatedSeverityLevel {
  return score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : score >= 25 ? "MODERATE" : "LOW";
}

function recommendation(level: CalculatedSeverityLevel): string {
  switch (level) {
    case "CRITICAL": return "Recommend 2nd / 3rd Alarm: Full station dispatch + Tanker relay + Mutual aid standby";
    case "HIGH": return "Recommend 1st Alarm Full Response: Primary pumper + Auxiliary hose deployment";
    case "MODERATE": return "Recommend Standard Response: 1 Fire engine initial response";
    case "LOW": return "Recommend Minor Incident Verification: Single crew response";
  }
}

function assessment(score: number, factors: string[], weights: Record<string, number>): SeverityAssessment {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const level = levelForScore(clamped);
  return { score: clamped, level, alarmRecommendation: recommendation(level),
    factors: factors.length ? factors : ["Standard localized incident"], weights };
}

function windCriterion(input: SeverityInput, factors: string[]) {
  const speed = Number.isFinite(input.windSpeedKph) ? Math.max(0, input.windSpeedKph!) : 12;
  if (speed >= 40) {
    factors.push(`Napakalakas na hangin / gale (${Math.round(speed)} km/h)`);
    return 100;
  }
  if (speed >= 25) {
    factors.push(`Malakas ang hangin (${Math.round(speed)} km/h - mabilis kumalat ang apoy)`);
    return 80;
  }
  return speed >= 12 ? 45 : 15;
}

function weatherCriterion(input: SeverityInput, factors: string[]) {
  const temperature = Number.isFinite(input.temperatureC) ? input.temperatureC! : 29;
  const humidity = Number.isFinite(input.relativeHumidity) ? input.relativeHumidity! : 75;
  if (temperature >= 33 && humidity <= 55) {
    factors.push(`Matinding init at tuyong panahon (${Math.round(temperature)}°C, ${Math.round(humidity)}% RH)`);
    return 100;
  }
  if (temperature >= 31 && humidity <= 65) return 70;
  if (humidity >= 85) return 10;
  return 35;
}

function routeCriterion(input: SeverityInput, factors: string[], vegetation: boolean) {
  switch (input.routeAccessibility) {
    case "INTERIOR_ALLEY_ESKINITA":
      factors.push(vegetation ? "Malayo sa kalsada / off-road area; long hose access needed"
        : "Eskinita / Makipot na looban (Hindi mapasok ng malaking firetruck, kailangan ng mahabang hose)");
      return 100;
    case "DEAD_END_OR_BLOCKED": factors.push("Dead-end o baradong daan"); return 80;
    case "NARROW_STREET": factors.push("Makipot na kalsada (1-lane passage)"); return 50;
    case "WIDE_ROAD": return 10;
    default: return 15;
  }
}

function structuralSeverity(input: SeverityInput): SeverityAssessment {
  const factors: string[] = [];
  let densityScore = 30;
  if (input.houseDensity === "PACKED_MAGKAKADIKIT") {
    densityScore = 100;
    factors.push("Dikit-dikit na kabahayan (High conflagration risk)");
  } else if (input.houseDensity === "ISOLATED_FAR" || input.houseDensity === "MODERATE_SPACING") {
    densityScore = 10;
    factors.push("Magkakalayo na bahay (> 15m)");
  }
  const windScore = windCriterion(input, factors);
  let structureScore = 40;
  if (input.structureMaterial === "LIGHT_MATERIALS"
    || (!input.structureMaterial && input.houseDensity === "PACKED_MAGKAKADIKIT")) {
    structureScore = 100;
    factors.push("Light combustible materials (Kahoy/Kawayan/Nipa)");
  } else if (input.structureMaterial === "COMMERCIAL_STORAGE") {
    structureScore = 90;
    factors.push("Commercial / Storage / Flammable materials");
  } else if (input.structureMaterial === "MIXED_SEMI_CONCRETE") {
    structureScore = 55;
    factors.push("Semi-concrete structure");
  } else if (input.structureMaterial === "CONCRETE") structureScore = 20;
  const routeScore = routeCriterion(input, factors, false);
  const weatherScore = weatherCriterion(input, factors);
  return assessment(density * densityScore + wind * windScore + structure * structureScore
    + route * routeScore + weather * weatherScore, factors, AHP_WEIGHTS);
}

function vegetationSeverity(input: SeverityInput): SeverityAssessment {
  const factors: string[] = [];
  const windScore = windCriterion(input, factors);
  const weatherScore = weatherCriterion(input, factors);
  const meters = input.nearestBuildingDistanceMeters;
  let distanceScore = 30; // Unknown distance is neutral, never treated as remote.
  if (meters != null && Number.isFinite(meters) && meters >= 0) {
    distanceScore = meters < 50 ? 100 : meters < 200 ? 60 : meters < 500 ? 30 : 10;
    if (meters < 500) factors.push(`Nearest mapped building ${Math.round(meters)} m away (occupancy unverified)`);
  } else {
    factors.push("Nearest mapped building distance unavailable");
  }
  const routeScore = routeCriterion(input, factors, true);
  return assessment(vegetationWind * windScore + vegetationWeather * weatherScore
    + distance * distanceScore + vegetationRoute * routeScore, factors, VEGETATION_AHP_WEIGHTS);
}

function ruleSeverity(level: "LOW" | "MODERATE" | "HIGH", factors: string[]): SeverityAssessment {
  const representativeScore = { LOW: 15, MODERATE: 40, HIGH: 60 }[level];
  return assessment(representativeScore, factors, {});
}

export function calculateFireSeverity(input: SeverityInput): SeverityAssessment {
  if (input.fireType === "GRASS" || input.fireType === "FOREST") return vegetationSeverity(input);
  if (input.fireType === "VEHICLE") {
    const factors: string[] = [];
    if (input.houseDensity === "PACKED_MAGKAKADIKIT") factors.push("Vehicle fire among closely built houses");
    if (["NARROW_STREET", "INTERIOR_ALLEY_ESKINITA", "DEAD_END_OR_BLOCKED"].includes(input.routeAccessibility ?? "")) {
      factors.push("Vehicle fire on a narrow or blocked road");
    }
    return ruleSeverity(factors.length ? "HIGH" : "MODERATE", factors.length ? factors : ["Vehicle fire: standard response"]);
  }
  if (input.fireType === "OTHER") {
    const factors: string[] = [];
    if (input.houseDensity === "PACKED_MAGKAKADIKIT") factors.push("Rubbish fire beside closely built houses");
    if (Number.isFinite(input.windSpeedKph) && input.windSpeedKph! >= 25) {
      factors.push(`Rubbish fire with wind ${Math.round(input.windSpeedKph!)} km/h`);
    }
    return ruleSeverity(factors.length ? "MODERATE" : "LOW", factors.length ? factors : ["Localized rubbish fire"]);
  }
  return structuralSeverity(input);
}
