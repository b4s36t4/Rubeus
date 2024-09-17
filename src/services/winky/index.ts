import { getFromMongo, logToMongo } from './libs/mongo';
import { contructInsertQuery, logToClickhouse } from './libs/clickhouse';
import { findApiKey, sanitiseURL } from './lookers/apiKey';
import {
  generateMetricObject,
  getURL,
  hash,
  maskNestedConfig,
} from './utils/helpers';
import { calculateCost } from './lookers/cost';
import { sanitize } from './utils/sanitise';
import { AiProviders, LogConfig, ProviderLogConfigs } from './providers/config';
import { getFromWasabi, uploadToWasabi } from './libs/wasabi';
import { LOG_STORES } from './utils/constants';
import { getFromGcs, uploadToGcs } from './libs/gcs';
import {
  getFromS3,
  getFromS3Assumed,
  uploadToS3,
  uploadToS3Assumed,
} from './libs/s3';
import { PORTKEY_HEADER_KEYS } from '../../middlewares/portkey/globals';
import { HEADER_KEYS } from '../../globals';
import { logger } from '../../apm';
import { getLogsFromAzureStorage, uploadToAzureStorage } from './libs/azure';
import { getFromNetapp, uploadToNetapp } from './libs/netapp';
import { handleApiKeyUsage, handleVirtualKeyUsage } from './lookers/usage';
import {
  AnalyticsLogObject,
  LogOptions,
  LogStoreApmOptions,
} from '../../middlewares/portkey/types';
import { hookResultsLogHandler } from './handlers/hookResultsHandler';

const requestHeadersToBeMasked = [
  'authorization',
  PORTKEY_HEADER_KEYS.API_KEY,
  HEADER_KEYS.API_KEY,
  HEADER_KEYS.X_API_KEY,
  PORTKEY_HEADER_KEYS.BEDROCK_SECRET_ACCESS_KEY,
  PORTKEY_HEADER_KEYS.BEDROCK_ACCESS_KEY_ID,
];

const modelsToSkipSavingReponseBody: Record<string, string[]> = {
  openai: [
    'text-embedding-ada-002',
    'text-embedding-3-small',
    'text-embedding-3-large',
  ],
  'azure-openai': [
    'text-embedding-ada-002',
    'text-embedding-3-small',
    'text-embedding-3-large',
  ],
  nomic: ['nomic-embed-text-v1'],
  anyscale: ['BAAI/bge-large-en-v1.5', 'thenlper/gte-large'],
  google: ['embedding-001'],
  'together-ai': [
    'togethercomputer/m2-bert-80M-2k-retrieval',
    'togethercomputer/m2-bert-80M-8k-retrieval',
    'togethercomputer/m2-bert-80M-32k-retrieval',
    'WhereIsAI/UAE-Large-V1',
    'BAAI/bge-large-en-v1.5',
    'BAAI/bge-base-en-v1.5',
    'sentence-transformers/msmarco-bert-base-dot-v5',
    'bert-base-uncased',
  ],
  'mistral-ai': ['mistral-embed'],
  bedrock: [
    'amazon.titan-embed-text-v1',
    'cohere.embed-english-v3',
    'cohere.embed-multilingual-v3',
  ],
  jina: [
    'jina-embeddings-v2-base-en',
    'jina-embeddings-v2-base-code',
    'jina-embeddings-v2-base-zh',
    'jina-embeddings-v2-base-de',
    'jina-embeddings-v2-base-es',
  ],
};

export async function uploadToLogStore(
  requestBody: Record<string, any> | Record<string, any>[],
  type: string,
  isServiceRequest: boolean,
  env: Record<string, any>,
  req?: Request
) {
  let isCustomLog = false;

  if (type === 'hookResults') {
    return isServiceRequest
      ? hookResultsLogHandler(env, requestBody)
      : new Response('Unauthorized request', { status: 401 });
  }

  if (req) {
    const url = new URL(req.url);
    if (url.pathname == '/v1/logs') {
      // When the log request is coming directly via API
      isCustomLog = true;
    }
  }
  const spanBodies = Array.isArray(requestBody) ? requestBody : [requestBody];
  const analyticsObjects = [];
  const internalTraceId = crypto.randomUUID();
  const logUsage = !isCustomLog;
  for (let spanBody of spanBodies) {
    if (isCustomLog && req) {
      spanBody = customLogTransform(req, spanBody, env, internalTraceId);
    }
    const response = await handleSpanLog(
      env,
      spanBody,
      internalTraceId,
      isServiceRequest,
      logUsage
    );
    if (response.response) {
      return response.response;
    }
    analyticsObjects.push(response.analyticsLogObject);
  }
  //Send log object to Clickhouse in generations table.
  let chQuery = '';
  chQuery = contructInsertQuery(analyticsObjects, env.ANALYTICS_LOG_TABLE);
  logToClickhouse(env, chQuery);
  return new Response('ok', { status: 200 });
}

