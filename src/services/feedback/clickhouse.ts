import { logger } from '../../apm';
import clickhouseClient from '../../data-stores/clickhouse';
import { globals } from './configs';

export const insertFeedback = async (
  env: Record<string, any>,
  feedbackTable: string,
  feedbackDataArray: any[]
) => {
  const result: any = {};
  let query = `INSERT INTO ${feedbackTable} (id, trace_id, organisation_id, value, weight, source, created_at, meta.key, meta.value) VALUES `;

  for (const eachFeedback of feedbackDataArray) {
    query += `('${eachFeedback.id}', '${eachFeedback.trace_id}', '${eachFeedback.organisation_id}', ${eachFeedback.value}, ${eachFeedback.weight}, '${eachFeedback.source}', '${eachFeedback._created_at}', ${eachFeedback['meta.key']}, ${eachFeedback['meta.value']}),`;
  }

  try {
    await clickhouseClient.command({
      query,
    });
  } catch (err: any) {
    result.err = err;
    logger.error({
      message: `insertFeedback: ${err.message}`,
    });
  }
  return result;
};

export const deleteFeedbacks = async (
  env: Record<string, any>,
  feedbackTable: string,
  organisationId: string,
  id: string,
  traceId: string,
  source: string
) => {
  const result: any = {};
  const query = `ALTER TABLE ${feedbackTable} DELETE 
  WHERE organisation_id='${organisationId}' 
  AND id = '${id}'
  AND trace_id = '${traceId}'
  AND source = '${source}'`;
  try {
    await clickhouseClient.command({
      query,
    });
  } catch (err: any) {
    result.err = err;
    logger.error({
      message: `deleteFeedbacks: ${err.message}`,
    });
  }
  return result;
};

export const getFeedback = async (
  env: Record<string, any>,
  db: string | null,
  organisationId: string,
  id: any
) => {
  const result: any = {};
  const query = `SELECT * FROM ${db}.feedbacks 
  WHERE organisation_id='${organisationId}' 
  AND id = '${id}'
  AND source = '${globals.defaultSource}'
  FORMAT json`;

  try {
    const feedbackQueryResponse = await clickhouseClient.query({
      query,
      format: 'JSONEachRow',
    });

    result.data = await feedbackQueryResponse.json();
  } catch (err: any) {
    result.err = err;
    logger.error({
      message: `getFeedback: ${err.message}`,
    });
  }

  return result;
};
