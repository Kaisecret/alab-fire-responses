import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadServerModule } from './helpers/load-server-module.mjs';
import { buildMunicipalReportPdf } from './municipal-pdf-fixture.mjs';

const formatters = loadServerModule('lib/municipal-bfp/reports/formatters.ts', {});
const actor = { userId: 'marshal', role: 'PROVINCIAL_BFP', province: 'Antique' };

const detail = {
  id: '2f1d6c1a-6b2f-4f71-9a1f-4f2c1d6c1a2f',
  referenceNumber: 'ALAB-20260920-1B5887',
  municipalityId: 'a4ba607b-8863-4f0f-bcaf-a86beb0acb29',
  municipalityName: 'Hamtic',
  barangay: 'Mapatag',
  reportSource: 'ALAB_APP',
  fireType: 'HOUSE_BUILDING',
  severity: 'HIGH',
  status: 'RESPONDER_ARRIVED',
  latitude: 10.613091,
  longitude: 121.970595,
  submittedAt: '2026-09-20T15:29:00.000Z',
  responseStartedAt: '2026-09-20T15:30:08.000Z',
  recordedArrivalAt: '2026-09-20T15:41:00.000Z',
  resolvedAt: null,
  latestDispatchSummary: 'Dispatch ACTIVE (1 stations, 2 responders)',
  description: 'Smoke seen from the roofline.',
  reporterNameSnapshot: 'manjiro sano',
  reporterPhoneSnapshot: '09109975737',
  addressLabel: 'Mapatag, Hamtic, Antique',
  nearestLandmark: 'Anini-y-Tobias Fornier Road',
  locationMethod: 'GPS',
  locationAccuracyMeters: 100,
  photos: [],
  dispatches: [{
    id: 'dispatch-1',
    status: 'ACTIVE',
    dispatchedAt: '2026-09-20T15:30:30.000Z',
    completedAt: null,
    cancelledAt: null,
    stations: [{ stationId: 'station-1', stationName: 'Hamtic Fire Station' }],
    recipients: [{
      userId: 'responder-1', name: 'FO1 Cruz', status: 'ON_SCENE',
      assignedAt: '2026-09-20T15:30:30.000Z', acknowledgedAt: '2026-09-20T15:31:00.000Z',
      enRouteAt: '2026-09-20T15:32:00.000Z', onSceneAt: '2026-09-20T15:41:00.000Z', completedAt: null,
    }],
    stationName: 'Hamtic Fire Station',
  }],
  timeline: [
    { stage: 'SUBMITTED', timestamp: '2026-09-20T15:29:00.000Z', notes: 'Citizen intake recorded.', actor: null },
    { stage: 'RESPONDER_ARRIVED', timestamp: '2026-09-20T15:41:00.000Z', notes: null, actor: null },
  ],
};

const emptySummary = {
  totalReports: 0, byStatus: {}, bySource: { ALAB_APP: 0, PHONE_CALL: 0 }, byFireType: {},
  byMunicipality: [], timingMetrics: { avgResponseMinutes: null, avgResolutionMinutes: null },
  dateBoundaries: { from: null, to: null },
};

/** Loads the provincial export builder with the PDF step captured, not rendered. */
function loadExports({ report = detail } = {}) {
  const captured = [];
  const module = loadServerModule('lib/provincial-bfp/management/report-exports.ts', {
    '../../municipal-bfp/reports/excel': { buildMunicipalReportExcel: async () => Buffer.from('xlsx') },
    '../../municipal-bfp/reports/formatters': formatters,
    '../../municipal-bfp/reports/pdf': {
      buildMunicipalReportPdf: async (context) => { captured.push(context); return Buffer.from('%PDF-1.7 stub'); },
    },
    './reports': {
      getProvincialReport: async (_actor, id) => (report && id === report.id ? report : null),
      listProvincialReports: async () => ({ items: [], total: 0, page: 1, pageSize: 100, totalPages: 1 }),
    },
    './report-summaries': { getProvincialReportSummary: async () => emptySummary },
  });
  return { module, captured };
}

