import { getBillionTokensValue } from '../utils/helpers';
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
  PricingConfig,
  TokenInput,
  Tokens,
} from './config';

export const FireworksAiLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.fireworks.ai/inference/v1';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  const model =
    getDefaultModelName(reqBody, resBody) ||
    getFallbackModelName(AiProviders.FIREWORKS_AI, url);
  return model;
}

function tokenConfig(input: TokenInput): Tokens {
  const { resBody } = input;
  return {
    reqUnits: resBody.usage?.prompt_tokens || 0,
    resUnits: resBody.usage?.completion_tokens || 0,
  };
}

function priceConfig(input: PriceInput): PricingConfig | null {
  const modelPricingConfig: ModelPricingConfig = {
    'mixtral-8x7b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00005,
          },
          response_token: {
            price: 0.00005,
          },
        },
      },
    },
    'dbrx-instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00016,
          },
          response_token: {
            price: 0.00016,
          },
        },
      },
    },
    '16b': {
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
    '80b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00009,
          },
          response_token: {
            price: 0.00009,
          },
        },
      },
    },
    'nomic-ai/nomic-embed-text-v1.5': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0000008,
          },
          response_token: {
            price: 0.0000008,
          },
        },
      },
    },
    'nomic-ai/nomic-embed-text-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0000008,
          },
          response_token: {
            price: 0.0000008,
          },
        },
      },
    },
    'thenlper/gte-base': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0000008,
          },
          response_token: {
            price: 0.0000008,
          },
        },
      },
    },
    'WhereIsAI/UAE-Large-V1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0000016,
          },
          response_token: {
            price: 0.0000016,
          },
        },
      },
    },
    'thenlper/gte-large': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0000016,
          },
          response_token: {
            price: 0.0000016,
          },
        },
      },
    },
    'llama-v3p1-405b-instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0003,
          },
          response_token: {
            price: 0.0003,
          },
        },
      },
    },
    'llama-v3p1-70b-instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00009,
          },
          response_token: {
            price: 0.00009,
          },
        },
      },
    },
    'llama-v3p1-8b-instruct': {
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
  };
  let model = input.model;
  const url = input.url;
  if (model.includes('mixtral-8x7b')) {
    model = 'mixtral-8x7b';
  } else if (model.includes('dbrx-instruct')) {
    model = 'dbrx-instruct';
  } else {
    const ftB = parseInt(getBillionTokensValue(model).replace('b', ''));
    if (ftB <= 16) {
      model = '16b';
    } else if (ftB <= 80) {
      model = '80b';
    }
  }
  const config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  return config?.pricing_config;
}
