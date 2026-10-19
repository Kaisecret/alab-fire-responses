import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { createFaceCheckController } from '../lib/resident-applications/face-check-client.mjs';
import { createSelfieViewCollection, SELFIE_VIEWS } from '../lib/resident-applications/selfie-views-client.mjs';
import { selfieGuidanceCue } from '../lib/resident-applications/selfie-guidance-cues.mjs';

const markupSource = readFileSync(new URL('../app/_content/signup-content.ts', import.meta.url), 'utf8');
const markup = markupSource.match(/export const signupMarkup = `([\s\S]*)`;\s*$/)?.[1];
assert.ok(markup, 'Signup markup must be available');
const component = readFileSync(new URL('../app/_components/signup-page.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(component, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const flush = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

// A small event/element adapter runs the real SignupPage effect. Network, camera
// hardware and image encoding are controlled; navigation and proof logic are real.
function mount({ check = async () => Response.json({ verified: true, token: 'signed-id' }), face = async () => Response.json({ verified: true, token: 'signed-face' }),
  camera = async () => ({ getTracks: () => [{ stop() {} }] }),
  encode = callback => callback(new Blob(['camera-frame'], { type: 'image/jpeg' })), shrink = async file => file } = {}) {
  const nodes = new Map(); const requests = []; const intervals = new Set(); const guidance = []; const guidanceSessions = [];
  let cleanup; let redirected;
  const document = {
    body: { style: { overflow: '' } },
    activeElement: null,
    createElement: tag => new Element(tag),
    querySelector: selector => root.querySelector(selector),
  };
  class Element {
    constructor(tag = 'div', id = '') {
      this.tagName = tag.toUpperCase(); this.id = id; this.ownerDocument = document;
      this.style = { setProperty() {} }; this.value = ''; this.checked = false; this.disabled = false;
      this.hidden = false; this.children = []; this.handlers = new Map(); this.attrs = new Map();
      this.classes = new Set(); this.isConnected = true; this.videoWidth = 640; this.videoHeight = 480; this.readyState = 2;
      this.classList = {
        add: (...names) => names.forEach(name => this.classes.add(name)),
        remove: (...names) => names.forEach(name => this.classes.delete(name)),
        contains: name => this.classes.has(name),
        toggle: (name, force) => { const on = force ?? !this.classes.has(name); if (on) this.classes.add(name); else this.classes.delete(name); return on; },
      };
    }
    set innerHTML(value) {
      for (const child of this.children) child.isConnected = false;
      this.children = [];
      this.html = value;
      for (const match of value.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"[^>]*>/g)) {
        if (!nodes.has(match[2])) nodes.set(match[2], new Element(match[1], match[2]));
        const child = nodes.get(match[2]); child.isConnected = true;
        child.disabled = /\sdisabled(?:\s|>)/.test(match[0]); child.hidden = /\shidden(?:\s|>)/.test(match[0]); this.children.push(child);
      }
    }
    get childNodes() { return this.children; }
    get innerHTML() { return this.html ?? ''; }
    querySelector(selector) { const node = selector.startsWith('#') ? nodes.get(selector.slice(1)) : selector === '.selfie-face-guide' ? nodes.get('selfieFaceGuide') : null; return node?.isConnected ? node : null; }
    querySelectorAll(selector) {
      if (selector === '#otpDigits input') return Array.from({ length: 6 }, (_, i) => {
        const id = `otp-${i}`; if (!nodes.has(id)) nodes.set(id, new Element('input', id)); return nodes.get(id);
      });
      return [];
    }
    addEventListener(name, handler) { const list = this.handlers.get(name) ?? []; this.handlers.set(name, [...list, handler]); }
    removeEventListener(name, handler) { this.handlers.set(name, (this.handlers.get(name) ?? []).filter(item => item !== handler)); }
    async emit(name) {
      const event = { target: this, preventDefault() {}, stopPropagation() {} };
      for (const handler of this.handlers.get(name) ?? []) await handler(event);
      if (name === 'click') await this.onclick?.(event);
      await flush();
    }
    setAttribute(key, value) { this.attrs.set(key, value); }
    removeAttribute(key) { this.attrs.delete(key); }
    appendChild(child) { this.children.push(child); return child; }
    append(...children) { this.children.push(...children); }
    prepend(child) { this.children.unshift(child); }
    contains(child) { return this.children.includes(child); }
    replaceChildren(...children) { for (const child of this.children) child.isConnected = false; this.children = [...children]; for (const child of children) child.isConnected = true; }
    remove() { this.isConnected = false; }
    focus() { document.activeElement = this; }
    checkValidity() { return true; }
    reportValidity() { return true; }
    play() { return Promise.resolve(); }
    getContext() { return { drawImage() {} }; }
    toBlob(callback) { encode(callback); }
  }
  const root = new Element(); root.innerHTML = markup;
  const lastPanel = [...nodes.values()].filter(node => /^step\d+$/.test(node.id)).at(-1);
  lastPanel.children = [...markup.slice(markup.indexOf(`id="${lastPanel.id}"`) + lastPanel.id.length + 5, markup.indexOf('</form>')).matchAll(/\bid="([^"]+)"/g)].map(match => nodes.get(match[1]));
  nodes.get('step1').classList.add('active');
  for (const [key, value] of Object.entries({ firstName: 'Juan', lastName: 'Cruz', phone: '09171234567', municipality: 'Hamtic', barangay: 'Mapatag', username: 'juancruz', signupPassword: 'Password123!', confirmPassword: 'Password123!' })) nodes.get(key).value = value;
  nodes.get('termsCheck').checked = true;
  const storage = new Map();
  const fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.includes('/google/prefill')) return Response.json({ prefill: null });
    if (url.endsWith('/id-check')) return check(url, options);
    if (url.endsWith('/face-check')) return face(url, options);
    if (url.endsWith('/start')) return Response.json({ verificationId: 'otp-id' });
    if (url.endsWith('/verify')) return Response.json({ verified: true });
    if (url === '/api/auth/register') return Response.json({ application: { status: 'VERIFIED' } }, { status: 201 });
    throw new Error(`Unexpected request: ${url}`);
  };
  const window = {
    requestAnimationFrame: callback => callback(), alert: message => assert.fail(message),
    setInterval: callback => { intervals.add(callback); return callback; }, clearInterval: callback => intervals.delete(callback),
    location: { assign: url => { redirected = url; } },
  };
  const exports = {};
  const require = name => {
    if (name === 'react') return { useRef: () => ({ current: root }), useEffect: effect => { cleanup = effect(); } };
    if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null };
    if (name.endsWith('/signup-content')) return { signupMarkup: markup, signupStyles: '' };
    if (name.endsWith('/resident-auth-font')) return { residentAuthFontStyles: '' };
    if (name.endsWith('/antique-barangays')) return { antiqueBarangays: { Hamtic: ['Mapatag'] } };
    if (name.endsWith('/compose-address.mjs')) return { composeResidentAddress: () => 'Mapatag, Hamtic, Antique' };
    if (name.endsWith('/shrink-photo')) return { shrinkPhoto: shrink };
    if (name.endsWith('/face-check-client.mjs')) return { createFaceCheckController: options => createFaceCheckController({ ...options, request: fetch }) };
    if (name.endsWith('/selfie-views-client.mjs')) return { createSelfieViewCollection, SELFIE_VIEWS };
    if (name.endsWith('/selfie-guidance-cues.mjs')) return { selfieGuidanceCue };
    if (name.endsWith('/selfie-guidance')) return {
      startSelfieGuidance: async options => { guidance.push(options); return { stop() {} }; },
      createSelfieGuidanceSession: () => {
        const session = { closed: false, starts: 0,
          async start(options) { assert.equal(session.closed, false); session.starts++; guidance.push(options); return { stop() {} }; },
          close() { session.closed = true; },
        }; guidanceSessions.push(session); return session;
      },
    };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  new Function('require', 'exports', 'document', 'window', 'sessionStorage', 'fetch', 'navigator', compiled)(require, exports, document, window,
    { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }, fetch,
    { mediaDevices: { getUserMedia: camera } });
  exports.SignupPage({ fontVariableClassName: '' });
  return {
    nodes, requests, document, guidance, guidanceSessions,
    ready: async () => { guidance.at(-1).onUpdate({ ready: true, progress: 1, message: 'Hold steady', code: 'READY' }); guidance.at(-1).onReady(); await flush(); },
    active: () => [...nodes.values()].filter(node => /^step\d+$/.test(node.id) && node.classList.contains('active')).map(node => node.id),
    click: id => nodes.get(id).emit('click'),
    upload: async (id, name = id) => { const input = nodes.get(id); input.files = [new File([name], `${name}.jpg`, { type: 'image/jpeg' })]; await input.emit('change'); },
    submit: () => nodes.get('signupForm').emit('submit'),
    get redirected() { return redirected; },
    cleanup: () => cleanup?.(),
  };
}

