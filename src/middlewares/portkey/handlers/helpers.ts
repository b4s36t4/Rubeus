import Mustache from '@portkey-ai/mustache';

import { getMode } from '..';
import {
  PORTKEY_HEADER_KEYS,
  MODES,
  providerAuthHeaderMap,
  providerAuthHeaderPrefixMap,
} from '../globals';
import {
  AZURE_OPEN_AI,
  BEDROCK,
  GOOGLE_VERTEX_AI,
  OPEN_AI,
  WORKERS_AI,
  RATE_LIMIT_UNIT_TO_WINDOW_MAPPING,
  AZURE_AI_INFERENCE,
} from '../../../globals';
import RedisRateLimiter from '../../../utils/rateLimiter';
import { redisClient } from '../../../data-stores/redis';
import { validateVirtualKeyUsage } from './usage';
import { WorkspaceDetails } from '../types';
import {
  fetchOrganisationConfig,
  fetchOrganisationGuardrail,
  fetchOrganisationIntegrations,
  fetchOrganisationPrompt,
  fetchOrganisationPromptPartial,
  fetchOrganisationProviderFromSlug,
} from '../../../services/albus';

export const getUniqueVirtualKeysFromConfig = (config: Record<string, any>) => {
  const uniqueVirtualKeys: Set<string> = new Set();

  function recursiveCollectKeysFromTarget(
    currentConfig: Record<string, any>,
    configTargetType: string
  ) {
    if (!currentConfig[configTargetType] && currentConfig.virtual_key) {
      uniqueVirtualKeys.add(currentConfig.virtual_key);
    }
    if (currentConfig[configTargetType]) {
      for (const target of currentConfig[configTargetType]) {
        recursiveCollectKeysFromTarget(target, configTargetType);
      }
    }
  }

  const configTargetType = config.options?.length ? 'options' : 'targets';

  recursiveCollectKeysFromTarget(config, configTargetType);

  return [...uniqueVirtualKeys];
};

export const getUniqueGuardrailsFromConfig = (config: Record<string, any>) => {
  const uniqueGuardrails: Set<string> = new Set();

  function recursiveCollectGuardrailsFromTarget(
    currentConfig: Record<string, any>
  ) {
    if (currentConfig.after_request_hooks) {
      currentConfig.after_request_hooks.forEach((h: any) => {
        if (!h.checks) uniqueGuardrails.add(h.id);
      });
    }
    if (currentConfig.before_request_hooks) {
      currentConfig.before_request_hooks.forEach((h: any) => {
        if (!h.checks) uniqueGuardrails.add(h.id);
      });
    }

    if (currentConfig.targets) {
      for (const target of currentConfig.targets) {
        recursiveCollectGuardrailsFromTarget(target);
      }
    }
  }

  recursiveCollectGuardrailsFromTarget(config);
  return [...uniqueGuardrails];
};

export const getVirtualKeyMap = async (
  env: any,
  virtualKeyArr: Array<string>,
  orgApiKey: string,
  organisationId: string,
  workspaceDetails: WorkspaceDetails,
  isVirtualKeyUsageEnabled: boolean
) => {
  const promises = virtualKeyArr.map(async (virtualKey) => {
    const apiKeyKVRecord = await fetchOrganisationProviderFromSlug(
      env,
      orgApiKey,
      organisationId,
      workspaceDetails,
      virtualKey
    );
    await validateVirtualKeyUsage({
      env,
      apiKey: orgApiKey,
      apiKeyKVRecord,
      isVirtualKeyUsageEnabled,
      organisationId,
      virtualKey,
      workspaceDetails,
    });
    return {
      virtualKey,
      apiKeyKVRecord,
    };
  });

  const results = await Promise.all(promises);

  const virtualKeyMap: Record<string, any> = {};
  const missingKeys: Array<string> = [];
  results.forEach(({ virtualKey, apiKeyKVRecord }) => {
    if (apiKeyKVRecord) {
      virtualKeyMap[virtualKey] = { ...apiKeyKVRecord };
    } else {
      missingKeys.push(virtualKey);
    }
  });

  return {
    virtualKeyMap,
    missingKeys,
  };
};

