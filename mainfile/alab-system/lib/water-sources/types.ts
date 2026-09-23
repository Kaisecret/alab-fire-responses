export type WaterSourceKind = "FIRE_HYDRANT" | "WATER_SOURCE";
export type WaterSourceOrigin = "BFP_LOCATOR_CHART_2018" | "MUNICIPAL_ENTRY";

export type WaterSource = {
  id: string;
  municipalityId: string;
  municipalityName: string;
  sourceKind: WaterSourceKind;
  quantity: number;
  exactLocation: string;
  latitude: number;
  longitude: number;
  typeColor: string;
  recordOrigin: WaterSourceOrigin;
  createdAt: Date | string;
};

export type WaterSourceSummary = {
  sourceCount: number;
  totalQuantity: number;
  fireHydrantCount: number;
  waterSourceCount: number;
  importedCount: number;
  manualCount: number;
};

export type MunicipalityWaterSourceSummary = WaterSourceSummary & {
  municipalityId: string;
  municipalityName: string;
};

export type CreateWaterSourceInput = {
  sourceKind: WaterSourceKind;
  quantity: number;
  exactLocation: string;
  latitude: number;
  longitude: number;
  typeColor: string;
};

export type UpdateMunicipalWaterSourceInput = Pick<
  CreateWaterSourceInput,
  "exactLocation" | "quantity"
>;

export type UpdateProvincialWaterSourceCoordinatesInput = Pick<
  CreateWaterSourceInput,
  "latitude" | "longitude"
>;

export type MunicipalWaterSourceRegistry = {
  municipality: { id: string; name: string };
  summary: WaterSourceSummary;
  sources: WaterSource[];
};

export type ProvincialWaterSourceRegistry = {
  municipalities: MunicipalityWaterSourceSummary[];
  sources: WaterSource[];
};
