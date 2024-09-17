import {
  AiProviders,
  LogConfig,
  ModelInput,
  ModelPricingConfig,
  PriceInput,
  TokenInput,
  Tokens,
} from './config';
import {
  commonUrlPriceConfig,
  getDefaultModelName,
  getFallbackModelName,
} from './commons';
import { openaiTokenize } from './openai';

export const AnthropicLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.anthropic.com/v1';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  const model =
    getDefaultModelName(reqBody, resBody) ||
    getFallbackModelName(AiProviders.ANTHROPIC, url);
  return model;
}

async function tokenConfig(input: TokenInput): Promise<Tokens> {
  const { env, reqBody, resBody, url } = input;

  if (resBody.usage?.prompt_tokens && resBody.usage?.completion_tokens) {
    return {
      reqUnits:
        resBody.usage?.prompt_tokens +
        (resBody.usage?.cache_creation_input_tokens ?? 0) +
        (resBody.usage?.cache_read_input_tokens ?? 0),
      resUnits: resBody.usage?.completion_tokens,
      cacheReadInputUnits: resBody.usage?.cache_read_input_tokens,
      cacheWriteInputUnits: resBody.usage?.cache_creation_input_tokens,
    };
  }

  let apiType = '';
  if (url.indexOf('messages') > -1) {
    apiType = 'messages';
  } else if (url.indexOf('complete') > -1) {
    apiType = 'complete';
  }

  switch (apiType) {
    case 'complete': {
      const prompt =
        typeof reqBody.prompt === 'string' ? [reqBody.prompt] : reqBody.prompt;
      const promptTokenizer = openaiTokenize(prompt, 'text-davinci-003');

      let completion = resBody.completion;
      if (resBody.choices && resBody.choices[0]?.text) {
        completion = resBody.choices[0].text;
      }
      const completionTokenizer = openaiTokenize(
        [completion],
        'text-davinci-003'
      );
      return {
        reqUnits: promptTokenizer.data.units,
        resUnits: completionTokenizer.data.units,
      };
    }

    case 'messages': {
      const inputMessages = [...reqBody.messages];
      if (reqBody.system) {
        inputMessages.push({
          role: 'system',
          content: reqBody.system,
        });
      }

      const inputMessagesTokenizer = openaiTokenize(
        inputMessages,
        'gpt-3.5-turbo'
      );

      let outputMessages;
      if (resBody.choices && resBody.choices[0]?.message) {
        outputMessages = [resBody.choices[0].message];
      } else {
        outputMessages = [
          {
            role: 'assistant',
            content: resBody.content[0].text,
          },
        ];
      }

      const chatTokenizer = openaiTokenize(outputMessages, 'gpt-3.5-turbo');
      return {
        reqUnits: inputMessagesTokenizer.data.units,
        resUnits: chatTokenizer.data.units,
      };
    }

    default:
      return {
        reqUnits: 0,
        resUnits: 0,
      };
  }
}

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    'claude-1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.001102,
          },
          response_token: {
            price: 0.003268,
          },
        },
      },
    },
    'claude-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.001102,
          },
          response_token: {
            price: 0.003268,
          },
        },
      },
    },
    'claude-1-100k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.001102,
          },
          response_token: {
            price: 0.003268,
          },
        },
      },
    },
    'claude-1.3': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.001102,
          },
          response_token: {
            price: 0.003268,
          },
        },
      },
    },
    'claude-1.3-100k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.001102,
          },
          response_token: {
            price: 0.003268,
          },
        },
      },
    },
    'claude-1.2': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.001102,
          },
          response_token: {
            price: 0.003268,
          },
        },
      },
    },
    'claude-1.0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.001102,
          },
          response_token: {
            price: 0.003268,
          },
        },
      },
    },
    'claude-2': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0008,
          },
          response_token: {
            price: 0.0024,
          },
        },
      },
    },
    'claude-2.0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0008,
          },
          response_token: {
            price: 0.0024,
          },
        },
      },
    },
    'claude-2.1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0008,
          },
          response_token: {
            price: 0.0024,
          },
        },
      },
    },
    'claude-instant-1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00008,
          },
          response_token: {
            price: 0.00024,
          },
        },
      },
    },
    'claude-instant-1-100k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00008,
          },
          response_token: {
            price: 0.00024,
          },
        },
      },
    },
    'claude-instant-1.1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00008,
          },
          response_token: {
            price: 0.00024,
          },
        },
      },
    },
    'claude-instant-1.1-100k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00008,
          },
          response_token: {
            price: 0.00024,
          },
        },
      },
    },
    'claude-instant-1.0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00008,
          },
          response_token: {
            price: 0.00024,
          },
        },
      },
    },
    'claude-instant-1.2': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.00008,
          },
          response_token: {
            price: 0.00024,
          },
        },
      },
    },
    'claude-3-opus-20240229': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0015,
          },
          response_token: {
            price: 0.0075,
          },
          cache_write_input_token: {
            price: 0.001875,
          },
          cache_read_input_token: {
            price: 0.00015,
          },
        },
      },
    },
    'claude-3-sonnet-20240229': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0003,
          },
          response_token: {
            price: 0.0015,
          },
        },
      },
    },
    'claude-3-haiku-20240307': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.000025,
          },
          response_token: {
            price: 0.000125,
          },
          cache_write_input_token: {
            price: 0.00003,
          },
          cache_read_input_token: {
            price: 0.000003,
          },
        },
      },
    },
    'claude-3-5-sonnet-20240620': {
      pricing_config: {
        pay_as_you_go: {
          request_token: {
            price: 0.0003,
          },
          response_token: {
            price: 0.0015,
          },
          cache_write_input_token: {
            price: 0.000375,
          },
          cache_read_input_token: {
            price: 0.00003,
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
