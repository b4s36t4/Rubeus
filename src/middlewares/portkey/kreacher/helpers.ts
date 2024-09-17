import { PORTKEY_HEADER_KEYS } from '../globals';

const DEFAULT_CACHE_AGE = 604800; // 7 days
const MIN_CACHE_AGE = 60; // 1 minute
const MAX_CACHE_AGE = 7776000; // 90 days

const allowedHeadersForCache = [PORTKEY_HEADER_KEYS.METADATA];

const cacheNamespaceHeader = PORTKEY_HEADER_KEYS.CACHE_NAME_SPACE;

export const getHeaderObj = (
  headers: Record<string, any>,
  cacheDataUrl: string,
  incomingRequestBody: Record<string, any>
) => {
  // Pick maxAge from cache-control or set a default value. Min 60.
  let maxAge = incomingRequestBody.maxAge;
  // if maxAge is not present in headers as well, set it to default
  if (!maxAge) {
    maxAge = DEFAULT_CACHE_AGE;
  }

  //check maxAge is between allowed min and max cache age
  if (maxAge < MIN_CACHE_AGE || maxAge > MAX_CACHE_AGE) {
    maxAge = DEFAULT_CACHE_AGE;
  }

  // Pick cacheMode from x-portkey-cache. Semantic mode is allowed ONLY for OpenAI completions
  const proxyMode = headers[PORTKEY_HEADER_KEYS.MODE];
  let cacheMode = headers[PORTKEY_HEADER_KEYS.CACHE] || 'false';
  if (
    cacheMode === 'semantic' &&
    !isOpenAICompletion(proxyMode, cacheDataUrl)
  ) {
    cacheMode = 'simple';
  }

  // if cacheMode is true, set it to simple (Backward compatibility)
  if (cacheMode === 'true') {
    cacheMode = 'simple';
  }

  const metaHeader = headers[PORTKEY_HEADER_KEYS.METADATA]
    ? JSON.parse(headers[PORTKEY_HEADER_KEYS.METADATA])
    : null;

  return {
    proxyMode,
    cacheMode,
    invalidateCache:
      headers[PORTKEY_HEADER_KEYS.CACHE_REFRESH]?.toLowerCase() || null,
    maxAge,
    metaJSONString: headers[PORTKEY_HEADER_KEYS.METADATA],
    meta: metaHeader,
  };
};

export const parseBody = async (request: Record<string, any>) => {
  const incomingPath = new URL(request.url).pathname;
  const incomingRequestBody = await request.json();
  incomingRequestBody.headersObj = getHeaderObj(
    Object.fromEntries(request.headers),
    incomingRequestBody.url,
    incomingRequestBody
  );
  return { incomingPath, incomingRequestBody };
};

export const generateHash = async (stringToHash: string) => {
  const myText = new TextEncoder().encode(stringToHash);
  const myDigest = await crypto.subtle.digest(
    {
      name: 'SHA-256',
    },
    myText
  );

  const byteArray = Array.from(new Uint8Array(myDigest));
  const hexCodes = byteArray.map((value) => {
    const hexCode = value.toString(16);
    const paddedHexCode = hexCode.padStart(2, '0');
    return paddedHexCode;
  });

  return hexCodes.join('');
};

export const getHeadersForCache = (headersArr: any) => {
  if (typeof headersArr === 'string') {
    headersArr = JSON.parse(headersArr);
  }

  if (headersArr.hasOwnProperty(cacheNamespaceHeader)) {
    return headersArr[cacheNamespaceHeader];
  } else {
    for (const header in headersArr) {
      if (!allowedHeadersForCache.includes(header)) {
        delete headersArr[header];
      }
    }
    return headersArr;
  }
};

export const getCacheKey = async (body: Record<string, any>) => {
  const keyPrefix = `OUTPUT_`;
  const headersForCache = getHeadersForCache(cloneJ(body.headers));
  const stringToHash = `${body.organisationId}${body.url}${JSON.stringify(
    body.request
  )}${JSON.stringify(headersForCache)}`;
  const hash = await generateHash(stringToHash);
  return `${keyPrefix}${hash}`;
};

export const cloneJ = (obj: Record<string, any>) => {
  return JSON.parse(JSON.stringify(obj));
};

function isOpenAICompletion(proxyMode: string, cacheDataUrl: string) {
  return proxyMode == 'proxy openai' && cacheDataUrl.endsWith('completions');
}

// TODO: Need to test this thoroughly
// TODO: Prompt and meta separation only works for OpenAI right now. Need to make it work for other services too.
export const separatePromptAndMeta = (
  proxyMode: string | null,
  endpoint: string,
  requestObj: Record<string, any>
) => {
  if (
    (endpoint.indexOf('/chat/completions') > -1 ||
      endpoint === 'chatComplete') &&
    requestObj.messages.length &&
    requestObj.messages.length < 4
  ) {
    const params = { ...requestObj };
    const messages = params.messages;

    delete params.messages;

    // Ignore the first message and concatenate the remaining
    let prompt = '';
    messages.slice(1).forEach((msg: any) => {
      prompt += msg.content;
      prompt += '\n###\n';
    });
    return { prompt, params };
  } else if (
    (endpoint.indexOf('/completions') > -1 || endpoint === 'complete') &&
    endpoint.indexOf('/chat/completions') === -1
  ) {
    const params = { ...requestObj };
    const prompt = params.prompt + '';
    delete params.prompt;
    return { prompt, params };
  } else {
    return { prompt: undefined, params: null };
  }
};

export function respond(data: Record<string, any> | null, err?: any) {
  if (err) {
    return new Response(err.message, { status: err.status });
  } else {
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
    });
  }
}
