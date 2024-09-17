import {
  AiProviders,
  LogConfig,
  ModelInput,
  ModelPricingConfig,
  PriceInput,
  TokenInput,
} from './config';
import { commonUrlPriceConfig, getFallbackModelName } from './commons';
import { logger } from '../../../apm';
import { openaiTokenize } from './openai';

export const AzureOpenAiLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return '';
}

export async function modelConfig(input: ModelInput) {
  const { apiKey, resBody, url, providerOptions } = input;
  let model: string = resBody.model;
  if (providerOptions.azureModelName) {
    model = providerOptions.azureModelName;
  }
  if (!model) {
    const fallbackModelName = getFallbackModelName(
      AiProviders.AZURE_OPEN_AI,
      url
    );
    try {
      const azureUrl = new URL(url);
      const endpoint = azureUrl.origin;
      const deploymentId = azureUrl.pathname.split('/')[3];
      const response = await fetch(
        `${endpoint}/openai/deployments/${deploymentId}?api-version=2022-12-01`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey || '',
          },
        }
      );
      const data = (await response.json()) as Record<string, any>;
      model = data.model || fallbackModelName;
    } catch (error: any) {
      logger.error({
        message: `ERROR_FINDING_MODEL: ${error.message}`,
      });
      model = fallbackModelName;
    }
  }
  return model;
}

async function tokenConfig(input: TokenInput) {
  const { env, model, reqBody, resBody, url } = input;
  let apiType;
  // Mapping to support azure models
  if (!apiType && url.indexOf('/chat/completions') > -1) {
    apiType = 'chat';
  } else if (!apiType && url.indexOf('/completions') > -1) {
    apiType = 'generate';
  } else if (!apiType && url.indexOf('/audio/speech') > -1) {
    apiType = 'tts';
  }
  const responseObj = {
    reqUnits: 0,
    resUnits: 0,
  };
  if (resBody.usage?.prompt_tokens) {
    responseObj.reqUnits = resBody.usage?.prompt_tokens;
  }
  if (resBody.usage?.completion_tokens) {
    responseObj.resUnits = resBody.usage?.completion_tokens;
  }
  if (responseObj.reqUnits && responseObj.resUnits) {
    return responseObj;
  }
  switch (apiType) {
    case 'generate': {
      const mappedInput =
        typeof reqBody.prompt === 'string' ? [reqBody.prompt] : reqBody.prompt;
      const tokenizer = openaiTokenize(mappedInput, model);
      return {
        reqUnits: tokenizer.data.units,
        resUnits: responseObj.resUnits,
      };
    }
    case 'chat': {
      const mappedInput = reqBody.messages;
      const tokenizer = openaiTokenize(mappedInput, model);
      return {
        reqUnits: tokenizer.data.units,
        resUnits: responseObj.resUnits,
      };
    }
    case 'tts': {
      const mappedInput = reqBody.input;
      const reqUnits = mappedInput.length;
      return {
        reqUnits,
        resUnits: 0,
      };
    }
    default: {
      return responseObj;
    }
  }
}