async function openIds(h) { await h.click('toStep2'); await h.click('toStep3'); assert.deepEqual(h.active(), ['step3']); }
async function captureViews(h, count = 3) {
  await h.click('selfieCapture');
  for (let i = 0; i < count; i++) { await h.ready(); await h.click('useSelfie'); }
}

test('six signup panels keep ID photos, selfie, security and review separate', () => {
  const panel = step => markup.slice(markup.indexOf(`id="step${step}"`), markup.indexOf(`id="step${step + 1}"`) < 0 ? markup.indexOf('</form>') : markup.indexOf(`id="step${step + 1}"`));
  assert.equal((markup.match(/class="step-panel(?: active)?"/g) ?? []).length, 6);
  assert.ok(markup.includes('Step 1 of 6'));
  assert.ok(panel(3).includes('id="fileFront"') && panel(3).includes('id="fileBack"'));
  assert.ok(!panel(3).includes('id="selfieCapture"'));
  assert.ok(panel(4).includes('id="selfieCapture"') && !panel(4).includes('id="username"'));
  assert.ok(panel(5).includes('id="username"') && panel(6).includes('id="termsCheck"'));
});

test('only a verified pair of ID sides automatically opens the separate selfie step', async t => {
  const h = mount(); t.after(h.cleanup); await openIds(h);
  await h.upload('fileFront');
  assert.equal(h.requests.filter(request => request.url.endsWith('/id-check')).length, 0);
  assert.deepEqual(h.active(), ['step3']);
  await h.upload('fileBack');
  const checks = h.requests.filter(request => request.url.endsWith('/id-check'));
  assert.equal(checks.length, 1);
  assert.equal(checks[0].options.body.get('frontId').name, 'fileFront.jpg');
  assert.equal(checks[0].options.body.get('backId').name, 'fileBack.jpg');
  assert.deepEqual(h.active(), ['step4']);
  assert.equal(h.nodes.get('toStep5').disabled, true, 'A selfie match is still required');
  await h.click('backToStep3'); assert.deepEqual(h.active(), ['step3']);
  await h.click('toStep4'); assert.deepEqual(h.active(), ['step4']);
  assert.equal(h.requests.filter(request => request.url.endsWith('/id-check')).length, 1);
});

