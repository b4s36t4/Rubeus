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

export const GroqLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.groq.com/openai/v1';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  const model =
    getDefaultModelName(reqBody, resBody) ||
    getFallbackModelName(AiProviders.GROQ, url);
  return model;
}

function tokenConfig(input: TokenInput) {
  const { resBody } = input;
  return {
    reqUnits: resBody.usage?.prompt_tokens || 0,
    resUnits: resBody.usage?.completion_tokens || 0,
  };
}

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    'llama2-70b-4096': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00007 },
          response_token: { price: 0.00008 },
        },
      },
    },
    'mixtral-8x7b-32768': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000027 },
          response_token: { price: 0.000027 },
        },
      },
    },
    'llama3-8b-8192': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000005 },
          response_token: { price: 0.00001 },
        },
      },
    },
    'llama3-70b-8192': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000059 },
          response_token: { price: 0.000079 },
        },
      },
    },
    'gemma-7b-it': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00001 },
          response_token: { price: 0.00001 },
        },
      },
    },
  };
  const { model, url } = input;
  const config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  return config?.pricing_config;
}
