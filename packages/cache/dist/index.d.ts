export interface CacheConfig {
  ttl?: number;
  max?: number;
}

export class Cache {
  constructor(config?: CacheConfig);
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class DistributedCache extends Cache {
  constructor(redisUrl?: string);
}

export function createCache(config?: CacheConfig): Cache;
