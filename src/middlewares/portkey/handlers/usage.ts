import { redisClient } from '../../../data-stores/redis';
import {
  fetchOrganisationProviderFromSlug,
  resyncOrganisationData,
} from '../../../services/albus';
import { AtomicCounter } from '../../../utils/atomicCounter';
import { AtomicKeyTypes, AtomicOperations, EntityStatus } from '../globals';
import {
  AtomicCounterRequestType,
  OrganisationDetails,
  WorkspaceDetails,
} from '../types';

async function atomicCounterHandler({
  organisationId,
  type,
  key,
  amount,
  operation,
}: Partial<AtomicCounterRequestType>) {
  const atomicCounterStub = new AtomicCounter(redisClient);
  const body: Partial<AtomicCounterRequestType> = {
    organisationId,
    type,
    key,
    operation,
    amount,
  };
  const apiRes = await atomicCounterStub.fetch(body);
  const data: { value: number } = await apiRes.json();
  return data;
}

export async function getCurrentUsage({
  organisationId,
  type,
  key,
}: Partial<AtomicCounterRequestType>) {
  return atomicCounterHandler({
    organisationId,
    type,
    key,
    operation: AtomicOperations.GET,
  });
}

export async function incrementUsage({
  organisationId,
  type,
  key,
  amount,
}: Partial<AtomicCounterRequestType>) {
  return atomicCounterHandler({
    organisationId,
    type,
    key,
    amount,
    operation: AtomicOperations.INCREMENT,
  });
}

export async function resetUsage({
  organisationId,
  type,
  key,
}: Partial<AtomicCounterRequestType>) {
  return atomicCounterHandler({
    organisationId,
    type,
    key,
    operation: AtomicOperations.RESET,
  });
}

export async function checkApiKeyUsage(
  env: Record<string, any>,
  organisationDetails: OrganisationDetails,
  apiKey: string
) {
  const isApiKeyUsageLimitFeatureEnabled =
    !!organisationDetails.settings?.is_api_key_limit_enabled;
  const limitInCents =
    (organisationDetails.usageLimits?.credit_limit || 0) * 100;
  const alertThresholdInCents =
    (organisationDetails.usageLimits?.alert_threshold || 0) * 100;
  if (
    isApiKeyUsageLimitFeatureEnabled &&
    (limitInCents || alertThresholdInCents)
  ) {
    if (organisationDetails.status == EntityStatus.EXHAUSTED) {
      return true;
    }
    const apiUsageRes = await getCurrentUsage({
      organisationId: organisationDetails.id,
      key: apiKey,
      type: AtomicKeyTypes.API_KEY,
    });
    const usageInCents = apiUsageRes.value;
    if (limitInCents && usageInCents >= limitInCents) {
      await resyncOrganisationData({
        env,
        organisationId: organisationDetails.id,
        apiKeysToExhaust: [apiKey],
      });
      return true;
    } else if (
      alertThresholdInCents &&
      usageInCents >= alertThresholdInCents &&
      !organisationDetails.usageLimits?.is_threshold_alerts_sent
    ) {
      await resyncOrganisationData({
        env,
        organisationId: organisationDetails.id,
        apiKeysToAlertThreshold: [apiKey],
      });
    }
  }
  return false;
}

export async function validateVirtualKeyUsage({
  env,
  organisationId,
  workspaceDetails,
  apiKey,
  isVirtualKeyUsageEnabled,
  virtualKey,
  apiKeyKVRecord,
}: {
  env: Record<string, any>;
  organisationId: string;
  workspaceDetails: WorkspaceDetails;
  apiKey: string;
  apiKeyKVRecord: any;
  virtualKey: string;
  isVirtualKeyUsageEnabled: boolean;
}) {
  const creditLimitInCents =
    (apiKeyKVRecord?.usage_limits?.credit_limit || 0) * 100;
  //get limits
  if (isVirtualKeyUsageEnabled && creditLimitInCents) {
    const currentUsage = await getCurrentUsage({
      key: virtualKey,
      type: AtomicKeyTypes.VIRTUAL_KEY,
      organisationId,
    });
    const currUsageInCents = currentUsage?.value || 0; //Winky calculates in cents
    const alertThresholdInCents =
      (apiKeyKVRecord?.usage_limits?.alert_threshold || 0) * 100;
    let refetch = false;
    if (
      apiKeyKVRecord?.status !== EntityStatus.EXHAUSTED &&
      currUsageInCents >= creditLimitInCents
    ) {
      apiKeyKVRecord.status = EntityStatus.EXHAUSTED;
      await resyncOrganisationData({
        env,
        organisationId,
        virtualKeysToExhaust: [virtualKey],
      });
      refetch = true;
    } else if (
      alertThresholdInCents &&
      currUsageInCents >= alertThresholdInCents &&
      !apiKeyKVRecord?.usage_limits?.is_threshold_alerts_sent
    ) {
      await resyncOrganisationData({
        env,
        organisationId,
        virtualKeysToAlertThreshold: [virtualKey],
      });
      refetch = true;
    }
    if (refetch) {
      fetchOrganisationProviderFromSlug(
        env,
        apiKey,
        organisationId,
        workspaceDetails,
        virtualKey,
        true
      );
    }
  }
}
