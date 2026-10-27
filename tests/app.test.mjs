import {after, before, test} from 'node:test';
import assert from 'node:assert/strict';
import {startTestApp, makeAuthCookie, fetchJson} from './helpers/app.mjs';
import {fixtures} from './helpers/melindaStub.mjs';

// App-level server tests for melinda-ui-viewer.
// The full app is started once against the in-test stub Melinda server.
//
//   T1 GET /nonexistent -> 404, not a 500 crash
//   T2 GET /rest/match-log/:id without cookie -> rejected
//   T3 DELETE /rest/remove + PUT /rest/protect without cookie -> rejected
//   T4 GET /rest/correlation-id-list with cookie -> 200 passthrough;
//      malformed id -> 4xx, rejected before reaching the API
//   T5 POST /auth/getBaseToken missing fields -> 4xx, not 500

let app;
const authCookie = makeAuthCookie();

before(async () => {
  app = await startTestApp();
});

after(async () => {
  await app.close();
});

test('T1: unknown page returns 404, not a 500 crash (GET /nonexistent)', async () => {
  const result = await fetchJson(app.baseUrl, '/nonexistent');

  assert.equal(result.status, 404,
    `GET /nonexistent should return 404, got ${result.status} (req.oidc crash in handlePageNotFound)`);
});

test('T2: unauthenticated GET /rest/match-log/123 does not return 200 with data', async () => {
  app.stub.reset();
  const result = await fetchJson(app.baseUrl, '/rest/match-log/123');

  assert.ok(result.status >= 400,
    `unauthenticated GET /rest/match-log/123 should be rejected, got ${result.status} with body ${JSON.stringify(result.payload)}`);
  assert.equal(result.payload, null,
    `unauthenticated GET /rest/match-log/123 must not return data, got ${JSON.stringify(result.payload)}`);
});

test('T3: unauthenticated DELETE /rest/remove/123 and PUT /rest/protect/123 do not succeed', async () => {
  app.stub.reset();
  const remove = await fetchJson(app.baseUrl, '/rest/remove/123', {method: 'DELETE'});
  const protect = await fetchJson(app.baseUrl, '/rest/protect/123', {method: 'PUT'});

  assert.ok(remove.status >= 400,
    `unauthenticated DELETE /rest/remove/123 should be rejected, got ${remove.status} with body ${JSON.stringify(remove.payload)}`);
  assert.ok(protect.status >= 400,
    `unauthenticated PUT /rest/protect/123 should be rejected, got ${protect.status} with body ${JSON.stringify(protect.payload)}`);
});

test('T4: authenticated correlation-id-list passes the stub through, and malformed ids are rejected locally', async () => {
  app.stub.reset();

  const list = await fetchJson(app.baseUrl, '/rest/correlation-id-list?sequence=1234', {cookie: authCookie});
  assert.equal(list.status, 200,
    `authenticated GET /rest/correlation-id-list should return 200, got ${list.status} with body ${JSON.stringify(list.payload)}`);
  assert.deepEqual(list.payload, fixtures.logsList,
    `correlation-id-list should be the stub fixture passed through, got ${JSON.stringify(list.payload)}`);

  const requestsBefore = app.stub.requests.length;
  const malformed = await fetchJson(app.baseUrl, '/rest/match-log/not-a-number-id', {cookie: authCookie});
  assert.ok(malformed.status >= 400 && malformed.status < 500,
    `GET /rest/match-log/not-a-number-id should be rejected with 4xx, got ${malformed.status} with body ${JSON.stringify(malformed.payload)}`);
  const forwarded = app.stub.requests.slice(requestsBefore);
  assert.ok(!forwarded.some(request => request.url.includes('not-a-number-id')),
    `malformed id must not be forwarded to the Melinda API, but stub saw: ${JSON.stringify(forwarded)}`);
});

test('T5: POST /auth/getBaseToken with missing username/password returns 4xx, not 500', async () => {
  const result = await fetchJson(app.baseUrl, '/auth/getBaseToken', {method: 'POST', body: {}});

  assert.ok(result.status >= 400 && result.status < 500,
    `POST /auth/getBaseToken with missing username/password should return 4xx, got ${result.status} with body ${JSON.stringify(result.payload)}`);
});
