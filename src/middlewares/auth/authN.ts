import { Context, Next } from 'hono';
import { env } from 'hono/adapter';
import { EntityStatus, PORTKEY_HEADER_KEYS } from '../portkey/globals';
import { generateApiErrorResponse } from '../../utils/error';
import { OrganisationDetails } from '../portkey/types';
import { fetchApiKeyDetails } from '../../services/albus';
import { checkApiKeyUsage } from '../portkey/handlers/usage';

export const authNMiddleWare = () => {
  return async (c: Context, next: Next) => {
    const requestOrigin = c.req.raw.headers.get('Origin');

    const portkeyApiKeyHeader = c.req.raw.headers.get(
      PORTKEY_HEADER_KEYS.API_KEY
    );

    const authorizationHeader = c.req.raw.headers
      .get(PORTKEY_HEADER_KEYS.AUTHORIZATION)
      ?.replace('Bearer ', '');

    let apiKey = portkeyApiKeyHeader;

    // If x-portkey-api-key is not present but authorization is present, use that as pk api key
    if (!apiKey && authorizationHeader) {
      apiKey = authorizationHeader;
    }

    if (!apiKey && authorizationHeader) {
      apiKey = authorizationHeader;
    }

    let apiKeyDetails;
    if (apiKey) {
      apiKeyDetails = await fetchApiKeyDetails(env(c), apiKey);
    }
    if (apiKeyDetails == null) {
      const message = 'Invalid API Key';
      return generateApiErrorResponse(message, '03', 401, requestOrigin);
    }
    if (!apiKey || !apiKeyDetails?.organisation_details?.organisation_id) {
      const message = 'Unable to validate key';
      return generateApiErrorResponse(message, '033', 401, requestOrigin);
    }
    const orgDetails = apiKeyDetails.organisation_details;
    const organisationDetails: OrganisationDetails = {
      id: orgDetails.organisation_id,
      ownerId: orgDetails.owner_id || null,
      name: orgDetails.name || null,
      settings: orgDetails.settings || {},
      isFirstGenerationDone: orgDetails.is_first_generation_done || null,
      enterpriseSettings: orgDetails.enterprise_settings || null,
      workspaceDetails: apiKeyDetails.workspace_details,
      scopes: apiKeyDetails.api_key_details?.scopes || [],
      rateLimits: apiKeyDetails.api_key_details?.rate_limits || [],
      defaults: apiKeyDetails.api_key_details?.defaults || {},
      usageLimits: apiKeyDetails.api_key_details?.usage_limits || {},
      status: apiKeyDetails.api_key_details?.status || EntityStatus.ACTIVE,
      apiKeyDetails: {
        id: apiKeyDetails.api_key_details.id,
      },
    };
    const isExhausted = await checkApiKeyUsage(
      env(c),
      organisationDetails,
      apiKey
    );
    if (isExhausted) {
      return generateApiErrorResponse(
        'Portkey API Key Usage Limit Exceeded',
        '04',
        412,
        requestOrigin
      );
    }
    const headersObj = Object.fromEntries(c.req.raw.headers);
    headersObj[PORTKEY_HEADER_KEYS.ORGANISATION_DETAILS] =
      JSON.stringify(organisationDetails);

    if (
      !isCustomLogger(c.req.url) &&
      !c.req.raw.headers.get(PORTKEY_HEADER_KEYS.TRACE_ID)
    ) {
      headersObj[PORTKEY_HEADER_KEYS.TRACE_ID] = crypto.randomUUID();
    }

    if (!portkeyApiKeyHeader && authorizationHeader) {
      headersObj[PORTKEY_HEADER_KEYS.API_KEY] = authorizationHeader;
    }

    c.set('headersObj', headersObj);
    return next();
  };
};

function isCustomLogger(reqUrl: string) {
  const url = new URL(reqUrl);
  const path = url.pathname;
  return path.startsWith('/v1/logs');
}