test('wrong front or back, partial passes and network errors stay on the ID step', async t => {
  for (const outcome of [
    { verified: false, side: 'front', code: 'WRONG_SIDE', message: 'Upload the front.' },
    { verified: false, side: 'back', code: 'BACK_MISMATCH', message: 'Back does not match.' },
    { verified: false, frontVerified: true, code: 'BACK_REQUIRED' },
    { verified: true },
    { verified: true, token: 123 },
    'network-error',
  ]) {
    const h = mount({ check: async () => { if (outcome === 'network-error') throw new Error('Offline'); return Response.json(outcome, { status: 422 }); } });
    t.after(h.cleanup); await openIds(h); await h.upload('fileFront'); await h.upload('fileBack');
    assert.deepEqual(h.active(), ['step3']); assert.equal(h.nodes.get('toStep4').disabled, true);
  }
});

test('back-first uploads and replacing a failed back photo both advance only after a full pass', async t => {
  let passes = false;
  const h = mount({ check: async () => passes ? Response.json({ verified: true, token: 'verified-pair' })
    : Response.json({ verified: false, side: 'back', code: 'BACK_MISMATCH', message: 'Use the back of the same ID.' }, { status: 422 }) });
  t.after(h.cleanup); await openIds(h); await h.upload('fileBack');
  assert.equal(h.requests.filter(request => request.url.endsWith('/id-check')).length, 0);
  await h.upload('fileFront'); assert.deepEqual(h.active(), ['step3']);
  passes = true; await h.upload('fileBack', 'correct-back'); assert.deepEqual(h.active(), ['step4']);
});

