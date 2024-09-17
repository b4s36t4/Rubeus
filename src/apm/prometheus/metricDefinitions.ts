// metricUtils.ts
import client from 'prom-client';
import { register } from './prometheusClient';

export const createNewCounter = (
  name: string,
  help: string,
  labelNames: string[] = []
) => {
  return new client.Counter({
    name,
    help,
    labelNames,
    registers: [register],
  });
};

export const promCounters = {
  CLIENT_ERROR: createNewCounter(
    'client_error_count',
    'Count of client errors'
  ),
  TEST_METRIC_WITH_CARDINALITY: createNewCounter(
    'test_metric_cardinality',
    'Event related to testing cardinality',
    ['type1', 'type2', 'type3']
  ),
};
