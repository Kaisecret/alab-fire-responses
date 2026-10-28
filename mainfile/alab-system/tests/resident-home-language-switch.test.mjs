import assert from 'node:assert/strict';
import test from 'node:test';
import { loadServerModule } from './helpers/load-server-module.mjs';

const { homeMarkup } = loadServerModule('app/_content/resident-home-content.ts', {});
const { RESIDENT_TEXT, RESIDENT_TEXT_PATTERNS } = loadServerModule('app/_content/resident-text.ts', {});
const { translateResidentMarkup } = loadServerModule('app/_lib/resident-text.ts', {
  './resident-i18n': {},
});

function markupFixture(words, attributes = {}) {
  const nodes = words.map(nodeValue => ({ nodeValue, parentElement: { closest: () => null } }));
  const attrs = new Map(Object.entries(attributes));
  const element = { getAttribute: name => attrs.get(name) ?? null, setAttribute: (name, value) => attrs.set(name, value) };
  return { nodes, element, root: { nodes, querySelectorAll: () => [element] } };
}

function withDocument(run) {
  const oldDocument = globalThis.document, oldFilter = globalThis.NodeFilter;
  globalThis.NodeFilter = { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 };
  globalThis.document = { createTreeWalker(root) { let index = 0; return { nextNode: () => root.nodes[index++] ?? null }; } };
  try { run(); } finally { globalThis.document = oldDocument; globalThis.NodeFilter = oldFilter; }
}

test('resident home offers one report label instead of repeating the same action', () => {
  const button = homeMarkup.match(/<a\b[^>]*class="mobile-emergency-btn"[\s\S]*?<\/a>/)?.[0];
  assert.ok(button, 'The main report action exists');
  const labels = [...button.matchAll(/>([^<>]+)</g)].map(([, value]) => value.trim()).filter(Boolean);
  assert.equal(labels.length, 1, `The report action repeats its label: ${labels.join(' / ')}`);
});

test('resident text and accessible labels follow repeated English, Tagalog and Hiligaynon switches', () => withDocument(() => {
  const fixture = markupFixture(['REPORT FIRE', 'Move to safety first.'], { 'aria-label': 'Report a fire' });
  for (const language of ['tl', 'hil', 'en', 'hil', 'tl', 'en']) {
    translateResidentMarkup(fixture.root, language, RESIDENT_TEXT, RESIDENT_TEXT_PATTERNS);
    for (const [index, english] of ['REPORT FIRE', 'Move to safety first.'].entries()) {
      assert.equal(fixture.nodes[index].nodeValue, language === 'en' ? english : RESIDENT_TEXT[english][language], `Text must follow ${language}`);
    }
    assert.equal(fixture.element.getAttribute('aria-label'), language === 'en' ? 'Report a fire' : RESIDENT_TEXT['Report a fire'][language], `Accessible label must follow ${language}`);
  }
}));

test('translated live content can be replaced and still switches back to its new English wording', () => withDocument(() => {
  const fixture = markupFixture(['REPORT FIRE'], { title: 'Report a fire' });
  translateResidentMarkup(fixture.root, 'tl', RESIDENT_TEXT, RESIDENT_TEXT_PATTERNS);
  fixture.nodes[0].nodeValue = 'View Status';
  fixture.element.setAttribute('title', 'View Status');
  translateResidentMarkup(fixture.root, 'hil', RESIDENT_TEXT, RESIDENT_TEXT_PATTERNS);
  assert.equal(fixture.nodes[0].nodeValue, RESIDENT_TEXT['View Status'].hil);
  translateResidentMarkup(fixture.root, 'en', RESIDENT_TEXT, RESIDENT_TEXT_PATTERNS);
  assert.equal(fixture.nodes[0].nodeValue, 'View Status');
  assert.equal(fixture.element.getAttribute('title'), 'View Status');
}));
