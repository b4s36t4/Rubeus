import { Context, Env } from 'hono';
import { CACHE_STATUS, PORTKEY_HEADER_KEYS, MODES } from './globals';
import { putInCache } from './handlers/cache';
import { forwardToWinky } from './handlers/logger';
import { OrganisationDetails, WinkyLogObject } from './types';
import { BEDROCK, GOOGLE, GOOGLE_VERTEX_AI } from '../../globals';
import { checkRateLimits } from './handlers/helpers';

export const getMappedCacheType = (cacheHeader: string) => {
  if (!cacheHeader) {
    return null;
  }

  if (['simple', 'true'].includes(cacheHeader)) {
    return 'simple';
  }

  if (cacheHeader === 'semantic') {
    return 'semantic';
  }

  return null;
};

export function getPortkeyHeaders(
  headersObj: Record<string, string>
): Record<string, string> {
  const final: Record<string, string> = {};
  const pkHeaderKeys = Object.values(PORTKEY_HEADER_KEYS);
  Object.keys(headersObj).forEach((key: string) => {
    if (pkHeaderKeys.includes(key)) {
      final[key] = headersObj[key];
    }
  });
  delete final[PORTKEY_HEADER_KEYS.ORGANISATION_DETAILS];
  return final;
}

export async function postResponseHandler(
  winkyBaseLog: WinkyLogObject,
  responseBodyJson: Record<string, any>,
  env: Env,
  c: Context
): Promise<void> {
  const cacheResponseBody = { ...responseBodyJson };
  // Put in Cache if needed
  if (
    winkyBaseLog.config.cacheType &&
    [
      CACHE_STATUS.MISS,
      CACHE_STATUS.SEMANTIC_MISS,
      CACHE_STATUS.REFRESH,
    ].includes(winkyBaseLog.config.cacheStatus) &&
    winkyBaseLog.responseStatus === 200 &&
    winkyBaseLog.config.organisationDetails?.id &&
    winkyBaseLog.debugLogSetting
  ) {
    const cacheKeyUrl = [MODES.PROXY, MODES.PROXY_V2, MODES.API].includes(
      winkyBaseLog.config.proxyMode
    )
      ? winkyBaseLog.requestURL
      : winkyBaseLog.rubeusURL;

    delete cacheResponseBody.hook_results;
    await putInCache(
      env,
      c,
      {
        ...winkyBaseLog.requestHeaders,
        ...winkyBaseLog.config.portkeyHeaders,
      },
      winkyBaseLog.requestBodyParams,
      cacheResponseBody,
      cacheKeyUrl,
      winkyBaseLog.config.organisationDetails.id,
      winkyBaseLog.config.cacheType,
      winkyBaseLog.config.cacheMaxAge
    );
  }

  // Log this request
  await forwardToWinky(env, winkyBaseLog);
  return;
}

export const getStreamingMode = (
  reqBody: Record<string, any>,
  provider: string,
  requestUrl: string
): boolean => {
  if (
    [GOOGLE, GOOGLE_VERTEX_AI].includes(provider) &&
    requestUrl.indexOf('stream') > -1
  ) {
    return true;
  }
  if (
    provider === BEDROCK &&
    requestUrl.indexOf('invoke-with-response-stream') > -1
  ) {
    return true;
  }
  return reqBody.stream;
};

/**
 * Gets the debug log setting based on request headers and organisation details.
 * Priority is given to x-portkey-debug header if its passed in request.
 * Else default org level setting is considered.
 * @param {Record<string, string>} requestHeaders - The headers from the incoming request.
 * @param {Record<string, any>} organisationDetails - The details of the organisation.
 * @returns {boolean} The debug log setting.
 */
export function getDebugLogSetting(
  requestHeaders: Record<string, string>,
  organisationDetails: Record<string, any>
): boolean {
  const debugSettingHeader =
    requestHeaders[PORTKEY_HEADER_KEYS.DEBUG_LOG_SETTING]?.toLowerCase();

  if (debugSettingHeader === 'false') return false;
  else if (debugSettingHeader === 'true') return true;

  const organisationDebugLogSetting = organisationDetails.settings?.debug_log;

  if (organisationDebugLogSetting === 0) return false;

  return true;
}

