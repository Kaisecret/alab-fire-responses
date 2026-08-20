export type ResidentDashboardBucket = "submitted" | "verifying" | "responding" | "closed";

export function residentDashboardBucket(status: string): ResidentDashboardBucket {
  switch (status) {
    case "SUBMITTED":
    case "PENDING_VERIFICATION":
      return "submitted";
    case "UNDER_VERIFICATION":
    case "NEEDS_MORE_INFO":
    case "VERIFIED":
    case "CONFIRMED":
      return "verifying";
    case "RESPONDING":
    case "FIRETRUCK_DISPATCHED":
    case "RESPONDER_ARRIVED":
    case "UNDER_CONTROL":
      return "responding";
    case "RESOLVED":
    case "CLOSED":
    case "REJECTED":
    case "FALSE_REPORT":
    case "DUPLICATE":
      return "closed";
    default:
      return "submitted";
  }
}
