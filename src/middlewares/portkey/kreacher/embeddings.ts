import { Context } from 'hono';
import { PORTKEY_HEADER_KEYS } from '../globals';
import { constructConfigFromRequestHeaders } from '../../../handlers/handlerUtils';

export const createOpenAIEmbedding = async function (
  env: Record<string, any>,
  c: Context,
  input: string,
  model = 'text-embedding-3-small',
  user = 'Semantic Cache'
) {
  if (!input || !input.length) {
    return false;
  }
  const apiKey = c.req.raw.headers.get(PORTKEY_HEADER_KEYS.API_KEY) || '';
  const headers = {
    [PORTKEY_HEADER_KEYS.METADATA]: `'{"_user":"${user}"}'`,
    [PORTKEY_HEADER_KEYS.API_KEY]: apiKey,
    [PORTKEY_HEADER_KEYS.CONFIG]: '{"cache": {"mode":"simple"}}',
    Authorization: env.OPENAI_API_KEY,
    [PORTKEY_HEADER_KEYS.PROVIDER]: 'openai',
    'Content-Type': 'application/json',
  };
  const body = { input, model, user };
  const options = {
    method: 'POST',
    headers: new Headers(headers),
    body: JSON.stringify(body),
  };
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: options.body,
  });

  const requestOptions = c.get('requestOptions') || [];
  const config = constructConfigFromRequestHeaders(headers);
  requestOptions.push({
    providerOptions: {
      ...config,
      requestURL: 'https://api.openai.com/v1/embeddings',
      rubeusURL: 'embed',
    },
    requestParams: body,
    response: response.clone(),
    lastUsedOptionIndex: 0,
    cacheMode: 'simple',
  });
  c.set('requestOptions', requestOptions);
  if (response.status !== 200) {
    return false;
  }
  const res: any = await response.json();
  return res.data[0].embedding;
};