test('an older successful ID response cannot advance after a photo is replaced', async t => {
  const first = deferred(); const second = deferred(); let calls = 0;
  const h = mount({ check: () => (++calls === 1 ? first.promise : second.promise) }); t.after(h.cleanup);
  await openIds(h); await h.upload('fileFront'); await h.upload('fileBack');
  await h.upload('fileFront', 'replacement');
  first.resolve(Response.json({ verified: true, token: 'old-proof' })); await flush();
  assert.deepEqual(h.active(), ['step3']);
  second.resolve(Response.json({ verified: true, token: 'current-proof' })); await flush();
  assert.deepEqual(h.active(), ['step4']);
});

test('separate selfie verification keeps security, review, OTP and registration in order', async t => {
  const h = mount(); t.after(h.cleanup); await openIds(h); await h.upload('fileFront'); await h.upload('fileBack');
  assert.deepEqual(h.active(), ['step4']);
  await captureViews(h);
  assert.equal(h.nodes.get('toStep5').disabled, false);
  await h.click('toStep5'); assert.deepEqual(h.active(), ['step5']);
  await h.click('toStep6'); assert.deepEqual(h.active(), ['step6']);
  assert.equal(h.requests.filter(request => request.url.endsWith('/start')).length, 0);
  await h.submit(); assert.deepEqual(h.active(), ['step6']);
  assert.equal(h.requests.filter(request => request.url.endsWith('/start')).length, 1);
  await h.click('editSignupDetails'); assert.deepEqual(h.active(), ['step5']);
  await h.click('toStep6'); assert.deepEqual(h.active(), ['step6']);
  assert.equal(h.nodes.get('submitBtn').isConnected, true, 'Editing restores review and submission controls');
  assert.equal(h.nodes.get('submitBtn').disabled, false, 'The restored submit button must be usable');
  await h.submit(); assert.equal(h.requests.filter(request => request.url.endsWith('/start')).length, 2);
});

test('a failed selfie comparison stays on its own step with account continuation blocked', async t => {
  const h = mount({ face: async () => Response.json({ verified: false, code: 'FACE_MISMATCH', message: 'Retake your selfie.' }, { status: 422 }) });
  t.after(h.cleanup); await openIds(h); await h.upload('fileFront'); await h.upload('fileBack');
  await captureViews(h);
  assert.deepEqual(h.active(), ['step4']); assert.equal(h.nodes.get('toStep5').disabled, true);
});

test('a late ID response does not pull someone forward after Back or unmount', async t => {
  const pending = deferred(); const h = mount({ check: () => pending.promise }); t.after(h.cleanup);
  await openIds(h); await h.upload('fileFront'); await h.upload('fileBack');
  await h.click('backToStep2'); pending.resolve(Response.json({ verified: true, token: 'proof' })); await flush();
  assert.deepEqual(h.active(), ['step2']);
  await h.click('toStep3'); assert.deepEqual(h.active(), ['step4']);
  const late = deferred(); const unmounted = mount({ check: () => late.promise });
  await openIds(unmounted); await unmounted.upload('fileFront'); await unmounted.upload('fileBack');
  unmounted.cleanup(); late.resolve(Response.json({ verified: true, token: 'obsolete' })); await flush();
  assert.deepEqual(unmounted.active(), ['step3']);
});