export const getGuardrailMap = async (
  env: any,
  guardrailSlugArr: Array<string>,
  orgApiKey: string,
  organisationId: string,
  workspaceDetails: WorkspaceDetails,
  integrations: any
): Promise<{
  guardrailMap: Record<string, any>;
  missingGuardrails: string[];
}> => {
  const fetchPromises = guardrailSlugArr.map(async (guardrailSlug) => {
    const guardrailKVRecord = await fetchOrganisationGuardrail(
      env,
      organisationId,
      workspaceDetails,
      orgApiKey,
      guardrailSlug,
      false
    );
    return { guardrailSlug, guardrailKVRecord };
  });

  const results = await Promise.all(fetchPromises);

  const guardrailMap: Record<string, any> = {};
  const missingGuardrails: Array<string> = [];

  results.forEach(({ guardrailSlug, guardrailKVRecord }) => {
    if (guardrailKVRecord) {
      // If any of the checks object array in the guardrailKvRecord
      // has an id field which when split by '.' and the first element
      // is not 'default', then attach the integration details to the parameters
      // key of the check object.
      const { checks } = guardrailKVRecord;
      checks.forEach((check: any) => {
        if (check.id && check.id.split('.')[0] !== 'default') {
          const integrationDetails = integrations.find(
            (integration: any) =>
              integration.integration_slug === check.id.split('.')[0]
          );
          check.parameters = {
            ...check.parameters,
            credentials: integrationDetails?.credentials,
          };
        }
      });
      guardrailMap[guardrailSlug] = { ...guardrailKVRecord };
    } else {
      missingGuardrails.push(guardrailSlug);
    }
  });

  return {
    guardrailMap,
    missingGuardrails,
  };
};

/**
 * Retrieves a map of prompts from KV store or albus in an async manner.
 *
 * @param {string} env - CF environment.
 * @param {string[]} promptSlugArr - An array of prompt slugs.
 * @param {string} orgApiKey - The organisation's API key.
 * @param {string} organisationId - The organisation's ID.
 * @returns {Promise<{ promptMap: Object, missingPrompts: string[] }>} A Promise resolving to an object containing the prompt map and an array of missing prompt_ids which are not found.
 */
export const getPromptMap = async (
  env: any,
  promptSlugArr: Array<string>,
  orgApiKey: string,
  organisationId: string,
  workspaceDetails: WorkspaceDetails
): Promise<{ promptMap: Record<string, any>; missingPrompts: string[] }> => {
  const fetchPromises = promptSlugArr.map(async (promptSlug) => {
    const promptKVRecord = await fetchOrganisationPrompt(
      env,
      organisationId,
      workspaceDetails,
      orgApiKey,
      promptSlug,
      false
    );
    return { promptSlug, promptKVRecord };
  });

  const results = await Promise.all(fetchPromises);

  const promptMap: Record<string, any> = {};
  const missingPrompts: Array<string> = [];

  results.forEach(({ promptSlug, promptKVRecord }) => {
    if (promptKVRecord) {
      promptMap[promptSlug] = { ...promptKVRecord };
    } else {
      missingPrompts.push(promptSlug);
    }
  });

  return {
    promptMap,
    missingPrompts,
  };
};

/**
 * Retrieves a map of prompts from KV store or albus in an async manner.
 *
 * @param {string} env - CF environment.
 * @param {string[]} promptPartialSlugArr - An array of prompt slugs.
 * @param {string} orgApiKey - The organisation's API key.
 * @param {string} organisationId - The organisation's ID.
 * @returns {Promise<{ promptPartialMap: Record<string, any>, missingPromptPartials: string[] }>} A Promise resolving to an object containing the prompt map and an array of missing prompt_ids which are not found.
 */
export const getPromptPartialMap = async (
  env: any,
  promptPartialSlugArr: Array<string>,
  orgApiKey: string,
  organisationId: string,
  workspaceDetails: WorkspaceDetails
): Promise<{
  promptPartialMap: Record<string, any>;
  missingPromptPartials: string[];
}> => {
  const fetchPromises = promptPartialSlugArr.map(
    async (promptPartialSlugArr) => {
      const promptKVRecord = await fetchOrganisationPromptPartial(
        env,
        organisationId,
        workspaceDetails,
        orgApiKey,
        promptPartialSlugArr,
        false
      );
      return { promptPartialSlugArr, promptKVRecord };
    }
  );

  const results = await Promise.all(fetchPromises);

  const promptPartialMap: Record<string, any> = {};
  const missingPromptPartials: Array<string> = [];

  results.forEach(({ promptPartialSlugArr, promptKVRecord }) => {
    if (promptKVRecord) {
      promptPartialMap[promptPartialSlugArr] = { ...promptKVRecord };
    } else {
      missingPromptPartials.push(promptPartialSlugArr);
    }
  });

  return {
    promptPartialMap,
    missingPromptPartials,
  };
};

/**
 * Returns a config object with prompts mapped based on the provided prompt map and request body.
 *
 * @param {Object} promptMap - A map of prompts where key is prompt_id and value is a prompt data object.
 * @param {Object} config - The original config object.
 * @param {Object} requestBody - The request body.
 * @returns {Object} A new config object with prompts mapped based on prompt_id.
 */
