import Redis from 'ioredis';
import type { TrafficPattern, AdaptiveLimit } from './types';

export class TrafficAnalyzer {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async analyzePattern(identifier: string, windowMs: number = 60000): Promise<TrafficPattern> {
    const now = Date.now();
    const windowStart = now - windowMs;

    const requests = await this.redis.zrangebyscore(
      `traffic:${identifier}`,
      windowStart,
      now,
      'WITHSCORES'
    );

    const requestCount = requests.length / 2;
    const endpoints = new Set<string>();
    let totalResponseTime = 0;
    let errorCount = 0;

    for (let i = 0; i < requests.length; i += 2) {
      const data = JSON.parse(requests[i]);
      endpoints.add(data.endpoint || 'unknown');
      totalResponseTime += data.responseTime || 0;
      if (data.status >= 400) errorCount++;
    }

    return {
      identifier,
      requestCount,
      timeWindow: windowMs,
      averageResponseTime: requestCount > 0 ? totalResponseTime / requestCount : 0,
      errorRate: requestCount > 0 ? errorCount / requestCount : 0,
      uniqueEndpoints: endpoints.size,
    };
  }

  async recordRequest(
    identifier: string,
    endpoint: string,
    responseTime: number,
    status: number
  ): Promise<void> {
    const now = Date.now();
    const data = JSON.stringify({ endpoint, responseTime, status, timestamp: now });

    await this.redis.zadd(`traffic:${identifier}`, now, data);
    await this.redis.expire(`traffic:${identifier}`, 3600);
  }

  async calculateOptimalLimit(pattern: TrafficPattern): Promise<number> {
    let baseLimit = 100;

    if (pattern.errorRate > 0.1) {
      baseLimit *= 0.5;
    } else if (pattern.errorRate < 0.01) {
      baseLimit *= 1.5;
    }

    if (pattern.averageResponseTime > 1000) {
      baseLimit *= 0.7;
    } else if (pattern.averageResponseTime < 100) {
      baseLimit *= 1.3;
    }

    if (pattern.uniqueEndpoints > 10) {
      baseLimit *= 1.2;
    }

    return Math.max(10, Math.min(1000, Math.round(baseLimit)));
  }

  async getAdaptiveLimit(identifier: string): Promise<AdaptiveLimit | null> {
    const data = await this.redis.get(`adaptive:limit:${identifier}`);
    if (!data) return null;
    return JSON.parse(data) as AdaptiveLimit;
  }

  async setAdaptiveLimit(limit: AdaptiveLimit): Promise<void> {
    await this.redis.setex(
      `adaptive:limit:${limit.identifier}`,
      3600,
      JSON.stringify(limit)
    );
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
