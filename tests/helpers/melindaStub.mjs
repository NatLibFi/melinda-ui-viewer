import http from 'node:http';

// Tiny in-test stub of the Melinda REST API.
//
// Answers exactly the endpoints that @natlibfi/melinda-rest-api-client's
// log client calls (see node_modules/@natlibfi/melinda-rest-api-client/src/log-client.js):
//   GET    /logs              -> getLog (match-log / merge-log routes)
//   GET    /logs/list         -> getLogsList (correlation-id-list route)
//   PUT    /logs/:correlationId  -> protectLog (protect route)
//   DELETE /logs/:correlationId  -> removeLog (remove route)
//
// It returns fixed JSON fixtures and records every received request
// ({method, url, headers}) so tests can assert what the app forwarded.

export const fixtures = {
  matchLogs: [
    {correlationId: '123', logItemType: 'MATCH_LOG', blobSequence: '001', catalogers: ['test-cataloger']},
    {correlationId: '123', logItemType: 'MERGE_LOG', blobSequence: '002', catalogers: ['test-cataloger']}
  ],
  logsList: [
    {correlationId: '123', logItemTypes: ['MATCH_LOG'], creationTime: '2026-10-26T10:00:00Z'}
  ],
  protectResult: {correlationId: '123', protectStatus: 'PROTECTED'},
  removeResult: {correlationId: '123', deleteStatus: 'DELETED'}
};

export function startMelindaStub() {
  const state = {requests: [], url: null};
  const server = http.createServer(routeRequest);

  return {requests: state.requests, get url() {return state.url;}, start, stop, reset};

  async function start() {
    await new Promise(resolve => {
      server.listen(0, '127.0.0.1', () => {
        state.url = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
    return state.url;
  }

  async function stop() {
    await new Promise(resolve => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }

  function reset() {
    state.requests.length = 0;
  }

  function routeRequest(req, res) {
    state.requests.push({method: req.method, url: req.url, headers: req.headers});

    const send = (status, body) => {
      res.writeHead(status, {'content-type': 'application/json'});
      res.end(JSON.stringify(body));
    };

    const [pathname, ...rest] = req.url.split('?');
    const segments = pathname.split('/');

    if (req.method === 'GET' && pathname === '/logs') {
      return send(200, fixtures.matchLogs);
    }

    if (req.method === 'GET' && pathname === '/logs/list') {
      return send(200, fixtures.logsList);
    }

    if (req.method === 'PUT' && segments[1] === 'logs' && segments.length === 3) {
      return send(200, fixtures.protectResult);
    }

    if (req.method === 'DELETE' && segments[1] === 'logs' && segments.length === 3) {
      return send(200, fixtures.removeResult);
    }

    return send(404, {error: `stub: no route for ${req.method} ${req.url}`});
  }
}
