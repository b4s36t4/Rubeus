import { Redis, Cluster } from 'ioredis';

const {
  REDIS_URL: redisUrl,
  REDIS_TLS_ENABLED: redisTLS,
  REDIS_MODE: redisMode,
  CACHE_STORE: cacheStore,
} = process.env;

if (!redisUrl) {
  console.error(
    'Redis cannot be initialized because of missing environment variable: REDIS_URL'
  );
  process.exit(1);
}

const redisOptions: any = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  connectTimeout: 20000,
  retryStrategy: (times: any) => Math.min(times * 1000, 3000),
  tls: redisTLS === 'true' ? {} : undefined,
};

if (cacheStore === 'aws-elastic-cache' && redisTLS === 'true') {
  redisOptions.tls = { rejectUnauthorized: false };
  redisOptions.dnsLookup = (
    address: string,
    callback: (err: Error | null, address: string) => void
  ) => callback(null, address);
}

let redisClient: Redis | Cluster;

if (redisMode === 'cluster') {
  redisClient = new Cluster([redisUrl], {
    ...redisOptions,
    redisOptions: redisOptions,
    slotsRefreshTimeout: 10000,
  });
} else {
  redisClient = new Redis(redisUrl, redisOptions);
}

redisClient.on('error', (error) => {
  console.error('Redis client error:', error);
});

redisClient.on('connect', () => {
  console.log(`Redis client connected in ${redisMode || 'standalone'} mode`);
});

export { redisClient };
