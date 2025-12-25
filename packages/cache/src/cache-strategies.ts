import type { CacheStrategy, CacheOptions } from './types';
import type { DistributedCache } from './distributed-cache';

export class CacheStrategyManager {
  constructor(private readonly cache: DistributedCache) {}

  async execute<T>(
    strategy: CacheStrategy,
    key: string,
    operation: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    switch (strategy) {
      case 'cache-aside':
        return this.cacheAside(key, operation, options);
      case 'write-through':
        return this.writeThrough(key, operation, options);
      case 'write-behind':
        return this.writeBehind(key, operation, options);
      case 'refresh-ahead':
        return this.refreshAhead(key, operation, options);
      default:
        return operation();
    }
  }

  private async cacheAside<T>(
    key: string,
    operation: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await operation();
    await this.cache.set(key, value, options);
    return value;
  }

  private async writeThrough<T>(
    key: string,
    operation: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const value = await operation();
    await this.cache.set(key, value, options);
    return value;
  }

  private async writeBehind<T>(
    key: string,
    operation: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const value = await operation();
    setImmediate(() => {
      this.cache.set(key, value, options).catch(() => {});
    });
    return value;
  }

  private async refreshAhead<T>(
    key: string,
    operation: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== null) {
      const ttl = options?.ttl || 3600;
      const refreshThreshold = ttl * 0.2;
      const entry = await this.cache.get<{ expiresAt: number }>(key);
      if (entry && entry.expiresAt - Date.now() < refreshThreshold * 1000) {
        setImmediate(() => {
          operation()
            .then((value) => this.cache.set(key, value, options))
            .catch(() => {});
        });
      }
      return cached;
    }

    const value = await operation();
    await this.cache.set(key, value, options);
    return value;
  }
}
