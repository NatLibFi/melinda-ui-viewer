import {Router} from 'express';
import {createLogger} from '@natlibfi/melinda-backend-commons';
import {createLogsOperator} from '../../services/index.js';
import {handleError, handleFailedQueryParams, handleFailedRouteParams} from '../routerUtils/routerUtils.js';

//****************************************************************************//
//                                                                            //
// Log service router                                                         //
//                                                                            //
//****************************************************************************//


export function createLogServiceRouter(melindaApiOptions) {
  const logger = createLogger();
  const logsOperator = createLogsOperator(melindaApiOptions);

  return new Router()
    .use(handleFailedQueryParams)
    .get('/match-log/:id', handleFailedRouteParams, getMatchLog)
    .get('/merge-log/:id', handleFailedRouteParams, getMergeLog)
    .get('/correlation-id-list', handleFailedRouteParams, getCorrelationIdList)
    .put('/protect/:id', handleFailedRouteParams, protectLog)
    .delete('/remove/:id', handleFailedRouteParams, removeLog)
    .use(handleError);


  async function getMatchLog(req, res, next) {
    logger.info('GET getMatchLog');

    const correlationId = req.params.id;
    const blobSequence = req.query.sequence;

    const params = {
      correlationId,
      ...blobSequence ? {blobSequence} : {},
      limit: 0
    };

    logger.verbose(`Getting match log with correlation id ${JSON.stringify(params.correlationId)}`);
    logger.verbose(blobSequence ? `Sequence selected for fetching: ${JSON.stringify(params.blobSequence)}` : `No sequence selected, getting all sequences for this id`);


    try {
      const result = await logsOperator.getMatchLog(params);
      res.json(result);
    } catch (error) {
      return next(error);
    }

  }


  async function getMergeLog(req, res, next) {
    logger.info('GET getMergeLog');

    const correlationId = req.params.id;
    const blobSequence = req.query.sequence;

    const params = {
      correlationId,
      ...blobSequence ? {blobSequence} : {},
      limit: 0
    };

    logger.verbose(`Getting merge log with correlation id ${JSON.stringify(params.correlationId)}`);
    logger.verbose(blobSequence ? `Sequence selected for fetching: ${JSON.stringify(params.blobSequence)}` : `No sequence selected, getting all sequences for this id`);

    try {
      const result = await logsOperator.getMergeLog(params);
      res.json(result);
    } catch (error) {
      return next(error);
    }

  }


  async function getCorrelationIdList(req, res, next) {
    logger.info('GET getCorrelationIdList');

    const {expanded, logItemTypes} = req.query;

    const params = {
      expanded,
      ...logItemTypes ? {logItemTypes} : {},
      limit: 0
    };

    logger.verbose(`Getting correlation id list with expanded value: ${JSON.stringify(params.expanded)}`);
    logger.verbose(logItemTypes
      ? `Log item types selected for fetching: ${JSON.stringify(params.logItemTypes)}`
      : `No log item types selected, getting default log item type`);

    try {
      const result = await logsOperator.getCorrelationIdList(params);
      res.json(result);
    } catch (error) {
      return next(error);
    }

  }


  async function protectLog(req, res, next) {
    logger.info('PUT protectLog');

    const correlationId = req.params.id;
    const {sequence} = req.query;

    const params = sequence ? {blobSequence: sequence} : {};

    logger.verbose(`Protecting (or unprotecting) log id: ${JSON.stringify(correlationId)}`);
    logger.verbose(sequence ? `Sequence selected for protecting: ${JSON.stringify(params.blobSequence)}` : `No sequence selected, protecting all sequences for this id`);

    try {
      const result = await logsOperator.protectLog(correlationId, params);
      res.json(result);
    } catch (e) {
      return next(e);
    }
  }


  async function removeLog(req, res, next) {
    logger.info('DELETE removeLog');

    const correlationId = req.params.id;
    const {force} = req.query;

    const params = {
      force
    };

    logger.verbose(`Removing log: ${JSON.stringify(correlationId)}, params: ${JSON.stringify(params)}`);

    try {
      const result = await logsOperator.removeLog(correlationId, params);
      res.json(result);
    } catch (e) {
      return next(e);
    }
  }

}
