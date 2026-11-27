import {before, beforeEach, test} from 'node:test';
import assert from 'node:assert/strict';

// callRest.mjs is a browser module: give it the window/fetch it needs.
const assigned = [];
const fetched = [];
let nextResponse;

globalThis.window = {
  location: {
    protocol: 'http:',
    host: 'viewer.test',
    search: '?id=3f2b8c1e-9a4d-4e7f-b2c1-0d5e6f7a8b9c&logType=MATCH_LOG',
    assign: url => assigned.push(url)
  }
};
globalThis.fetch = (url, options) => {
  fetched.push({url, options});
  return Promise.resolve(nextResponse);
};

let callRest;

before(async () => {
  callRest = await import('../src/scripts/callRest.mjs');
});

beforeEach(() => {
  assigned.length = 0;
  fetched.length = 0;
});

function response(status, body) {
  return {status, ok: status >= 200 && status < 300, json: async () => body};
}

function settlesWithin(promise, ms) {
  return Promise.race([
    promise.then(() => true, () => true),
    new Promise(resolve => setTimeout(() => resolve(false), ms))
  ]);
}

test('doRestCall resolves to the JSON body on 200', async () => {
  nextResponse = response(200, {0: {correlationId: 'x'}});
  const result = await callRest.getMatchLog('3f2b8c1e-9a4d-4e7f-b2c1-0d5e6f7a8b9c', '2');

  assert.deepEqual(result, {0: {correlationId: 'x'}});
  assert.equal(fetched[0].url, 'http://viewer.test/rest/match-log/3f2b8c1e-9a4d-4e7f-b2c1-0d5e6f7a8b9c?sequence=2');
  assert.deepEqual(assigned, []);
});

test('doRestCall resolves to failureResult (undefined) on other errors, without redirecting', async () => {
  nextResponse = response(400, {});
  const result = await callRest.getMatchLog('not-a-uuid');

  assert.equal(result, undefined);
  assert.deepEqual(assigned, []);
});

test('doRestCall redirects to login on 401, keeping the query string, and never settles', async () => {
  nextResponse = response(401, null);
  const pending = callRest.getMergeLog('3f2b8c1e-9a4d-4e7f-b2c1-0d5e6f7a8b9c');

  assert.equal(await settlesWithin(pending, 50), false, 'a 401 must not settle (no failure snackbar while navigating)');
  assert.deepEqual(assigned, ['/login?id=3f2b8c1e-9a4d-4e7f-b2c1-0d5e6f7a8b9c&logType=MATCH_LOG']);
});

test('ids and sequences are URL-encoded into the request path', async () => {
  nextResponse = response(200, {});
  await callRest.protectLog('a/../remove/b?force=1', '1&x=2');

  assert.equal(fetched[0].url, 'http://viewer.test/rest/protect/a%2F..%2Fremove%2Fb%3Fforce%3D1?sequence=1%26x%3D2');
  assert.equal(fetched[0].options.method, 'PUT');
});
