import { commonUrlPriceConfig, getDefaultModelName } from './commons';
import {
  LogConfig,
  ModelInput,
  ModelPricingConfig,
  PriceInput,
  TokenInput,
} from './config';

export const cerebrasAIConfig: LogConfig = {
  getBaseURL: () => 'https://api.cerebras.ai/v1',
  modelConfig: modelConfig,
  tokenConfig,
  priceConfig: priceConfig,
};

export function modelConfig(input: ModelInput) {
  const { reqBody, resBody } = input;
  const model = getDefaultModelName(reqBody, resBody);
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
  const priceConfig: ModelPricingConfig = {
    'llama3.1-8b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00001,
          },
          response_token: {
            price: 0.00001,
          },
        },
      },
    },
    'llama3.1-70b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00006,
          },
          response_token: {
            price: 0.00006,
          },
        },
      },
    },
  };

  const { model, url } = input;
  const config = priceConfig[model] ?? commonUrlPriceConfig()[url]?.[model];

  return config?.pricing_config;
}
