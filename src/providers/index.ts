import AnthropicConfig from "./anthropic";
import AnyscaleConfig from "./anyscale";
import AzureOpenAIConfig from "./azure-openai";
import CohereConfig from "./cohere";
import MistraConfig from "./mistralite";
import OpenAIConfig from "./openai";
import { ProviderConfigs } from "./types";

const Providers: { [key: string]: ProviderConfigs } = {
  openai: OpenAIConfig,
  cohere: CohereConfig,
  anthropic: AnthropicConfig,
  "azure-openai": AzureOpenAIConfig,
  anyscale: AnyscaleConfig,
  mistra: MistraConfig,
};

export default Providers;
