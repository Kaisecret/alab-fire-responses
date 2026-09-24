export type FireTruckStatus = "SERVICEABLE" | "UNSERVICEABLE" | "FOR_BER" | "BER";
export type FireTruckOwnership = "BFP" | "LGU";
export type FireTruckOrigin = "BFP_FIRETRUCK_INVENTORY" | "PROVINCIAL_ENTRY";
export type FireTruckDatePrecision = "DAY" | "MONTH";

export type FireTruck = {
  id: string;
  municipalityId: string;
  municipalityName: string;
  incomeClass: string | null;
  stationId: string;
  stationName: string;
  make: string;
  capacityGallons: number;
  manufacturedYear: number | null;
  /** YYYY-MM-DD; the first of the month when only the month is known. */
  acquiredOn: string | null;
  acquiredPrecision: FireTruckDatePrecision | null;
  /** The acquired date exactly as the inventory sheet printed it. */
  acquiredLabel: string | null;
  operationalStatus: FireTruckStatus;
  ownership: FireTruckOwnership;
  remarks: string | null;
  recordOrigin: FireTruckOrigin;
  createdAt: Date | string;
};

export type FireTruckStation = {
  id: string;
  municipalityId: string;
  stationName: string;
};

export type FireTruckSummary = {
  truckCount: number;
  serviceableCount: number;
  outOfServiceCount: number;
  totalCapacityGallons: number;
};

export type MunicipalityFireTruckSummary = FireTruckSummary & {
  municipalityId: string;
  municipalityName: string;
  incomeClass: string | null;
  stationCount: number;
};

export type CreateFireTruckInput = {
  municipalityId: string;
  stationId: string;
  make: string;
  capacityGallons: number;
  manufacturedYear: number | null;
  acquiredOn: string | null;
  operationalStatus: FireTruckStatus;
  ownership: FireTruckOwnership;
  remarks: string | null;
};

export type MunicipalFireTruckRegistry = {
  municipality: { id: string; name: string; incomeClass: string | null };
  summary: FireTruckSummary;
  stations: FireTruckStation[];
  trucks: FireTruck[];
};

export type ProvincialFireTruckRegistry = {
  municipalities: MunicipalityFireTruckSummary[];
  stations: FireTruckStation[];
  trucks: FireTruck[];
};
