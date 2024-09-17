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
import { tokenConfig as openAiTokenConfig } from './openai';

export const PerplexityAiLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.perplexity.ai';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  const model =
    getDefaultModelName(reqBody, resBody) ||
    getFallbackModelName(AiProviders.PERPLEXITY_AI, url);
  return model;
}

function tokenConfig(input: TokenInput) {
  input.model = 'gpt-3.5-turbo';
  return openAiTokenConfig(input);
}

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    'codellama-34b-instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00008,
          },
          response_token: {
            price: 0.00008,
          },
        },
      },
    },
    'codellama-70b-instruct': {
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
    'llama-2-70b-chat': {
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
    'mistral-7b-instruct': {
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
    'mixtral-8x7b-instruct': {
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
    'pplx-7b-chat': {
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
    'pplx-70b-chat': {
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
    'pplx-7b-online': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0,
          },
          response_token: {
            price: 0.000028,
          },
        },
        fixed_cost: {
          request: {
            price: 0.5,
          },
          response: {
            price: 0,
          },
        },
      },
    },
    'pplx-70b-online': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0,
          },
          response_token: {
            price: 0.00028,
          },
        },
        fixed_cost: {
          request: {
            price: 0.5,
          },
          response: {
            price: 0,
          },
        },
      },
    },
    'llama-3-sonar-small-32k-chat': {
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
    'llama-3-sonar-large-32k-chat': {
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
    'llama-3-8b-instruct': {
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
    'llama-3-70b-instruct': {
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
    'llama-3-sonar-small-32k-online': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00002,
          },
          response_token: {
            price: 0.00002,
          },
        },
        fixed_cost: {
          request: {
            price: 0.5,
          },
          response: {
            price: 0,
          },
        },
      },
    },
    'llama-3-sonar-large-32k-online': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0001,
          },
          response_token: {
            price: 0.0001,
          },
        },
        fixed_cost: {
          request: {
            price: 0.5,
          },
          response: {
            price: 0,
          },
        },
      },
    },
    'llama-3.1-sonar-small-128k-online': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00002,
          },
          response_token: {
            price: 0.00002,
          },
        },
        fixed_cost: {
          request: {
            price: 0.5,
          },
          response: {
            price: 0,
          },
        },
      },
    },
    'llama-3.1-sonar-large-128k-online': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0001,
          },
          response_token: {
            price: 0.0001,
          },
        },
        fixed_cost: {
          request: {
            price: 0.5,
          },
          response: {
            price: 0,
          },
        },
      },
    },
    'llama-3.1-sonar-huge-128k-online': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0005,
          },
          response_token: {
            price: 0.0005,
          },
        },
        fixed_cost: {
          request: {
            price: 0.5,
          },
          response: {
            price: 0,
          },
        },
      },
    },
    'llama-3.1-sonar-small-128k-chat': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00002,
          },
          response_token: {
            price: 0.00002,
          },
        },
        fixed_cost: {
          request: {
            price: 0,
          },
          response: {
            price: 0,
          },
        },
      },
    },
    'llama-3.1-sonar-large-128k-chat': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0001,
          },
          response_token: {
            price: 0.0001,
          },
        },
        fixed_cost: {
          request: {
            price: 0,
          },
          response: {
            price: 0,
          },
        },
      },
    },
    'llama-3.1-8b-instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00002,
          },
          response_token: {
            price: 0.0001,
          },
        },
        fixed_cost: {
          request: {
            price: 0,
          },
          response: {
            price: 0,
          },
        },
      },
    },
    'llama-3.1-70b-instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00002,
          },
          response_token: {
            price: 0.0001,
          },
        },
        fixed_cost: {
          request: {
            price: 0,
          },
          response: {
            price: 0,
          },
        },
      },
    },
  };
  const { model, url } = input;
  const config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  return config?.pricing_config;
}
