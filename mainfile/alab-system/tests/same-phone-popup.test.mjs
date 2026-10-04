import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as situation from '../lib/fire-reports/fire-type-situation.ts';

test('the same-phone response opens a popup and waits for View incident status before navigating', async () => {
  const source = ts.createSourceFile('page.tsx', readFileSync(new URL('../app/resident/report-fire/page.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const initialize = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'initializeReportSubmission');
  assert.ok(initialize);
  class Element extends EventTarget {
    dataset = {};
    style = {};
    textContent = '';
    classList = { contains: () => true, toggle() {} };
    querySelector() { return null; }
    setAttribute() {}
    append(value) { this.textContent += value; }
    scrollIntoView() {}
    focus() { this.focused = true; }
    click() { this.dispatchEvent(new Event('click')); }
  }
  const submit = new Element();
  const location = new Element();
  location.dataset = { locationValid: 'true', locationLatitude: '10.7431', locationLongitude: '121.9394', locationMunicipality: 'Hamtic', locationBarangay: 'Mapatag' };
  const photo = new Element();
  photo.files = [new File(['photo'], 'fire.jpg', { type: 'image/jpeg' })];
  const kind = new Element();
  kind.dataset.fireType = 'HOUSE_BUILDING';
  const dialog = new Element();
  dialog.open = false;
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; };
  const message = new Element();
  const view = new Element();
  const elements = {
    '[data-report-submit]': submit, '[data-location-card]': location, '[data-landmark-input]': new Element(),
    '[data-photo-input]': photo, '[data-same-phone-dialog]': dialog, '[data-same-phone-message]': message,
    '[data-same-phone-view]': view,
  };
  elements['[data-landmark-input]'].value = '';
  const root = new Element();
  root.querySelector = (selector) => elements[selector] ?? null;
  root.querySelectorAll = (selector) => selector === '[data-fire-type]' ? [kind] : [];
  const navigations = [];
  let submissions = 0;
  let eligibilityUrl;
  const browserWindow = new EventTarget();
  browserWindow.location = { assign: (url) => navigations.push(url) };
  browserWindow.clearInterval = () => {};
  const context = {
    root, ...situation, document: { createTextNode: (value) => value }, window: browserWindow,
    navigator: { onLine: true }, FormData, File, CustomEvent, Event, URLSearchParams,
    getStoredLanguage: () => 'en', RESIDENT_TRANSLATIONS: { en: { sendFireAlert: 'Send fire alert' } },
    fetch: async (url, options) => {
      if (options?.method === 'POST') {
        submissions += 1;
        return Response.json({ report: { id: '33333333-3333-4333-8333-333333333333' }, sameDeviceDuplicate: true, existing: true, message: 'This phone already sent the same fire report using another account.' });
      }
      if (url.includes('open-nearby')) return Response.json({ report: null });
      eligibilityUrl = url;
      return Response.json({ allowed: false, retryAfterSeconds: 240, sameDeviceDuplicateAvailable: true });
    },
  };
  const output = ts.transpileModule(`${initialize.getText(source)}\nglobalThis.dispose = initializeReportSubmission(root);`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(output, context);
  submit.click();
  for (let attempt = 0; attempt < 20 && !dialog.open; attempt += 1) await new Promise(setImmediate);
  assert.equal(dialog.open, true);
  assert.match(message.textContent, /This phone.*another account/);
  assert.equal(submit.disabled, false);
  assert.equal(view.focused, true);
  assert.equal(submissions, 1);
  assert.ok(eligibilityUrl.includes('cooldown=1'), 'eligibility uses the account cooldown endpoint');
  assert.ok(eligibilityUrl.includes('fireTypes=HOUSE_BUILDING'), 'cooldown eligibility includes the selected fire type');
  assert.deepEqual(navigations, [], 'the existing=true flag must not skip the popup');
  view.click();
  assert.deepEqual(navigations, ['/resident/reports/33333333-3333-4333-8333-333333333333']);
  assert.equal(dialog.open, false);
  context.dispose();
});
