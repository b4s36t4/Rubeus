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
import { openaiTokenize } from './openai';

export const MistralAiLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.mistral.ai/v1';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  const model =
    getDefaultModelName(reqBody, resBody) ||
    getFallbackModelName(AiProviders.MISTRAL_AI, url);
  return model;
}

async function tokenConfig(input: TokenInput) {
  const { env, reqBody, resBody, url } = input;
  const responseObj = {
    reqUnits: 0,
    resUnits: 0,
  };

  if (resBody.usage?.prompt_tokens) {
    responseObj.reqUnits = resBody.usage?.prompt_tokens;
  }

  // embeddings only has prompt_tokens
  if (responseObj.reqUnits && url.endsWith('/embeddings')) {
    return responseObj;
  }

  if (resBody.usage?.completion_tokens) {
    responseObj.resUnits = resBody.usage?.completion_tokens;
  }

  // Mistral either sends both token counts or none.
  // If both are present then return. Else calculate using openAI tokenizer
  if (responseObj.reqUnits && responseObj.resUnits) {
    return responseObj;
  }

  const mappedInput = reqBody.messages;
  const inputTokenizer = openaiTokenize(mappedInput, 'gpt-3.5-turbo');

  const mappedOutput = resBody.choices.map(
    (c: Record<string, any>) => c.message
  );
  const outputTokenizer = openaiTokenize(mappedOutput, 'gpt-3.5-turbo');
  return {
    reqUnits: inputTokenizer.data.units,
    resUnits: outputTokenizer.data.units,
  };
}

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    'mistral-tiny': {
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
    'mistral-small': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00007,
          },
          response_token: {
            price: 0.00007,
          },
        },
      },
    },
    'mistral-medium': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00027,
          },
          response_token: {
            price: 0.00081,
          },
        },
      },
    },
    'mistral-embed': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00001,
          },
          response_token: {
            price: 0,
          },
        },
      },
    },
    'open-mistral-7b': {
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
    'open-mixtral-8x7b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00007,
          },
          response_token: {
            price: 0.00007,
          },
        },
      },
    },
    'open-mixtral-8x22b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0002,
          },
          response_token: {
            price: 0.0006,
          },
        },
      },
    },
    'mistral-small-latest': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0001,
          },
          response_token: {
            price: 0.0003,
          },
        },
      },
    },
    'mistral-medium-latest': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00027,
          },
          response_token: {
            price: 0.00081,
          },
        },
      },
    },
    'mistral-large-latest': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0004,
          },
          response_token: {
            price: 0.0012,
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
