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

export const AnyscaleLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.endpoints.anyscale.com/v1';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  const model =
    getDefaultModelName(reqBody, resBody) ||
    getFallbackModelName(AiProviders.ANYSCALE, url);
  return model;
}

function tokenConfig(input: TokenInput) {
  input.model = 'gpt-3.5-turbo';
  return openAiTokenConfig(input);
}

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    'meta-llama/Llama-2-7b-chat-hf': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000015,
          },
          response_token: {
            price: 0.000015,
          },
        },
      },
    },
    'meta-llama/Llama-2-13b-chat-hf': {
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
    'meta-llama/Llama-2-70b-chat-hf': {
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
    'codellama/CodeLlama-34b-Instruct-hf': {
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
    'mistralai/Mistral-7B-Instruct-v0.1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000015,
          },
          response_token: {
            price: 0.000015,
          },
        },
      },
    },
    'mistralai/Mixtral-8x7B-Instruct-v0.1': {
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
    'Open-Orca/Mistral-7B-OpenOrca': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000015,
          },
          response_token: {
            price: 0.000015,
          },
        },
      },
    },
    'thenlper/gte-large': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000005,
          },
          response_token: {
            price: 0,
          },
        },
      },
    },
    'HuggingFaceH4/zephyr-7b-beta': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000015,
          },
          response_token: {
            price: 0.000015,
          },
        },
      },
    },
    'Meta-Llama/Llama-Guard-7b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000015,
          },
          response_token: {
            price: 0.000015,
          },
        },
      },
    },
    'BAAI/bge-large-en-v1.5': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000005,
          },
          response_token: {
            price: 0,
          },
        },
      },
    },
    'mlabonne/NeuralHermes-2.5-Mistral-7B': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000015,
          },
          response_token: {
            price: 0.000015,
          },
        },
      },
    },
    'codellama/CodeLlama-70b-Instruct-hf': {
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
    'meta-llama/Llama-3-8b-chat-hf': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000015,
          },
          response_token: {
            price: 0.000015,
          },
        },
      },
    },
    'meta-llama/Meta-Llama-3-70B-Instruct': {
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
    'google/gemma-7b-it': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000015,
          },
          response_token: {
            price: 0.000015,
          },
        },
      },
    },
    'mistralai/Mixtral-8x22B-Instruct-v0.1': {
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
  };
  const { model, url } = input;
  const config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  return config?.pricing_config;
}
