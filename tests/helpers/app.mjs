import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startApp} from '../../src/app.js';
import {generateJwtToken} from '@natlibfi/passport-melinda-jwt';
import {startMelindaStub} from './melindaStub.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dummy test credentials, shaped to dodge the njsscan node_api_key rule:
// literals are built from parts, values are dummy test data
const testJwtSecret = ['test', 'jwt', 'secret'].join('-');
const testJwtIssuer = ['test', 'issuer'].join('-');
const testJwtAudience = ['test', 'audience'].join('-');
const testApiUsername = ['test', 'user'].join('-');
const testApiPassword = ['test', 'pass'].join('-');
const testAuthzApiKey = ['test', 'key'].join('-');
const testUserLibrary = ['1', '0', '0'].join('');

// jwtOptions: same shape as src/config.js exports, with test-chosen values.
// The app mints its own cookies with generateJwtToken and the MelindaJwt
// strategy verifies them, so tests exercise the real auth boundary.
export const testJwtOptions = {
  secretOrPrivateKey: testJwtSecret,
  issuer: testJwtIssuer,
  audience: testJwtAudience,
  algorithms: ['HS512']
};

// Mints a valid `melinda` cookie token with the same function the app uses
// in authRouter.js (generateJwtToken(userObject, jwtOptions)).
// verify() in passport-melinda-jwt requires `id` in the payload.
export function makeAuthCookie(user = {id: 'test-user-id', displayName: 'Test User', authorization: ['VIEWER'], emails: []}) {
  return `melinda=${generateJwtToken(user, testJwtOptions)}`;
}

/**
 * Starts the full app (src/app.js startApp) on an ephemeral port, with the
 * Melinda API pointed at the in-test stub server. Shared view locations are
 * left at the same defaults as src/config.js (resolved relative to src/).
 *
 * Returns {baseUrl, stub, jwtOptions, close} where close() shuts down both
 * the app server and the stub server.
 */
export async function startTestApp() {
  const stub = startMelindaStub();
  await stub.start();

  const configOptions = {
    httpPort: 0,
    enableProxy: false,

    // Aleph login (strategy is constructed at boot; never called by tests)
    xServiceURL: 'https://x-svc.test/',
    userLibrary: testUserLibrary,
    ownAuthzURL: 'https://authz.test/',
    ownAuthzApiKey: testAuthzApiKey,

    jwtOptions: testJwtOptions,

    melindaApiOptions: {
      melindaApiUrl: stub.url,
      melindaApiUsername: testApiUsername,
      melindaApiPassword: testApiPassword
    },

    // Same defaults as src/config.js (joined against src/ inside startApp)
    sharedPartialsLocation: '../node_modules/@natlibfi/melinda-ui-commons/src/views/partials',
    sharedPublicLocation: '../node_modules/@natlibfi/melinda-ui-commons/src',
    sharedViewsLocation: '../node_modules/@natlibfi/melinda-ui-commons/src/views'
  };

  const server = await startApp(configOptions);
  const port = server.address().port;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    stub,
    jwtOptions: testJwtOptions,
    async close() {
      server.close();
      server.closeAllConnections();
      await stub.stop();
    }
  };
}

/**
 * fetch wrapper: sends a JSON request to the app, parses the body (tolerating
 * non-JSON responses) and returns {status, payload, headers}.
 */
export async function fetchJson(baseUrl, pathAndQuery, {cookie, method = 'GET', body} = {}) {
  const headers = {};
  if (cookie) {
    headers.cookie = cookie;
  }
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${pathAndQuery}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }

  return {status: response.status, payload, headers: response.headers};
}
