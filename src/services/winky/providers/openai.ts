import { encode } from 'gpt-3-encoder';
import { TiktokenModel, encoding_for_model } from '@dqbd/tiktoken';
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

export const OpenAILogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.openai.com/v1';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  const model =
    getDefaultModelName(reqBody, resBody) ||
    getFallbackModelName(AiProviders.OPEN_AI, url);
  return model;
}

export async function tokenConfig(input: TokenInput) {
  const { env, model, reqBody, resBody, url } = input;
  let apiType: string = aiProviderUrlTypeMapping[url];
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

  // Only check for prompt tokens as open ai always sends completion tokens
  if (responseObj.reqUnits) {
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

const aiProviderUrlTypeMapping: Record<string, string> = {
  'https://api.openai.com/v1/completions': 'generate',
  'https://api.openai.com/v1/chat/completions': 'chat',
  'https://api.openai.com/v1/audio/speech': 'tts',
};

function getChatCompletionsTokenCount(
  input: Record<string, any>,
  model: string
) {
  let mappedModelName = model as TiktokenModel;
  if (model.startsWith('gpt-3.5-turbo-')) {
    mappedModelName = 'gpt-3.5-turbo';
  }

  if (model.startsWith('gpt-35-turbo')) {
    mappedModelName = 'gpt-3.5-turbo';
  }

  if (model.startsWith('gpt-4-32k-')) {
    mappedModelName = 'gpt-4-32k';
  }

  if (model.startsWith('gpt-4-')) {
    mappedModelName = 'gpt-4';
  }

  if (model.startsWith('gpt-4o')) {
    mappedModelName = 'gpt-4o';
  }

  const isGpt3 = mappedModelName === 'gpt-3.5-turbo';

  const encoder = encoding_for_model(mappedModelName, {
    '<|im_start|>': 100264,
    '<|im_end|>': 100265,
    '<|im_sep|>': 100266,
  });

  const msgSep = isGpt3 ? '\n' : '';
  const roleSep = isGpt3 ? '\n' : '<|im_sep|>';

  const serializedInput = [
    input
      .map(
        ({
          name,
          role,
          content,
        }: {
          name: string;
          role: string;
          content: any;
        }) => {
          if (typeof content === 'object' && content && content.length) {
            return `<|im_start|>${name || role}${roleSep}${content
              .map((c: any) => {
                if (c.type === 'text') {
                  return `${c.text}`;
                }
              })
              .join(' ')}<|im_end|>`;
          } else {
            return `<|im_start|>${name || role}${roleSep}${content}<|im_end|>`;
          }
        }
      )
      .join(msgSep),
    `<|im_start|>assistant${roleSep}`,
  ].join(msgSep);

  const inputTokens = encoder.encode(serializedInput, 'all').length;
  encoder.free();
  return {
    units: inputTokens,
  };
}

// eslint-disable-next-line no-unused-vars
function getCompletionsTokenCount(input: Array<string>) {
  let inputTokens = 0;

  for (const i of input) {
    inputTokens += encode(i).length;
  }

  return {
    units: inputTokens,
  };
}

export const getTokens = function (
  body: Array<string | Record<string, any>>,
  model: string
) {
  if (!body?.length) {
    return {
      units: 0,
    };
  }

  let mappedModel = model;
  let modelType;

  if (model.startsWith('text-')) {
    modelType = 'text';
  } else if (model.startsWith('gpt-')) {
    modelType = 'chat';
  } else if (typeof body[0] === 'string') {
    modelType = 'text';
    mappedModel = 'text-davinci-003';
  } else if (typeof body[0] === 'object') {
    modelType = 'chat';
    mappedModel = 'gpt-3.5-turbo';
  }

  let response = {
    units: 0,
  };

  switch (modelType) {
    case 'text': {
      response = getCompletionsTokenCount(body as string[]);
      break;
    }

    case 'chat': {
      response = getChatCompletionsTokenCount(body, model);
      break;
    }
    default:
      break;
  }

  return response;
};

export const openaiTokenize = (input: any, model: string) => {
  const tokens = getTokens(input, model);
  return {
    data: tokens,
  };
};

export const getOpenAIFineTuneModel = (model: string) => {
  const modelName = model.split(':')[1];
  return `ft:${modelName}`;
};

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    'text-embedding-ada-002': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00001 },
          response_token: { price: 0 },
        },
      },
    },
    'text-embedding-ada-002-v2': {
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
    'gpt-3.5-turbo-16k-0613': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0004 },
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
    'gpt-3.5-turbo-1106': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0001 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'gpt-3.5-turbo-0125': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00005 },
          response_token: { price: 0.00015 },
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
    'gpt-4-1106-vision-preview': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.001 },
          response_token: { price: 0.003 },
        },
      },
    },
    'gpt-4-vision-preview': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.001 },
          response_token: { price: 0.003 },
        },
      },
    },
    'gpt-4-turbo-preview': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.001 },
          response_token: { price: 0.003 },
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
    //start: fine-tuned models
    'ada:ft-springworks-2023-05-22-15-51-04': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00016 },
          response_token: { price: 0.00016 },
        },
      },
    },
    'ada:ft-bhanzu-2023-08-10-16-45-04': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00016 },
          response_token: { price: 0.00016 },
        },
      },
    },
    'ft:gpt-3.5-turbo-0613:turing-inc::7vqrkSfI': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'ft:gpt-3.5-turbo-0613:thena:request-detection:A8FEKxNay': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'ft:gpt-3.5-turbo-0613:portkey-inc::83dfQBwM': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'davinci:ft-thena-2023-05-19-10-41-18': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0012 },
          response_token: { price: 0.0012 },
        },
      },
    },
    'ft:gpt-3.5-turbo-1106:quizizz-teachers::8VnQZQL2': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'ft:gpt-3.5-turbo-1106:quizizz-teachers::8VnMD0GJ': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'ft:gpt-3.5-turbo-0613:bain-company::8DoMH3q9': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'ft:gpt-3.5-turbo-0613:bain-company::8Jkugu68': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'ft:gpt-3.5-turbo-1106:bain-company::8qjeraiE': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'ft:gpt-3.5-turbo': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'ft:gpt-3.5-turbo-0613': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'ft:gpt-3.5-turbo-1106': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'ft:gpt-3.5-turbo-0125': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'ft:gpt-3.5-turbo-0125:olvy:detect-feedback:91rJd1ye': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'ft:gpt-3.5-turbo-0613:barkibu::8LBigAb2': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    'ft:gpt-3.5-turbo-0613:barkibu::7ydnDTmw': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0006 },
        },
      },
    },
    //end: fine-tuned models
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
    'babbage-002': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00004 },
          response_token: { price: 0.00004 },
        },
      },
    },
    'davinci-002': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0002 },
          response_token: { price: 0.0002 },
        },
      },
    },
    'gpt-3.5-turbo-instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00015 },
          response_token: { price: 0.0002 },
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
    'dall-e-3': {
      pricing_config: {
        pay_as_you_go: {
          image: {
            default: {
              default: { price: 4 },
            },
            standard: {
              '1024x1024': { price: 4 },
              '1024x1792': { price: 8 },
              '1792x1024': { price: 8 },
            },
            hd: {
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
              '1024x1024': { price: 2 },
              '512x512': { price: 1.8 },
              '256x256': { price: 1.6 },
            },
          },
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
    'gpt-4o-2024-08-06': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00025 },
          response_token: { price: 0.001 },
        },
      },
    },
    'o1-preview': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0015 },
          response_token: { price: 0.006 },
        },
      },
    },
    'o1-preview-2024-09-12': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0015 },
          response_token: { price: 0.006 },
        },
      },
    },
    'o1-mini': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0012 },
        },
      },
    },
    'o1-mini-2024-09-12': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0012 },
        },
      },
    },
  };
  const { model, url } = input;
  let config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  if (!config && model.includes('ft')) {
    config = modelPricingConfig[getOpenAIFineTuneModel(model)];
  }
  return config?.pricing_config;
}