async function handleSpanLog(
  env: Record<string, any>,
  requestBody: Record<string, any>,
  internalTraceId: string,
  isServiceRequest: boolean,
  logUsage = false
): Promise<{ response?: Response; analyticsLogObject: Record<string, any> }> {
  const store: Record<string, any> = {
    incomingBody: {},
    portkeyHeaders: {},
    proxyProvider: '',
    proxyMode: '',
  };

  const chLogObject: AnalyticsLogObject = {
    id: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //required //UUID
    organisation_id: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //required //string
    organisation_name: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    user_id: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //UUID
    prompt_id: {
      type: 'string',
      value: null,
      isNullable: false,
    },
    prompt_version_id: {
      type: 'string',
      value: null,
      isNullable: false,
    },
    config_id: {
      type: 'string',
      value: null,
      isNullable: false,
    },
    created_at: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //required //datetime
    is_success: {
      type: 'int',
      value: null,
      isNullable: false,
    }, //int
    ai_org: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    ai_org_auth_hash: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //required
    ai_model: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //required
    req_units: {
      type: 'int',
      value: null,
      isNullable: false,
    }, //int
    res_units: {
      type: 'int',
      value: null,
      isNullable: false,
    }, //int
    total_units: {
      type: 'int',
      value: null,
      isNullable: false,
    }, //int
    cost: {
      type: 'float',
      value: null,
      isNullable: false,
    }, //float
    cost_currency: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    request_url: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    request_method: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    response_status_code: {
      type: 'int',
      value: null,
      isNullable: false,
    }, //required //int
    response_time: {
      type: 'int',
      value: null,
      isNullable: false,
    }, //int
    is_proxy_call: {
      type: 'int',
      value: null,
      isNullable: false,
    }, //int
    cache_status: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    cache_type: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    stream_mode: {
      type: 'int',
      value: null,
      isNullable: false,
    }, //int
    retry_success_count: {
      type: 'int',
      value: null,
      isNullable: false,
    },
    _environment: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    _user: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    _organisation: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    _prompt: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    trace_id: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    span_id: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    span_name: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    parent_span_id: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    extra_key: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //string
    extra_value: {
      type: 'string',
      value: null,
      isNullable: false,
    },
    mode: {
      type: 'string',
      value: '',
      isNullable: false,
    },
    virtual_key: {
      type: 'string',
      value: '',
      isNullable: false,
    },
    source: {
      type: 'string',
      value: '',
      isNullable: false,
    },
    runtime: {
      type: 'string',
      value: '',
      isNullable: false,
    },
    runtime_version: {
      type: 'string',
      value: '',
      isNullable: false,
    },
    sdk_version: {
      type: 'string',
      value: '',
      isNullable: false,
    },
    config: {
      type: 'string',
      value: '',
      isNullable: false,
    },
    internal_trace_id: {
      type: 'string',
      value: null,
      isNullable: false,
    },
    last_used_option_index: {
      type: 'number',
      value: 0,
      isNullable: false,
    },
    config_version_id: {
      type: 'string',
      value: '',
      isNullable: false,
    },
    prompt_slug: {
      type: 'string',
      value: '',
      isNullable: false,
    },
    workspace_slug: {
      type: 'string',
      value: null,
      isNullable: false,
    }, //UUID
    'metadata.key': {
      type: 'array',
      value: null,
      isNullable: true,
    },
    'metadata.value': {
      type: 'array',
      value: null,
      isNullable: true,
    },
    api_key_id: {
      type: 'string',
      value: null,
      isNullable: false,
    },
  };
  const logObject: {
    _id: string | null;
    request: Record<string, any>;
    response: Record<string, any>;
    organisation_id: string | null;
    created_at: string | null;
    metrics?: Record<string, any>;
  } = {
    _id: null,
    request: {},
    response: {},
    organisation_id: null,
    created_at: null,
    metrics: undefined,
  };

  //find the must have values required for logging
  let providerLogConfig: LogConfig;
  try {
    store.incomingBody = requestBody;
    store.requestHeaders = store.incomingBody.requestHeaders || {};
    store.cacheKey = store.incomingBody.cacheKey;

    store.portkeyHeaders = store.incomingBody.config.portkeyHeaders;

    //copy x-potkey-api-key before hashing to make albus call for referral key update
    store[PORTKEY_HEADER_KEYS.API_KEY] =
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.API_KEY];

    requestHeadersToBeMasked.forEach((header) => {
      if (store.portkeyHeaders[header]) {
        store.portkeyHeaders[header] = hash(store.portkeyHeaders[header]);
      }
    });
    store.proxyProvider =
      store.incomingBody.config?.provider ??
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.MODE]?.split(' ')[1] ??
      '';
    providerLogConfig =
      ProviderLogConfigs[store.proxyProvider] ||
      ProviderLogConfigs[AiProviders.DEFAULT];
    store.proxyMode =
      store.incomingBody.config.proxyMode ??
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.MODE]?.split(' ')[0] ??
      'rubeus';
    store.requestURL = store.incomingBody.requestURL
      ? getURL(store.incomingBody.requestURL, providerLogConfig.getBaseURL())
      : '';
    store.requestMethod = store.incomingBody.requestMethod;
    store.requestBody = JSON.parse(store.incomingBody.requestBody);

    store.lastUsedOptionIndex = store.incomingBody.config.lastUsedOptionIndex;
    chLogObject.last_used_option_index.value = isNaN(store.lastUsedOptionIndex)
      ? -1
      : store.lastUsedOptionIndex;
    if (isNaN(store.lastUsedOptionIndex)) {
      store.lastUsedOptionJsonPath = store.lastUsedOptionIndex;
    }

    chLogObject.trace_id.value =
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.TRACE_ID];
    chLogObject.span_id.value =
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.SPAN_ID];
    chLogObject.span_name.value =
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.SPAN_NAME];
    chLogObject.parent_span_id.value =
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.PARENT_SPAN_ID];

    if (store.requestBody?.config?.options) {
      store.requestBody.config.options.forEach(function (
        o: {
          virtual_key: string;
          trace_id: string;
          span_id: string;
          span_name: string;
          parent_span_id: string;
          metadata: Record<string, any>;
          apiKey: null;
        },
        i: Record<string, any>
      ) {
        if (i === store.lastUsedOptionIndex) {
          chLogObject.virtual_key.value = o.virtual_key ?? '';
          chLogObject.trace_id.value = chLogObject.trace_id.value || o.trace_id;
          chLogObject.span_id.value = chLogObject.span_id.value || o.span_id;
          chLogObject.parent_span_id.value =
            chLogObject.parent_span_id.value || o.parent_span_id;
          chLogObject.span_name.value =
            chLogObject.span_name.value || o.span_name;
          store.metadata = o.metadata;
          store.providerKey = o.apiKey ?? null;
        }
      });
    }

    if (store.incomingBody.providerOptions) {
      chLogObject.virtual_key.value =
        store.incomingBody.providerOptions.virtualKey ?? '';
      chLogObject.trace_id.value =
        chLogObject.trace_id.value ||
        store.incomingBody.providerOptions.traceId;
      store.metadata = store.incomingBody.providerOptions.metadata;
      store.providerKey = store.incomingBody.providerOptions.apiKey ?? null;
    }

    if (
      !chLogObject.virtual_key.value &&
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.VIRTUAL_KEY]
    ) {
      chLogObject.virtual_key.value =
        store.portkeyHeaders[PORTKEY_HEADER_KEYS.VIRTUAL_KEY];
    }

    try {
      if (
        store.portkeyHeaders[PORTKEY_HEADER_KEYS.CONFIG] &&
        !store.portkeyHeaders[PORTKEY_HEADER_KEYS.CONFIG].startsWith('pc-')
      ) {
        store.parsedConfigHeader = JSON.parse(
          store.portkeyHeaders[PORTKEY_HEADER_KEYS.CONFIG]
        );
      }
    } catch (err: any) {
      logger.error({
        message: `ERROR_PARSING_HEADER: ${err.message}`,
      });
    }

    store.providerKey =
      store.providerKey ?? store.requestURL
        ? findApiKey(
            store.requestBody,
            store.requestHeaders,
            store.proxyMode,
            store.lastUsedOptionIndex,
            store.requestURL
          )
        : '';

    // start: mask sensitive details from config (handling both old and new configs)
    try {
      if (store.parsedConfigHeader && store.parsedConfigHeader.options) {
        maskNestedConfig(store.parsedConfigHeader, 'options');
        store.portkeyHeaders[PORTKEY_HEADER_KEYS.CONFIG] = JSON.stringify(
          store.parsedConfigHeader
        );
      } else if (store.parsedConfigHeader) {
        maskNestedConfig(store.parsedConfigHeader, 'targets');
        store.portkeyHeaders[PORTKEY_HEADER_KEYS.CONFIG] = JSON.stringify(
          store.parsedConfigHeader
        );
      }
    } catch (err: any) {
      logger.error({
        message: `ERROR_MASKING_HEADERS: ${err.message}`,
      });
    }

    try {
      if (store.requestBody.config) {
        maskNestedConfig(store.requestBody.config, 'options');
        maskNestedConfig(store.requestBody.config, 'targets');
      }
    } catch (err: any) {
      logger.error({
        message: `ERROR_MASKING_CONFIG_FROM_BODY: ${err.message}`,
      });
    }
    // end: mask sensitive details from configs

    chLogObject.mode.value =
      store.parsedConfigHeader?.strategy?.mode ??
      store.requestBody?.config?.strategy?.mode ??
      store.requestBody?.config?.mode ??
      'single';
    chLogObject.source.value = store.proxyMode;
    chLogObject.sdk_version.value =
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.PACKAGE_VERSION] ?? '';
    chLogObject.runtime.value =
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.RUNTIME] ?? '';
    chLogObject.runtime_version.value =
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.RUNTIME_VERSION] ?? '';

    // Fallback requests can have same traceId coming from rubeus. Else create a new one.
    chLogObject.internal_trace_id.value =
      store.incomingBody.config.internalTraceId ?? internalTraceId;
    chLogObject.trace_id.value =
      chLogObject.trace_id.value || store.incomingBody.config.traceId;
    chLogObject.span_id.value =
      chLogObject.span_id.value || store.incomingBody.config.spanId;
    chLogObject.parent_span_id.value =
      chLogObject.parent_span_id.value ||
      store.incomingBody.config.parentSpanId;
    chLogObject.span_name.value =
      chLogObject.span_name.value || store.incomingBody.config.spanName;

    chLogObject.config.value =
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.CONFIG_SLUG] ?? '';
    if (
      !chLogObject.config.value &&
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.CONFIG]?.startsWith('pc-')
    ) {
      chLogObject.config.value =
        store.portkeyHeaders[PORTKEY_HEADER_KEYS.CONFIG];
    }
    chLogObject.config_version_id.value =
      store.portkeyHeaders[PORTKEY_HEADER_KEYS.CONFIG_VERSION] ?? '';

    store.responseHeaders = store.incomingBody.responseHeaders;
    store.responseBody = JSON.parse(store.incomingBody.responseBody);
    store.responseStatusCode = store.incomingBody.responseStatus;
    store.responseTime = store.incomingBody.responseTime;
    store.organisationDetails = store.incomingBody.config.organisationDetails;
    store.organisationConfig = store.incomingBody.config.organisationConfig;

    store.debugLogSetting =
      store.incomingBody.debugLogSetting === false ? false : true;

    // checking for rubeus params
    if (store.incomingBody.config.requestParams) {
      store.mappedRequestBody = store.incomingBody.config.requestParams;
    } else {
      store.mappedRequestBody = store.requestBody;
    }

    //FIND is_success
    chLogObject.is_success.value =
      store.responseStatusCode >= 200 && store.responseStatusCode < 300
        ? true
        : false;

    if (isServiceRequest) chLogObject.id.value = store.incomingBody.id;
    else chLogObject.id.value = crypto.randomUUID();
    logObject._id = chLogObject.id.value;

    chLogObject.organisation_id.value = store.organisationDetails.id;
    logObject.organisation_id = store.organisationDetails.id;
    chLogObject.organisation_name.value =
      store.organisationDetails.name || null;

    const created_at = new Date();
    chLogObject.created_at.value = created_at
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    logObject.created_at = created_at.toString();
    logObject.request =
      store.debugLogSetting !== false
        ? {
            url: store.requestURL ? sanitiseURL(store.requestURL) : '',
            method: store.requestMethod,
            headers: store.requestHeaders,
            body: store.requestBody,
            portkeyHeaders: store.portkeyHeaders,
          }
        : {
            url: store.requestURL ? sanitiseURL(store.requestURL) : '',
            method: store.requestMethod,
            portkeyHeaders: store.portkeyHeaders,
          };

    chLogObject.request_url.value = store.requestURL
      ? sanitiseURL(store.requestURL)
      : '';
    chLogObject.request_method.value = store.requestMethod;

    logObject.response =
      store.debugLogSetting !== false
        ? {
            status: store.responseStatusCode,
            headers: store.responseHeaders,
            body: store.responseBody,
            responseTime: store.responseTime,
            lastUsedOptionJsonPath: store.lastUsedOptionJsonPath ?? '',
          }
        : {
            status: store.responseStatusCode,
            responseTime: store.responseTime,
            lastUsedOptionJsonPath: store.lastUsedOptionJsonPath ?? '',
          };

    chLogObject.response_status_code.value = store.responseStatusCode;
    chLogObject.response_time.value = store.responseTime;
    //fetch provider key to get azure model details
    const aiModel = await providerLogConfig.modelConfig({
      apiKey: store.providerKey,
      env,
      reqBody: store.mappedRequestBody,
      resBody: store.responseBody,
      url: store.requestURL,
      providerOptions: store.incomingBody.providerOptions,
    });
    chLogObject.ai_model.value = aiModel;

    requestHeadersToBeMasked.forEach((header) => {
      if (store.requestHeaders[header]) {
        store.requestHeaders[header] = hash(store.requestHeaders[header]);
      }
    });
    chLogObject.ai_org_auth_hash.value = hash(store.providerKey);

    //if ai model is in modelsToSkipSavingReponseBody, then remove the response body from the log
    if (
      modelsToSkipSavingReponseBody[store.proxyProvider]?.includes(
        chLogObject.ai_model.value
      ) &&
      chLogObject.is_success.value
    ) {
      logObject.response.body = '...REDACTED...';
    }

    chLogObject.api_key_id.value = store.organisationDetails.apiKeyDetails.id;
  } catch (error: any) {
    logger.error({
      message: `ERROR_FETCHING_VALUES: ${error.message}`,
    });
    return {
      response: new Response(`Error in fetching values: ${error}`, {
        status: 400,
      }),
      analyticsLogObject: chLogObject,
    };
  }
  /**
   * VALIDATE REQUEST END.
   */

  //FIND user_id, prompt_id, prompt_version_id
  //TBD - update once integrated with albus generations APIs
  chLogObject.user_id.value = null;
  chLogObject.prompt_id.value =
    store.incomingBody.providerOptions?.promptUuid ??
    store.portkeyHeaders[PORTKEY_HEADER_KEYS.PROMPT_ID] ??
    null;
  chLogObject.prompt_version_id.value =
    store.incomingBody.providerOptions?.promptVersionId ??
    store.portkeyHeaders[PORTKEY_HEADER_KEYS.PROMPT_VERSION_ID] ??
    null;
  chLogObject.prompt_slug.value =
    store.incomingBody.providerOptions?.promptId ??
    store.portkeyHeaders[PORTKEY_HEADER_KEYS.PROMPT_SLUG] ??
    '';

  //FIND config_id
  try {
    chLogObject.config_id.value = store.organisationConfig.id || null;
  } catch (error: any) {
    logger.error({
      message: `ERROR_FETCHING_CONFIG: ${error.message}`,
    });
  }

  //FIND ai_org
  chLogObject.ai_org.value = store.proxyProvider || null;
  const cacheUnits = { cacheWriteInputUnits: 0, cacheReadInputUnits: 0 };
  if (chLogObject.is_success.value) {
    try {
      const tokens = await providerLogConfig.tokenConfig({
        env,
        model: chLogObject.ai_model.value,
        reqBody: store.mappedRequestBody,
        resBody: store.responseBody,
        url: store.requestURL,
      });
      const { reqUnits, resUnits, cacheReadInputUnits, cacheWriteInputUnits } =
        tokens;
      chLogObject.req_units.value = reqUnits;
      chLogObject.res_units.value = resUnits;
      cacheUnits.cacheReadInputUnits = cacheReadInputUnits || 0;
      cacheUnits.cacheWriteInputUnits = cacheWriteInputUnits || 0;
    } catch (error: any) {
      logger.error({
        message: `ERROR_FINDING_UNITS: ${error.message}`,
      });
      chLogObject.req_units.value = 0;
      chLogObject.res_units.value = 0;
    }
  } else {
    chLogObject.req_units.value = 0;
    chLogObject.res_units.value = 0;
  }

  //FIND total_units
  chLogObject.total_units.value = null;
  try {
    chLogObject.total_units.value =
      parseInt(`${chLogObject.req_units.value}`) +
      parseInt(`${chLogObject.res_units.value}`);
  } catch (error: any) {
    logger.error({
      message: `ERROR_FETCHING_TOTAL_UNITS: ${error.message}`,
    });
  }

  //FIND cost
  try {
    const priceConfig = await providerLogConfig.priceConfig({
      model: chLogObject.ai_model.value,
      url: store.requestURL,
      reqUnits: chLogObject.req_units.value,
      resUnits: chLogObject.res_units.value,
      requestBody: store.requestBody,
    });
    const cost = calculateCost(
      priceConfig,
      chLogObject.req_units.value,
      chLogObject.res_units.value,
      store.requestBody,
      cacheUnits
    );
    const { requestCost, responseCost, currency } = cost;
    chLogObject.cost.value =
      parseFloat(`${requestCost}`) + parseFloat(`${responseCost}`);
    chLogObject.cost_currency.value = currency;
    if (!chLogObject.cost.value) {
      chLogObject.cost.value = 0;
    }
  } catch (error: any) {
    chLogObject.cost.value = 0;
    chLogObject.cost_currency.value = 'USD';
    logger.error({
      message: `ERROR_FETCHING_COST: ${error.message}`,
    });
  }

  //FIND is_proxy_call
  chLogObject.is_proxy_call.value = ['proxy', 'proxy-2'].includes(
    store.proxyMode
  )
    ? true
    : false;

  //Find cache_status
  chLogObject.cache_status.value =
    store.incomingBody.config.cacheStatus || null;

  //Find cache_type
  chLogObject.cache_type.value = store.incomingBody.config.cacheType || null;

  //Find stream_mode
  chLogObject.stream_mode.value =
    store.incomingBody.config.streamingMode || null;

  //Find retry_success_count
  chLogObject.retry_success_count.value =
    store.incomingBody.config.retryCount || 0;

  let metadataKeys: Array<string | null> = [];
  let metadataValues: Array<string | null> = [];

  //Find metadata, _environment, _user, _organisation, _prompt
  try {
    let portkeyMetadata: Record<string, any> = {};
    if (store.metadata) {
      portkeyMetadata = store.metadata;
    } else if (store.portkeyHeaders['x-portkey-metadata']) {
      portkeyMetadata = JSON.parse(store.portkeyHeaders['x-portkey-metadata']);
      store.metadata = portkeyMetadata;
    }

    chLogObject._user.value =
      portkeyMetadata._user?.trim() ||
      store.mappedRequestBody?.user?.trim() ||
      null;
    if (chLogObject._user.value) {
      portkeyMetadata._user = chLogObject._user.value;
    }

    if (portkeyMetadata) {
      // Store data in metadata.key and metadata.value
      metadataKeys = Object.keys(portkeyMetadata).map(sanitize);
      metadataValues = Object.values(portkeyMetadata).map(sanitize);
      chLogObject['metadata.key'].value = `[${metadataKeys
        .map((k) => `'${k}'`)
        .join(', ')}]`;
      chLogObject['metadata.value'].value = `[${metadataValues
        .map((v) => `'${v}'`)
        .join(', ')}]`;
    }
  } catch (error: any) {
    metadataKeys = [];
    metadataValues = [];
    logger.error({
      message: `ERROR_FETCHING_METADATA: ${error.message}`,
    });
  }

  //Find trace_id
  chLogObject.trace_id.value =
    chLogObject.trace_id.value || chLogObject.internal_trace_id.value;
  chLogObject.span_id.value = chLogObject.span_id.value || chLogObject.id.value;
  chLogObject.span_name.value =
    chLogObject.span_name.value || store.metadata?.span_name || 'llm';

  //Find extras
  chLogObject.extra_key.value = 'is_raw_logging_enabled';
  chLogObject.extra_value.value = store.debugLogSetting?.toString() || '';

  chLogObject.workspace_slug.value =
    store.organisationDetails?.workspaceDetails?.slug || null;

  logObject.metrics = generateMetricObject(
    chLogObject,
    metadataKeys,
    metadataValues
  );

  const promises = [];
  const retentionPeriod =
    store.organisationDetails?.settings?.system_log_retention || 30;

  const logOptions: LogOptions = {
    filePath: `${retentionPeriod}/${store.organisationDetails.id}/${logObject._id}.json`,
    mongoCollectionName: process.env.MONGO_COLLECTION_NAME || '',
  };

  const logStoreApmOptions: LogStoreApmOptions = {
    type: 'generations',
    logId: logObject._id as string,
    organisationId: store.organisationDetails.id,
  };

  promises.push(
    handleLoggingToStore(env, logObject, logOptions, logStoreApmOptions)
  );

  promises.push(handleVirtualKeyUsage(env, store, chLogObject, logUsage));
  promises.push(handleApiKeyUsage(env, store, chLogObject, logUsage));
  await Promise.all(promises);
  return { analyticsLogObject: chLogObject, response: undefined };
}

