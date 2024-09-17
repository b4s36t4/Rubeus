import { AiProviders, ModelPricingConfig } from './config';

export const aiProviderUrlModelMapping: Record<string, string> = {
  'https://api.cohere.ai/v1/generate': 'command',
  'https://api.cohere.ai/v1/embed': 'embed-english-v2.0',
  'https://api.cohere.ai/v1/classify': 'embed-english-v2.0',
  'https://api.cohere.ai/v1/summarize': 'summarize-xlarge',
  'https://api.cohere.ai/v1/tokenize': 'co-tokenize',
  'https://api.cohere.ai/v1/detokenize': 'co-detokenize',
  'https://api.cohere.ai/v1/detect-language': 'co-detect-language',
  'https://generativelanguage.googleapis.com/v1beta3/models/text-bison-001:generateText':
    'models/text-bison-001',
  'https://generativelanguage.googleapis.com/v1beta3/models/chat-bison-001:generateMessage':
    'models/chat-bison-001',
};

export function getFallbackModelName(provider: AiProviders, url: string) {
  return `${provider}/${new URL(url).pathname.split('/').pop()}`;
}

export function getDefaultModelName(
  reqBody: Record<string, any>,
  resBody: Record<string, any>
) {
  return reqBody.model || resBody.model;
}

export function commonUrlPriceConfig(): {
  [url: string]: ModelPricingConfig;
} {
  return {
    'https://api.cohere.ai/v1/classify': {
      'embed-multilingual-v2.0': {
        pricing_config: {
          pay_as_you_go: {
            request_token: { price: 0.005 },
            response_token: { price: 0 },
          },
        },
      },
      'embed-english-light-v2.0': {
        pricing_config: {
          pay_as_you_go: {
            request_token: { price: 0.005 },
            response_token: { price: 0 },
          },
        },
      },
      'embed-english-v2.0': {
        pricing_config: {
          pay_as_you_go: {
            request_token: { price: 0.005 },
            response_token: { price: 0 },
          },
        },
      },
    },
    'https://api.cohere.ai/v1/embed': {
      'embed-multilingual-v2.0': {
        pricing_config: {
          pay_as_you_go: {
            request_token: { price: 0.00001 },
            response_token: { price: 0 },
          },
        },
      },
      'embed-english-light-v2.0': {
        pricing_config: {
          pay_as_you_go: {
            request_token: { price: 0.00001 },
            response_token: { price: 0 },
          },
        },
      },
      'embed-english-v2.0': {
        pricing_config: {
          pay_as_you_go: {
            request_token: { price: 0.00001 },
            response_token: { price: 0 },
          },
        },
      },
    },
  };
}
