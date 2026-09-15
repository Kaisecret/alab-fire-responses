export type MunicipalReportRow = {
  id: string;
  referenceNumber: string;
  municipalityId: string;
  municipalityName: string;
  barangay: string;
  reportSource: "ALAB_APP" | "PHONE_CALL";
  fireType: string;
  severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNKNOWN";
  status: string;
  latitude: number;
  longitude: number;
  submittedAt: string;
  responseStartedAt: string | null;
  recordedArrivalAt: string | null;
  resolvedAt: string | null;
  latestDispatchSummary: string | null;
  timeToResponseMinutes: number | null;
  timeToArrivalMinutes: number | null;
  timeToResolutionMinutes: number | null;
  reporterName?: string;
  reporterPhone?: string;
  nearestLandmark?: string | null;
  addressLabel?: string | null;
  description?: string;
  locationMethod?: string | null;
  locationAccuracyMeters?: number | null;
};

export type MunicipalTimelineEvent = {
  stage: string;
  timestamp: string;
  notes: string | null;
};

export type MunicipalDispatchRecipient = {
  userId: string;
  name: string;
  status: string;
  assignedAt: string;
  acknowledgedAt: string | null;
  enRouteAt: string | null;
  onSceneAt: string | null;
  completedAt: string | null;
};

export type MunicipalDispatchRecord = {
  id: string;
  status: string;
  dispatchedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  stationName: string;
  recipients: MunicipalDispatchRecipient[];
};

export type MunicipalReportDetail = MunicipalReportRow & {
  description: string;
  addressLabel: string | null;
  photos: string[];
  timeline: MunicipalTimelineEvent[];
  dispatches: MunicipalDispatchRecord[];
};

export type MunicipalReportPeriod =
  | "THIS_MONTH"
  | "THIS_WEEK"
  | "LAST_MONTH"
  | "THIS_YEAR"
  | "CUSTOM"
  | "ALL";

export type MunicipalReportFilters = {
  page: number;
  pageSize: 25 | 50 | 100;
  period?: MunicipalReportPeriod;
  from?: string;
  to?: string;
  barangayId?: string;
  status?: string;
  fireType?: string;
  severity?: string;
  reportSource?: "ALAB_APP" | "PHONE_CALL";
  search?: string;
};

export type MunicipalBarangaySummary = {
  barangayId: string;
  barangayName: string;
  total: number;
  confirmed: number;
  resolved: number;
  falseReport: number;
  avgArrivalMinutes: number | null;
  arrivalCount: number;
};

export type MunicipalReportTimingMetrics = {
  avgResponseMinutes: number | null;
  avgArrivalMinutes: number | null;
  avgResolutionMinutes: number | null;
  responseRecordsCount: number;
  arrivalRecordsCount: number;
  resolutionRecordsCount: number;
};

export type MunicipalReportSummary = {
  totalReports: number;
  confirmedIncidents: number;
  resolvedIncidents: number;
  unresolvedConfirmedIncidents: number;
  administrativeOutcomes: number;
  pendingIntake: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  byFireType: Record<string, number>;
  bySeverity: Record<string, number>;
  timingMetrics: MunicipalReportTimingMetrics;
  byBarangay: MunicipalBarangaySummary[];
  dateBoundaries: {
    from: string | null;
    to: string | null;
  };
  generatedAt: string;
};

export type MunicipalExportDataset =
  | "INCIDENT_REGISTER"
  | "MUNICIPAL_SUMMARY"
  | "BARANGAY_BREAKDOWN"
  | "INCIDENT_DOSSIER";

export type MunicipalExportScope = "ALL_MATCHING" | "SELECTED" | "CURRENT_PAGE";

export type MunicipalExportFormat = "CSV" | "PDF";

export type MunicipalExportOptions = {
  dataset: MunicipalExportDataset;
  scope: MunicipalExportScope;
  format: MunicipalExportFormat;
  selectedIds?: string[];
  /** Signature name printed on a PDF export; defaults to the actor's own name. */
  preparedBy?: string;
  /** Required by the INCIDENT_DOSSIER dataset: the single report to render. */
  reportId?: string;
};

export type MunicipalExportResult = {
  csvContent: string;
  /** Present only for PDF exports; CSV exports carry their text in csvContent. */
  pdfContent?: Buffer;
  fileName: string;
  rowCount: number;
};
