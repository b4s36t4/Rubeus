import { CompletionResponse, ErrorResponse, ProviderConfig } from "../types";

export const MistraLiteCompleteConfig: ProviderConfig = {
  inputs: {
    param: "inputs",
    required: true,
  },
  parameters: {
    param: "parameters",
    default: {
      top_k: 0,
      top_p: 0.75,
      temperature: 75,
      repetition_penalty: 0,
      max_new_tokens: 0,
      max_time: 120,
      // Return response in Document
      num_return_sequences: 1,
      return_full_text: true,
    },
  },
};

type MistraCompleteResponse = {
  generated_text: string;
}[];

export const MistraCompleteResponseTransform = (
  response: MistraCompleteResponse,
  status: number
): CompletionResponse | ErrorResponse => {
  if (status !== 200) {
    return {
      error: {
        message: "Inference API Error",
        type: null,
        param: null,
        code: null,
      },
      provider: "HFInference",
    } as ErrorResponse;
  }

  return {
    id: "",
    choices: [
      {
        text: response?.[0].generated_text,
        finish_reason: "complete",
        logprobs: null,
        index: 0,
      },
    ],
    created: Math.floor(Date.now() / 1000),
    model: "mistralite",
    provider: "HFInference",
    object: "text_completion",
  };
};
