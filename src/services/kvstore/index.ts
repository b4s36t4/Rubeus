import { logger } from '../../apm';
import { redisClient } from '../../data-stores/redis';

export const getFromKV = async (key: string) => {
  let value;
  try {
    value = await redisClient.get(key);
    if (value !== null) {
      value = JSON.parse(value);
    }
  } catch (err: any) {
    value = null;
    logger.error({
      message: `getFromKV error: ${err.message}`,
    });
  }
  return value;
};

export const putInKV = async (
  key: string,
  value: any,
  expiry = 604800 // 7 days
) => {
  let result = true;
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', expiry);
  } catch (err: any) {
    result = false;
    logger.error({
      message: `putInKV error: ${err.message}`,
    });
  }

  return result;
};

export const deleteFromKV = async (key: string) => {
  let result = true;
  try {
    await redisClient.del(key);
  } catch (err: any) {
    result = false;
    logger.error({
      message: `deleteFromKV error: ${err.message}`,
    });
  }

  return result;
};
