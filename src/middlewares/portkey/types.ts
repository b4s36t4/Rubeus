import { AtomicKeyTypes, AtomicOperations, EntityStatus } from './globals';

export interface WinkyLogObject {
  id: string;
  traceId: string;
  internalTraceId: string;
  requestMethod: string;
  requestURL: string;
  rubeusURL: string;
  requestHeaders: Record<string, any>;
  requestBody: string;
  requestBodyParams: string;
  responseHeaders: Record<string, any> | null;
  responseBody: string | null;
  responseStatus: number;
  responseTime: number;
  cacheKey: string;
  providerOptions: Record<string, any>;
  debugLogSetting: boolean;
  config: {
    organisationConfig: Record<string, any> | null;
    organisationDetails: OrganisationDetails;
    cacheStatus: string;
    cacheType: string | null;
    retryCount: number;
    portkeyHeaders: Record<string, any> | null;
    proxyMode: string;
    streamingMode: boolean;
    provider: string;
    requestParams: Record<string, any>;
    lastUsedOptionIndex: number;
    internalTraceId: string;
    cacheMaxAge: number | null;
  };
}

interface OpenAIChoiceMessage {
  role: string;
  content: string;
  tool_calls?: any;
}

interface OpenAIChoice {
  index: string;
  finish_reason: string;
  message?: OpenAIChoiceMessage;
  text?: string;
  logprobs?: any;
}

