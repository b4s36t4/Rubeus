import { logger } from '../../apm';
import {
  CacheKeyTypes,
  PORTKEY_HEADER_KEYS,
} from '../../middlewares/portkey/globals';
import {
  fetchFromKVStore,
  generateV2CacheKey,
  putInKVStore,
} from '../../middlewares/portkey/handlers/cache';
import { WorkspaceDetails } from '../../middlewares/portkey/types';

/**
 * Asynchronously fetch data from Albus.
 *
 * @param {string} url - The URL to fetch data from.
 * @param {any} options - method and headers for the fetch request.
 * @returns {Promise<any|null>} - A Promise that resolves to the fetched data or null if an error occurs.
 */
const fetchFromAlbus = async (
  url: string,
  options: any
): Promise<any | null> => {
  try {
    const response = await fetch(url, options);

    if (response.ok) {
      const responseFromAlbus: any = await response.json();
      return responseFromAlbus.data || responseFromAlbus;
    } else {
      console.log(
        'not found in albus',
        url,
        await response.clone().text(),
        response.status,
        JSON.stringify(options)
      );
    }
  } catch (error) {
    console.log('error in fetching API Key from Albus', error);
  }

  return null;
};

export const fetchApiKeyDetails = async (
  env: Record<string, any>,
  apiKey: string
) => {
  /**
   * Make a call to KV to get the organisation ID from API Key
   *       if found
   *              return
   *       if the KV cache returns null, make a call to albus to get the organisation ID
   *          if found in albus
   *              return
   *              store the API key with organisation ID in KV cache
   *          if not found
   *              if the albus call returns null, return null
   */

  //check in KV cache, return if found
  const cacheKey = generateV2CacheKey({
    cacheKeyType: CacheKeyTypes.API_KEY,
    key: apiKey,
  });
  try {
    const data = await fetchFromKVStore(env, cacheKey);
    if (data) return data;
  } catch (error: any) {
    logger.error({
      message: `fetchOrganisationIdFromAPIKey getFromKV error: ${error.message}`,
    });
  }

  //check in albus, return and save in KV if found
  const albusFetchUrl = `${env.ALBUS_BASEPATH}/v2/api-keys/self/details?include_organisation=true&include_workspace=true`;
  const albusFetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      [PORTKEY_HEADER_KEYS.API_KEY]: apiKey,
      [PORTKEY_HEADER_KEYS.AUTHORIZATION]: env.PORTKEY_CLIENT_AUTH,
    },
  };

  try {
    const response = await fetch(albusFetchUrl, albusFetchOptions);
    if (response.status === 200) {
      const responseFromAlbus: any = await response.json();
      if (responseFromAlbus !== null) {
        const { api_key_details } = responseFromAlbus.data;
        const apiKeyIdCacheKey = generateV2CacheKey({
          cacheKeyType: CacheKeyTypes.API_KEY_ID,
          key: api_key_details.id,
        });
        const apiKeyIdCacheValue = {
          key: apiKey,
        };

        // found in albus add to KV cache(async) and return
        putInKVStore(env, cacheKey, responseFromAlbus.data);
        putInKVStore(env, apiKeyIdCacheKey, apiKeyIdCacheValue);
        return responseFromAlbus.data || responseFromAlbus;
      }
    }
    return null;
  } catch (error: any) {
    logger.error({
      message: `fetchOrganisationIdFromAPIKey error: ${error.message}`,
    });
  }
};
/**
 * Asynchronously fetches virtual key details using the virtual key slug.
 *
 * @param {any} env - Hono environment object
 * @param {string} orgApiKey - The API key for the organization.
 * @param {string} organisationId - The ID of the organization.
 * @param {string} providerKeySlug - The virtual key slugs.
 * @returns {Promise<any | null>} - A Promise that resolves to the fetched data or null if an error occurs.
 */
export const fetchOrganisationProviderFromSlug = async (
  env: Record<string, any>,
  orgApiKey: string,
  organisationId: string,
  workspaceDetails: WorkspaceDetails,
  providerKeySlug: string,
  refetch?: boolean
): Promise<any | null> => {
  const cacheKey = generateV2CacheKey({
    organisationId,
    workspaceId: workspaceDetails.id,
    cacheKeyType: CacheKeyTypes.VIRTUAL_KEY,
    key: providerKeySlug,
  });
  if (!refetch) {
    const responseFromKV = await fetchFromKVStore(env, cacheKey);

    if (responseFromKV) {
      return responseFromKV;
    }
  }

  //check in albus, return and save in KV if found
  const albusFetchUrl = `${env.ALBUS_BASEPATH}/v2/virtual-keys/${providerKeySlug}?organisation_id=${organisationId}&workspace_id=${workspaceDetails.id}`;
  const albusFetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: env.PORTKEY_CLIENT_AUTH,
      [PORTKEY_HEADER_KEYS.API_KEY]: orgApiKey,
    },
  };

  const responseFromAlbus = await fetchFromAlbus(
    albusFetchUrl,
    albusFetchOptions
  );
  if (responseFromAlbus) {
    await putInKVStore(env, cacheKey, responseFromAlbus);
  }

  return responseFromAlbus;
};

