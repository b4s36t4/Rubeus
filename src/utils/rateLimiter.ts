import { Cluster, Redis } from 'ioredis';

class RedisRateLimiter {
  private redisClient: Redis | Cluster;
  private capacity: number;
  private windowSize: number;
  private lastRefillKey: string;
  private tokensKey: string;

  constructor(
    redisClient: Redis | Cluster,
    capacity: number,
    windowSize: number,
    key: string
  ) {
    this.redisClient = redisClient;
    this.capacity = capacity;
    this.windowSize = windowSize;
    this.lastRefillKey = `lastRefill:${key}`;
    this.tokensKey = `tokens:${key}`;
  }

  async checkRateLimit(): Promise<{ allowed: boolean; waitTime: number }> {
    const now = Date.now();
    const lastRefillTime = await this.getLastRefillTime();
    const elapsedTime = now - lastRefillTime;

    await this.refillTokens(now, lastRefillTime, elapsedTime);

    const tokensLeft = await this.decrementToken();

    if (tokensLeft >= 0) {
      return { allowed: true, waitTime: 0 };
    } else {
      const waitTime = this.windowSize - (elapsedTime % this.windowSize);
      return { allowed: false, waitTime };
    }
  }

  private async getLastRefillTime(): Promise<number> {
    const timestamp = await this.redisClient.get(this.lastRefillKey);
    return timestamp ? parseInt(timestamp, 10) : 0;
  }

  private async refillTokens(
    now: number,
    lastRefillTime: number,
    elapsedTime: number
  ): Promise<void> {
    if (lastRefillTime === 0) {
      await this.redisClient.set(this.tokensKey, this.capacity.toString());
      await this.redisClient.set(this.lastRefillKey, now.toString());
    } else {
      const tokensToAdd = Math.floor(
        (elapsedTime / this.windowSize) * this.capacity
      );

      if (tokensToAdd > 0) {
        const currentTokens = await this.redisClient.get(this.tokensKey);
        const newTokenCount = Math.min(
          Math.max(parseInt(currentTokens || '0', 10), 0) + tokensToAdd,
          this.capacity
        );

        await this.redisClient.set(this.lastRefillKey, now.toString());
        await this.redisClient.set(this.tokensKey, newTokenCount.toString());
      }
    }
  }

  private async decrementToken(): Promise<number> {
    return await this.redisClient.decr(this.tokensKey);
  }
}

export default RedisRateLimiter;
