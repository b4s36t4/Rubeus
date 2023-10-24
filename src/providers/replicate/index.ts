import { ProviderConfigs } from "../types";
import ReplicateAPIConfig from "./api";
import {
  ReplicateCompleteConfig,
  ReplicateResponseTransform,
  ReplicateCompleteChunkTransform,
} from "./complete";

const ReplicateAIConfig: ProviderConfigs = {
  api: ReplicateAPIConfig,
  complete: ReplicateCompleteConfig,
  response: {
    complete: ReplicateResponseTransform,
    "stream-complete": ReplicateCompleteChunkTransform,
    chatComplete: ReplicateResponseTransform,
    "stream-chatComplete": ReplicateCompleteChunkTransform,
  },
};

export default ReplicateAIConfig;
