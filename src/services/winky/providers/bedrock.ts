import { commonUrlPriceConfig, getFallbackModelName } from './commons';
import {
  AiProviders,
  LogConfig,
  ModelInput,
  ModelPricingConfig,
  PriceInput,
  TokenInput,
} from './config';

export const BedrockLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return '';
}

function modelConfig(input: ModelInput) {
  const { url } = input;
  let model;
  const fallbackModel = getFallbackModelName(AiProviders.BEDROCK, url);
  try {
    const bedrockURL = new URL(url);
    model = bedrockURL.pathname.split('/')[2];
    if (!model) {
      model = fallbackModel;
    }
  } catch (e) {
    model = fallbackModel;
  }
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
    'amazon.titan-text-express-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.00016 },
        },
      },
    },
    'amazon.titan-text-lite-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00003 },
          response_token: { price: 0.00004 },
        },
      },
    },
    'amazon.titan-embed-text-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00001 },
          response_token: { price: 0 },
        },
      },
    },
    'anthropic.claude-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0008 },
          response_token: { price: 0.0024 },
        },
      },
    },
    'anthropic.claude-v2': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0008 },
          response_token: { price: 0.0024 },
        },
      },
    },
    'anthropic.claude-v2:1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0008 },
          response_token: { price: 0.0024 },
        },
      },
    },
    'anthropic.claude-instant-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.00024 },
        },
      },
    },
    'ai21.j2-mid-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00125 },
          response_token: { price: 0.00125 },
        },
      },
    },
    'ai21.j2-ultra-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00188 },
          response_token: { price: 0.00188 },
        },
      },
    },
    'cohere.command-text-v14': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00015 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'cohere.command-light-text-v14': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00003 },
          response_token: { price: 0.00006 },
        },
      },
    },
    'cohere.embed-english-v3': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00001 },
          response_token: { price: 0 },
        },
      },
    },
    'cohere.embed-multilingual-v3': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00001 },
          response_token: { price: 0 },
        },
      },
    },
    'meta.llama2-13b-chat-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000075 },
          response_token: { price: 0.0001 },
        },
      },
    },
    'meta.llama2-70b-chat-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000195 },
          response_token: { price: 0.000256 },
        },
      },
    },
    'anthropic.claude-3-sonnet-20240229-v1:0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0015 },
        },
      },
    },
    'anthropic.claude-3-haiku-20240307-v1:0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000025 },
          response_token: { price: 0.000125 },
        },
      },
    },
    'mistral.mistral-7b-instruct-v0:2': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000015 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'mistral.mixtral-8x7b-instruct-v0:1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000045 },
          response_token: { price: 0.00007 },
        },
      },
    },
    'meta.llama3-8b-instruct-v1:0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00004 },
          response_token: { price: 0.00006 },
        },
      },
    },
    'meta.llama3-70b-instruct-v1:0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000265 },
          response_token: { price: 0.00035 },
        },
      },
    },
    'anthropic.claude-3-opus-20240229-v1:0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0015 },
          response_token: { price: 0.0075 },
        },
      },
    },
    'anthropic.claude-3-5-sonnet-20240620-v1:0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0015 },
        },
      },
    },
    'stability.stable-diffusion-xl-v1': {
      pricing_config: {
        pay_as_you_go: {
          image: {
            default: {
              default: { price: 4 },
            },
          },
        },
      },
    },
    'stability.stable-diffusion-xl-v1::premium': {
      pricing_config: {
        pay_as_you_go: {
          image: {
            default: {
              default: { price: 8 },
            },
          },
        },
      },
    },
    'meta.llama3-1-8b-instruct-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00003 },
          response_token: { price: 0.00006 },
        },
      },
    },
    'meta.llama3-1-70b-instruct-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000265 },
          response_token: { price: 0.00035 },
        },
      },
    },
  };
  const { model, url } = input;
  if (
    input.requestBody?.model == 'stability.stable-diffusion-xl-v1' &&
    input.requestBody?.step > 50
  ) {
    return modelPricingConfig['stability.stable-diffusion-xl-v1::premium']
      ?.pricing_config;
  }
  const config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  return config?.pricing_config;
}
