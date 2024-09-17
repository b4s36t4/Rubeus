import { Context } from 'hono';
import { uploadToLogStore } from '../services/winky';
import { env } from 'hono/adapter';
import { logger } from '../apm';

export async function customLogHandler(c: Context): Promise<Response> {
  try {
    const requestBody = await c.req.json();
    return uploadToLogStore(
      requestBody,
      'generations',
      false,
      env(c),
      c.req.raw
    );
  } catch (err: any) {
    logger.error({
      message: `customLogHandler error: ${err.message}`,
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
