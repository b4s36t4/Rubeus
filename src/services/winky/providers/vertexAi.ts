import { commonUrlPriceConfig, getFallbackModelName } from './commons';
import {
  AiProviders,
  LogConfig,
  ModelInput,
  ModelPricingConfig,
  PriceInput,
  TokenInput,
} from './config';

export const VertexAILogConfig: LogConfig = {
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
  const fallbackModel = getFallbackModelName(AiProviders.VERTEX_AI, url);
  try {
    const vertexUrl = new URL(url);
    model = vertexUrl.pathname.split('/')[9].split(':')[0];
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
    'gemini-1.0-pro': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00005 },
          response_token: { price: 0.00015 },
        },
      },
    },
    'gemini-1.0-pro-vision': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00005 },
          response_token: { price: 0.00015 },
        },
      },
    },
    'gemini-1.5-vision': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.001 },
          response_token: { price: 0.003 },
        },
      },
    },
    'gemini-1.0-pro-vision-001': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00005 },
          response_token: { price: 0.00015 },
        },
      },
    },
    'gemini-1.0-pro-002': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00005 },
          response_token: { price: 0.00015 },
        },
      },
    },
    'gemini-1.0-pro-001': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00005 },
          response_token: { price: 0.00015 },
        },
      },
    },
    'claude-3-haiku@20240307': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000025 },
          response_token: { price: 0.000125 },
        },
      },
    },
    'claude-3-sonnet@20240229': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0015 },
        },
      },
    },
    'claude-3-opus@20240229': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0015 },
          response_token: { price: 0.0075 },
        },
      },
    },
    'claude-3-5-sonnet@20240620': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0015 },
        },
      },
    },
    'gemini-1.5-pro-001': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0005 },
          response_token: { price: 0.0015 },
        },
      },
    },
    'gemini-1.5-pro-preview-0514': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0005 },
          response_token: { price: 0.0015 },
        },
      },
    },
    'gemini-1.5-pro-preview-0409': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0005 },
          response_token: { price: 0.0015 },
        },
      },
    },
    'gemini-1.5-flash-001': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00005 },
          response_token: { price: 0.00015 },
        },
      },
    },
    'gemini-1.5-flash-preview-0514': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00005 },
          response_token: { price: 0.00015 },
        },
      },
    },
  };
  const { model, url } = input;
  const config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  return config?.pricing_config;
}
