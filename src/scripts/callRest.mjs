//-----------------------------------------------------------------------------------------
// Rest calls for Viewer UI
//-----------------------------------------------------------------------------------------


/* Shared imports */
import {doRestCall} from '/shared/scripts/common.js';


const RESTurl = `${window.location.protocol}//${window.location.host}`;

export function getMatchLog(id, sequence) {
  const url = `${RESTurl}/rest/match-log/${id}${sequence ? `?sequence=${sequence}` : ''}`;
  return doRestCall({url: url, method: 'GET', resultAsJson: true});
}

export function getMatchValidationLog(id, sequence) {
  const url = `${RESTurl}/rest/match-validation-log/${id}${sequence ? `?sequence=${sequence}` : ''}`;
  return doRestCall({url: url, method: 'GET', resultAsJson: true});
}

export function getMergeLog(id, sequence) {
  const url = `${RESTurl}/rest/merge-log/${id}${sequence ? `?sequence=${sequence}` : ''}`;
  return doRestCall({url: url, method: 'GET', resultAsJson: true});
}

export function getCorrelationIdList(expanded, logItemTypes) {
  const url = `${RESTurl}/rest/correlation-id-list${expanded ? `?expanded=${expanded}` : `?expanded=0`}${logItemTypes ? `&logItemTypes=${logItemTypes}` : ``}`;
  return doRestCall({url: url, method: 'GET', resultAsJson: true});
}

export function protectLog(id, sequence) {
  const url = `${RESTurl}/rest/protect/${id}${sequence ? `?sequence=${sequence}` : ''}`;
  return doRestCall({url: url, method: 'PUT'});
}

export function removeLog(id, force) {
  const url = `${RESTurl}/rest/remove/${id}${force ? `?force=${force}` : ''}`;
  return doRestCall({url: url, method: 'DELETE'});
}

//*****************************************************************************
// AUTHENTICATION (melinda login)
//*****************************************************************************

export function authGetBaseToken(data) {
  const authConfig = {
    url: '/auth/getBaseToken',
    method: 'POST',
    body: data,
    resultAsJson: true
  };
  return doAuthRequest(authConfig);
}

export function authLogin(baseToken) {
  const authConfig = {
    url: '/auth/verifyBasic',
    method: 'GET',
    token: baseToken,
    errorOnNotOk: true
  };
  return doAuthRequest(authConfig);
}

export function authVerify() {
  const authConfig = {
    url: '/auth/verifyJwt',
    method: 'GET',
    resultAsJson: true
  };
  return doAuthRequest(authConfig);
}

async function doAuthRequest({url = undefined, method = undefined, token = undefined, body = undefined, resultAsJson = false, errorOnNotOk = false}) {
  const requestUrl = `${RESTurl}${url}`;
  const requestConfig = {
    method: method.toUpperCase(),
    headers: {},
    credentials: 'include',
    cache: 'no-store'
  };

  //exception configs
  setAuthHeaders();

  if (body) {
    requestConfig.headers.Accept = 'application/json';
    requestConfig.headers['Content-Type'] = 'application/json';
    requestConfig.body = JSON.stringify(body);
  }

  const response = await fetch(requestUrl, requestConfig);
  if (errorOnNotOk && !response.ok) {
    const notOkAuthMessage = `Call to ${url} returned not ok`;
    console.warn(notOkAuthMessage);
    throw new Error(notOkAuthMessage);
  }
  if (response.redirected) {
    window.location.href = response.url;
    return;
  }
  if (resultAsJson) {
    return response.json();
  }
  return response;

  function setAuthHeaders() {
    if (token) {
      requestConfig.headers.Authorization = token;
      return;
    }

    requestConfig.headers['Access-Control-Allow-Credentials'] = true;
    requestConfig.headers['Access-Control-Allow-Headers'] = ['Origin', 'Content-Type', 'Accept', 'Authorization', 'Set-Cookie'];
  }
}
