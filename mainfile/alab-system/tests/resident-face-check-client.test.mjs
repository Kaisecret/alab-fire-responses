import assert from 'node:assert/strict';
import test from 'node:test';
import { createFaceCheckController } from '../lib/resident-applications/face-check-client.mjs';

function evidence() {
  return {
    frontId: new File(['front'], 'front.jpg', { type: 'image/jpeg' }),
    backId: new File(['back'], 'back.jpg', { type: 'image/jpeg' }),
    selfie: new File(['selfie'], 'selfie.jpg', { type: 'image/jpeg' }),
    selfieRight: new File(['right'], 'right.jpg', { type: 'image/jpeg' }),
    selfieLeft: new File(['left'], 'left.jpg', { type: 'image/jpeg' }),
    idVerificationToken: 'signed-id-proof',
  };
}

const success = (token) => Response.json({ verified: true, token });

test('submits the exact confirmed photos and only returns proof for those same inputs', async () => {
  const input = evidence();
  const states = [];
  const controller = createFaceCheckController({
    onState: (state) => states.push(state),
    request: async (url, options) => {
      assert.equal(url, '/api/auth/register/face-check');
      assert.equal(options.method, 'POST');
      assert.equal(await options.body.get('frontId').text(), 'front');
      assert.equal(await options.body.get('backId').text(), 'back');
      assert.equal(await options.body.get('selfie').text(), 'selfie');
      assert.equal(await options.body.get('selfieRight').text(), 'right');
      assert.equal(await options.body.get('selfieLeft').text(), 'left');
      assert.equal(options.body.get('idVerificationToken'), 'signed-id-proof');
      return success('server-face-proof');
    },
  });
  await controller.verify(input);
  assert.equal(controller.getToken(input), 'server-face-proof');
  assert.equal(controller.getToken({ ...input, frontId: new File(['different'], 'front.jpg') }), null);
  assert.equal(controller.getToken({ ...input, selfie: new File(['different'], 'selfie.jpg') }), null);
  assert.equal(controller.getToken({ ...input, selfieRight: new File(['different'], 'right.jpg') }), null);
  assert.equal(controller.getToken({ ...input, selfieLeft: new File(['different'], 'left.jpg') }), null);
  assert.equal(controller.getToken({ ...input, idVerificationToken: 'new-id-proof' }), null);
  assert.deepEqual(states.map((state) => state.status), ['checking', 'verified']);
});

test('a missing side view never sends an incomplete capture set to face checking', async () => {
  let requests = 0;
  const controller = createFaceCheckController({ request: async () => { requests++; return success('unexpected-proof'); } });
  for (const key of ['selfieRight', 'selfieLeft']) {
    const input = evidence(); delete input[key];
    assert.equal(await controller.verify(input), false);
    assert.equal(controller.getToken(input), null);
    assert.equal(requests, 0);
  }
});

test('a mismatch removes earlier proof and exposes the service retry guidance', async () => {
  const input = evidence();
  const states = [];
  let response = success('first-proof');
  const controller = createFaceCheckController({ request: async () => response, onState: (state) => states.push(state) });
  await controller.verify(input);
  response = Response.json({ verified: false, code: 'FACE_MISMATCH', message: 'This selfie does not match the ID photo. Retake it.' }, { status: 422 });
  await controller.verify(input);
  assert.equal(controller.getToken(input), null);
  assert.equal(states.at(-1).status, 'failed');
  assert.equal(states.at(-1).code, 'FACE_MISMATCH');
  assert.equal(states.at(-1).message, 'This selfie does not match the ID photo. Retake it.');
});

test('an older request cannot overwrite a newer confirmed selfie', async () => {
  const first = evidence();
  const second = { ...first, selfie: new File(['second'], 'second.jpg') };
  const pending = [];
  const states = [];
  const controller = createFaceCheckController({
    request: (_url, options) => new Promise((resolve) => pending.push({ resolve, signal: options.signal })),
    onState: (state) => states.push(state),
  });
  const oldRequest = controller.verify(first);
  const newRequest = controller.verify(second);
  assert.equal(pending[0].signal.aborted, true);
  pending[1].resolve(success('second-proof'));
  await newRequest;
  pending[0].resolve(success('first-proof'));
  await oldRequest;
  assert.equal(controller.getToken(second), 'second-proof');
  assert.equal(controller.getToken(first), null);
  assert.equal(states.filter((state) => state.status === 'verified').length, 1);
});

test('changing an ID invalidates proof and ignores a response already in flight', async () => {
  const input = evidence();
  let resolve;
  const states = [];
  const controller = createFaceCheckController({ request: () => new Promise((done) => { resolve = done; }), onState: (state) => states.push(state) });
  const request = controller.verify(input);
  controller.invalidate();
  resolve(success('stale-proof'));
  await request;
  assert.equal(controller.getToken(input), null);
  assert.equal(states.at(-1).status, 'idle');
});

