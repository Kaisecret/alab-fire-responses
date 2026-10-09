// Decision support for the officer reading a report: what the BFP should do
// first, given the same conditions the Level of Danger was scored from. The
// thresholds match severity.ts so a condition that raised the score always
// has a step here. Every step is advice; the officer in charge decides.

export type ResponseGuidanceInput = {
  level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | null | undefined;
  fireType: string;
  fireTypes?: readonly string[] | null;
  houseDensity?: string | null;
  structureMaterial?: string | null;
  routeAccessibility?: string | null;
  windSpeedKmh?: number | string | null;
  windDirectionDeg?: number | string | null;
  temperatureC?: number | string | null;
  humidity?: number | string | null;
  factors?: readonly string[] | null;
};

export type GuidanceAction = {
  key: string;
  title: string;
  detail: string;
  reason: string;
};

const INITIAL_RESPONSE: Record<NonNullable<ResponseGuidanceInput["level"]>, Pick<GuidanceAction, "title" | "detail">> = {
  CRITICAL: {
    title: "Send every available truck now",
    detail: "Ask Provincial BFP to declare a 2nd alarm before the first truck arrives.",
  },
  HIGH: {
    title: "Send all available trucks from the station",
    detail: "Keep the backup request ready. Ask Provincial BFP for a 2nd alarm if the fire reaches the next house.",
  },
  MODERATE: {
    title: "Send 1 fire truck with a full crew",
    detail: "Size up on arrival and request more trucks if the fire grows.",
  },
  LOW: {
    title: "Send 1 crew to check and put out the fire",
    detail: "Confirm the fire on arrival. Request a truck if it is bigger than reported.",
  },
};

const COMPASS = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
const STRONG_WIND_KMH = 25;
const NEAR_BUILDING_METERS = 200;

