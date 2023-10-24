import { Message, Params } from "../../types/requestBody";
import { CompletionResponse, ErrorResponse, ProviderConfig } from "../types";

// https://replicate.com/meta/llama-2-70b-chat/api#input-prompt
export const ReplicateChatCompleteConfig: ProviderConfig = {
  model: {
    param: "model",
    required: true,
    // Default model meta/llama-2-70b-chat
    default: "02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3",
  },
  prompt: {
    param: "prompt",
    required: true,
    transform: (params: Params) => {
      let prompt = "";

      if (!!params.messages) {
        let messages: Message[] = params.messages;
        messages.forEach((message) => {
          if (message.role === "user") {
            prompt += `[INST] ${message.content} [/INST]`;
          } else {
            prompt += message.content;
          }
        });
        prompt.trim();
      }

      return { input: { prompt: params.prompt } };
    },
  },
  system_message: {
    param: "system_message",
    default: "Replicate Assistant",
  },
  temperature: {
    param: "temperature",
    default: 0.75,
    min: 0,
    max: 2,
  },
  top_p: {
    param: "p",
    default: 0.8,
    min: 0,
    max: 1,
  },
  top_k: {
    param: "k",
    default: 0,
    max: 500,
  },
  stop: {
    param: "stop_sequences",
  },
  stream: {
    param: "stream",
    default: true,
  },
  seed: {
    param: "seed",
  },
};

interface ReplicateCompleteResponse {
  id: string;
  version: string;
  input: { prompt: string };
  logs: unknown;
  error?: unknown;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string;
  urls: {
    cancel: string;
    get: string;
  };
  completed_at: string;
  started_at: string;
}

export const ReplicateResponseTransform: (
  response: ReplicateCompleteResponse,
  status: number
) => CompletionResponse | ErrorResponse = (response, status) => {
  if (status !== 200) {
    return {
      error: {
        message: response.error,
        param: null,
        code: null,
      },
      provider: "replicate",
    } as ErrorResponse;
  }

  return {
    id: response.id,
    object: "text_completion",
    created: Math.floor(Date.now() / 1000),
    model: response.version,
    provider: "replicate",
    choices: [
      {
        text: response.output,
        index: 0,
        logprobs: null,
        finish_reason: response.status,
      },
    ],
  };
};

export const ReplicateCompleteChunkTransform: (
  response: string,
  state: { lastIndex: number }
) => string = (responseChunk, state) => {
  let chunk = responseChunk.trim();
  chunk = chunk.replace(/^data: /, "");
  chunk = chunk.trim();
  if (chunk === "[DONE]") {
    return chunk;
  }
  const parsedChunk: ReplicateCompleteResponse = JSON.parse(chunk);
  const parsedCompletion = parsedChunk.output.slice(state.lastIndex);
  state.lastIndex = parsedChunk.output.length;
  return (
    `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: "text_completion",
      created: Math.floor(Date.now() / 1000),
      model: parsedChunk.version,
      provider: "replicate",
      choices: [
        {
          text: parsedCompletion,
          index: 0,
          logprobs: null,
          finish_reason: parsedChunk.status,
        },
      ],
    })}` + "\n\n"
  );
};
