import { encode } from 'gpt-3-encoder';
import { TiktokenModel, encoding_for_model } from '@dqbd/tiktoken';

function getChatCompletionsTokenCount(
  input: Record<string, any>,
  model: string
) {
  let mappedModelName = model as TiktokenModel;
  if (model.startsWith('gpt-3.5-turbo-')) {
    mappedModelName = 'gpt-3.5-turbo';
  }

  if (model.startsWith('gpt-35-turbo')) {
    mappedModelName = 'gpt-3.5-turbo';
  }

  if (model.startsWith('gpt-4-32k-')) {
    mappedModelName = 'gpt-4-32k';
  }

  if (model.startsWith('gpt-4-')) {
    mappedModelName = 'gpt-4';
  }

  if (model.startsWith('gpt-4o')) {
    mappedModelName = 'gpt-4o';
  }

  const isGpt3 = mappedModelName === 'gpt-3.5-turbo';

  const encoder = encoding_for_model(mappedModelName, {
    '<|im_start|>': 100264,
    '<|im_end|>': 100265,
    '<|im_sep|>': 100266,
  });

  const msgSep = isGpt3 ? '\n' : '';
  const roleSep = isGpt3 ? '\n' : '<|im_sep|>';

  const serializedInput = [
    input
      .map(
        ({
          name,
          role,
          content,
        }: {
          name: string;
          role: string;
          content: any;
        }) => {
          if (typeof content === 'object' && content && content.length) {
            return `<|im_start|>${name || role}${roleSep}${content
              .map((c: any) => {
                if (c.type === 'text') {
                  return `${c.text}`;
                }
              })
              .join(' ')}<|im_end|>`;
          } else {
            return `<|im_start|>${name || role}${roleSep}${content}<|im_end|>`;
          }
        }
      )
      .join(msgSep),
    `<|im_start|>assistant${roleSep}`,
  ].join(msgSep);

  const inputTokens = encoder.encode(serializedInput, 'all').length;
  encoder.free();
  return {
    units: inputTokens,
  };
}

// eslint-disable-next-line no-unused-vars
function getCompletionsTokenCount(input: Array<string>) {
  let inputTokens = 0;

  for (const i of input) {
    inputTokens += encode(i).length;
  }

  return {
    units: inputTokens,
  };
}

export const getTokens = function (
  body: Array<string | Record<string, any>>,
  model: string
) {
  if (!body?.length) {
    return {
      units: 0,
    };
  }

  let mappedModel = model;
  let modelType;

  if (model.startsWith('text-')) {
    modelType = 'text';
  } else if (model.startsWith('gpt-')) {
    modelType = 'chat';
  } else if (typeof body[0] === 'string') {
    modelType = 'text';
    mappedModel = 'text-davinci-003';
  } else if (typeof body[0] === 'object') {
    modelType = 'chat';
    mappedModel = 'gpt-3.5-turbo';
  }

  let response = {
    units: 0,
  };

  switch (modelType) {
    case 'text': {
      response = getCompletionsTokenCount(body as string[]);
      break;
    }

    case 'chat': {
      response = getChatCompletionsTokenCount(body, model);
      break;
    }
    default:
      break;
  }

  return response;
};
