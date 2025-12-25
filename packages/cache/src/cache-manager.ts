import NodeCache from 'node-cache';
import type { CacheOptions, CacheEntry, CacheStats } from './types';

export class CacheManager {
  private readonly localCache: NodeCache;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(options?: { stdTTL?: number; checkperiod?: number }) {
    this.localCache = new NodeCache({
      stdTTL: options?.stdTTL || 3600,
      checkperiod: options?.checkperiod || 600,
      useClones: false,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.localCache.get<CacheEntry<T>>(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.localCache.del(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.value;
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

    this.localCache.set(key, entry, ttl);
    this.stats.sets++;
  }

  async delete(key: string): Promise<void> {
    this.localCache.del(key);
    this.stats.deletes++;
  }

  async deleteByTag(tag: string): Promise<void> {
    const keys = this.localCache.keys();
    for (const key of keys) {
      const entry = this.localCache.get<CacheEntry<unknown>>(key);
      if (entry && entry.tags.includes(tag)) {
        this.localCache.del(key);
        this.stats.deletes++;
      }
    }
  }

  async clear(): Promise<void> {
    this.localCache.flushAll();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
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

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.localCache.keys().length,
    };
  }
}
