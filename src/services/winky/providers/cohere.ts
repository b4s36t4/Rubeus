import { PORTKEY_HEADER_KEYS } from '../../../middlewares/portkey/globals';
import {
  aiProviderUrlModelMapping,
  commonUrlPriceConfig,
  getDefaultModelName,
} from './commons';
import {
  LogConfig,
  ModelInput,
  ModelPricingConfig,
  PriceInput,
  TokenInput,
} from './config';

export const CohereLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.cohere.ai/v1';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  let model = getDefaultModelName(reqBody, resBody);
  if (!model) {
    model = aiProviderUrlModelMapping[url] || url;
  }
  return model;
}

function tokenConfig(input: TokenInput) {
  const { env, model, reqBody, resBody, url } = input;
  const apiType = aiProviderUrlTypeMapping[url];
  switch (apiType) {
    case 'generate': {
      // support rubeus response
      let generations =
        resBody.generations?.map((g: Record<string, any>) => g.text) ?? [];

      if (resBody.choices && resBody.choices[0]?.text) {
        generations = resBody.choices.map((c: Record<string, any>) => c.text);
      }
      if (resBody.choices && resBody.choices[0]?.message) {
        generations = resBody.choices.map(
          (c: Record<string, any>) => c.message.content
        );
      }
      return getCohereGenerateTokens(env, reqBody.prompt, generations, model);
    }
    case 'embed': {
      return getCohereEmbedTokens(env, reqBody.texts, model);
    }
    case 'classify': {
      return getCohereClassificationTokens(reqBody.inputs);
    }
    case 'summarize': {
      return getCohereSummariseTokens(
        env,
        reqBody.text,
        resBody.summary,
        model
      );
    }
    case 'rerank': {
      return getCohereRerankTokens(
        env,
        reqBody.query,
        reqBody.documents,
        model
      );
    }
    default: {
      return {
        resUnits: 0,
        reqUnits: 0,
      };
    }
  }
}

const aiProviderUrlTypeMapping: Record<string, string> = {
  'https://api.cohere.ai/v1/generate': 'generate',
  'https://api.cohere.ai/v1/embed': 'embed',
  'https://api.cohere.ai/v1/classify': 'classify',
  'https://api.cohere.ai/v1/summarize': 'summarize',
  'https://api.cohere.ai/v1/rerank': 'rerank',
};

export const cohereTokenize = async (
  env: Record<string, any>,
  promptString: string,
  model?: string
) => {
  const maxChunkSize = 65000; // 65000 characters
  const options: Record<string, any> = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${env.COHERE_API_KEY}`,
      [PORTKEY_HEADER_KEYS.API_KEY]: env.PORTKEY_API_KEY,
      [PORTKEY_HEADER_KEYS.METADATA]: JSON.stringify({
        _user: 'winky_cohere_tokenizer',
      }),
      [PORTKEY_HEADER_KEYS.MODE]: 'proxy cohere',
      [PORTKEY_HEADER_KEYS.CACHE]: 'simple',
    },
    body: {
      text: promptString,
    },
  };

  if (model) {
    options.body.model = model;
  }
  options.body = JSON.stringify(options.body);

  if (promptString.length <= maxChunkSize) {
    const response = await fetch(`${env.GATEWAY_BASEPATH}/tokenize`, options);
    const data: Record<string, any> = await response.json();
    return {
      status: 200,
      data: {
        token_count: data.tokens.length,
        token_strings: data.token_strings,
      },
    };
  } else {
    const aggregatedChunks: Record<string, any> = {
      token_count: 0,
      token_strings: [],
    };
    let startIndex = 0;

    while (startIndex < promptString.length) {
      const chunk = promptString.substring(
        startIndex,
        startIndex + maxChunkSize
      );
      startIndex += maxChunkSize;

      options.body = JSON.stringify({
        text: chunk,
      });

      const response = await fetch(`${env.GATEWAY_BASEPATH}/tokenize`, options);
      const data: Record<string, any> = await response.json();
      aggregatedChunks.token_count += data.tokens.length;
      aggregatedChunks.token_strings.push(...data.token_strings);
    }

    return {
      status: 200,
      data: aggregatedChunks,
    };
  }
};

export const getCohereGenerateTokens = async (
  env: Record<string, any>,
  prompt: string,
  completions: Record<string, any>[],
  model: string
) => {
  const promptTokenizer = await cohereTokenize(env, prompt, model);
  const completionsTokenizer = await cohereTokenize(
    env,
    completions.join(' '),
    model
  );

  return {
    reqUnits: promptTokenizer.data.token_count,
    resUnits: completionsTokenizer.data.token_count,
  };
};

export const getCohereEmbedTokens = async (
  env: Record<string, any>,
  texts: string[],
  model: string
) => {
  const textTokenizer = await cohereTokenize(env, texts.join(' '), model);

  return {
    reqUnits: textTokenizer.data.token_count,
    resUnits: 0,
  };
};

export const getCohereClassificationTokens = async (
  inputs: Record<string, any>
) => {
  return {
    reqUnits: inputs.length,
    resUnits: 0,
  };
};

export const getCohereSummariseTokens = async (
  env: Record<string, any>,
  text: string,
  summary: string,
  model: string
) => {
  const textTokenizer = await cohereTokenize(env, text, model);
  const summaryTokenizer = await cohereTokenize(env, summary, model);
  return {
    reqUnits: textTokenizer.data.token_count,
    resUnits: summaryTokenizer.data.token_count,
  };
};

export const getCohereRerankTokens = async (
  env: Record<string, any>,
  query: string,
  documents: Record<string, any>,
  model: string
) => {
  const concatenatedDocuments = documents.join(' /// ');
  const documentTokenizer = await cohereTokenize(
    env,
    concatenatedDocuments,
    model
  );
  const queryTokenizer = await cohereTokenize(env, query, model);
  const queryTokenizerLength = queryTokenizer.data.token_count;
  // const documentTokenizerLength = documentTokenizer.data.token_strings.length
  // if (queryTokenizerLength > 1000 || tokenizerLength > 100000) {
  //     Sentry.captureException(`Large token list found ${queryTokenizerLength} ${tokenizerLength}`);
  // }
  let documentCount = 1;
  let currentTokenCount = queryTokenizerLength;
  for (const token of documentTokenizer.data.token_strings) {
    if (token.trim() === '///') {
      documentCount += 1;
      currentTokenCount = queryTokenizerLength;
    }
    if (currentTokenCount > 510) {
      documentCount += 1;
      currentTokenCount = queryTokenizerLength;
    }
    currentTokenCount += 1;
  }
  const searchUnitCount = Math.ceil(documentCount / 100);
  return {
    reqUnits: searchUnitCount,
    resUnits: 0,
  };
};

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    'rerank-multilingual-v2.0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.1 },
          response_token: { price: 0 },
        },
      },
    },
    'rerank-english-v2.0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.1 },
          response_token: { price: 0 },
        },
      },
    },
    command: {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00015 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'command-nightly': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00015 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'command-light': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00015 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'command-light-nightly': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00015 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'summarize-medium': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0015 },
          response_token: { price: 0.0015 },
        },
      },
    },
    'summarize-xlarge': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0015 },
          response_token: { price: 0.0015 },
        },
      },
    },
    'co-tokenize': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0 },
          response_token: { price: 0 },
        },
      },
    },
  };
  const { model, url } = input;
  const config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  return config?.pricing_config;
}
