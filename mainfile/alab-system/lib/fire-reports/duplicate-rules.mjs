// Pure rules for linking fire reports about the same fire. Kept free of
// database code so the thresholds and stage mapping are unit-tested.

/** Reports this close together are treated as the same fire. */
export const DUPLICATE_RADIUS_METERS = 50;

/** A report only joins an incident that is still open and this recent. */
export const DUPLICATE_WINDOW_HOURS = 12;

/** Statuses that mean the incident is over, so a new report starts a new one. */
export const CLOSED_INCIDENT_STATUSES = ["RESOLVED", "CLOSED", "REJECTED", "FALSE_REPORT", "DUPLICATE"];

export function distanceMeters(fromLatitude, fromLongitude, toLatitude, toLongitude) {
  const radians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = radians(toLatitude - fromLatitude);
  const longitudeDelta = radians(toLongitude - fromLongitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(fromLatitude)) * Math.cos(radians(toLatitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Degrees of latitude/longitude that cover the radius, used as a cheap
 * bounding box before the exact distance check.
 */
export function searchBox(latitude, radiusMeters = DUPLICATE_RADIUS_METERS) {
  const latitudeDelta = radiusMeters / 111_320;
  const longitudeDelta = radiusMeters / (111_320 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01));
  return { latitudeDelta, longitudeDelta };
}

/** The resident-facing stage of a shared incident. */
export function incidentStage(status) {
  switch (status) {
    case "VERIFIED":
    case "CONFIRMED":
      return "ACKNOWLEDGED";
    case "RESPONDING":
    case "FIRETRUCK_DISPATCHED":
      return "RESPONDING";
    case "RESPONDER_ARRIVED":
    case "UNDER_CONTROL":
      return "ON_SCENE";
    case "RESOLVED":
    case "CLOSED":
      return "RESOLVED";
    case "REJECTED":
    case "FALSE_REPORT":
      return "CLOSED";
    default:
      return "REPORTED";
  }
}

export const INCIDENT_STAGES = ["REPORTED", "ACKNOWLEDGED", "RESPONDING", "ON_SCENE", "RESOLVED"];
