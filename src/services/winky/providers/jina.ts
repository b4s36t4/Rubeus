import {
  commonUrlPriceConfig,
  getDefaultModelName,
  getFallbackModelName,
} from './commons';
import {
  AiProviders,
  LogConfig,
  ModelInput,
  ModelPricingConfig,
  PriceInput,
  TokenInput,
} from './config';

export const JinaLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.jina.ai/v1';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  const model =
    getDefaultModelName(reqBody, resBody) ||
    getFallbackModelName(AiProviders.JINA, url);
  return model;
}

function tokenConfig(input: TokenInput) {
  const { resBody } = input;
  return { reqUnits: resBody.usage?.total_tokens || 0, resUnits: 0 };
}

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    'jina-embeddings-v2-base-en': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000002 },
          response_token: { price: 0 },
        },
      },
    },
    'jina-embeddings-v2-base-code': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000002 },
          response_token: { price: 0 },
        },
      },
    },
    'jina-embeddings-v2-base-zh': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000002 },
          response_token: { price: 0 },
        },
      },
    },
    'jina-colbert-v1-en': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000002 },
          response_token: { price: 0 },
        },
      },
    },
    'jina-embeddings-v2-base-de': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000002 },
          response_token: { price: 0 },
        },
      },
    },
    'jina-embeddings-v2-base-es': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000002 },
          response_token: { price: 0 },
        },
      },
    },
    'jina-reranker-v1-base-en': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000002 },
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
