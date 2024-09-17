import { redisClient } from '../data-stores/redis';
import { syncDataWorker } from './syncDataWorker';
import { QueueOptions } from 'bullmq';

export interface QueueConfig {
  name: string;
  processor: (job?: any) => Promise<boolean>;
  options: QueueOptions;
  cronJob?: {
    name: string;
    pattern: string;
    data?: any;
  };
}

const baseOptions: QueueOptions = {
  connection: redisClient,
  // prefix: '{bull}',
};

if (process.env.REDIS_MODE === 'cluster') {
  baseOptions.prefix = '{bull}';
}

export const queueConfigs: QueueConfig[] = [
  {
    name: 'syncDataQueue',
    processor: syncDataWorker,
    options: {
      ...baseOptions,
      defaultJobOptions: {
        removeOnComplete: {
          count: 1000,
        },
        removeOnFail: {
          count: 5000,
        },
      },
    },
    cronJob: {
      name: 'syncDataJob',
      pattern: '*/1 * * * *', // Every 1 minute
      data: {},
    },
  },
];
