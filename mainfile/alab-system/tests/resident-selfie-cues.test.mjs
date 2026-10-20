import assert from 'node:assert/strict';
import test from 'node:test';
import { selfieGuidanceCue } from '../lib/resident-applications/selfie-guidance-cues.mjs';

test('turn arrows follow the subject in the mirrored preview and reverse after turning too far', () => {
  assert.equal(selfieGuidanceCue({ code: 'turn-right' }, 'right').direction, 'right');
  assert.equal(selfieGuidanceCue({ code: 'turn-left' }, 'left').direction, 'left');
  assert.equal(selfieGuidanceCue({ code: 'turn-back' }, 'right').direction, 'left');
  assert.equal(selfieGuidanceCue({ code: 'turn-back' }, 'left').direction, 'right');
  assert.equal(selfieGuidanceCue({ code: 'turn-right' }, 'right').kind, 'turn');
});

test('framing corrections take priority and clearly differ from head turns', () => {
  for (const direction of ['left', 'right', 'up', 'down']) {
    const cue = selfieGuidanceCue({ code: 'off-center', direction }, 'right');
    assert.equal(cue.direction, direction); assert.equal(cue.kind, 'move');
    assert.match(cue.title, /Move/); assert.ok(cue.title.includes(direction));
  }
  assert.equal(selfieGuidanceCue({ code: 'too-small' }, 'right').direction, 'closer');
  assert.equal(selfieGuidanceCue({ code: 'too-large' }, 'right').direction, 'farther');
  assert.equal(selfieGuidanceCue({ code: 'clipped' }, 'left').direction, 'farther');
  assert.equal(selfieGuidanceCue({ code: 'outside-guide' }, 'left').direction, 'farther');
});

test('arrows stop during holding, loading, missing faces and review; unknown directions fail safely', () => {
  for (const code of ['hold', 'ready']) {
    const cue = selfieGuidanceCue({ code, progress: .5 }, 'right');
    assert.equal(cue.direction, 'hold'); assert.equal(cue.kind, 'hold');
  }
  for (const code of ['loading', 'camera-pending', 'no-face', 'multiple-faces', 'review', 'unavailable', 'unexpected']) {
    assert.ok(!['left', 'right', 'up', 'down'].includes(selfieGuidanceCue({ code }, 'right').direction));
  }
  assert.equal(selfieGuidanceCue({ code: 'off-center', direction: 'invalid' }, 'front').direction, 'center');
  assert.equal(selfieGuidanceCue({ code: 'face-front', direction: 'left' }, 'front').direction, 'left');
});

test('a dark room asks for better light without an arrow', () => {
  for (const view of ['front', 'right', 'left']) {
    const cue = selfieGuidanceCue({ code: 'too-dark' }, view);
    assert.equal(cue.kind, 'light');
    assert.ok(!['left', 'right', 'up', 'down'].includes(cue.direction));
    assert.match(cue.title, /light/i);
  }
});

test('side-view guidance never asks the resident to position inside an oval', () => {
  for (const view of ['left', 'right']) for (const code of ['loading', 'no-face', 'too-small', 'too-large', 'clipped', 'outside-guide', 'off-center', 'hold']) {
    const cue = selfieGuidanceCue({ code, direction: 'left' }, view);
    assert.doesNotMatch(`${cue.title} ${cue.detail}`, /oval/i);
  }
});
