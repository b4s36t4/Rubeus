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

export const TogetherAiLogConfig: LogConfig = {
  getBaseURL: getBaseURL,
  modelConfig: modelConfig,
  tokenConfig: tokenConfig,
  priceConfig: priceConfig,
};

function getBaseURL() {
  return 'https://api.together.xyz';
}

function modelConfig(input: ModelInput) {
  const { reqBody, resBody, url } = input;
  const model =
    getDefaultModelName(reqBody, resBody) ||
    getFallbackModelName(AiProviders.TOGETHER_AI, url);
  return model;
}

async function tokenConfig(input: TokenInput) {
  const { env, reqBody, resBody, url } = input;
  let apiType = '';
  if (url.indexOf('/chat/completions') > -1) {
    apiType = 'chat';
  } else if (url.indexOf('/completions') > -1) {
    apiType = 'generate';
  } else if (url.indexOf('/inference') > -1) {
    apiType = 'inference';
  } else if (url.indexOf('/embeddings') > -1) {
    apiType = 'embeddings';
  }
  switch (apiType) {
    case 'generate': {
      let inputTokens;
      if (resBody.usage?.prompt_tokens) {
        inputTokens = resBody.usage?.prompt_tokens;
      } else {
        const mappedInput =
          typeof reqBody.prompt === 'string'
            ? [reqBody.prompt]
            : reqBody.prompt;
        inputTokens = openaiTokenize(mappedInput, 'text-davinci-003').data
          .units;
      }
      let outputTokens;
      if (resBody.usage?.completion_tokens) {
        outputTokens = resBody.usage?.completion_tokens;
      } else {
        const output = resBody.choices.map((c: Record<string, any>) => c.text);
        outputTokens = openaiTokenize(output, 'text-davinci-003').data.units;
      }
      return {
        reqUnits: inputTokens,
        resUnits: outputTokens,
      };
    }
    case 'chat': {
      let inputTokens;
      if (resBody.usage?.prompt_tokens) {
        inputTokens = resBody.usage?.prompt_tokens;
      } else {
        const mappedInput = reqBody.messages;
        inputTokens = openaiTokenize(mappedInput, 'gpt-3.5-turbo').data.units;
      }
      let outputTokens;
      if (resBody.usage?.completion_tokens) {
        outputTokens = resBody.usage?.completion_tokens;
      } else {
        const output = resBody.choices.map(
          (c: Record<string, any>) => c.message
        );
        outputTokens = openaiTokenize(output, 'gpt-3.5-turbo').data.units;
      }
      return {
        reqUnits: inputTokens,
        resUnits: outputTokens,
      };
    }
    case 'inference': {
      const mappedInput =
        typeof reqBody.prompt === 'string' ? [reqBody.prompt] : reqBody.prompt;
      const tokenizer = openaiTokenize(mappedInput, 'text-davinci-003');
      const output = resBody.output.choices.map(
        (p: Record<string, any>) => p.text
      );
      const outputTokenizer = openaiTokenize(output, 'text-davinci-003');
      return {
        reqUnits: tokenizer.data.units,
        resUnits: outputTokenizer.data.units,
      };
    }
    case 'embeddings': {
      const mappedInput =
        typeof reqBody.input === 'string' ? [reqBody.input] : reqBody.input;
      const tokenizer = openaiTokenize(mappedInput, 'text-davinci-003');
      return {
        reqUnits: tokenizer.data.units,
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
    'mistralai/Mistral-7B-Instruct-v0.2': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'mistralai/Mixtral-8x7B-Instruct-v0.1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00006 },
          response_token: { price: 0.00006 },
        },
      },
    },
    'mistralai/Mixtral-8x7B-v0.1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00006 },
          response_token: { price: 0.00006 },
        },
      },
    },
    'openchat/openchat-3.5-1210': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/StripedHyena-Nous-7B': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/StripedHyena-Hessian-7B': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'DiscoResearch/DiscoLM-mixtral-8x7b-v2': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00006 },
          response_token: { price: 0.00006 },
        },
      },
    },
    'Meta-Llama/Llama-Guard-7b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'zero-one-ai/Yi-34B-Chat': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.00008 },
        },
      },
    },
    'zero-one-ai/Yi-34B': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.00008 },
        },
      },
    },
    'zero-one-ai/Yi-6B': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000014 },
          response_token: { price: 0.000014 },
        },
      },
    },
    'Nexusflow/NexusRaven-V2-13B': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00003 },
          response_token: { price: 0.00003 },
        },
      },
    },
    'NousResearch/Nous-Capybara-7B-V1p9': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'teknium/OpenHermes-2p5-Mistral-7B': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/llama-2-70b-chat': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00009 },
          response_token: { price: 0.00009 },
        },
      },
    },
    'togethercomputer/llama-2-13b-chat': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000022 },
          response_token: { price: 0.000022 },
        },
      },
    },
    'togethercomputer/llama-2-7b-chat': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'NousResearch/Nous-Hermes-Llama2-13b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00003 },
          response_token: { price: 0.00003 },
        },
      },
    },
    'NousResearch/Nous-Hermes-llama-2-7b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'Open-Orca/Mistral-7B-OpenOrca': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'teknium/OpenHermes-2-Mistral-7B': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'WizardLM/WizardLM-13B-V1.2': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'WizardLM/WizardCoder-Python-34B-V1.0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.00008 },
        },
      },
    },
    'togethercomputer/LLaMA-2-7B-32K': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/CodeLlama-34b-Instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.00008 },
        },
      },
    },
    'togethercomputer/CodeLlama-34b-Python': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.00008 },
        },
      },
    },
    'EleutherAI/llemma_7b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'lmsys/vicuna-13b-v1.5-16k': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00003 },
          response_token: { price: 0.00003 },
        },
      },
    },
    'lmsys/vicuna-13b-v1.5': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00003 },
          response_token: { price: 0.00003 },
        },
      },
    },
    'Phind/Phind-CodeLlama-34B-Python-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.00008 },
        },
      },
    },
    'Phind/Phind-CodeLlama-34B-v2': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.00008 },
        },
      },
    },
    'togethercomputer/CodeLlama-13b-Instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000022 },
          response_token: { price: 0.000022 },
        },
      },
    },
    'togethercomputer/CodeLlama-7b-Instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/CodeLlama-13b-Python': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000022 },
          response_token: { price: 0.000022 },
        },
      },
    },
    'togethercomputer/CodeLlama-7b-Python': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/CodeLlama-34b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.00008 },
        },
      },
    },
    'togethercomputer/CodeLlama-13b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000022 },
          response_token: { price: 0.000022 },
        },
      },
    },
    'togethercomputer/CodeLlama-7b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/llama-2-70b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00009 },
          response_token: { price: 0.00009 },
        },
      },
    },
    'togethercomputer/llama-2-13b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000022 },
          response_token: { price: 0.000022 },
        },
      },
    },
    'togethercomputer/llama-2-7b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'Austism/chronos-hermes-13b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00003 },
          response_token: { price: 0.00003 },
        },
      },
    },
    'NumbersStation/nsql-llama-2-7B': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'garage-bAInd/Platypus2-70B-instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00009 },
          response_token: { price: 0.00009 },
        },
      },
    },
    'WizardLM/WizardLM-70B-V1.0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00009 },
          response_token: { price: 0.00009 },
        },
      },
    },
    'Gryphe/MythoMax-L2-13b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00003 },
          response_token: { price: 0.00003 },
        },
      },
    },
    'upstage/SOLAR-0-70b-16bit': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00009 },
          response_token: { price: 0.00009 },
        },
      },
    },
    'togethercomputer/Qwen-7B-Chat': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/Qwen-7B': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/RedPajama-INCITE-7B-Chat': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/RedPajama-INCITE-7B-Instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/RedPajama-INCITE-7B-Base': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/RedPajama-INCITE-Chat-3B-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00001 },
          response_token: { price: 0.00001 },
        },
      },
    },
    'togethercomputer/RedPajama-INCITE-Instruct-3B-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00001 },
          response_token: { price: 0.00001 },
        },
      },
    },
    'togethercomputer/RedPajama-INCITE-Base-3B-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00001 },
          response_token: { price: 0.00001 },
        },
      },
    },
    'huggyllama/llama-65b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00009 },
          response_token: { price: 0.00009 },
        },
      },
    },
    'togethercomputer/GPT-JT-6B-v1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/GPT-JT-Moderation-6B': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/GPT-NeoXT-Chat-Base-20B': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00003 },
          response_token: { price: 0.00003 },
        },
      },
    },
    'togethercomputer/Pythia-Chat-Base-7B-v0.16': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/alpaca-7b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/falcon-40b-instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.00008 },
        },
      },
    },
    'togethercomputer/falcon-40b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00008 },
          response_token: { price: 0.00008 },
        },
      },
    },
    'togethercomputer/falcon-7b-instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'togethercomputer/falcon-7b': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'upstage/SOLAR-10.7B-Instruct-v1.0': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00003 },
          response_token: { price: 0.00003 },
        },
      },
    },
    'togethercomputer/m2-bert-80M-2k-retrieval': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0000008 },
          response_token: { price: 0 },
        },
      },
    },
    'togethercomputer/m2-bert-80M-8k-retrieval': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0000008 },
          response_token: { price: 0 },
        },
      },
    },
    'togethercomputer/m2-bert-80M-32k-retrieval': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0000008 },
          response_token: { price: 0 },
        },
      },
    },
    'WhereIsAI/UAE-Large-V1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0000016 },
          response_token: { price: 0 },
        },
      },
    },
    'BAAI/bge-large-en-v1.5': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0000016 },
          response_token: { price: 0 },
        },
      },
    },
    'BAAI/bge-base-en-v1.5': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0000008 },
          response_token: { price: 0 },
        },
      },
    },
    'sentence-transformers/msmarco-bert-base-dot-v5': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0000008 },
          response_token: { price: 0 },
        },
      },
    },
    'bert-base-uncased': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0000008 },
          response_token: { price: 0 },
        },
      },
    },
    'databricks/dbrx-instruct': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00012 },
          response_token: { price: 0.00012 },
        },
      },
    },
    'mistralai/Mixtral-8x22B': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00012 },
          response_token: { price: 0.00012 },
        },
      },
    },
    'mistralai/Mistral-7B-Instruct-v0.1': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'meta-llama/Llama-2-7b-chat-hf': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'meta-llama/Llama-3-8b-chat-hf': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'meta-llama/Llama-3-70b-chat-hf': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00009 },
          response_token: { price: 0.00009 },
        },
      },
    },
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Reference': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000088 },
          response_token: { price: 0.000088 },
        },
      },
    },
    'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.0005 },
          response_token: { price: 0.0005 },
        },
      },
    },
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.000018 },
          response_token: { price: 0.000018 },
        },
      },
    },
    'meta-llama/Meta-Llama-3.1-8B-Reference': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00002 },
          response_token: { price: 0.00002 },
        },
      },
    },
    'meta-llama/Meta-Llama-3.1-70B-Instruct-Reference': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00009 },
          response_token: { price: 0.00009 },
        },
      },
    },
    'meta-llama/Meta-Llama-3.1-70B-Reference': {
      pricing_config: {
        pay_as_you_go: {
          request_token: { price: 0.00009 },
          response_token: { price: 0.00009 },
        },
      },
    },
  };
  const { model, url } = input;
  const config =
    modelPricingConfig[model] ?? commonUrlPriceConfig()[url]?.[model];
  return config?.pricing_config;
}
