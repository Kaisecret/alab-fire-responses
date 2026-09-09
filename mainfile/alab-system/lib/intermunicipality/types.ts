export const ASSISTANCE_STATUSES = [
  "REQUESTED",
  "ACCEPTED",
  "PARTIALLY_ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
] as const;

export type AssistanceStatus = typeof ASSISTANCE_STATUSES[number];
export type MunicipalIncidentAccessScope = "ORIGIN" | "OBSERVER";

export type StationCandidate = {
  stationId: string;
  stationName: string;
  municipalityId: string;
  municipalityName: string;
  latitude: number;
  longitude: number;
};

export type NearbyMunicipalityCandidate = StationCandidate & {
  distanceMeters: number;
};

export type NearbyObserver = {
  observerId: string;
  municipalityId: string;
  municipalityName: string;
  stationId: string;
  stationName: string;
  distanceMeters: number;
  status: "ACTIVE" | "ENDED";
  acknowledgedByUserId: string | null;
  acknowledgedByDisplayName: string | null;
  acknowledgedAt: string | null;
  monitoringState: "WAITING" | "SEEN" | "BACKUP_REQUESTED";
  assistanceStatus: AssistanceStatus | null;
};

export type AssistanceRequestSummary = {
  id: string;
  recipientMunicipalityId: string;
  recipientMunicipalityName: string;
  requestedFiretrucks: number;
  requestedPersonnel: number;
  offeredFiretrucks: number | null;
  offeredPersonnel: number | null;
  requestNote: string | null;
  responseNote: string | null;
  status: AssistanceStatus;
  requestedAt: string;
  respondedAt: string | null;
  completedAt: string | null;
};
