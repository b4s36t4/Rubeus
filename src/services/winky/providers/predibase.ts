import { getBillionTokensValue } from '../utils/helpers';
import { commonUrlPriceConfig, getFallbackModelName } from './commons';
import {
  AiProviders,
  LogConfig,
  ModelInput,
  ModelPricingConfig,
  PriceInput,
  PricingConfig,
  TokenInput,
} from './config';
import { tokenConfig as openAiTokenConfig } from './openai';

export const PredibaseLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://serving.app.predibase.com';
}

function modelConfig(input: ModelInput) {
  const { url } = input;
  let model;
  const fallbackModel = getFallbackModelName(AiProviders.PREDIBASE, url);
  try {
    const predibaseURL = new URL(url);
    model = predibaseURL.pathname.split('/')[5];
    if (!model) {
      model = fallbackModel;
    }
  } catch (e) {
    model = fallbackModel;
  }
  return model;
}

function tokenConfig(input: TokenInput) {
  input.model = 'gpt-3.5-turbo';
  return openAiTokenConfig(input);
}

function priceConfig(input: PriceInput): PricingConfig | null {
  const modelPricingConfig: ModelPricingConfig = {
    'mixtral-8x7b-v0-1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0001,
          },
          response_token: {
            price: 0.0001,
          },
        },
      },
    },
    'mixtral-8x7b-instruct-v0-1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0001,
          },
          response_token: {
            price: 0.0001,
          },
        },
      },
    },
    '7b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00002,
          },
          response_token: {
            price: 0.00002,
          },
        },
      },
    },
    '21b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000025,
          },
          response_token: {
            price: 0.000025,
          },
        },
      },
    },
    '70b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0001,
          },
          response_token: {
            price: 0.0001,
          },
        },
      },
    },
  };
  let model = input.model;
  const url = input.url;
  if (model.includes('mixtral-8x7b')) {
    model = 'mixtral-8x7b-v0-1';
  } else {
    const ftB = parseInt(getBillionTokensValue(model).replace('b', ''));
    if (ftB <= 7) {
      model = '7b';
    } else if (ftB <= 21) {
      model = '21b';
    } else if (ftB <= 70) {
      model = '70b';
    }
  }
  const config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  return config?.pricing_config;
}
