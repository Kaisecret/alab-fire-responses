import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMunicipalReportPdf, context } from './municipal-pdf-fixture.mjs';

test('a short incident dossier fits on one page without a footer-only page', async () => {
  const pdf = await buildMunicipalReportPdf(context);
  assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length, 1);
});

test('a long narrative and timeline produce valid continuation pages', async () => {
  const pdf = await buildMunicipalReportPdf({ ...context, detail: {
    ...context.detail,
    description: 'A detailed witness statement that must remain legible. '.repeat(160),
    timeline: Array.from({length: 30}, (_, index) => ({
      stage: 'RESPONDING', timestamp: '2026-09-14T15:00:00Z',
      notes: `Event ${index + 1}: ` + 'Recorded operational detail. '.repeat(20),
    })),
  }});
  assert.ok((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length > 1);
  assert.ok(pdf.subarray(0, 8).toString().startsWith('%PDF-1.'));
});
