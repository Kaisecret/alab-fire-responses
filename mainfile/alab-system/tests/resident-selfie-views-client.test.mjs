import assert from 'node:assert/strict';
import test from 'node:test';
import { createSelfieViewCollection, SELFIE_VIEWS } from '../lib/resident-applications/selfie-views-client.mjs';

test('three confirmed views are required and captured in front/right/left order', () => {
  const views = createSelfieViewCollection();
  assert.deepEqual(SELFIE_VIEWS.map(view => view.key), ['front', 'right', 'left']);
  assert.equal(views.nextMissing(), 'front'); assert.equal(views.evidence(), null);
  const front = new File(['front'], 'front.jpg'); const right = new File(['right'], 'right.jpg'); const left = new File(['left'], 'left.jpg');
  views.set('front', front); assert.equal(views.nextMissing(), 'right'); assert.equal(views.evidence(), null);
  views.set('right', right); assert.equal(views.nextMissing(), 'left'); assert.equal(views.evidence(), null);
  views.set('left', left); assert.equal(views.count(), 3); assert.equal(views.nextMissing(), null);
  assert.deepEqual(views.evidence(), { selfie: front, selfieRight: right, selfieLeft: left });
});

test('retaking one view preserves the other confirmed files and rejects unknown views', () => {
  const views = createSelfieViewCollection();
  for (const view of SELFIE_VIEWS) views.set(view.key, new File([view.key], `${view.key}.jpg`));
  const before = views.evidence(); const right = new File(['retake'], 'right.jpg');
  views.set('right', right); assert.equal(views.evidence().selfie, before.selfie); assert.equal(views.evidence().selfieLeft, before.selfieLeft);
  assert.equal(views.evidence().selfieRight, right); assert.equal(views.count(), 3);
  assert.throws(() => views.set('unknown', right)); assert.throws(() => views.set('front', 'not-a-file'));
  views.clear(); assert.equal(views.count(), 0); assert.equal(views.evidence(), null);
});
