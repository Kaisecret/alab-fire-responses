import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { isCronAuthorized } from '../lib/auth/cron.ts';
import { processDeliveryJob, processCorrectionDeliveries } from '../lib/resident-applications/delivery-engine.ts';

const job = { id: 'job-1', channel: 'SMS', destination: '639171234567', payload: {}, attemptCount: 1, maxAttempts: 3 };
const dependencies = (overrides = {}) => ({
  send: async () => ({ providerId: 'accepted-1' }),
  record: async () => {},
  claim: async () => [job],
  retryScheduled: true,
  ...overrides,
});

test('accepted message is never marked FAILED when recording SENT fails', async () => {
  const writes = [];
  const result = await processDeliveryJob(job, dependencies({ record: async (id, value) => { writes.push(value.status); throw Error('DB down'); } }));
  assert.equal(result.status, 'SENT');
  assert.equal(result.tracking, 'UNAVAILABLE');
  assert.deepEqual(writes, ['SENT']);
});

test('queue claim failure returns unconfirmed delivery instead of rejecting a saved correction', async () => {
  const result = await processCorrectionDeliveries(['job-1'], null, dependencies({ claim: async () => { throw Error('DB down'); }, send: async () => assert.fail('must not send without claiming') }));
  assert.deepEqual(result.map(item => item.status), ['UNCONFIRMED', 'UNCONFIRMED']);
});

test('queued copy requires durable failure, remaining attempts and a configured scheduler', async () => {
  const rejected = { send: async () => { throw Error('PHILSMS_DELIVERY_FAILED: provider rejection'); } };
  assert.equal((await processDeliveryJob(job, dependencies(rejected))).status, 'QUEUED');
  assert.equal((await processDeliveryJob(job, dependencies({ ...rejected, retryScheduled: false }))).status, 'FAILED');
  assert.equal((await processDeliveryJob(job, dependencies(rejected), false)).status, 'FAILED');
  assert.equal((await processDeliveryJob({ ...job, attemptCount: 3 }, dependencies(rejected))).status, 'FAILED');
  assert.equal((await processDeliveryJob(job, dependencies({ ...rejected, record: async () => { throw Error('DB down'); } }))).status, 'FAILED');
});

test('ambiguous network failure is held for review, not automatically sent twice', async () => {
  const writes = [];
  const result = await processDeliveryJob(job, dependencies({ send: async () => { throw new TypeError('fetch failed'); }, record: async (id, value) => writes.push(value.status) }));
  assert.equal(result.status, 'UNCONFIRMED');
  assert.deepEqual(writes, ['PROCESSING']);
});

test('email still sends if SMS fails and missing credentials are reported separately', async () => {
  const result = await processCorrectionDeliveries(['job-1'], null, dependencies({
    claim: async () => [job, { ...job, id:'email-1', channel:'EMAIL' }],
    send: async item => { if (item.channel === 'SMS') throw Error('PHILSMS_NOT_CONFIGURED'); return { providerId:'email-1' }; },
  }));
  assert.deepEqual(result.map(item => item.status), ['NOT_CONFIGURED', 'SENT']);
});

test('cron authorization rejects absent secrets and invalid credentials', () => {
  assert.equal(isCronAuthorized(null, 'secret'), false);
  assert.equal(isCronAuthorized('Bearer undefined', ''), false);
  assert.equal(isCronAuthorized('Bearer wrong', 'secret'), false);
  assert.equal(isCronAuthorized('Bearer secret', 'secret'), true);
});

