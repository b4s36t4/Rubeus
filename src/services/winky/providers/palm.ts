import {
  aiProviderUrlModelMapping,
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

export const PalmLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://generativelanguage.googleapis.com/v1beta3';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  let model = getDefaultModelName(reqBody, resBody);
  if (!model) {
    const pathName = `https://${new URL(url).host}${new URL(url).pathname}`;
    model =
      aiProviderUrlModelMapping[pathName] ||
      getFallbackModelName(AiProviders.PALM, url);
  }
  return model;
}

async function tokenConfig(input: TokenInput) {
  const { reqBody, resBody, url } = input;
  const apiType = getApiType(url);
  switch (apiType) {
    case 'text': {
      let generations;

      if (resBody.candidates && resBody.candidates[0]?.output) {
        generations = resBody.candidates.map(
          (c: Record<string, any>) => c.output
        );
      }
      if (resBody.choices) {
        generations = resBody.choices.map((c: Record<string, any>) => c.text);
      }
      const tokens = getPalmTextTokens(reqBody.prompt?.text, generations);
      return tokens;
    }
    case 'message': {
      let generations;
      if (resBody?.candidates) {
        generations = resBody.candidates.map(
          (c: Record<string, any>) => c.content
        );
      }
      if (resBody?.choices) {
        generations = resBody.choices.map(
          (c: Record<string, any>) => c.message?.content
        );
      }
      const promptMessages = reqBody.prompt?.messages.map(
        (c: Record<string, any>) => c.content
      );
      const tokens = getPalmChatTokens(promptMessages, generations);
      return tokens;
    }
    default: {
      return {
        resUnits: 0,
        reqUnits: 0,
      };
    }
  }
}

export const palmTokenize = (promptString: string) => {
  return {
    status: 200,
    data: {
      token_count: promptString.split(' ').join('').length,
    },
  };
};

export const getPalmTextTokens = (
  prompt: string,
  completions: Record<string, any>[]
) => {
  const promptTokenizer = palmTokenize(prompt);
  const completetions_string = completions.join(' ');
  const completionsTokenizer = palmTokenize(completetions_string);
  return {
    reqUnits: promptTokenizer.data.token_count,
    resUnits: completionsTokenizer.data.token_count,
  };
};

export const getPalmChatTokens = (
  messages: string[],
  chatCompletions: string[]
) => {
  const promptTokenizer = palmTokenize(messages.join(' '));
  const completetions_string = chatCompletions.join(' ');
  const chatCompletionsTokenizer = palmTokenize(completetions_string);
  return {
    reqUnits: promptTokenizer.data.token_count,
    resUnits: chatCompletionsTokenizer.data.token_count,
  };
};

const getApiType = (url: string) => {
  if (url.indexOf('generateText') > -1) {
    return 'text';
  }

  if (url.indexOf('generateMessage') > -1) {
    return 'message';
  }
  return '';
};

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    'models/text-bison-001': {
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
    'models/chat-bison-001': {
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
  };
  const { model, url } = input;
  const config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  return config?.pricing_config;
}
