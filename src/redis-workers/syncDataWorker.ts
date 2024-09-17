import { logger } from '../apm';
import { AtomicKeyTypes, CacheKeyTypes } from '../middlewares/portkey/globals';
import { generateV2CacheKey } from '../middlewares/portkey/handlers/cache';
import { resetUsage } from '../middlewares/portkey/handlers/usage';
import { resyncOrganisationData } from '../services/albus';
import { deleteFromKV, getFromKV } from '../services/kvstore';
import { runInBatches } from '../utils/misc';
import { SyncTransactionDataFormat } from './types';

export async function syncDataWorker() {
  // get the organisations ids list from the env
  if (
    process.env.PRIVATE_DEPLOYMENT === 'ON' &&
    process.env.GATEWAY_CACHE_MODE === 'SELF'
  ) {
    return true;
  }
  const organisationIds = process.env.ORGANISATIONS_TO_SYNC?.split(',') || [];
  if (organisationIds.length === 0) {
    return true;
  }

  //make a GET call to source sync API for each organisation id
  for (let i = 0; i < organisationIds.length; i++) {
    const path = `${process.env.ALBUS_BASEPATH}/v1/organisation/${organisationIds[i]}/sync/0`;

    const response = await fetch(path, {
      headers: {
        Authorization: process.env.PORTKEY_CLIENT_AUTH as string,
      },
    });

    if (!response.ok) {
      logger.error({
        message: `syncDataWorker error: ${await response.clone().text()}`,
      });
      return false;
    }

    const responseData = await response.json<{
      data: SyncTransactionDataFormat;
    }>();
    const data = responseData.data;

    /*
        format of the response
        {
            "prompts": ["slug-1", "slug-2", "slug-3"],
            "virtualKey": ["key-1", "key-2", "key-3"],
            "configs": ["config-1", "config-2", "config-3"],
            "apiKeyIds": ["api-key-1", "api-key-2", "api-key-3"],
            "guardrails": ["guardrail-1", "guardrail-2", "guardrail-3"],
        }
       */

    //for the the keys that exist, for each of their values, get the actual cache key
    // and then delete that key from the KV

    const deletePromises: Promise<boolean>[] = [];

    data.promptsV2?.forEach((item) => {
      const key = generateV2CacheKey({
        organisationId: organisationIds[i],
        cacheKeyType: CacheKeyTypes.PROMPT,
        key: item.slug,
        workspaceId: item.workspace_id,
      });
      deletePromises.push(deleteFromKV(key));
    });

    data.virtualKeysV2?.forEach((item) => {
      const key = generateV2CacheKey({
        organisationId: organisationIds[i],
        cacheKeyType: CacheKeyTypes.VIRTUAL_KEY,
        key: item.slug,
        workspaceId: item.workspace_id,
      });
      deletePromises.push(deleteFromKV(key));
    });

    data.configsV2?.forEach((item) => {
      const key = generateV2CacheKey({
        organisationId: organisationIds[i],
        cacheKeyType: CacheKeyTypes.CONFIG,
        key: item.slug,
        workspaceId: item.workspace_id,
      });
      deletePromises.push(deleteFromKV(key));
    });

    data.promptPartialsV2?.forEach((item) => {
      const key = generateV2CacheKey({
        organisationId: organisationIds[i],
        cacheKeyType: CacheKeyTypes.PROMPT_PARTIAL,
        key: item.slug,
        workspaceId: item.workspace_id,
      });
      deletePromises.push(deleteFromKV(key));
    });

    data.guardrailsV2?.forEach((item) => {
      const key = generateV2CacheKey({
        organisationId: organisationIds[i],
        cacheKeyType: CacheKeyTypes.GUARDRAIL,
        key: item.slug,
        workspaceId: item.workspace_id,
      });
      deletePromises.push(deleteFromKV(key));
    });

    data.integrationsV2?.forEach(() => {
      const key = generateV2CacheKey({
        organisationId: organisationIds[i],
        cacheKeyType: CacheKeyTypes.INTEGRATIONS,
        key: 'all',
      });
      deletePromises.push(deleteFromKV(key));
    });

    const apiKeyIdPromises: Promise<{ key: string } | null>[] = [];
    const apiKeyIds: string[] = [];
    data.apiKeyIds?.forEach((id) => {
      const cacheKey = generateV2CacheKey({
        cacheKeyType: CacheKeyTypes.API_KEY_ID,
        key: id,
      });
      apiKeyIdPromises.push(getFromKV(cacheKey));
      apiKeyIds.push(id);
    });

    data.apiKeysToReset?.forEach((id) => {
      const cacheKey = generateV2CacheKey({
        cacheKeyType: CacheKeyTypes.API_KEY_ID,
        key: id,
      });
      apiKeyIdPromises.push(getFromKV(cacheKey));
      apiKeyIds.push(id);
    });

    const apiKeyToIdMap = new Map();

    const apiKeyIdToKeyData: ({ key: string } | null)[] =
      await Promise.all(apiKeyIdPromises);

    for (let i = 0; i < apiKeyIdToKeyData.length; i++) {
      const apiIdKeyData = apiKeyIdToKeyData[i];
      apiKeyToIdMap.set(apiKeyIds[i], apiIdKeyData?.key);
      if (apiIdKeyData?.key) {
        const cacheKey = generateV2CacheKey({
          cacheKeyType: CacheKeyTypes.API_KEY,
          key: apiIdKeyData?.key,
        });
        deletePromises.push(deleteFromKV(cacheKey));
      }
    }

    const virtualKeysToReset: string[] = [];
    await runInBatches(50, data.virtualKeysToResetV2?.length, async (i) => {
      try {
        const vKey = data.virtualKeysToResetV2[i].slug;
        await resetUsage({
          type: AtomicKeyTypes.VIRTUAL_KEY,
          key: vKey,
          organisationId: organisationIds[i],
        });
        deletePromises.push(
          deleteFromKV(
            generateV2CacheKey({
              cacheKeyType: CacheKeyTypes.VIRTUAL_KEY,
              key: vKey,
              organisationId: organisationIds[i],
              workspaceId: data.virtualKeysToResetV2[i].workspace_id,
            })
          )
        );
        virtualKeysToReset.push(vKey);
      } catch (err) {
        logger.error(err);
      }
    });

    const apiKeysToReset: string[] = [];
    await runInBatches(50, data.apiKeysToReset?.length, async (i) => {
      try {
        const aKeyId = data.apiKeysToReset[i];
        const aKey = apiKeyToIdMap.get(aKeyId);
        await resetUsage({
          type: AtomicKeyTypes.API_KEY,
          key: aKey,
          organisationId: organisationIds[i],
        });
        apiKeysToReset.push(aKey);
        deletePromises.push(
          deleteFromKV(
            generateV2CacheKey({
              cacheKeyType: CacheKeyTypes.API_KEY,
              key: aKey,
            })
          )
        );
      } catch (err) {
        logger.error(err);
      }
    });

    if (virtualKeysToReset.length > 0 || apiKeysToReset.length > 0) {
      await resyncOrganisationData({
        env: process.env,
        organisationId: organisationIds[i],
        virtualKeysToReset: virtualKeysToReset,
        apiKeysToReset: apiKeysToReset,
      });
    }
    await runInBatches(50, deletePromises.length, (i) => deletePromises[i]);
  }
  return true;
}