export const getPromptMappedConfig = (
  promptMap: Record<string, any>,
  promptPartialMap: Record<string, any>,
  config: Record<string, any>,
  requestBody: Record<string, any>,
  promptIDFromURL: string
) => {
  const mappedConfig = { ...config };

  function recursiveAddPromptsToTarget(currentConfig: Record<string, any>) {
    if (
      !currentConfig.targets &&
      currentConfig.prompt_id &&
      promptMap[currentConfig.prompt_id]
    ) {
      const {
        provider_key_slug,
        id: promptUUID,
        prompt_version_id,
      } = promptMap[currentConfig.prompt_id];
      currentConfig.virtual_key =
        currentConfig.virtual_key ?? provider_key_slug;
      currentConfig.prompt_uuid = promptUUID;
      currentConfig.prompt_version_id = prompt_version_id;
      const { requestBody: overrideParams } = createRequestFromPromptData(
        {},
        promptMap[currentConfig.prompt_id],
        promptPartialMap,
        requestBody,
        currentConfig.prompt_id
      );
      currentConfig.override_params = {
        ...overrideParams,
        ...currentConfig.override_params,
      };
    } else if (!currentConfig.targets && currentConfig.virtual_key) {
      // If only virtual key is present in prompt config, then add the promptID from url.
      const { id: promptUUID, prompt_version_id } = promptMap[promptIDFromURL];
      currentConfig.prompt_id = promptIDFromURL;
      currentConfig.prompt_uuid = promptUUID;
      currentConfig.prompt_version_id = prompt_version_id;
      const { requestBody: overrideParams } = createRequestFromPromptData(
        {},
        promptMap[currentConfig.prompt_id],
        promptPartialMap,
        requestBody,
        currentConfig.prompt_id
      );
      currentConfig.override_params = {
        ...overrideParams,
        ...currentConfig.override_params,
      };
    }

    if (currentConfig.targets) {
      for (const target of currentConfig.targets) {
        recursiveAddPromptsToTarget(target);
      }
    }
  }

  recursiveAddPromptsToTarget(mappedConfig);

  return mappedConfig;
};

export const getGuardrailMappedConfig = (
  guardrailMap: Record<string, any>,
  config: Record<string, any>
) => {
  const mappedConfig = { ...config };

  const addGuardrailToHook = (hook: any) => {
    if (hook.checks) return;

    const { checks, actions, version_id } = guardrailMap[hook.id];

    Object.assign(hook, {
      checks,
      type: 'guardrail',
      guardrail_version_id: version_id,
      on_fail: hook.on_fail || actions.on_fail,
      on_success: hook.on_success || actions.on_success,
      deny: typeof hook.deny === 'boolean' ? hook.deny : actions.deny,
      async: typeof hook.async === 'boolean' ? hook.async : actions.async,
    });
  };

  const processHooks = (hooks: any[] = []) => {
    hooks.forEach(addGuardrailToHook);
  };

  const recursiveAddGuardrailToHooks = (currentConfig: Record<string, any>) => {
    processHooks(currentConfig.after_request_hooks);
    processHooks(currentConfig.before_request_hooks);

    currentConfig.targets?.forEach(recursiveAddGuardrailToHooks);
  };

  recursiveAddGuardrailToHooks(mappedConfig);

  return mappedConfig;
};

/**
 * Extracts unique prompt IDs from a nested/simple config object.
 *
 * @param {Object} config - The config object.
 * @returns {Array} An array of unique prompt IDs.
 */
export const getUniquePromptSlugsFromConfig = (
  config: Record<string, any>
): Array<string> => {
  const uniquePromptSlugs: Set<string> = new Set();

  function recursiveCollectPromptSlugsFromTarget(
    currentConfig: Record<string, any>
  ) {
    if (!currentConfig.targets && currentConfig.prompt_id) {
      uniquePromptSlugs.add(currentConfig.prompt_id);
    }
    if (currentConfig.targets) {
      for (const target of currentConfig.targets) {
        recursiveCollectPromptSlugsFromTarget(target);
      }
    }
  }

  recursiveCollectPromptSlugsFromTarget(config);

  return [...uniquePromptSlugs];
};

/**
 * Gets the config object with LLM API keys mapped based on the virtual keys present in it.
 *
 * @param {Record<string, any>} virtualKeyMap - A mapping of virtual keys to its provider data.
 * @param {Record<string, any>} config - The original config object that needs to be mapped with API keys.
 * @returns {Record<string, any>} - The mapped config object with mapped virtual keys.
 */
