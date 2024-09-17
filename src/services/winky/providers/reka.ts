import { commonUrlPriceConfig, getFallbackModelName } from './commons';
import {
  AiProviders,
  LogConfig,
  ModelInput,
  ModelPricingConfig,
  PriceInput,
  TokenInput,
} from './config';

export const RekaLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.reka.ai';
}

function modelConfig(input: ModelInput) {
  const { reqBody, url } = input;
  const model =
    reqBody.model_name || getFallbackModelName(AiProviders.REKA, url);

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
    'reka-edge': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00004 },
          response_token: { price: 0.0001 },
        },
      },
    },
    'reka-flash': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'reka-core': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.001 },
          response_token: { price: 0.0025 },
        },
      },
    },
    'reka-core-20240501': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.001 },
          response_token: { price: 0.0025 },
        },
      },
    },
    'reka-core-20240415': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.001 },
          response_token: { price: 0.0025 },
        },
      },
    },
    'reka-flash-20240226': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'reka-edge-20240208': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00004 },
          response_token: { price: 0.0001 },
        },
      },
    },
    default: {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.0002 },
        },
      },
    },
  };

  const { model, url } = input;

  const config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  return config?.pricing_config;
}