function customLogTransform(
  req: Request,
  body: Record<string, any>,
  env: Record<string, any>,
  internalTraceId: string
) {
  let organisationDetails;
  try {
    organisationDetails = JSON.parse(
      req.headers.get(PORTKEY_HEADER_KEYS.ORGANISATION_DETAILS) as string
    );
  } catch (error: any) {
    logger.error({
      message: `ERROR_PARSING_HEADER: ${error.message}`,
    });
  }
  const { request: bodyRequest, response: bodyResponse, metadata } = body;

  const request =
    typeof bodyRequest === 'object'
      ? bodyRequest
      : bodyRequest
        ? JSON.parse(bodyRequest)
        : {};
  const response =
    typeof bodyResponse === 'object'
      ? bodyResponse
      : bodyResponse
        ? JSON.parse(bodyResponse)
        : {};

  // Constructing the request part
  const transformedRequest = {
    method: request.method ? req.method.toUpperCase() : 'POST',
    headers: request.headers,
    // Assuming the requestBody expects a stringified version of the body
    requestBody: request.body
      ? JSON.stringify(request.body)
      : JSON.stringify(request),
    requestURL: request.url,
    // Additional fields required by the original function
    // These fields may need to be filled with appropriate values
    requestHeaders: request.headers, // Assuming original function expects detailed headers here
  };

  // Constructing the response part
  const transformedResponse = {
    responseStatus: response.status || 200,
    responseHeaders: response.headers,
    responseBody: response.body
      ? JSON.stringify(response.body)
      : JSON.stringify(response),
    responseTime: response.response_time,
    // Additional response-related fields if needed
  };

  // Constructing the config and metadata part
  let providerOptions;
  if (metadata) {
    providerOptions = {
      metadata: metadata,
    };
  }

  //TODO: url mapping
  const provider = request.provider || req.headers.get(`x-portkey-provider`);
  const transformedConfig = {
    organisationConfig: {},
    organisationDetails: organisationDetails,
    cacheStatus: 'DISABLED',
    cacheType: null,
    retryCount: 0,
    // TODO: revisit this
    isStreamingMode: !!response.streamingMode,
    proxyMode: 'proxy-log',
    portkeyHeaders: {
      [PORTKEY_HEADER_KEYS.METADATA]: req.headers.get(
        PORTKEY_HEADER_KEYS.METADATA
      ),
      [PORTKEY_HEADER_KEYS.TRACE_ID]: req.headers.get(
        PORTKEY_HEADER_KEYS.TRACE_ID
      ),
      [PORTKEY_HEADER_KEYS.SPAN_ID]: req.headers.get(
        PORTKEY_HEADER_KEYS.SPAN_ID
      ),
      [PORTKEY_HEADER_KEYS.PARENT_SPAN_ID]: req.headers.get(
        PORTKEY_HEADER_KEYS.PARENT_SPAN_ID
      ),
      [PORTKEY_HEADER_KEYS.SPAN_NAME]: req.headers.get(
        PORTKEY_HEADER_KEYS.SPAN_NAME
      ),
      [PORTKEY_HEADER_KEYS.API_KEY]: req.headers.get(
        PORTKEY_HEADER_KEYS.API_KEY
      ),
      [PORTKEY_HEADER_KEYS.RUNTIME_VERSION]: req.headers.get(
        PORTKEY_HEADER_KEYS.RUNTIME_VERSION
      ),
      [PORTKEY_HEADER_KEYS.RUNTIME]: req.headers.get(
        PORTKEY_HEADER_KEYS.RUNTIME
      ),
      [PORTKEY_HEADER_KEYS.PACKAGE_VERSION]: req.headers.get(
        PORTKEY_HEADER_KEYS.PACKAGE_VERSION
      ),
    },
    provider: provider,
    requestParams: request.body,
    lastUsedOptionIndex: 0,
    internalTraceId: internalTraceId,
    traceId:
      body.trace_id ||
      providerOptions?.metadata.trace_id ||
      providerOptions?.metadata.traceId,
    spanId:
      body.span_id ||
      providerOptions?.metadata.span_id ||
      providerOptions?.metadata.spanId,
    parentSpanId:
      body.parent_span_id ||
      providerOptions?.metadata.parent_span_id ||
      providerOptions?.metadata.parentSpanId,
    spanName:
      body.span_name ||
      providerOptions?.metadata.span_name ||
      providerOptions?.metadata.spanName,
    cacheMaxAge: null,
  };

  // Assembling the final object expected by the original function
  const finalObject = {
    requestHeaders: transformedRequest.requestHeaders,
    config: transformedConfig,
    requestURL: transformedRequest.requestURL,
    requestMethod: transformedRequest.method,
    requestBody: transformedRequest.requestBody,
    responseHeaders: transformedResponse.responseHeaders,
    responseBody: transformedResponse.responseBody,
    responseStatus: transformedResponse.responseStatus,
    responseTime: transformedResponse.responseTime,
    providerOptions: providerOptions,
  };
  return finalObject;
}