export const getApiKeyMappedConfig = (
  virtualKeyMap: Record<string, any>,
  config: Record<string, any>
): Record<string, any> => {
  const mappedConfig = { ...config };

  function recursiveAddKeysToTarget(
    currentConfig: Record<string, any>,
    configTargetType: string
  ) {
    if (
      !currentConfig[configTargetType] &&
      currentConfig.virtual_key &&
      virtualKeyMap[currentConfig.virtual_key]
    ) {
      const {
        key,
        ai_provider_name,
        model_config,
        status,
        usage_limits,
        rate_limits,
      } = virtualKeyMap[currentConfig.virtual_key];
      if (status == 'exhausted') {
        currentConfig.isVirtualKeyExhausted = true;
      }
      currentConfig.virtualKeyUsageEnabled = !!usage_limits?.credit_limit;
      currentConfig.virtual_key_rate_limits = rate_limits || [];
      currentConfig.provider = ai_provider_name;
      if (currentConfig.provider !== GOOGLE_VERTEX_AI) {
        currentConfig.api_key = key;
      }

      if (currentConfig.provider === AZURE_OPEN_AI && model_config) {
        currentConfig.resource_name = model_config.resourceName;
        currentConfig.deployment_id = model_config.deploymentName;
        currentConfig.api_version = model_config.apiVersion;
        currentConfig.azure_model_name = model_config.aiModelName;
        currentConfig.azure_auth_mode = model_config.azureAuthMode;
        currentConfig.azure_entra_client_id = model_config.azureEntraClientId;
        currentConfig.azure_entra_client_secret =
          model_config.azureEntraClientSecret;
        currentConfig.azure_entra_tenant_id = model_config.azureEntraTenantId;
      }

      if (currentConfig.provider === AZURE_AI_INFERENCE && model_config) {
        currentConfig.azure_api_version = model_config.azureApiVersion;
        currentConfig.azure_deployment_name = model_config.azureDeploymentName;
        currentConfig.azure_deployment_type = model_config.azureDeploymentType;
        currentConfig.azure_region = model_config.azureRegion;
        if (model_config.azureEndpointName) {
          currentConfig.azure_endpoint_name = model_config.azureEndpointName;
        }
        currentConfig.azure_auth_mode = model_config.azureAuthMode;
        currentConfig.azure_entra_client_id = model_config.azureEntraClientId;
        currentConfig.azure_entra_client_secret =
          model_config.azureEntraClientSecret;
        currentConfig.azure_entra_tenant_id = model_config.azureEntraTenantId;
      }

      if (currentConfig.provider === BEDROCK && model_config) {
        const {
          awsAuthType,
          awsAccessKeyId,
          awsSecretAccessKey,
          awsRegion,
          awsRoleArn,
          awsExternalId,
        } = model_config;
        currentConfig.aws_auth_type = awsAuthType;
        currentConfig.aws_secret_access_key = awsSecretAccessKey;
        currentConfig.aws_region = awsRegion;
        currentConfig.aws_access_key_id = awsAccessKeyId;
        currentConfig.aws_role_arn = awsRoleArn;
        currentConfig.aws_external_id = awsExternalId;
      }

      if (currentConfig.provider === GOOGLE_VERTEX_AI && model_config) {
        currentConfig.vertex_project_id = model_config.vertexProjectId;
        currentConfig.vertex_region =
          currentConfig.vertex_region || model_config.vertexRegion;
        currentConfig.vertex_service_account_json =
          model_config.vertexServiceAccountJson;
      }

      if (currentConfig.provider === WORKERS_AI && model_config) {
        currentConfig.workers_ai_account_id = model_config.workersAiAccountId;
      }

      if (currentConfig.provider === OPEN_AI && model_config) {
        if (model_config.openaiOrganization) {
          currentConfig.openai_organization = model_config.openaiOrganization;
        }

        if (model_config.openaiProject) {
          currentConfig.openai_project = model_config.openaiProject;
        }
      }
    }

    if (currentConfig[configTargetType]) {
      for (const target of currentConfig[configTargetType]) {
        recursiveAddKeysToTarget(target, configTargetType);
      }
    }
  }

  const configTargetType = mappedConfig.options?.length ? 'options' : 'targets';

  recursiveAddKeysToTarget(mappedConfig, configTargetType);

  return mappedConfig;
};

export const getConfigDetailsFromRequest = (
  requestHeaders: Record<string, any>,
  requestBody: Record<string, any>,
  path: string
) => {
  const mode = getMode(requestHeaders, path);
  const isHeaderConfigEnabledRequest = [
    MODES.PROXY,
    MODES.PROXY_V2,
    MODES.RUBEUS_V2,
  ].includes(mode);

  const isBodyConfigEnabledRequest = [MODES.RUBEUS].includes(mode);

  const configHeader = requestHeaders.get(PORTKEY_HEADER_KEYS.CONFIG);

  if (isBodyConfigEnabledRequest) {
    if (typeof requestBody.config === 'string') {
      return {
        type: 'slug',
        data: requestBody.config,
      };
    } else if (typeof requestBody.config === 'object') {
      return {
        type: 'object',
        data: requestBody.config,
      };
    }
  }

  if (isHeaderConfigEnabledRequest && configHeader) {
    if (configHeader.startsWith('pc-')) {
      return {
        type: 'slug',
        data: requestHeaders.get(PORTKEY_HEADER_KEYS.CONFIG),
      };
    } else {
      try {
        const parsedConfigJSON = JSON.parse(configHeader);
        return {
          type: 'object',
          data: parsedConfigJSON,
        };
      } catch (e) {
        console.log('invalid config', e);
      }
    }
  }

  return null;
};