test('a network or malformed service response cannot produce a verification proof', async () => {
  const input = evidence();
  const states = [];
  const controller = createFaceCheckController({ request: async () => { throw new Error('network'); }, onState: (state) => states.push(state) });
  await controller.verify(input);
  assert.equal(controller.getToken(input), null);
  assert.equal(states.at(-1).status, 'failed');
  const malformed = createFaceCheckController({ request: async () => Response.json({ verified: true }), onState: (state) => states.push(state) });
  await malformed.verify(input);
  assert.equal(malformed.getToken(input), null);
  assert.equal(states.at(-1).status, 'failed');
});

test('one dropped connection is retried with the same photos before showing an error', async () => {
  const input = evidence();
  const states = [];
  const bodies = [];
  let calls = 0;
  const controller = createFaceCheckController({
    retryDelayMs: 1,
    onState: (state) => states.push(state),
    request: async (_url, options) => { bodies.push(options.body); if (++calls === 1) throw new TypeError('Failed to fetch'); return success('proof'); },
  });
  assert.equal(await controller.verify(input), true);
  assert.equal(calls, 2);
  assert.equal(bodies[0], bodies[1]);
  assert.deepEqual(states.map((state) => state.status), ['checking', 'verified']);
});

test('a lasting connection failure is retryable and explains that no retake is needed', async () => {
  const states = [];
  let calls = 0;
  const controller = createFaceCheckController({ retryDelayMs: 1, onState: (state) => states.push(state), request: async () => { calls++; throw new TypeError('Failed to fetch'); } });
  assert.equal(await controller.verify(evidence()), false);
  assert.equal(calls, 2);
  assert.equal(states.at(-1).code, 'NETWORK_ERROR');
  assert.equal(states.at(-1).retryable, true);
  assert.match(states.at(-1).message, /internet connection/);
  assert.match(states.at(-1).message, /do not need to retake/);
});

test('platform 5xx responses are retried once and then reported as a retryable outage', async () => {
  const states = [];
  let calls = 0;
  const controller = createFaceCheckController({ retryDelayMs: 1, onState: (state) => states.push(state),
    request: async () => { calls++; return new Response('An error occurred', { status: 504 }); } });
  assert.equal(await controller.verify(evidence()), false);
  assert.equal(calls, 2);
  assert.equal(states.at(-1).code, 'SERVICE_UNAVAILABLE');
  assert.equal(states.at(-1).retryable, true);
  let crashed = 0;
  const crash = createFaceCheckController({ retryDelayMs: 1, onState: (state) => states.push(state),
    request: async () => { crashed++; return new Response('FUNCTION_INVOCATION_FAILED', { status: 500 }); } });
  assert.equal(await crash.verify(evidence()), false);
  assert.equal(crashed, 1, 'a 500 is not retried automatically');
  assert.equal(states.at(-1).retryable, true);
});

test('face mismatches and unreadable photos are never retryable without a retake', async () => {
  for (const code of ['FACE_MISMATCH', 'SELFIE_FACE_UNCLEAR', 'INVALID_IMAGE']) {
    const states = [];
    let calls = 0;
    const controller = createFaceCheckController({ retryDelayMs: 1, onState: (state) => states.push(state),
      request: async () => { calls++; return Response.json({ verified: false, code, message: 'Retake.' }, { status: 422 }); } });
    await controller.verify(evidence());
    assert.equal(calls, 1);
    assert.equal(states.at(-1).retryable, false);
  }
});

test('invalidating during the retry pause sends nothing more and reports nothing', async () => {
  const states = [];
  let calls = 0;
  const controller = createFaceCheckController({ retryDelayMs: 50, onState: (state) => states.push(state), request: async () => { calls++; throw new TypeError('Failed to fetch'); } });
  const running = controller.verify(evidence());
  await new Promise((done) => setTimeout(done, 5));
  controller.invalidate();
  assert.equal(await running, false);
  assert.equal(calls, 1);
  assert.deepEqual(states.map((state) => state.status), ['checking', 'idle']);
});

test('unmounting aborts work and stops callbacks from updating an obsolete form', async () => {
  const states = [];
  let resolve;
  const controller = createFaceCheckController({ request: () => new Promise((done) => { resolve = done; }), onState: (state) => states.push(state) });
  const request = controller.verify(evidence());
  controller.dispose();
  resolve(success('late-proof'));
  await request;
  assert.deepEqual(states.map((state) => state.status), ['checking']);
});
