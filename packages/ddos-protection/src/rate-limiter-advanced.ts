import Redis from 'ioredis';

export class AdvancedRateLimiter {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async checkRateLimit(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const count = await this.redis.zcount(key, windowStart, now);

    if (count >= limit) {
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldest.length > 0 ? new Date(parseInt(oldest[1]) + windowMs) : new Date(now + windowMs);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    await this.redis.zadd(key, now, `${now}_${Math.random()}`);
    await this.redis.expire(key, Math.ceil(windowMs / 1000));

    const remaining = limit - count - 1;
    const resetAt = new Date(now + windowMs);

    return {
      allowed: true,
      remaining,
      resetAt,
    };
  }

  async getRequestCount(identifier: string, windowMs: number): Promise<number> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    return this.redis.zcount(key, windowStart, now);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
