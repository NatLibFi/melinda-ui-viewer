import {createLogger} from '@natlibfi/melinda-backend-commons';
import {Error} from '@natlibfi/melinda-commons';
import httpStatus from 'http-status';

//*****************************************************************************
// Middleware for checking query string parameters
//*****************************************************************************
// - logs debug info for developer
// - checks app specific query parameters
// - if some query parameters fail, next is called with http status '400 - Bad request'
//-----------------------------------------------------------------------------
//

export function handleFailedQueryParams(req, res, next) {
  const logger = createLogger();
  const queryParams = req.query;
  const route = req.baseUrl;

  logger.debug('.-._.-._.-._.-._.-._.-._.-._.-._.-._.-._.-._.-._.-._.-._');
  logger.debug(`Starting query parameter check for app...`);
  logger.verbose(`The current route is: ${route}`);
  logger.verbose(`All query parameters: ${JSON.stringify(queryParams)}`);

  const failedParams = [...checkviewerQueryParams(queryParams)]
    .filter(param => !param.value)
    .map(param => param.name);

  if (failedParams.length === 0) {
    logger.info(`Query parameter check for app passed!`);
    logger.debug('.-._.-._.-._.-._.-._.-._.-._.-._.-._.-._.-._.-._.-._.-._');
    return next();
  }

  logger.warn(`Failed query parameters: ${failedParams}`);
  const error = new Error(httpStatus.BAD_REQUEST, 'Invalid query parameter');
  //return next(createError(400));
  return next(error);


  //*****************************************************************************
  // App specific checks for query parameters
  //-----------------------------------------------------------------------------
  //  - every function returns array of objects
  //       - objects have two properties: name and value
  //       - name is string (the query parameter name)
  //       - value is boolean (if the check is passed or not)
  //  - if query parameter is found in request (is defined), it is tested, and value is set true of false
  //  - otherwise check is automatically passed and value is set true
  //-----------------------------------------------------------------------------


  //-----------------------------------------------------------------------------
  // Checks viewer app specific query parameters
  //  - possible viewer query parameters are:
  //  - not all parameters are present in every request

  function checkviewerQueryParams(queryParams) {
    return [];
  }

  function testQueryParameter(queryParameter, validValues) {
    let allValid = true;
    const queryParameterValuesAsArray = queryParameter.split(',');

    function isValid(valueToTest) {
      return validValues.some((validValue) => valueToTest === validValue);
    }

    queryParameterValuesAsArray.forEach(queryParameterValue => {
      if (!isValid(queryParameterValue)) {
        logger.debug(`Not a valid query parameter value: ${queryParameterValue}`);
        allValid = false;
      }
    });

    return allValid;
  }
}
