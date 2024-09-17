import {
  AtomicKeyTypes,
  AtomicOperations,
} from '../../../middlewares/portkey/globals';
import { incrementUsage } from '../../../middlewares/portkey/handlers/usage';

export async function handleVirtualKeyUsage(
  env: Record<string, any>,
  store: Record<string, any>,
  chLogObject: Record<string, any>,
  logUsage: boolean
) {
  if (!logUsage) return;
  const isVirtualKeyUsageEnabled =
    store.incomingBody.providerOptions?.virtualKeyUsageEnabled ||
    store.incomingBody.config.portkeyHeaders[
      'x-portkey-virtual-key-usage-enabled'
    ];
  const isVirtualKeyLimitEnabled =
    store.organisationDetails?.settings?.is_virtual_key_limit_enabled &&
    isVirtualKeyUsageEnabled &&
    !['HIT', 'SEMANTIC HIT'].includes(chLogObject.cache_status.value);
  if (
    isVirtualKeyLimitEnabled &&
    chLogObject.virtual_key.value &&
    chLogObject.cost.value
  ) {
    await incrementUsage({
      organisationId: store.organisationDetails.id,
      key: chLogObject.virtual_key.value,
      type: AtomicKeyTypes.VIRTUAL_KEY,
      amount: chLogObject.cost.value,
      operation: AtomicOperations.INCREMENT,
    });
  }
}

export async function handleApiKeyUsage(
  env: Record<string, any>,
  store: Record<string, any>,
  chLogObject: Record<string, any>,
  logUsage: boolean
) {
  if (!logUsage) return;
  const isApiKeyUsageEnabled =
    store.organisationDetails?.apiKeyDetails?.usageLimits?.credit_limit ||
    store.organisationDetails?.apiKeyDetails?.usageLimits?.alert_threshold;
  const isApiKeyLimitEnabled =
    store.organisationDetails?.settings?.is_api_key_limit_enabled &&
    isApiKeyUsageEnabled &&
    !['HIT', 'SEMANTIC HIT'].includes(chLogObject.cache_status.value);
  if (
    isApiKeyLimitEnabled &&
    store['x-portkey-api-key'] &&
    chLogObject.cost.value
  ) {
    await incrementUsage({
      organisationId: store.organisationDetails.id,
      key: store['x-portkey-api-key'],
      type: AtomicKeyTypes.API_KEY,
      amount: chLogObject.cost.value,
      operation: AtomicOperations.INCREMENT,
    });
  }
}
