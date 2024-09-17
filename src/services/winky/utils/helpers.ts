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

export function maskNestedConfig(
  config: Record<string, any>,
  nestingKey: string
) {
  if (!config[nestingKey] && config.api_key) {
    config.api_key = hash(config.api_key);
  }
  if (!config[nestingKey] && config.apiKey) {
    config.apiKey = hash(config.apiKey);
  }
  if (config[nestingKey]) {
    for (const [, target] of config[nestingKey].entries()) {
      if (!target[nestingKey] && target.api_key) {
        target.api_key = hash(target.api_key);
      }
      if (!target[nestingKey] && target.apiKey) {
        target.apiKey = hash(target.apiKey);
      }
      if (target[nestingKey]) {
        maskNestedConfig(target, nestingKey);
      }
    }
  }
}

export async function retriableApiReq(
  env: Record<string, any>,
  url: string,
  options: RequestInit
) {
  return retryUntil(
    env,
    () => fetch(url, options),
    (response) => {
      return response.ok;
    },
    (response) => {
      return response.text();
    },
    5,
    100
  );
}

export async function retryUntil<T>(
  env: Record<string, any>,
  fn: () => Promise<T>,
  condition: (result: T) => boolean,
  errFunc: (res: T) => Promise<string>,
  maxRetries: number,
  baseDelayMs: number
): Promise<T> {
  const retry = async (attempt: number): Promise<T> => {
    try {
      const result = await fn();
      if (condition(result)) {
        return result;
      } else if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt++;
        return retry(attempt);
      } else {
        const errorMessage = await errFunc(result);
        throw new Error(`Error ${errorMessage}`);
      }
    } catch (error) {
      attempt++;
      if (attempt < maxRetries) {
        return retry(attempt);
      }
      throw new Error(`Retry failed: ${error}`);
    }
  };
  return retry(0);
}

export function getBillionTokensValue(modelName: string) {
  const regex = /(\d+(?:\.\d+)?b)/i;
  const match = modelName.match(regex);
  return match ? match[0] : modelName;
}

export function generateMetricObject(
  chLogObject: Record<string, any>,
  metadataKeys: Array<string | null>,
  metadataValues: Array<string | null>
) {
  return {
    version: '1.0.0',
    id: chLogObject.id.value,
    organisation_id: chLogObject.organisation_id.value,
    organisation_name: chLogObject.organisation_name.value,
    prompt_id: chLogObject.prompt_id.value || '',
    prompt_version_id: chLogObject.prompt_version_id.value || '',
    config_id: chLogObject.config_id.value || '',
    created_at: chLogObject.created_at.value,
    is_success: chLogObject.is_success.value,
    ai_org: chLogObject.ai_org.value || '',
    ai_org_auth_hash: chLogObject.ai_org_auth_hash.value || '',
    ai_model: chLogObject.ai_model.value || '',
    req_units: chLogObject.req_units.value,
    res_units: chLogObject.res_units.value,
    total_units: chLogObject.total_units.value,
    cost: chLogObject.cost.value,
    cost_currency: chLogObject.cost_currency.value,
    request_url: chLogObject.request_url.value,
    request_method: chLogObject.request_method.value,
    response_status_code: chLogObject.response_status_code.value,
    response_time: chLogObject.response_time.value,
    cache_status: chLogObject.cache_status.value,
    cache_type: chLogObject.cache_type.value || '',
    stream_mode: chLogObject.stream_mode.value,
    retry_success_count: chLogObject.retry_success_count.value,
    trace_id: chLogObject.trace_id.value,
    extra_key: chLogObject.extra_key.value || '',
    extra_value: chLogObject.extra_value.value || '',
    mode: chLogObject.mode.value,
    virtual_key: chLogObject.virtual_key.value || '',
    source: chLogObject.source.value,
    runtime: chLogObject.runtime.value || '',
    runtime_version: chLogObject.runtime_version.value || '',
    sdk_version: chLogObject.sdk_version.value || '',
    config: chLogObject.config.value || '',
    internal_trace_id: chLogObject.internal_trace_id.value,
    config_version_id: chLogObject.config_version_id.value || '',
    prompt_slug: chLogObject.prompt_slug.value || '',
    metadata__key: metadataKeys,
    metadata__value: metadataValues,
  };
}

export function getURL(url: string, basePath: string) {
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    urlObj = new URL(url, basePath || 'https://api.openai.com');
  }
  return urlObj.toString();
}
