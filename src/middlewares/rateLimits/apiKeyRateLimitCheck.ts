import { Context, Next } from 'hono';
import { env } from 'hono/adapter';
import { PORTKEY_HEADER_KEYS } from '../portkey/globals';
import { checkRateLimits } from '../portkey/handlers/helpers';
import { generateApiErrorResponse } from '../../utils/error';

export const apiKeyRateLimitCheckMiddleware = () => {
  return async (c: Context, next: Next) => {
    const requestOrigin = c.req.raw.headers.get('Origin');
    const headers = c.get('headersObj');
    const organisationDetails = JSON.parse(
      headers[PORTKEY_HEADER_KEYS.ORGANISATION_DETAILS]
    );

    const orgApiKey = headers[PORTKEY_HEADER_KEYS.API_KEY];

    const requestsRateLimit = organisationDetails.rateLimits.filter(
      (rl: any) => rl.type === 'requests'
    )?.[0];

    if (!requestsRateLimit) {
      return next();
    }

    if (
      requestsRateLimit &&
      requestsRateLimit.value &&
      requestsRateLimit.value > 0
    ) {
      const withinRateLimit = await checkRateLimits(
        env(c),
        requestsRateLimit,
        orgApiKey,
        'API_KEY'
      );

      if (!withinRateLimit.allowed) {
        return generateApiErrorResponse(
          'Porket API Key Rate Limit Exceeded',
          '04',
          429,
          requestOrigin
        );
      }
    }

    return next();
  };
};
