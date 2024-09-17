import { commonUrlPriceConfig, getDefaultModelName } from './commons';
import {
  LogConfig,
  ModelInput,
  ModelPricingConfig,
  PriceInput,
  TokenInput,
} from './config';

const getBaseURL = () => 'https://api.deepbricks.ai/v1';

export const deepbricksConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function modelConfig(input: ModelInput) {
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
    'GPT-4o-2024-08-06': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00015,
          },
          response_token: {
            price: 0.0004,
          },
        },
      },
    },
    'GPT-4o': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00015,
          },
          response_token: {
            price: 0.0004,
          },
        },
      },
    },
    'GPT-4-turbo': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0004,
          },
          response_token: {
            price: 0.001,
          },
        },
      },
    },
    'Claude-3.5-Sonnet': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0002,
          },
          response_token: {
            price: 0.0008,
          },
        },
      },
    },
    'GPT-4o-mini': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00001,
          },
          response_token: {
            price: 0.00004,
          },
        },
      },
    },
    'GPT-3.5-turbo': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00002,
          },
          response_token: {
            price: 0.00006,
          },
        },
      },
    },
    'GPT-3.5-turbo-instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00006,
          },
          response_token: {
            price: 0.00008,
          },
        },
      },
    },
    'LLama-3.1-405b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00015,
          },
          response_token: {
            price: 0.0003,
          },
        },
      },
    },
    'LLama-3.1-70b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00004,
          },
          response_token: {
            price: 0.00006,
          },
        },
      },
    },
    'LLama-3-70b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00004,
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
