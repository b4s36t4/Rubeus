import { getDefaultModelName, getFallbackModelName } from './commons';
import { AiProviders, LogConfig, ModelInput } from './config';

export const SegmindLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.segmind.com/v1';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  let model = getDefaultModelName(reqBody, resBody);
  if (!model) {
    const fallbackModelName = getFallbackModelName(AiProviders.SEGMIND, url);
    try {
      const segmindURL = new URL(url);
      model = segmindURL.pathname.split('/')[2];
      if (!model) {
        model = fallbackModelName;
      }
    } catch (e) {
      model = fallbackModelName;
    }
  }
  return model;
}

function tokenConfig() {
  return { reqUnits: 0, resUnits: 0 };
}

function priceConfig() {
  return null;
}