export const updateOrganisationProviderKey = async (
  env: Record<string, any>,
  orgApiKey: string,
  organisationId: string,
  workspaceDetails: WorkspaceDetails,
  providerKeyId: string,
  providerKeySlug: string,
  updateObj: any
): Promise<any | null> => {
  //check in albus, return and save in KV if found
  const albusFetchUrl = `${env.ALBUS_BASEPATH}/v2/virtual-keys/${providerKeyId}?organisation_id=${organisationId}&workspace_id=${workspaceDetails.id}`;
  const albusFetchOptions = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: env.PORTKEY_CLIENT_AUTH,
      [PORTKEY_HEADER_KEYS.API_KEY]: orgApiKey,
    },
    body: JSON.stringify(updateObj),
  };

  const responseFromAlbus = await fetchFromAlbus(
    albusFetchUrl,
    albusFetchOptions
  );
  if (responseFromAlbus) {
    await fetchOrganisationProviderFromSlug(
      env,
      orgApiKey,
      organisationId,
      workspaceDetails,
      providerKeySlug,
      true
    );
  }
};

/**
 * Fetches organization configuration details based on the given parameters.
 *
 * @param {Object} env - Hono configuration object.
 * @param {string} orgApiKey - Organisation portkey API key.
 * @param {string} organisationId - Organisation ID.
 * @param {string} configSlug - Config slug identifier.
 * @returns {Promise<any|null>} A Promise that resolves to the organization configuration details,
 *                                or null if the configuration is not found or if it fails.
 */
export const fetchOrganisationConfig = async (
  env: Record<string, any>,
  orgApiKey: string,
  organisationId: string,
  workspaceDetails: WorkspaceDetails,
  configSlug: string
) => {
  const cacheKey = generateV2CacheKey({
    organisationId,
    workspaceId: workspaceDetails.id,
    cacheKeyType: CacheKeyTypes.CONFIG,
    key: configSlug,
  });
  // fetch the config based on configSlug
  const configDetailsFromKV = await fetchFromKVStore(env, cacheKey);
  if (configDetailsFromKV) {
    return {
      organisationConfig: JSON.parse(configDetailsFromKV.config),
      configVersion: configDetailsFromKV.version_id,
    };
  }

  //fetch from albus
  const albusUrl = `${env.ALBUS_BASEPATH}/v2/configs/${configSlug}?organisation_id=${organisationId}&workspace_id=${workspaceDetails.id}`;
  const albusFetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: env.PORTKEY_CLIENT_AUTH,
      [PORTKEY_HEADER_KEYS.API_KEY]: orgApiKey,
    },
  };

  const responseFromAlbus: any = await fetchFromAlbus(
    albusUrl,
    albusFetchOptions
  );
  if (responseFromAlbus) {
    // found in albus add to KV cache(async) and return
    await putInKVStore(env, cacheKey, responseFromAlbus);
    return {
      organisationConfig: JSON.parse(responseFromAlbus.config),
      configVersion: responseFromAlbus.version_id,
    };
  }

  return null;
};

export const fetchOrganisationPrompt = async (
  env: Record<string, any>,
  organisationId: string,
  workspaceDetails: WorkspaceDetails,
  apiKey: string,
  promptSlug: string,
  isCacheRefreshEnabled: boolean
) => {
  //check in KV cache, return if found
  const cacheKey = generateV2CacheKey({
    organisationId,
    workspaceId: workspaceDetails.id,
    cacheKeyType: CacheKeyTypes.PROMPT,
    key: promptSlug,
  });

  if (!isCacheRefreshEnabled) {
    const responseFromCache = await fetchFromKVStore(env, cacheKey);
    if (responseFromCache) {
      return responseFromCache;
    }
  }

  //check in albus, return and save in KV if found
  const albusFetchUrl = `${env.ALBUS_BASEPATH}/v2/prompts/${promptSlug}?organisation_id=${organisationId}&workspace_id=${workspaceDetails.id}`;
  const albusFetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: env.PORTKEY_CLIENT_AUTH,
      [PORTKEY_HEADER_KEYS.API_KEY]: apiKey,
    },
  };

  const responseFromAlbus = await fetchFromAlbus(
    albusFetchUrl,
    albusFetchOptions
  );
  if (responseFromAlbus) {
    await putInKVStore(env, cacheKey, responseFromAlbus);
    return responseFromAlbus;
  }
  return null;
};

