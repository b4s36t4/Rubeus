import { promClient, register } from './prometheus/prometheusClient.js';
import { LokiLogger } from './loki/logger.js';
import { pushMetrics } from './prometheus/metricsPushGateway.js';

pushMetrics();

export const promethuesClient = promClient;
export const prometheusRegister = register;
export const logger = LokiLogger;