// This function can be extended to do any further config mapping.
// Currently, this only replaces virtual key.
export const getMappedConfig = async (
  env: any,
  config: Record<string, any>,
  apiKey: string,
  organisationId: string,
  workspaceDetails: WorkspaceDetails,
  requestBody: Record<string, any>,
  path: string,
  isVirtualKeyUsageEnabled: boolean
) => {
  let promptIDFromURL: string = '';

  const isPromptCompletionsCall = path.startsWith('/v1/prompts/')
    ? true
    : false;
  if (isPromptCompletionsCall) {
    promptIDFromURL = path.split('/')[3];
  }
  const promptSlugArr = getUniquePromptSlugsFromConfig(config);

  const isPromptCompletionsConfig = promptSlugArr.length > 0 ? true : false;

  if (promptIDFromURL && !promptSlugArr.includes(promptIDFromURL)) {
    promptSlugArr.push(promptIDFromURL);
  }

  // configs with prompt_id are only allowed in /v1/prompts route
  if (!isPromptCompletionsCall && promptSlugArr.length) {
    return {
      status: 'error',
      message: `You cannot pass config with prompt id in /v1/prompts route`,
    };
  }
  const { promptMap, missingPrompts } = await getPromptMap(
    env,
    promptSlugArr,
    apiKey,
    organisationId,
    workspaceDetails
  );
  if (missingPrompts.length > 0) {
    return {
      status: 'error',
      message: `Following prompt_id are not valid: ${missingPrompts.join(
        ', '
      )}`,
    };
  }

  const { missingVariablePartials, uniquePartials } =
    getUniquePromptPartialsFromPromptMap(promptMap, requestBody);
  if (missingVariablePartials.length > 0) {
    return {
      status: 'error',
      message: `Missing variable partials: ${missingVariablePartials.join(', ')}`,
    };
  }
  const { promptPartialMap, missingPromptPartials } = await getPromptPartialMap(
    env,
    uniquePartials,
    apiKey,
    organisationId,
    workspaceDetails
  );
  if (missingPromptPartials.length > 0) {
    return {
      status: 'error',
      message: `Missing prompt partials: ${missingPromptPartials.join(', ')}`,
    };
  }

  const promptMappedConfig = isPromptCompletionsConfig
    ? getPromptMappedConfig(
        promptMap,
        promptPartialMap,
        config,
        requestBody,
        promptIDFromURL
      )
    : config;

  const virtualKeyArr = getUniqueVirtualKeysFromConfig(promptMappedConfig);
  const { virtualKeyMap, missingKeys } = await getVirtualKeyMap(
    env,
    virtualKeyArr,
    apiKey,
    organisationId,
    workspaceDetails,
    isVirtualKeyUsageEnabled
  );
  if (missingKeys.length > 0) {
    return {
      status: 'error',
      message: `Following keys are not valid: ${missingKeys.join(', ')}`,
    };
  }

  const guardrailKeyArr = getUniqueGuardrailsFromConfig(promptMappedConfig);
  let integrations;
  if (guardrailKeyArr.length > 0) {
    integrations = await fetchOrganisationIntegrations(
      env,
      organisationId,
      apiKey,
      false
    );
  }

  const { guardrailMap, missingGuardrails } = await getGuardrailMap(
    env,
    guardrailKeyArr,
    apiKey,
    organisationId,
    workspaceDetails,
    integrations
  );

  if (missingGuardrails.length > 0) {
    return {
      status: 'error',
      message: `Following guardrails are not valid: ${missingGuardrails.join(', ')}`,
    };
  }

  let promptRequestURLPath = '';
  // For /v1/prompts with prompt_id configs, generate a request url based on modelType
  if (
    isPromptCompletionsConfig &&
    Object.values(promptMap)[0]?.ai_model_type === 'chat'
  ) {
    promptRequestURLPath = '/v1/chat/completions';
  } else if (
    isPromptCompletionsConfig &&
    Object.values(promptMap)[0]?.ai_model_type === 'text'
  ) {
    promptRequestURLPath = '/v1/completions';
  }

  const guardrailMappedConfig = guardrailKeyArr.length
    ? getGuardrailMappedConfig(guardrailMap, config)
    : promptMappedConfig;

  if (Object.keys(virtualKeyMap).length === 0) {
    return {
      status: 'success',
      data: guardrailMappedConfig,
    };
  }

  return {
    status: 'success',
    data: getApiKeyMappedConfig(virtualKeyMap, guardrailMappedConfig),
    promptRequestURLPath: promptRequestURLPath,
  };
};

