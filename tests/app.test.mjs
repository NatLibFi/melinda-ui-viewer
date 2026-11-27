import {after, before, test} from 'node:test';
import assert from 'node:assert/strict';
import {startTestApp, makeAuthCookie, fetchJson} from './helpers/app.mjs';
import {fixtures, testCorrelationId} from './helpers/melindaStub.mjs';

// App-level server tests for melinda-ui-viewer.
// The full app is started once against the in-test stub Melinda server.
//
//   T1 GET /nonexistent -> 404, not a 500 crash
//   T2 GET /rest/match-log/:id without cookie -> rejected
//   T3 DELETE /rest/remove + PUT /rest/protect without cookie -> rejected
//   T4 GET /rest/correlation-id-list with cookie -> 200 passthrough;
//      malformed id -> 4xx, rejected before reaching the API
//   T5 POST /auth/getBaseToken missing fields -> 4xx, not 500
//   T6 UUID v4 correlation ids pass validation and reach the API;
//      digit-only and non-v4 ids are rejected locally
//   T7 protect/remove forward the correlation id and params to the
//      Melinda API log endpoints
//   T8 the melinda auth cookie is HttpOnly and SameSite=Lax
//   T9 login redirects keep only the id/logType/sequence query params

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

test('T2: unauthenticated GET /rest/match-log/:id does not return 200 with data', async () => {
  app.stub.reset();
  const result = await fetchJson(app.baseUrl, `/rest/match-log/${testCorrelationId}`);

  assert.ok(result.status >= 400,
    `unauthenticated GET /rest/match-log/:id should be rejected, got ${result.status} with body ${JSON.stringify(result.payload)}`);
  assert.equal(result.payload, null,
    `unauthenticated GET /rest/match-log/:id must not return data, got ${JSON.stringify(result.payload)}`);
});

