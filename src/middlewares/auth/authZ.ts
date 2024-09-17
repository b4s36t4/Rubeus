import { Context, Next } from 'hono';
import { generateApiErrorResponse } from '../../utils/error';
import { PORTKEY_HEADER_KEYS } from '../portkey/globals';

export const authZMiddleWare = (allowedScopes: string[]) => {
  return async (c: Context, next: Next) => {
    const requestOrigin = c.req.raw.headers.get('Origin');
    const organisationDetails = JSON.parse(
      c.get('headersObj')[PORTKEY_HEADER_KEYS.ORGANISATION_DETAILS]
    );
    const isActionAllowed = allowedScopes.some((allowedScope) =>
      organisationDetails.scopes.includes(allowedScope)
    );
    if (!isActionAllowed) {
      return generateApiErrorResponse('Forbidden!', '033', 403, requestOrigin);
    }
    return next();
  };
};
