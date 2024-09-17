// prometheusClient.ts
import client from 'prom-client';
import { loadAndValidateEnv } from './envConfig';

const envVars = loadAndValidateEnv();
const { Registry } = client;
const { collectDefaultMetrics } = client;

export const register = new Registry();
register.setDefaultLabels({
  app: envVars.SERVICE_NAME,
  env: envVars.NODE_ENV,
});

collectDefaultMetrics({
  register,
});

export const promClient = client;