test('T3: unauthenticated DELETE /rest/remove/:id and PUT /rest/protect/:id do not succeed', async () => {
  app.stub.reset();
  const remove = await fetchJson(app.baseUrl, `/rest/remove/${testCorrelationId}`, {method: 'DELETE'});
  const protect = await fetchJson(app.baseUrl, `/rest/protect/${testCorrelationId}`, {method: 'PUT'});

  assert.ok(remove.status >= 400,
    `unauthenticated DELETE /rest/remove/:id should be rejected, got ${remove.status} with body ${JSON.stringify(remove.payload)}`);
  assert.ok(protect.status >= 400,
    `unauthenticated PUT /rest/protect/:id should be rejected, got ${protect.status} with body ${JSON.stringify(protect.payload)}`);
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

test('T6: UUID v4 correlation ids reach the API; digit-only and non-v4 ids are rejected locally', async () => {
  const accepted = [
    `/rest/match-log/${testCorrelationId}`,
    `/rest/match-log/${testCorrelationId}?sequence=2`,
    `/rest/merge-log/${testCorrelationId.toUpperCase()}`
  ];

  for (const pathAndQuery of accepted) {
    app.stub.reset();
    const result = await fetchJson(app.baseUrl, pathAndQuery, {cookie: authCookie});
    assert.equal(result.status, 200,
      `GET ${pathAndQuery} should return 200, got ${result.status} with body ${JSON.stringify(result.payload)}`);
    assert.ok(app.stub.requests.some(request => request.url.includes(`correlationId=${encodeURIComponent(pathAndQuery.split('/')[3].split('?')[0])}`)),
      `GET ${pathAndQuery} should be forwarded to the Melinda API, stub saw: ${JSON.stringify(app.stub.requests)}`);
  }

  app.stub.reset();
  const protect = await fetchJson(app.baseUrl, `/rest/protect/${testCorrelationId}?sequence=1`, {cookie: authCookie, method: 'PUT'});
  assert.equal(protect.status, 200,
    `PUT /rest/protect/:uuid should return 200, got ${protect.status} with body ${JSON.stringify(protect.payload)}`);

  const rejected = [
    '/rest/match-log/123',
    '/rest/match-log/3f2b8c1e9a4d4e7fb2c10d5e6f7a8b9c',
    '/rest/match-log/3f2b8c1e-9a4d-1e7f-b2c1-0d5e6f7a8b9c',
    `/rest/match-log/${testCorrelationId}x`,
    `/rest/match-log/${testCorrelationId}?sequence=abc`
  ];

  for (const pathAndQuery of rejected) {
    app.stub.reset();
    const result = await fetchJson(app.baseUrl, pathAndQuery, {cookie: authCookie});
    assert.equal(result.status, 400,
      `GET ${pathAndQuery} should be rejected with 400, got ${result.status} with body ${JSON.stringify(result.payload)}`);
    assert.equal(app.stub.requests.length, 0,
      `GET ${pathAndQuery} must not be forwarded to the Melinda API, but stub saw: ${JSON.stringify(app.stub.requests)}`);
  }
});

test('T7: protect and remove forward the correlation id and params to the Melinda API', async () => {
  app.stub.reset();
  const protect = await fetchJson(app.baseUrl, `/rest/protect/${testCorrelationId}?sequence=2`, {cookie: authCookie, method: 'PUT'});
  assert.equal(protect.status, 200,
    `PUT /rest/protect/:id should return 200, got ${protect.status} with body ${JSON.stringify(protect.payload)}`);
  assert.deepEqual(protect.payload, fixtures.protectResult);
  assert.deepEqual(app.stub.requests.map(({method, url}) => ({method, url})), [{method: 'PUT', url: `/logs/${testCorrelationId}?blobSequence=2`}],
    `protect should call PUT /logs/:correlationId?blobSequence=2, stub saw: ${JSON.stringify(app.stub.requests)}`);

  app.stub.reset();
  const remove = await fetchJson(app.baseUrl, `/rest/remove/${testCorrelationId}?force=1`, {cookie: authCookie, method: 'DELETE'});
  assert.equal(remove.status, 200,
    `DELETE /rest/remove/:id should return 200, got ${remove.status} with body ${JSON.stringify(remove.payload)}`);
  assert.deepEqual(remove.payload, fixtures.removeResult);
  assert.deepEqual(app.stub.requests.map(({method, url}) => ({method, url})), [{method: 'DELETE', url: `/logs/${testCorrelationId}?force=1`}],
    `remove should call DELETE /logs/:correlationId?force=1, stub saw: ${JSON.stringify(app.stub.requests)}`);
});

test('T8: the melinda auth cookie is set HttpOnly and SameSite=Lax', async () => {
  const result = await fetchJson(app.baseUrl, '/auth/verifyJwt', {cookie: authCookie});
  assert.equal(result.status, 200,
    `GET /auth/verifyJwt with a valid cookie should return 200, got ${result.status}`);

  const setCookie = result.headers.get('set-cookie') ?? '';
  assert.match(setCookie, /^melinda=/u, `expected a melinda cookie, got: ${setCookie}`);
  assert.match(setCookie, /;\s*HttpOnly/iu, `cookie should be HttpOnly, got: ${setCookie}`);
  assert.match(setCookie, /;\s*SameSite=Lax/iu, `cookie should be SameSite=Lax, got: ${setCookie}`);
});

test('T9: login redirects keep only the allowlisted id/logType/sequence query parameters', async () => {
  const getLocation = async (pathAndQuery, cookie) => {
    const response = await fetch(`${app.baseUrl}${pathAndQuery}`, {redirect: 'manual', headers: cookie ? {cookie} : {}});
    return {status: response.status, location: response.headers.get('location')};
  };
  const query = `id=${testCorrelationId}&logType=MATCH_LOG&sequence=2`;

  const toLogin = await getLocation(`/?${query}&next=https://evil.test&id2=x`);
  assert.equal(toLogin.status, 302);
  assert.equal(toLogin.location, `/login?${query}`,
    `unauthenticated / should redirect to /login with only the allowlisted params, got ${toLogin.location}`);

  const backToViewer = await getLocation(`/login?${query}&next=//evil.test`, authCookie);
  assert.equal(backToViewer.status, 302);
  assert.equal(backToViewer.location, `/?${query}`,
    `authenticated /login should redirect back to / with only the allowlisted params, got ${backToViewer.location}`);

  const noQuery = await getLocation('/');
  assert.equal(noQuery.location, '/login');

  const encoded = await getLocation('/?id=a%26b%3Dc%2F%2Fevil.test');
  assert.equal(encoded.location, '/login?id=a%26b%3Dc%2F%2Fevil.test',
    `parameter values should stay encoded, got ${encoded.location}`);
});
