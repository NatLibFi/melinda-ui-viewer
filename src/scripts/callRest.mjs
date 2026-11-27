//-----------------------------------------------------------------------------------------
// Rest calls for Viewer UI
//-----------------------------------------------------------------------------------------


const RESTurl = `${window.location.protocol}//${window.location.host}`;

export function getMatchLog(id, sequence) {
  const url = `${RESTurl}/rest/match-log/${encodeURIComponent(id)}${sequence ? `?sequence=${encodeURIComponent(sequence)}` : ''}`;
  return doRestCall({url: url, method: 'GET', resultAsJson: true});
}

export function getMergeLog(id, sequence) {
  const url = `${RESTurl}/rest/merge-log/${encodeURIComponent(id)}${sequence ? `?sequence=${encodeURIComponent(sequence)}` : ''}`;
  return doRestCall({url: url, method: 'GET', resultAsJson: true});
}

export function getCorrelationIdList(expanded, logItemTypes) {
  const url = `${RESTurl}/rest/correlation-id-list${expanded ? `?expanded=${expanded}` : `?expanded=0`}${logItemTypes ? `&logItemTypes=${logItemTypes}` : ``}`;
  return doRestCall({url: url, method: 'GET', resultAsJson: true});
}

export function protectLog(id, sequence) {
  const url = `${RESTurl}/rest/protect/${encodeURIComponent(id)}${sequence ? `?sequence=${encodeURIComponent(sequence)}` : ''}`;
  return doRestCall({url: url, method: 'PUT'});
}

export function removeLog(id, force) {
  const url = `${RESTurl}/rest/remove/${encodeURIComponent(id)}${force ? `?force=${encodeURIComponent(force)}` : ''}`;
  return doRestCall({url: url, method: 'DELETE'});
}

//*****************************************************************************
// REST CALL
//*****************************************************************************
//
// Same contract as doRestCall in melinda-ui-commons (resolves to the JSON
// body or the response when ok, otherwise to failureResult), except that a
// 401 from /rest - the melinda session cookie is missing or has expired -
// sends the user to the login page instead of being reported as a failed
// search. The current query string (id, logType, sequence) is carried over,
// so after logging in the user lands back on the same log.

export async function doRestCall({url = undefined, method = undefined, body = undefined, contentType = undefined, resultAsJson = false, failureResult = undefined}) {
  const headers = {
    'Accept': 'application/json',
    ...contentType ? {'Content-Type': contentType} : {}
  };

  try {
    const result = await fetch(url, {method, headers, ...body ? {body} : {}});

    if (result.status === 401) {
      redirectToLogin();
      // The page is navigating away: never settle, so callers do not show
      // a failure message in the meantime.
      return new Promise(() => {});
    }

    if (result.ok) {
      return resultAsJson ? result.json() : result;
    }

    throw new Error(result.status);
  } catch (error) {
    console.error('fetch() failed', error);
    return failureResult;
  }
}

function redirectToLogin() {
  console.warn('Session has expired or is missing, redirecting to login');
  window.location.assign(`/login${window.location.search}`);
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