export async function handleLoggingToStore(
  env: Record<string, any>,
  logObject: Record<string, any>,
  logOptions: LogOptions,
  logStoreApmOptions: LogStoreApmOptions
) {
  //default to Wasabi
  const logStore = env.LOG_STORE || LOG_STORES.WASABI;
  if (logStore === LOG_STORES.MONGO) {
    await logToMongo(
      env,
      logObject,
      logOptions.mongoCollectionName as string,
      logStoreApmOptions
    );
  }
  if (logStore === LOG_STORES.S3) {
    await uploadToS3(env, logObject, logOptions.filePath, logStoreApmOptions);
  }
  if (logStore === LOG_STORES.S3_ASSUME) {
    await uploadToS3Assumed(
      env,
      logObject,
      logOptions.filePath,
      logStoreApmOptions
    );
  }
  if (logStore === LOG_STORES.WASABI) {
    await uploadToWasabi(
      env,
      logObject,
      logOptions.filePath,
      logStoreApmOptions
    );
  }
  if (logStore === LOG_STORES.GOOGLE_CLOUD_STORAGE) {
    await uploadToGcs(env, logObject, logOptions.filePath, logStoreApmOptions);
  }
  if (logStore === LOG_STORES.AZURE_STORAGE) {
    await uploadToAzureStorage(
      env,
      logObject,
      logOptions.filePath,
      logStoreApmOptions
    );
  }
  if (logStore === LOG_STORES.NETAPP) {
    await uploadToNetapp(
      env,
      logObject,
      logOptions.filePath,
      logStoreApmOptions
    );
  }
}

export async function getLogFromLogStore(
  env: Record<string, any>,
  organisationDetails: Record<string, any>,
  logId: string,
  logOptions: LogOptions
) {
  //default to Wasabi
  const logStore = env.LOG_STORE || LOG_STORES.WASABI;
  if (logStore === LOG_STORES.MONGO) {
    return getFromMongo(env, logId, logOptions.mongoCollectionName as string);
  } else if (logStore === LOG_STORES.WASABI) {
    return getFromWasabi(env, logOptions.filePath);
  } else if (logStore === LOG_STORES.S3) {
    return getFromS3(env, logOptions.filePath);
  } else if (logStore === LOG_STORES.S3_ASSUME) {
    return getFromS3Assumed(env, logOptions.filePath);
  } else if (logStore === LOG_STORES.GOOGLE_CLOUD_STORAGE) {
    return getFromGcs(env, logOptions.filePath);
  } else if (logStore === LOG_STORES.AZURE_STORAGE) {
    return getLogsFromAzureStorage(env, logOptions.filePath);
  } else if (logStore === LOG_STORES.NETAPP) {
    return getFromNetapp(env, logOptions.filePath);
  }
  throw new Error('Invalid Log Storage');
}