const dossierInput = {
  actor,
  filters: { page: 1, pageSize: 25 },
  dataset: 'INCIDENT_DOSSIER',
  format: 'PDF',
  preparedBy: 'Provincial BFP',
  reportId: detail.id,
};

test('the provincial dossier maps one record onto the municipal incident report', async () => {
  const { module, captured } = loadExports();
  const result = await module.buildProvincialReportExport(dossierInput);

  assert.equal(result.contentType, 'application/pdf');
  assert.equal(result.fileName, 'alab-provincial-incident-alab-20260920-1b5887.pdf');

  assert.equal(captured.length, 1);
  const context = captured[0];
  assert.equal(context.kind, 'INCIDENT_DOSSIER');
  // The dossier is one station's record, so the letterhead names that station.
  assert.equal(context.municipalityName, 'Hamtic');

  const carried = context.detail;
  assert.equal(carried.referenceNumber, detail.referenceNumber);
  assert.equal(carried.reporterName, 'manjiro sano');
  assert.equal(carried.reporterPhone, '09109975737');
  assert.equal(carried.nearestLandmark, 'Anini-y-Tobias Fornier Road');
  assert.equal(carried.locationMethod, 'GPS');
  assert.equal(carried.locationAccuracyMeters, 100);
  assert.equal(carried.description, 'Smoke seen from the roofline.');
  assert.equal(carried.recordedArrivalAt, detail.recordedArrivalAt);
  assert.equal(carried.timeToArrivalMinutes, 12);
  assert.equal(carried.timeToResponseMinutes, 1);
  assert.equal(carried.timeToResolutionMinutes, null);
  assert.equal(carried.dispatches[0].stationName, 'Hamtic Fire Station');
  assert.equal(carried.dispatches[0].recipients[0].onSceneAt, '2026-09-20T15:41:00.000Z');
  assert.deepEqual(carried.timeline.map((event) => event.stage), ['SUBMITTED', 'RESPONDER_ARRIVED']);
});

test('the provincial dossier renders a real PDF through the municipal builder', async () => {
  const { module, captured } = loadExports();
  await module.buildProvincialReportExport(dossierInput);

  const pdf = await buildMunicipalReportPdf(captured[0]);
  assert.ok(pdf.subarray(0, 8).toString().startsWith('%PDF-1.'));
  const text = pdf.toString('latin1');
  assert.ok((text.match(/\/Type \/Page\b/g) ?? []).length >= 1);
});

test('the provincial dossier refuses a non-PDF format and an unknown record', async () => {
  const { module } = loadExports();
  await assert.rejects(
    () => module.buildProvincialReportExport({ ...dossierInput, format: 'CSV' }),
    /INVALID_FORMAT/,
  );
  await assert.rejects(
    () => module.buildProvincialReportExport({ ...dossierInput, reportId: 'not-a-uuid' }),
    /INVALID_SELECTION/,
  );
  await assert.rejects(
    () => module.buildProvincialReportExport({ ...dossierInput, reportId: '00000000-0000-4000-8000-000000000000' }),
    /INVALID_SELECTION/,
  );
});

test('the provincial detail query reads the telemetry the dossier prints', () => {
  const service = readFileSync('lib/provincial-bfp/management/reports.ts', 'utf8');
  for (const column of ['address_label', 'nearest_landmark', 'location_method', 'location_accuracy_meters']) {
    assert.match(service, new RegExp(column));
  }
  // Arrival is the earliest on-scene stamp that is not older than the intake.
  assert.match(service, /recordedArrivalAt/);
  assert.match(service, /r\.on_scene_at >= fr\.submitted_at/);
});

test('the provincial dossier modal offers the same Download PDF a station has', () => {
  const modal = readFileSync('app/_components/provincial-report-detail.tsx', 'utf8');
  assert.match(modal, /Download PDF/);
  assert.match(modal, /INCIDENT_DOSSIER/);
  assert.match(modal, /api\/provincial-bfp\/reports\/export/);
  assert.match(modal, /Content-Disposition/);

  const route = readFileSync('app/api/provincial-bfp/reports/export/route.ts', 'utf8');
  assert.match(route, /INCIDENT_DOSSIER/);
  assert.match(route, /reportId/);
});
