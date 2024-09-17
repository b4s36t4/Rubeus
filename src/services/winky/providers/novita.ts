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

export const NovitaLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.novita.ai/v3/openai';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  const model =
    getDefaultModelName(reqBody, resBody) ||
    getFallbackModelName(AiProviders.NOVITA_AI, url);
  return model;
}

async function tokenConfig(input: TokenInput) {
  const { env, reqBody, resBody, url } = input;

  let apiType: string = '';

  if (url.indexOf('/chat/completions') > -1) {
    apiType = 'chatComplete';
  } else if (url.indexOf('/completions') > -1) {
    apiType = 'complete';
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
    case 'chatComplete':
      const messageTokenizer = openaiTokenize(
        reqBody.messages,
        'gpt-3.5-turbo'
      );

      const mappedMessages = resBody.choices.map(
        (c: Record<string, any>) => c.message
      );

      const messageOutputTokenizer = openaiTokenize(
        mappedMessages,
        'gpt-3.5-turbo'
      );

      responseObj.reqUnits = messageTokenizer.data.units;
      responseObj.resUnits = messageOutputTokenizer.data.units;

      break;

    case 'complete':
      const mappedPrompt =
        typeof reqBody.prompt === 'string' ? [reqBody.prompt] : reqBody.prompt;
      const promptTokenizer = openaiTokenize(mappedPrompt, 'text-davinci-003');

      const mappedPromptOutput = resBody.choices.map(
        (p: Record<string, any>) => p.text
      );

      const mappedPromptOutputTokenizer = openaiTokenize(
        mappedPromptOutput,
        'text-davinci-003'
      );

      responseObj.reqUnits = promptTokenizer.data.units;
      responseObj.resUnits = mappedPromptOutputTokenizer.data.units;

      break;

    default:
      responseObj.reqUnits = 0;
      responseObj.resUnits = 0;
  }

  return responseObj;
}

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    'meta-llama/llama-3-8b-instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00001,
          },
          response_token: {
            price: 0.00001,
          },
        },
      },
    },
    'nousresearch/nous-hermes-llama2-13b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000026,
          },
          response_token: {
            price: 0.000026,
          },
        },
      },
    },
    'gryphe/mythomax-l2-13b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000019,
          },
          response_token: {
            price: 0.000019,
          },
        },
      },
    },
    'Nous-Hermes-2-Mixtral-8x7B-DPO': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000027,
          },
          response_token: {
            price: 0.000027,
          },
        },
      },
    },
    lzlv_70b: {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00007,
          },
          response_token: {
            price: 0.00008,
          },
        },
      },
    },
    'meta-llama/llama-3-70b-instruct': {
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
    'teknium/openhermes-2.5-mistral-7b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000017,
          },
          response_token: {
            price: 0.000017,
          },
        },
      },
    },
    'microsoft/wizardlm-2-8x22b': {
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
