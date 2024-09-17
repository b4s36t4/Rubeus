import { Context } from 'hono';
import { getLogFromLogStore } from '../services/winky';
import { env } from 'hono/adapter';
import { PORTKEY_HEADER_KEYS } from '../middlewares/portkey/globals';
import { logger } from '../apm';
import { LogOptions } from '../middlewares/portkey/types';

export async function logsGetHandler(c: Context): Promise<Response> {
  try {
    const organisationDetails = JSON.parse(
      c.get('headersObj')[PORTKEY_HEADER_KEYS.ORGANISATION_DETAILS]
    );
    const logId = c.req.param('id');
    const retentionPeriod =
      organisationDetails.settings?.system_log_retention || 30;
    const logOptions: LogOptions = {
      filePath: `${retentionPeriod}/${organisationDetails.id}/${logId}.json`,
      mongoCollectionName: process.env.MONGO_COLLECTION_NAME,
    };

    const log = await getLogFromLogStore(
      env(c),
      organisationDetails,
      logId,
      logOptions
    );
    return new Response(JSON.stringify(log), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });
  } catch (err: any) {
    logger.error({
      message: `logsGet error: ${err.message}`,
    });
    return new Response(
      JSON.stringify({
        status: 'failure',
        message: 'Something went wrong',
      }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json',
        },
      }
    );
  }
}
