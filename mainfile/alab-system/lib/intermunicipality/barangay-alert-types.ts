export type BarangayNearbyMunicipality = {
  municipalityId: string;
  municipalityName: string;
  stationId: string;
  stationName: string;
  distanceMeters: number;
};

export type BarangayAlertCommand = {
  id: string;
  recipientMunicipalityId: string;
  recipientMunicipalityName: string;
  status: string;
};

export type BarangayAlertIncident = {
  id: string;
  referenceNumber: string;
  status: string;
  fireType: string | null;
  barangay: string | null;
  dispatched: boolean;
  nearbyMunicipalities: BarangayNearbyMunicipality[];
  commands: BarangayAlertCommand[];
};

// One alert per municipality with three or more active reports in any barangays.
export type BarangayAlert = {
  id: string;
  municipalityId: string;
  municipalityName: string;
  incidentCount: number;
  openedAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  incidentIds: string[];
  incidents: BarangayAlertIncident[];
};

export type BarangayResourceCommand = {
  alertId: string;
  fireReportId: string;
  recipientMunicipalityId: string;
  requestedFiretrucks: number;
  requestedPersonnel: number;
};
