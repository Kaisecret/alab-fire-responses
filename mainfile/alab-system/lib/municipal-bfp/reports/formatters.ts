export function formatPhilippineDateTime(
  isoString: string | Date | null | undefined,
): string {
  if (!isoString) return "Not recorded";
  const date = typeof isoString === "string" ? new Date(isoString) : isoString;
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatPhilippineDate(
  isoString: string | Date | null | undefined,
): string {
  if (!isoString) return "Not recorded";
  const date = typeof isoString === "string" ? new Date(isoString) : isoString;
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatPhilippineTime(
  isoString: string | Date | null | undefined,
): string {
  if (!isoString) return "Not recorded";
  const date = typeof isoString === "string" ? new Date(isoString) : isoString;
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return "Not recorded";
  }
  if (minutes < 1) {
    return `${Math.round(minutes * 60)} secs`;
  }
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
}

export function getFireTypeLabel(fireType: string): string {
  switch (fireType) {
    case "HOUSE_BUILDING":
      return "Structure Fire";
    case "GRASS":
      return "Grass Fire";
    case "FOREST":
      return "Forest Fire";
    case "VEHICLE":
      return "Vehicle Fire";
    case "OTHER":
      return "Other Fire";
    default:
      return fireType || "Unspecified";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "SUBMITTED":
      return "Submitted";
    case "PENDING_VERIFICATION":
    case "UNDER_VERIFICATION":
      return "Under Verification";
    case "VERIFIED":
    case "CONFIRMED":
      return "Confirmed";
    case "RESPONDING":
      return "Responding";
    case "FIRETRUCK_DISPATCHED":
      return "Dispatched";
    case "RESPONDER_ARRIVED":
      return "Arrived On Scene";
    case "UNDER_CONTROL":
      return "Under Control";
    case "RESOLVED":
      return "Resolved";
    case "CLOSED":
      return "Closed";
    case "FALSE_REPORT":
      return "False Report";
    case "DUPLICATE":
      return "Duplicate";
    case "REJECTED":
      return "Rejected";
    case "NEEDS_MORE_INFO":
      return "Needs More Info";
    default:
      return status;
  }
}

export function getSeverityLabel(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "Critical";
    case "HIGH":
      return "High";
    case "MODERATE":
      return "Moderate";
    case "LOW":
      return "Low";
    case "UNKNOWN":
    default:
      return "Unknown";
  }
}