export const getUniquePromptPartialsFromPromptMap = (
  promptMap: Record<string, any>,
  requestBodyJSON: Record<string, any>
): {
  missingVariablePartials: string[];
  uniquePartials: string[];
} => {
  const missingVariablePartials: string[] = [];
  const uniquePartials = new Set<string>();

  // Loop over each prompt in the map
  Object.values(promptMap).forEach((promptData) => {
    if (promptData.variable_components) {
      // Safely parse variableComponents, which can contain various properties
      const components = JSON.parse(promptData.variable_components);

      // Check and add 'partials' if they exist
      if (Array.isArray(components.partials)) {
        components.partials.forEach((partial: string) =>
          uniquePartials.add(partial)
        );
      }

      // Check and add 'variablePartials' if they exist. Variable partial values are resolved from the request body
      if (Array.isArray(components.variablePartials)) {
        components.variablePartials.forEach((eachVariablePartial: string) => {
          if (
            requestBodyJSON.variables &&
            requestBodyJSON.variables.hasOwnProperty(eachVariablePartial)
          ) {
            uniquePartials.add(requestBodyJSON.variables[eachVariablePartial]);
          } else {
            missingVariablePartials.push(eachVariablePartial);
          }
        });
      }
    }
  });

  // Convert the Set to an array to return the unique partials
  return {
    missingVariablePartials: [...missingVariablePartials],
    uniquePartials: [...uniquePartials],
  };
};

export const getMappedConfigFromRequest = async (
  env: any,
  requestBody: Record<string, any>,
  requestHeaders: Headers,
  orgApiKey: string,
  organisationId: string,
  workspaceDetails: WorkspaceDetails,
  path: string,
  isVirtualKeyUsageEnabled: boolean
) => {
  const configDetails = getConfigDetailsFromRequest(
    requestHeaders,
    requestBody,
    path
  );
  if (!configDetails) {
    return {};
  }
  const store: Record<string, any> = {};
  if (configDetails.type === 'slug') {
    const orgConfigFromSlug = await fetchOrganisationConfig(
      env,
      orgApiKey,
      organisationId,
      workspaceDetails,
      configDetails.data
    );
    if (!orgConfigFromSlug) {
      return {
        status: 'failure',
        message: 'Invalid config id passed',
      };
    }
    store.organisationConfig = {
      ...orgConfigFromSlug.organisationConfig,
    };
    store.configVersion = orgConfigFromSlug.configVersion;
    store.configSlug = configDetails.data;
  } else if (configDetails.type === 'object') {
    store.organisationConfig = {
      ...configDetails.data,
    };
  }

  const mappedConfig = await getMappedConfig(
    env,
    store.organisationConfig,
    orgApiKey,
    organisationId,
    workspaceDetails,
    requestBody,
    path,
    isVirtualKeyUsageEnabled
  );
  if (mappedConfig.status === 'error') {
    return {
      status: 'failure',
      message: mappedConfig.message,
    };
  }

  return {
    status: 'success',
    mappedConfig: mappedConfig.data,
    configVersion: store.configVersion,
    configSlug: store.configSlug,
    promptRequestURLPath: mappedConfig.promptRequestURLPath,
  };
};

/**
 * Handles the mapping of virtual key header to provider and authorization header
 *
 * @param {Object} env - Hono environment object.
 * @param {string} orgApiKey - The organization's API key.
 * @param {string} organisationId - The organization's ID.
 * @param {Headers} headers - Original request headers object
 * @param {string} mode - The mode for the request. Decided on the basis of route that is called
 * @returns {Promise<{status: string, message?: string}>} - A promise resolving to an object
 * with the status success/failure and an optional message in case of failure.
 */