function numberOrNull(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compass(degrees: number) {
  return COMPASS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}

function nearestBuildingMeters(factors: readonly string[] | null | undefined) {
  for (const factor of factors ?? []) {
    const match = /Nearest mapped building (\d+) m away/.exec(factor);
    if (match) return Number(match[1]);
  }
  return null;
}

export function buildResponseGuidance(input: ResponseGuidanceInput): GuidanceAction[] {
  const types = new Set(input.fireTypes?.length ? input.fireTypes : [input.fireType]);
  const structural = types.has("HOUSE_BUILDING");
  const vegetation = types.has("GRASS") || types.has("FOREST");
  const packed = input.houseDensity === "PACKED_MAGKAKADIKIT";
  const actions: GuidanceAction[] = [];

  actions.push(input.level
    ? { key: "initial", ...INITIAL_RESPONSE[input.level], reason: `Level of Danger: ${input.level}` }
    : {
      key: "initial",
      title: "Send 1 fire truck and size up on arrival",
      detail: "The Level of Danger is not computed yet. Request more trucks once the crew sees the fire.",
      reason: "Level of Danger: not assessed",
    });

  if (packed && (structural || types.has("VEHICLE") || types.has("OTHER"))) {
    actions.push({
      key: "exposure",
      title: "Protect the houses beside the fire first",
      detail: "Wet the walls and roofs of the nearest houses so the fire cannot jump to them.",
      reason: "Houses are close together",
    });
  }

  if (structural) {
    const lightHouse = input.structureMaterial === "LIGHT_MATERIALS" || input.structureMaterial === "LIGHT_WITH_FLAMMABLE";
    const flammableGoods = input.structureMaterial === "COMMERCIAL_STORAGE"
      || input.structureMaterial === "LIGHT_WITH_FLAMMABLE"
      || input.structureMaterial === "MIXED_WITH_FLAMMABLE";
    if (lightHouse || (!input.structureMaterial && packed)) {
      actions.push({
        key: "fast-spread",
        title: "Expect fast spread: lay 2 hose lines early",
        detail: "Put one line on the fire and one on the nearest exposed house.",
        reason: lightHouse
          ? "Light materials reported (kahoy / kawayan / nipa)"
          : "Light materials assumed (houses close together, material not reported)",
      });
    }
    if (flammableGoods) {
      actions.push({
        key: "stored-hazard",
        title: "Ask what is stored before going in",
        detail: "Fuel, chemicals or LPG tanks may be inside. Keep a safe distance and use foam on fuel fires.",
        reason: input.structureMaterial === "COMMERCIAL_STORAGE" ? "Commercial / storage building" : "Flammable goods reported inside",
      });
    }
  }

  const windSpeed = numberOrNull(input.windSpeedKmh);
  if (windSpeed !== null && windSpeed >= STRONG_WIND_KMH) {
    const from = numberOrNull(input.windDirectionDeg);
    actions.push({
      key: "wind",
      title: "Attack from upwind and watch the downwind side",
      detail: from === null
        ? "Post a hose line on the downwind side to catch flying embers."
        : `The wind blows from the ${compass(from)} toward the ${compass(from + 180)}. Post a hose line on the downwind side to catch flying embers.`,
      reason: `Wind ${Math.round(windSpeed)} km/h`,
    });
  }

  const temperature = numberOrNull(input.temperatureC);
  const humidity = numberOrNull(input.humidity);
  if (temperature !== null && humidity !== null && temperature >= 33 && humidity <= 55) {
    actions.push({
      key: "heat",
      title: "Rotate crews and bring drinking water",
      detail: "Hot, dry air dries nearby materials and tires the crew quickly.",
      reason: `${Math.round(temperature)}°C, ${Math.round(humidity)}% RH`,
    });
  }

  switch (input.routeAccessibility) {
    case "INTERIOR_ALLEY_ESKINITA":
      actions.push(structural || !vegetation
        ? {
          key: "access",
          title: "Big truck cannot enter: park at the road and lay long hose",
          detail: "Bring extra hose lengths and a portable pump if the station has one.",
          reason: "Narrow alley / restricted access",
        }
        : {
          key: "access",
          title: "The fire is far from the road: carry the equipment in",
          detail: "Bring extra hose lengths, fire beaters and backpack sprayers.",
          reason: "Off-road area",
        });
      break;
    case "DEAD_END_OR_BLOCKED":
      actions.push({
        key: "access",
        title: "Park so the truck can drive out",
        detail: "Ask barangay tanods to clear the road before the truck arrives.",
        reason: "Dead end or blocked road",
      });
      break;
    case "NARROW_STREET":
      actions.push({
        key: "access",
        title: "Ask barangay tanods to clear the street",
        detail: "One-lane road: move parked vehicles and stop traffic so the truck can pass.",
        reason: "Narrow street (one lane)",
      });
      break;
  }

  if (vegetation) {
    const meters = nearestBuildingMeters(input.factors);
    if (meters !== null && meters < NEAR_BUILDING_METERS) {
      actions.push({
        key: "firebreak",
        title: "Cut a firebreak between the fire and the houses",
        detail: "Clear grass and brush in a wide strip, then protect the buildings before chasing the fire.",
        reason: `Nearest mapped building ${meters} m away`,
      });
    }
    actions.push({
      key: "vegetation",
      title: "Work from the burned edge and watch for wind shifts",
      detail: "Keep an escape route into the already-burned area.",
      reason: "Grass or forest fire",
    });
  }

  if (types.has("VEHICLE")) {
    actions.push({
      key: "vehicle",
      title: "Keep 15 m back from the burning vehicle",
      detail: "The fuel tank, tires and airbags can burst. Use foam or dry chemical on fuel, and cut the battery when safe.",
      reason: "Vehicle fire",
    });
  }

  if (types.has("OTHER")) {
    actions.push({
      key: "rubbish",
      title: "Wear breathing protection: the smoke may be toxic",
      detail: "Burning plastic, tires or chemicals give off toxic smoke. Keep residents upwind.",
      reason: "Rubbish fire",
    });
  }

  actions.push({
    key: "coordinate",
    title: "Coordinate with the barangay and the reporter",
    detail: "Call the reporter to confirm the exact spot. Ask barangay officials to clear the road and move nearby residents away.",
    reason: "Standard step",
  });

  return actions;
}