export const getAzureOpenAIFineTuneModel = (model: string) => {
  const modelName = model.split('.')[0];
  return `${modelName}.ft`;
};

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    'gpt-4-vision-preview': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.001 },
          response_token: { price: 0.003 },
        },
      },
    },
    'gpt-3.5-turbo-1106': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0001 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'text-embedding-ada-002': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00001 },
          response_token: { price: 0 },
        },
      },
    },
    'text-embedding-3-small': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000002 },
          response_token: { price: 0 },
        },
      },
    },
    'text-embedding-3-large': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000013 },
          response_token: { price: 0 },
        },
      },
    },
    'gpt-4-32k-0613': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.006 },
          response_token: { price: 0.012 },
        },
      },
    },
    'gpt-3.5-turbo-0613': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00015 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'text-moderation-stable': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0 },
          response_token: { price: 0 },
        },
      },
    },
    'text-moderation-latest': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0 },
          response_token: { price: 0 },
        },
      },
    },
    'text-moderation-001': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0 },
          response_token: { price: 0 },
        },
      },
    },
    'gpt-3.5-turbo-16k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0004 },
        },
      },
    },
    'gpt-35-turbo-16k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0004 },
        },
      },
    },
    'gpt-35-turbo-1106': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0001 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'gpt-4-1106-preview': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.001 },
          response_token: { price: 0.003 },
        },
      },
    },
    'gpt-4': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.003 },
          response_token: { price: 0.006 },
        },
      },
    },
    'gpt-4-0314': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.003 },
          response_token: { price: 0.006 },
        },
      },
    },
    'gpt-4-32k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.006 },
          response_token: { price: 0.012 },
        },
      },
    },
    'gpt-4-32k-0314': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.006 },
          response_token: { price: 0.012 },
        },
      },
    },
    'code-davinci-002': { pricing_config: null },
    'code-cushman-001': { pricing_config: null },
    'gpt-3.5-turbo-0301': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00015 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'gpt-3.5-turbo': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00015 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'gpt-35-turbo': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00015 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'text-moderation-004': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0 },
          response_token: { price: 0 },
        },
      },
    },
    'text-davinci-003': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.002 },
          response_token: { price: 0.002 },
        },
      },
    },
    'text-davinci-002': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.002 },
          response_token: { price: 0.002 },
        },
      },
    },
    'text-curie-001': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0002 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'text-babbage-001': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00005 },
          response_token: { price: 0.00005 },
        },
      },
    },
    'text-ada-001': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00004 },
          response_token: { price: 0.00004 },
        },
      },
    },
    'text-davinci-001': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.002 },
          response_token: { price: 0.002 },
        },
      },
    },
    'gpt-4-0613': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.003 },
          response_token: { price: 0.006 },
        },
      },
    },
    davinci: {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.002 },
          response_token: { price: 0.002 },
        },
      },
    },
    //start: fine-tuned models
    'gpt-35-turbo-0613.ft': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0004 },
        },
      },
    },
    'gpt-35-turbo-1106.ft': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0004 },
        },
      },
    },
    'gpt-35-turbo-0125.ft': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0004 },
        },
      },
    },
    ada: {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00001 },
          response_token: { price: 0 },
        },
      },
    },
    'gpt-4-turbo': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.001 },
          response_token: { price: 0.003 },
        },
      },
    },
    'gpt-4-turbo-2024-04-09': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.001 },
          response_token: { price: 0.003 },
        },
      },
    },
    'gpt-4o': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0005 },
          response_token: { price: 0.0015 },
        },
      },
    },
    'gpt-4o-2024-05-13': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0005 },
          response_token: { price: 0.0015 },
        },
      },
    },
    'gpt-4o-mini': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000015 },
          response_token: { price: 0.00006 },
        },
      },
    },
    'gpt-4o-mini-2024-07-18': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000015 },
          response_token: { price: 0.00006 },
        },
      },
    },
    'gpt-4-0125-preview': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.001 },
          response_token: { price: 0.003 },
        },
      },
    },
    'tts-1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0015 },
          response_token: { price: 0.0 },
        },
      },
    },
    'tts-1-hd': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.003 },
          response_token: { price: 0.0 },
        },
      },
    },
    tts: {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0015 },
          response_token: { price: 0.0 },
        },
      },
    },
    'tts-hd': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.003 },
          response_token: { price: 0.0 },
        },
      },
    },
    'dall-e-3': {
      pricing_config: {
        pay_as_you_go: {
          image: {
            default: {
              default: { price: 4 },
            },
            standard: {
              default: { price: 4 },
              '1024x1024': { price: 4 },
              '1024x1792': { price: 8 },
              '1792x1024': { price: 8 },
            },
            hd: {
              default: { price: 8 },
              '1024x1024': { price: 8 },
              '1024x1792': { price: 12 },
              '1792x1024': { price: 12 },
            },
          },
        },
      },
    },
    'dall-e-2': {
      pricing_config: {
        pay_as_you_go: {
          image: {
            default: {
              default: { price: 2 },
            },
            standard: {
              default: { price: 2 },
              '1024x1024': { price: 2 },
              '512x512': { price: 1.8 },
              '256x256': { price: 1.6 },
            },
          },
        },
      },
    },
  };
  const { model, url } = input;
  let config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  if (!config && model.includes('ft')) {
    config = modelPricingConfig[getAzureOpenAIFineTuneModel(model)];
  }
  return config?.pricing_config;
}