export const handleVirtualKeyHeader = async (
  env: any,
  orgApiKey: string,
  organisationId: string,
  workspaceDetails: WorkspaceDetails,
  headers: Headers,
  mode: string,
  isVirtualKeyUsageEnabled: boolean
): Promise<{ status: string; message?: string }> => {
  const virtualKey = headers.get(PORTKEY_HEADER_KEYS.VIRTUAL_KEY);
  if (!virtualKey) {
    return {
      status: 'success',
    };
  }

  const apiKeyKVRecord = await fetchOrganisationProviderFromSlug(
    env,
    orgApiKey,
    organisationId,
    workspaceDetails,
    virtualKey
  );
  if (!apiKeyKVRecord) {
    return {
      status: 'failure',
      message: `Following keys are not valid: ${headers.get(
        PORTKEY_HEADER_KEYS.VIRTUAL_KEY
      )}`,
    };
  }
  await validateVirtualKeyUsage({
    env,
    apiKey: orgApiKey,
    apiKeyKVRecord,
    isVirtualKeyUsageEnabled,
    organisationId,
    virtualKey,
    workspaceDetails,
  });

  const {
    ai_provider_name,
    key,
    model_config,
    status,
    usage_limits,
    rate_limits: rateLimits,
  } = apiKeyKVRecord;

  if (status == 'exhausted') {
    headers.set(PORTKEY_HEADER_KEYS.VIRTUAL_KEY_EXHAUSTED, 'true');
  }

  if (usage_limits?.credit_limit) {
    headers.set(PORTKEY_HEADER_KEYS.VIRTUAL_KEY_USAGE_ENABLED, 'true');
  }

  if (rateLimits && rateLimits.length > 0) {
    headers.set(
      PORTKEY_HEADER_KEYS.VIRTUAL_KEY_RATE_LIMITS,
      JSON.stringify(rateLimits)
    );
  }

  if (providerAuthHeaderMap[ai_provider_name] && mode !== MODES.RUBEUS_V2) {
    headers.set(
      providerAuthHeaderMap[ai_provider_name],
      `${providerAuthHeaderPrefixMap[ai_provider_name]}${key}`
    );
  } else if (ai_provider_name !== GOOGLE_VERTEX_AI) {
    headers.set('authorization', `Bearer ${key}`);
  }

  if (ai_provider_name === AZURE_OPEN_AI && model_config) {
    const {
      resourceName,
      deploymentName,
      apiVersion,
      aiModelName,
      azureAuthMode,
      azureEntraTenantId,
      azureEntraClientId,
      azureEntraClientSecret,
    } = model_config;

    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_RESOURCE,
      resourceName?.toString() ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_DEPLOYMENT,
      deploymentName?.toString() ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_API_VERSION,
      apiVersion?.toString() ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_MODEL_NAME,
      aiModelName?.toString() ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_AUTH_MODE,
      azureAuthMode ?? process.env.AZURE_AUTH_MODE ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_ENTRA_CLIENT_ID,
      azureEntraClientId ?? process.env.AZURE_ENTRA_CLIENT_ID ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_ENTRA_CLIENT_SECRET,
      azureEntraClientSecret ?? process.env.AZURE_ENTRA_CLIENT_SECRET ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_ENTRA_TENANT_ID,
      azureEntraTenantId ?? process.env.AZURE_ENTRA_TENANT_ID ?? ''
    );
  }

  if (ai_provider_name === AZURE_AI_INFERENCE) {
    const {
      azureApiVersion,
      azureRegion,
      azureDeploymentName,
      azureEndpointName,
      azureDeploymentType,
      azureAuthMode,
      azureEntraTenantId,
      azureEntraClientId,
      azureEntraClientSecret,
    } = model_config;
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_DEPLOYMENT_NAME,
      azureDeploymentName ?? ''
    );
    headers.set(PORTKEY_HEADER_KEYS.AZURE_REGION, azureRegion ?? '');
    headers.set(PORTKEY_HEADER_KEYS.AZURE_API_VERSION, azureApiVersion ?? '');
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_ENDPOINT_NAME,
      azureEndpointName ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_DEPLOYMENT_TYPE,
      azureDeploymentType ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_AUTH_MODE,
      azureAuthMode ?? process.env.AZURE_AUTH_MODE ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_ENTRA_CLIENT_ID,
      azureEntraClientId ?? process.env.AZURE_ENTRA_CLIENT_ID ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_ENTRA_CLIENT_SECRET,
      azureEntraClientSecret ?? process.env.AZURE_ENTRA_CLIENT_SECRET ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.AZURE_ENTRA_TENANT_ID,
      azureEntraTenantId ?? process.env.AZURE_ENTRA_TENANT_ID ?? ''
    );
  }

  if (ai_provider_name === BEDROCK && model_config) {
    const {
      awsAuthType,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsRegion,
      awsRoleArn,
      awsExternalId,
    } = model_config;

    headers.set(
      PORTKEY_HEADER_KEYS.AWS_AUTH_TYPE,
      awsAuthType?.toString() ?? ''
    );
    headers.set(PORTKEY_HEADER_KEYS.AWS_ROLE_ARN, awsRoleArn?.toString() ?? '');
    headers.set(
      PORTKEY_HEADER_KEYS.AWS_EXTERNAL_ID,
      awsExternalId?.toString() ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.BEDROCK_ACCESS_KEY_ID,
      awsAccessKeyId?.toString() ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.BEDROCK_SECRET_ACCESS_KEY,
      awsSecretAccessKey?.toString() ?? ''
    );
    headers.set(
      PORTKEY_HEADER_KEYS.BEDROCK_REGION,
      awsRegion?.toString() ?? ''
    );
    headers.delete('authorization');
  }

  if (ai_provider_name === GOOGLE_VERTEX_AI && model_config) {
    const { vertexProjectId, vertexRegion, vertexServiceAccountJson } =
      model_config;

    headers.set(
      PORTKEY_HEADER_KEYS.VERTEX_AI_PROJECT_ID,
      vertexProjectId?.toString() ?? ''
    );

    if (!headers.get(PORTKEY_HEADER_KEYS.VERTEX_AI_REGION)) {
      headers.set(
        PORTKEY_HEADER_KEYS.VERTEX_AI_REGION,
        vertexRegion?.toString() ?? ''
      );
    }

    if (vertexServiceAccountJson) {
      headers.set(
        PORTKEY_HEADER_KEYS.VERTEX_SERVICE_ACCOUNT_JSON,
        JSON.stringify(vertexServiceAccountJson)
      );
    }
  }

  if (ai_provider_name === WORKERS_AI && model_config) {
    const { workersAiAccountId } = model_config;

    headers.set(
      PORTKEY_HEADER_KEYS.WORKERS_AI_ACCOUNT_ID,
      workersAiAccountId?.toString() ?? ''
    );
  }

  if (ai_provider_name === OPEN_AI && model_config) {
    const { openaiOrganization, openaiProject } = model_config;

    if (openaiOrganization) {
      headers.set(
        PORTKEY_HEADER_KEYS.OPEN_AI_ORGANIZATION,
        openaiOrganization?.toString() ?? ''
      );
    }

    if (openaiProject) {
      headers.set(
        PORTKEY_HEADER_KEYS.OPEN_AI_PROJECT,
        openaiProject?.toString() ?? ''
      );
    }
  }

  headers.set(PORTKEY_HEADER_KEYS.PROVIDER, ai_provider_name);

  return {
    status: 'success',
  };
};

