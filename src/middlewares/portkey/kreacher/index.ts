import { getCacheKey } from './helpers';
import { storeInCache, fetchFromCache } from './cacheHelpers';
import { Context } from 'hono';

export async function getFromKCache(
  env: Record<string, any>,
  c: Context,
  incomingRequestBody: Record<string, any>
) {
  const cacheKey = await getCacheKey(incomingRequestBody);
  return fetchFromCache(env, c, cacheKey, incomingRequestBody);
}

export async function storeInKCache(
  env: Record<string, any>,
  c: Context,
  incomingRequestBody: Record<string, any>
) {
  const cacheKey = await getCacheKey(incomingRequestBody);
  return storeInCache(env, c, cacheKey, incomingRequestBody);
}

export async function getKCacheKey(incomingRequestBody: Record<string, any>) {
  return getCacheKey(incomingRequestBody);
}
