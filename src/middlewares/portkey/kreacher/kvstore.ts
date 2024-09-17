/**
 * The KVStore objects lets us connect with the KVStore
 * worker to get, put and delete keys.
 */

import { deleteFromKV, getFromKV, putInKV } from '../../../services/kvstore';

export const KVStore = {
  get: async (env: Record<string, any>, key: string) => {
    return getFromKV(key);
  },
  put: async (
    env: Record<string, any>,
    key: string,
    value: any,
    expiry: number
  ) => {
    return putInKV(key, value, expiry);
  },
  del: async (env: Record<string, any>, key: string) => {
    return deleteFromKV(key);
  },
};
