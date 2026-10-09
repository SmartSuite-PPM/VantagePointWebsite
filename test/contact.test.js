// Lightweight checks for api/contact.js. Run with: npm test
const assert = require('assert');
const handler = require('../api/contact.js');

function mockRes() {
  return {
    statusCode: null, body: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

const valid = {
  name: 'Jane Smith', company: 'Acme Capital', email: 'jane@acmecapital.com',
  phone: '', stage: 'integration', message: 'Hello <b>team</b>',
};

(async () => {
  process.env.RESEND_API_KEY = 'test';
  process.env.CONTACT_TO_EMAIL = 'team@example.com';
  process.env.CONTACT_FROM_EMAIL = 'Site <site@example.com>';

  let res = mockRes();
  await handler({ method: 'GET' }, res);
  assert.strictEqual(res.statusCode, 405, 'rejects GET');

  res = mockRes();
  await handler({ method: 'POST', body: { ...valid, email: 'bad' } }, res);
  assert.strictEqual(res.statusCode, 400, 'rejects invalid email');

  res = mockRes();
  await handler({ method: 'POST', body: { ...valid, message: '' } }, res);
  assert.strictEqual(res.statusCode, 400, 'rejects missing message');

  res = mockRes();
  await handler({ method: 'POST', body: { ...valid, website: 'spam' } }, res);
  assert.strictEqual(res.statusCode, 200, 'honeypot returns silent success');

  let sent = null;
  global.fetch = async (url, opts) => { sent = { url, opts }; return { ok: true }; };
  res = mockRes();
  await handler({ method: 'POST', body: valid }, res);
  assert.strictEqual(res.statusCode, 200, 'sends valid enquiry');
  const payload = JSON.parse(sent.opts.body);
  assert.strictEqual(payload.reply_to, valid.email, 'reply_to set to visitor');
  assert.ok(payload.html.includes('&lt;b&gt;team&lt;/b&gt;'), 'message is HTML escaped');

  global.fetch = async () => ({ ok: false, status: 500, text: async () => 'boom' });
  res = mockRes();
  await handler({ method: 'POST', body: valid }, res);
  assert.strictEqual(res.statusCode, 502, 'reports provider failure');

  delete process.env.RESEND_API_KEY;
  res = mockRes();
  await handler({ method: 'POST', body: valid }, res);
  assert.strictEqual(res.statusCode, 500, 'reports missing configuration');

  console.log('All contact endpoint checks passed.');
})().catch((e) => { console.error(e); process.exit(1); });
