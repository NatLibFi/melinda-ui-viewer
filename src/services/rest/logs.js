import {createLogger} from '@natlibfi/melinda-backend-commons';
import {createMelindaApiLogClient} from '@natlibfi/melinda-rest-api-client';

//****************************************************************************//
//                                                                            //
// Logs operator                                                              //
//                                                                            //
//****************************************************************************//

export function createLogsOperator(melindaApiOptions) {
  const logger = createLogger();
  const restApiLogClient = createMelindaApiLogClient(melindaApiOptions);

  return {getMatchLog, getMergeLog, getCorrelationIdList, protectLog, removeLog};


  async function getMatchLog(params) {
    logger.info('LOGS SERVICE: getMatchLog');

    const result = await restApiLogClient.getLog({logItemType: 'MATCH_LOG', ...params});
    const matchLogs = result.filter(log => log.logItemType === 'MATCH_LOG');

    return {...matchLogs};
  }


  async function getMergeLog(params) {
    logger.info('LOGS SERVICE: getMergeLog');

    const result = await restApiLogClient.getLog({logItemType: 'MERGE_LOG', ...params});
    const mergeLogs = result.filter(log => log.logItemType === 'MERGE_LOG');

    return {...mergeLogs};
  }


  async function getCorrelationIdList(params) {
    logger.info('LOGS SERVICE: getCorrelationIdList');

    const result = await restApiLogClient.getLogsList(params);
    return result;
  }


  async function protectLog(correlationId, params) {
    logger.info('LOGS SERVICE: protectLog');

    const result = await restApiLogClient.protectLog(correlationId, params);
    return result;
  }


  async function removeLog(correlationId, params) {
    logger.info('LOGS SERVICE: removeLog');

    const result = await restApiLogClient.removeLog(correlationId, params);
    return result;
  }

}
