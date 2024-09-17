// metricsPushGateway.ts
import os from 'os';
import { promClient, register } from './prometheusClient';
import { loadAndValidateEnv } from './envConfig';

const {
  PROMETHEUS_GATEWAY_URL,
  PROMETHEUS_GATEWAY_AUTH,
  SERVICE_NAME,
  NODE_ENV,
} = loadAndValidateEnv();

const gateway = new promClient.Pushgateway(
  PROMETHEUS_GATEWAY_URL,
  {
    headers: {
      Authorization: `Basic ${PROMETHEUS_GATEWAY_AUTH}`,
    },
  },
  register
);

export const pushMetrics = () => {
  try {
    gateway
      .push({
        jobName: 'aggregator',
        groupings: {
          service_uid: os.hostname(),
          service: SERVICE_NAME,
          env: NODE_ENV,
        },
      })
      .catch((e) => {
        console.error('[PROMETHEUS] Unable to push to prom: ', e.message);
      });
  } catch (err: any) {
    console.error('[PROMETHEUS] Unhandled error', err.message);
  }
};

// Schedule metrics push every 30 seconds
setInterval(() => {
  pushMetrics();
}, 30 * 1000);
