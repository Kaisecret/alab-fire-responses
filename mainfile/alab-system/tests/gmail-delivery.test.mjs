import test from 'node:test';
import assert from 'node:assert/strict';
import { processDeliveryJob } from '../lib/resident-applications/delivery-engine.ts';

test('Gmail integrates with the existing retry and configuration states', async () => {
  const job = {id:'email-1',channel:'EMAIL',destination:'resident@example.com',payload:{},attemptCount:1};
  const deps = {send:async()=>{throw Error('GMAIL_NOT_CONFIGURED');},record:async()=>{},claim:async()=>[],retryScheduled:true};
  assert.equal((await processDeliveryJob(job,deps)).status,'NOT_CONFIGURED');
  assert.equal((await processDeliveryJob(job,{...deps,send:async()=>{throw Error('GMAIL_DELIVERY_FAILED');}})).status,'QUEUED');
  assert.equal((await processDeliveryJob(job,{...deps,send:async()=>{throw Error('GMAIL_DELIVERY_UNCONFIRMED');}})).status,'UNCONFIRMED');
});

test('Gmail sends as ALAB using the configured school account over TLS', async () => {
  const nodemailer = (await import('nodemailer')).default;
  const { sendGmailEmail } = await import('../lib/email/gmail.ts');
  const create = nodemailer.createTransport;
  const previous = [process.env.GMAIL_USER, process.env.GMAIL_APP_PASSWORD];
  let options, message, closed = false;
  process.env.GMAIL_USER = 'regalakhing@sac.edu.ph';
  process.env.GMAIL_APP_PASSWORD = 'abcd efgh ijkl mnop';
  nodemailer.createTransport = config => { options = config; return { sendMail: async value => { message = value; return { accepted: [value.to], messageId: 'gmail-1' }; }, close: () => { closed = true; } }; };
  try {
    const result = await sendGmailEmail({ to:'resident@example.com',subject:'Correction request',html:'<p>Please update your application.</p>',text:'Please update your application.' });
    assert.equal(options.host,'smtp.gmail.com');
    assert.equal(options.port,465);
    assert.equal(options.secure,true);
    assert.equal(options.auth.user,'regalakhing@sac.edu.ph');
    assert.equal(options.auth.pass,'abcdefghijklmnop');
    assert.deepEqual(message.from,{name:'ALAB',address:'regalakhing@sac.edu.ph'});
    assert.equal(message.to,'resident@example.com');
    assert.equal(result.providerId,'gmail-1');
    assert.equal(closed,true);
  } finally {
    nodemailer.createTransport = create;
    ['GMAIL_USER','GMAIL_APP_PASSWORD'].forEach((key,i)=>{ if(previous[i]===undefined) delete process.env[key]; else process.env[key]=previous[i]; });
  }
});

test('Gmail reports missing configuration, definite SMTP rejection, and uncertain timeout separately', async () => {
  const nodemailer = (await import('nodemailer')).default;
  const { sendGmailEmail } = await import('../lib/email/gmail.ts');
  const create = nodemailer.createTransport;
  const previous = [process.env.GMAIL_USER,process.env.GMAIL_APP_PASSWORD];
  const input = {to:'resident@example.com',subject:'Test',html:'Test',text:'Test'};
  try {
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    await assert.rejects(sendGmailEmail(input),/GMAIL_NOT_CONFIGURED/);
    process.env.GMAIL_USER='regalakhing@sac.edu.ph';
    process.env.GMAIL_APP_PASSWORD='abcdefghijklmnop';
    nodemailer.createTransport = () => ({ sendMail:async()=>{throw Object.assign(new Error('private server response'),{responseCode:535});},close:()=>{} });
    await assert.rejects(sendGmailEmail(input),/^Error: GMAIL_DELIVERY_FAILED$/);
    nodemailer.createTransport = () => ({ sendMail:async()=>{throw Object.assign(new Error('timeout'),{code:'ETIMEDOUT'});},close:()=>{} });
    await assert.rejects(sendGmailEmail(input),/GMAIL_DELIVERY_UNCONFIRMED/);
  } finally {
    nodemailer.createTransport=create;
    ['GMAIL_USER','GMAIL_APP_PASSWORD'].forEach((key,i)=>{ if(previous[i]===undefined) delete process.env[key]; else process.env[key]=previous[i]; });
  }
});
