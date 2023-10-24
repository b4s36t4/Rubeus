import { ProviderConfigs } from "../types";
import MistraAPIConfig from "./api";
import {
  MistraChatCompleteResponseTransform,
  MistraLiteChatCompleteConfig,
} from "./chatComplete";
import {
  MistraCompleteResponseTransform,
  MistraLiteCompleteConfig,
} from "./complete";

const MistraConfig: ProviderConfigs = {
  complete: MistraLiteCompleteConfig,
  chatComplete: MistraLiteChatCompleteConfig,
  api: MistraAPIConfig,
  responseTransforms: {
    chatComplete: MistraChatCompleteResponseTransform,
    complete: MistraCompleteResponseTransform,
  },
};

export default MistraConfig;