export const createRequestFromPromptData = (
  env: any,
  promptData: Record<string, any>,
  promptPartialMap: Record<string, any>,
  requestBodyJSON: Record<string, any>,
  promptSlug: string
) => {
  let promptString = promptData.string;

  const jsonCompatibleVariables: Record<string, any> = {};
  Object.keys(requestBodyJSON.variables).forEach((key) => {
    if (typeof requestBodyJSON.variables[key] === 'string') {
      jsonCompatibleVariables[key] = JSON.stringify(
        requestBodyJSON.variables[key]
      ).slice(1, -1);
    } else {
      jsonCompatibleVariables[key] = requestBodyJSON.variables[key];
    }
  });

  const finalPromptPartials: Record<string, string> = {};
  for (const key in promptPartialMap) {
    const partial = promptPartialMap[key];
    finalPromptPartials[key] = JSON.stringify(
      Mustache.render(partial.string, jsonCompatibleVariables, {})
    ).slice(1, -1);
  }

  try {
    promptString = Mustache.render(
      promptString,
      jsonCompatibleVariables,
      finalPromptPartials
    );
  } catch (e) {
    return {
      status: 'failure',
      message: `Error in parsing prompt template: ${e}`,
    };
  }

  const requestBody = {
    ...promptData.parameters_object,
  };

  delete requestBody['stream'];

  Object.entries(requestBodyJSON).forEach(([key, value]) => {
    requestBody[key] = value;
  });
  delete requestBody['variables'];

  const requestHeader = {
    [PORTKEY_HEADER_KEYS.VIRTUAL_KEY]: promptData.provider_key_slug,
    [PORTKEY_HEADER_KEYS.PROMPT_ID]: promptData.id,
    [PORTKEY_HEADER_KEYS.PROMPT_VERSION_ID]: promptData.prompt_version_id,
    [PORTKEY_HEADER_KEYS.PROMPT_SLUG]: promptSlug,
  };

  let requestUrlPath = '';

  if (promptData.ai_model_type === 'chat') {
    requestBody.messages = JSON.parse(promptString);
    requestUrlPath += '/v1/chat/completions';
  } else {
    requestBody.prompt = promptString;
    requestUrlPath += '/completions';
  }
  return { requestBody, requestHeader, requestUrlPath };
};

export const checkRateLimits = async (
  env: any,
  rateLimitObject: Record<string, any>,
  value: string,
  type: string
) => {
  const redisRateLimiter = new RedisRateLimiter(
    redisClient,
    rateLimitObject.value,
    RATE_LIMIT_UNIT_TO_WINDOW_MAPPING[rateLimitObject.unit],
    `${type}-${value}`
  );
  return redisRateLimiter.checkRateLimit();
};
