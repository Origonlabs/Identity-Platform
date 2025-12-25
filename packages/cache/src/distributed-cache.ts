import Redis from 'ioredis';
import type { CacheOptions, CacheEntry, CacheStats } from './types';
import { CacheManager } from './cache-manager';

export class DistributedCache {
  private readonly redis: Redis;
  private readonly localCache: CacheManager;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    localHits: 0,
    redisHits: 0,
  };

  constructor(redisUrl?: string, localCacheOptions?: { stdTTL?: number }) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.localCache = new CacheManager(localCacheOptions);
  }

  async get<T>(key: string): Promise<T | null> {
    const localValue = await this.localCache.get<T>(key);
    if (localValue !== null) {
      this.stats.localHits++;
      this.stats.hits++;
      return localValue;
    }

    const redisValue = await this.redis.get(key);
    if (redisValue) {
      try {
        const entry: CacheEntry<T> = JSON.parse(redisValue);
        if (entry.expiresAt < Date.now()) {
          await this.redis.del(key);
          this.stats.misses++;
          return null;
        }

        await this.localCache.set(key, entry.value, { ttl: Math.floor((entry.expiresAt - Date.now()) / 1000) });
        this.stats.redisHits++;
        this.stats.hits++;
        return entry.value;
      } catch {
        this.stats.misses++;
        return null;
      }
    }

    this.stats.misses++;
    return null;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl || 3600;
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl * 1000,
      tags: options?.tags || [],
      hits: 0,
      createdAt: Date.now(),
    };

    await Promise.all([
      this.localCache.set(key, value, options),
      this.redis.setex(key, ttl, JSON.stringify(entry)),
    ]);

    if (options?.tags && options.tags.length > 0) {
      await this.addToTagIndex(key, options.tags);
    }

    this.stats.sets++;
  }

  async delete(key: string): Promise<void> {
    await Promise.all([
      this.localCache.delete(key),
      this.redis.del(key),
    ]);
    this.stats.deletes++;
  }

  async deleteByTag(tag: string): Promise<void> {
    const tagKey = `tag:${tag}`;
    const keys = await this.redis.smembers(tagKey);
    
    if (keys.length > 0) {
      await Promise.all([
        this.localCache.deleteByTag(tag),
        this.redis.del(...keys),
        this.redis.del(tagKey),
      ]);
    }
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.localCache.clear(),
      this.redis.flushdb(),
    ]);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys: string[] = [];
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100,
    });

    for await (const key of stream) {
      keys.push(...key);
    }

    if (keys.length > 0) {
      await this.redis.del(...keys);
      for (const key of keys) {
        await this.localCache.delete(key);
      }
    }
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: 0,
    };
  }

  private async addToTagIndex(key: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const tag of tags) {
      pipeline.sadd(`tag:${tag}`, key);
    }
    await pipeline.exec();
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
