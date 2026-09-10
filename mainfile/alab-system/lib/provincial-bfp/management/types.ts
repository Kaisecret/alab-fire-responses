export type ManagementFilters = {
  municipalityId?: string;
  stationId?: string;
  barangayId?: string;
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: 25 | 50 | 100;
};

export type ManagementPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
  updatedAt?: string;
};

export type ManagementActor = {
  userId: string;
  role: "PROVINCIAL_BFP";
  province: "Antique";
};

export type MutationContext = {
  actor: ManagementActor;
  requestId: string;
  expectedVersion?: string;
  reason?: string;
};

export type ReportFilters = ManagementFilters & {
  reportSource?: "ALAB_APP" | "PHONE_CALL";
  fireType?: string;
  severity?: string;
};

export type MunicipalitySummary = {
  id: string;
  name: string;
  province: "Antique";
  stationCount: number;
  personnelCount: number;
  residentCount: number;
  pendingApplicationCount: number;
  totalReportCount: number;
  totalFireReportCount: number;
  activeIncidentCount: number;
  resolvedIncidentCount: number;
  updatedAt: string;
};

export type ManagedStation = {
  id: string;
  name: string;
  stationName: string;
  municipalityId: string;
  municipalityName: string;
  stationType: string;
  status: "ACTIVE" | "INACTIVE";
  latitude: number;
  longitude: number;
  personnelCount: number;
  activePersonnelCount: number;
  activeDispatchCount: number;
  createdAt: string;
  updatedAt: string;
};

export type StationInput = {
  name?: string;
  stationName?: string;
  stationType?: string;
  municipalityId?: string;
  latitude: number;
  longitude: number;
  action?: "UPDATE" | "DEACTIVATE" | "REACTIVATE";
};

export type ManagedPersonnel = {
  userId: string;
  profileId: string;
  email: string;
  displayName: string;
  rankOrPosition: string | null;
  municipalityId: string | null;
  municipalityName: string | null;
  stationId: string | null;
  stationName: string | null;
  assignmentRole: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF" | null;
  accountStatus: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
};

export type PersonnelInput = {
  displayName?: string;
  email?: string;
  rankOrPosition?: string;
  municipalityId?: string;
  stationId?: string;
  assignmentRole?: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF";
  temporaryPassword?: string;
  action?: "UPDATE" | "ASSIGN_STATION" | "TRANSFER_MUNICIPALITY" | "SUSPEND" | "REACTIVATE";
};

export type ManagedResident = {
  userId: string;
  profileId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  municipalityId: string | null;
  municipalityName: string | null;
  barangayId: string | null;
  barangayName: string | null;
  completeAddress: string | null;
  accountStatus: "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED";
  latestApplicationStatus: "PENDING" | "VERIFIED" | "CHANGES_REQUESTED" | "NO_APPLICATION";
  latestApplicationReference: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ManagedApplication = {
  id: string;
  reference: string;
  residentProfileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  municipalityId: string;
  municipalityName: string;
  barangayId: string;
  barangayName: string;
  address: string;
  status: "PENDING" | "VERIFIED" | "CHANGES_REQUESTED";
  submissionNumber: number;
  correctionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  evidence?: {
    frontUrl: string | null;
    backUrl: string | null;
    selfieUrl: string | null;
  };
  events?: Array<{
    id: string;
    eventType: string;
    notes: string | null;
    createdAt: string;
  }>;
};

export type ProvincialReportRow = {
  id: string;
  referenceNumber: string;
  municipalityId: string;
  municipalityName: string;
  barangay: string;
  reportSource: "ALAB_APP" | "PHONE_CALL";
  fireType: string;
  severity: string;
  status: string;
  latitude: number;
  longitude: number;
  submittedAt: string;
  responseStartedAt: string | null;
  resolvedAt: string | null;
  latestDispatchSummary: string | null;
};

export type ProvincialReportDetail = ProvincialReportRow & {
  description: string;
  reporterNameSnapshot: string;
  reporterPhoneSnapshot: string;
  photos: string[];
  dispatches: Array<{
    id: string;
    status: string;
    dispatchedAt: string;
    completedAt?: string | null;
    cancelledAt?: string | null;
    stations?: Array<{ stationId: string; stationName: string }>;
    recipients?: Array<{
      userId: string;
      name: string;
      status: string;
      assignedAt: string;
      acknowledgedAt: string | null;
      enRouteAt: string | null;
      onSceneAt: string | null;
      completedAt: string | null;
    }>;
    stationName?: string;
  }>;
  assistance?: Array<{
    id: string;
    requesterMunicipality: string;
    recipientMunicipality: string;
    status: string;
    requestedAt: string;
  }>;
  timeline?: Array<{
    stage: string;
    timestamp: string;
    actor: string | null;
    notes: string | null;
  }>;
};

export type ProvincialReportSummary = {
  totalReports: number;
  totalDistinctReports?: number;
  activeIncidents?: number;
  resolvedReports?: number;
  falseReports?: number;
  rejectedReports?: number;
  duplicateReports?: number;
  averageResponseSeconds?: number | null;
  period?: {
    from: string;
    to: string;
  };
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  byMunicipality: Array<{
    municipalityId: string;
    municipalityName: string;
    total: number;
    confirmed: number;
    falseReport: number;
    resolved: number;
  }>;
  byFireType: Record<string, number>;
  timingMetrics: {
    avgResponseMinutes: number | null;
    avgResolutionMinutes: number | null;
  };
  dateBoundaries: {
    from: string | null;
    to: string | null;
  };
  municipalities?: Array<{
    id: string;
    name: string;
    total: number;
    active: number;
    resolved: number;
  }>;
};

export type AuditEvent = {
  id: string;
  actorUserId: string;
  targetType: "STATION" | "PERSONNEL" | "RESIDENT" | "APPLICATION" | "MUNICIPALITY" | "FIRE_REPORT" | "EXPORT";
  targetId: string;
  municipalityId: string | null;
  municipalityName?: string | null;
  action: string;
  reason: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ExportDataset =
  | "STATIONS"
  | "PERSONNEL"
  | "RESIDENTS"
  | "APPLICATIONS"
  | "FIRE_REPORTS"
  | "REPORT_SUMMARY";
