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

export const Ai21LogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.ai21.com/studio/v1';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  let model: string = getDefaultModelName(reqBody, resBody);
  if (!model) {
    const fallbackModel = getFallbackModelName(AiProviders.AI21, url);
    try {
      const ai21URL = new URL(url);
      model = ai21URL.pathname.split('/')[3];
      if (!model) {
        model = fallbackModel;
      }
    } catch (e) {
      model = fallbackModel;
    }
  }
  return model;
}

async function tokenConfig(input: TokenInput) {
  const { env, reqBody, resBody, url } = input;
  if (resBody.usage?.prompt_tokens && resBody.usage?.completion_tokens) {
    return {
      reqUnits: resBody.usage?.prompt_tokens,
      resUnits: resBody.usage?.completion_tokens,
    };
  }
  let apiType;

  if (url.endsWith('/chat')) {
    apiType = 'chat';
  } else if (url.endsWith('/complete')) {
    apiType = 'complete';
  } else if (url.endsWith('/embed')) {
    apiType = 'embed';
  }
  switch (apiType) {
    case 'chat': {
      const mappedInput = reqBody.messages.map((m: Record<string, any>) => ({
        role: m.role,
        content: m.text || m.content,
      }));
      const inputTokenizer = openaiTokenize(mappedInput, 'gpt-3.5-turbo');

      const mappedOutput = resBody.outputs
        ? resBody.outputs.map((o: Record<string, any>) => ({
            role: o.role,
            content: o.text,
          }))
        : resBody.choices.map((c: Record<string, any>) => ({
            role: c.role,
            content: c.content,
          }));
      const outputTokenizer = openaiTokenize(mappedOutput, 'gpt-3.5-turbo');

      return {
        reqUnits: inputTokenizer.data.units,
        resUnits: outputTokenizer.data.units,
      };
    }
    case 'proxy-embed': {
      const mappedInput = reqBody.texts;
      const inputTokenizer = openaiTokenize(
        mappedInput,
        'gpt-3.5-turbo-instruct'
      );

      return {
        reqUnits: inputTokenizer.data.units,
        resUnits: 0,
      };
    }
    case 'embed': {
      const mappedInput = Array.isArray(reqBody.texts)
        ? reqBody.texts
        : [reqBody.texts];
      const inputTokenizer = openaiTokenize(mappedInput, 'text-davinci-003');

      return {
        reqUnits: inputTokenizer.data.units,
        resUnits: 0,
      };
    }

    default: {
      return {
        reqUnits: 0,
        resUnits: 0,
      };
    }
  }
}

function priceConfig(input: PriceInput) {
  const modelPricingConfig: ModelPricingConfig = {
    'j2-light': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0003 },
          response_token: { price: 0.0003 },
        },
      },
    },
    'j2-mid': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.001 },
          response_token: { price: 0.001 },
        },
      },
    },
    'j2-ultra': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0015 },
          response_token: { price: 0.0015 },
        },
      },
    },
  };
  const { model, url } = input;
  const config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  return config?.pricing_config;
}
