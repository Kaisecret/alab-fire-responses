import assert from 'node:assert/strict';
import test from 'node:test';
import { inflateSync } from 'node:zlib';
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

// Text drawn on each page, one line per text operation, read from the PDF itself.
function pageTexts(pdf) {
  const raw = pdf.toString('latin1');
  const pages = [];
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let body;
    try { body = inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1'); } catch { continue; }
    if (!/\bBT\b/.test(body)) continue;
    const lines = [...body.matchAll(/\[([^\]]*)\]\s*TJ/g)].map(op => [...op[1].matchAll(/<([0-9a-fA-F]*)>/g)]
      .map(hex => Buffer.from(hex[1], 'hex').toString('latin1')).join(''));
    pages.push({ body, text: lines.join('\n') });
  }
  return pages;
}

test('exports drop the motto list and section numbers and carry a faint ALAB watermark on every page', async () => {
  const pdf = await buildMunicipalReportPdf({ ...context, detail: {
    ...context.detail,
    description: 'A detailed witness statement that must remain legible. '.repeat(160),
  }});
  const pages = pageTexts(pdf);
  assert.ok(pages.length > 1);
  const text = pages.map(page => page.text).join('\n');
  assert.match(text, /REPORTING CITIZEN/);
  for (const word of ['PREVENT', 'PREPARE', 'RECOVER', 'TOGETHER']) assert.doesNotMatch(text, new RegExp(`^${word}$`, 'm'), `${word} is gone from the letterhead`);
  assert.doesNotMatch(text, /^\d+\n[^\n]*REPORTING CITIZEN/m, 'section headings carry no number');
  const raw = pdf.toString('latin1');
  const faint = [...raw.matchAll(/\/ca (0?\.\d+)/g)].map(match => Number(match[1])).filter(value => value > 0 && value <= 0.12);
  assert.ok(faint.length > 0, 'the watermark is drawn faintly');
  for (const page of pages) {
    const mark = page.body.match(/\/Gs\d+ gs\s+(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) -?[\d.]+ -?[\d.]+ cm\s+(?:q\s+)?([\d.]+) 0 0 -?[\d.]+ -?[\d.]+ -?[\d.]+ cm\s+\/I\d+ Do/);
    assert.ok(mark, 'every page draws the faint ALAB mark');
    const [, a, b] = mark.slice(0, 3).map(Number);
    const degrees = Math.atan2(b, a) * 180 / Math.PI;
    assert.ok(Math.abs(degrees) >= 30 && Math.abs(degrees) <= 50, `the mark runs on a slant (${degrees.toFixed(1)}°)`);
    assert.ok(Number(mark[5]) >= 500, 'the mark spans most of the page');
  }
});