test('retry selection excludes legacy ambiguous provider errors and processing jobs', () => {
  const queue = readFileSync('lib/resident-applications/delivery-queue.ts','utf8');
  const claim = queue.slice(queue.indexOf('with claimable as'),queue.indexOf('update resident_notification_deliveries delivery'));
  assert.doesNotMatch(claim,/last_error like/);
  assert.match(claim,/last_error in \('PHILSMS_DELIVERY_FAILED', 'RESEND_DELIVERY_FAILED'/);
  assert.doesNotMatch(claim,/'PROCESSING'/);
  assert.match(claim,/attempt_count < max_attempts/);
  assert.match(claim,/for update skip locked/);
});

test('HTTP correction handler returns saved status even if delivery service throws', async () => {
  const source = readFileSync('app/api/municipal-bfp/resident-applications/[applicationId]/request-corrections/route.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  let committed = false;
  const requireStub = name => {
    if (name === 'next/server') return { NextResponse: Response };
    if (name.endsWith('/delivery-service')) return { deliverResidentCorrectionNotifications: async () => { assert.equal(committed, true); throw Error('queue unavailable'); } };
    if (name.endsWith('/delivery-engine')) return { unconfirmedDeliveries: () => [{ channel:'SMS',status:'UNCONFIRMED' },{ channel:'EMAIL',status:'UNCONFIRMED' }] };
    if (name.endsWith('/service')) return {
      getMunicipalReviewer: async () => ({ municipalityId:'municipality-a',userId:'reviewer-a' }),
      requestResidentApplicationCorrections: async () => { committed=true; return { status:'CHANGES_REQUESTED',deliveryIds:['job-1'],directDelivery:null }; },
    };
    throw Error(`Unexpected module ${name}`);
  };
  new Function('require','exports',code)(requireStub,exports);
  const response = await exports.POST(new Request('https://alab.test/review', { method:'POST',body:JSON.stringify({ reason:'Please update the ID photo' }) }), { params:Promise.resolve({ applicationId:'application-a' }) });
  assert.equal(response.status,200);
  const body = await response.json();
  assert.equal(body.application.status,'CHANGES_REQUESTED');
  assert.equal(body.delivery[0].status,'UNCONFIRMED');
  assert.equal(body.error,undefined);
});

test('cron route does not invoke the sender without authorization', async () => {
  const source = readFileSync('app/api/cron/resident-correction-deliveries/route.ts','utf8');
  const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  let calls = 0;
  new Function('require','exports',code)(name => {
    if(name === 'next/server') return {NextResponse:Response};
    if(name.endsWith('/cron')) return {isCronAuthorized: value => isCronAuthorized(value,'test-worker-secret')};
    if(name.endsWith('/delivery-service')) return {retryResidentCorrectionNotifications: async () => {calls++;return {processed:2,sent:2};}};
    throw Error(name);
  },exports);
  assert.equal((await exports.GET(new Request('https://alab.test/cron'))).status,401);
  assert.equal(calls,0);
  const response = await exports.GET(new Request('https://alab.test/cron',{headers:{Authorization:'Bearer test-worker-secret'}}));
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{processed:2,sent:2});
  assert.equal(calls,1);
});

test('provider server errors remain unconfirmed instead of becoming safe-to-retry rejections', async () => {
  const { sendPhilSmsMessage } = await import('../lib/sms/philsms.ts');
  const { sendResendEmail } = await import('../lib/email/resend.ts');
  const originalFetch = globalThis.fetch;
  const keys = ['PHILSMS_API_TOKEN','PHILSMS_SENDER_ID','RESEND_API_KEY','RESEND_FROM_EMAIL'];
  const previous = keys.map(key => process.env[key]);
  keys.forEach(key => {process.env[key]='test-value';});
  globalThis.fetch = async () => new Response('{}',{status:502});
  try {
    await assert.rejects(sendPhilSmsMessage({phone:'09171234567',message:'Test'}),/PHILSMS_DELIVERY_UNCONFIRMED/);
    await assert.rejects(sendResendEmail({to:'test@example.com',subject:'Test',html:'Test',text:'Test',idempotencyKey:'test-key'}),/RESEND_DELIVERY_UNCONFIRMED/);
  } finally {
    globalThis.fetch=originalFetch;
    keys.forEach((key,index)=>{ if(previous[index]===undefined) delete process.env[key]; else process.env[key]=previous[index]; });
  }
});
