import {parseBoolean} from '@natlibfi/melinda-commons';
import {readEnvironmentVariable} from '@natlibfi/melinda-backend-commons';

export const httpPort = readEnvironmentVariable('HTTP_PORT', {defaultValue: 8080, format: v => Number(v)});
export const enableProxy = readEnvironmentVariable('ENABLE_PROXY', {defaultValue: false, format: parseBoolean});

// Aleph login
export const xServiceURL = readEnvironmentVariable('ALEPH_X_SVC_URL');
export const userLibrary = readEnvironmentVariable('ALEPH_USER_LIBRARY');
export const ownAuthzURL = readEnvironmentVariable('OWN_AUTHZ_URL');
export const ownAuthzApiKey = readEnvironmentVariable('OWN_AUTHZ_API_KEY');
export const jwtOptions = {
  secretOrPrivateKey: readEnvironmentVariable('JWT_SECRET'),
  issuer: readEnvironmentVariable('JWT_ISSUER', {defaultValue: 'melinda-test.kansalliskirjasto.fi'}),
  audience: readEnvironmentVariable('JWT_AUDIENCE', {defaultValue: 'melinda-test.kansalliskirjasto.fi'}),
  algorithms: readEnvironmentVariable('JWT_ALGORITHMS', {defaultValue: ['HS512'], format: (v) => JSON.parse(v)})
};

export const melindaApiOptions = {
  melindaApiPassword: readEnvironmentVariable('MELINDA_API_PASSWORD', {defaultValue: ''}),
  melindaApiUrl: readEnvironmentVariable('MELINDA_API_URL', {defaultValue: false}),
  melindaApiUsername: readEnvironmentVariable('MELINDA_API_USERNAME', {defaultValue: ''})
};

export const sharedPartialsLocation = readEnvironmentVariable('SHARED_PARTIALS_LOCATION', {defaultValue: '../node_modules/@natlibfi/melinda-ui-commons/src/views/partials'});
export const sharedPublicLocation = readEnvironmentVariable('SHARED_PUBLIC_LOCATION', {defaultValue: '../node_modules/@natlibfi/melinda-ui-commons/src'});
export const sharedViewsLocation = readEnvironmentVariable('SHARED_VIEWS_LOCATION', {defaultValue: '../node_modules/@natlibfi/melinda-ui-commons/src/views'});
