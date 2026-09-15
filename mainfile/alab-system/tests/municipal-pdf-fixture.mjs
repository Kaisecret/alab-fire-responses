import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import { loadServerModule } from "./helpers/load-server-module.mjs";
const formatters = loadServerModule("lib/municipal-bfp/reports/formatters.ts", {});
export const { buildMunicipalReportPdf } = loadServerModule("lib/municipal-bfp/reports/pdf.ts", {
  "node:fs/promises": {readFile}, "node:path": {default:path},
  pdfkit: {default:PDFDocument}, "./formatters": formatters,
});
export const report = {
 id:"test-incident",referenceNumber:"ALAB-20260914-F4BA62",municipalityId:"test",municipalityName:"Hamtic",
 barangay:"Mapatag",reportSource:"ALAB_APP",fireType:"HOUSE_BUILDING",severity:"HIGH",status:"SUBMITTED",
 latitude:10.613359,longitude:121.970950,submittedAt:"2026-09-14T14:50:00Z",responseStartedAt:null,
 recordedArrivalAt:null,resolvedAt:null,latestDispatchSummary:null,timeToResponseMinutes:null,timeToArrivalMinutes:null,
 timeToResolutionMinutes:null,reporterName:"Sample resident",reporterPhone:"09XX XXX XXXX",nearestLandmark:"Anini-y-Tobias Fornier Road",
 addressLabel:"Mapatag, Hamtic, Antique",description:"",locationMethod:"GPS",locationAccuracyMeters:100,photos:[],dispatches:[],
 timeline:[{stage:"SUBMITTED",timestamp:"2026-09-14T14:50:00Z",notes:"Your fire report was submitted and is pending verification."}],
};
export const context = {kind:"INCIDENT_DOSSIER",municipalityName:"Hamtic",preparedBy:"Municipal Fire Marshal",
 periodLabel:"September 2026",filterLabel:"Single incident",rows:[report],summary:null,detail:report};
if (process.argv[2]) await writeFile(process.argv[2], await buildMunicipalReportPdf(context));

