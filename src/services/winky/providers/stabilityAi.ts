import { getDefaultModelName, getFallbackModelName } from './commons';
import {
  AiProviders,
  LogConfig,
  ModelInput,
  ModelPricingConfig,
  PriceInput,
} from './config';

export const StabilityAiLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.stability.ai/v1';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  let model = getDefaultModelName(reqBody, resBody);
  if (!model) {
    const fallbackModelName = getFallbackModelName(
      AiProviders.STABILITY_AI,
      url
    );
    try {
      const stabilityAIURL = new URL(url);
      model = stabilityAIURL.pathname.split('/')[3];
      if (!model) {
        model = fallbackModelName;
      }
    } catch (e) {
      model = fallbackModelName;
    }
  }
  return model;
}

function tokenConfig() {
  return { reqUnits: 0, resUnits: 0 };
}

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    ultra: {
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
    core: {
      pricing_config: {
        pay_as_you_go: {
          image: {
            default: {
              default: { price: 3 },
            },
          },
        },
      },
    },
    'sd3-large': {
      pricing_config: {
        pay_as_you_go: {
          image: {
            default: {
              default: { price: 6.5 },
            },
          },
        },
      },
    },
    'sd3-medium': {
      pricing_config: {
        pay_as_you_go: {
          image: {
            default: {
              default: { price: 3.5 },
            },
          },
        },
      },
    },
    'sd3-large-turbo': {
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
    'stable-diffusion-xl-1024-v1-0': {
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
    'stable-diffusion-v1-6': {
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
    'stable-diffusion-xl-beta-v2-2-2': {
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
  };
  const { model } = input;
  const config = modelPricingConfig[model];
  return config?.pricing_config;
}
