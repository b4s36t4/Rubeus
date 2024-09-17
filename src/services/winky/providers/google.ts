import { getDefaultModelName, getFallbackModelName } from './commons';
import {
  AiProviders,
  LogConfig,
  ModelInput,
  ModelPricingConfig,
  PriceInput,
  TokenInput,
} from './config';
import { palmTokenize } from './palm';

export const GoogleLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://generativelanguage.googleapis.com/v1beta';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  let model = getDefaultModelName(reqBody, resBody);
  if (!model) {
    try {
      const googleUrl = new URL(url);
      model = googleUrl.pathname.split('/')[3].split(':')[0];
    } catch (e) {
      model = getFallbackModelName(AiProviders.GOOGLE, url);
    }
  }
  return model;
}

async function tokenConfig(input: TokenInput) {
  const { reqBody, resBody, url } = input;
  let apiType = 'generateContent';
  if (url.indexOf('embedContent') > -1) {
    apiType = 'embedContent';
  }
  switch (apiType) {
    case 'embedContent': {
      const mappedInput = reqBody.content?.parts.map(
        (p: Record<string, any>) => p.text
      );
      if (reqBody.input) {
        if (Array.isArray(reqBody.input)) mappedInput.push(...reqBody.input);
        else {
          mappedInput.push(reqBody.input);
        }
      }
      let tokens = 0;
      mappedInput.forEach((i: string) => {
        tokens += palmTokenize(i).data.token_count;
      });
      return {
        reqUnits: tokens,
        resUnits: 0,
      };
    }

    default: {
      return {
        reqUnits: resBody.usage?.prompt_tokens || 0,
        resUnits: resBody.usage?.completion_tokens || 0,
      };
    }
  }
}

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    'gemini-pro': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000025,
          },
          response_token: {
            price: 0.00005,
          },
        },
      },
    },
    'gemini-pro-vision': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000025,
          },
          response_token: {
            price: 0.00005,
          },
        },
      },
    },
    'embedding-001': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0000025,
          },
          response_token: {
            price: 0,
          },
        },
      },
    },
    'gemini-1.5-flash-latest-gt-128k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00007,
          },
          response_token: {
            price: 0.00021,
          },
        },
      },
    },
    'gemini-1.5-flash-latest-lte-128k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000035,
          },
          response_token: {
            price: 0.000105,
          },
        },
      },
    },
    'gemini-1.5-flash-gt-128k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00007,
          },
          response_token: {
            price: 0.00021,
          },
        },
      },
    },
    'gemini-1.5-flash-lte-128k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000035,
          },
          response_token: {
            price: 0.000105,
          },
        },
      },
    },
    'gemini-1.5-pro-latest-gt-128k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0007,
          },
          response_token: {
            price: 0.0021,
          },
        },
      },
    },
    'gemini-1.5-pro-latest-lte-128k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00035,
          },
          response_token: {
            price: 0.00105,
          },
        },
      },
    },
    'gemini-1.5-pro-gt-128k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0007,
          },
          response_token: {
            price: 0.0021,
          },
        },
      },
    },
    'gemini-1.5-pro-lte-128k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00035,
          },
          response_token: {
            price: 0.00105,
          },
        },
      },
    },
  };

  const { model, reqUnits } = input;
  let config = modelPricingConfig[model];

  if (reqUnits && reqUnits > 128000 && modelPricingConfig[`${model}-gt-128k`]) {
    config = modelPricingConfig[`${model}-gt-128k`];
  }

  if (
    reqUnits &&
    reqUnits <= 128000 &&
    modelPricingConfig[`${model}-lte-128k`]
  ) {
    config = modelPricingConfig[`${model}-lte-128k`];
  }

  return config?.pricing_config;
}
