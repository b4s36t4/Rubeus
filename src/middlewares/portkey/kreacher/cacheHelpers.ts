import { respond, separatePromptAndMeta } from './helpers';
import { createOpenAIEmbedding } from './embeddings';
import { KVStore } from './kvstore';
import { VectorStore } from './vectorStore';
import { Context } from 'hono';
import { logger } from '../../../apm';

export const handleForceRefresh = async (
  env: Record<string, any>,
  key: string,
  mode: string,
  organisationId: string
) => {
  // Delete the key in both simple & semantic cases
  await KVStore.del(env, key);

  // If the mode is semantic, delete from vector store as well
  if (mode === 'semantic') {
    await VectorStore.del(key, organisationId);
  }

  return true;
};

export const handleSemanticForceRefresh = async (
  env: Record<string, any>,
  c: Context,
  url: string,
  requestBody: Record<string, any>,
  metadata: Record<string, any>,
  organisationId: string
) => {
  const { prompt, params } = separatePromptAndMeta(null, url, requestBody);

  if (!prompt) return true;

  const em = await createOpenAIEmbedding(env, c, prompt as string);

  // Query the vector store with this embedding
  const vectorStoreResponse: any = await VectorStore.get(
    em,
    Object.assign({}, metadata, params),
    organisationId
  );

  // Delete vector and kv-store record
  if (vectorStoreResponse) {
    await VectorStore.del(vectorStoreResponse, organisationId);
    await KVStore.del(env, vectorStoreResponse);
  }

  return true;
};

export const fetchFromCache = async (
  env: Record<string, any>,
  c: Context,
  cacheKey: string,
  incomingRequestBody: Record<string, any>
) => {
  // Defaults
  let data: string = '';
  let status = 'DISABLED';

  try {
    const cHeaders = incomingRequestBody.headersObj;
    const cacheMode =
      incomingRequestBody.cacheMode ?? incomingRequestBody.headersObj.cacheMode;
    if (cHeaders.invalidateCache === 'true') {
      status = 'REFRESH';

      // handle key deletion in force refresh cases
      await handleForceRefresh(
        env,
        cacheKey,
        cacheMode,
        incomingRequestBody.organisationId
      );
      if (cacheMode === 'semantic')
        await handleSemanticForceRefresh(
          env,
          c,
          incomingRequestBody.url,
          incomingRequestBody.request,
          cHeaders.meta,
          incomingRequestBody.organisationId
        );
    } else if (['simple', 'semantic'].includes(cacheMode)) {
      const kvStoreResponse = await KVStore.get(env, cacheKey);
      if (kvStoreResponse) {
        data = JSON.stringify(kvStoreResponse);
      }
      status = data ? 'HIT' : 'MISS';
      // Check semantic cache only if the simple cache was a miss
      if (cacheMode === 'semantic' && status != 'HIT') {
        // Create the embedding
        const { prompt, params } = separatePromptAndMeta(
          cHeaders.proxyMode,
          incomingRequestBody.url,
          incomingRequestBody.request
        );
        if (!prompt) {
          status = 'MISS';
        } else {
          const em = await createOpenAIEmbedding(env, c, prompt);
          // Query the vector store with this embedding
          const vectorStoreResponse: any = await VectorStore.get(
            em,
            Object.assign({}, cHeaders.meta, params),
            incomingRequestBody.organisationId
          );
          // Delete Vector if KV pair is expired
          if (vectorStoreResponse) {
            const vectorKvStoreFetch = await KVStore.get(
              env,
              vectorStoreResponse
            );
            if (!vectorKvStoreFetch) {
              await VectorStore.del(
                vectorStoreResponse,
                incomingRequestBody.organisationId
              );
            } else {
              data = JSON.stringify(vectorKvStoreFetch);
              await KVStore.put(
                env,
                cacheKey,
                JSON.parse(data),
                incomingRequestBody.headersObj.maxAge
              );
            }
          }
          status = data ? 'SEMANTIC HIT' : 'SEMANTIC MISS';
        }
      }
    }
  } catch (err: any) {
    logger.error({
      message: `fetchFromCache error: ${err.message}`,
    });
    return false;
  }
  return { data, status, cacheKey };
};

export const storeInCache = async (
  env: Record<string, any>,
  c: Context,
  cacheKey: string,
  incomingRequestBody: Record<string, any>
) => {
  try {
    const cacheMode =
      incomingRequestBody.cacheMode ?? incomingRequestBody.headersObj.cacheMode;
    if (['simple', 'semantic'].includes(cacheMode)) {
      // Store the key, value and ttl
      await KVStore.put(
        env,
        cacheKey,
        incomingRequestBody.response,
        incomingRequestBody.headersObj.maxAge
      );
    }

    if (cacheMode === 'semantic') {
      // Create the embedding for the request
      const { prompt: textToEmbed, params: meta } = separatePromptAndMeta(
        incomingRequestBody.headersObj.proxyMode,
        incomingRequestBody.url,
        incomingRequestBody.request
      );
      if (textToEmbed) {
        const em = await createOpenAIEmbedding(env, c, textToEmbed);

        // Query the vector store with this embedding
        const vectorMeta = Object.assign(
          {},
          incomingRequestBody.headersObj.meta,
          meta
        );
        await VectorStore.put(
          cacheKey,
          em,
          vectorMeta,
          incomingRequestBody.organisationId
        );
      }
    }
  } catch (err: any) {
    logger.error({
      message: `storeInCache error: ${err.message}`,
    });
    return false;
  }
  return true;
};
