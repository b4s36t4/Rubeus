import { getDefaultModelName, getFallbackModelName } from './commons';
import {
  AiProviders,
  LogConfig,
  ModelInput,
  PriceInput,
  PricingConfig,
  TokenInput,
} from './config';
import { tokenConfig as openAiTokenConfig } from './openai';

export const OpenrouterLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://openrouter.ai/api';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  const model =
    getDefaultModelName(reqBody, resBody) ||
    getFallbackModelName(AiProviders.OPENROUTER, url);
  return model;
}

function tokenConfig(input: TokenInput) {
  input.model = 'gpt-3.5-turbo';
  return openAiTokenConfig(input);
}

async function priceConfig(input: PriceInput): Promise<PricingConfig | null> {
  let openrouterModelConfig = null;

  try {
    const openrouterModelConfigResponse = await fetch(
      'https://openrouter.ai/api/v1/models'
    );
    if (!openrouterModelConfigResponse.ok) return null;

    openrouterModelConfig =
      await openrouterModelConfigResponse.json<Record<string, any>>();
  } catch (e) {
    return null;
  }

  const modelConfig = openrouterModelConfig.data.filter(
    (c: Record<string, any>) => c.id === input.model
  )[0];

  if (!modelConfig) return null;

  let promptTokenPricing = 0;
  let completionTokenPricing = 0;

  if (modelConfig.pricing?.prompt && modelConfig.pricing?.prompt !== -1) {
    promptTokenPricing = modelConfig.pricing?.prompt * 100;
  }

  if (
    modelConfig.pricing?.completion &&
    modelConfig.pricing?.completion !== -1
  ) {
    completionTokenPricing = modelConfig.pricing?.completion * 100;
  }

  const pricingConfig = {
    pay_as_you_go: {
      request_token: {
        price: promptTokenPricing,
      },
      response_token: {
        price: completionTokenPricing,
      },
    },
  };

  return pricingConfig;
}
