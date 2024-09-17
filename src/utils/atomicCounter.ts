import { Cluster, Redis } from 'ioredis';
import { AtomicCounterRequestType } from '../middlewares/portkey/types';
import { AtomicOperations } from '../middlewares/portkey/globals';

export class AtomicCounter {
  private redisClient: Redis | Cluster;

  constructor(redisClient: Redis | Cluster) {
    this.redisClient = redisClient;
  }

  async fetch(request: Partial<AtomicCounterRequestType>) {
    const { type, organisationId, key, operation, amount } = request;
    let val = 0;
    let resp: { value?: number; success: boolean; message?: string } = {
      success: true,
    };
    let statusCode = 200;
    const finalKey = `${organisationId}-${type}-${key}`;
    switch (operation) {
      case AtomicOperations.GET:
        val = await this.get(finalKey);
        resp.value = val;
        break;
      case AtomicOperations.INCREMENT:
        val = await this.increment(finalKey, amount || 0);
        resp.value = val;
        break;
      case AtomicOperations.DECREMENT:
        val = await this.decrement(finalKey, amount || 0);
        resp.value = val;
        break;
      case AtomicOperations.RESET:
        await this.reset(finalKey);
        break;
      default:
        resp = {
          success: false,
          message: 'Invalid Operation',
        };
        statusCode = 400;
        break;
    }
    return new Response(JSON.stringify(resp), {
      headers: {
        'content-type': 'application/json',
      },
      status: statusCode,
    });
  }

  async reset(key: string) {
    await this.redisClient.del(key);
  }

  async get(key: string) {
    const value = await this.redisClient.get(key);
    return value ? Number(value) : 0;
  }

  async set(key: string, value: number) {
    this.redisClient.set(key, value);
  }

  async increment(key: string, amount: number) {
    let value = await this.get(key);
    value += amount;
    await this.set(key, value);
    return value;
  }

  async decrement(key: string, amount: number) {
    let value = await this.get(key);
    value -= amount;
    await this.set(key, value);
    return value;
  }
}
