import type { AssistanceStatus } from "./types";

export type AssistanceAction =
  | "ACCEPT"
  | "PARTIAL_ACCEPT"
  | "REJECT"
  | "CANCEL";

function resourceCount(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 500) {
    throw new Error("INVALID_ASSISTANCE_QUANTITY");
  }
  return value;
}

export function validateRequestedResources(
  requestedFiretrucks: number,
  requestedPersonnel: number,
) {
  const result = {
    requestedFiretrucks: resourceCount(requestedFiretrucks),
    requestedPersonnel: resourceCount(requestedPersonnel),
  };
  if (result.requestedFiretrucks === 0 && result.requestedPersonnel === 0) {
    throw new Error("ASSISTANCE_RESOURCES_REQUIRED");
  }
  return result;
}

export function validateAssistanceTransition(
  currentStatus: AssistanceStatus,
  action: AssistanceAction,
  requestedFiretrucks: number,
  requestedPersonnel: number,
  offeredFiretrucks: number,
  offeredPersonnel: number,
) {
  if (currentStatus !== "REQUESTED") {
    throw new Error("ASSISTANCE_STATE_CONFLICT");
  }
  const offered = {
    offeredFiretrucks: resourceCount(offeredFiretrucks),
    offeredPersonnel: resourceCount(offeredPersonnel),
  };
  if (action === "CANCEL") {
    if (offered.offeredFiretrucks !== 0 || offered.offeredPersonnel !== 0) {
      throw new Error("CANCELLED_ASSISTANCE_MUST_OFFER_ZERO");
    }
    return { nextStatus: "CANCELLED" as const, offeredFiretrucks: null, offeredPersonnel: null };
  }
  if (action === "REJECT") {
    if (offered.offeredFiretrucks !== 0 || offered.offeredPersonnel !== 0) {
      throw new Error("REJECTED_ASSISTANCE_MUST_OFFER_ZERO");
    }
    return { nextStatus: "REJECTED" as const, ...offered };
  }
  if (action === "ACCEPT") {
    if (
      offered.offeredFiretrucks !== requestedFiretrucks
      || offered.offeredPersonnel !== requestedPersonnel
    ) {
      throw new Error("ACCEPTED_ASSISTANCE_MUST_MATCH_REQUEST");
    }
    return { nextStatus: "ACCEPTED" as const, ...offered };
  }
  if (action !== "PARTIAL_ACCEPT") throw new Error("INVALID_ASSISTANCE_INPUT");
  const positive = offered.offeredFiretrucks > 0 || offered.offeredPersonnel > 0;
  const withinRequest = offered.offeredFiretrucks <= requestedFiretrucks
    && offered.offeredPersonnel <= requestedPersonnel;
  const isPartial = offered.offeredFiretrucks < requestedFiretrucks
    || offered.offeredPersonnel < requestedPersonnel;
  if (!positive || !withinRequest || !isPartial) {
    throw new Error("INVALID_PARTIAL_ASSISTANCE");
  }
  return { nextStatus: "PARTIALLY_ACCEPTED" as const, ...offered };
}