export const fetchOrganisationPromptPartial = async (
  env: Record<string, any>,
  organisationId: string,
  workspaceDetails: WorkspaceDetails,
  apiKey: string,
  promptPartialSlug: string,
  isCacheRefreshEnabled: boolean
) => {
  //check in KV cache, return if found
  const cacheKey = generateV2CacheKey({
    organisationId,
    workspaceId: workspaceDetails.id,
    cacheKeyType: CacheKeyTypes.PROMPT_PARTIAL,
    key: promptPartialSlug,
  });
  if (!isCacheRefreshEnabled) {
    const responseFromCache = await fetchFromKVStore(env, cacheKey);
    if (responseFromCache) {
      return responseFromCache;
    }
  }

  //check in albus, return and save in KV if found
  const albusFetchUrl = `${env.ALBUS_BASEPATH}/v2/prompts/partials/${promptPartialSlug}?organisation_id=${organisationId}&workspace_id=${workspaceDetails.id}`;
  const albusFetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: env.PORTKEY_CLIENT_AUTH,
      [PORTKEY_HEADER_KEYS.API_KEY]: apiKey,
    },
  };

  const responseFromAlbus = await fetchFromAlbus(
    albusFetchUrl,
    albusFetchOptions
  );
  if (responseFromAlbus) {
    await putInKVStore(env, cacheKey, responseFromAlbus);
    return responseFromAlbus;
  }
  return null;
};

export async function resyncOrganisationData({
  env,
  organisationId,
  apiKeysToReset,
  apiKeysToExhaust,
  apiKeysToAlertThreshold,
  virtualKeysToReset,
  virtualKeysToAlertThreshold,
  virtualKeysToExhaust,
}: {
  env: Record<string, any>;
  organisationId: string;
  apiKeysToReset?: string[];
  apiKeysToExhaust?: string[];
  apiKeysToAlertThreshold?: string[];
  virtualKeysToReset?: string[];
  virtualKeysToAlertThreshold?: string[];
  virtualKeysToExhaust?: string[];
}) {
  const path = `${env.ALBUS_BASEPATH}/v1/organisation/${organisationId}/resync`;
  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: env.PORTKEY_CLIENT_AUTH,
    },
    body: JSON.stringify({
      apiKeysToReset,
      apiKeysToExhaust,
      apiKeysToAlertThreshold,
      virtualKeysToReset,
      virtualKeysToExhaust,
      virtualKeysToAlertThreshold,
    }),
  };
  const responseFromAlbus = await fetch(path, options);

  if (!responseFromAlbus.ok) {
    await responseFromAlbus.text();
  }
}

export const fetchOrganisationGuardrail = async (
  env: any,
  orgId: string,
  workspaceDetails: WorkspaceDetails,
  apiKey: string,
  guardrailSlug: string,
  isCacheRefreshEnabled: boolean
) => {
  //check in KV cache, return if found
  const cacheKey = generateV2CacheKey({
    organisationId: orgId,
    cacheKeyType: CacheKeyTypes.GUARDRAIL,
    key: guardrailSlug,
    workspaceId: workspaceDetails.id,
  });

  if (!isCacheRefreshEnabled) {
    const responseFromCache = await fetchFromKVStore(env, cacheKey);
    if (responseFromCache) {
      return responseFromCache;
    }
  }

  //check in albus, return and save in KV if found
  const albusFetchUrl = `${env.ALBUS_BASEPATH}/v2/guardrails/${guardrailSlug}`;
  const albusFetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      [PORTKEY_HEADER_KEYS.API_KEY]: apiKey,
      Authorization: env.PORTKEY_CLIENT_AUTH,
    },
  };

  const responseFromAlbus = await fetchFromAlbus(
    albusFetchUrl,
    albusFetchOptions
  );
  if (responseFromAlbus) {
    await putInKVStore(env, cacheKey, responseFromAlbus);
    return responseFromAlbus;
  }
  return null;
};

export const fetchOrganisationIntegrations = async (
  env: any,
  orgId: string,
  apiKey: string,
  isCacheRefreshEnabled: boolean
) => {
  //check in KV cache, return if found
  const cacheKey = generateV2CacheKey({
    organisationId: orgId,
    cacheKeyType: CacheKeyTypes.INTEGRATIONS,
    key: 'all',
  });

  if (!isCacheRefreshEnabled) {
    const responseFromCache = await fetchFromKVStore(env, cacheKey);
    if (responseFromCache) {
      return responseFromCache;
    }
  }

  //check in albus, return and save in KV if found
  const albusFetchUrl = `${env.ALBUS_BASEPATH}/v2/integrations/?organisation_id=${orgId}`;
  const albusFetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      [PORTKEY_HEADER_KEYS.API_KEY]: apiKey,
      Authorization: env.PORTKEY_CLIENT_AUTH,
    },
  };

  const responseFromAlbus = await fetchFromAlbus(
    albusFetchUrl,
    albusFetchOptions
  );

  if (responseFromAlbus) {
    await putInKVStore(env, cacheKey, responseFromAlbus);
    return responseFromAlbus;
  }
  return null;
};