test('OTP verification still creates an account using the bound ID and face proofs', async t => {
  const h = mount(); t.after(h.cleanup); await openIds(h); await h.upload('fileFront'); await h.upload('fileBack');
  await captureViews(h);
  await h.click('toStep5'); await h.click('toStep6'); await h.submit();
  h.nodes.get('otpDigits').querySelectorAll('#otpDigits input').forEach(input => { input.value = '1'; });
  await h.click('verifyOtpButton'); assert.deepEqual(h.active(), ['step6']);
  await h.click('completeAccountButton');
  const request = h.requests.find(item => item.url === '/api/auth/register');
  assert.equal(request.options.body.get('idVerificationToken'), 'signed-id');
  assert.equal(request.options.body.get('faceVerificationToken'), 'signed-face');
  assert.ok(request.options.body.get('selfieRight') instanceof File);
  assert.ok(request.options.body.get('selfieLeft') instanceof File);
  assert.equal(h.redirected, '/resident/application');
});

test('a delayed selfie expiry clears evidence without pulling someone forward after Back', async t => {
  const pending = deferred(); const h = mount({ face: () => pending.promise }); t.after(h.cleanup);
  await openIds(h); await h.upload('fileFront'); await h.upload('fileBack');
  await captureViews(h, 2); await h.ready();
  const confirming = h.click('useSelfie'); await flush();
  await h.click('backToStep3'); await h.click('backToStep2'); await h.click('backToStep1');
  assert.deepEqual(h.active(), ['step1']);
  pending.resolve(Response.json({ verified: false, code: 'ID_NOT_VERIFIED', message: 'Verify your ID again.' }, { status: 400 }));
  await confirming; assert.deepEqual(h.active(), ['step1']);
  assert.equal(h.nodes.get('toStep4').disabled, true);
});

test('capture requires guidance readiness and all three confirmed views before comparison', async t => {
  const h = mount(); t.after(h.cleanup); await openIds(h); await h.upload('fileFront'); await h.upload('fileBack');
  await h.click('selfieCapture');
  assert.equal(h.guidance.at(-1).view, 'front');
  assert.equal(h.nodes.get('captureSelfie').disabled, true);
  await h.click('captureSelfie'); await h.click('useSelfie');
  assert.equal(h.requests.filter(r => r.url.endsWith('/face-check')).length, 0);
  for (const view of ['front', 'right', 'left']) {
    assert.equal(h.guidance.at(-1).view, view);
    await h.ready(); await h.click('useSelfie');
    assert.equal(h.requests.filter(r => r.url.endsWith('/face-check')).length, view === 'left' ? 1 : 0);
  }
  const body = h.requests.find(r => r.url.endsWith('/face-check')).options.body;
  assert.match(body.get('selfie').name, /front/); assert.match(body.get('selfieRight').name, /right/); assert.match(body.get('selfieLeft').name, /left/);
});

test('live arrows distinguish framing movements, head turns and holding, then disappear in review', async t => {
  const h = mount(); t.after(h.cleanup);
  await h.click('selfieCapture');
  h.guidance.at(-1).onUpdate({ ready: false, progress: 0, code: 'off-center', direction: 'left', message: 'Move left.' });
  assert.equal(h.nodes.get('selfieDirectionCue').attrs.get('data-direction'), 'left');
  assert.match(h.nodes.get('selfieCueTitle').textContent, /Move/);
  h.guidance.at(-1).onUpdate({ ready: false, progress: .3, code: 'hold', direction: 'hold', message: 'Hold still.' });
  assert.equal(h.nodes.get('selfieDirectionCue').attrs.get('data-direction'), 'hold');
  await h.ready();
  assert.equal(h.nodes.get('selfieDirectionCue').hidden, true);
  await h.click('useSelfie');
  assert.equal(h.nodes.get('selfiePhaseFront').attrs.get('data-state'), 'done');
  assert.equal(h.nodes.get('selfiePhaseRight').attrs.get('data-state'), 'active');
  h.guidance.at(-1).onUpdate({ ready: false, progress: 0, code: 'turn-right', direction: 'right', message: 'Turn right.' });
  assert.equal(h.nodes.get('selfieDirectionCue').attrs.get('data-direction'), 'right');
  assert.match(h.nodes.get('selfieCueTitle').textContent, /Turn/);
});

