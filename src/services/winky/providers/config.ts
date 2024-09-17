import { Ai21LogConfig } from './ai21';
import { AnthropicLogConfig } from './anthropic';
import { AnyscaleLogConfig } from './anyscale';
import { AzureOpenAiLogConfig } from './azureOpenAi';
import { BedrockLogConfig } from './bedrock';
import { CohereLogConfig } from './cohere';
import { GoogleLogConfig } from './google';
import { GroqLogConfig } from './groq';
import { JinaLogConfig } from './jina';
import { MistralAiLogConfig } from './mistralAi';
import { NomicLogConfig } from './nomic';
import { OpenAILogConfig } from './openai';
import { PalmLogConfig } from './palm';
import { PerplexityAiLogConfig } from './perplexityAi';
import { SegmindLogConfig } from './segmind';
import { StabilityAiLogConfig } from './stabilityAi';
import { TogetherAiLogConfig } from './togetherAi';
import { FireworksAiLogConfig } from './fireworksAi';
import { DefaultLogConfig } from './default';
import { VertexAILogConfig } from './vertexAi';
import { NovitaLogConfig } from './novita';
import { OpenrouterLogConfig } from './openrouter';
import { RekaLogConfig } from './reka';
import { MonsterAPILogConfig } from './monsterapi';
import { PredibaseLogConfig } from './predibase';
import { deepbricksConfig } from './deepbricks';
import { cerebrasAIConfig } from './cerebras';

export type Tokens = {
  reqUnits: number;
  resUnits: number;
  cacheWriteInputUnits?: number;
  cacheReadInputUnits?: number;
};

export type GenerationCost = {
  requestCost: number;
  responseCost: number;
  currency: string;
};

export type ModelPricingConfig = {
  [model: string]: {
    pricing_config: PricingConfig | null;
  };
};

export type PricingConfig = {
  pay_as_you_go: {
    request_token?: {
      price: number;
    };
    response_token?: {
      price: number;
    };
    cache_write_input_token?: {
      price: number;
    };
    cache_read_input_token?: {
      price: number;
    };
    image?: any;
  };
  fixed_cost?: {
    request: {
      price: number;
    };
    response: {
      price: number;
    };
  };
  currency?: string;
};

export type ModelInput = {
  env: Record<string, any>;
  url: string;
  apiKey: string;
  reqBody: Record<string, any>;
  resBody: Record<string, any>;
  providerOptions: Record<string, any>;
};

export type TokenInput = {
  env: Record<string, any>;
  url: string;
  reqBody: Record<string, any>;
  resBody: Record<string, any>;
  model: string;
};

export type PriceInput = {
  model: string;
  url: string;
  reqUnits: number;
  resUnits: number;
  requestBody?: Record<string, any>;
};
export interface LogConfig {
  /** The configuration for each provider, indexed by provider name. */
  getBaseURL: () => string;
  modelConfig: (input: ModelInput) => string | Promise<string>;
  tokenConfig: (input: TokenInput) => Tokens | Promise<Tokens>;
  priceConfig: (
    input: PriceInput
  ) => PricingConfig | null | Promise<PricingConfig | null>;
}

export enum AiProviders {
  DEFAULT = 'default',
  OPEN_AI = 'openai',
  COHERE = 'cohere',
  AZURE_OPEN_AI = 'azure-openai',
  ANTHROPIC = 'anthropic',
  ANYSCALE = 'anyscale',
  PALM = 'palm',
  TOGETHER_AI = 'together-ai',
  GOOGLE = 'google',
  PERPLEXITY_AI = 'perplexity-ai',
  MISTRAL_AI = 'mistral-ai',
  //  DEEPINFRA= 'deepinfra',
  STABILITY_AI = 'stability-ai',
  NOMIC = 'nomic',
  //  OLLAMA= 'ollama',
  AI21 = 'ai21',
  BEDROCK = 'bedrock',
  GROQ = 'groq',
  SEGMIND = 'segmind',
  JINA = 'jina',
  FIREWORKS_AI = 'fireworks-ai',
  VERTEX_AI = 'vertex-ai',
  NOVITA_AI = 'novita-ai',
  OPENROUTER = 'openrouter',
  REKA = 'reka-ai',
  MONSTER_API = 'monsterapi',
  PREDIBASE = 'predibase',
  DEEPBRICKS = 'deepbricks',
  CEREBRAS = 'cerebras',
}

export const ProviderLogConfigs: { [key: string]: LogConfig } = {
  [AiProviders.DEFAULT]: DefaultLogConfig,
  [AiProviders.OPEN_AI]: OpenAILogConfig,
  [AiProviders.COHERE]: CohereLogConfig,
  [AiProviders.AZURE_OPEN_AI]: AzureOpenAiLogConfig,
  [AiProviders.ANTHROPIC]: AnthropicLogConfig,
  [AiProviders.ANYSCALE]: AnyscaleLogConfig,
  [AiProviders.PALM]: PalmLogConfig,
  [AiProviders.TOGETHER_AI]: TogetherAiLogConfig,
  [AiProviders.GOOGLE]: GoogleLogConfig,
  [AiProviders.PERPLEXITY_AI]: PerplexityAiLogConfig,
  [AiProviders.MISTRAL_AI]: MistralAiLogConfig,
  // export const DEEPINFRA= 'deepinfra';
  [AiProviders.STABILITY_AI]: StabilityAiLogConfig,
  [AiProviders.NOMIC]: NomicLogConfig,
  // export const OLLAMA= 'ollama';
  [AiProviders.AI21]: Ai21LogConfig,
  [AiProviders.BEDROCK]: BedrockLogConfig,
  [AiProviders.GROQ]: GroqLogConfig,
  [AiProviders.SEGMIND]: SegmindLogConfig,
  [AiProviders.JINA]: JinaLogConfig,
  [AiProviders.FIREWORKS_AI]: FireworksAiLogConfig,
  [AiProviders.VERTEX_AI]: VertexAILogConfig,
  [AiProviders.NOVITA_AI]: NovitaLogConfig,
  [AiProviders.OPENROUTER]: OpenrouterLogConfig,
  [AiProviders.REKA]: RekaLogConfig,
  [AiProviders.MONSTER_API]: MonsterAPILogConfig,
  [AiProviders.PREDIBASE]: PredibaseLogConfig,
  [AiProviders.DEEPBRICKS]: deepbricksConfig,
  [AiProviders.CEREBRAS]: cerebrasAIConfig,
};
