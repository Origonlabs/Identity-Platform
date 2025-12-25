import Redis from 'ioredis';
import type { RateLimitOptions, RateLimitResult } from './types';

export class RateLimiter {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async checkLimit(
    key: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const { limit, window, strategy = 'sliding' } = options;

    if (strategy === 'sliding') {
      return this.slidingWindow(key, limit, window);
    } else {
      return this.fixedWindow(key, limit, window);
    }
  }

  private async slidingWindow(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `rate_limit:${key}`;

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    pipeline.zcard(redisKey);
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    const currentCount = results?.[1]?.[1] as number || 0;

    const allowed = currentCount < limit;
    const remaining = Math.max(0, limit - currentCount - 1);
    const resetAt = new Date(now + windowMs);
    const retryAfter = allowed ? undefined : Math.ceil((resetAt.getTime() - now) / 1000);

    if (allowed && results) {
      await results[2];
    }

    return {
      allowed,
      remaining,
      resetAt,
      retryAfter,
    };
  }

  private async fixedWindow(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const redisKey = `rate_limit:${key}:${windowStart}`;

    const current = await this.redis.incr(redisKey);
    await this.redis.expire(redisKey, Math.ceil(windowMs / 1000));

    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);
    const resetAt = new Date(windowStart + windowMs);
    const retryAfter = allowed ? undefined : Math.ceil((resetAt.getTime() - now) / 1000);

    return {
      allowed,
      remaining,
      resetAt,
      retryAfter,
    };
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