test('the camera reuses one detector through all three views and releases it after completion or cancel', async t => {
  const h = mount(); t.after(h.cleanup); await openIds(h); await h.upload('fileFront'); await h.upload('fileBack');
  await h.click('selfieCapture'); await h.ready();
  assert.equal(h.guidanceSessions.length, 1); assert.equal(h.guidanceSessions[0].closed, false, 'review keeps the model warm');
  await h.click('useSelfie'); await h.ready(); await h.click('useSelfie'); await h.ready(); await h.click('useSelfie');
  assert.equal(h.guidanceSessions.length, 1); assert.equal(h.guidanceSessions[0].starts, 3); assert.equal(h.guidanceSessions[0].closed, true);
  await h.click('retakeSelfieFront'); await h.click('cancelSelfie');
  assert.equal(h.guidanceSessions.length, 2); assert.equal(h.guidanceSessions[1].closed, true);
});

test('a cancelled retake preserves confirmed photos; replacing one view preserves the other two', async t => {
  const h = mount(); t.after(h.cleanup); await openIds(h); await h.upload('fileFront'); await h.upload('fileBack'); await captureViews(h);
  const before = h.requests.find(r => r.url.endsWith('/face-check')).options.body;
  await h.click('retakeSelfieRight'); await h.click('cancelSelfie');
  assert.equal(h.nodes.get('toStep5').disabled, false);
  await h.click('retakeSelfieRight'); assert.equal(h.guidance.at(-1).view, 'right'); await h.ready(); await h.click('useSelfie');
  const after = h.requests.filter(r => r.url.endsWith('/face-check')).at(-1).options.body;
  assert.equal(after.get('selfie'), before.get('selfie')); assert.equal(after.get('selfieLeft'), before.get('selfieLeft'));
  assert.notEqual(after.get('selfieRight'), before.get('selfieRight'));
});

test('cancelled camera permission stops a late stream and never starts guidance', async t => {
  const permission = deferred(); let stopped = 0;
  const h = mount({ camera: () => permission.promise }); t.after(h.cleanup);
  const opening = h.click('selfieCapture'); await flush(); await h.click('cancelSelfie');
  permission.resolve({ getTracks: () => [{ stop: () => stopped++ }] }); await opening;
  assert.equal(stopped, 1); assert.equal(h.guidance.length, 0);
  assert.equal(h.nodes.get('selfieCameraPanel').classList.contains('active'), false);
});

test('cancelled frame encoding cannot reopen review or commit a photo', async t => {
  let finish;
  const h = mount({ encode: callback => { finish = callback; } }); t.after(h.cleanup);
  await h.click('selfieCapture'); const oldGuide = h.guidance.at(-1); await h.ready();
  await h.click('cancelSelfie'); finish(new Blob(['late-frame'], { type: 'image/jpeg' })); await flush();
  oldGuide.onUpdate({ ready: true, progress: 1, message: 'obsolete', code: 'READY' }); oldGuide.onReady();
  await h.click('useSelfie');
  assert.equal(h.nodes.get('selfieCount').textContent, undefined);
  assert.equal(h.nodes.get('selfieCameraPanel').classList.contains('active'), false);
  assert.equal(h.requests.filter(r => r.url.endsWith('/face-check')).length, 0);
});

test('cancelled photo preparation cannot replace a confirmed view', async t => {
  const preparation = deferred();
  const h = mount({ shrink: file => file.name.includes('resident-selfie-') ? preparation.promise : Promise.resolve(file) }); t.after(h.cleanup);
  await h.click('selfieCapture'); await h.ready(); const confirming = h.click('useSelfie'); await flush();
  await h.click('cancelSelfie'); preparation.resolve(new File(['late'], 'late.jpg', { type: 'image/jpeg' })); await confirming;
  assert.equal(h.nodes.get('retakeSelfieFront').disabled, true);
  assert.equal(h.nodes.get('selfieCount').textContent, undefined);
  assert.equal(h.nodes.get('selfieCameraPanel').classList.contains('active'), false);
});
