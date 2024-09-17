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

export const MonsterAPILogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://llm.monsterapi.ai/v1';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  const model =
    getDefaultModelName(reqBody, resBody) ||
    getFallbackModelName(AiProviders.MONSTER_API, url);
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
    'TinyLlama/TinyLlama-1.1B-Chat-v1.0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000002818 },
          response_token: { price: 0.00002818 },
        },
      },
    },
    'microsoft/phi-2': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000003483 },
          response_token: { price: 0.00003483 },
        },
      },
    },
    'HuggingFaceH4/zephyr-7b-beta': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000004559 },
          response_token: { price: 0.00004559 },
        },
      },
    },
    'mistralai/Mistral-7B-Instruct-v0.2': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000004559 },
          response_token: { price: 0.00004559 },
        },
      },
    },
  };

  const { model, url } = input;

  const config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  return config?.pricing_config;
}
