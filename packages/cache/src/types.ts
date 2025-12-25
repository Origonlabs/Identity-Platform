export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
  serialize?: boolean;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
  hits: number;
  createdAt: number;
}

export type CacheStrategy = 'cache-aside' | 'write-through' | 'write-behind' | 'refresh-ahead';

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  size: number;
}
