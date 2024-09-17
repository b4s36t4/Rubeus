export type SyncTransactionDataFormat = {
  prompts: string[];
  promptsV2: EntityV2[];
  configs: string[];
  configsV2: EntityV2[];
  virtualKeys: string[];
  virtualKeysV2: EntityV2[];
  promptPartials: string[];
  promptPartialsV2: EntityV2[];
  apiKeyIds: string[];
  guardrails: string[];
  virtualKeysToReset: string[];
  virtualKeysToResetV2: EntityV2[];
  apiKeysToReset: string[];
  guardrailsV2: EntityV2[];
  integrationsV2: EntityV2[];
};

type EntityV2 = {
  slug: string;
  workspace_id: string;
};