interface AnthropicPromptUsageTokens {
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

interface OpenAIUsage extends AnthropicPromptUsageTokens {
  completion_tokens: number;
  prompt_tokens?: number;
  total_tokens?: number;
}

export interface OpenAIStreamResponse {
  id: string;
  object: string;
  created: string;
  choices: OpenAIChoice[];
  model: string;
  usage: OpenAIUsage;
}

interface CohereGeneration {
  id: string;
  text: string;
  finish_reason: string;
}

export interface CohereStreamResponse {
  id: string;
  generations: CohereGeneration[];
  prompt: string;
}

export interface ParsedChunk {
  is_finished: boolean;
  finish_reason: string;
  response?: {
    id: string;
    generations: CohereGeneration[];
    prompt: string;
  };
  text?: string;
}

export interface AnthropicCompleteStreamResponse {
  completion: string;
  stop_reason: string;
  model: string;
  truncated?: boolean;
  stop: null | string;
  log_id: string;
  exception?: any | null;
}

export interface AnthropicMessagesStreamResponse {
  id: string;
  type: string;
  role: string;
  content: {
    type: string;
    text: string;
  }[];
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
}

interface GoogleGenerateFunctionCall {
  name: string;
  args: Record<string, any>;
}

export interface GoogleGenerateContentResponse {
  candidates: {
    content: {
      parts: {
        text?: string;
        functionCall?: GoogleGenerateFunctionCall;
      }[];
      role: string;
    };
    finishReason: string;
    index: 0;
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  }[];
  promptFeedback: {
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  };
}

export interface TogetherAIResponse {
  id: string;
  choices: {
    text?: string;
    message?: {
      role: string;
      content: string;
    };
  }[];
  created: string;
  model: string;
  object: string;
}

export interface TogetherInferenceResponse {
  status: string;
  output: {
    choices: {
      text: string;
    }[];
    request_id: string;
  };
}

export interface OllamaCompleteResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context: number[];
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

export interface OllamaCompleteStreamReponse {
  model: string;
  created_at: number;
  response: string;
  done: boolean;
  context: number[];
}

export interface OllamaChatCompleteResponse {
  model: string;
  created_at: number;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

export interface OllamaChatCompleteStreamResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count?: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

export type AtomicCounterRequestType = {
  operation: AtomicOperations;
  type: AtomicKeyTypes;
  organisationId: string;
  key: string;
  amount: number;
};

interface RateLimit {
  type: string;
  unit: string;
  value: number;
}

interface ApiKeyDefaults {
  config_slug?: string;
  config_id?: string;
  metadata?: Record<string, string>;
}

export interface WorkspaceDetails {
  id: string;
  slug: string;
}

export interface UsageLimits {
  credit_limit: number | null;
  alert_threshold: number | null;
  is_threshold_alerts_sent: boolean | null;
  is_exhausted_alerts_sent: boolean | null;
  periodic_reset: string | null;
}

export interface OrganisationDetails {
  id: string;
  ownerId?: string;
  name?: string;
  settings: Record<string, any>;
  isFirstGenerationDone: boolean;
  enterpriseSettings?: Record<string, any>;
  workspaceDetails: WorkspaceDetails;
  scopes: string[];
  rateLimits?: RateLimit[];
  defaults: ApiKeyDefaults;
  usageLimits: UsageLimits;
  status: EntityStatus;
  apiKeyDetails: {
    id: string;
  };
}

export type AnalyticsDetails<T> = {
  type: 'string' | 'int' | 'array' | 'float' | 'number';
  value: T | null;
  isNullable: boolean;
};

export type AnalyticsLogObject = {
  id: AnalyticsDetails<string>;
  organisation_id: AnalyticsDetails<string>;
  organisation_name: AnalyticsDetails<string>;
  user_id: AnalyticsDetails<string>;
  prompt_id: AnalyticsDetails<string>;
  prompt_version_id: AnalyticsDetails<string>;
  config_id: AnalyticsDetails<string>;
  created_at: AnalyticsDetails<string>;
  is_success: AnalyticsDetails<boolean>;
  ai_org: AnalyticsDetails<string>;
  ai_org_auth_hash: AnalyticsDetails<string>;
  ai_model: AnalyticsDetails<string>;
  req_units: AnalyticsDetails<number>;
  res_units: AnalyticsDetails<number>;
  total_units: AnalyticsDetails<number>;
  cost: AnalyticsDetails<number>;
  cost_currency: AnalyticsDetails<string>;
  request_url: AnalyticsDetails<string>;
  request_method: AnalyticsDetails<string>;
  response_status_code: AnalyticsDetails<number>;
  response_time: AnalyticsDetails<number>;
  is_proxy_call: AnalyticsDetails<boolean>;
  cache_status: AnalyticsDetails<string>;
  cache_type: AnalyticsDetails<string>;
  stream_mode: AnalyticsDetails<number>;
  retry_success_count: AnalyticsDetails<number>;
  _environment: AnalyticsDetails<string>;
  _user: AnalyticsDetails<string>;
  _organisation: AnalyticsDetails<string>;
  _prompt: AnalyticsDetails<string>;
  trace_id: AnalyticsDetails<string>;
  span_id: AnalyticsDetails<string>;
  span_name: AnalyticsDetails<string>;
  parent_span_id: AnalyticsDetails<string>;
  extra_key: AnalyticsDetails<string>;
  extra_value: AnalyticsDetails<string>;
  mode: AnalyticsDetails<string>;
  virtual_key: AnalyticsDetails<string>;
  source: AnalyticsDetails<string>;
  runtime: AnalyticsDetails<string>;
  runtime_version: AnalyticsDetails<string>;
  sdk_version: AnalyticsDetails<string>;
  config: AnalyticsDetails<string>;
  internal_trace_id: AnalyticsDetails<string>;
  last_used_option_index: AnalyticsDetails<number>;
  config_version_id: AnalyticsDetails<string>;
  prompt_slug: AnalyticsDetails<string>;
  workspace_slug: AnalyticsDetails<string>;
  'metadata.key': AnalyticsDetails<string>;
  'metadata.value': AnalyticsDetails<string>;
  api_key_id: AnalyticsDetails<string>;
};

export interface HookFeedbackMetadata extends Record<string, string> {
  successfulChecks: string;
  failedChecks: string;
  erroredChecks: string;
}

export interface HookFeedback {
  value: number;
  weight: number;
  metadata: HookFeedbackMetadata;
}

export interface CheckResult {
  id: string;
  verdict: boolean;
  error?: {
    name: string;
    message: string;
  } | null;
  data: null | Record<string, any>;
}

export interface HookResult {
  verdict: boolean;
  id: string;
  checks: CheckResult[];
  feedback: HookFeedback;
  deny: boolean;
  async: boolean;
}

export interface HookResultWithLogDetails extends HookResult {
  event_type: 'beforeRequestHook' | 'afterRequestHook';
  guardrail_version_id: string;
}

export interface HookResultLogObject {
  generation_id: string;
  trace_id: string;
  internal_trace_id: string;
  organisation_id: string;
  workspace_slug: string;
  results: HookResultWithLogDetails[];
  organisation_details: OrganisationDetails;
}

export type LogOptions = {
  filePath: string;
  mongoCollectionName?: string;
};

export type LogStoreApmOptions = {
  logId: string;
  type: 'generations' | 'generation_hooks'; // This is just used to identify apm errors
  organisationId: string;
};

export type HookResultsLogDetail<T> = {
  type: 'string' | 'int' | 'array' | 'float' | 'number';
  value: T;
  isNullable: boolean;
};

export type HookResultsBaseLogObject = {
  organisation_id: HookResultsLogDetail<string>;
  workspace_slug: HookResultsLogDetail<string>;
  generation_id: HookResultsLogDetail<string>;
  trace_id: HookResultsLogDetail<string>;
  internal_trace_id: HookResultsLogDetail<string>;
};

export type HookResultsLogObject = HookResultsBaseLogObject & {
  id: HookResultsLogDetail<string>;
  hook_id: HookResultsLogDetail<string>;
  guardrail_version_id: HookResultsLogDetail<string>;
  hook_event_type: HookResultsLogDetail<string>;
  hook_category: HookResultsLogDetail<string>;
  execution_time: HookResultsLogDetail<number>;
  created_at: HookResultsLogDetail<string>;
  total_checks_passed: HookResultsLogDetail<number>;
  total_checks_failed: HookResultsLogDetail<number>;
  total_checks_errored: HookResultsLogDetail<number>;
  verdict: HookResultsLogDetail<boolean>;
  async: HookResultsLogDetail<boolean>;
  deny: HookResultsLogDetail<boolean>;
  is_raw_log_available: HookResultsLogDetail<boolean>;
  // Final clickhouse log object needs all nested columns to be string.
  // So it is not possible to mention the actual types currently
  'checks.check_id': HookResultsLogDetail<string>; // string[]
  'checks.execution_time': HookResultsLogDetail<string>; // number[]
  'checks.created_at': HookResultsLogDetail<string>; // string[]
  'checks.verdict': HookResultsLogDetail<string>; // boolean[]
  'checks.error': HookResultsLogDetail<string>; // boolean[]
};

export type HookResultsRawLogObject = {
  _id: string;
  hook_id: string;
  organisation_id: string;
  created_at: string;
  checks: {
    check_id: string;
    data: any;
    error: any;
  }[];
};