export async function preRequestValidator(
  env: any,
  options: Record<string, any>,
  requestHeaders: Record<string, any>
) {
  if (
    options.isVirtualKeyExhausted ||
    requestHeaders[PORTKEY_HEADER_KEYS.VIRTUAL_KEY_EXHAUSTED]
  ) {
    const virtualKey =
      options.virtualKey || requestHeaders[PORTKEY_HEADER_KEYS.VIRTUAL_KEY];
    return new Response(
      JSON.stringify({
        error: {
          message: `virtual key ${hash(virtualKey)} provided is exhausted`,
          type: 'virtual_key_exhaust_error',
          param: null,
          code: null,
        },
      }),
      {
        headers: {
          'content-type': 'application/json',
        },
        status: 412,
      }
    );
  }

  let virtualKeyRateLimits =
    options.virtualKeyRateLimits ||
    requestHeaders[PORTKEY_HEADER_KEYS.VIRTUAL_KEY_RATE_LIMITS];

  if (virtualKeyRateLimits) {
    virtualKeyRateLimits =
      typeof virtualKeyRateLimits === 'string'
        ? JSON.parse(virtualKeyRateLimits)
        : virtualKeyRateLimits;

    const virtualKey =
      options.virtualKey || requestHeaders[PORTKEY_HEADER_KEYS.VIRTUAL_KEY];

    const requestsRateLimit = virtualKeyRateLimits.filter(
      (rl: any) => rl.type === 'requests'
    )?.[0];

    if (
      requestsRateLimit &&
      requestsRateLimit.value &&
      requestsRateLimit.value > 0
    ) {
      const requestRateLimitCheckObject = {
        value: virtualKey,
        rateLimits: requestsRateLimit,
      };

      const withinRateLimit = await checkRateLimits(
        env,
        requestRateLimitCheckObject.rateLimits,
        virtualKey,
        'VIRTUAL_KEY'
      );

      if (!withinRateLimit.allowed) {
        return new Response(
          JSON.stringify({
            error: {
              message: `virtual key ${hash(virtualKey)} rate limit exceeded`,
              type: 'virtual_key_rate_limit_error',
              param: null,
              code: null,
            },
          }),
          {
            headers: {
              'content-type': 'application/json',
            },
            status: 429,
          }
        );
      }
    }
  }
}

export const hash = (string: string | null | undefined) => {
  if (string === null || string === undefined) return null;
  //remove bearer from the string
  if (string.startsWith('Bearer ')) string = string.slice(7, string.length);
  return (
    string.slice(0, 2) +
    '********' +
    string.slice(string.length - 3, string.length)
  );
};

/**
 * Updates headers object with default config_slug and metadata of an api key.
 *
 * @param {Object} headersObj - The original headers object to update.
 * @param {OrganisationDetails} orgDetails - The organisation details object.
 */
export function updateHeaders(
  headersObj: Record<string, string>,
  orgDetails: OrganisationDetails
) {
  if (
    !headersObj[PORTKEY_HEADER_KEYS.CONFIG] &&
    orgDetails.defaults?.config_slug
  ) {
    headersObj[PORTKEY_HEADER_KEYS.CONFIG] = orgDetails.defaults.config_slug;
  }

  if (orgDetails.defaults?.metadata) {
    try {
      const incomingMetadata = headersObj[PORTKEY_HEADER_KEYS.METADATA]
        ? JSON.parse(headersObj[PORTKEY_HEADER_KEYS.METADATA])
        : {};
      headersObj[PORTKEY_HEADER_KEYS.METADATA] = JSON.stringify({
        ...orgDetails.defaults.metadata,
        ...incomingMetadata,
      });
    } catch (err) {
      headersObj[PORTKEY_HEADER_KEYS.METADATA] = JSON.stringify({
        ...orgDetails.defaults.metadata,
      });
    }
  }
}
